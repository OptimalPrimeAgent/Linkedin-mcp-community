import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { saveToken } from './linkedin.mjs';

const REDIRECT_URI='http://localhost:8787/callback';
export async function authorize({timeoutMs=300_000, fetchImpl=fetch} = {}) {
  const clientId=process.env.LINKEDIN_CLIENT_ID;
  const clientSecret=process.env.LINKEDIN_CLIENT_SECRET;
  if(!clientId || !clientSecret) throw Error('Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET (see .env.example).');
  const state=randomBytes(24).toString('hex');
  const url=new URL('https://www.linkedin.com/oauth/v2/authorization');
  url.searchParams.set('response_type','code');
  url.searchParams.set('client_id',clientId);
  url.searchParams.set('redirect_uri',REDIRECT_URI);
  url.searchParams.set('state',state);
  url.searchParams.set('scope','openid profile email w_member_social');
  const code=await new Promise((resolve,reject)=>{
    const server=http.createServer((req,res)=>{
      try {
        const requestUrl=new URL(req.url || '/',REDIRECT_URI);
        if(requestUrl.pathname!=='/callback') {res.writeHead(404).end('Not found'); return;}
        if(requestUrl.searchParams.get('state')!==state) {res.writeHead(400).end('Invalid state');return;}
        const authError=requestUrl.searchParams.get('error');
        if(authError) {res.writeHead(400).end('LinkedIn authorization denied.');finish(new Error('LinkedIn denied authorization.'));return;}
        const value=requestUrl.searchParams.get('code');
        if(!value) {res.writeHead(400).end('Missing code');return;}
        res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'}).end('Authorized. You can return to your terminal.');
        finish(null,value);
      } catch(e) {res.writeHead(400).end('Invalid callback');}
    });
    let timer;
    function finish(error,value){ clearTimeout(timer);server.close(); error?reject(error):resolve(value); }
    server.on('error',reject);
    server.listen(8787,'127.0.0.1',()=>{
      console.error('Open this URL in your browser to connect your LinkedIn account:');
      console.error(url.toString());
      timer=setTimeout(()=>finish(new Error('Authorization timed out.')),timeoutMs);
      timer.unref?.();
    });
  });
  const body=new URLSearchParams({grant_type:'authorization_code',code,client_id:clientId,client_secret:clientSecret,redirect_uri:REDIRECT_URI});
  const response=await fetchImpl('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!response.ok) throw Error(`LinkedIn token exchange HTTP ${response.status}`);
  const token=await response.json();
  if(!token.access_token || !token.expires_in) throw Error('LinkedIn returned invalid token details.');
  await saveToken({access_token:token.access_token, expires_at:Date.now()+Number(token.expires_in)*1000});
  console.error('LinkedIn connected. Token saved to private local storage.');
}
