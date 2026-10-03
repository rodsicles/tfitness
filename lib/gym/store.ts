import {localStore} from './local-store.mjs';
import {Redis} from '@upstash/redis';
import {emptyState, type State} from './model';
export const isLocal=()=>process.env.GYM_STORAGE==='local'&&process.env.NODE_ENV!=='production';
export function redis():Redis{if(isLocal())return localStore as unknown as Redis;const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;if(!url||!token)throw new Error('Database is not connected. Ask your administrator to configure Upstash.');return new Redis({url,token,automaticDeserialization:true})}
export const key=(suffix:string)=>`muscle-t:${process.env.GYM_NAMESPACE||'production'}:${suffix}`;
export async function readState():Promise<State>{const state=await redis().get<State>(key('state'));if(!state)throw new Error('The gym database has not been initialized. Run npm run setup:admin.');return state}
// Optimistic compare-and-set: all business records and audit entries commit together.
const cas="local raw=redis.call('GET',KEYS[1]); if not raw then return -1 end; local s=cjson.decode(raw); if s.version~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1";
export async function mutate<T>(fn:(s:State)=>T|Promise<T>):Promise<T>{for(let i=0;i<5;i++){const s=await readState();const v=s.version;const result=await fn(s);s.version=v+1;const ok=await redis().eval(cas,[key('state')],[v,JSON.stringify(s)]);if(Number(ok)===1)return result}throw new Error('Another staff member updated these records. Please retry.')}
export {emptyState};
