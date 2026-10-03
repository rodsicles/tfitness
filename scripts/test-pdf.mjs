import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const fontData=resolve('node_modules/pdfjs-dist/standard_fonts')+'/';
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('.local-data',{recursive:true});await build({entryPoints:['app/gym-ui/pdf.ts'],bundle:true,platform:'node',format:'esm',packages:'external',outfile:'.local-data/test-pdf-module.mjs'});
const {createPdf,pdfFilename,reportFilename}=await import('../.local-data/test-pdf-module.mjs');
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const meta={gymName:'MUSCLE T FITNESS GYM',address:'Tuguegarao City, Philippines',contact:'09123456789',preparedBy:'Test Administrator'};
const rows=Array.from({length:135},(_,i)=>({id:`PAY-${String(i+1).padStart(6,'0')}`,date:'2026-10-03',customer:i===0?'José Dela Cruz':`Customer ${i+1}`,type:'Membership Renewal',amount:i===134?'PHP 777.00':'PHP 1,000.00',method:'Cash',reference:'GCASH-REFERENCE-'+i,status:'Paid',recordedBy:'Gym Administrator',notes:'Long information for wrapping and readable multipage tables.'}));
const columns=Object.keys(rows[0]).map(key=>({key,label:key}));
const doc=await createPdf({title:'Annual Transactions',period:'2026-01-01 to 2026-12-31',meta,totals:[{label:'Paid revenue',value:'PHP 134,777.00'},{label:'Payments',value:135}],sections:[{title:'Transaction details',rows,columns}]});
const bytes=new Uint8Array(doc.output('arraybuffer'));await writeFile('.local-data/sample-transactions.pdf',bytes);const parsed=await getDocument({standardFontDataUrl:fontData,data:bytes}).promise;assert.ok(parsed.numPages>1);let all='';for(let p=1;p<=parsed.numPages;p++){const page=await parsed.getPage(p),content=await page.getTextContent(),text=content.items.map(x=>x.str||'').join(' ');all+=text;assert.ok(text.includes(meta.gymName),`header on page ${p}`);assert.ok(text.includes(`Page ${p} of ${parsed.numPages}`),`footer on page ${p}`);for(const item of content.items){if(!item.str)continue;assert.ok(item.transform[4]>=0&&item.transform[4]+item.width<=page.view[2]+2,'Text must stay within page width');}}
assert.ok(all.includes('PAY-000135'));assert.ok(all.includes('777.00'));assert.ok(all.includes('134,777.00'));assert.ok(all.includes('José Dela Cruz'));console.log(`PASS formatted ${parsed.numPages}-page report, repeated headers, page numbers, totals, accented name, final row, and page width bounds.`);
const empty=await createPdf({title:'Empty period',meta,sections:[{title:'Payments',rows:[],columns:[{key:'id',label:'ID'}]}]});const emptyPdf=await getDocument({standardFontDataUrl:fontData,data:new Uint8Array(empty.output('arraybuffer'))}).promise;const emptyText=(await (await emptyPdf.getPage(1)).getTextContent()).items.map(x=>x.str||'').join(' ');assert.ok(emptyText.includes('No records for this selection.'));console.log('PASS empty PDF state');assert.equal(pdfFilename('Receipt/PAY:001'),'Receipt-PAY-001.pdf');
const receipt=await createPdf({title:'VOIDED PAYMENT RECEIPT',meta,orientation:'portrait',totals:[{label:'Original payment amount',value:'PHP 100.00'},{label:'Status',value:'Voided'}],note:'Voided payment. Reason: Duplicate payment.',sections:[{title:'Payment details',rows:[{label:'Receipt number',value:'PAY-000001'},{label:'Status',value:'Voided'}],columns:[{key:'label',label:'Detail'},{key:'value',label:'Value'}]}]});await writeFile('.local-data/sample-receipt.pdf',new Uint8Array(receipt.output('arraybuffer')));console.log('PASS portrait receipt generation');
try{const {createCanvas}=await import('@napi-rs/canvas');const page=await parsed.getPage(1),viewport=page.getViewport({scale:1.35});const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;await writeFile('.local-data/pdf-preview.png',canvas.toBuffer('image/png'));console.log('PDF preview rendered.')}catch(e){console.log('Raster preview unavailable:',e.message)}


const opts={title:'Walk-ins',meta,sections:[]};
assert.equal(reportFilename(opts,new Date('2026-10-02T18:00:00Z')),'MUSCLE-T-FITNESS-GYM_Walk-ins_2026-10-03.pdf');
assert.equal(reportFilename({...opts,title:'Monthly transactions',filePeriod:'2026-09'}),'MUSCLE-T-FITNESS-GYM_Monthly-transactions_2026-09.pdf');
assert.equal(reportFilename({...opts,meta:{...meta,reportPeriod:'2026-09-01-to-2026-09-30'}}),'MUSCLE-T-FITNESS-GYM_Walk-ins_2026-09-01-to-2026-09-30.pdf');
assert.equal(reportFilename({...opts,title:'Annual transactions',filePeriod:'2025'}),'MUSCLE-T-FITNESS-GYM_Annual-transactions_2025.pdf');
console.log('PASS gym, dataset, selected date ranges, and Philippine snapshot date in PDF filenames');
