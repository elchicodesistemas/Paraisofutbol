// Continue only recipients without any recorded result. Stable IDs make retries idempotent.
export async function continueCampaign(campaign,{read,send,onProgress}){
 const items=await read(campaign.id);await onProgress(items);
 let errors=0,firstError='';
 for(const item of items){
  if(item.status)continue;
  try{await send({requestId:item.request_id,recipientId:item.user_id,kind:'activity',title:campaign.title,body:campaign.body});}
  catch(error){errors++;firstError ||= error.message || 'No se pudo completar un envío.';}
  // If progress cannot be read, stop: don't guess which later deliveries are safe.
  await onProgress(await read(campaign.id));
 }
 return {errors,firstError};
}
