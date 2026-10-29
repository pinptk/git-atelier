'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {GitEngine} = require('../git-engine');
const ref=(repo,branch,kind='branch')=>({repo,branch,kind});
const lr=()=>ref('local-1','main');
const rr=()=>ref('remote-1','main');
function mainCheckout(e){e.execute('checkout',null,lr());}
function record(e,target,{message,file,content}){e.execute('edit',null,target,{file,content});e.execute('stage',null,target,{files:[file]});return e.execute('commit',null,target,{message});}

test('fetch updates tracking refs and leaves every local branch and HEAD unchanged',()=>{
  const e=new GitEngine(),local=e.repo('local-1'),before=JSON.stringify(local.branches),head=local.head;
  e.execute('fetch',{repo:'remote-1'},{repo:'local-1'});
  assert.equal(local.tracking['origin/main'],'c3d4e5f');assert.equal(JSON.stringify(local.branches),before);assert.equal(local.head,head);
});
test('pull requires checked out destination and then fast-forwards without a merge commit',()=>{
  const e=new GitEngine();assert.throws(()=>e.execute('pull',rr(),lr()),/チェックアウト/);mainCheckout(e);
  const n=Object.keys(e.state.commits).length;e.execute('pull',rr(),lr());assert.equal(e.repo('local-1').branches.main,'c3d4e5f');assert.equal(Object.keys(e.state.commits).length,n);
});
test('divergent histories merge with two parents and retain both independent edits',()=>{
  const e=new GitEngine();e.execute('fetch',rr(),{repo:'local-1'});
  e.execute('merge',ref('local-1','origin/main','tracking'),ref('local-1','feature/design'));
  const c=e.state.commits[e.repo('local-1').branches['feature/design']];assert.deepEqual(c.parents,['d4e5f6a','c3d4e5f']);assert.match(c.files['README.md'],/チーム/);assert.match(c.files['style.css'],/teal/);
});
test('push rejects loss of remote history; publishing creates a remote ref and upstream',()=>{
  const e=new GitEngine();assert.throws(()=>e.execute('push',ref('local-1','feature/design'),rr()),/non-fast-forward/);assert.equal(e.repo('remote-1').branches.main,'c3d4e5f');
  e.execute('publish',ref('local-1','feature/design'),{repo:'remote-1'});assert.equal(e.repo('remote-1').branches['feature/design'],'d4e5f6a');assert.equal(e.repo('local-1').upstreams['feature/design'],'feature/design');
});
test('conflicting snapshots require a resolution, then create a real merge commit',()=>{
  const e=new GitEngine();record(e,ref('local-1','feature/design'),{message:'edit readme',file:'README.md',content:'My edit'});const old=e.repo('local-1').branches['feature/design'];
  const result=e.execute('pull',rr(),ref('local-1','feature/design'));assert.equal(result.conflicts.length,1);assert.equal(e.repo('local-1').branches['feature/design'],old);
  e.execute('pull',rr(),ref('local-1','feature/design'),{resolutions:{'README.md':'source'}});const c=e.state.commits[e.repo('local-1').branches['feature/design']];assert.equal(c.parents.length,2);assert.match(c.files['README.md'],/チーム/);assert.ok(c.files['style.css']);
});
test('sync pulls first and pushes the merged history',()=>{
  const e=new GitEngine();e.execute('sync',ref('local-1','feature/design'),rr());const remote=e.repo('remote-1').branches.main,local=e.repo('local-1').branches['feature/design'];assert.equal(remote,local);assert.equal(e.state.commits[local].parents.length,2);assert.equal(e.repo('local-1').tracking['origin/main'],local);
});
test('fork creates an independent remote and tab; clone creates a connected local with only checked out branch',()=>{
  const e=new GitEngine();e.execute('publish',ref('local-1','feature/design'),{repo:'remote-1'});e.execute('fork',{repo:'remote-1'},null,{name:'learner'});
  const space=e.space,remote=e.repo(space.remote);assert.equal(space.local,null);assert.equal(remote.parent,'remote-1');assert.equal(remote.name,'learner / hello-git');assert.equal(e.state.spaces.length,2);
  e.execute('clone',{repo:remote.id},{kind:'empty'});const local=e.repo(space.local);assert.equal(local.remote,remote.id);assert.deepEqual(Object.keys(local.branches),['main']);assert.ok(local.tracking['origin/feature/design']);
  e.execute('remote-commit',null,ref(remote.id,'main'),{message:'fork edit',file:'new.txt',content:'new'});assert.equal(e.repo('remote-1').branches.main,'c3d4e5f');
});
test('fork PR workflow preserves target until an explicit merge and local until fetch/pull',()=>{
  const e=new GitEngine();e.execute('fork',{repo:'remote-1'},null,{name:'learner'});e.execute('clone',{repo:e.space.remote},{kind:'empty'});
  const r=e.space.remote,l=e.space.local;e.execute('branch',ref(l,'main'),null,{name:'feature/idea'});record(e,ref(l,'feature/idea'),{message:'Idea',file:'idea.txt',content:'hello'});e.execute('publish',ref(l,'feature/idea'),{repo:r});
  const orig=e.repo('remote-1').branches.main;e.execute('pr',ref(r,'feature/idea'),rr(),{message:'A new idea'});assert.equal(e.repo('remote-1').branches.main,orig);assert.equal(e.state.prs[0].status,'open');
  e.execute('merge-pr',null,null,{id:1});assert.equal(e.repo('remote-1').branches.main,e.repo(r).branches['feature/idea']);assert.equal(e.repo('local-1').branches.main,'b2c3d4e');assert.equal(e.state.prs[0].status,'merged');
});
test('deletion protects current, unmerged and remote default branches',()=>{
  const e=new GitEngine();assert.throws(()=>e.execute('delete',null,ref('local-1','feature/design')),/作業中/);mainCheckout(e);assert.throws(()=>e.execute('delete',null,ref('local-1','feature/design')),/未マージ/);assert.throws(()=>e.execute('delete',null,rr()),/デフォルト/);
  e.execute('merge',ref('local-1','feature/design'),lr());e.execute('delete',null,ref('local-1','feature/design'));assert.equal(e.repo('local-1').branches['feature/design'],undefined);assert.ok(e.state.commits.d4e5f6a);
});
test('branch creation moves HEAD without copying commits and rejects dangerous/invalid names',()=>{
  const e=new GitEngine(),n=Object.keys(e.state.commits).length;e.execute('branch',lr(),null,{name:'feature/experiment'});assert.equal(e.repo('local-1').head,'feature/experiment');assert.equal(e.repo('local-1').branches['feature/experiment'],'b2c3d4e');assert.equal(Object.keys(e.state.commits).length,n);
  for(const name of ['bad name','../bad','__proto__','feature/.hidden','feature.lock','bad~name'])assert.throws(()=>e.execute('branch',lr(),null,{name}),/ブランチ名/);
});
test('local saved state round trips; multiple practice spaces have separate repositories',()=>{
  const e=new GitEngine();e.demo();e.demo(true);const restored=new GitEngine(JSON.parse(JSON.stringify(e.state)));assert.equal(restored.state.spaces.length,3);assert.equal(restored.space.local,null);assert.notEqual(restored.state.spaces[1].remote,restored.space.remote);
});
test('branching from a remote tracking ref sets upstream, and published branches may be deleted safely',()=>{
  const e=new GitEngine();e.execute('branch',ref('local-1','origin/main','tracking'),null,{name:'work'});assert.equal(e.repo('local-1').upstreams.work,'main');
  e.execute('publish',ref('local-1','feature/design'),{repo:'remote-1'});e.execute('delete',null,ref('local-1','feature/design'));assert.ok(!Object.hasOwn(e.repo('local-1').branches,'feature/design'));assert.equal(e.repo('remote-1').branches['feature/design'],'d4e5f6a');
});
test('a PC project starts without Git and follows init, root commit, empty remote, origin and publish',()=>{
  const e=new GitEngine();e.startProject('local',{replace:true});const lid=e.space.local,l=e.repo(lid);
  assert.equal(e.space.remote,null);assert.equal(l.initialized,false);assert.deepEqual(l.branches,{});assert.equal(Object.keys(e.state.commits).length,0);assert.equal(e.requiredAction(),'init');
  assert.throws(()=>e.execute('publish',ref(lid,'main'),{repo:'remote-1'}),/まず init/);
  e.execute('init',null,{repo:lid});assert.equal(l.initialized,true);assert.deepEqual(l.branches,{});assert.equal(e.requiredAction(),'edit');
  record(e,{repo:lid},{message:'Initial commit',file:'README.md',content:l.workingFiles['README.md']+'\n編集しました。'});const root=l.branches.main;assert.deepEqual(e.state.commits[root].parents,[]);assert.equal(l.head,'main');assert.equal(e.requiredAction(),'create-remote');
  e.execute('create-remote',null,{kind:'emptyRemote'},{name:'first-project'});const rid=e.space.remote;assert.deepEqual(e.repo(rid).branches,{});assert.equal(l.remote,null);assert.equal(e.requiredAction(),'connect');
  e.execute('connect',{repo:rid},{repo:lid});assert.equal(l.remote,rid);assert.deepEqual(e.repo(rid).branches,{});assert.equal(e.requiredAction(),'publish');
  e.execute('publish',ref(lid,'main'),{repo:rid});assert.equal(e.repo(rid).branches.main,root);assert.equal(l.upstreams.main,'main');assert.equal(e.requiredAction(),null);new GitEngine(JSON.parse(JSON.stringify(e.state)));
});
test('a GitHub project requires clone first, then leaves an ordinary connected repository',()=>{
  const e=new GitEngine();e.startProject('github',{replace:true});const rid=e.space.remote;assert.equal(e.space.local,null);assert.equal(e.requiredAction(),'clone');assert.throws(()=>e.execute('init',null,{}),/まず clone/);
  e.execute('clone',{repo:rid},{kind:'empty'});const l=e.repo(e.space.local);assert.equal(l.branches.main,e.repo(rid).branches.main);assert.equal(l.remote,rid);assert.equal(e.requiredAction(),null);assert.deepEqual(l.tracking,{'origin/main':'c3d4e5f'});
});
test('choosing a new starting point preserves existing work and an unfinished start survives reload',()=>{
  const e=new GitEngine(),before=JSON.stringify(e.state.repos['local-1']);e.startProject('local');assert.equal(JSON.stringify(e.state.repos['local-1']),before);assert.equal(e.state.spaces.length,2);
  e.execute('init',null,{repo:e.space.local});const restored=new GitEngine(JSON.parse(JSON.stringify(e.state)));assert.equal(restored.requiredAction(),'edit');assert.equal(restored.state.onboardingVersion,1);
});
test('editing, staging and committing are distinct; edits after staging remain outside the commit',()=>{
  const e=new GitEngine(),t=ref('local-1','feature/design'),r=e.repo(t.repo),old=r.branches[t.branch],original=r.index['README.md'];
  e.execute('edit',null,t,{file:'README.md',content:'Version A'});assert.equal(r.branches[t.branch],old);assert.equal(r.index['README.md'],original);assert.equal(e.workingStatus(r).unstaged.length,1);assert.equal(e.workingStatus(r).staged.length,0);
  assert.throws(()=>e.execute('commit',null,t,{message:'No staging'}),/ステージされた変更がありません/);
  e.execute('stage',null,t,{files:['README.md']});assert.equal(r.index['README.md'],'Version A');assert.equal(r.branches[t.branch],old);
  e.execute('edit',null,t,{file:'README.md',content:'Version B'});e.execute('commit',null,t,{message:'Only staged A'});assert.equal(e.state.commits[r.branches[t.branch]].files['README.md'],'Version A');assert.equal(r.workingFiles['README.md'],'Version B');assert.equal(e.workingStatus(r).staged.length,0);assert.equal(e.workingStatus(r).unstaged[0].after,'Version B');
});
test('selective staging records only chosen files; other edits stay in the working folder',()=>{
  const e=new GitEngine(),t=ref('local-1','feature/design'),r=e.repo(t.repo);e.execute('edit',null,t,{file:'one.txt',content:'one'});e.execute('edit',null,t,{file:'two.txt',content:'two'});
  const index=JSON.stringify(r.index);assert.throws(()=>e.execute('stage',null,t,{files:['one.txt','missing.txt']}),/変更されたファイル/);assert.equal(JSON.stringify(r.index),index);
  e.execute('stage',null,t,{files:['one.txt']});e.execute('commit',null,t,{message:'one only'});const files=e.state.commits[r.branches[t.branch]].files;assert.equal(files['one.txt'],'one');assert.equal(files['two.txt'],undefined);assert.deepEqual(e.workingStatus(r).unstaged.map(c=>c.file),['two.txt']);
});
test('restaging replaces the staged snapshot and survives saving and reloading',()=>{
  const e=new GitEngine(),t=ref('local-1','feature/design');e.execute('edit',null,t,{file:'README.md',content:'first'});e.execute('stage',null,t);e.execute('edit',null,t,{file:'README.md',content:'second'});
  const restored=new GitEngine(JSON.parse(JSON.stringify(e.state)));assert.equal(restored.repo(t.repo).index['README.md'],'first');assert.equal(restored.repo(t.repo).workingFiles['README.md'],'second');restored.execute('stage',null,t);restored.execute('commit',null,t,{message:'second'});assert.equal(restored.headFiles(restored.repo(t.repo))['README.md'],'second');assert.deepEqual(restored.workingStatus(t.repo),{unstaged:[],staged:[]});
});
test('switching or merging cannot silently overwrite uncommitted files; clean checkouts update the snapshots',()=>{
  const e=new GitEngine(),t=ref('local-1','feature/design');e.execute('edit',null,t,{file:'README.md',content:'unsaved work'});assert.throws(()=>e.execute('checkout',null,lr()),/未コミット/);assert.throws(()=>e.execute('merge',lr(),t),/未コミット/);assert.equal(e.repo(t.repo).workingFiles['README.md'],'unsaved work');
  e.execute('stage',null,t);e.execute('commit',null,t,{message:'save'});e.execute('checkout',null,lr());assert.equal(e.repo(t.repo).workingFiles['style.css'],undefined);assert.deepEqual(e.workingStatus(t.repo),{unstaged:[],staged:[]});
});
test('older saved local repositories gain clean working and index snapshots without losing history',()=>{
  const old=new GitEngine().state;delete old.repos['local-1'].workingFiles;delete old.repos['local-1'].index;const restored=new GitEngine(old);assert.equal(restored.repo('local-1').branches['feature/design'],'d4e5f6a');assert.deepEqual(restored.repo('local-1').index,restored.headFiles(restored.repo('local-1')));assert.deepEqual(restored.workingStatus('local-1'),{unstaged:[],staged:[]});
});
