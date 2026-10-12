import readline from 'node:readline';
import { createDraft, getDraft, listDrafts, updateDraft, scheduleDraft, publishDraft } from './store.mjs';
import { createLinkedInPost, getUserInfo } from './linkedin.mjs';

const TOOL_LIST=[
  {name:'linkedin_connection_status',description:'Check connected LinkedIn identity. Does not return access tokens.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
  {name:'linkedin_create_draft',description:'Create a LOCAL LinkedIn draft. Does NOT publish. The person must separately approve the exact text via the local CLI before publishing.',inputSchema:{type:'object',properties:{text:{type:'string',minLength:1,maxLength:3000},visibility:{type:'string',enum:['PUBLIC','CONNECTIONS']}},required:['text'],additionalProperties:false},annotations:{readOnlyHint:false,openWorldHint:false}},
  {name:'linkedin_list_drafts',description:'Show local LinkedIn drafts and states. Does not read the LinkedIn feed.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},
  {name:'linkedin_get_draft',description:'Read a local draft by ID.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:true}},
  {name:'linkedin_edit_draft',description:'Edit local draft before manual approval (editing invalidates any previous approval).',inputSchema:{type:'object',properties:{id:{type:'string'},text:{type:'string',minLength:1,maxLength:3000}},required:['id','text'],additionalProperties:false},annotations:{readOnlyHint:false}},
  {name:'linkedin_schedule_approved_draft',description:'Schedule ONLY a manually approved draft; publishing occurs only when a separate scheduler invokes run-due. Time must include timezone offset.',inputSchema:{type:'object',properties:{id:{type:'string'},when:{type:'string',description:'ISO 8601 timestamp with timezone offset'}},required:['id','when'],additionalProperties:false},annotations:{readOnlyHint:false}},
  {name:'linkedin_publish_approved_draft',description:'Publish ONLY a draft manually approved via the CLI for the exact content. This sends a real LinkedIn post immediately. Scheduled future posts are blocked.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,openWorldHint:true,idempotentHint:false}}
];
const jsonText = x => ({content:[{type:'text',text:JSON.stringify(x,null,2)}]});
export async function callTool(name,args={}) {
  if(!args || Array.isArray(args) || typeof args!=='object') throw Error('Invalid arguments.');
  switch(name){
    case 'linkedin_connection_status':return jsonText(await getUserInfo());
    case 'linkedin_create_draft': return jsonText(await createDraft(args.text,args.visibility));
    case 'linkedin_list_drafts':return jsonText(await listDrafts());
    case 'linkedin_get_draft':return jsonText(await getDraft(args.id));
    case 'linkedin_edit_draft':return jsonText(await updateDraft(args.id,{text:args.text}));
    case 'linkedin_schedule_approved_draft':return jsonText(await scheduleDraft(args.id,args.when));
    case 'linkedin_publish_approved_draft':return jsonText(await publishDraft(args.id,createLinkedInPost));
    default:throw Error(`Unknown tool: ${name}`);
  }
}
export async function processMessage(message) {
  if(!message || message.jsonrpc!=='2.0' || typeof message.method!=='string') return {jsonrpc:'2.0',id:message?.id??null,error:{code:-32600,message:'Invalid Request'}};
  if(message.id===undefined) return null; // notifications never get responses
  const id=message.id;
  const reply=result=>({jsonrpc:'2.0',id,result});
  try {
    switch(message.method){
      case 'initialize':return reply({protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'linkedin-mcp-community',version:'0.1.0'}});
      case 'ping':return reply({});
      case 'tools/list':return reply({tools:TOOL_LIST});
      case 'tools/call':{
        if(typeof message.params?.name!=='string') return {jsonrpc:'2.0',id,error:{code:-32602,message:'Invalid params'}};
        try{return reply(await callTool(message.params.name,message.params.arguments ?? {}));}
        catch(e){return reply({content:[{type:'text',text:e instanceof Error?e.message:'Unknown error'}],isError:true});}
      }
      default:return {jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}};
    }
  } catch(e){return {jsonrpc:'2.0',id,error:{code:-32603,message:'Internal error'}};}
}
export function runMcp(){
  const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity,terminal:false});
  input.on('line',async line=>{
    try {
      const msg=JSON.parse(line);
      const output=await processMessage(msg);
      if(output) process.stdout.write(JSON.stringify(output)+'\n');
    } catch(e) {
      if(e instanceof SyntaxError) process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}})+'\n');
      else console.error('Internal MCP error:',e.message);
    }
  });
}
