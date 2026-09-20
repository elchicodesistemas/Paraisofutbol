import {backend,tenantId} from './backend.ts';
import {disablePush} from './push-client.ts';
export type Role='admin'|'family'|'student'|'teacher';
export type ClubUser={id:string;name:string;role:Role};
export const roleNames:Record<Role,string>={admin:'Administrador',family:'Familia',student:'Alumno',teacher:'Profesor'};
let user:ClubUser|null=null;
export const currentUser=()=>user;
export async function restoreSession(){
  user=null;
  if(!backend.user)return;
  const verified=await backend.request('/auth/v1/user');
  const rows=await backend.request(`/rest/v1/club_members?tenant_id=eq.${tenantId}&user_id=eq.${verified.id}&select=user_id,role,display_name`);
  if(!rows[0])throw Error('Tu cuenta todavía no tiene acceso a este club. Pedí al administrador que te asigne un perfil.');
  user={id:verified.id,role:rows[0].role,name:rows[0].display_name};
}
export async function login(email:string,password:string){
  if(backend.user&&backend.user.email?.toLowerCase()!==email.trim().toLowerCase())await disablePush().catch(()=>{});
  user=null;
  await backend.login(email.trim().toLowerCase(),password);
  await restoreSession();
  return user;
}
export async function logout(){try{await disablePush();}finally{user=null;await backend.logout();}}
export function allowed(value:ClubUser|null,roles:Role[]){return Boolean(value&&roles.includes(value.role));}
export const canSubmit=(value:ClubUser|null)=>allowed(value,['admin','family']);
