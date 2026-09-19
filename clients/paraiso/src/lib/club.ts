export const courts=['Cancha1','Cancha 2','Cancha 3','Cancha 4','Cancha de 8','Parrilla','Solo parrilla','Sum'];
export const sports=['Futbol Femenino','Futbol Masculino','Futbol Masculino +18','Hockey'];
export type Settings={enabled:boolean;open:number;close:number;duration:number;deposit:number;payment:string};
export const defaults:Settings={enabled:true,open:9,close:23,duration:60,deposit:3000,payment:'EJEMPLO.NO.TRANSFERIR · CVU 0000000000000000000000'};
export const clock=(minutes:number)=>String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
export const argentinaDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function validDate(date:string){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date}
export function isFuture(date:string,start:number){return validDate(date)&&Date.parse(date+'T'+clock(start)+':00-03:00')>Date.now()}
export function timeSlots(settings:Settings,date:string){const slots:number[]=[];for(let m=settings.open*60;m+settings.duration<=settings.close*60;m+=settings.duration)if(isFuture(date,m))slots.push(m);return slots}
export function under18(birth:string){const today=argentinaDate();return Number(today.slice(0,4))-Number(birth.slice(0,4))-(today.slice(5)<birth.slice(5)?1:0)<18}
export const registrationFields=[
['name','Nombre Y Apellido','text',true],['birth','Fecha de nacimiento','date',true],
['address','Direccion','text',false],['city','Ciudad','text',false],['postal','Codigo Postal','text',false],
['phone','Celular','tel',true],['emergency','Telefono de emergencias','tel',true],['email','Correo electrónico','email',true],
['member','Numero de Socio','text',false],['dni','Número de documento','text',true],
['health','Obra social','text',false],['allergies','Alergias','text',false],['school','Colegio','text',false],
['guardian','Nombre y Apellido de: Padre, Madre o Tutor','text',false],['guardianDni','Documento Padre, Madre, o Tutor','text',false]
] as const;
export const rulesVersion='club-2026-09-08';
export const footballRules=['Los días de pago de cuotas serán a partir del 1 de cada mes hasta el 15 del mismo sin excepción. (En caso de no cumplir se cobrara un adicional)','Todo Jugador/a será responsable de sus pertenencias y elementos de juego que le sean provistos por esta escuela. En caso de robo o hurto el complejo no se hará responsable de los mismos.','Todo jugador/a deberá guardar las Normas de Educación y Buenas Costumbres tanto dentro como fuera de la institución, comprometiéndose tanto padres como profesores en colaborar con estas normas.','DÍAS DE LLUVIA: Si llueve en el momento del entrenamiento, la actividad se suspende. Esta decisión se toma sólo al comienzo de cada turno. Si los mandan o no es una decisión de los padres.','El complejo NO se hará responsable de tratamientos post accidentes ocurridos en el mismo.','Contamos con área protegida para emergencias médicas en caso de accidentes o lesiones durante los entrenamientos/partidos.','Al firmar la ficha de inscripción acepta y se compromete a cumplir todas las condiciones anteriormente mencionadas.'];
export const hockeyRules=['Los días de pago de cuotas serán a partir del 1 de cada mes hasta el 10 del mismo sin excepción.','Todo Jugador/a será responsable de sus pertenencias y elementos de juego que le sean provistos por esta escuela.','Todo jugador/a deberá guardar las Normas de Educación y Buenas Costumbres tanto dentro como fuera de la institución.','Todo jugador/a deberá traer su equipo de protección sin excepción (protector bucal, canilleras, etc.)','DÍAS DE LLUVIA: Si llueve en el momento del entrenamiento, la actividad se suspende. Esta decisión se toma sólo al comienzo de cada turno. Si los mandan o no es una decisión de los padres'];
