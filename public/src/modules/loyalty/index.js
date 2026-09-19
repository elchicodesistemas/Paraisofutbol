import {recordsView} from '../../core/records-view.js';
export default {id:'loyalty', label:'Puntos', icon:'✧', description:'Registro de puntos otorgados por el administrador. Canjes y saldos transaccionales pendientes de implementar.', render(ctx) {return recordsView(ctx,this);}};
