import config from '../../../../public/config.js';
import {createSupabase} from '../../../../public/src/core/supabase.js';
export const tenantId='11ee1db5-485d-498f-a915-dd36dd7b2e70';
export const backend=createSupabase(config);
export const rpc=(name:string,params:Record<string,unknown>={})=>backend.request(`/rest/v1/rpc/${name}`,{method:'POST',body:{p_tenant:tenantId,...params}});
