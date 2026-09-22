begin;
set local search_path=public,extensions;
create table public.school_categories(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,name text not null check(length(trim(name)) between 2 and 80),
 min_age integer not null check(min_age between 0 and 99),max_age integer not null check(max_age between min_age and 99),division text not null default 'Mixta' check(length(division)<=50),active boolean not null default true,unique(tenant_id,id),unique(tenant_id,name)
);
create table public.school_tutors(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,name text not null check(length(trim(name)) between 2 and 120),birth_date date not null check(birth_date<=(current_date-interval '18 years')::date),
 phone text not null check(length(trim(phone)) between 6 and 40),email text not null default '' check(length(email)<=254),person_id uuid,unique(tenant_id,id),foreign key(tenant_id,person_id) references public.club_people(tenant_id,id)
);
create table public.school_students(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,name text not null check(length(trim(name)) between 2 and 120),birth_date date not null check(birth_date between '1900-01-01' and current_date),
 tutor_id uuid not null,relationship text not null check(relationship in('Padre','Madre','Tutor')),category_id uuid not null,position text not null default '' check(length(position)<=80),active boolean not null default true,created_at timestamptz not null default now(),
 unique(tenant_id,id),foreign key(tenant_id,tutor_id) references public.school_tutors(tenant_id,id),foreign key(tenant_id,category_id) references public.school_categories(tenant_id,id)
);
create table public.school_medical(
 tenant_id uuid not null,student_id uuid not null,allergies text not null default '' check(length(allergies)<=2000),insurance text not null default '' check(length(insurance)<=200),notes text not null default '' check(length(notes)<=5000),valid_until date,
 primary key(tenant_id,student_id),foreign key(tenant_id,student_id) references public.school_students(tenant_id,id)
);
create table public.school_staff(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants,name text not null check(length(trim(name)) between 2 and 120),phone text not null default '' check(length(phone)<=40),email text not null default '' check(length(email)<=254),user_id uuid,active boolean not null default true,
 unique(tenant_id,id),unique(tenant_id,user_id),foreign key(tenant_id,user_id) references public.club_members(tenant_id,user_id) on delete set null(user_id)
);
create table public.school_staff_pay(
 tenant_id uuid not null,staff_id uuid not null,mode text not null check(mode in('Mensual','Por hora')),amount numeric(12,2) not null check(amount between 0 and 100000000),primary key(tenant_id,staff_id),foreign key(tenant_id,staff_id) references public.school_staff(tenant_id,id)
);
create table public.school_assignments(
 tenant_id uuid not null,category_id uuid not null,staff_id uuid not null,primary key(tenant_id,category_id,staff_id),foreign key(tenant_id,category_id) references public.school_categories(tenant_id,id),foreign key(tenant_id,staff_id) references public.school_staff(tenant_id,id)
);
create table public.school_sessions(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,date date not null,start_min integer not null check(start_min between 0 and 1439),end_min integer not null check(end_min between 1 and 1440 and end_min>start_min),category_id uuid not null,staff_id uuid not null,court text not null default '' check(length(court)<=80),plan text not null default '' check(length(plan)<=5000),cancelled boolean not null default false,
 unique(tenant_id,id),foreign key(tenant_id,category_id) references public.school_categories(tenant_id,id),foreign key(tenant_id,staff_id) references public.school_staff(tenant_id,id),
 exclude using gist(tenant_id with =,staff_id with =,date with =,int4range(start_min,end_min,'[)') with &&) where(not cancelled),
 exclude using gist(tenant_id with =,category_id with =,date with =,int4range(start_min,end_min,'[)') with &&) where(not cancelled)
);
create table public.school_attendance(
 tenant_id uuid not null,session_id uuid not null,student_id uuid not null,state text not null check(state in('Presente','Ausente','Justificado')),note text not null default '' check(length(note)<=300),updated_by uuid not null references auth.users,updated_at timestamptz not null default now(),
 primary key(tenant_id,session_id,student_id),foreign key(tenant_id,session_id) references public.school_sessions(tenant_id,id),foreign key(tenant_id,student_id) references public.school_students(tenant_id,id)
);
create table public.school_charges(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,student_id uuid not null,kind text not null check(kind in('Cuota','Matrícula')),period date not null check(extract(day from period)=1),due_date date not null,amount numeric(12,2) not null check(amount>0 and amount<=100000000),concept text not null check(length(trim(concept)) between 1 and 200),created_at timestamptz not null default now(),created_by uuid not null references auth.users,
 unique(tenant_id,id),unique(tenant_id,student_id,kind,period),foreign key(tenant_id,student_id) references public.school_students(tenant_id,id)
);
create unique index school_enrollment_season on public.school_charges(tenant_id,student_id,(extract(year from period))) where kind='Matrícula';
create table public.school_payments(
 id uuid primary key,tenant_id uuid not null,charge_id uuid not null,amount numeric(12,2) not null check(amount>0 and amount<=100000000),method text not null check(method in('Efectivo','Transferencia','Tarjeta')),date date not null check(date<=current_date),reference text not null default '' check(length(reference)<=200),created_by uuid not null references auth.users,created_at timestamptz not null default now(),void_reason text check(length(trim(void_reason)) between 3 and 300),voided_by uuid references auth.users,voided_at timestamptz,
 unique(tenant_id,id),foreign key(tenant_id,charge_id) references public.school_charges(tenant_id,id)
);
create table public.school_expenses(
 id uuid primary key,tenant_id uuid not null references public.tenants,date date not null,concept text not null check(length(trim(concept)) between 2 and 200),category text not null check(category in('Personal','Alquiler','Materiales','Otro')),amount numeric(12,2) not null check(amount>0 and amount<=100000000),method text not null check(method in('Efectivo','Transferencia','Tarjeta')),created_by uuid not null references auth.users,created_at timestamptz not null default now()
);
create table public.school_matches(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null,category_id uuid not null,date date not null,start_min integer not null check(start_min between 0 and 1439),opponent text not null check(length(trim(opponent)) between 2 and 120),venue text not null check(length(trim(venue)) between 2 and 200),side text not null check(side in('Local','Visitante')),status text not null default 'Programado' check(status in('Programado','Jugado','Cancelado')),unique(tenant_id,id),foreign key(tenant_id,category_id) references public.school_categories(tenant_id,id)
);
create table public.school_callups(
 tenant_id uuid not null,match_id uuid not null,student_id uuid not null,goals integer not null default 0 check(goals between 0 and 50),assists integer not null default 0 check(assists between 0 and 50),minutes integer not null default 0 check(minutes between 0 and 180),yellow integer not null default 0 check(yellow between 0 and 2),red integer not null default 0 check(red between 0 and 1),
 primary key(tenant_id,match_id,student_id),foreign key(tenant_id,match_id) references public.school_matches(tenant_id,id),foreign key(tenant_id,student_id) references public.school_students(tenant_id,id)
);
create table public.school_files(
 id uuid primary key,tenant_id uuid not null references public.tenants,student_id uuid,staff_id uuid,kind text not null check(kind in('Foto','Apto médico','Certificación')),name text not null check(length(name) between 1 and 200),path text not null unique,created_at timestamptz not null default now(),
 check((student_id is not null and staff_id is null and kind in('Foto','Apto médico')) or (student_id is null and staff_id is not null and kind='Certificación')),
 foreign key(tenant_id,student_id) references public.school_students(tenant_id,id),foreign key(tenant_id,staff_id) references public.school_staff(tenant_id,id)
);
create function public.school_can_category(p_tenant uuid,p_category uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.club_role(p_tenant)='admin' or (public.club_role(p_tenant)='teacher' and exists(select 1 from public.school_assignments a join public.school_staff s on s.tenant_id=a.tenant_id and s.id=a.staff_id where a.tenant_id=p_tenant and a.category_id=p_category and s.user_id=auth.uid() and s.active));
$$;
create function public.school_can_student(p_tenant uuid,p_student uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.school_students s where s.tenant_id=p_tenant and s.id=p_student and public.school_can_category(p_tenant,s.category_id));
$$;
do $$ declare tab text; begin
 foreach tab in array array['school_categories','school_tutors','school_students','school_medical','school_staff','school_staff_pay','school_assignments','school_sessions','school_attendance','school_charges','school_payments','school_expenses','school_matches','school_callups','school_files'] loop
 execute format('alter table public.%I enable row level security',tab);execute format('revoke all on public.%I from anon,authenticated',tab);execute format('grant select on public.%I to authenticated',tab);
 execute format('create policy school_admin on public.%I for select to authenticated using(public.club_role(tenant_id)=''admin'')',tab);
 end loop;
end $$;
create policy school_categories_teacher on public.school_categories for select to authenticated using(public.school_can_category(tenant_id,id));
create policy school_students_teacher on public.school_students for select to authenticated using(public.school_can_category(tenant_id,category_id));
create policy school_sessions_teacher on public.school_sessions for select to authenticated using(public.school_can_category(tenant_id,category_id));
create policy school_assignments_teacher on public.school_assignments for select to authenticated using(public.school_can_category(tenant_id,category_id));
create policy school_staff_self on public.school_staff for select to authenticated using(user_id=auth.uid() and public.club_role(tenant_id)='teacher');
create policy school_attendance_teacher on public.school_attendance for select to authenticated using(exists(select 1 from public.school_sessions s where s.tenant_id=school_attendance.tenant_id and s.id=school_attendance.session_id and public.school_can_category(s.tenant_id,s.category_id)));
create policy school_matches_teacher on public.school_matches for select to authenticated using(public.school_can_category(tenant_id,category_id));
create policy school_callups_teacher on public.school_callups for select to authenticated using(exists(select 1 from public.school_matches m where m.tenant_id=school_callups.tenant_id and m.id=school_callups.match_id and public.school_can_category(m.tenant_id,m.category_id)));
create policy school_photo_teacher on public.school_files for select to authenticated using(kind='Foto' and public.school_can_student(tenant_id,student_id));

create function public.school_save(p_tenant uuid,p_kind text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare k uuid:=coalesce((p_data->>'id')::uuid,gen_random_uuid()); result uuid; cat uuid; sess public.school_sessions; mat public.school_matches; ch public.school_charges; existing_payment public.school_payments; paid numeric; birth date; age_year integer; v_item jsonb;
begin
 if public.club_role(p_tenant) is distinct from 'admin' and p_kind not in('plan','attendance','callup') then raise exception 'Acceso exclusivo de administración.' using errcode='42501'; end if;
 if p_data is null or length(p_data::text)>30000 then raise exception 'Datos inválidos.'; end if;
 if p_kind='category' then
 insert into public.school_categories(id,tenant_id,name,min_age,max_age,division,active) values(k,p_tenant,trim(p_data->>'name'),(p_data->>'min_age')::int,(p_data->>'max_age')::int,p_data->>'division',coalesce((p_data->>'active')::boolean,true))
 on conflict(id) do update set name=excluded.name,min_age=excluded.min_age,max_age=excluded.max_age,division=excluded.division,active=excluded.active where school_categories.tenant_id=p_tenant returning id into result;
 elsif p_kind='tutor' then
 insert into public.school_tutors(id,tenant_id,name,birth_date,phone,email,person_id) values(k,p_tenant,trim(p_data->>'name'),(p_data->>'birth_date')::date,trim(p_data->>'phone'),lower(trim(coalesce(p_data->>'email',''))),nullif(p_data->>'person_id','')::uuid)
 on conflict(id) do update set name=excluded.name,birth_date=excluded.birth_date,phone=excluded.phone,email=excluded.email,person_id=excluded.person_id where school_tutors.tenant_id=p_tenant returning id into result;
 elsif p_kind='student' then
 birth:=(p_data->>'birth_date')::date;age_year:=extract(year from current_date)::int-extract(year from birth)::int;cat:=nullif(p_data->>'category_id','')::uuid;
 if cat is null then
 if (select count(*) from public.school_categories where tenant_id=p_tenant and active and age_year between min_age and max_age)<>1 then raise exception 'Elegí una categoría: no hay una coincidencia única para su edad.'; end if;
 select id into cat from public.school_categories where tenant_id=p_tenant and active and age_year between min_age and max_age;
 end if;
 if not exists(select 1 from public.school_categories where tenant_id=p_tenant and id=cat and age_year between min_age and max_age and active) then raise exception 'La categoría no corresponde a la edad que cumple este año.'; end if;
 insert into public.school_students(id,tenant_id,name,birth_date,tutor_id,relationship,category_id,position,active) values(k,p_tenant,trim(p_data->>'name'),birth,(p_data->>'tutor_id')::uuid,p_data->>'relationship',cat,coalesce(p_data->>'position',''),coalesce((p_data->>'active')::boolean,true))
 on conflict(id) do update set name=excluded.name,birth_date=excluded.birth_date,tutor_id=excluded.tutor_id,relationship=excluded.relationship,category_id=excluded.category_id,position=excluded.position,active=excluded.active where school_students.tenant_id=p_tenant returning id into result;
 if result is not null then
 insert into public.school_medical(tenant_id,student_id,allergies,insurance,notes,valid_until) values(p_tenant,result,coalesce(p_data->>'allergies',''),coalesce(p_data->>'insurance',''),coalesce(p_data->>'notes',''),nullif(p_data->>'valid_until','')::date)
 on conflict(tenant_id,student_id) do update set allergies=excluded.allergies,insurance=excluded.insurance,notes=excluded.notes,valid_until=excluded.valid_until;
 end if;
 elsif p_kind='staff' then
 if nullif(p_data->>'user_id','') is not null and not exists(select 1 from public.club_members where tenant_id=p_tenant and user_id=(p_data->>'user_id')::uuid and role in('teacher','admin')) then raise exception 'Vinculá una cuenta con perfil profesor o administrador.'; end if;
 insert into public.school_staff(id,tenant_id,name,phone,email,user_id,active) values(k,p_tenant,trim(p_data->>'name'),coalesce(p_data->>'phone',''),coalesce(p_data->>'email',''),nullif(p_data->>'user_id','')::uuid,coalesce((p_data->>'active')::boolean,true))
 on conflict(id) do update set name=excluded.name,phone=excluded.phone,email=excluded.email,user_id=excluded.user_id,active=excluded.active where school_staff.tenant_id=p_tenant returning id into result;
 if result is not null then
 insert into public.school_staff_pay(tenant_id,staff_id,mode,amount) values(p_tenant,result,p_data->>'pay_mode',(p_data->>'pay_amount')::numeric) on conflict(tenant_id,staff_id) do update set mode=excluded.mode,amount=excluded.amount;
 delete from public.school_assignments where tenant_id=p_tenant and staff_id=result;
 insert into public.school_assignments(tenant_id,staff_id,category_id) select distinct p_tenant,result,value::uuid from jsonb_array_elements_text(coalesce(p_data->'categories','[]'::jsonb));
 end if;
 elsif p_kind='session' then
 if not exists(select 1 from public.school_assignments a join public.school_staff s on s.id=a.staff_id and s.tenant_id=a.tenant_id where a.tenant_id=p_tenant and a.category_id=(p_data->>'category_id')::uuid and a.staff_id=(p_data->>'staff_id')::uuid and s.active) then raise exception 'El profesor debe estar activo y asignado a esa categoría.'; end if;
 if exists(select 1 from public.school_attendance where tenant_id=p_tenant and session_id=k) then raise exception 'Una sesión con asistencia registrada no puede reprogramarse.'; end if;
 insert into public.school_sessions(id,tenant_id,date,start_min,end_min,category_id,staff_id,court,plan,cancelled) values(k,p_tenant,(p_data->>'date')::date,(p_data->>'start_min')::int,(p_data->>'end_min')::int,(p_data->>'category_id')::uuid,(p_data->>'staff_id')::uuid,coalesce(p_data->>'court',''),coalesce(p_data->>'plan',''),coalesce((p_data->>'cancelled')::boolean,false))
 on conflict(id) do update set date=excluded.date,start_min=excluded.start_min,end_min=excluded.end_min,category_id=excluded.category_id,staff_id=excluded.staff_id,court=excluded.court,plan=excluded.plan,cancelled=excluded.cancelled where school_sessions.tenant_id=p_tenant returning id into result;
 elsif p_kind in('plan','attendance') then
 select * into sess from public.school_sessions where tenant_id=p_tenant and id=(p_data->>'session_id')::uuid for update;
 if not found or not coalesce(public.school_can_category(p_tenant,sess.category_id),false) or sess.cancelled then raise exception 'No podés modificar este entrenamiento.' using errcode='42501'; end if;
 result:=sess.id;
 if p_kind='plan' then update public.school_sessions set plan=p_data->>'plan' where id=sess.id;
 else
 if sess.date>(now() at time zone 'America/Argentina/Buenos_Aires')::date then raise exception 'No se puede pasar lista de una fecha futura.'; end if;
 if jsonb_typeof(p_data->'rows') is distinct from 'array' or jsonb_array_length(p_data->'rows')=0 then raise exception 'Marcá al menos un alumno.'; end if;
 for v_item in select value from jsonb_array_elements(p_data->'rows') loop
 if not exists(select 1 from public.school_students where tenant_id=p_tenant and id=(v_item->>'student_id')::uuid and category_id=sess.category_id and active) then raise exception 'Alumno ajeno a la categoría o inactivo.'; end if;
 insert into public.school_attendance(tenant_id,session_id,student_id,state,note,updated_by) values(p_tenant,sess.id,(v_item->>'student_id')::uuid,v_item->>'state',coalesce(v_item->>'note',''),auth.uid())
 on conflict(tenant_id,session_id,student_id) do update set state=excluded.state,note=excluded.note,updated_by=auth.uid(),updated_at=now();
 end loop;
 end if;
 elsif p_kind='charge' then
 insert into public.school_charges(id,tenant_id,student_id,kind,period,due_date,amount,concept,created_by) values(k,p_tenant,(p_data->>'student_id')::uuid,p_data->>'kind',(p_data->>'period')::date,(p_data->>'due_date')::date,(p_data->>'amount')::numeric,trim(p_data->>'concept'),auth.uid()) returning id into result;
 elsif p_kind='payment' then
 select * into ch from public.school_charges where tenant_id=p_tenant and id=(p_data->>'charge_id')::uuid for update;
 if not found then raise exception 'Cuota inexistente.'; end if;
 select * into existing_payment from public.school_payments where tenant_id=p_tenant and id=k;
 if found then
 if existing_payment.charge_id<>ch.id or existing_payment.amount<>(p_data->>'amount')::numeric or existing_payment.method<>p_data->>'method' or existing_payment.date<>(p_data->>'date')::date then raise exception 'El identificador ya se utilizó para otro pago.'; end if;
 return k;end if;
 select coalesce(sum(amount),0) into paid from public.school_payments where tenant_id=p_tenant and charge_id=ch.id and voided_at is null;
 if paid+(p_data->>'amount')::numeric>ch.amount then raise exception 'El pago supera el saldo pendiente.'; end if;
 insert into public.school_payments(id,tenant_id,charge_id,amount,method,date,reference,created_by) values(k,p_tenant,ch.id,(p_data->>'amount')::numeric,p_data->>'method',(p_data->>'date')::date,coalesce(p_data->>'reference',''),auth.uid()) returning id into result;
 elsif p_kind='void_payment' then
 select * into ch from public.school_charges c where c.tenant_id=p_tenant and c.id=(select charge_id from public.school_payments where tenant_id=p_tenant and id=k) for update;
 update public.school_payments set void_reason=p_data->>'reason',voided_by=auth.uid(),voided_at=now() where tenant_id=p_tenant and id=k and voided_at is null returning id into result;
 elsif p_kind='expense' then
 insert into public.school_expenses(id,tenant_id,date,concept,category,amount,method,created_by) values(k,p_tenant,(p_data->>'date')::date,trim(p_data->>'concept'),p_data->>'category',(p_data->>'amount')::numeric,p_data->>'method',auth.uid()) on conflict(id) do nothing returning id into result;
 if result is null and exists(select 1 from public.school_expenses where id=k and tenant_id=p_tenant and amount=(p_data->>'amount')::numeric and concept=trim(p_data->>'concept')) then return k;end if;
 elsif p_kind='match' then
 if exists(select 1 from public.school_callups where tenant_id=p_tenant and match_id=k) and exists(select 1 from public.school_matches where id=k and category_id<>(p_data->>'category_id')::uuid) then raise exception 'No se puede cambiar la categoría con jugadores convocados.'; end if;
 insert into public.school_matches(id,tenant_id,category_id,date,start_min,opponent,venue,side,status) values(k,p_tenant,(p_data->>'category_id')::uuid,(p_data->>'date')::date,(p_data->>'start_min')::int,trim(p_data->>'opponent'),trim(p_data->>'venue'),p_data->>'side',p_data->>'status')
 on conflict(id) do update set category_id=excluded.category_id,date=excluded.date,start_min=excluded.start_min,opponent=excluded.opponent,venue=excluded.venue,side=excluded.side,status=excluded.status where school_matches.tenant_id=p_tenant returning id into result;
 elsif p_kind='callup' then
 select * into mat from public.school_matches where tenant_id=p_tenant and id=(p_data->>'match_id')::uuid for update;
 if not found or not coalesce(public.school_can_category(p_tenant,mat.category_id),false) or mat.status='Cancelado' then raise exception 'No tenés acceso al partido.' using errcode='42501'; end if;
 if not exists(select 1 from public.school_students where tenant_id=p_tenant and id=(p_data->>'student_id')::uuid and category_id=mat.category_id and active) then raise exception 'El alumno no pertenece a la categoría.'; end if;
 if coalesce((p_data->>'remove')::boolean,false) then delete from public.school_callups where tenant_id=p_tenant and match_id=mat.id and student_id=(p_data->>'student_id')::uuid;
 else
 insert into public.school_callups(tenant_id,match_id,student_id,goals,assists,minutes,yellow,red) values(p_tenant,mat.id,(p_data->>'student_id')::uuid,coalesce((p_data->>'goals')::int,0),coalesce((p_data->>'assists')::int,0),coalesce((p_data->>'minutes')::int,0),coalesce((p_data->>'yellow')::int,0),coalesce((p_data->>'red')::int,0))
 on conflict(tenant_id,match_id,student_id) do update set goals=excluded.goals,assists=excluded.assists,minutes=excluded.minutes,yellow=excluded.yellow,red=excluded.red;
 end if;result:=mat.id;
 else raise exception 'Operación desconocida.';end if;
 if result is null then raise exception 'Registro inexistente, modificado o de otro club.';end if;
 return result;
exception when exclusion_violation then raise exception 'Ese profesor o esa categoría ya tiene un entrenamiento en ese horario.';
end $$;

create function public.school_emergency(p_tenant uuid,p_category uuid) returns table(student_id uuid,tutor_name text,phone text,relationship text) language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(public.school_can_category(p_tenant,p_category),false) then raise exception 'Acceso no autorizado.' using errcode='42501';end if;
 return query select s.id,t.name,t.phone,s.relationship from public.school_students s join public.school_tutors t on t.tenant_id=s.tenant_id and t.id=s.tutor_id where s.tenant_id=p_tenant and s.category_id=p_category and s.active;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('school-private','school-private',false,10485760,array['application/pdf','image/png','image/jpeg']);
create function public.school_file_allowed(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.school_files f where f.path=p_path and (public.club_role(f.tenant_id)='admin' or (f.kind='Foto' and public.school_can_student(f.tenant_id,f.student_id))));
$$;
create policy school_object_read on storage.objects for select to authenticated using(bucket_id='school-private' and public.school_file_allowed(name));
create policy school_object_insert on storage.objects for insert to authenticated with check(bucket_id='school-private' and exists(select 1 from public.club_members m where m.user_id=auth.uid() and m.role='admin' and m.tenant_id::text=(storage.foldername(name))[1]));
create policy school_object_delete on storage.objects for delete to authenticated using(bucket_id='school-private' and exists(select 1 from public.club_members m where m.user_id=auth.uid() and m.role='admin' and m.tenant_id::text=(storage.foldername(name))[1]));
create function public.school_register_file(p_tenant uuid,p_id uuid,p_student uuid,p_staff uuid,p_kind text,p_name text,p_path text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if public.club_role(p_tenant) is distinct from 'admin' then raise exception 'Acceso exclusivo de administración.' using errcode='42501';end if;
 if split_part(p_path,'/',1)<>p_tenant::text or split_part(p_path,'/',2)<>p_id::text or not exists(select 1 from storage.objects where bucket_id='school-private' and name=p_path) then raise exception 'Archivo inexistente o fuera del club.';end if;
 insert into public.school_files(id,tenant_id,student_id,staff_id,kind,name,path) values(p_id,p_tenant,p_student,p_staff,p_kind,p_name,p_path);
 return p_id;
end $$;

create function public.school_match_campaign(p_tenant uuid,p_match uuid,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare m public.school_matches;tag uuid;total integer;
begin
 if public.club_role(p_tenant) is distinct from 'admin' or not public.club_push_enabled(p_tenant) then raise exception 'Solo administración puede notificar convocatorias.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text,10));
 if exists(select 1 from public.club_campaigns where id=p_request and tenant_id=p_tenant and created_by=auth.uid()) then return p_request;end if;
 select * into m from public.school_matches where tenant_id=p_tenant and id=p_match and status='Programado';if not found then raise exception 'Partido no disponible.';end if;
 if (select count(*) from public.club_campaigns where tenant_id=p_tenant and created_at>now()-interval '1 hour')>=10 then raise exception 'Máximo de diez envíos grupales por hora.';end if;
 insert into public.club_tags(tenant_id,name) values(p_tenant,'Convocatoria '||p_request::text) returning id into tag;
 insert into public.club_campaigns(id,tenant_id,tag_id,title,body,created_by) values(p_request,p_tenant,tag,'El Paraíso · Convocatoria',left('Partido vs '||m.opponent||' · '||to_char(m.date,'DD/MM/YYYY')||' '||lpad((m.start_min/60)::text,2,'0')||':'||lpad((m.start_min%60)::text,2,'0')||' · '||m.venue,240),auth.uid());
 insert into public.club_campaign_items(tenant_id,campaign_id,user_id,name)
 select distinct p_tenant,p_request,p.user_id,p.name from public.school_callups c join public.school_students s on s.tenant_id=c.tenant_id and s.id=c.student_id join public.school_tutors t on t.tenant_id=s.tenant_id and t.id=s.tutor_id join public.club_people p on p.tenant_id=t.tenant_id and p.id=t.person_id join public.club_members cm on cm.tenant_id=p.tenant_id and cm.user_id=p.user_id
 where c.tenant_id=p_tenant and c.match_id=p_match and s.active and p.active;
 get diagnostics total=row_count;if total=0 or total>50 then raise exception 'Debe haber entre 1 y 50 tutores con cuenta activa vinculada.';end if;return p_request;
end $$;
revoke all on function public.school_can_category(uuid,uuid),public.school_can_student(uuid,uuid),public.school_save(uuid,text,jsonb),public.school_emergency(uuid,uuid),public.school_file_allowed(text),public.school_register_file(uuid,uuid,uuid,uuid,text,text,text),public.school_match_campaign(uuid,uuid,uuid) from public,anon;
grant execute on function public.school_can_category(uuid,uuid),public.school_can_student(uuid,uuid),public.school_save(uuid,text,jsonb),public.school_emergency(uuid,uuid),public.school_file_allowed(text),public.school_register_file(uuid,uuid,uuid,uuid,text,text,text),public.school_match_campaign(uuid,uuid,uuid) to authenticated;
commit;
