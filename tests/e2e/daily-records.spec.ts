import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { STORAGE_KEY } from '../../src/lib/backup';
const plan = (id:string, zone='UTC') => ({id,name:`Schedule ${id}`,timeZone:zone,startDate:'2028-02-28',endDate:'2028-03-01',items:[{id:'item',label:`PRIVATE-${id}`,dose:'250',unit:'mcg',time:'08:00',frequency:{kind:'daily'}}]});
const setup={id:'c1',name:'Saved standalone setup',mode:'known',concentration:'2',vialAmount:'',finalVolume:'',dose:'250',unit:'mcg',useSyringe:false,capacity:'1',increment:'1',basis:''};
async function seed(page:Page,protocols:unknown[]=[plan('a'),plan('b','America/New_York')],calculations:unknown[]=[]) {
  await page.clock.setFixedTime(new Date('2028-02-29T13:05:00Z'));
  await page.addInitScript(({key,protocols,calculations})=>{
    localStorage.setItem('peptide-tools.analytics-consent.v1','denied');
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:3,products:[],protocols,calculations}));
  },{key:STORAGE_KEY,protocols,calculations});
}
async function openDay(page:Page) { await page.goto('/today'); await page.locator('#daily-zone').selectOption('UTC'); await page.locator('#daily-date').fill('2028-02-29'); }
async function records(page:Page) { return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).records??[],STORAGE_KEY); }
test('calculator-only returning users get a working resume entry without an automatic calculation',async({page})=>{
  await seed(page,[],[setup]); await page.goto('/');
  await page.getByRole('link',{name:'Open saved calculations',exact:true}).click(); await expect(page.locator('#saved-calculations')).toBeVisible();
  await page.getByRole('link',{name:setup.name,exact:true}).click(); await expect(page.locator('#calculator-result')).toBeHidden();
});
test('cross-plan day supports actual amounts, skip, edit, undo and persistent independent history',async({page},info)=>{
  await seed(page); await openDay(page);
  await expect(page.locator('#daily-entries > li')).toHaveCount(2); await expect(page.locator('#daily-entries > li').nth(1)).toContainText('13:00');
  await page.locator('#daily-entries > li').first().getByRole('button',{name:'Record',exact:true}).click();
  await page.locator('#record-dose').fill('225.5'); await page.locator('#record-notes').fill('PRIVATE-NOTE 中文'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled();
  expect((await records(page))[0].dose).toBe('225.5'); expect((await records(page))[0].scheduled.dose).toBe('250');
  await page.locator('#daily-entries > li').nth(1).getByRole('button',{name:'Skip',exact:true}).click(); await expect.poll(async()=>(await records(page)).length).toBe(2); expect((await records(page))[1].dose).toBe('');
  await page.locator('#daily-entries > li').first().getByRole('button',{name:'Edit record',exact:true}).click(); await page.locator('#record-dose').fill('200'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled(); await expect.poll(async()=>(await records(page)).length).toBe(2);
  await page.reload(); await page.locator('#daily-zone').selectOption('UTC'); await expect(page.locator('#daily-entries')).toContainText('200 mcg');
  await page.screenshot({path:info.outputPath('today-recorded.png'),fullPage:true});
  const original=(await records(page))[0].scheduled;
  await page.evaluate(key=>{const d=JSON.parse(localStorage.getItem(key)!); d.protocols[0].items[0].dose='500'; d.protocols[0].name='Changed plan'; localStorage.setItem(key,JSON.stringify(d)); window.dispatchEvent(new Event('workspace-changed'));},STORAGE_KEY);
  await expect(page.locator('#daily-entries')).toContainText('The plan changed'); expect((await records(page))[0].scheduled).toEqual(original);
  page.on('dialog',d=>d.accept()); await page.locator('#daily-entries > li').nth(1).getByRole('button',{name:'Undo record',exact:true}).click(); await expect.poll(async()=>(await records(page)).length).toBe(1);
  await page.evaluate(key=>{const d=JSON.parse(localStorage.getItem(key)!);d.protocols=[];localStorage.setItem(key,JSON.stringify(d));window.dispatchEvent(new Event('workspace-changed'));},STORAGE_KEY);
  await expect(page.locator('#daily-entries > li')).toHaveCount(0); await expect(page.locator('#history-entries')).toContainText('PRIVATE-NOTE'); await expect(page.locator('#daily-extra')).toBeVisible();
  await page.goto('/'); await expect(page.getByRole('link',{name:'Open today',exact:true})).toBeVisible();
});
test('backfill, timezone changes, filters and CSV use actual dates and preserve free text locally',async({page})=>{
  await seed(page,[]); await openDay(page); await page.getByRole('button',{name:'Add a record',exact:true}).click();
  await page.locator('#record-label').fill('=PRIVATE-LABEL'); await page.locator('#record-dose').fill('0.00000001'); await page.locator('#record-zone').selectOption('America/New_York'); await page.locator('#record-date').fill('2028-02-28'); await page.locator('#record-time').fill('23:30'); await page.locator('#record-notes').fill('PRIVATE-NOTE,"quoted"\n中文'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled();
  await expect(page.locator('#history-entries')).toContainText('2028-02-29 04:30');
  await page.locator('#history-from').fill('2028-02-29'); await page.locator('#history-until').fill('2028-02-29'); await expect(page.locator('#history-entries > li')).toHaveCount(1);
  const downloaded=page.waitForEvent('download'); await page.getByRole('button',{name:'Export CSV',exact:true}).click(); const csv=await readFile((await (await downloaded).path())!);
  // Read the actual downloaded artifact rather than the in-memory export function.
  expect(csv.toString()).toContain("'=PRIVATE-LABEL"); expect(csv.toString()).toContain('0.00000001');
  await page.locator('#daily-zone').selectOption('America/New_York'); await expect(page.locator('#history-entries > li')).toHaveCount(0);
  await page.getByRole('button',{name:'Clear date filters',exact:true}).click(); await expect(page.locator('#history-entries')).toContainText('2028-02-28 23:30');
});
test('v4 backup is previewed and restores history; older backup replacement explicitly clears it',async({page})=>{
  await seed(page); await openDay(page); await page.locator('#daily-entries > li').first().getByRole('button',{name:'Skip',exact:true}).click();
  await page.getByText('Your local data',{exact:true}).click(); const wait=page.waitForEvent('download'); await page.locator('#daily-backup-export').click(); const file=await wait; const raw=await readFile((await file.path())!,'utf8'); expect(JSON.parse(raw).version).toBe(4); expect(JSON.parse(raw).records).toHaveLength(1);
  const legacy={name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,protocols:[]}))}; await page.locator('#daily-backup-import').setInputFiles(legacy);
  await expect(page.locator('[data-restore-summary]')).toContainText('0 actual records'); await page.getByRole('button',{name:'Cancel restore',exact:true}).click(); await expect.poll(async()=>(await records(page)).length).toBe(1);
  page.on('dialog',d=>d.accept()); await page.locator('#daily-backup-import').setInputFiles(legacy); await page.getByRole('button',{name:'Restore backup',exact:true}).click(); await expect(page.locator('[data-restore-preview]')).toBeHidden(); await expect.poll(async()=>(await records(page)).length).toBe(0);
  await page.locator('#daily-backup-import').setInputFiles({name:'v4.json',mimeType:'application/json',buffer:Buffer.from(raw)}); await page.getByRole('button',{name:'Restore backup',exact:true}).click(); await expect(page.locator('[data-restore-preview]')).toBeHidden(); await expect.poll(async()=>(await records(page)).length).toBe(1); await expect(page.locator('#history-entries > li')).toHaveCount(1);
});
test('storage failures preserve the open form and malformed data is never overwritten',async({page})=>{
  await seed(page); await openDay(page); await page.locator('#daily-entries > li').first().getByRole('button',{name:'Record',exact:true}).click(); await page.locator('#record-notes').fill('KEEP THIS NOTE');
  await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='peptide-tools.protocols.v1')throw new DOMException('full','QuotaExceededError');return set.call(this,k,v);};});
  await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled(); await expect(page.locator('#record-error')).toContainText('Nothing was changed'); await expect(page.locator('#record-notes')).toHaveValue('KEEP THIS NOTE'); await expect.poll(async()=>(await records(page)).length).toBe(0);
  page.on('dialog',d=>d.accept()); await page.reload(); await page.evaluate(key=>localStorage.setItem(key,'{broken'),STORAGE_KEY); await page.reload(); await expect(page.locator('#daily-error')).not.toBeEmpty(); await expect(page.locator('#record-new')).toBeDisabled(); expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe('{broken');
});
test('a stale edit cannot overwrite a newer edit from another tab or create a duplicate scheduled record',async({page})=>{
  await seed(page); await openDay(page); await page.locator('#daily-entries > li').first().getByRole('button',{name:'Skip',exact:true}).click(); await page.locator('#daily-entries > li').first().getByRole('button',{name:'Edit record',exact:true}).click();
  await page.evaluate(key=>{const d=JSON.parse(localStorage.getItem(key)!);d.records[0].notes='Newer note';d.records[0].updatedAt='2028-02-29T13:06:00Z';localStorage.setItem(key,JSON.stringify(d));window.dispatchEvent(new Event('workspace-changed'));},STORAGE_KEY);
  await page.locator('#record-notes').fill('Old edit'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled(); await expect(page.locator('#record-error')).toContainText('another tab'); expect((await records(page))[0].notes).toBe('Newer note');
});
test('changing an actual time into a repeated DST hour requires an explicit offset choice',async({page})=>{
  await seed(page,[]); await page.clock.setFixedTime(new Date('2028-11-06T13:00:00Z')); await openDay(page); await page.getByRole('button',{name:'Add a record',exact:true}).click(); await page.locator('#record-label').fill('DST record'); await page.locator('#record-dose').fill('1'); await page.locator('#record-zone').selectOption('America/New_York'); await page.locator('#record-date').fill('2028-11-05'); await page.locator('#record-time').fill('01:30'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled(); await expect(page.locator('#record-error')).toContainText('occurs twice');
  await page.getByText('Clock-change time',{exact:true}).click(); await page.locator('#record-clock').selectOption('later'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled(); expect((await records(page))[0].occurredAt).toBe('2028-11-05T06:30:00Z');
});
test('default backfill on a repeated-hour day does not inherit a silent clock-change choice',async({page})=>{
  await seed(page,[]); await page.clock.setFixedTime(new Date('2028-11-06T06:30:00Z')); await page.goto('/today'); await page.locator('#daily-zone').selectOption('America/New_York'); await page.locator('#daily-date').fill('2028-11-05'); await page.getByRole('button',{name:'Add a record',exact:true}).click();
  await expect(page.locator('#record-date')).toHaveValue('2028-11-05'); await expect(page.locator('#record-time')).toHaveValue('01:30'); await expect(page.locator('#record-clock')).toHaveValue('reject'); await page.locator('#record-label').fill('DST backfill'); await page.locator('#record-dose').fill('1'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled(); await expect(page.locator('#record-error')).toContainText('occurs twice'); await expect.poll(async()=>(await records(page)).length).toBe(0);
});
test('simultaneous saves in two tabs serialize without losing either actual record',async({page,context})=>{
  await seed(page); await openDay(page); const second=await context.newPage();await second.clock.setFixedTime(new Date('2028-02-29T13:05:00Z'));await openDay(second);
  await page.evaluate(()=>{void navigator.locks.request('peptide-tools.workspace-write.v1',async()=>{(window as any).held=true;await new Promise<void>(resolve=>(window as any).releaseWrite=resolve);});});
  await expect.poll(()=>page.evaluate(()=>(window as any).held)).toBe(true);
  await page.locator('#daily-entries > li').first().getByRole('button',{name:'Skip',exact:true}).click();await second.locator('#daily-entries > li').nth(1).getByRole('button',{name:'Skip',exact:true}).click();
  await expect.poll(()=>page.evaluate(async()=>(await navigator.locks.query()).pending?.length)).toBe(2);await page.evaluate(()=>(window as any).releaseWrite());await expect.poll(async()=>(await records(page)).length).toBe(2);await expect(second.locator('#history-entries > li')).toHaveCount(2);
  await second.close();
});
test('today follows midnight while an explicitly selected historical day and filters survive refresh',async({page})=>{
  await seed(page,[]); await page.clock.setFixedTime(new Date('2028-02-29T23:59:00Z')); await page.goto('/today'); await page.locator('#daily-zone').selectOption('UTC'); await page.locator('#daily-now').click();
  await page.clock.setFixedTime(new Date('2028-03-01T00:01:00Z')); await page.evaluate(()=>window.dispatchEvent(new Event('focus'))); await expect(page.locator('#daily-date')).toHaveValue('2028-03-01');
  await page.locator('#daily-date').fill('2028-02-28'); await page.locator('#history-from').fill('2028-02-28'); await page.reload(); await expect(page.locator('#daily-date')).toHaveValue('2028-02-28');await expect(page.locator('#daily-zone')).toHaveValue('UTC');await expect(page.locator('#history-from')).toHaveValue('2028-02-28');
});
test('language switches preserve unsaved record details without saving and native fields fit phone widths',async({page},info)=>{
  await seed(page); await openDay(page); await page.getByRole('button',{name:'Add a record',exact:true}).click(); await page.locator('#record-label').fill('PRIVATE-DRAFT'); await page.locator('#record-dose').fill('17.25'); await page.locator('#record-notes').fill('备注草稿'); await page.getByRole('link',{name:'中文',exact:true}).click();
  await expect(page.locator('#record-label')).toHaveValue('PRIVATE-DRAFT'); await expect(page.locator('#record-notes')).toHaveValue('备注草稿'); await expect.poll(async()=>(await records(page)).length).toBe(0); await expect(page.locator('#record-editor-heading')).toHaveText('添加记录');
  for(const width of [320,390,641,820,1280]) { await page.setViewportSize({width,height:844}); expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false); const boxes=await page.locator('#record-date, #record-time, #record-zone').evaluateAll(nodes=>nodes.map(n=>{const a=n.getBoundingClientRect(),b=n.parentElement!.getBoundingClientRect();return a.right<=b.right+1 && a.left>=b.left-1;}));expect(boxes.every(Boolean)).toBe(true); }
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:info.outputPath('zh-record-editor.png'),fullPage:true});
  await page.getByRole('link',{name:'EN',exact:true}).click(); await expect(page.locator('#record-label')).toHaveValue('PRIVATE-DRAFT'); await expect(page.locator('#record-dose')).toHaveValue('17.25');
});
test('loading, restoring and rerendering do not create record events and denied analytics sends no requests',async({page})=>{
  await seed(page); const requests:string[]=[];page.on('request',r=>requests.push(r.url()+' '+(r.postData()??''))); await openDay(page); await page.locator('#daily-entries > li').first().getByRole('button',{name:'Skip',exact:true}).click(); await page.reload();
  expect(requests.some(r=>/google-analytics|googletagmanager/.test(r))).toBe(false); expect(requests.join('\n')).not.toMatch(/PRIVATE|dose=|notes=|occurredAt/);
});
test('allowed analytics sends only whitelisted categories once per successful explicit operation',async({page})=>{
  await seed(page);
  await page.route('**/*',async route=>{if(route.request().resourceType()!=='document')return route.continue();const r=await route.fetch(); await route.fulfill({response:r,body:(await r.text()).replace('data-analytics-enabled="false"','data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"',`data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/,'data-ga-id="G-TEST123"')});});
  await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({contentType:'application/javascript',body:'/* offline GA contract */'}));
  await page.goto('/today'); await page.getByRole('button',{name:'Analytics preferences',exact:true}).click(); await page.getByRole('button',{name:'Allow analytics',exact:true}).click(); await page.locator('#daily-zone').selectOption('UTC');await page.locator('#daily-date').fill('2028-02-29');
  await page.locator('#daily-entries > li').first().getByRole('button',{name:'Skip',exact:true}).click(); await page.locator('#daily-zone').selectOption('America/New_York'); await page.locator('#daily-zone').selectOption('UTC');
  const events=()=>page.evaluate(()=>((window as unknown as {dataLayer:Array<ArrayLike<unknown>>}).dataLayer??[]).map(a=>Array.from(a)).filter(a=>a[0]==='event'));
  await expect.poll(async()=>(await events()).filter(a=>a[1]==='record_saved').length).toBe(1);
  await page.locator('#daily-entries > li').first().getByRole('button',{name:'Edit record',exact:true}).click(); await page.locator('#record-notes').fill('PRIVATE-UPDATED'); await page.getByRole('button',{name:'Save record',exact:true}).click(); await expect(page.locator('#record-save')).toBeEnabled(); await expect.poll(async()=>(await events()).filter(a=>a[1]==='record_saved').length).toBe(2);
  const backup=await page.evaluate(key=>localStorage.getItem(key)!,STORAGE_KEY);
  page.on('dialog',d=>d.accept());await page.locator('#daily-entries > li').first().getByRole('button',{name:'Undo record',exact:true}).click();await expect.poll(async()=>(await events()).filter(a=>a[1]==='record_removed').length).toBe(1);
  await page.getByText('Your local data',{exact:true}).click();await page.locator('#daily-backup-import').setInputFiles({name:'private.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.getByRole('button',{name:'Restore backup',exact:true}).click();await expect(page.locator('[data-restore-preview]')).toBeHidden();await expect.poll(async()=>(await events()).filter(a=>a[1]==='backup_restored').length).toBe(1);expect((await events()).filter(a=>a[1]==='record_saved')).toHaveLength(2);
  expect(JSON.stringify(await events())).not.toMatch(/PRIVATE|250|recordId|scheduledDate|occurredAt|notes|\/zh\/|#|\?/);
});
