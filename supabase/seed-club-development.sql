-- Run manually only in development after creating these test Auth accounts.
-- Exact Auth UUIDs prevent matching new accounts with reused email addresses.
-- No credentials or production access are included in migrations.
begin;
insert into public.club_members(tenant_id,user_id,role,display_name)
select '11ee1db5-485d-498f-a915-dd36dd7b2e70'::uuid,u.id,v.role,v.name
from (values
 ('3f61d069-f62b-4a13-a831-0e4dfa60b15a'::uuid,'admin','Administración de prueba'),
 ('fa0f869c-9fc2-4358-a529-9259fe087a00'::uuid,'family','Familia de prueba'),
 ('7f2e5d62-1d7e-4f6e-8716-24a8bdef8c72'::uuid,'family','Segunda familia de prueba'),
 ('d009aebe-7143-47d0-bf18-08a479ae1b09'::uuid,'student','Alumno de prueba'),
 ('be01dfdf-fcea-4326-b7c8-27b28821b434'::uuid,'teacher','Profesor de prueba')
) as v(id,role,name) join auth.users u on u.id=v.id
on conflict (tenant_id,user_id) do nothing;
commit;
select role,display_name from public.club_members where tenant_id='11ee1db5-485d-498f-a915-dd36dd7b2e70';
