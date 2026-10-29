'use strict';
const {test,expect}=require('@playwright/test');
const path=require('node:path');
const {GitEngine}=require('../../git-engine');
const {recordFile}=require('./workflow-helper');
const demoState=new GitEngine().state;demoState.onboardingVersion=1;
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const remote=page=>page.locator('.repo-card.remote');
const local=page=>page.locator('.repo-card.local');
const namedBranch=(repo,name)=>repo.getByRole('button',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'( HEAD)?$')});
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('git-atelier-state-v1')));
async function open(page,action){await page.locator('#mobile-tools').tap();await expect(page.locator('#toolbox')).toBeVisible();await page.locator(`#toolbox [data-open="${action}"]`).tap();}
const run=page=>page.locator('#execute-button').tap();
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.addInitScript(s=>{if(!localStorage.getItem('git-atelier-state-v1'))localStorage.setItem('git-atelier-state-v1',JSON.stringify(s));},demoState);await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();});

test('phone layout has full-width cards, a bottom toolbox and touch-selectable fetch targets',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await expect(page.locator('.mobile-dock')).toBeVisible();await expect(page.locator('#toolbox')).toBeHidden();
  const rb=await remote(page).boundingBox(),lb=await local(page).boundingBox();expect(rb.width).toBeGreaterThan(350);expect(lb.x).toBe(rb.x);expect(lb.y).toBeGreaterThan(rb.y+rb.height);
  await page.screenshot({path:'screenshots/atelier-phone-home.png',fullPage:true});
  await page.locator('#mobile-tools').tap();await page.screenshot({path:'screenshots/atelier-phone-toolbox.png'});
  await page.locator('#toolbox [data-open="fetch"]').tap();await expect(page.locator('#operation-panel')).toHaveClass(/mobile-picking/);
  await expect(page.locator('.mobile-dock')).toBeHidden();
  await remote(page).locator('.repo-top').tap();await page.locator('[data-slot="target"]').tap();await local(page).locator('.repo-top').tap();
  await expect(page.locator('#execute-button')).toBeEnabled();
  const button=await local(page).locator('.repo-top').boundingBox(),panel=await page.locator('#operation-panel').boundingBox(),tabs=await page.locator('.workspace-bar').boundingBox();expect(button.y).toBeGreaterThanOrEqual(tabs.y+tabs.height);expect(button.y+button.height).toBeLessThan(panel.y);
  await page.screenshot({path:'screenshots/atelier-phone-targets.png'});await run(page);
  const s=await state(page);expect(s.repos['local-1'].tracking['origin/main']).toBe('c3d4e5f');expect(s.repos['local-1'].branches.main).toBe('b2c3d4e');expect(errors).toEqual([]);
  await expect(page.locator('.mobile-dock')).toBeVisible();
  await open(page,'checkout');await namedBranch(local(page),'main').tap();await run(page);
  await open(page,'pull');await namedBranch(remote(page),'main').tap();await page.locator('[data-slot="target"]').tap();await namedBranch(local(page),'main').tap();await run(page);
  expect((await state(page)).repos['local-1'].branches.main).toBe('c3d4e5f');
});

test('phone supports fork, clone, form input, publishing and a PR across workspace tabs',async({page})=>{
  await open(page,'fork');await remote(page).locator('.repo-top').tap();await page.locator('#finish-target-picking').tap();
  await expect(page.locator('[data-input="name"]')).toHaveCSS('font-size','16px');await page.locator('[data-input="name"]').fill('phone-user');await run(page);
  await expect(page.getByRole('tab')).toHaveCount(2);await expect(page.locator('.repo-empty')).toBeVisible();
  await open(page,'clone');await local(page).locator('.repo-top').tap();await run(page);
  await open(page,'branch');await page.locator('[data-input="name"]').fill('feature/phone');await run(page);
  await recordFile(page,{file:'phone.txt',content:'Made on a phone',touch:true});
  await open(page,'publish');await remote(page).locator('.repo-top').tap();await run(page);
  await open(page,'pr');await namedBranch(remote(page),'feature/phone').tap();await page.getByRole('tab',{name:'hello-git',exact:true}).tap();await namedBranch(remote(page),'main').tap();await page.locator('#finish-target-picking').tap();await run(page);
  expect((await state(page)).prs[0].status).toBe('open');await expect(page.locator('.pr-card')).toBeVisible();
});

test('mobile drawer closes cleanly, survives resize, and the standalone HTML works offline',async({page})=>{
  await page.locator('#mobile-tools').tap();await expect(page.locator('.main-column')).toHaveAttribute('inert','');await page.locator('#mobile-tool-close').tap();await expect(page.locator('#mobile-tools')).toHaveAttribute('aria-expanded','false');
  await page.locator('#mobile-tools').tap();await page.setViewportSize({width:1280,height:900});await expect(page.locator('#mobile-tool-backdrop')).toBeHidden();await expect(page.locator('.main-column')).not.toHaveAttribute('inert');await expect(page.locator('#toolbox')).toBeVisible();
  await page.context().setOffline(true);await page.goto('file:///'+path.resolve('git-atelier.html').replaceAll('\\','/'));
  for(const width of [320,360,390,430,760]){await page.setViewportSize({width,height:844});await expect(page.locator('.mobile-dock')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
  await page.setViewportSize({width:390,height:844});await open(page,'fetch');await remote(page).locator('.repo-top').tap();await run(page);expect((await state(page)).repos['local-1'].tracking['origin/main']).toBe('c3d4e5f');
});
