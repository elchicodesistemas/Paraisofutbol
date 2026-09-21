begin;
create table public.club_people (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 user_id uuid references auth.users, name text not null check(length(trim(name)) between 2 and 120),
 email text not null default '' check(length(email)<=254), phone text not null default '' check(length(phone)<=40),
 active boolean not null default true, updated_at timestamptz not null default now(),
 unique(tenant_id,id), unique(tenant_id,user_id)
);
insert into public.club_people(tenant_id,user_id,name,email)
select m.tenant_id,m.user_id,m.display_name,coalesce(u.email,'') from public.club_members m join auth.users u on u.id=m.user_id;
create table public.club_tags (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 name text not null check(length(trim(name)) between 1 and 60), unique(tenant_id,id)
);
create unique index club_tag_name on public.club_tags(tenant_id,lower(trim(name)));
create table public.club_person_tags (
 tenant_id uuid not null,person_id uuid not null,tag_id uuid not null,
 primary key(tenant_id,person_id,tag_id),
 foreign key(tenant_id,person_id) references public.club_people(tenant_id,id),
 foreign key(tenant_id,tag_id) references public.club_tags(tenant_id,id)
);
create table public.club_dues (
 tenant_id uuid not null,person_id uuid not null,period date not null check(extract(day from period)=1),
 amount numeric(12,2) not null check(amount between 0 and 100000000),
 paid numeric(12,2) not null check(paid>=0 and paid<=amount),
 note text not null default '' check(length(note)<=300), updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users,
 primary key(tenant_id,person_id,period),foreign key(tenant_id,person_id) references public.club_people(tenant_id,id)
);
create table public.club_due_audit (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,person_id uuid not null,period date not null,
 before_value jsonb,after_value jsonb not null,created_by uuid not null references auth.users,created_at timestamptz not null default now(),
 foreign key(tenant_id,person_id) references public.club_people(tenant_id,id)
);
create table public.club_campaigns (
 id uuid primary key,tenant_id uuid not null references public.tenants,tag_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 80),body text not null check(length(trim(body)) between 1 and 240),
 created_by uuid not null references auth.users,created_at timestamptz not null default now(),unique(tenant_id,id),
 foreign key(tenant_id,tag_id) references public.club_tags(tenant_id,id)
);
create table public.club_campaign_items (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,campaign_id uuid not null,
 user_id uuid not null references auth.users, name text not null,
 unique(campaign_id,user_id), foreign key(tenant_id,campaign_id) references public.club_campaigns(tenant_id,id)
);
do $$ declare tab text; begin
 foreach tab in array array['club_people','club_tags','club_person_tags','club_dues','club_due_audit','club_campaigns','club_campaign_items'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('revoke all on public.%I from anon,authenticated',tab);
 execute format('grant select on public.%I to authenticated',tab);
 execute format('create policy admin_read on public.%I for select to authenticated using (public.club_role(tenant_id) = ''admin'')',tab);
 end loop;
end $$;
create function public.club_save_person(p_tenant uuid,p_id uuid,p_name text,p_email text,p_phone text,p_active boolean,p_tags uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text,8));
 if p_tags is null or cardinality(p_tags)>30 or exists(select 1 from unnest(p_tags) t where not exists(select 1 from public.club_tags where id=t and tenant_id=p_tenant)) then raise exception 'Etiquetas inválidas.'; end if;
 if p_id is null then
 insert into public.club_people(tenant_id,name,email,phone,active) values(p_tenant,trim(p_name),lower(trim(p_email)),trim(p_phone),p_active) returning id into result;
 else
 update public.club_people set name=trim(p_name),email=lower(trim(p_email)),phone=trim(p_phone),active=p_active,updated_at=now() where tenant_id=p_tenant and id=p_id returning id into result;
 if result is null then raise exception 'Persona inexistente.'; end if;
 update public.club_members m set display_name=trim(p_name) from public.club_people p where p.id=result and p.tenant_id=p_tenant and m.tenant_id=p_tenant and m.user_id=p.user_id;
 end if;
 delete from public.club_person_tags where tenant_id=p_tenant and person_id=result;
 insert into public.club_person_tags select distinct p_tenant,result,t from unnest(p_tags) t;
 return result;
end $$;
create function public.club_save_tag(p_tenant uuid,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 insert into public.club_tags(tenant_id,name) values(p_tenant,trim(p_name)) returning id into result;
 return result;
end $$;
create function public.club_save_due(p_tenant uuid,p_person uuid,p_period date,p_amount numeric,p_paid numeric,p_note text,p_expected timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare before_row public.club_dues;after_row public.club_dues;
begin
 if public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_person::text||p_period::text,9));
 select * into before_row from public.club_dues where tenant_id=p_tenant and person_id=p_person and period=p_period;
 if before_row.updated_at is distinct from p_expected then raise exception 'Otro administrador actualizó esta cuota. Recargá antes de modificarla.'; end if;
 insert into public.club_dues(tenant_id,person_id,period,amount,paid,note,updated_by)
 values(p_tenant,p_person,p_period,p_amount,p_paid,trim(p_note),auth.uid())
 on conflict(tenant_id,person_id,period) do update set amount=excluded.amount,paid=excluded.paid,note=excluded.note,updated_by=auth.uid(),updated_at=clock_timestamp() returning * into after_row;
 insert into public.club_due_audit(tenant_id,person_id,period,before_value,after_value,created_by)
 values(p_tenant,p_person,p_period,case when before_row.tenant_id is null then null else to_jsonb(before_row) end,to_jsonb(after_row),auth.uid());
end $$;
create function public.club_create_campaign(p_tenant uuid,p_id uuid,p_tag uuid,p_title text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare total integer;
begin
 if public.club_role(p_tenant) is distinct from 'admin' or not public.club_push_enabled(p_tenant) then raise exception 'Acceso exclusivo de administración con avisos habilitados.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text,10));
 if exists(select 1 from public.club_campaigns where id=p_id and tenant_id=p_tenant and created_by=auth.uid()) then return p_id; end if;
 if (select count(*) from public.club_campaigns where tenant_id=p_tenant and created_at>now()-interval '1 hour')>=10 then raise exception 'Máximo de diez envíos grupales por hora en el piloto.'; end if;
 insert into public.club_campaigns(id,tenant_id,tag_id,title,body,created_by) values(p_id,p_tenant,p_tag,trim(p_title),trim(p_body),auth.uid());
 insert into public.club_campaign_items(tenant_id,campaign_id,user_id,name)
 select p_tenant,p_id,p.user_id,p.name from public.club_people p join public.club_person_tags pt on pt.tenant_id=p.tenant_id and pt.person_id=p.id
 where p.tenant_id=p_tenant and pt.tag_id=p_tag and p.active and p.user_id is not null and exists(select 1 from public.club_members m where m.tenant_id=p_tenant and m.user_id=p.user_id);
 get diagnostics total=row_count;
 if total=0 or total>50 then raise exception 'El grupo debe tener entre 1 y 50 personas activas con cuenta vinculada.'; end if;
 return p_id;
end $$;
create function public.club_campaign_progress(p_tenant uuid,p_campaign uuid) returns table(request_id uuid,user_id uuid,name text,status text,accepted integer,failed integer) language plpgsql stable security definer set search_path='' as $$
begin
 if public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 return query select i.id,i.user_id,i.name,n.status,n.accepted,n.failed from public.club_campaign_items i join public.club_campaigns c on c.id=i.campaign_id
 left join public.club_notifications n on n.tenant_id=i.tenant_id and n.created_by=c.created_by and n.request_id=i.id
 where i.tenant_id=p_tenant and i.campaign_id=p_campaign order by i.name;
end $$;
revoke all on function public.club_save_person(uuid,uuid,text,text,text,boolean,uuid[]),public.club_save_tag(uuid,text),public.club_save_due(uuid,uuid,date,numeric,numeric,text,timestamptz),public.club_create_campaign(uuid,uuid,uuid,text,text),public.club_campaign_progress(uuid,uuid) from public,anon;
grant execute on function public.club_save_person(uuid,uuid,text,text,text,boolean,uuid[]),public.club_save_tag(uuid,text),public.club_save_due(uuid,uuid,date,numeric,numeric,text,timestamptz),public.club_create_campaign(uuid,uuid,uuid,text,text),public.club_campaign_progress(uuid,uuid) to authenticated;
-- Allow a bounded group of 50 without dropping the per-sender abuse limit.
do $$ declare definition text; begin
 select pg_get_functiondef('public.club_push_prepare(uuid,uuid,uuid,text,text,text)'::regprocedure) into definition;
 if position('>=10 then' in definition)=0 then raise exception 'La función de avisos cambió; revisar límite antes de migrar.'; end if;
 execute replace(definition,'>=10 then','>=100 then');
end $$;
-- Access management links existing Auth accounts; it never sets passwords.
create policy club_members_admin_read on public.club_members for select to authenticated using(public.club_role(tenant_id)='admin');
create function public.club_person_access(p_tenant uuid,p_person uuid,p_role text,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare p public.club_people; account_id uuid;
begin
 if public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 if p_role is null or p_role not in ('admin','family','student','teacher') or p_enabled is null then raise exception 'Perfil inválido.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text,8));
 if public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 select * into p from public.club_people where tenant_id=p_tenant and id=p_person for update;
 if not found then raise exception 'Persona inexistente.'; end if;
 account_id:=p.user_id;
 if account_id is null then select id into account_id from auth.users where lower(email)=lower(p.email); end if;
 if account_id is null then raise exception 'Primero creá la cuenta en Supabase Auth con este correo. La ficha no genera credenciales.'; end if;
 if account_id=auth.uid() then raise exception 'No podés modificar tu propio acceso desde este panel.'; end if;
 update public.club_people set user_id=account_id,updated_at=now() where id=p.id;
 if p_enabled then
 insert into public.club_members(tenant_id,user_id,role,display_name) values(p_tenant,account_id,p_role,p.name)
 on conflict(tenant_id,user_id) do update set role=excluded.role,display_name=excluded.display_name;
 else
 delete from public.club_members where tenant_id=p_tenant and user_id=account_id;
 delete from public.club_push_devices where tenant_id=p_tenant and user_id=account_id;
 end if;
end $$;
revoke all on function public.club_person_access(uuid,uuid,text,boolean) from public,anon;
grant execute on function public.club_person_access(uuid,uuid,text,boolean) to authenticated;

commit;
