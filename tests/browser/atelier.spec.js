'use strict';
const {test,expect} = require('@playwright/test');
const path=require('node:path');
const {GitEngine}=require('../../git-engine');
const {recordFile}=require('./workflow-helper');
const demoState=new GitEngine().state;demoState.onboardingVersion=1;
const remote=page=>page.locator('.repo-card.remote');
const local=page=>page.locator('.repo-card.local');
const branch=(repo,name)=>repo.getByRole('button',{name:new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'( HEAD)?$')});
const operation=(page,name)=>page.locator(`.operations-sidebar [data-open="${name}"]`);
const run=page=>page.locator('#execute-button').click();
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('git-atelier-state-v1')));
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.addInitScript(s=>{if(!localStorage.getItem('git-atelier-state-v1'))localStorage.setItem('git-atelier-state-v1',JSON.stringify(s));},demoState);await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();});

test('renders the repository layout and runs fetch, checkout and pull through clickable targets',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const rb=await remote(page).boundingBox(),lb=await local(page).boundingBox(),tb=await page.locator('.operations-sidebar').boundingBox();expect(rb.x).toBeLessThan(lb.x);expect(lb.x).toBeLessThan(tb.x);
  await page.screenshot({path:'screenshots/atelier-desktop.png',fullPage:true});
  await operation(page,'fetch').click();await remote(page).locator('.repo-top').click();await local(page).locator('.repo-top').click();
  await expect(page.locator('#execute-button')).toBeEnabled();
  const panel=await page.locator('#operation-panel').boundingBox(),repo=await local(page).boundingBox();expect(panel.x).toBeGreaterThanOrEqual(repo.x+repo.width);
  await page.screenshot({path:'screenshots/atelier-operation.png',fullPage:true});await run(page);
  let s=await state(page);expect(s.repos['local-1'].tracking['origin/main']).toBe('c3d4e5f');expect(s.repos['local-1'].branches.main).toBe('b2c3d4e');
  await operation(page,'checkout').click();await branch(local(page),'main').click();await run(page);await expect(branch(local(page),'main')).toContainText('HEAD');
  await operation(page,'pull').click();await branch(remote(page),'main').click();await branch(local(page),'main').click();await run(page);s=await state(page);expect(s.repos['local-1'].branches.main).toBe('c3d4e5f');
  await expect(page.locator('#activity-log')).toContainText('プルしました');expect(errors).toEqual([]);
});
test('merge shows two parents, undo and redo restore snapshots, refresh preserves state',async({page})=>{
  await operation(page,'fetch').click();await remote(page).locator('.repo-top').click();await local(page).locator('.repo-top').click();await run(page);
  await operation(page,'merge').click();await branch(local(page),'origin/main').click();await branch(local(page),'feature/design').click();await run(page);
  let s=await state(page),id=s.repos['local-1'].branches['feature/design'];expect(s.commits[id].parents).toHaveLength(2);
  await page.locator('#undo-button').click();s=await state(page);expect(s.repos['local-1'].branches['feature/design']).toBe('d4e5f6a');
  await page.locator('#redo-button').click();await page.reload();s=await state(page);expect(s.repos['local-1'].branches['feature/design']).toBe(id);
  await page.locator(`[data-commit="${id}"]`).click();await expect(page.locator('#modal')).toContainText('2つの履歴');
});
test('fork tab, clone, new branch, commit, publish, cross-tab PR and merge work end to end',async({page})=>{
  await operation(page,'fork').click();await remote(page).locator('.repo-top').click();await page.locator('[data-input="name"]').fill('learner');await run(page);
  await expect(page.getByRole('tab')).toHaveCount(2);await expect(page.locator('.repo-empty')).toBeVisible();
  let s=await state(page);const forkSpace=s.spaces.find(x=>x.id===s.active),rid=forkSpace.remote;
  await operation(page,'clone').click();await remote(page).locator('.repo-top').click();await local(page).locator('.repo-top').click();await run(page);
  s=await state(page);const lid=s.spaces.find(x=>x.id===s.active).local;expect(s.repos[lid].remote).toBe(rid);
  await operation(page,'branch').click();await branch(local(page),'main').click();await page.locator('[data-input="name"]').fill('feature/idea');await run(page);
  await recordFile(page,{file:'idea.txt',content:'A new idea'});
  await operation(page,'publish').click();await branch(local(page),'feature/idea').click();await remote(page).locator('.repo-top').click();await run(page);
  await operation(page,'pr').click();await branch(remote(page),'feature/idea').click();await page.getByRole('tab',{name:'hello-git',exact:true}).click();await expect(page.locator('#operation-panel')).toBeVisible();await branch(remote(page),'main').click();await run(page);
  await expect(page.locator('.pr-card')).toBeVisible();s=await state(page);expect(s.prs[0].status).toBe('open');expect(s.repos['remote-1'].branches.main).toBe('c3d4e5f');
  await page.locator('[data-merge-pr="1"]').click();await page.locator('[data-confirm-pr="1"]').click();s=await state(page);expect(s.prs[0].status).toBe('merged');expect(s.repos['remote-1'].branches.main).toBe(s.repos[rid].branches['feature/idea']);
  await page.screenshot({path:'screenshots/atelier-fork-pr.png',fullPage:true});
});
test('conflicting pull can be cancelled without side effects and then resolved',async({page})=>{
  await recordFile(page,{content:'Local conflicting content'});
  const before=await state(page);
  await operation(page,'pull').click();await branch(remote(page),'main').click();await branch(local(page),'feature/design').click();await run(page);
  await expect(page.locator('#modal-title')).toHaveText('変更がぶつかりました');await page.getByRole('button',{name:'操作を取り消す'}).click();
  let s=await state(page);expect(s.repos).toEqual(before.repos);
  await run(page);await page.locator('input[value="source"]').check();await page.locator('#resolve-conflicts').click();s=await state(page);const c=s.commits[s.repos['local-1'].branches['feature/design']];expect(c.parents).toHaveLength(2);expect(c.files['README.md']).toContain('チーム');
});
test('push rejection is actionable and safe, while escaping user text',async({page})=>{
  await operation(page,'push').click();await branch(remote(page),'main').click();await run(page);await expect(page.locator('.operation-error')).toContainText('non-fast-forward');
  await page.locator('[data-cancel-operation]').first().click();
  await recordFile(page,{message:'<img src=x onerror=alert(1)>',content:'<script>alert(1)</script>'});
  await expect(page.locator('#activity-log')).toContainText('<img src=x onerror=alert(1)>');expect(await page.locator('#activity-log img').count()).toBe(0);
});
test('direct file opening works without a server and narrow view has no horizontal overflow',async({page})=>{
  await page.context().setOffline(true);
  await page.goto('file:///'+path.resolve('git-atelier.html').replaceAll('\\','/'));await expect(page.getByRole('heading',{level:1})).toHaveText('Gitキャンプ');
  await expect(page.locator('.branch-chip')).toHaveCount(4);
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(246, 247, 244)');
  await expect(page.locator('body')).toHaveCSS('font-size','13px');
  await page.screenshot({path:'screenshots/atelier-standalone.png',fullPage:true});
  await operation(page,'fetch').click();await remote(page).locator('.repo-top').click();await local(page).locator('.repo-top').click();await run(page);
  const s=await state(page);expect(s.repos['local-1'].tracking['origin/main']).toBe('c3d4e5f');expect(s.repos['local-1'].branches.main).toBe('b2c3d4e');
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'screenshots/atelier-mobile.png',fullPage:true});
});
