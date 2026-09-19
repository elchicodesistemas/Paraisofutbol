import {recordsView} from '../../core/records-view.js';
export default {id:'agenda', label:'Agenda', icon:'◷', description:'Turnos y citas individuales. Esta base todavía no valida disponibilidad ni superposiciones.', render(ctx) {return recordsView(ctx,this);}};
