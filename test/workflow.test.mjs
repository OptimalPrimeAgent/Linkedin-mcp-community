import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDraft, getDraft, approveDraft, scheduleDraft, publishDraft, dueDrafts, updateDraft } from '../src/store.mjs';

async function isolated(fn){
 const before=process.env.LINKEDIN_MCP_HOME;
 const dir=await mkdtemp(join(tmpdir(),'linkedin-mcp-test-'));
 process.env.LINKEDIN_MCP_HOME=dir;
 try {await fn();}finally{if(before===undefined) delete process.env.LINKEDIN_MCP_HOME;else process.env.LINKEDIN_MCP_HOME=before;await rm(dir,{recursive:true,force:true});}
}
// Tests mutate a shared env var, so they run sequentially by default.
test('drafts cannot publish before human approval; exact approved content is preserved',async()=>isolated(async()=>{
 const d=await createDraft('A first post about AI governance');
 let requests=0;
 const publisher=async()=>{requests++;return {postUrn:'urn:li:share:123'};};
 await assert.rejects(()=>publishDraft(d.id,publisher),/manual approval/);
 assert.equal(requests,0);
 await approveDraft(d.id);
 await assert.rejects(()=>updateDraft(d.id,{text:'edited after approval'}),/Only unapproved/);
 const published=await publishDraft(d.id,publisher);
 assert.equal(published.status,'PUBLISHED');
 assert.equal(published.postUrn,'urn:li:share:123');
 assert.equal(requests,1);
 await assert.rejects(()=>publishDraft(d.id,publisher),/manual approval/);
 assert.equal(requests,1);
}));

test('scheduled approved posts publish only when due',async()=>isolated(async()=>{
 const d=await createDraft('Scheduled post');
 await approveDraft(d.id);
 const future=new Date(Date.now()+3600_000).toISOString();
 await scheduleDraft(d.id,future);
 await assert.rejects(()=>publishDraft(d.id,async()=>({postUrn:'urn:li:share:123'})),/scheduled for the future/);
 assert.equal((await dueDrafts()).length,0);
 const due=await dueDrafts(new Date(Date.now()+7200_000));
 assert.equal(due.length,1);
 await publishDraft(d.id,async()=>({postUrn:'urn:li:share:123'}),{now:new Date(Date.now()+7200_000)});
 assert.equal((await getDraft(d.id)).status,'PUBLISHED');
}));

test('ambiguous LinkedIn response is never retried automatically',async()=>isolated(async()=>{
 const d=await createDraft('A safe post');await approveDraft(d.id);
 let calls=0;
 const network=async()=>{calls++;throw Error('network connection reset');};
 await assert.rejects(()=>publishDraft(d.id,network),/outcome is uncertain/);
 assert.equal((await getDraft(d.id)).status,'UNCERTAIN');
 await assert.rejects(()=>publishDraft(d.id,network),/manual approval/);
 assert.equal(calls,1);
}));

test('validate text and schedule timezone',async()=>isolated(async()=>{
 await assert.rejects(()=>createDraft(' '),/1–3000/);
 await assert.rejects(()=>createDraft('x'.repeat(3001)),/1–3000/);
 const d=await createDraft('Valid');
 await approveDraft(d.id);
 await assert.rejects(()=>scheduleDraft(d.id,'2027-01-01T12:00:00'),/timezone offset/);
}));
