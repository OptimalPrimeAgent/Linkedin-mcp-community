import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, open, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const privateHome = () => process.env.LINKEDIN_MCP_HOME || join(homedir(), '.linkedin-mcp-community');
export const dataHome = privateHome;
const draftsPath = () => join(privateHome(), 'drafts');
const idOk = id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id);
const validText = text => typeof text === 'string' && text.trim().length > 0 && Array.from(text).length <= 3000;
export const contentFingerprint = draft => createHash('sha256').update(JSON.stringify({text: draft.text, visibility: draft.visibility})).digest('hex');

async function putFile(path, value) {
  await mkdir(draftsPath(), { recursive: true, mode: 0o700 });
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', {mode: 0o600, flag: 'wx'});
  await rename(temp, path);
}
function pathOf(id) {
  if (!idOk(id)) throw Error('Invalid draft ID.');
  return join(draftsPath(), `${id}.json`);
}
export async function createDraft(text, visibility = 'PUBLIC') {
  if (!validText(text)) throw Error('Post text must contain 1–3000 characters.');
  if (!['PUBLIC', 'CONNECTIONS'].includes(visibility)) throw Error('Unsupported visibility.');
  const draft = { id: randomUUID(), text, visibility, status:'DRAFT', createdAt: new Date().toISOString(), approvedHash: null, scheduledAt: null, postUrn: null };
  await putFile(pathOf(draft.id), draft);
  return draft;
}
export async function getDraft(id) {
  try { return JSON.parse(await readFile(pathOf(id), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') throw Error('Draft not found.'); throw error; }
}
export async function listDrafts() {
  try {
    const names = (await readdir(draftsPath())).filter(x=>/^[a-f0-9-]{36}\.json$/.test(x));
    const all = await Promise.all(names.map(x => getDraft(x.slice(0,-5))));
    return all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  } catch(e) { if (e.code === 'ENOENT') return []; throw e; }
}
export async function updateDraft(id, change) {
  return withLock(id, async () => {
    const draft = await getDraft(id);
    if (draft.status !== 'DRAFT') throw Error('Only unapproved drafts may be edited.');
    if (!validText(change.text)) throw Error('Post text must contain 1–3000 characters.');
    draft.text = change.text;
    draft.approvedHash = null;
    draft.scheduledAt = null;
    await putFile(pathOf(id), draft);
    return draft;
  });
}
export async function withLock(id, fn) {
  const path = `${pathOf(id)}.lock`;
  const lock = await open(path,'wx',0o600).catch(e=>{
    if(e.code==='EEXIST') throw Error('Draft is being processed; do not retry automatically.');
    throw e;
  });
  try { return await fn(); }
  finally { await lock.close(); await unlink(path).catch(()=>{}); }
}
export async function approveDraft(id) {
  return withLock(id, async ()=>{
    const d = await getDraft(id);
    if (d.status !== 'DRAFT' && d.status !== 'APPROVED') throw Error('Draft is not awaiting approval.');
    d.approvedHash=contentFingerprint(d); d.status='APPROVED'; d.approvedAt=new Date().toISOString();
    await putFile(pathOf(id),d); return d;
  });
}
export async function scheduleDraft(id, when) {
  const iso = parseFutureDate(when);
  return withLock(id, async ()=>{
    const d=await getDraft(id);
    assertApproved(d);
    d.scheduledAt=iso;
    await putFile(pathOf(id),d); return d;
  });
}
export function parseFutureDate(when) {
  if (typeof when !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(when)) {
    throw Error('Use ISO 8601 date with timezone offset, e.g. 2026-11-02T09:00:00+01:00.');
  }
  const ms=Date.parse(when);
  if (!Number.isFinite(ms) || ms<=Date.now()) throw Error('Schedule must be in the future.');
  return new Date(ms).toISOString();
}
export function assertApproved(d) {
  if (d.status !== 'APPROVED' || !d.approvedHash || d.approvedHash !== contentFingerprint(d)) throw Error('Draft requires manual approval for its exact content.');
}
export async function publishDraft(id, publishFn, {allowScheduled = false, now = new Date()} = {}) {
  return withLock(id, async ()=>{
    const d=await getDraft(id);
    assertApproved(d);
    if (d.scheduledAt && new Date(d.scheduledAt)>now && !allowScheduled) throw Error('Draft is scheduled for the future.');
    // Commit PUBLISHING before network request; unknown outcomes NEVER auto-retry.
    d.status='PUBLISHING'; d.publishStartedAt=new Date().toISOString();
    await putFile(pathOf(id),d);
    try {
      const result = await publishFn(d);
      d.status='PUBLISHED'; d.postUrn=result.postUrn; d.publishedAt=new Date().toISOString();
      await putFile(pathOf(id),d);
      return d;
    } catch(error) {
      d.status='UNCERTAIN'; d.lastError=error instanceof Error ? error.message : 'Unknown network error';
      await putFile(pathOf(id),d);
      throw Error('LinkedIn publishing outcome is uncertain. Check LinkedIn manually before retrying. '+d.lastError);
    }
  });
}
export async function dueDrafts(now = new Date()) {
  return (await listDrafts()).filter(d => d.status==='APPROVED' && d.scheduledAt && new Date(d.scheduledAt)<=now && d.approvedHash===contentFingerprint(d));
}
