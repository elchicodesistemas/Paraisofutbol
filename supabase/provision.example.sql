-- Run manually in the Supabase SQL Editor after the migration.
-- First create a user via the application and confirm their email.
-- Replace the email below with that existing account. Fails if it doesn't exist.
do $$
declare
  owner_id uuid;
  company_id uuid;
begin
  select id into strict owner_id from auth.users where email='REPLACE_WITH_YOUR_EMAIL';
  insert into public.tenants(name) values ('Mi empresa') returning id into company_id;
  insert into public.tenant_members(tenant_id,user_id,role) values (company_id,owner_id,'admin');
  insert into public.tenant_modules(tenant_id,module_id)
  select company_id,unnest(array['auth','push','calendar','payments','documents','chat','agenda','qr','loyalty','admin']);
  raise notice 'Set config.tenantId to %', company_id;
end $$;
