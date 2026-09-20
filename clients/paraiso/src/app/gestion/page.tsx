import ClubHeader from '@/components/club-header';
import ClubAdmin from '@/components/club-admin';
export const dynamic='force-dynamic';
export const metadata={title:'Gestión del club | El Paraíso',robots:{index:false,follow:false}};
export default function Gestion(){return <><ClubHeader/><main className="servicepage"><p className="eyebrow green">ADMINISTRACIÓN</p><h1>Gestión del club.</h1><p className="lead">Revisá y confirmá reservas de prueba, y configurá la agenda.</p><ClubAdmin/></main></>}
