import {readFile,writeFile,mkdir} from 'node:fs/promises';
import webpush from 'web-push';
const folder=new URL('../../../.runtime/',import.meta.url);
const file=new URL('push-vapid.json',folder);
export async function loadVapid(){
  await mkdir(folder,{recursive:true});
  try{return JSON.parse(await readFile(file,'utf8'));}
  catch(error){
    if(error.code!=='ENOENT')throw error;
    const keys={...webpush.generateVAPIDKeys(),subject:'mailto:ecs.elchicodesistemas@gmail.com'};
    try{await writeFile(file,JSON.stringify(keys,null,2),{flag:'wx',mode:0o600});return keys;}
    catch(writeError){if(writeError.code==='EEXIST')return JSON.parse(await readFile(file,'utf8'));throw writeError;}
  }
}
export const sendNotification=(...args)=>webpush.sendNotification(...args);
