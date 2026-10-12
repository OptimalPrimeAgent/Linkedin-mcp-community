import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataHome } from './store.mjs';

const TOKEN_PATH = () => join(dataHome(),'token.json');
export const API_VERSION = () => process.env.LINKEDIN_API_VERSION || '202608';
export async function loadToken() {
  if(process.env.LINKEDIN_ACCESS_TOKEN) return { access_token:process.env.LINKEDIN_ACCESS_TOKEN };
  try {
    const token=JSON.parse(await readFile(TOKEN_PATH(),'utf8'));
    if(token.expires_at && Date.now()>=token.expires_at - 60_000) throw Error('LinkedIn token expired; run: npm run start -- auth');
    return token;
  } catch(e) { if(e.code==='ENOENT') throw Error('Not connected to LinkedIn. Run: node src/index.mjs auth'); throw e; }
}
export async function saveToken(token) {
  await mkdir(dataHome(),{recursive:true,mode:0o700});
  const file=`${TOKEN_PATH()}.${randomUUID()}.tmp`;
  await writeFile(file,JSON.stringify(token,null,2)+'\n',{flag:'wx',mode:0o600});
  await rename(file,TOKEN_PATH());
}
export async function getUserInfo(fetchImpl = fetch) {
  const token=await loadToken();
  const response=await fetchImpl('https://api.linkedin.com/v2/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`}});
  if(!response.ok) throw Error(`LinkedIn userinfo HTTP ${response.status}`);
  const info=await response.json();
  if(!info.sub || !/^[A-Za-z0-9_-]+$/.test(info.sub)) throw Error('Invalid LinkedIn member identifier.');
  return {sub:info.sub, name:info.name || ''};
}
export function postBody(draft, memberId) {
  if (!/^[A-Za-z0-9_-]+$/.test(memberId)) throw Error('Invalid LinkedIn member ID.');
  return {
    author: `urn:li:person:${memberId}`,
    commentary: draft.text,
    visibility:draft.visibility,
    distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},
    lifecycleState:'PUBLISHED',
    isReshareDisabledByAuthor:false
  };
}
export async function createLinkedInPost(draft, fetchImpl = fetch) {
  const token=await loadToken();
  // Never trust a profile URN supplied by a tool caller. Identity comes from OAuth.
  const info=await getUserInfo(fetchImpl);
  const response=await fetchImpl('https://api.linkedin.com/rest/posts',{
    method:'POST',
    headers:{Authorization:`Bearer ${token.access_token}`, 'Linkedin-Version':API_VERSION(), 'X-Restli-Protocol-Version':'2.0.0','Content-Type':'application/json'},
    body:JSON.stringify(postBody(draft,info.sub))
  });
  if(response.status !== 201) throw Error(`LinkedIn posts API HTTP ${response.status}; check API product permissions and version. No automatic retry.`);
  const postUrn=response.headers.get('x-restli-id');
  if(!postUrn || !/^urn:li:(share|ugcPost):/.test(postUrn)) throw Error('LinkedIn accepted the post but did not provide a recognized post ID. Check LinkedIn before retrying.');
  return {postUrn};
}
