begin;
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

-- Club roles are separate from platform administration. Clients cannot assign roles.
create table public.club_members (
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin','family','student','teacher')),
  display_name text not null check (length(display_name) between 1 and 120),
  primary key(tenant_id,user_id)
);
create table public.club_settings (
  tenant_id uuid primary key references public.tenants on delete cascade,
  enabled boolean not null default true,
  open_hour integer not null default 9 check (open_hour between 0 and 23),
  close_hour integer not null default 23 check (close_hour between 1 and 24),
  duration integer not null default 60 check (duration in (30,60,90,120)),
  deposit numeric not null default 0 check (deposit between 0 and 10000000),
  payment text not null default 'PRUEBA. NO TRANSFERIR' check (length(payment) between 1 and 150),
  check (close_hour > open_hour)
);
create table public.club_bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.club_settings,
  owner_id uuid not null references auth.users,
  request_id uuid not null,
  court text not null check (court in ('Cancha1','Cancha 2','Cancha 3','Cancha 4','Cancha de 8','Parrilla','Solo parrilla','Sum')),
  date date not null,
  start_min integer not null check (start_min between 0 and 1439),
  end_min integer not null check (end_min between 1 and 1440 and end_min > start_min),
  name text not null check (length(trim(name)) between 3 and 120),
  dni text not null check (dni ~ '^[0-9]{6,10}$'),
  phone text not null check (phone ~ '^[+0-9 ()-]{6,25}$'),
  status text not null default 'pendiente' check (status in ('pendiente','confirmada','cancelada')),
  deposit numeric not null,
  payment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,owner_id,request_id),
  exclude using gist (tenant_id with =, court with =, date with =, int4range(start_min,end_min,'[)') with &&)
    where (status <> 'cancelada')
);
create index club_bookings_owner on public.club_bookings(tenant_id,owner_id,date);

create function public.club_role(p_tenant uuid) returns text language sql stable security definer set search_path='' as $$
  select role from public.club_members where tenant_id=p_tenant and user_id=(select auth.uid());
$$;
create function public.club_agenda_enabled(p_tenant uuid) returns boolean language sql stable security definer set search_path='' as $$
  select public.club_role(p_tenant) is not null and exists (
    select 1 from public.tenant_modules where tenant_id=p_tenant and module_id='agenda' and enabled);
$$;
alter table public.club_members enable row level security;
alter table public.club_settings enable row level security;
alter table public.club_bookings enable row level security;
revoke all on public.club_members,public.club_settings,public.club_bookings from anon,authenticated;
grant select on public.club_members,public.club_settings,public.club_bookings to authenticated;
create policy club_members_self on public.club_members for select to authenticated using (user_id=(select auth.uid()));
create policy club_settings_read on public.club_settings for select to authenticated using (public.club_agenda_enabled(tenant_id));
create policy club_bookings_read on public.club_bookings for select to authenticated using (
  public.club_agenda_enabled(tenant_id) and (public.club_role(tenant_id)='admin' or (owner_id=(select auth.uid()) and public.club_role(tenant_id)='family')));

-- Only times and availability leave this function, never another family's data.
create function public.club_slots(p_tenant uuid,p_court text,p_date date)
returns table(start integer,available boolean) language plpgsql stable security definer set search_path='' as $$
begin
  if not public.club_agenda_enabled(p_tenant) then raise exception 'Acceso no autorizado o agenda deshabilitada.' using errcode='42501'; end if;
  return query select n,not exists(select 1 from public.club_bookings b where b.tenant_id=p_tenant and b.court=p_court and b.date=p_date and b.status<>'cancelada' and n<b.end_min and n+s.duration>b.start_min)
    from public.club_settings s cross join lateral generate_series(s.open_hour*60,s.close_hour*60-s.duration,s.duration) n
    where s.tenant_id=p_tenant and s.enabled and (p_date+n*interval '1 minute') at time zone 'America/Argentina/Buenos_Aires'>now();
end $$;

create function public.club_book(p_tenant uuid,p_request uuid,p_court text,p_date date,p_start integer,p_name text,p_dni text,p_phone text)
returns public.club_bookings language plpgsql security definer set search_path='' as $$
declare s public.club_settings; b public.club_bookings;
begin
  if not public.club_agenda_enabled(p_tenant) or coalesce(public.club_role(p_tenant),'') not in ('admin','family') then
    raise exception 'Tu perfil no puede reservar.' using errcode='42501'; end if;
  -- Serialize retries for the same user; the exclusion constraint protects all users/devices.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||auth.uid()::text,0));
  select * into b from public.club_bookings where tenant_id=p_tenant and owner_id=auth.uid() and request_id=p_request;
  if found then return b; end if;
  select * into s from public.club_settings where tenant_id=p_tenant for share;
  if not found or not s.enabled or p_start<s.open_hour*60 or p_start+s.duration>s.close_hour*60
     or (p_start-s.open_hour*60)%s.duration<>0
     or (p_date+p_start*interval '1 minute') at time zone 'America/Argentina/Buenos_Aires'<=now() then
    raise exception 'El turno no corresponde a la agenda.'; end if;
  insert into public.club_bookings(tenant_id,owner_id,request_id,court,date,start_min,end_min,name,dni,phone,deposit,payment)
  values(p_tenant,auth.uid(),p_request,p_court,p_date,p_start,p_start+s.duration,trim(p_name),p_dni,p_phone,s.deposit,s.payment) returning * into b;
  return b;
exception when exclusion_violation then raise exception 'Ese turno ya está ocupado. Actualizá la disponibilidad.' using errcode='23P01';
end $$;

create function public.club_set_status(p_tenant uuid,p_id uuid,p_status text)
returns public.club_bookings language plpgsql security definer set search_path='' as $$
declare b public.club_bookings;
begin
  if not public.club_agenda_enabled(p_tenant) or public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
  if p_status is null or p_status not in ('confirmada','cancelada') then raise exception 'Estado inválido.'; end if;
  update public.club_bookings set status=p_status,updated_at=now() where tenant_id=p_tenant and id=p_id and status<>'cancelada' returning * into b;
  if not found then raise exception 'Reserva inexistente o cancelada.'; end if;
  return b;
end $$;

create function public.club_configure(p_tenant uuid,p_enabled boolean,p_open integer,p_close integer,p_duration integer,p_deposit numeric,p_payment text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.club_agenda_enabled(p_tenant) or public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
  update public.club_settings set enabled=p_enabled,open_hour=p_open,close_hour=p_close,duration=p_duration,deposit=p_deposit,payment=p_payment where tenant_id=p_tenant;
end $$;
revoke all on function public.club_role(uuid),public.club_agenda_enabled(uuid),public.club_slots(uuid,text,date),public.club_book(uuid,uuid,text,date,integer,text,text,text),public.club_set_status(uuid,uuid,text),public.club_configure(uuid,boolean,integer,integer,integer,numeric,text) from public,anon;
grant execute on function public.club_role(uuid),public.club_agenda_enabled(uuid),public.club_slots(uuid,text,date),public.club_book(uuid,uuid,text,date,integer,text,text,text),public.club_set_status(uuid,uuid,text),public.club_configure(uuid,boolean,integer,integer,integer,numeric,text) to authenticated;
insert into public.club_settings(tenant_id) values('11ee1db5-485d-498f-a915-dd36dd7b2e70');
commit;
