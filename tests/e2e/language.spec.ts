import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { STORAGE_KEY } from '../../src/lib/backup';

test('new Chinese-browser visitors start in English; switching preserves inputs and remembers the choice', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: 'zh-CN' }); const page = await context.newPage();
  await page.goto('/'); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'Quick calculator', exact: true }).click();
  await page.locator('#concentration').fill('5'); await page.locator('#dose').fill('250');
  await page.locator('[data-language="zh"]').click();
  await expect(page).toHaveURL(/\/zh\/calculator$/); await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('剂量与体积换算');
  await expect(page.locator('#concentration')).toHaveValue('5'); await expect(page.locator('#dose')).toHaveValue('250');
  await page.getByRole('button', { name: '计算体积', exact: true }).click(); await expect(page.locator('#result-volume')).toHaveText('0.05');
  await page.locator('#dose').fill('0'); await page.getByRole('button', { name: '计算体积', exact: true }).click();
  await expect(page.locator('#calculator-error')).toHaveText('请输入大于零的数值。');
  await page.goto('/'); await expect(page).toHaveURL(/\/zh$/);
  await page.locator('.site-header > nav').getByRole('link', { name: '参考资料库', exact: true }).click();
  await expect(page).toHaveURL(/\/zh\/library$/);
  await page.locator('[data-language="en"]').click(); await expect(page).toHaveURL(/\/library$/); await expect(page.locator('html')).toHaveAttribute('lang','en');
  await page.goto('/'); await expect(page.locator('html')).toHaveAttribute('lang','en');
  await context.close();
});

test('Chinese references and metadata remain readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false }); const page = await context.newPage();
  await page.goto('/zh/library/cjc-1295');
  await expect(page.getByRole('heading', { name: '来源与核查方法' })).toBeVisible();
  await expect(page.locator('body')).toContainText('5.8–8.1 天');
  await expect(page.locator('body')).toContainText('不适用于标注');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://peptides.ybwdaisy.com/zh/library/cjc-1295');
  await expect(page.locator('link[hreflang="en"][rel="alternate"]')).toHaveAttribute('href','https://peptides.ybwdaisy.com/library/cjc-1295');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','/apple-touch-icon.png');
  await context.close();
});

test('language switching retains planner drafts, saved identity and user text; Chinese exports are localized', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/zh/planner'); await page.getByRole('button',{name:'暂不允许',exact:true}).click();
  await page.locator('#protocol-name').fill('Delete'); await page.locator('#time-zone').selectOption('UTC');
  await page.locator('#start-date').fill('2028-02-28'); await page.locator('#end-date').fill('2028-03-01');
  const row=page.locator('.protocol-item').first();
  await row.locator('[data-field="label"]').fill('Calculator'); await row.locator('[data-field="dose"]').fill('250'); await row.locator('[data-field="time"]').fill('08:00');
  await page.getByRole('button',{name:'生成日历',exact:true}).click(); await expect(page.locator('#calendar-summary')).toContainText('3 条记录');
  await page.getByRole('button',{name:'保存在此浏览器',exact:true}).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  const before=await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY);
  await page.locator('[data-language="en"]').click();
  await expect(page.locator('#protocol-name')).toHaveValue('Delete'); await expect(row.locator('[data-field="label"]')).toHaveValue('Calculator');
  await expect(page.locator('#calendar-summary')).toContainText('3 entries');
  await page.getByRole('button',{name:'Save in this browser',exact:true}).click(); await expect(page.locator('#save-protocol')).toBeEnabled();
  expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe(before);
  await page.locator('[data-language="zh"]').click(); await expect(page.locator('#calendar-summary')).toContainText('3 条记录');
  const pending=page.waitForEvent('download'); await page.getByRole('button',{name:'导出日历（.ics）',exact:true}).click();
  const calendar=await pending; const ics=(await readFile((await calendar.path())!,'utf8')).replace(/\r\n /g,'');
  expect(ics).toContain('用户自行填写的排程'); expect(ics).toContain('Calculator: 250 mcg'); expect(ics).toContain('DTSTART:20280229T080000Z');
  expect(await page.evaluate(()=>sessionStorage.getItem('peptide-tools.language-draft.v1'))).toBeNull();
  await page.locator('#backup-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
  await expect(page.locator('#storage-status')).toHaveText('恢复失败：此文件不是有效的 JSON。');
  expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe(before);
});

test('language links still work when storage is unavailable', async ({ page }) => {
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Unavailable','QuotaExceededError')};});
  await page.goto('/calculator'); await page.locator('[data-language="zh"]').click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('剂量与体积换算');
  await page.getByRole('button',{name:'计算体积',exact:true}).click(); await expect(page.locator('#calculator-error')).toContainText('大于零');
});

test('Chinese calculation events retain the original anonymous contract', async ({ page }) => {
  await page.route('**/zh/calculator',async route=>{
    const response=await route.fetch();const html=(await response.text()).replace('data-analytics-enabled="false"','data-analytics-enabled="true"').replace('data-analytics-origin="https://peptides.ybwdaisy.com"',`data-analytics-origin="${new URL(route.request().url()).origin}"`).replace(/data-ga-id(?:="[^"]*")?(?=\s|>)/,'data-ga-id="G-TEST123"');
    await route.fulfill({response,body:html});
  });
  await page.route('https://www.googletagmanager.com/**',route=>route.fulfill({contentType:'application/javascript',body:'/* no Google traffic */'}));
  await page.goto('/zh/calculator'); await page.getByRole('button',{name:'允许统计',exact:true}).click();
  await page.getByRole('button',{name:'计算体积',exact:true}).click();
  await page.locator('#concentration').fill('5'); await page.locator('#dose').fill('250'); await page.getByRole('button',{name:'计算体积',exact:true}).click();
  const commands=await page.evaluate(()=>((window as unknown as {dataLayer:Array<ArrayLike<unknown>>}).dataLayer).map(args=>Array.from(args)));
  const events=commands.filter(args=>args[0]==='event');
  for(const name of ['page_view','calculator_start','calculation_error','calculation_success']) expect(events.filter(args=>args[1]===name)).toHaveLength(1);
  expect(JSON.stringify(events)).not.toMatch(/\/zh|250|浓度|剂量/);
  expect(events.find(args=>args[1]==='calculation_success')?.[2]).toMatchObject({page_group:'calculator',page_location:'https://peptides.ybwdaisy.com/calculator'});
});

test('Chinese tools, references and legal pages have no overflow or uncaught errors', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const route of ['/zh','/zh/calculator','/zh/library','/zh/library/tb-500','/zh/planner','/zh/privacy','/zh/disclaimer']){
    expect((await page.goto(route))?.ok()).toBe(true);await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
