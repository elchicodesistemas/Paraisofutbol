import {recordsView} from '../../core/records-view.js';
export default {id:'calendar', label:'Calendario', icon:'▦', description:'Clases, eventos y actividades de tu empresa, ordenados por fecha.', render(ctx) {return recordsView(ctx,this);}};
