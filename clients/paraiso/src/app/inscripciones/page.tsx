import ClubHeader from '@/components/club-header';
import {RegistrationForm} from '@/components/club-forms';
export const metadata={title:'Inscripciones | El Paraíso Deportes'};
export default function Inscripciones(){return <><ClubHeader/><main className="servicepage"><p className="eyebrow green">SUMATE A EL PARAÍSO</p><h1>Tu próximo equipo<br/>te está esperando.</h1><p className="lead">Completá la ficha y aceptá los acuerdos de tu actividad.</p><RegistrationForm/></main></>}
