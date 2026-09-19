export type Role='admin'|'family'|'student'|'teacher';
export type DemoUser={id:string;username:string;name:string;role:Role};
export const roleNames:Record<Role,string>={admin:'Administrador',family:'Familia',student:'Alumno',teacher:'Profesor'};
export const demoUsers:DemoUser[]=[
  {id:'admin-demo',username:'admin',name:'Administración demo',role:'admin'},
  {id:'family-demo',username:'familia',name:'Familia de Alex · demo',role:'family'},
  {id:'student-demo',username:'alumno',name:'Alex · alumno demo',role:'student'},
  {id:'teacher-demo',username:'profe',name:'Marcos · profesor demo',role:'teacher'},
];
export const demoPassword='Paraiso123!';
const sessionKey='nexo:paraiso:demo-session:v1';
export function currentUser():DemoUser|null{
  try{const saved=JSON.parse(sessionStorage.getItem(sessionKey)||'null');
    if(!saved||saved.expiresAt<Date.now())return null;
    return demoUsers.find(user=>user.id===saved.id)||null;
  }catch{return null;}
}
export function login(username:string,password:string){
  const user=demoUsers.find(user=>user.username===username.trim().toLowerCase());
  if(!user||password!==demoPassword)throw Error('Usuario o contraseña incorrectos. Usá una de las cuentas de prueba.');
  sessionStorage.setItem(sessionKey,JSON.stringify({id:user.id,expiresAt:Date.now()+8*60*60*1000}));
  return user;
}
export function logout(){sessionStorage.removeItem(sessionKey);}
export function allowed(user:DemoUser|null,roles:Role[]){return Boolean(user&&roles.includes(user.role));}
export const canSubmit=(user:DemoUser|null)=>allowed(user,['admin','family']);
