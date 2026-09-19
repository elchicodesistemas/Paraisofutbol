import {recordsView} from '../../core/records-view.js';
export default {id:'chat', label:'Chat', icon:'◌', description:'Muro compartido del equipo. Actualizá para consultar nuevos mensajes; sin tiempo real en esta versión.', render(ctx) {return recordsView(ctx,this);}};
