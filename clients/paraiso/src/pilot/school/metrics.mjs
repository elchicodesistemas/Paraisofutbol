export function localDay(date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function seasonAge(birth,day=localDay()){return Number(day.slice(0,4))-Number(birth.slice(0,4));}
export function eligibleCategories(birth,categories,day=localDay()){if(!birth)return [];const age=seasonAge(birth,day);return categories.filter(c=>c.active&&age>=c.min_age&&age<=c.max_age);}
export function paidAmount(chargeId,payments){return Math.round(payments.filter(p=>p.charge_id===chargeId&&!p.voided_at).reduce((s,p)=>s+Number(p.amount),0)*100)/100;}
export function chargeBalance(charge,payments){return Math.round((Number(charge.amount)-paidAmount(charge.id,payments))*100)/100;}
export function chargeState(charge,payments,day=localDay()){if(chargeBalance(charge,payments)<=0)return 'Al día';return charge.due_date<day?'Deudor':'Pendiente';}
export function attendanceSummary(rows,sessions,month){const ids=new Set(sessions.filter(s=>!s.cancelled&&s.date.startsWith(month)).map(s=>s.id));const recorded=rows.filter(r=>ids.has(r.session_id));const present=recorded.filter(r=>r.state==='Presente').length;const absent=recorded.filter(r=>r.state==='Ausente').length;const justified=recorded.filter(r=>r.state==='Justificado').length;return {present,absent,justified,percent:present+absent?Math.round(present/(present+absent)*100):null};}
export const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export const minutes=time=>Number(time.split(':')[0])*60+Number(time.split(':')[1]);
export const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(n));
