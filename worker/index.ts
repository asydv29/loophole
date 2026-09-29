import {Hono} from 'hono';
import {listSources,listVideos} from './database/db';
import {getAdapter} from './adapters/registry';

export interface Env{DB:D1Database;ADMIN_TOKEN:string;ASSETS:Fetcher}
const app=new Hono<{Bindings:Env}>();

const encoder=new TextEncoder();
function b64u(input:ArrayBuffer|Uint8Array){let s='';const a=input instanceof Uint8Array?input:new Uint8Array(input);for(const b of a)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s:string){const p=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(p.padEnd(Math.ceil(p.length/4)*4,'=')),c=>c.charCodeAt(0))}
async function sign(value:string,secret:string){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);return b64u(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))}
async function makeSession(secret:string){const payload=b64u(encoder.encode(JSON.stringify({exp:Date.now()+8*60*60*1000})));return `${payload}.${await sign(payload,secret)}`}
async function validSession(cookie:string|undefined,secret:string){if(!cookie)return false;const m=cookie.match(/(?:^|;\s*)loophole_admin=([^;]+)/);if(!m)return false;const [payload,sig]=m[1].split('.');if(!payload||!sig)return false;const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('HMAC',key,unb64u(sig),encoder.encode(payload)))return false;try{return JSON.parse(new TextDecoder().decode(unb64u(payload))).exp>Date.now()}catch{return false}}
function cookieHeader(value:string){return `loophole_admin=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`}

app.get('/api/sources',async c=>c.json({sources:(await listSources(c.env.DB)).results}));
app.get('/api/videos',async c=>{const limit=Math.min(Math.max(Number(c.req.query('limit')||40),1),100);const rows=await listVideos(c.env.DB,{q:c.req.query('q')||undefined,source:c.req.query('source')||undefined,cursor:c.req.query('cursor')||undefined,limit});const hasMore=rows.length>limit;const videos=rows.slice(0,limit);const cursor=hasMore?(videos[videos.length-1] as any)?.published_at:null;return c.json({videos,nextCursor:cursor})});
app.get('/api/search',async c=>{const q=c.req.query('q')||'';const rows=await listVideos(c.env.DB,{q,limit:50});return c.json({videos:rows.slice(0,50)})});

app.post('/api/admin/login',async c=>{const b=await c.req.json().catch(()=>({}));if(!c.env.ADMIN_TOKEN||b.password!==c.env.ADMIN_TOKEN)return c.json({error:'Invalid credentials'},401);const session=await makeSession(c.env.ADMIN_TOKEN);return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':cookieHeader(session)}})});
app.post('/api/admin/logout',c=>new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'loophole_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}}));
const admin=async(c:any,next:any)=>{const ok=await validSession(c.req.header('Cookie'),c.env.ADMIN_TOKEN);if(!ok)return c.json({error:'Unauthorized'},401);await next()};
app.use('/api/admin/*',admin);
app.get('/api/admin/me',c=>c.json({authenticated:true}));
app.get('/api/admin/adapters',async c=>c.json({adapters:['example']}));
app.get('/api/admin/sources',async c=>c.json({sources:(await c.env.DB.prepare('SELECT * FROM sources ORDER BY created_at DESC').all()).results}));
app.post('/api/admin/sources',async c=>{const b=await c.req.json();if(!b.name||!b.base_url||!b.adapter)return c.json({error:'name, base_url and adapter are required'},400);const id=crypto.randomUUID();await c.env.DB.prepare('INSERT INTO sources(id,name,base_url,adapter,enabled,configuration,created_at,updated_at) VALUES(?,?,?,?,?,?,datetime(\'now\'),datetime(\'now\'))').bind(id,b.name,b.base_url,b.adapter,b.enabled===false?0:1,JSON.stringify(b.configuration||{})).run();return c.json({id},201)});
app.put('/api/admin/sources/:id',async c=>{const id=c.req.param('id'),b=await c.req.json();await c.env.DB.prepare('UPDATE sources SET name=?,base_url=?,adapter=?,enabled=?,configuration=?,updated_at=datetime(\'now\') WHERE id=?').bind(b.name,b.base_url,b.adapter,b.enabled?1:0,JSON.stringify(b.configuration||{}),id).run();return c.json({ok:true})});
app.delete('/api/admin/sources/:id',async c=>{await c.env.DB.prepare('DELETE FROM sources WHERE id=?').bind(c.req.param('id')).run();return c.json({ok:true})});
app.post('/api/admin/sources/:id/test',async c=>{const s:any=await c.env.DB.prepare('SELECT * FROM sources WHERE id=?').bind(c.req.param('id')).first();if(!s)return c.json({ok:false,message:'Source not found'},404);const factory=getAdapter(s.adapter);if(!factory)return c.json({ok:false,message:`Adapter '${s.adapter}' is not registered`},400);try{const result=await factory(JSON.parse(s.configuration||'{}'),c.env as any).validateConfiguration();return c.json(result)}catch(e){return c.json({ok:false,message:e instanceof Error?e.message:'Adapter test failed'},502)}});
app.post('/api/admin/sources/:id/sync',async c=>c.json({status:'queued',sourceId:c.req.param('id')}));
app.post('/api/admin/sync-all',async c=>c.json({status:'queued'}));
app.all('*',async c=>{
  if(c.req.method !== 'GET') return c.env.ASSETS.fetch(c.req.raw);
  const path=new URL(c.req.url).pathname;
  const last=path.split('/').pop()||'';
  const looksLikeAsset=last.includes('.');
  if(path.startsWith('/api/') || looksLikeAsset) return c.env.ASSETS.fetch(c.req.raw);
  const indexUrl=new URL('/index.html',c.req.url);
  return c.env.ASSETS.fetch(new Request(indexUrl,c.req.raw));
});
app.onError((e,c)=>c.json({error:'Internal server error',detail:e.message},500));
export default app;
