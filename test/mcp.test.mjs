import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { processMessage } from '../src/mcp.mjs';

test('MCP handshake, tool listing and no AI approval tool',async()=>{
 const init=await processMessage({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1.0'}}});
 assert.equal(init.result.protocolVersion,'2025-06-18');
 const listed=await processMessage({jsonrpc:'2.0',id:2,method:'tools/list'});
 const names=listed.result.tools.map(t=>t.name);
 assert.ok(names.includes('linkedin_create_draft'));
 assert.ok(names.includes('linkedin_publish_approved_draft'));
 assert.ok(!names.some(n=>n.includes('approve')) || names.every(n=>n!=='linkedin_approve_draft'));
});

test('MCP create draft returns local draft; publishing without approval fails without HTTP call',async()=>{
 const prev=process.env.LINKEDIN_MCP_HOME;
 const dir=await mkdtemp(join(tmpdir(),'linkedin-mcp-protocol-'));
 process.env.LINKEDIN_MCP_HOME=dir;
 try{
  const first=await processMessage({jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'linkedin_create_draft',arguments:{text:'My draft'}}});
  const draft=JSON.parse(first.result.content[0].text);
  assert.equal(draft.status,'DRAFT');
  const second=await processMessage({jsonrpc:'2.0',id:8,method:'tools/call',params:{name:'linkedin_publish_approved_draft',arguments:{id:draft.id}}});
  assert.equal(second.result.isError,true);
  assert.match(second.result.content[0].text,/manual approval/);
 }finally{if(prev===undefined)delete process.env.LINKEDIN_MCP_HOME;else process.env.LINKEDIN_MCP_HOME=prev;await rm(dir,{force:true,recursive:true});}
});
