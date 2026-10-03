"use client";
import {isValidElement,type ReactNode} from 'react';
import type {Column} from './table';
import type {Row} from '@/lib/gym/model';
export type PdfMeta={gymName:string;address?:string;contact?:string;email?:string;preparedBy?:string};
export type PdfSection={title:string;rows:Row[];columns:Column[]};
export type PdfOptions={title:string;filename?:string;period?:string;note?:string;meta:PdfMeta;sections:PdfSection[];totals?:{label:string,value:string|number}[];orientation?:'portrait'|'landscape'};
export function exportText(value:any):string{if(value===null||value===undefined)return '';if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);if(Array.isArray(value))return value.map(exportText).join(' ');if(isValidElement(value))return exportText((value.props as {children?:ReactNode}).children);return JSON.stringify(value)}
export const cellText=(r:Row,c:Column)=>c.exportValue?exportText(c.exportValue(r)):c.render?exportText(c.render(r)):exportText(r[c.key]);
// Built-in PDF fonts use PHP to render Philippine currency consistently.
const clean=(v:any)=>exportText(v).replaceAll('₱','PHP ').replace(/[–—]/g,'-').replace(/[·•]/g,' | ');
export function pdfFilename(name:string){return (name.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,140)||'gym-report')+'.pdf'}
export async function createPdf(options:PdfOptions){
 const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
 const maxCols=Math.max(0,...options.sections.map(s=>s.columns.length));
 const doc=new jsPDF({orientation:options.orientation||(maxCols>6?'landscape':'portrait'),unit:'mm',format:'a4',compress:true});
 doc.setProperties({title:options.title,subject:options.period||'Gym administration report',author:options.meta.gymName,creator:'MUSCLE T FITNESS GYM'});
 const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=14,usable=width-margin*2;
 const generated=new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 const limitLines=(text:string,size:number,max=2)=>{doc.setFontSize(size);return doc.splitTextToSize(clean(text),usable).slice(0,max)};
 function header(){doc.setFont('helvetica','bold');doc.setTextColor(24);doc.setFontSize(16);doc.text(limitLines(options.meta.gymName,16,1),margin,17);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text(limitLines([options.meta.address,options.meta.contact,options.meta.email].filter(Boolean).join(' | '),8,1),margin,23);doc.setDrawColor(185);doc.line(margin,27,width-margin,27);doc.setTextColor(28);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(limitLines(options.title,12,1),margin,34);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(90);doc.text(limitLines(options.period||'All selected records',8,1),margin,40);}
 header();let startY=50;
 if(options.totals?.length){const perRow=4,cellW=usable/perRow;options.totals.forEach((m,i)=>{const x=margin+(i%perRow)*cellW,y=50+Math.floor(i/perRow)*19;doc.setFillColor(245,245,245);doc.setDrawColor(220);doc.rect(x,y,cellW,19,'FD');doc.setTextColor(100);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(clean(m.label).slice(0,38),x+3,y+6);doc.setTextColor(25);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(clean(m.value),x+3,y+13)});startY=50+Math.ceil(options.totals.length/perRow)*19+10;}
 if(options.note){doc.setFont('helvetica','normal');doc.setTextColor(90);doc.setFontSize(8);const lines=doc.splitTextToSize(clean(options.note),usable);doc.text(lines,margin,startY);startY+=lines.length*4+7;}
 options.sections.forEach((section,index)=>{if(index){doc.addPage();header();startY=50}doc.setTextColor(35);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(clean(section.title),margin,startY);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text(`${section.rows.length} record${section.rows.length===1?'':'s'}`,width-margin,startY,{align:'right'});
 const weights=section.columns.map(c=>/detail|description|address|notes|period/i.test(c.key)?2:/customer|name|recordedBy/i.test(c.key)?1.4:1);const weightSum=weights.reduce((a,b)=>a+b,0);const columnStyles=Object.fromEntries(weights.map((weight,i)=>[i,{cellWidth:usable*weight/weightSum}]));
 autoTable(doc,{tableWidth:usable,columnStyles,startY:startY+5,margin:{left:margin,right:margin,top:49,bottom:23},head:[section.columns.map(c=>clean(c.label))],body:section.rows.length?section.rows.map(r=>section.columns.map(c=>clean(cellText(r,c))||'-')):[section.columns.map((_,i)=>i===0?'No records for this selection.':'')],theme:'grid',styles:{font:'helvetica',fontSize:maxCols>9?7:8,cellPadding:3,overflow:'linebreak',lineColor:[224,224,224],lineWidth:0.15,textColor:[45,45,45],valign:'top'},headStyles:{fillColor:[30,30,30],textColor:255,fontStyle:'bold',lineWidth:0},alternateRowStyles:{fillColor:[248,248,248]},showHead:'everyPage',rowPageBreak:'avoid',horizontalPageBreak:false,didDrawPage:()=>header()});});
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setDrawColor(190);doc.line(margin,height-18,width-margin,height-18);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(105);doc.text(clean(`Generated ${generated} PHT${options.meta.preparedBy?' | '+options.meta.preparedBy:''}`).slice(0,140),margin,height-12);doc.text(`Page ${i} of ${pages}`,width-margin,height-12,{align:'right'});}
 return doc;
}
export async function downloadPdf(options:PdfOptions){const doc=await createPdf(options);doc.save(pdfFilename(options.filename||options.title));}


