import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyEntries, exportRecordsCsv, recordInstant, scheduledKey, validateRecord, type ActualRecord } from '../../src/lib/records';
import { validateProtocol, type Protocol } from '../../src/lib/planner';
import { parseBackup, serializeBackup, MAX_BACKUP_BYTES } from '../../src/lib/backup';
import { readWorkspace, saveRecord, deleteRecord, saveProtocols, clearProtocols, saveProduct, deleteProduct, replaceWorkspace, exportWorkspace } from '../../src/lib/workspace';
import { eventParams, safePage } from '../../src/lib/analytics-policy';
const protocol = (patch: Partial<Protocol> = {}) => validateProtocol({ id:'p1',name:'My original schedule',timeZone:'UTC',startDate:'2028-02-28',endDate:'2028-03-01',items:[{id:'i1',label:'Private item',dose:'250',unit:'mcg',time:'08:00',frequency:{kind:'daily'}}],...patch });
function record(patch: Partial<ActualRecord> = {}): ActualRecord { const scheduled = dailyEntries([protocol()], '2028-02-29', 'UTC').entries[0]!; return validateRecord({id:'r1',status:'taken',label:scheduled.label,dose:'200',unit:'mcg',occurredAt:'2028-02-29T08:30:00Z',timeZone:'UTC',notes:'My original note',createdAt:'2028-02-29T08:31:00Z',updatedAt:'2028-02-29T08:31:00Z',scheduled,...patch}); }
test('all schedules join by reporting day across time zones and international date boundaries', () => {
  const p = protocol({id:'ny',timeZone:'America/New_York'});
  const result=dailyEntries([protocol(),p], '2028-02-29','UTC');
  assert.deepEqual(result.entries.map(e=>e.instant), ['2028-02-29T08:00:00Z','2028-02-29T13:00:00Z']);
  const tokyo=protocol({id:'tokyo',timeZone:'Asia/Tokyo'});
  assert.equal(dailyEntries([tokyo], '2028-02-28','America/Los_Angeles').entries[0]?.date,'2028-02-29');
  assert.equal(dailyEntries([protocol()], '2028-03-02','UTC').entries.length,0);
});
test('a 25-hour day includes both surrounding local dates and spring-gap errors are isolated per schedule and day', () => {
  const gap=protocol({id:'gap',timeZone:'America/New_York',startDate:'2028-03-01',endDate:'2028-03-20',items:[{...protocol().items[0]!,time:'02:30'}]});
  assert.equal(dailyEntries([gap], '2028-03-11','America/New_York').entries.length,1);
  const normal=protocol({startDate:'2028-03-12',endDate:'2028-03-12'});
  const bad=dailyEntries([gap,normal],'2028-03-12','America/New_York');
  assert.equal(bad.entries.length,1); assert.deepEqual(bad.unavailable,['My original schedule']);
  const fall=protocol({startDate:'2028-11-04',endDate:'2028-11-06',items:[{...protocol().items[0]!,time:'04:30'}]});
  assert.equal(dailyEntries([fall], '2028-11-05','America/New_York').entries.length,2);
});
test('actual local times reject gaps and ask for an explicit repeated-hour choice', () => {
  assert.throws(()=>recordInstant('2028-03-12','02:30','America/New_York','earlier'));
  assert.throws(()=>recordInstant('2028-11-05','01:30','America/New_York'));
  assert.equal(recordInstant('2028-11-05','01:30','America/New_York','earlier'),'2028-11-05T05:30:00Z');
  assert.equal(recordInstant('2028-11-05','01:30','America/New_York','later'),'2028-11-05T06:30:00Z');
  assert.throws(()=>recordInstant('2028-02-30','08:00','UTC'));
});
test('record validation preserves tiny amounts, strips unknown fields and never invents skipped usage', () => {
  assert.equal(record({dose:'0.00000001'}).dose,'0.00000001');
  assert.equal(record({status:'skipped',dose:'garbage'}).dose,'');
  assert.equal('secret' in validateRecord({...record(),secret:'drop'}),false);
  for(const patch of [{dose:'0'},{unit:'IU'},{timeZone:'invalid'},{notes:'x'.repeat(1001)},{updatedAt:'2028-02-28T00:00:00Z'},{scheduled:{...record().scheduled!,instant:'2028-03-01T08:00:00Z'}}]) assert.throws(()=>validateRecord({...record(),...patch}));
});
test('tuple identity cannot collide on hyphen-bearing IDs',()=>{
  assert.notEqual(scheduledKey({protocolId:'a-b',itemId:'c',date:'2028-02-29'}),scheduledKey({protocolId:'a',itemId:'b-c',date:'2028-02-29'}));
});
test('v4 backup roundtrip retains independent history, rejects duplicates and still reads old versions',()=>{
  const r=record(), raw=serializeBackup([],[],[],[r]); assert.equal(parseBackup(raw).version,4); assert.deepEqual(parseBackup(raw).records,[r]);
  assert.throws(()=>parseBackup(serializeBackup([],[],[],[r,r])),/duplicate/);
  assert.throws(()=>serializeBackup([],[],[],[r,{...r,id:'r2'}]),/duplicate/);
  assert.throws(()=>parseBackup(' '.repeat(MAX_BACKUP_BYTES+1)),/10 MB/);
  for(const old of [serializeBackup([]),serializeBackup([],[]),serializeBackup([],[],[])]) assert.equal(parseBackup(old).records,undefined);
});
test('history survives unrelated writes, plan/product edits and deletion; failures and stale edits never overwrite it',async ()=>{
  let raw:string|null=serializeBackup([protocol()]), fail=false;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>raw,setItem:(_k:string,v:string)=>{if(fail)throw Error('full');raw=v;},removeItem:()=>{raw=null;}}});
  try{
    const r=record(); await saveRecord(r); await assert.rejects(()=>saveRecord({...r,id:'r2'}),/already has/);
    const product={id:'product',revision:'v1',name:'Original',brand:'',kind:'single' as const,form:'powder' as const,amountMg:'5',components:[],identityConfirmed:false,concentrationMgMl:'',concentrationVerified:false};
    await saveProduct(product); await saveProduct({...product,name:'Changed',revision:'v2'}); await deleteProduct(product.id); await saveProtocols([protocol({name:'Changed schedule'})]); await clearProtocols();
    assert.deepEqual(readWorkspace().records,[r]); assert.equal(readWorkspace().protocols.length,0);
    const before=raw; fail=true; await assert.rejects(()=>saveRecord({...r,dose:'300',updatedAt:'2028-02-29T08:32:00Z'},r.updatedAt),/Nothing was changed/); assert.equal(raw,before); fail=false;
    await assert.rejects(()=>saveRecord({...r,dose:'300'},'old'),/another tab/); await assert.rejects(()=>deleteRecord(r.id,'old'),/another tab/); assert.equal(raw,before);
    await assert.rejects(()=>saveRecord({...r,scheduled:{...r.scheduled!,dose:'300'}},r.updatedAt),/cannot be changed/);
    await saveRecord({...r,dose:'300',updatedAt:'2028-02-29T08:32:00Z'},r.updatedAt); assert.equal(readWorkspace().records[0]?.dose,'300');
    const backup=exportWorkspace(); await assert.rejects(()=>replaceWorkspace('{broken')); assert.equal(exportWorkspace(),backup);
    await replaceWorkspace(serializeBackup([])); assert.equal(readWorkspace().records.length,0); await replaceWorkspace(backup); assert.equal(readWorkspace().records.length,1);
    await deleteRecord('r1','2028-02-29T08:32:00Z'); assert.equal(readWorkspace().records.length,0);
  } finally { Reflect.deleteProperty(globalThis,'localStorage'); }
});
test('CSV distinguishes plan and actual, preserves Unicode/newlines and neutralizes formula cells',()=>{
  const csv=exportRecordsCsv([record({label:'=SUM(1,2)',notes:' @command\n中文,"quoted"'}),record({id:'r2',status:'skipped',scheduled:undefined})]);
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv,/'=SUM/); assert.match(csv,/'@command/); assert.match(csv,/中文,""quoted""/); assert.match(csv,/"200","mcg"/); assert.match(csv,/"skipped","Private item","",""/);
});
test('record analytics only permits fixed enums and generic page paths',()=>{
  assert.deepEqual(eventParams('record_saved',{operation:'create',record_source:'scheduled',record_status:'taken',label:'PRIVATE',dose:'250',notes:'PRIVATE',date:'2028-02-29'}),{operation:'create',record_source:'scheduled',record_status:'taken'});
  assert.deepEqual(eventParams('record_saved',{operation:'PRIVATE',record_source:'PRIVATE',record_status:'PRIVATE'}),{});
  assert.equal(safePage('/zh/today').page_location,'https://peptides.ybwdaisy.com/today');
});
test('blend history exports actual and original planned ingredient bases independently',()=>{
  const product={id:'blend',revision:'v1',name:'Blend label',brand:'',kind:'blend' as const,form:'powder' as const,amountMg:'10',components:[{name:'First ingredient',amountMg:'5'},{name:'Second ingredient',amountMg:'5'}],identityConfirmed:false,concentrationMgMl:'',concentrationVerified:false};
  const r=record({product,doseBasis:'1',scheduled:{...record().scheduled!,product,doseBasis:'0'}}),csv=exportRecordsCsv([r]);
  assert.equal(r.scheduled?.doseBasis,'0');assert.equal(r.doseBasis,'1');assert.match(csv,/Planned amount basis/);assert.match(csv,/"Second ingredient"/);assert.match(csv,/"First ingredient"/);
});
