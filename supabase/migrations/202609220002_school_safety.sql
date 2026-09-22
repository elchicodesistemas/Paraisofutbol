begin;
create or replace function public.school_save(p_tenant uuid,p_kind text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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
 perform 1 from public.school_sessions where tenant_id=p_tenant and id=k for update;
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
 if p_data->>'reason' is null or length(trim(p_data->>'reason')) not between 3 and 300 then raise exception 'Ingresá un motivo de anulación de 3 a 300 caracteres.';end if;
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
 if (coalesce((p_data->>'goals')::int,0)+coalesce((p_data->>'assists')::int,0)+coalesce((p_data->>'minutes')::int,0)+coalesce((p_data->>'yellow')::int,0)+coalesce((p_data->>'red')::int,0))>0 and (mat.status<>'Jugado' or mat.date>(now() at time zone 'America/Argentina/Buenos_Aires')::date) then raise exception 'Las estadísticas se registran en partidos jugados, en una fecha no futura.';end if;
 insert into public.school_callups(tenant_id,match_id,student_id,goals,assists,minutes,yellow,red) values(p_tenant,mat.id,(p_data->>'student_id')::uuid,coalesce((p_data->>'goals')::int,0),coalesce((p_data->>'assists')::int,0),coalesce((p_data->>'minutes')::int,0),coalesce((p_data->>'yellow')::int,0),coalesce((p_data->>'red')::int,0))
 on conflict(tenant_id,match_id,student_id) do update set goals=excluded.goals,assists=excluded.assists,minutes=excluded.minutes,yellow=excluded.yellow,red=excluded.red;
 end if;result:=mat.id;
 else raise exception 'Operación desconocida.';end if;
 if result is null then raise exception 'Registro inexistente, modificado o de otro club.';end if;
 return result;
exception when exclusion_violation then raise exception 'Ese profesor o esa categoría ya tiene un entrenamiento en ese horario.';
end $$;

commit;
