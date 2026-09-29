import {Hono} from 'hono';import {listSources,listVideos} from './database/db';
export interface Env{DB:D1Database;ADMIN_TOKEN:string;ASSETS:Fetcher}
const app=new Hono<{Bindings:Env}>();
app.get('/api/sources',async c=>c.json({sources:(await listSources(c.env.DB)).results}));
app.get('/api/videos',async c=>{const limit=Math.min(Math.max(Number(c.req.query('limit')||40),1),100);const rows=await listVideos(c.env.DB,{q:c.req.query('q')||undefined,source:c.req.query('source')||undefined,cursor:c.req.query('cursor')||undefined,limit});const hasMore=rows.length>limit;const videos=rows.slice(0,limit);const cursor=hasMore?(videos[videos.length-1] as any)?.published_at:null;return c.json({videos,nextCursor:cursor})});
app.get('/api/search',async c=>{const q=c.req.query('q')||'';const rows=await listVideos(c.env.DB,{q,limit:50});return c.json({videos:rows.slice(0,50)})});
const admin=async(c:any,next:any)=>{const auth=c.req.header('Authorization');if(auth!==`Bearer ${c.env.ADMIN_TOKEN}`)return c.json({error:'Unauthorized'},401);await next()};
app.use('/api/admin/*',admin);app.get('/api/admin/sources',async c=>c.json({sources:(await c.env.DB.prepare('SELECT * FROM sources ORDER BY created_at DESC').all()).results}));
app.post('/api/admin/sources',async c=>{const b=await c.req.json();if(!b.name||!b.base_url||!b.adapter)return c.json({error:'name, base_url and adapter are required'},400);const id=crypto.randomUUID();await c.env.DB.prepare('INSERT INTO sources(id,name,base_url,adapter,enabled,configuration,created_at,updated_at) VALUES(?,?,?,?,?,?,datetime(\'now\'),datetime(\'now\'))').bind(id,b.name,b.base_url,b.adapter,b.enabled===false?0:1,JSON.stringify(b.configuration||{})).run();return c.json({id},201)});
app.post('/api/admin/sync-all',async c=>c.json({status:'queued'}));app.post('/api/admin/sources/:id/sync',async c=>c.json({status:'queued',sourceId:c.req.param('id')}));
app.all('*',c=>c.env.ASSETS.fetch(c.req.raw));app.onError((e,c)=>c.json({error:'Internal server error',detail:e.message},500));export default app;
