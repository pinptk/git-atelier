/* A small, deterministic commit DAG. No Git or network commands are executed. */
(function (root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  class GitError extends Error { constructor(message) { super(message); this.name = 'GitError'; } }
  class GitEngine {
    constructor(state) { this.state = state || this.initial(); this.validate(); this.migrateWorkingState(); }
    initial() {
      const commits = {
        a1b2c3d: { id:'a1b2c3d', parents:[], message:'プロジェクトをはじめる', files:{'README.md':'Hello, Git!'}, lane:'main', order:0 },
        b2c3d4e: { id:'b2c3d4e', parents:['a1b2c3d'], message:'使い方を追加', files:{'README.md':'Hello, Git!\n使い方を追加しました。'}, lane:'main', order:1 },
        c3d4e5f: { id:'c3d4e5f', parents:['b2c3d4e'], message:'共同編集者が README を更新', files:{'README.md':'Hello, Git!\n使い方を追加しました。\nチームからの更新です。'}, lane:'main', order:2 },
        d4e5f6a: { id:'d4e5f6a', parents:['b2c3d4e'], message:'ページの色を変更', files:{'README.md':'Hello, Git!\n使い方を追加しました。','style.css':'body { color: teal; }'}, lane:'feature/design', order:3 }
      };
      return { version:1, counter:4, repoCounter:2, spaceCounter:1, prCounter:0, active:'space-1', commits,
        repos:{ 'remote-1':{id:'remote-1',kind:'remote',name:'team / hello-git',branches:{main:'c3d4e5f'},defaultBranch:'main',parent:null},
          'local-1':{id:'local-1',kind:'local',name:'hello-git',branches:{main:'b2c3d4e','feature/design':'d4e5f6a'},head:'feature/design',defaultBranch:'main',remote:'remote-1',tracking:{'origin/main':'b2c3d4e'},upstreams:{main:'main'}} },
        spaces:[{id:'space-1',name:'hello-git',remote:'remote-1',local:'local-1',fork:false,progress:[]}], prs:[],
        log:[{title:'実験の準備ができました',detail:'リモートの main は、手元で取得した origin/main より1コミット先に進んでいます。まずはフェッチを試してみましょう。',command:'git status',type:'info',time:'START'}] };
    }
    validate() {
      const s=this.state;
      if(s.version!==1 || !s.repos || !s.commits || !Array.isArray(s.spaces) || !Array.isArray(s.log) || !s.spaces.some(x=>x.id===s.active)) throw new GitError('保存データを読み込めません。');
      for(const c of Object.values(s.commits)) if(!Array.isArray(c.parents)||!c.files||c.parents.some(p=>!s.commits[p])) throw new GitError('コミット履歴が不正です。');
      for(const r of Object.values(s.repos)) if(!r.branches||Object.values({...r.branches,...r.tracking}).some(id=>!s.commits[id])) throw new GitError('ブランチ参照が不正です。');
      for(const space of s.spaces) if((space.remote&&!s.repos[space.remote])||(space.local&&!s.repos[space.local])||(!space.remote&&!space.local)) throw new GitError('ワークスペースが不正です。');
    }
    startProject(kind,{replace=false}={}) {
      if(!['local','github'].includes(kind))throw new GitError('プロジェクトの開始地点を選んでください。');
      const seed=this.initial();
      if(replace)this.state={...seed,commits:{},repos:{},spaces:[],log:[],prs:[],counter:4,repoCounter:0,spaceCounter:0,prCounter:0};
      const sid='space-'+(++this.state.spaceCounter),id=(kind==='local'?'local-':'remote-')+(++this.state.repoCounter);
      if(kind==='local')this.state.repos[id]={id,kind:'local',name:'hello-git',initialized:false,branches:{},head:null,defaultBranch:'main',remote:null,tracking:{},upstreams:{},workingFiles:{'README.md':'# Hello Git\n自分のPCにあるプロジェクトです。'}};
      else{for(const [cid,c]of Object.entries(seed.commits))if(!this.state.commits[cid])this.state.commits[cid]=copy(c);this.state.repos[id]={...copy(seed.repos['remote-1']),id};}
      this.state.spaces.push({id:sid,name:kind==='local'?'PCからはじめる':'GitHubからはじめる',remote:kind==='github'?id:null,local:kind==='local'?id:null,fork:false,progress:[],startKind:kind});
      this.state.active=sid;this.state.onboardingVersion=1;this.state.entryPending=false;
      this.addLog(kind==='local'?'PCのプロジェクトを選びました':'GitHubのプロジェクトを選びました',kind==='local'?'まず git init でGit管理を始めましょう。ファイルはありますが、コミットとリモートはまだありません。':'まず clone で手元にリポジトリを作りましょう。GitHub上の履歴は、まだPCにはありません。','# 開始地点を選択','info');
      return this.space;
    }
    requiredAction() {
      const steps=this.space.startKind==='local'?['init','edit','stage','commit','create-remote','connect','publish']:this.space.startKind==='github'?['clone']:[];
      return steps.find(action=>!this.space.progress.includes(action))||null;
    }
    get space() { return this.state.spaces.find(s=>s.id===this.state.active); }
    repo(id) { const r=this.state.repos[id]; if(!r) throw new GitError('リポジトリを選んでください。');if(r.kind==='local')this.prepareWorkingState(r);return r; }
    headFiles(repo){const id=repo.branches[repo.head];return id?this.state.commits[id].files:{};}
    prepareWorkingState(repo){const files=this.headFiles(repo);if(!repo.workingFiles)repo.workingFiles=copy(files);if(!repo.index)repo.index=copy(files);if(repo.initialized===undefined)repo.initialized=true;}
    migrateWorkingState(){for(const repo of Object.values(this.state.repos))if(repo.kind==='local')this.prepareWorkingState(repo);for(const space of this.state.spaces)if(space.startKind==='local'&&space.progress.includes('commit'))for(const step of ['edit','stage'])if(!space.progress.includes(step))space.progress.push(step);}
    fileChanges(before,after){return [...new Set([...Object.keys(before),...Object.keys(after)])].filter(file=>before[file]!==after[file]||Object.hasOwn(before,file)!==Object.hasOwn(after,file)).sort().map(file=>({file,kind:!Object.hasOwn(before,file)?'added':!Object.hasOwn(after,file)?'deleted':'modified',before:before[file],after:after[file]}));}
    workingStatus(repo){if(typeof repo==='string')repo=this.repo(repo);this.prepareWorkingState(repo);return {unstaged:this.fileChanges(repo.index,repo.workingFiles),staged:this.fileChanges(this.headFiles(repo),repo.index)};}
    resetWorkingState(repo){const files=this.headFiles(repo);repo.workingFiles=copy(files);repo.index=copy(files);}
    ensureClean(repo){const status=this.workingStatus(repo);if(status.unstaged.length||status.staged.length)throw new GitError('未コミットの変更があります。編集したファイルをステージしてコミットしてから、ブランチの切り替え・統合を行ってください。');}
    workingTarget(target){if(!target)throw new GitError('ローカルを選んでください。');const repo=this.repo(target.repo);if(repo.kind!=='local'||target.kind==='tracking')throw new GitError('ローカル本体、または作業中のローカルブランチを選んでください。');if(target.branch)this.ensureHead(this.ensureLocal(target));return repo;}
    validFile(file){if(typeof file!=='string'||!file.trim()||file.length>120||/[\r\n\0]/.test(file)||['__proto__','constructor','prototype'].includes(file))throw new GitError('有効なファイル名を120文字以内で入力してください。');return file.trim();}
    ref(target) {
      if(!target) throw new GitError('対象を選んでください。');
      const r=this.repo(target.repo), refs=target.kind==='tracking'?r.tracking:r.branches;
      if(!target.branch || !Object.hasOwn(refs||{},target.branch)) throw new GitError('ブランチを選んでください。');
      return {repo:r,id:refs[target.branch],branch:target.branch,kind:target.kind||'branch'};
    }
    ancestors(id) { const seen=new Set(), pending=[id]; while(pending.length){ const v=pending.pop(); if(v&&!seen.has(v)){seen.add(v); pending.push(...(this.state.commits[v]?.parents||[]));} } return seen; }
    isAncestor(a,b) { return this.ancestors(b).has(a); }
    difference(a,b) { const aa=this.ancestors(a),bb=this.ancestors(b); return {ahead:[...aa].filter(x=>!bb.has(x)).length,behind:[...bb].filter(x=>!aa.has(x)).length}; }
    mergeBase(a,b) { const aa=this.ancestors(a); return [...this.ancestors(b)].filter(x=>aa.has(x)).sort((x,y)=>this.state.commits[y].order-this.state.commits[x].order)[0]; }
    newCommit(parents,message,files,lane) { const order=this.state.counter++; const id=((order*2654435761)>>>0).toString(16).padStart(8,'0').slice(0,7); this.state.commits[id]={id,parents:[...parents],message,files:copy(files),lane,order}; return id; }
    validName(name) { if(!name || name.length>64 || name==='@' || name.startsWith('-') || /[\s~^:?*\[\\]/.test(name)||name.includes('..')||name.includes('@{')||name.startsWith('/')||name.endsWith('/')||name.includes('//')||name.split('/').some(p=>p.startsWith('.')||p.endsWith('.')||p.endsWith('.lock'))||['__proto__','constructor','prototype'].includes(name)) throw new GitError('ブランチ名は64文字以内で、空白や ~ ^ : ? * [ \\ を使わず指定してください。'); return name; }
    addLog(title,detail,command,type='success') { this.state.log.unshift({title,detail,command,type,time:new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}); this.state.log=this.state.log.slice(0,80); }
    mark(action) { if(!this.space.progress.includes(action)) this.space.progress.push(action); }
    ensureLocal(target) { const x=this.ref(target); if(x.repo.kind!=='local'||x.kind==='tracking') throw new GitError('手元のローカルブランチを選んでください。'); return x; }
    ensureHead(x) { if(x.repo.head!==x.branch) throw new GitError(`まず ${x.branch} にチェックアウトしてください。現在は ${x.repo.head} です。`); }
    assertRemotePair(remote,local) { if(remote.kind!=='remote'||local.kind!=='local'||local.remote!==remote.id) throw new GitError('このローカルの origin に接続されているリモートを選んでください。'); }
    fetch(source,target) {
      const remote=this.repo(source.repo),local=this.repo(target.repo); this.assertRemotePair(remote,local);
      const names=source.branch?[source.branch]:Object.keys(remote.branches);
      for(const name of names) { if(!Object.hasOwn(remote.branches,name)) throw new GitError('リモートブランチがありません。'); local.tracking['origin/'+name]=remote.branches[name]; }
      this.mark('fetch');
      return {title:'フェッチしました',detail:`${names.map(n=>'origin/'+n).join('、')} を更新しました。ローカルブランチと作業内容は変わりません。`,command:'git fetch origin'+(source.branch?' '+source.branch:'')};
    }
    merge(source,target,options={}) {
      const from=this.ref(source),to=this.ref(target);
      if(to.kind==='tracking'||(!options.remote&&to.repo.kind!=='local')) throw new GitError('統合先にはローカルブランチを選んでください。');
      if(!options.remote) { if(from.repo.id!==to.repo.id) throw new GitError('マージする前に、フェッチで同じローカルに履歴を取り込んでください。'); this.ensureHead(to);this.ensureClean(to.repo); }
      if(this.isAncestor(from.id,to.id)) return {title:'すでに取り込み済みです',detail:'統合先には、選んだブランチのすべてのコミットが含まれています。',command:`git merge ${from.branch}`};
      if(this.isAncestor(to.id,from.id)) { to.repo.branches[to.branch]=from.id;if(to.repo.kind==='local')this.resetWorkingState(to.repo);return {title:'マージしました · fast-forward',detail:`${to.branch} の参照を ${from.id} へ進めました。新しいマージコミットは作りません。`,command:`git merge ${from.branch}`}; }
      const base=this.mergeBase(from.id,to.id); if(!base) throw new GitError('共通の履歴がないため、マージできません。');
      const bf=this.state.commits[base].files, sf=this.state.commits[from.id].files, tf=this.state.commits[to.id].files;
      const files={},conflicts=[];
      for(const file of new Set([...Object.keys(bf),...Object.keys(sf),...Object.keys(tf)])) {
        if(sf[file]===tf[file]) files[file]=sf[file];
        else if(sf[file]===bf[file]) files[file]=tf[file];
        else if(tf[file]===bf[file]) files[file]=sf[file];
        else if(options.resolutions&&Object.hasOwn(options.resolutions,file)) { const choice=options.resolutions[file]; if(!['source','target'].includes(choice)) throw new GitError('競合の解決方法を選んでください。'); files[file]=choice==='source'?sf[file]:tf[file]; }
        else conflicts.push({file,source:sf[file],target:tf[file]});
      }
      if(conflicts.length) return {conflicts,from:from.branch,to:to.branch};
      for(const f of Object.keys(files)) if(files[f]===undefined) delete files[f];
      const id=this.newCommit([to.id,from.id],`Merge ${from.branch} into ${to.branch}`,files,to.branch); to.repo.branches[to.branch]=id;if(to.repo.kind==='local')this.resetWorkingState(to.repo);
      return {title:'マージコミットを作成しました',detail:`${to.branch} と ${from.branch} の履歴を、2つの親を持つ ${id} でつなぎました。`,command:`git merge ${from.branch}`};
    }
    push(source,target,{publish=false}={}) {
      const from=this.ensureLocal(source),remote=this.repo(target.repo); this.assertRemotePair(remote,from.repo);
      const branch=target.branch||from.branch; this.validName(branch); const old=remote.branches[branch];
      if(old&&!this.isAncestor(old,from.id)) throw new GitError('push を拒否しました（non-fast-forward）。リモートに未取得の変更があります。先にプルして履歴を統合してください。');
      remote.branches[branch]=from.id; from.repo.tracking['origin/'+branch]=from.id;
      if(publish) from.repo.upstreams[from.branch]=branch;
      this.mark(publish?'publish':'push');
      return {title:publish?'ブランチを公開しました':old===from.id?'すでに最新です':'プッシュしました',detail:`${from.branch} → origin/${branch}。${publish?'追跡先（upstream）も設定しました。':'ローカルの履歴をリモートへ送りました。'}`,command:`git push${publish?' -u':''} origin ${from.branch}${from.branch!==branch?':'+branch:''}`};
    }
    execute(action,source,target,options={}) {
      const required=this.requiredAction();if(required&&action!==required)throw new GitError(`開始手順では、まず ${required} を実行してください。`);
      let result;
      switch(action) {
        case 'edit': {
          const local=this.workingTarget(target),file=this.validFile(options.file);if(typeof options.content!=='string')throw new GitError('ファイルの内容を入力してください。');if(local.workingFiles[file]===options.content)throw new GitError('ファイルの内容が変わっていません。内容を編集してください。');
          local.workingFiles[file]=options.content;this.mark('edit');result={title:'ファイルを編集しました',detail:`${file} を作業フォルダに保存しました。ステージとコミットは変わりません。`,command:'# ファイルを編集: '+file};break;
        }
        case 'stage': {
          const local=this.workingTarget(target);if(!local.initialized)throw new GitError('まず git init でGit管理を始めてください。');const changes=this.workingStatus(local).unstaged,files=options.files===undefined?changes.map(c=>c.file):options.files;
          if(!Array.isArray(files)||!files.length)throw new GitError('ステージする変更を選んでください。');const unique=[...new Set(files)];for(const file of unique)if(typeof file!=='string'||!changes.some(c=>c.file===file))throw new GitError('作業フォルダで変更されたファイルを選んでください。');
          for(const file of unique){if(Object.hasOwn(local.workingFiles,file))local.index[file]=local.workingFiles[file];else delete local.index[file];}this.mark('stage');
          result={title:'変更をステージしました',detail:`${unique.join('、')} の今の内容を記録しました。ここから編集しても、再びステージするまでは次のコミット内容に入りません。`,command:'git add -- '+unique.map(file=>JSON.stringify(file)).join(' ')};break;
        }
        case 'init': {
          const local=this.repo(target.repo);if(local.kind!=='local'||local.initialized!==false)throw new GitError('Git未初期化のPCプロジェクトを選んでください。');
          local.initialized=true;this.mark('init');result={title:'Git管理を開始しました',detail:'git init でローカルリポジトリを初期化しました。ファイルはまだコミットされていません。',command:'git init -b main'};break;
        }
        case 'create-remote': {
          if(this.space.remote)throw new GitError('この作業場所にはリモートがすでにあります。');
          const name=(options.name||'hello-git').trim();if(!/^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,63}$/.test(name)||name.endsWith('.git'))throw new GitError('リポジトリ名には64文字以内の英数字・ハイフン・アンダースコア・ドットを使ってください。');
          const id='remote-'+(++this.state.repoCounter);this.state.repos[id]={id,kind:'remote',name:'you / '+name,branches:{},defaultBranch:'main',parent:null};this.space.remote=id;this.mark('create-remote');
          result={title:'空のGitHubリポジトリを作成しました',detail:'READMEなどを追加せず、空のリモートを用意しました。まだローカルとは接続されていません。',command:'# GitHub: New repository（空で作成）'};break;
        }
        case 'connect': {
          const remote=this.repo(source.repo),local=this.repo(target.repo);if(remote.kind!=='remote'||local.kind!=='local'||!local.initialized||local.remote||remote.id!==this.space.remote||local.id!==this.space.local)throw new GitError('この作業場所のリモートと、接続前のローカル本体を選んでください。');
          local.remote=remote.id;this.mark('connect');result={title:'originを設定しました',detail:'ローカルにリモートの接続先を登録しました。コミットはまだ送信されていません。',command:'git remote add origin https://github.com/'+remote.name.replaceAll(' / ','/')+'.git'};break;
        }
        case 'fetch': result=this.fetch(source,target); break;
        case 'push': result=this.push(source,target); break;
        case 'publish': result=this.push(source,target,{publish:true}); break;
        case 'pull': {
          const from=this.ref(source),to=this.ensureLocal(target); this.assertRemotePair(from.repo,to.repo); this.ensureHead(to);
          this.fetch(source,target); result=this.merge({repo:to.repo.id,kind:'tracking',branch:'origin/'+from.branch},target,options);
          if(result.conflicts) return result;
          result={...result,title:'プルしました',detail:'フェッチ → マージの順で実行。'+result.detail,command:`git pull --no-rebase origin ${from.branch}`}; this.mark('pull'); break;
        }
        case 'sync': {
          const from=this.ensureLocal(source),remote=this.ref(target); this.assertRemotePair(remote.repo,from.repo); this.ensureHead(from);
          this.fetch(target,source); const merged=this.merge({repo:from.repo.id,kind:'tracking',branch:'origin/'+remote.branch},source,options);
          if(merged.conflicts) return merged;
          this.push(source,target); result={title:'シンクしました',detail:'リモートの変更をプルしてから、ローカルの変更をプッシュしました。両方が同じコミットを指しています。',command:`git pull --no-rebase origin ${remote.branch} && git push origin ${from.branch}:${remote.branch}`}; this.mark('sync'); break;
        }
        case 'merge': result=this.merge(source,target,options); if(result.conflicts) return result; this.mark('merge'); break;
        case 'branch': {
          const from=this.ref(source); if(from.repo.kind!=='local') throw new GitError('ローカル内のブランチを起点にしてください。');
          const name=this.validName(options.name); if(Object.hasOwn(from.repo.branches,name)) throw new GitError('同じ名前のブランチがすでにあります。');
          const sameHead=from.id===from.repo.branches[from.repo.head];if(!sameHead){this.ensureClean(from.repo);from.repo.workingFiles=copy(this.state.commits[from.id].files);from.repo.index=copy(this.state.commits[from.id].files);}
          from.repo.branches[name]=from.id; from.repo.head=name;if(from.kind==='tracking'&&from.branch.startsWith('origin/'))from.repo.upstreams[name]=from.branch.slice(7);this.mark('branch'); result={title:'ブランチを作成しました',detail:`${from.branch} と同じ ${from.id} から ${name} を作り、チェックアウトしました。ブランチ作成だけではコミットは増えません。${from.kind==='tracking'?' リモート追跡参照を起点にしたため、upstream も設定しました。':''}`,command:`git switch -c ${name} ${from.branch}`}; break;
        }
        case 'checkout': { const to=this.ensureLocal(target);if(to.repo.head!==to.branch){this.ensureClean(to.repo);to.repo.head=to.branch;this.resetWorkingState(to.repo);}result={title:'チェックアウトしました',detail:`HEAD → ${to.branch}。作業フォルダとステージも、このブランチの内容になりました。`,command:`git switch ${to.branch}`}; break; }
        case 'commit': {
          const local=this.workingTarget(target);if(!local.initialized)throw new GitError('まず git init でGit管理を始めてください。');
          const staged=this.workingStatus(local).staged;if(!staged.length)throw new GitError('ステージされた変更がありません。ファイルを編集してから「ステージ」を実行してください。');
          const message=(options.message||'').trim();if(!message)throw new GitError('コミットメッセージを入力してください。');
          const parent=local.branches[local.head],branch=local.head||'main',id=this.newCommit(parent?[parent]:[],message,local.index,branch);local.branches[branch]=id;local.head=branch;local.index=copy(this.state.commits[id].files);this.mark('commit');
          const remaining=this.workingStatus(local).unstaged.length;
          result={title:parent?'コミットしました':'最初のコミットを作成しました',detail:`${branch} に「${message}」 (${id}) を追加。ステージ済みの ${staged.length} ファイルを記録しました。${remaining?' ステージ後の編集は、作業フォルダに残っています。':' 作業フォルダとステージはコミット内容と同じです。'}`,command:'git commit -m '+JSON.stringify(message)};break;
        }
        case 'remote-commit': {
          const to=this.ref(target);if(to.repo.kind!=='remote')throw new GitError('共同編集者が更新するリモートブランチを選んでください。');const message=(options.message||'').trim(),file=this.validFile(options.file);if(!message||typeof options.content!=='string')throw new GitError('メッセージとファイルの内容を入力してください。');
          const files={...this.state.commits[to.id].files,[file]:options.content};if(this.state.commits[to.id].files[file]===options.content)throw new GitError('ファイルの内容が変わっていません。');
          const id=this.newCommit([to.id],message,files,to.branch);to.repo.branches[to.branch]=id;result={title:'共同編集者がコミットしました',detail:`${to.branch} に「${message}」 (${id}) を追加。手元のファイルや origin の参照は更新されません。`,command:'# 共同編集者: '+to.branch+' にコミット'};break;
        }
        case 'delete': {
          const to=this.ref(target); if(to.kind==='tracking') throw new GitError('取得済みの参照ではなくブランチを選んでください。');
          if(to.repo.kind==='local'&&to.repo.head===to.branch) throw new GitError('作業中のブランチは削除できません。別のブランチにチェックアウトしてください。');
          if(to.repo.kind==='remote'&&to.repo.defaultBranch===to.branch) throw new GitError('このモデルではリモートのデフォルトブランチは削除できません。');
          if(to.repo.kind==='local'){const upstream=to.repo.upstreams[to.branch],into=upstream&&to.repo.tracking['origin/'+upstream]||to.repo.branches[to.repo.head];if(!this.isAncestor(to.id,into))throw new GitError(`${upstream?'追跡先（upstream）':'作業中のブランチ'}に未マージのコミットがあるため削除できません。先に取り込んでください。`);}
          delete to.repo.branches[to.branch]; if(to.repo.upstreams) delete to.repo.upstreams[to.branch];
          if(to.repo.kind==='remote') for(const r of Object.values(this.state.repos)) if(r.kind==='local'&&r.remote===to.repo.id) delete r.tracking['origin/'+to.branch];
          result={title:'ブランチを削除しました',detail:`${to.branch} の参照を削除しました。ほかのブランチが参照しているコミットは残ります。`,command:to.repo.kind==='local'?`git branch -d ${to.branch}`:`git push origin --delete ${to.branch}`}; break;
        }
        case 'clone': {
          const remote=this.repo(source.repo); if(remote.kind!=='remote') throw new GitError('リモートリポジトリを選んでください。');
          if(this.space.remote!==remote.id) throw new GitError('このワークスペースのリモートを選んでください。'); if(this.space.local) throw new GitError('このワークスペースにはローカルがあります。フォーク先や「空のローカル」練習で試してください。');
          const id='local-'+(++this.state.repoCounter),branch=source.branch||remote.defaultBranch;
          if(!Object.hasOwn(remote.branches,branch)) throw new GitError('クローン元のブランチがありません。');
          this.state.repos[id]={id,kind:'local',name:remote.name.split(' / ').pop(),branches:{[branch]:remote.branches[branch]},head:branch,defaultBranch:remote.defaultBranch,remote:remote.id,tracking:Object.fromEntries(Object.entries(remote.branches).map(([n,v])=>['origin/'+n,v])),upstreams:{[branch]:branch}};
          this.space.local=id; this.mark('clone'); result={title:'クローンしました',detail:`全ブランチのリモート追跡参照を取得し、${branch} を手元にチェックアウトしました。origin はこのリモートを指します。`,command:`git clone --branch ${branch} https://github.com/${remote.name.replaceAll(' / ','/')}.git`}; break;
        }
        case 'fork': {
          const remote=this.repo(source.repo); if(remote.kind!=='remote') throw new GitError('フォーク元のリモートを選んでください。');
          const name=(options.name||'my-work').trim(); if(!name||name.length>32||!/^[\p{L}\p{N}_-]+$/u.test(name)) throw new GitError('所有者名には32文字以内の文字・数字・_・- を使ってください。');
          const repoName=remote.name.split(' / ').pop(),fullName=name+' / '+repoName;
          if(Object.values(this.state.repos).some(r=>r.kind==='remote'&&r.name===fullName)) throw new GitError('同じ所有者のフォークがすでにあります。別の名前を指定してください。');
          const id='remote-'+(++this.state.repoCounter),sid='space-'+(++this.state.spaceCounter);
          this.state.repos[id]={id,kind:'remote',name:fullName,branches:copy(remote.branches),defaultBranch:remote.defaultBranch,parent:remote.id};
          this.state.spaces.push({id:sid,name:name+' / '+repoName,remote:id,local:null,fork:true,progress:[]});this.state.active=sid;
          result={title:'フォークして作業場所を切り替えました',detail:`${fullName} は独立したリモートです。元のリポジトリもタブに残っています。次にクローンして手元の作業場所を作りましょう。`,command:'# GitHub: Fork '+remote.name}; break;
        }
        case 'pr': {
          const from=this.ref(source),to=this.ref(target); if(from.repo.kind!=='remote'||to.repo.kind!=='remote') throw new GitError('PR の両端には公開済みのリモートブランチを選んでください。');
          if(from.repo.id===to.repo.id&&from.branch===to.branch) throw new GitError('同じブランチへの PR は作成できません。');
          const rootOf=r=>{let current=r;while(current.parent)current=this.repo(current.parent);return current.id;};
          if(rootOf(from.repo)!==rootOf(to.repo)) throw new GitError('同じフォークネットワークのリポジトリを選んでください。');
          if(!this.mergeBase(from.id,to.id)) throw new GitError('共通の履歴がありません。');
          if(!this.difference(from.id,to.id).ahead) throw new GitError('提案元に新しいコミットがありません。まずコミットしてプッシュしてください。');
          if(this.state.prs.some(p=>p.status==='open'&&p.source.repo===source.repo&&p.source.branch===source.branch&&p.target.repo===target.repo&&p.target.branch===target.branch)) throw new GitError('同じ組み合わせの PR がすでに開いています。');
          const title=(options.message||'').trim(); if(!title) throw new GitError('PR のタイトルを入力してください。');
          const pr={id:++this.state.prCounter,title,source:copy(source),target:copy(target),status:'open'};this.state.prs.push(pr);this.mark('pr');
          result={title:`プルリクエスト #${pr.id} を作成しました`,detail:'変更の取り込みを提案しました。この時点では統合先もローカルも変わりません。PRカードからマージできます。',command:`# GitHub: ${from.repo.name}:${from.branch} → ${to.repo.name}:${to.branch}`}; break;
        }
        case 'merge-pr': {
          const pr=this.state.prs.find(p=>p.id===options.id);if(!pr||pr.status!=='open') throw new GitError('開いている PR がありません。');
          result=this.merge(pr.source,pr.target,{...options,remote:true}); if(result.conflicts) return result;
          pr.status='merged';result={...result,title:`PR #${pr.id} をマージしました`,detail:result.detail+' ローカルへの反映にはフェッチ／プルが必要です。',command:`# GitHub: Merge pull request #${pr.id}`}; break;
        }
        default: throw new GitError('この操作はありません。');
      }
      this.addLog(result.title,result.detail,result.command); return result;
    }
    demo(empty=false) {
      const seed=this.initial(),sid='space-'+(++this.state.spaceCounter),rid='remote-'+(++this.state.repoCounter),lid='local-'+this.state.repoCounter;
      for(const [id,c] of Object.entries(seed.commits)) if(!this.state.commits[id]) this.state.commits[id]=copy(c);
      this.state.repos[rid]={...copy(seed.repos['remote-1']),id:rid,name:'practice-'+this.state.spaceCounter+' / hello-git'};
      if(!empty) this.state.repos[lid]={...copy(seed.repos['local-1']),id:lid,remote:rid};
      this.state.spaces.push({id:sid,name:empty?'クローンの練習':'練習 '+this.state.spaceCounter,remote:rid,local:empty?null:lid,fork:false,progress:[]});this.state.active=sid;
      this.addLog('練習用のワークスペースを追加しました','元の作業はタブに残っています。', '# 新しい練習');
    }
  }
  root.GitEngine=GitEngine;root.GitError=GitError;
  if(typeof module!=='undefined'&&module.exports) module.exports={GitEngine,GitError,copy};
})(typeof window!=='undefined'?window:globalThis);
