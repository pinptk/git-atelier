'use strict';
const {test,expect}=require('@playwright/test');
const path=require('node:path');
const {GitEngine}=require('../../git-engine');
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('git-atelier-state-v1')));
const run=page=>page.locator('#execute-button').tap();
const remote=page=>page.locator('.repo-card.remote');
const local=page=>page.locator('.repo-card.local');
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',route=>route.abort());});

test('PC start guides every necessary step and keeps the mobile dock hidden until execution finishes',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('.start-chooser')).toBeVisible();await expect(page.locator('.mobile-dock')).toBeHidden();
  await page.screenshot({path:'screenshots/atelier-start-choice.png'});await page.locator('[data-start="local"]').tap();await expect(page.locator('#operation-title')).toHaveText('Git管理を開始');await expect(local(page)).toContainText('Git未初期化');await expect(remote(page)).toContainText('まだありません');
  let s=await state(page);expect(s.spaces).toHaveLength(1);expect(s.spaces[0].remote).toBeNull();expect(Object.keys(s.commits)).toHaveLength(0);await expect(page.locator('.mobile-dock')).toBeHidden();
  await page.screenshot({path:'screenshots/atelier-start-pc.png'});
  await run(page);await expect(page.locator('#operation-title')).toHaveText('ファイルを編集');await expect(page.locator('[data-input="content"]')).toHaveValue(/自分のPC/);await page.reload();await expect(page.locator('#operation-title')).toHaveText('ファイルを編集');
  await page.locator('[data-input="content"]').fill('# Hello Git\n最初のファイル編集です。');await run(page);await expect(page.locator('#operation-title')).toHaveText('ステージ');await expect(page.locator('[data-stage-file]')).toHaveCount(1);await run(page);await expect(page.locator('#operation-title')).toHaveText('コミット');await expect(page.locator('[data-input="content"]')).toHaveCount(0);await run(page);
  await expect(page.locator('#operation-title')).toHaveText('GitHubにリポジトリ作成');await remote(page).locator('.repo-top').tap();await page.locator('#finish-target-picking').tap();await page.locator('[data-input="name"]').fill('my-first-project');await run(page);
  await expect(page.locator('#operation-title')).toHaveText('originを設定');s=await state(page);const space=s.spaces.find(x=>x.id===s.active);expect(s.repos[space.local].remote).toBeNull();expect(s.repos[space.remote].branches).toEqual({});
  await local(page).locator('.repo-top').tap();await run(page);await expect(page.locator('#operation-title')).toHaveText('ブランチを公開');await remote(page).locator('.repo-top').tap();await run(page);
  await expect(page.locator('#operation-panel')).toBeHidden();await expect(page.locator('.mobile-dock')).toBeVisible();s=await state(page);const c=s.spaces.find(x=>x.id===s.active);expect(s.repos[c.remote].branches.main).toBe(s.repos[c.local].branches.main);expect(s.commits[s.repos[c.local].branches.main].parents).toEqual([]);expect(errors).toEqual([]);
});

test('GitHub start requests clone, then restores navigation; canceling another operation also restores it',async({page})=>{
  await page.goto('/');await page.locator('[data-start="github"]').tap();await expect(page.locator('#operation-title')).toHaveText('クローン');await expect(page.locator('.mobile-dock')).toBeHidden();await expect(page.locator('#toolbox [data-open="fetch"]')).toBeDisabled();
  await local(page).locator('.repo-top').tap();await run(page);await expect(page.locator('.mobile-dock')).toBeVisible();const s=await state(page),space=s.spaces[0];expect(s.repos[space.local].branches.main).toBe(s.repos[space.remote].branches.main);
  await page.locator('#mobile-tools').tap();await page.locator('#toolbox [data-open="fetch"]').tap();await expect(page.locator('.mobile-dock')).toBeHidden();await expect(page.locator('#operation-panel')).toHaveCSS('bottom','12px');
  await page.screenshot({path:'screenshots/atelier-operation-no-dock.png'});await page.getByRole('button',{name:'キャンセル',exact:true}).tap();await expect(page.locator('.mobile-dock')).toBeVisible();
});

test('the first visit after upgrading asks for a starting point without erasing existing practice',async({page})=>{
  const old=new GitEngine().state;await page.addInitScript(s=>localStorage.setItem('git-atelier-state-v1',JSON.stringify(s)),old);await page.goto('/');await page.locator('[data-start="github"]').tap();
  const s=await state(page);expect(s.spaces).toHaveLength(2);expect(s.repos['local-1'].branches['feature/design']).toBe('d4e5f6a');await expect(page.getByRole('tab')).toHaveCount(2);
});

test('the self-contained LAN HTML includes the start screen and required first operation offline',async({page})=>{
  await page.context().setOffline(true);await page.goto('file:///'+path.resolve('git-atelier.html').replaceAll('\\','/'));await expect(page.locator('.start-chooser')).toBeVisible();await page.locator('[data-start="local"]').tap();await expect(page.locator('#operation-title')).toHaveText('Git管理を開始');await expect(page.locator('.mobile-dock')).toBeHidden();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
