import {scryptSync,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`}
export function verifyPassword(password:string,hash:string){try{const [kind,salt,value]=hash.split(':');if(kind!=='scrypt')return false;const actual=scryptSync(password,salt,64);const expected=Buffer.from(value,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected)}catch{return false}}
export const token=()=>randomBytes(32).toString('hex');
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
