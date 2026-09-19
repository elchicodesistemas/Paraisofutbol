import ClubHeader from '@/components/club-header';
import {BookingForm} from '@/components/club-forms';
export const metadata={title:'Reservá tu cancha | El Paraíso Deportes'};
export default function Reservas(){return <><ClubHeader/><main className="servicepage"><p className="eyebrow green">NOS VEMOS EN LA CANCHA</p><h1>Reservá tu cancha.</h1><p className="lead">Elegí tu espacio, encontrá un turno y dejá todo listo para jugar.</p><BookingForm/></main></>}
