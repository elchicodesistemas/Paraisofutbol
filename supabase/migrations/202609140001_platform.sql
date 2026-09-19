begin;
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table public.tenant_members (
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('admin','member')),
  primary key (tenant_id,user_id)
);
create table public.tenant_modules (
  tenant_id uuid not null references public.tenants on delete cascade,
  module_id text not null check (module_id in ('auth','push','calendar','payments','documents','chat','agenda','qr','loyalty','admin')),
  enabled boolean not null default true,
  primary key (tenant_id,module_id),
  check (module_id not in ('auth','admin') or enabled)
);
-- Generic starter envelope. Replace with typed domain tables as business rules grow.
create table public.module_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  module_id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ? 'title' and jsonb_typeof(data->'title') = 'string' and char_length(trim(data->>'title')) between 1 and 160),
  created_by uuid not null default auth.uid() references auth.users,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,module_id) references public.tenant_modules(tenant_id,module_id) on delete cascade
);
create index module_records_lookup on public.module_records(tenant_id,module_id,created_at desc);
create table public.push_subscriptions (
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  primary key (tenant_id,user_id,endpoint)
);
-- Fixed search_path and explicit auth.uid(); no membership self-enrollment.
create function public.is_member(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.tenant_members where tenant_id=target and user_id=(select auth.uid()));
$$;
create function public.is_admin(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.tenant_members where tenant_id=target and user_id=(select auth.uid()) and role='admin');
$$;
create function public.module_enabled(target uuid, module text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_member(target) and exists(select 1 from public.tenant_modules where tenant_id=target and module_id=module and enabled);
$$;
revoke all on function public.is_member(uuid), public.is_admin(uuid), public.module_enabled(uuid,text) from public;
grant execute on function public.is_member(uuid), public.is_admin(uuid), public.module_enabled(uuid,text) to authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.module_records enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on public.tenants,public.tenant_members,public.tenant_modules,public.module_records,public.push_subscriptions from anon,authenticated;
grant select on public.tenants,public.tenant_members,public.tenant_modules to authenticated;
grant update(enabled) on public.tenant_modules to authenticated;
grant select,insert,delete on public.module_records to authenticated;
grant select,insert,update,delete on public.push_subscriptions to authenticated;

create policy tenant_read on public.tenants for select to authenticated using (public.is_member(id));
create policy membership_read on public.tenant_members for select to authenticated using (public.is_member(tenant_id));
create policy modules_read on public.tenant_modules for select to authenticated using (public.is_member(tenant_id));
create policy modules_admin on public.tenant_modules for update to authenticated using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));
create policy records_read on public.module_records for select to authenticated using (public.module_enabled(tenant_id,module_id));
create policy records_insert on public.module_records for insert to authenticated with check (
  public.module_enabled(tenant_id,module_id) and created_by=(select auth.uid()) and
  (public.is_admin(tenant_id) or module_id in ('chat','qr'))
);
create policy records_delete on public.module_records for delete to authenticated using (
  public.module_enabled(tenant_id,module_id) and (public.is_admin(tenant_id) or (module_id in ('chat','qr') and created_by=(select auth.uid())))
);
create policy push_own on public.push_subscriptions for all to authenticated using (
  public.module_enabled(tenant_id,'push') and user_id=(select auth.uid())
) with check (public.module_enabled(tenant_id,'push') and user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('documents','documents',false,10485760,array['application/pdf','image/png','image/jpeg','text/plain']);
-- UUID comparison as text avoids cast errors for malformed storage paths.
create policy documents_read on storage.objects for select to authenticated using (
  bucket_id='documents' and exists(select 1 from public.tenant_modules m where m.tenant_id::text=(storage.foldername(name))[1] and m.module_id='documents' and m.enabled)
);
create policy documents_insert on storage.objects for insert to authenticated with check (
  bucket_id='documents' and exists(select 1 from public.tenant_modules m where m.tenant_id::text=(storage.foldername(name))[1] and m.module_id='documents' and m.enabled and public.is_admin(m.tenant_id))
);
create policy documents_delete on storage.objects for delete to authenticated using (
  bucket_id='documents' and exists(select 1 from public.tenant_modules m where m.tenant_id::text=(storage.foldername(name))[1] and m.module_id='documents' and m.enabled and public.is_admin(m.tenant_id))
);
commit;
