import {jsPDF} from 'jspdf';
import {money} from './metrics.mjs';
export function receiptDocument({payment,charge,student,tutor}){
 const pdf=new jsPDF();let y=56;
 const header=()=>{pdf.setFillColor(24,55,44);pdf.rect(0,0,210,43,'F');pdf.setTextColor(255);pdf.setFont('helvetica','normal');pdf.setFontSize(22);pdf.text('EL PARAÍSO DEPORTES',18,21);pdf.setFontSize(11);pdf.text('Recibo interno de pago',18,32);pdf.setTextColor(35);pdf.setFontSize(10);y=56;};
 const ensure=height=>{if(y+height>265){pdf.addPage();header();}};header();
 const line=(label,value)=>{pdf.setFont('helvetica','normal');const lines=pdf.splitTextToSize(String(value||'-'),126),height=Math.max(9,lines.length*5+4);ensure(height);pdf.setFont('helvetica','bold');pdf.text(label,18,y);pdf.setFont('helvetica','normal');pdf.text(lines,65,y);y+=height;};
 line('Referencia',payment.id);line('Fecha',payment.date);line('Alumno',student.name);line('Responsable',tutor?.name);line('Concepto',charge.concept);line('Período',charge.period.slice(0,7));line('Medio de pago',payment.method);line('Referencia de pago',payment.reference||'Sin referencia');
 ensure(43);y+=5;pdf.setFillColor(237,245,239);pdf.roundedRect(18,y,174,24,3,3,'F');pdf.setFontSize(12);pdf.text('Importe recibido',24,y+10);pdf.setFontSize(20);pdf.text(money(payment.amount),186,y+16,{align:'right'});y+=38;
 pdf.setFontSize(10);const disclaimer=pdf.splitTextToSize('Comprobante interno. No válido como factura fiscal. Registra un pago informado por administración; no procesa cobros ni acredita una transferencia bancaria.',174);ensure(disclaimer.length*5+8);pdf.setTextColor(85);pdf.text(disclaimer,18,y);y+=disclaimer.length*5+14;
 if(payment.voided_at){pdf.setFontSize(10);const reason=pdf.splitTextToSize(payment.void_reason||'',174);ensure(reason.length*5+16);pdf.setTextColor(170,35,35);pdf.setFontSize(18);pdf.text('ANULADO',18,y);pdf.setFontSize(10);pdf.text(reason,18,y+9);}
 const pages=pdf.getNumberOfPages();for(let page=1;page<=pages;page++){pdf.setPage(page);pdf.setFontSize(9);pdf.setTextColor(120);pdf.text('El Paraíso · Entorno de desarrollo · Solo datos ficticios',18,281);pdf.text(page+' / '+pages,192,281,{align:'right'});}
 return pdf;
}
