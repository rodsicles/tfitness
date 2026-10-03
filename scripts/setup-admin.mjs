import {localStore} from '../lib/gym/local-store.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,scryptSync} from 'node:crypto';
import {Redis} from '@upstash/redis';
// Run with: node --env-file-if-exists=.env.local scripts/setup-admin.mjs
const credentialPath=new URL('../.admin-credentials.json',import.meta.url);
let credentials;try{credentials=JSON.parse(await readFile(credentialPath,'utf8'))}catch{credentials={username:'admin',email:'admin@musclet.local',password:randomBytes(18).toString('base64url'),createdAt:new Date().toISOString()};await writeFile(credentialPath,JSON.stringify(credentials,null,2),{mode:0o600})}
const local=process.env.GYM_STORAGE==='local'&&process.env.NODE_ENV!=='production';
if(!local&&(!process.env.UPSTASH_REDIS_REST_URL||!process.env.UPSTASH_REDIS_REST_TOKEN)){console.log('Admin credentials prepared in .admin-credentials.json. Account is NOT active yet. Configure .env.local with Upstash REST URL and token, then run setup:admin again.');process.exit(2)}
const redis=local?localStore:new Redis({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN});
const key=`muscle-t:${process.env.GYM_NAMESPACE||'production'}:state`;
if(await redis.get(key)){console.log('Database already initialized. Existing accounts and records were preserved.');process.exit(0)}
const salt=randomBytes(16).toString('hex');const passwordHash=`scrypt:${salt}:${scryptSync(credentials.password,salt,64).toString('hex')}`;
const now=new Date().toISOString();
const state={version:0,counters:{audit:1},admins:[{id:'ADMIN-001',name:'Gym Administrator',username:credentials.username,email:credentials.email,passwordHash,role:'Super Admin',active:true,mustChangePassword:true,sessionVersion:0,createdAt:now,lastLogin:null}],members:[],memberships:[],checkins:[],walkins:[],payments:[],notes:[],audits:[{id:'AUD-000001',at:now,actor:'System setup',action:'Created initial Super Admin',module:'Admin Accounts',recordId:'ADMIN-001',description:'Initial gym database setup',previous:null,new:{username:credentials.username}}],plans:[['Daily',1,100],['Weekly',7,350],['Monthly',30,1000],['Quarterly',90,2700],['6 Months',180,5000],['Annual',365,9500]].map(([name,duration,price],i)=>({id:'PLAN-'+(i+1),name,duration,price,description:'',active:true})),settings:{gymName:'MUSCLE T FITNESS GYM',address:'',contact:'',email:'',logo:'',threshold:7,walkinRate:100,currency:'PHP',dateFormat:'YYYY-MM-DD',timeFormat:'12-hour',paymentMethods:['Cash','GCash','Maya','Bank Transfer','Other'],rules:'Memberships include the start date and remain valid through the expiration date. Duplicate check-ins are blocked for 15 minutes.'}};
const created=await redis.set(key,state,{nx:true});console.log(created?'Initial Super Admin created in configured storage. Credentials are in .admin-credentials.json. Change the password on first login.':'Another setup completed first. No records were overwritten.');
