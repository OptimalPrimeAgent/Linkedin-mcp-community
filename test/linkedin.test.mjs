import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinkedInPost, postBody } from '../src/linkedin.mjs';

test('request uses LinkedIn REST Post API, authenticated member identity and correct headers',async()=>{
 const previous=process.env.LINKEDIN_ACCESS_TOKEN;
 process.env.LINKEDIN_ACCESS_TOKEN='test-token';
 const sent=[];
 try{
  const response=await createLinkedInPost({text:'Hello world',visibility:'PUBLIC'},async(url,options)=>{
   sent.push({url,options});
   if(url.endsWith('/userinfo'))return {ok:true,json:async()=>({sub:'test123',name:'Test User'})};
   return {status:201,headers:new Headers({'x-restli-id':'urn:li:share:5678'})};
  });
  assert.deepEqual(response,{postUrn:'urn:li:share:5678'});
  assert.equal(sent[1].url,'https://api.linkedin.com/rest/posts');
  assert.equal(sent[1].options.headers.Authorization,'Bearer test-token');
  assert.equal(sent[1].options.headers['X-Restli-Protocol-Version'],'2.0.0');
  const body=JSON.parse(sent[1].options.body);
  assert.equal(body.author,'urn:li:person:test123');
  assert.equal(body.commentary,'Hello world');
  assert.equal(body.lifecycleState,'PUBLISHED');
  assert.equal(body.distribution.feedDistribution,'MAIN_FEED');
 }finally{if(previous===undefined)delete process.env.LINKEDIN_ACCESS_TOKEN;else process.env.LINKEDIN_ACCESS_TOKEN=previous;}
});

test('rejects forged member IDs',()=>{
 assert.throws(()=>postBody({text:'hi',visibility:'PUBLIC'},'evil:user'),/Invalid LinkedIn member ID/);
});

test('HTTP error is reported without leaking the access token',async()=>{
 const previous=process.env.LINKEDIN_ACCESS_TOKEN;process.env.LINKEDIN_ACCESS_TOKEN='secret-test-token';
 try {
  await assert.rejects(()=>createLinkedInPost({text:'Hi',visibility:'PUBLIC'},async(url)=>url.endsWith('/userinfo')
   ? {ok:true,json:async()=>({sub:'abc'})}
   : {status:403,headers:new Headers()}),e=>e.message.includes('HTTP 403')&&!e.message.includes('secret-test-token'));
 }finally{if(previous===undefined)delete process.env.LINKEDIN_ACCESS_TOKEN;else process.env.LINKEDIN_ACCESS_TOKEN=previous;}
});
