#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDraft, getDraft, listDrafts, approveDraft, scheduleDraft, publishDraft, dueDrafts } from './store.mjs';
import { createLinkedInPost, getUserInfo } from './linkedin.mjs';
import { authorize } from './auth.mjs';
import { runMcp } from './mcp.mjs';

const usage=`LinkedIn MCP Community 0.1.0

Commands:
  mcp                             Run local stdio MCP server (default)
  auth                            Link your own LinkedIn Developer app through OAuth
  whoami                          Verify LinkedIn identity
  draft <file.txt>                Create draft from UTF-8 text file
  list                            List local drafts
  show <id>                       Show full draft
  approve <id>                    MANUALLY approve exact draft content
  schedule <id> <ISO8601+offset>  Schedule manually approved draft
  publish <id>                    Publish approved draft immediately (if not scheduled in future)
  run-due                         Publish due scheduled, approved posts (invoke from cron)

There is no browser scraping, feed reading or automatic AI approval.
`;
async function main(){
  const [command='mcp', ...args]=process.argv.slice(2);
  switch(command){
    case 'mcp':runMcp();return;
    case 'auth':await authorize();return;
    case 'whoami':console.log(JSON.stringify(await getUserInfo(),null,2));return;
    case 'draft':{
      if(args.length!==1) throw Error('Specify one UTF-8 text file.');
      const text=await readFile(resolve(args[0]),'utf8');
      console.log(JSON.stringify(await createDraft(text),null,2));return;
    }
    case 'list':console.log(JSON.stringify(await listDrafts(),null,2));return;
    case 'show':console.log(JSON.stringify(await getDraft(args[0]),null,2));return;
    case 'approve':{
      // The operator must explicitly invoke this CLI command, not an AI/MCP tool.
      const d=await getDraft(args[0]);
      console.log('YOU ARE APPROVING THIS EXACT LINKEDIN POST:\n\n'+d.text+'\n\nVisibility: '+d.visibility);
      if(!process.stdin.isTTY) throw Error('Approval requires an interactive terminal.');
      const {createInterface}=await import('node:readline/promises');
      const rl=createInterface({input:process.stdin,output:process.stdout});
      try {
        const confirmation=await rl.question(`Type APPROVE ${d.id} to confirm: `);
        if(confirmation!==`APPROVE ${d.id}`) throw Error('Approval cancelled.');
      } finally { rl.close(); }
      console.log(JSON.stringify(await approveDraft(d.id),null,2));return;
    }
    case 'schedule':console.log(JSON.stringify(await scheduleDraft(args[0],args[1]),null,2));return;
    case 'publish':console.log(JSON.stringify(await publishDraft(args[0],createLinkedInPost),null,2));return;
    case 'run-due':{
      const due=await dueDrafts();
      console.error(`Found ${due.length} approved post(s) due for publishing.`);
      let failed=0;
      for(const d of due){try {await publishDraft(d.id,createLinkedInPost);console.error(`Published ${d.id}`);}catch(e){failed++;console.error(`${d.id}: ${e.message}`);}}
      if(failed) process.exitCode=1;
      return;
    }
    case 'help':case '--help':console.log(usage);return;
    default:throw Error('Unknown command.\n\n'+usage);
  }
}
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1});
