begin;
-- Initial client identity. No Auth accounts or shared passwords are created.
insert into public.tenants(id,name)
values ('11ee1db5-485d-498f-a915-dd36dd7b2e70','El Paraíso Deportes');
insert into public.tenant_modules(tenant_id,module_id,enabled)
select '11ee1db5-485d-498f-a915-dd36dd7b2e70'::uuid, module_id, true
from unnest(array['auth','push','calendar','payments','documents','chat','agenda','qr','loyalty','admin']) as module_id;
commit;
