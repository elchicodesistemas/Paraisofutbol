import {recordsView} from '../../core/records-view.js';
export default {id:'payments', label:'Pagos', icon:'＄', description:'Registro de cuentas pendientes. Los cobros reales requieren un proveedor y un webhook en el servidor.', render(ctx) {return recordsView(ctx,this);}};
