begin;
create table public.club_push_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique check (length(endpoint) between 20 and 2048),
  subscription jsonb not null,
  origin text not null check (length(origin)<300),
  updated_at timestamptz not null default now()
);
create index club_push_device_owner on public.club_push_devices(tenant_id,user_id);
create table public.club_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  recipient_id uuid not null references auth.users on delete cascade,
  created_by uuid not null references auth.users,
  request_id uuid not null,
  kind text not null check (kind in ('payment','activity','test')),
  title text not null check (length(trim(title)) between 1 and 80),
  body text not null check (length(trim(body)) between 1 and 240),
  status text not null check (status in ('sending','no_devices','accepted','partial','failed')),
  accepted integer not null default 0,
  failed integer not null default 0,
  created_at timestamptz not null default now(),
  unique(tenant_id,created_by,request_id)
);
create index club_notifications_inbox on public.club_notifications(tenant_id,recipient_id,created_at desc);
create table public.club_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.club_notifications on delete cascade,
  device_id uuid not null,
  subscription jsonb not null,
  origin text not null,
  status text not null default 'pending' check (status in ('pending','accepted','expired','failed'))
);
alter table public.club_push_devices enable row level security;
alter table public.club_notifications enable row level security;
alter table public.club_push_deliveries enable row level security;
revoke all on public.club_push_devices,public.club_notifications,public.club_push_deliveries from anon,authenticated;
grant select on public.club_push_devices,public.club_notifications to authenticated;

create function public.club_push_enabled(p_tenant uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.club_role(p_tenant) is not null and exists(select 1 from public.tenant_modules where tenant_id=p_tenant and module_id='push' and enabled);
$$;
create policy club_push_own on public.club_push_devices for select to authenticated using (user_id=auth.uid() and public.club_role(tenant_id) is not null);
create policy club_notifications_read on public.club_notifications for select to authenticated using (
  public.club_push_enabled(tenant_id) and (recipient_id=auth.uid() or public.club_role(tenant_id)='admin'));

create function public.club_push_subscribe(p_tenant uuid,p_subscription jsonb,p_origin text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; endpoint_value text:=p_subscription->>'endpoint';
begin
 if not public.club_push_enabled(p_tenant) then raise exception 'Notificaciones no habilitadas para esta cuenta.' using errcode='42501'; end if;
 if p_subscription is null or length(p_subscription::text)>4096
   or coalesce(endpoint_value,'') !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
   or coalesce(p_subscription->'keys'->>'p256dh','') !~ '^[A-Za-z0-9_-]{87}=?$'
   or coalesce(p_subscription->'keys'->>'auth','') !~ '^[A-Za-z0-9_-]{22}(==)?$'
   or p_origin is null or p_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' then
   raise exception 'Suscripción o dirección inválida.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||auth.uid()::text,1));
 if (select count(*) from public.club_push_devices where tenant_id=p_tenant and user_id=auth.uid())>=5 and not exists(select 1 from public.club_push_devices where endpoint=endpoint_value and user_id=auth.uid() and tenant_id=p_tenant) then raise exception 'Máximo de cinco dispositivos por cuenta.'; end if;
 insert into public.club_push_devices(tenant_id,user_id,endpoint,subscription,origin)
 values(p_tenant,auth.uid(),endpoint_value,p_subscription,p_origin)
 on conflict(endpoint) do update set subscription=excluded.subscription,origin=excluded.origin,updated_at=now()
 where public.club_push_devices.user_id=auth.uid() and public.club_push_devices.tenant_id=p_tenant returning id into result;
 if result is null then raise exception 'Desactivá el aviso anterior de este dispositivo y volvé a activarlo.'; end if;
 return result;
end $$;
create function public.club_push_unsubscribe(p_tenant uuid,p_endpoint text) returns void language sql security definer set search_path='' as $$
 delete from public.club_push_devices where tenant_id=p_tenant and user_id=auth.uid() and endpoint=p_endpoint;
$$;
create function public.club_push_targets(p_tenant uuid) returns table(user_id uuid,display_name text,role text,devices bigint) language plpgsql stable security definer set search_path='' as $$
begin
 if not public.club_push_enabled(p_tenant) or public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 return query select m.user_id,m.display_name,m.role,count(d.id) from public.club_members m left join public.club_push_devices d on d.tenant_id=m.tenant_id and d.user_id=m.user_id where m.tenant_id=p_tenant group by m.user_id,m.display_name,m.role order by m.display_name;
end $$;

create function public.club_push_prepare(p_tenant uuid,p_recipient uuid,p_request uuid,p_kind text,p_title text,p_body text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.club_notifications; targets jsonb;
begin
 if not public.club_push_enabled(p_tenant) or not exists(select 1 from public.club_members where tenant_id=p_tenant and user_id=p_recipient)
 or not (public.club_role(p_tenant)='admin' or (p_recipient=auth.uid() and p_kind='test')) then
   raise exception 'No tenés permiso para enviar este aviso.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||auth.uid()::text,2));
 select * into n from public.club_notifications where tenant_id=p_tenant and created_by=auth.uid() and request_id=p_request;
 if found then return jsonb_build_object('notification',to_jsonb(n),'reused',true,'deliveries','[]'::jsonb); end if;
 if (select count(*) from public.club_notifications where tenant_id=p_tenant and created_by=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Esperá un minuto antes de enviar más avisos.' using errcode='P0001'; end if;
 insert into public.club_notifications(tenant_id,recipient_id,created_by,request_id,kind,title,body,status)
 values(p_tenant,p_recipient,auth.uid(),p_request,p_kind,trim(p_title),trim(p_body),'sending') returning * into n;
 insert into public.club_push_deliveries(notification_id,device_id,subscription,origin)
 select n.id,d.id,d.subscription,d.origin from public.club_push_devices d where d.tenant_id=p_tenant and d.user_id=p_recipient;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'subscription',subscription,'origin',origin)),'[]'::jsonb) into targets from public.club_push_deliveries where notification_id=n.id;
 if jsonb_array_length(targets)=0 then update public.club_notifications set status='no_devices' where id=n.id returning * into n; end if;
 return jsonb_build_object('notification',to_jsonb(n),'reused',false,'deliveries',targets);
end $$;

create function public.club_push_result(p_tenant uuid,p_delivery uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare d public.club_push_deliveries; n public.club_notifications; pending_count integer; accepted_count integer; failed_count integer;
begin
 select n1.* into n from public.club_notifications n1 join public.club_push_deliveries d1 on d1.notification_id=n1.id where d1.id=p_delivery and n1.tenant_id=p_tenant for update of n1;
 if not found or n.created_by<>auth.uid() or not public.club_push_enabled(p_tenant) or not (public.club_role(p_tenant)='admin' or (n.recipient_id=auth.uid() and n.kind='test')) then raise exception 'Acceso no autorizado.' using errcode='42501'; end if;
 if p_status is null or p_status not in ('accepted','expired','failed') then raise exception 'Resultado inválido.'; end if;
 update public.club_push_deliveries set status=p_status where id=p_delivery and status='pending' returning * into d;
 if not found then return; end if;
 if p_status='expired' then delete from public.club_push_devices where id=d.device_id and subscription=d.subscription; end if;
 select count(*) filter(where status='pending'),count(*) filter(where status='accepted'),count(*) filter(where status in ('expired','failed')) into pending_count,accepted_count,failed_count from public.club_push_deliveries where notification_id=n.id;
 update public.club_notifications set accepted=accepted_count,failed=failed_count,status=case when pending_count>0 then 'sending' when accepted_count>0 and failed_count=0 then 'accepted' when accepted_count>0 then 'partial' else 'failed' end where id=n.id;
end $$;
revoke all on function public.club_push_enabled(uuid),public.club_push_subscribe(uuid,jsonb,text),public.club_push_unsubscribe(uuid,text),public.club_push_targets(uuid),public.club_push_prepare(uuid,uuid,uuid,text,text,text),public.club_push_result(uuid,uuid,text) from public,anon;
grant execute on function public.club_push_enabled(uuid),public.club_push_subscribe(uuid,jsonb,text),public.club_push_unsubscribe(uuid,text),public.club_push_targets(uuid),public.club_push_prepare(uuid,uuid,uuid,text,text,text),public.club_push_result(uuid,uuid,text) to authenticated;
commit;
