'use strict';
const {test,expect}=require('@playwright/test');
const {GitEngine}=require('../../git-engine');
const demo=new GitEngine().state;demo.onboardingVersion=1;
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('git-atelier-state-v1')));
const run=page=>page.locator('#execute-button').tap();
async function open(page,action){await page.locator('#mobile-tools').tap();await page.locator(`#toolbox [data-open="${action}"]`).tap();}
async function openLocal(page,action){await open(page,action);await page.locator('[data-slot="target"]').tap();await page.locator('.repo-card.local .repo-top').tap();if(await page.locator('#finish-target-picking').isVisible())await page.locator('#finish-target-picking').tap();}
async function edit(page,file,content){await openLocal(page,'edit');await page.locator('[data-input="file"]').fill(file);await page.locator('[data-input="content"]').fill(content);await run(page);}
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.addInitScript(s=>{if(!localStorage.getItem('git-atelier-state-v1'))localStorage.setItem('git-atelier-state-v1',JSON.stringify(s));},demo);await page.goto('/');});

test('touch editing, selective staging and commit preserve later edits and unstaged files',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await edit(page,'README.md','Staged version A');await edit(page,'extra.txt','Not staged');let s=await state(page);expect(s.repos['local-1'].branches['feature/design']).toBe('d4e5f6a');expect(s.repos['local-1'].index['README.md']).not.toBe('Staged version A');
  await openLocal(page,'stage');await expect(page.locator('[data-stage-file]')).toHaveCount(2);await page.locator('[data-stage-file][value="extra.txt"]').uncheck();await page.screenshot({path:'screenshots/atelier-stage-files.png'});await run(page);
  await edit(page,'README.md','Working version B');await expect(page.locator('[data-staged-changes]')).toContainText('README.md');await expect(page.locator('[data-working-changes]')).toContainText('extra.txt');
  await openLocal(page,'commit');await expect(page.locator('[data-input="content"]')).toHaveCount(0);await expect(page.locator('[data-input="file"]')).toHaveCount(0);await page.locator('.staged-preview summary').tap();await expect(page.locator('.staged-preview pre')).toHaveText('Staged version A');await page.locator('[data-input="message"]').fill('Commit staged A only');await page.screenshot({path:'screenshots/atelier-commit-staged.png'});await run(page);
  s=await state(page);const r=s.repos['local-1'],files=s.commits[r.branches['feature/design']].files;expect(files['README.md']).toBe('Staged version A');expect(files['extra.txt']).toBeUndefined();expect(r.workingFiles['README.md']).toBe('Working version B');expect(r.workingFiles['extra.txt']).toBe('Not staged');
  await page.reload();s=await state(page);expect(s.repos['local-1'].index['README.md']).toBe('Staged version A');expect(s.repos['local-1'].workingFiles['README.md']).toBe('Working version B');expect(errors).toEqual([]);await page.screenshot({path:'screenshots/atelier-working-and-stage.png',fullPage:true});
});

test('commit requires staged changes and stage checkboxes and undo keep each step separate',async({page})=>{
  await openLocal(page,'commit');await expect(page.locator('#execute-button')).toBeDisabled();await expect(page.locator('.staging-empty')).toContainText('ステージされた変更がありません');await page.getByRole('button',{name:'キャンセル',exact:true}).tap();
  await edit(page,'README.md','Changed');await openLocal(page,'stage');await page.locator('[data-stage-file]').uncheck();await expect(page.locator('#execute-button')).toBeDisabled();await page.locator('[data-stage-file]').check();await expect(page.locator('#execute-button')).toBeEnabled();await run(page);
  let s=await state(page);expect(s.repos['local-1'].index['README.md']).toBe('Changed');await page.locator('#undo-button').tap();s=await state(page);expect(s.repos['local-1'].index['README.md']).not.toBe('Changed');expect(s.repos['local-1'].workingFiles['README.md']).toBe('Changed');await page.locator('#redo-button').tap();s=await state(page);expect(s.repos['local-1'].index['README.md']).toBe('Changed');
});

test('a collaborator update and fetch never change local edited files or the index',async({page})=>{
  await edit(page,'README.md','My local edits');let s=await state(page);const before=s.repos['local-1'].index;
  await open(page,'remote-commit');await page.locator('.repo-card.remote').getByRole('button',{name:'main',exact:true}).tap();await page.locator('#finish-target-picking').tap();await page.locator('[data-input="content"]').fill('A collaborator update');await run(page);
  await open(page,'fetch');await page.locator('.repo-card.local .repo-top').tap();await run(page);s=await state(page);expect(s.repos['local-1'].workingFiles['README.md']).toBe('My local edits');expect(s.repos['local-1'].index).toEqual(before);expect(s.repos['local-1'].tracking['origin/main']).toBe(s.repos['remote-1'].branches.main);
});
