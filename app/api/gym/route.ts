import {localStore} from '@/lib/gym/local-store.mjs';
import {NextRequest,NextResponse} from 'next/server';
import {Ratelimit} from '@upstash/ratelimit';
import {z,ZodError} from 'zod';
import {redis,key,readState,mutate,isLocal} from '@/lib/gym/store';
import {digest,token,verifyPassword,hashPassword} from '@/lib/gym/crypto';
import {audit,operate,publicAdmin} from '@/lib/gym/operations';
import {GymStorageError} from '@/lib/gym/storage-errors';
export const dynamic='force-dynamic';
const cookie='mtf_session';
const json=(data:any,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
async function session(req:NextRequest){const value=req.cookies.get(cookie)?.value;if(!value)return null;const sess=await redis().get<any>(key('session:'+digest(value)));if(!sess)return null;const state=await readState();const user=state.admins.find(a=>a.id===sess.userId&&a.active&&a.sessionVersion===sess.version);return user?{sess,user,state,value}:null}
export async function GET(req:NextRequest){try{const auth=await session(req);if(!auth)return json({user:null});const {admins,audits,...state}=auth.state;return json({user:publicAdmin(auth.user),csrf:auth.sess.csrf,state:{...state,admins:auth.user.role==='Super Admin'?admins.map(publicAdmin):[],audits:auth.user.role==='Super Admin'?audits:audits.filter(a=>['Members','Check-ins','Renewals'].includes(a.module)).map(({id,at,actor,action,module,recordId,description})=>({id,at,actor,action,module,recordId,description}))}})}catch(e){if(e instanceof GymStorageError)return json({error:e.message,code:e.code},503);console.error('Gym read failed',e instanceof Error?e.message:'Unknown');return json({error:(e as Error).message},503)}}
export async function POST(req:NextRequest){try{
 const origin=req.headers.get('origin');
 // Next's internal request URL can use localhost while the browser uses 127.0.0.1.
 // Trust explicit local origins only; never trust an arbitrary forwarded host.
 const allowedOrigins=isLocal()?['http://127.0.0.1:3000','http://localhost:3000']:[process.env.APP_ORIGIN||new URL(req.url).origin];
 if(!origin||!allowedOrigins.includes(origin))return json({error:'Request origin is not allowed.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'JSON is required.'},415);
 const body=await req.text();if(body.length>30000)return json({error:'Request is too large.'},413);const data=JSON.parse(body);const action=z.string().max(60).parse(data.action);
 if(action==='login'){
  const username=z.string().trim().min(1).max(200).parse(data.username).toLowerCase();const password=z.string().min(1).max(128).parse(data.password);
  const limiter=new Ratelimit({redis:redis(),limiter:Ratelimit.slidingWindow(8,'15 m'),prefix:key('login-limit'),analytics:false});const limit=isLocal()?{success:await localStore.limit(key('limit:'+digest(username)))}:await limiter.limit(digest(username));if(!limit.success)return json({error:'Too many login attempts. Try again in 15 minutes.'},429);
  const state=await readState();const user=state.admins.find(a=>a.active&&(a.username.toLowerCase()===username||a.email.toLowerCase()===username));
  // Same expensive operation for unknown users avoids a cheap username timing probe.
  const fallback='scrypt:00000000000000000000000000000000:'+'00'.repeat(64);const valid=verifyPassword(password,user?.passwordHash||fallback);if(!user||!valid)return json({error:'Invalid username or password.'},401);
  const value=token(),csrf=token(),ttl=data.remember?60*60*24*7:60*60*8;
  await mutate(s=>{const current=s.admins.find(a=>a.id===user.id);if(!current?.active||current.passwordHash!==user.passwordHash)throw Error('Account changed. Please sign in again.');current.lastLogin=new Date().toISOString();audit(s,current,'Logged in','Authentication',current.id)});
  const prior=req.cookies.get(cookie)?.value;if(prior)await redis().del(key('session:'+digest(prior)));
  await redis().set(key('session:'+digest(value)),{userId:user.id,version:user.sessionVersion,csrf},{ex:ttl});const res=json({ok:true});res.cookies.set(cookie,value,{httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:ttl});return res;
 }
 const auth=await session(req);if(!auth)return json({error:'Please sign in again.'},401);if(req.headers.get('x-csrf-token')!==auth.sess.csrf)return json({error:'Your security token expired. Refresh this page.'},403);
 if(action==='logout'){await mutate(s=>audit(s,auth.user,'Logged out','Authentication',auth.user.id));await redis().del(key('session:'+digest(auth.value)));const res=json({ok:true});res.cookies.set(cookie,'',{httpOnly:true,sameSite:'strict',secure:new URL(req.url).protocol==='https:',path:'/',maxAge:0});return res}
 if(action==='password.change'){const password=z.string().min(12).max(128).parse(data.password);if(password!==data.confirmPassword)throw Error('Passwords do not match.');if(!verifyPassword(String(data.currentPassword||''),auth.user.passwordHash))throw Error('Current password is incorrect.');await mutate(s=>{const a=s.admins.find(x=>x.id===auth.user.id)!;if(a.passwordHash!==auth.user.passwordHash)throw Error('Account changed. Sign in again.');a.passwordHash=hashPassword(password);a.sessionVersion++;a.mustChangePassword=false;audit(s,a,'Changed password','Authentication',a.id)});await redis().del(key('session:'+digest(auth.value)));const res=json({ok:true,signInAgain:true});res.cookies.set(cookie,'',{path:'/',maxAge:0});return res}
 if(auth.user.mustChangePassword)return json({error:'Change your temporary password before continuing.'},403);
 const result=await mutate(s=>{const current=s.admins.find(x=>x.id===auth.user.id&&x.active&&x.sessionVersion===auth.sess.version);if(!current)throw Error('Your account permissions changed. Sign in again.');return operate(s,current,action,data)});return json({ok:true,result});
 }catch(e){if(e instanceof GymStorageError)return json({error:e.message,code:e.code},503);if(e instanceof ZodError)return json({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);const message=e instanceof Error?e.message:'Request failed.';if(/Upstash|fetch|ECONN|database/i.test(message)){console.error(message);return json({error:'Database unavailable. Verify the Upstash connection and try again.'},503)}return json({error:message},400)}}


