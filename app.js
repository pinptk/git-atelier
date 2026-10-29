/* Git Atelier: browser UI; works from file:// with no build step. */
(function () {
  'use strict';
  const $ = (s,root=document) => root.querySelector(s);
  const $$ = (s,root=document) => [...root.querySelectorAll(s)];
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = v => JSON.parse(JSON.stringify(v));
  const paths = {
    edit:'<path d="m15 4 5 5M4 20l5-1L21 7a3.5 3.5 0 0 0-5-5L4 14Z"/>',
    stage:'<path d="M4 4h16v16H4ZM8 12h8m-4-4v8"/>',
    branch:'<path d="M6 3v12a3 3 0 1 0 3 3M6 6a3 3 0 1 0 0 .01M18 3a3 3 0 1 0 0 .01M18 6v2a6 6 0 0 1-6 6H6"/>',
    cloud:'<path d="M7 18a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4.5 4.5 0 0 1-1 9Z"/>',
    monitor:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5"/>',
    push:'<path d="M12 17V4m-5 5 5-5 5 5M4 16v4h16v-4"/>',
    pull:'<path d="M12 3v13m-5-5 5 5 5-5M4 16v4h16v-4"/>',
    fetch:'<path d="M18 7h-3l-3 4-3-4H6M12 3v8M5 14l-2 7h18l-2-7h-5l-2 3-2-3Z"/>',
    sync:'<path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/>',
    merge:'<circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><path d="M6 6v12M18 6v3a6 6 0 0 1-6 6H6"/>',
    clone:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    fork:'<circle cx="6" cy="4" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="12" cy="20" r="2"/><path d="M6 6v2a6 6 0 0 0 6 6m6-8v2a6 6 0 0 1-6 6v4"/>',
    pr:'<circle cx="6" cy="4" r="2"/><circle cx="6" cy="20" r="2"/><circle cx="18" cy="20" r="2"/><path d="M6 6v12M18 18V9a5 5 0 0 0-5-5h-2m3-3-3 3 3 3"/>',
    commit:'<circle cx="12" cy="12" r="5"/><path d="M2 12h5m10 0h5"/>',
    publish:'<path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8"/>',
    delete:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    checkout:'<path d="M3 12h17m-6-6 6 6-6 6M4 5v14"/>',
    reset:'<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7"/>',
    undo:'<path d="m8 3-5 5 5 5M3 8h10a7 7 0 0 1 0 14"/>',
    redo:'<path d="m16 3 5 5-5 5m5-5H11a7 7 0 0 0 0 14"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2L12 12v2m0 3h.01"/>',
    spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 17l10 5 10-5"/>',
    terminal:'<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m6 8 4 4-4 4m7 0h5"/>',
    sliders:'<path d="M4 3v6m0 4v8M12 3v10m0 4v4M20 3v2m0 4v12M1 9h6m2 8h6m2-12h6"/>',
    bulb:'<path d="M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0l-1 2H9Z"/>',
    book:'<path d="M12 5c-4-3-8-2-10-1v15c4-2 7-1 10 1m0-15c4-3 8-2 10-1v15c-4-2-7-1-10 1Z"/>',
    cursor:'<path d="m4 3 16 10-8 1-3 7Z"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    link:'<path d="m9 15 6-6m-6-2 3-3a5 5 0 0 1 7 7l-3 3m-1 3-3 3a5 5 0 0 1-7-7l3-3"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    folder:'<path d="M3 6h6l2 2h10v12H3ZM3 6V3h7l2 3"/>',
    warning:'<path d="m12 3 10 18H2Zm0 6v5m0 3h.01"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.branch}</svg>`;
  const definitions = {
    edit:{label:'ファイルを編集',en:'edit',icon:'edit',target:'localWorktree',desc:'作業フォルダのファイルを編集して保存します。',hint:'保存しただけではステージ・コミットは変わりません。作業中（HEAD）のローカルを選びます。'},
    stage:{label:'ステージ',en:'add',icon:'stage',target:'localWorktree',desc:'次のコミットに含めるファイルを選び、今の内容をステージへ記録します。',hint:'ステージ後に編集した内容は、もう一度ステージするまでコミットには入りません。'},
    init:{label:'Git管理を開始',en:'init',icon:'folder',target:'localRepo',desc:'PCにあるプロジェクトを、Gitで管理しはじめます。',hint:'最初のコミットは、初期化が終わってから作ります。'},
    'create-remote':{label:'GitHubにリポジトリ作成',en:'new repository',icon:'cloud',target:'emptyRemote',desc:'GitHubに空のリポジトリを作成します。',hint:'ここではREADMEなどを追加せず、空の状態で作成します。',github:true},
    connect:{label:'originを設定',en:'remote add origin',icon:'link',source:'remoteRepo',target:'localRepo',desc:'GitHubのリポジトリを、手元のリポジトリの接続先として登録します。',hint:'URLを登録する操作です。コミットの送信は、次の「ブランチを公開」で行います。'},
    push:{label:'プッシュ',en:'push',icon:'push',source:'localBranch',target:'remoteAny',desc:'ローカルのコミットをリモートへ送ります。ローカルとリモートのブランチを画面上から選んでください。',hint:'リモート本体を選ぶと、同じ名前のブランチに送れます。'},
    pull:{label:'プル',en:'pull',icon:'pull',source:'remoteBranch',target:'localBranch',desc:'リモートから取得し、作業中のローカルブランチへ統合します。',hint:'このモデルのプルは fetch + merge。統合先はチェックアウト中のブランチです。'},
    fetch:{label:'フェッチ',en:'fetch',icon:'fetch',source:'remoteAny',target:'localAny',desc:'リモートの履歴を取得します。手元のブランチはそのまま、origin の参照だけが更新されます。',hint:'ローカル本体かブランチを、取得先としてクリックしてください。'},
    sync:{label:'シンク',en:'sync',icon:'sync',source:'localBranch',target:'remoteBranch',desc:'プル → プッシュを続けて実行し、ローカルとリモートの履歴をそろえます。',hint:'sync はGUIで使われる操作名です。このモデルでは pull + push として扱います。'},
    merge:{label:'マージ',en:'merge',icon:'merge',source:'localRef',target:'localBranch',desc:'選んだ履歴を、作業中のブランチに取り込みます。',hint:'変更を取り込むブランチは、先にチェックアウトしてください。'},
    commit:{label:'コミット',en:'commit',icon:'commit',target:'localWorktree',desc:'ステージ済みの内容を、メッセージと一緒にコミットします。',hint:'この操作ではファイルを編集しません。ステージした内容だけが記録されます。'},
    'remote-commit':{label:'共同編集者が更新',en:'remote commit',icon:'cloud',target:'remoteBranch',desc:'別の人がリモートへコミットした状況を再現します。',hint:'手元のファイルは変わりません。反映するにはフェッチやプルを使います。'},
    branch:{label:'ブランチを作成',en:'switch -c',icon:'branch',source:'localRef',desc:'既存の履歴から新しいブランチを作り、チェックアウトします。',hint:'ブランチはコミットへの参照。新しいコミットはまだ増えません。'},
    checkout:{label:'チェックアウト',en:'switch',icon:'checkout',target:'localBranch',desc:'作業するローカルブランチを切り替えます。',hint:'選択とチェックアウトは別の操作です。HEAD が作業中のブランチを表します。'},
    publish:{label:'ブランチを公開',en:'push -u',icon:'publish',source:'localBranch',target:'remoteRepo',desc:'ローカルブランチをリモートへ送り、追跡先（upstream）も設定します。',hint:'リモートリポジトリ本体を選びます。同じ名前で公開します。'},
    delete:{label:'ブランチを削除',en:'branch -d / push --delete',icon:'delete',target:'anyBranch',desc:'選んだブランチの参照を削除します。実行前に対象を確認してください。',hint:'ローカルとリモートは別のブランチです。作業中・未マージのローカルブランチは削除できません。'},
    clone:{label:'クローン',en:'clone',icon:'clone',source:'remoteAny',target:'empty',desc:'リモートを手元へ複製し、ローカルリポジトリを作ります。',hint:'空のローカルが必要です。フォーク先、または使い方の「クローンの練習」で試せます。'},
    fork:{label:'フォーク',en:'fork',icon:'fork',source:'remoteRepo',desc:'別の所有者のリモートを作り、新しいワークスペースタブへ切り替えます。',hint:'フォークはGitHubの機能。ローカルは作られないので、続けてクローンします。',github:true},
    pr:{label:'プルリクエスト',en:'pull request',icon:'pr',source:'remoteBranch',target:'remoteBranch',desc:'公開済みのブランチから、変更の取り込みを提案します。作成だけではマージされません。',hint:'提案元はプッシュ済みのリモートブランチ、取り込み先は main などのリモートブランチです。',github:true}
  };
  const storageKey='git-atelier-state-v1';
  const executeLabels={
    edit:'編集を保存',stage:'ステージする',commit:'コミットする',
    init:'Git管理を開始する','create-remote':'リポジトリを作成する',connect:'originを設定する',
    push:'プッシュする',pull:'プルする',fetch:'フェッチする',sync:'シンクする',merge:'マージする',
    branch:'ブランチを作成する',checkout:'チェックアウトする',publish:'ブランチを公開する',delete:'ブランチを削除する',
    clone:'クローンする',fork:'フォークを作成',pr:'プルリクエストを作成','remote-commit':'リモートにコミット'
  };
  let engine, storageOK=true, loadFailed=false;
  try { const saved=localStorage.getItem(storageKey); engine=new GitEngine(saved?JSON.parse(saved):undefined);if(!saved)engine.state.entryPending=true; }
  catch { engine=new GitEngine();engine.state.entryPending=true;loadFailed=true; }
  const undo=[],redo=[];
  function defaultSelection(){const id=engine.space.local||engine.space.remote,r=engine.repo(id);return r.head&&r.branches[r.head]?{repo:id,kind:'branch',branch:r.head}:{repo:id,kind:'repo'};}
  let selected=defaultSelection(),startChoiceRequired=false;
  let op=null, lastFocus=null, toastTimer=null, flowTimer=null;
  const panel=$('#operation-panel');
  const mobile=window.matchMedia('(max-width: 760px)');
  function fitToolbox(){
    if(mobile.matches)return;
    const topGap=Math.max(0,$('.workspace-bar').getBoundingClientRect().bottom);
    $('#toolbox').style.setProperty('--toolbox-top-gap',`${topGap}px`);
  }
  function toolbox(open,focus=true){
    if(open&&!mobile.matches)return;
    document.body.classList.toggle('mobile-tools-open',open);$('#mobile-tool-backdrop').hidden=!open;$('#mobile-tools').setAttribute('aria-expanded',String(open));
    for(const el of $$('.workspace-bar,.main-column,.mobile-dock'))el.inert=open;
    const aside=$('#toolbox');
    if(open){aside.setAttribute('role','dialog');aside.setAttribute('aria-modal','true');aside.setAttribute('aria-labelledby','toolbox-title');if(focus)$('#mobile-tool-close').focus({preventScroll:true});}
    else{aside.removeAttribute('role');aside.removeAttribute('aria-modal');aside.removeAttribute('aria-labelledby');if(focus&&mobile.matches)$('#mobile-tools').focus({preventScroll:true});}
  }
  function scrollToRepo(kind){const card=$('.repo-card.'+kind);if(card&&mobile.matches)card.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function revealPickTarget(){if(!op||!mobile.matches||!op.picking)return;const type=definitions[op.action][op.active];if(type?.startsWith('remote')||type==='emptyRemote')scrollToRepo('remote');else if(type?.startsWith('local')||type==='empty')scrollToRepo('local');}
  const needsInput=action=>['edit','stage','commit','remote-commit','branch','fork','pr','create-remote'].includes(action);
  function persist() {
    try {localStorage.setItem(storageKey,JSON.stringify(engine.state));storageOK=true;} catch {storageOK=false;}
    $('#save-status').innerHTML=`<i></i> ${storageOK?'このブラウザに自動保存':'保存できないため、この画面内で保持中'}`;
  }
  function snapshot(){return clone(engine.state);}
  function remember(before){undo.push(before);if(undo.length>35)undo.shift();redo.length=0;}
  function toast(message,error=false){clearTimeout(toastTimer);const el=$('#toast');el.innerHTML=icon(error?'warning':'check')+`<span>${esc(message)}</span>`;el.classList.toggle('error',error);el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,4200);}
  function key(t){return t?[t.repo,t.kind||'branch',t.branch||''].join('|'):'';}
  function same(a,b){return key(a)===key(b);}
  function targetLabel(t){if(!t)return '';if(t.kind==='empty')return '空のローカル';if(t.kind==='emptyRemote')return 'GitHub上の新しいリポジトリ';const r=engine.state.repos[t.repo];return r?(r.kind==='local'?'ローカル':r.name)+(t.branch?' / '+t.branch:'（本体）'):'対象がありません';}
  function refExists(t){if(!t)return false;if(t.kind==='empty')return !engine.space.local&&t.repo==='empty:'+engine.space.id;if(t.kind==='emptyRemote')return !engine.space.remote&&t.repo==='empty-remote:'+engine.space.id;const r=engine.state.repos[t.repo];return !!r&&(!t.branch||Object.hasOwn(t.kind==='tracking'?r.tracking||{}:r.branches,t.branch));}
  function matches(type,t){
    if(!t)return false;if(type==='empty')return t.kind==='empty';if(type==='emptyRemote')return t.kind==='emptyRemote';const r=engine.state.repos[t.repo];if(!r)return false;
    const real=!!t.branch&&t.kind!=='tracking',local=r.kind==='local',remote=r.kind==='remote';
    return ({localBranch:local&&real,remoteBranch:remote&&real,anyBranch:real,localWorktree:local&&(!t.branch||real),localRef:local&&!!t.branch,localAny:local,localRepo:local&&!t.branch,remoteAny:remote,remoteRepo:remote&&!t.branch})[type]||false;
  }
  function targetAttributes(t){let cls=same(t,selected)?' selected':'';
    if(op){const def=definitions[op.action];if(matches(def[op.active],t))cls+=' pickable';if(same(op.source,t))cls+=' pick-source';if(same(op.target,t))cls+=' pick-target';}
    return {attrs:`data-ref="${esc(JSON.stringify(t))}"`,cls};
  }
  function renderTabs(){
    $('#workspace-tabs').innerHTML=engine.state.spaces.map(s=>`<button class="workspace-tab" role="tab" aria-selected="${s.id===engine.state.active}" tabindex="${s.id===engine.state.active?0:-1}" data-space="${esc(s.id)}" aria-label="${esc(s.name)}${s.fork?'、フォーク':''}">${icon(s.fork?'fork':'folder')}<span>${esc(s.name)}</span>${s.fork?'<span class="fork-tag">FORK</span>':''}</button>`).join('');
    $('#workspace-label').textContent=engine.repo(engine.space.remote||engine.space.local).name;
  }
  function chip(r,name,id,tracking=false){const t={repo:r.id,kind:tracking?'tracking':'branch',branch:name},a=targetAttributes(t),feature=name.replace('origin/','')!=='main';const head=!tracking&&r.head===name;
    return `<button class="branch-chip${feature?' feature':''}${tracking?' tracking':''}${a.cls}" ${a.attrs} title="${esc(name)} · ${esc(id)}${head?' · 作業中':''}" aria-label="${esc(name)}${head?' HEAD':''}" aria-pressed="${same(t,selected)}">${icon(tracking?'link':'branch')}<span class="branch-name">${esc(name)}</span>${head?'<span class="head-pill">HEAD</span>':''}${!tracking&&r.kind==='local'&&!r.upstreams[name]?'<span class="unpublished" title="upstream 未設定"></span>':''}</button>`;
  }
  function graph(r){
    if(!Object.keys(r.branches).length&&!Object.keys(r.tracking||{}).length)return `<div class="graph-empty">${icon('commit')}<strong>まだコミットはありません</strong><span>${r.kind==='remote'?'公開すると、ここに履歴が届きます。':r.initialized===false?'まずはGit管理を始めましょう。':'最初のコミットを作りましょう。'}</span></div>`;
    const refs=[...Object.entries(r.branches).map(([name,id])=>({name,id,tracking:false})),...Object.entries(r.tracking||{}).map(([name,id])=>({name,id,tracking:true}))];
    const reachable=new Set();refs.forEach(ref=>engine.ancestors(ref.id).forEach(id=>reachable.add(id)));
    const commits=[...reachable].map(id=>engine.state.commits[id]).sort((a,b)=>a.order-b.order);
    const levels={},lanes={};let nextLane=1;
    let primary=r.branches.main||r.branches[r.defaultBranch]||r.branches[r.head]||refs[0]?.id;
    const trackedMain=r.tracking?.['origin/main'];if(trackedMain&&engine.isAncestor(primary,trackedMain))primary=trackedMain;
    const primaryPath=new Set();let p=primary;while(p){primaryPath.add(p);p=engine.state.commits[p].parents[0];}
    commits.forEach(c=>{levels[c.id]=c.parents.length?Math.max(...c.parents.map(p=>levels[p]??0))+1:0;if(primaryPath.has(c.id)){lanes[c.id]=0;}else{const prev=c.parents.find(p=>!primaryPath.has(p));lanes[c.id]=prev!==undefined?lanes[prev]:nextLane++;}});
    const maxLevel=Math.max(0,...Object.values(levels)),maxLane=Math.max(0,...Object.values(lanes)),width=Math.max(340,100+maxLevel*91),height=Math.max(221,110+maxLane*85);
    const pos=id=>({x:45+levels[id]*91,y:68+lanes[id]*85});
    let svg=`<svg class="commit-graph" viewBox="0 0 ${width} ${height}" style="min-width:${width}px;height:${height}px" role="img" aria-label="${r.kind==='remote'?'リモート':'ローカル'}のコミット履歴。左が過去、右が新しいコミット。丸を押すと内容を表示します。"><title>コミットのつながり</title>`;
    commits.forEach(c=>{const end=pos(c.id);c.parents.forEach(parent=>{if(!reachable.has(parent))return;const start=pos(parent),feature=c.lane!=='main'||engine.state.commits[parent].lane!=='main';svg+=`<path class="graph-edge ${feature?'feature':'main'}" d="M ${start.x} ${start.y} C ${start.x+40} ${start.y} ${end.x-40} ${end.y} ${end.x} ${end.y}"/>`;});});
    commits.forEach(c=>{const {x,y}=pos(c.id),names=refs.filter(r=>r.id===c.id),feature=c.lane!=='main';svg+=`<g class="commit-node ${feature?'feature':'main'}" tabindex="0" role="button" data-commit="${esc(c.id)}" aria-label="コミット ${esc(c.id)}: ${esc(c.message)}"><title>${esc(c.message)} (${esc(c.id)})</title>${names.length?`<circle class="node-halo" cx="${x}" cy="${y}" r="14"/>`:''}<circle cx="${x}" cy="${y}" r="6"/><text class="commit-id" x="${x}" y="${y+24}" text-anchor="middle">${c.id.slice(0,7)}</text><text class="commit-message" x="${x}" y="${y+39}" text-anchor="middle">${esc(c.message.length>10?c.message.slice(0,9)+'…':c.message)}</text>${names.length?`<text class="node-tip ${feature?'feature':''}" x="${x}" y="${y-24}" text-anchor="middle">${esc(names.map(n=>n.name).join(' · '))}</text>`:''}</g>`;});
    svg+='</svg>';return svg;
  }
  function prsFor(r){const list=engine.state.prs.filter(p=>p.target.repo===r.id);if(!list.length)return '';return `<div class="pr-section"><div class="pr-heading">${icon('pr')} PULL REQUESTS</div>${list.slice().reverse().map(p=>`<div class="pr-card"><div class="pr-card-title ${p.status==='merged'?'merged':''}">${icon(p.status==='merged'?'merge':'pr')}<strong>#${p.id} ${esc(p.title)}</strong></div><p>${esc(engine.repo(p.source.repo).name)}:${esc(p.source.branch)} → ${esc(p.target.branch)}</p>${p.status==='open'?`<button class="secondary-button" data-merge-pr="${p.id}">${icon('merge')}確認してマージ</button>`:'<p>マージ済み · ローカルへの反映はプルで</p>'}</div>`).join('')}</div>`;}
  function workingPanel(repo){
    const status=engine.workingStatus(repo),required=engine.requiredAction(),labels={added:'新規',modified:'変更',deleted:'削除'};
    const rows=changes=>changes.length?changes.map(c=>`<div class="working-file"><code>${esc(c.file)}</code><span class="file-change-kind">${labels[c.kind]}</span></div>`).join(''):'<p class="files-clean">変更はありません</p>';
    return `<div class="file-workflow"><div class="file-flow-title"><span>${icon('edit')}編集</span><i>→</i><span>${icon('stage')}ステージ</span><i>→</i><span>${icon('commit')}コミット</span></div><div class="file-zones"><section class="file-zone working"><div class="file-zone-heading"><strong>作業フォルダ</strong><span>${status.unstaged.length} 件</span></div><div class="file-status-list" data-working-changes>${rows(status.unstaged)}</div><button class="text-button" data-open="edit" data-working-repo="${esc(repo.id)}" ${required&&required!=='edit'?'disabled':''}>${icon('edit')}ファイルを編集</button></section><section class="file-zone staged"><div class="file-zone-heading"><strong>ステージ済み</strong><span>${status.staged.length} 件</span></div><div class="file-status-list" data-staged-changes>${rows(status.staged)}</div><button class="text-button" data-open="stage" data-working-repo="${esc(repo.id)}" ${!status.unstaged.length||(required&&required!=='stage')?'disabled':''}>${icon('stage')}ステージする</button></section></div><p class="file-workflow-note">${Object.keys(repo.workingFiles).length} ファイル · ステージには、追加した時点の内容を記録します。</p></div>`;
  }
  function repoCard(id,kind){
    if(!id){const remote=kind==='remote',t={repo:(remote?'empty-remote:':'empty:')+engine.space.id,kind:remote?'emptyRemote':'empty'},a=targetAttributes(t),action=remote?'create-remote':'clone',blocked=engine.requiredAction()&&engine.requiredAction()!==action;
      return `<article class="repo-card ${kind} empty ${a.cls}" aria-label="${remote?'未作成のリモート':'空のローカル'}"><button class="repo-top${a.cls}" ${a.attrs}><span class="repo-icon">${icon(remote?'cloud':'monitor')}</span><span class="repo-title-group"><span class="repo-eyebrow">${remote?'REMOTE':'LOCAL'} REPOSITORY</span><span class="repo-title">${remote?'リモート':'ローカル'}</span></span><span class="repo-badge">${remote?'not created':'empty'}</span></button><div class="repo-empty">${icon(remote?'cloud':'clone')}<strong>${remote?'GitHubには、まだありません。':'まだ、手元にはありません。'}</strong><p>${remote?'PCの最初のコミットを作ったら、GitHubにリポジトリを作成します。':'クローンすると、ここにブランチとコミットの履歴が現れます。'}</p><button class="secondary-button" data-open="${action}" ${blocked?'disabled':''}>${icon(remote?'cloud':'clone')}${remote?'空のリポジトリを作成':'クローンしてはじめる'}</button></div></article>`;
    }
    const r=engine.repo(id),remote=kind==='remote',t={repo:id,kind:'repo'},a=targetAttributes(t),branchNames=Object.keys(r.branches);
    let status=remote?'GitHub 上のリポジトリ':'このPCの作業場所',statusRight=remote?(engine.space.local&&engine.repo(engine.space.local).remote===id?'origin':'接続前'):r.head?`HEAD → ${r.head}`:'コミットなし';
    if(!remote){const upstream=r.upstreams[r.head],tracking=upstream&&r.tracking['origin/'+upstream];if(tracking){const d=engine.difference(r.branches[r.head],tracking);status=`取得済みの origin/${upstream} 比: ↑${d.ahead} ↓${d.behind}`;}else status='未公開のブランチ · upstream 未設定';}
    if(!remote&&r.initialized===false){status='ファイルはあります · Git管理はまだです';statusRight='git init が必要';}
    else if(!remote&&!branchNames.length)status='Git初期化済み · 最初のコミットを待っています';
    else if(!remote&&!r.remote)status='ローカルのみ · origin未設定';
    const projectFiles=!remote?workingPanel(r):'';
    return `<article class="repo-card ${kind}${same(t,selected)?' selected-repo':''}" aria-label="${remote?'リモート':'ローカル'}リポジトリ"><button class="repo-top${a.cls}" ${a.attrs}><span class="repo-icon">${icon(remote?'cloud':'monitor')}</span><span class="repo-title-group"><span class="repo-eyebrow">${remote?'REMOTE REPOSITORY':'LOCAL REPOSITORY'}</span><span class="repo-title">${remote?'リモート':r.initialized===false?'PCのプロジェクト':'ローカル'} <span style="font-size:11px;font-weight:400;color:#98a38f">${remote&&engine.space.local&&engine.repo(engine.space.local).remote===id?' / origin':''}</span></span></span><span class="repo-badge">${remote?'GitHub':r.initialized===false?'Git未初期化':'your computer'}</span></button><div class="repo-url">${icon(remote?'link':'folder')}${esc(remote?'github.com/'+r.name.replaceAll(' / ','/'):'~/projects/'+r.name)}</div>${r.parent?`<div class="fork-parent">${icon('fork')}Forked from ${esc(engine.repo(r.parent).name)}</div>`:''}${projectFiles}<div class="branches-section"><div class="branches-heading">BRANCHES <span>${branchNames.length} ${branchNames.length===1?'branch':'branches'}</span></div><div class="branch-list">${branchNames.map(n=>chip(r,n,r.branches[n])).join('')||'<span class="empty-hint">最初のコミット後に main が現れます</span>'}</div>${!remote&&r.remote?`<div class="tracking-label">${icon('fetch')}リモート追跡参照 · 最後に取得した状態</div><div class="branch-list">${Object.entries(r.tracking).map(([n,id])=>chip(r,n,id,true)).join('')||'<span class="empty-hint">まだ取得していません</span>'}</div>`:''}</div><div class="graph-heading"><span>COMMIT HISTORY</span><span>丸を押すと、内容を表示</span></div><div class="commit-graph-wrap">${graph(r)}</div><div class="graph-timeline"><span>← 過去</span><span>新しいコミット →</span></div><div class="repo-bottom"><span>${icon(remote?'cloud':'branch')}${esc(status)}</span><span class="mono">${esc(statusRight)}</span></div>${remote?prsFor(r):''}</article>`;
  }
  function renderRepos(){const scrolls=$$('.commit-graph-wrap').map(e=>e.scrollLeft);$('#repositories').innerHTML=repoCard(engine.space.remote,'remote')+repoCard(engine.space.local,'local');$$('.commit-graph-wrap').forEach((e,i)=>e.scrollLeft=scrolls[i]||0);}
  function renderGuide(){
    const localStart=engine.space.startKind==='local',githubStart=engine.space.startKind==='github',required=engine.requiredAction();
    const steps=localStart?[['init','Git初期化'],['edit','編集'],['stage','ステージ'],['commit','初回コミット'],['create-remote','GitHub作成'],['connect','origin設定'],['publish','公開']]:githubStart?[['clone','取得'],['edit','編集'],['stage','ステージ'],['commit','コミット']]:[['fetch','フェッチで取得'],['checkout','main に切替'],['pull','プルで統合']];
    $('#guide-title').textContent=required?'次の操作：'+definitions[required].label:localStart||githubStart?'初期設定完了':'取得・切替・統合の手順';
    $('#guide-description').textContent=localStart?'ローカル作成からGitHub公開まで':githubStart?'GitHubから取得して編集・コミット':'フェッチ・チェックアウト・プル';
    $('#guide-steps').innerHTML=steps.map(([action,label],i)=>{const done=action==='checkout'?engine.space.local&&engine.repo(engine.space.local).head==='main':engine.space.progress.includes(action);return `${i?'<span class="guide-arrow">→</span>':''}<button class="guide-step ${done?'done':''}${required===action?' current':''}" data-guide="${action}" title="${esc(label)}" ${(required&&required!==action)||((localStart||githubStart)&&done)?'disabled':''}><span class="number">${done?'✓':i+1}</span><span>${esc(label)}</span></button>`;}).join('');
  }
  function setGuideVisible(visible){
    $('#tutorial-guide').hidden=!visible;
    $('#guide-show').hidden=visible;
    $(visible?'#guide-hide':'#guide-show').focus({preventScroll:true});
  }
  function renderSelection(){const el=$('#selection-bar');if(!refExists(selected))selected=null;el.innerHTML=icon('cursor')+(selected?`<span>選択中：<strong>${esc(targetLabel(selected))}</strong></span>${selected.branch?`<span class="selection-detail">${esc(engine.ref(selected).id)}</span>`:''}${selected.branch&&selected.kind!=='tracking'&&engine.repo(selected.repo).kind==='local'&&engine.repo(selected.repo).head!==selected.branch?'<button class="text-button" data-open="checkout">このブランチに切り替える →</button>':''}`:'<span>リポジトリ本体やブランチをクリックして、操作する場所を選べます。</span>');}
  function renderLog(){$('#log-count').textContent=engine.state.log.length;$('#activity-log').innerHTML=engine.state.log.map(l=>`<div class="log-entry ${esc(l.type)}"><span class="log-time">${esc(l.time)}</span><span class="log-dot"></span><div><div class="log-title">${esc(l.title)}</div><p class="log-detail">${esc(l.detail)}</p><div class="log-command">${esc(l.command)}</div></div></div>`).join('');$('#undo-button').disabled=!undo.length;$('#redo-button').disabled=!redo.length;}
  function renderButtons(){const required=engine.requiredAction(),groups=[...(required&&engine.space.startKind==='local'?[['プロジェクトの準備',['init','create-remote','connect']]]:[]),['ファイルとコミット',['edit','stage','commit']],['リモートとつなぐ',['push','pull','fetch','sync']],['ブランチと履歴',['merge','branch','checkout','publish','delete']],['リポジトリを広げる',['clone','fork','pr','remote-commit']]];$('#operation-buttons').innerHTML=groups.map(([label,actions])=>`<div class="operation-group-label">${label}</div>${actions.map(a=>{const d=definitions[a];return `<button class="operation-button ${a}${op?.action===a?' active':''}${['branch','checkout','publish','delete'].includes(a)?' compact':''}" data-open="${a}" aria-pressed="${op?.action===a}" ${required&&required!==a?'disabled':''}><span class="op-icon">${icon(d.icon)}</span><span><span class="operation-label">${d.label}</span><span class="operation-english">${d.en}</span></span><span class="op-arrow">↗</span>${d.github?'<span class="github-badge">GitHub</span>':''}</button>`;}).join('')}`).join('');}
  function render(){renderTabs();renderButtons();renderGuide();renderRepos();renderSelection();renderLog();persist();if(op)renderPanel();}
  function populateFiles(){if(!op?.target)return;try{const repo=engine.repo(op.target.repo);if(op.action==='stage')op.values.files=engine.workingStatus(repo).unstaged.map(c=>c.file);else if(op.action==='commit'){if(!repo.head)op.values.message='最初のコミット';}else if(['edit','remote-commit'].includes(op.action)){const files=op.action==='edit'?repo.workingFiles:engine.state.commits[engine.ref(op.target).id].files;op.values.file=Object.hasOwn(files,'README.md')?'README.md':Object.keys(files)[0]||'README.md';op.values.content=files[op.values.file]||'';}}catch{/* Selection can be incomplete. */}}
  function openOperation(action){if(!definitions[action])return;const required=engine.requiredAction();if(required&&required!==action){toast('まず「'+definitions[required].label+'」を実行しましょう。',true);return;}toolbox(false,false);const d=definitions[action];op={action,source:null,target:null,active:d.source?'source':'target',values:{name:action==='fork'?'my-work':action==='branch'?'feature/new-idea':action==='create-remote'?'hello-git':'',message:action==='pr'?'デザインの改善':action==='commit'?'ページを更新':'',file:'README.md',content:''},error:''};
    if(action==='remote-commit')op.values.message='共同編集者の更新';else if(action==='commit')op.values.message='変更を記録';
    if(refExists(selected)){if(d.source&&matches(d.source,selected))op.source=clone(selected);else if(d.target&&matches(d.target,selected))op.target=clone(selected);}
    op.active=d.source&&!op.source?'source':d.target&&!op.target?'target':d.source?'source':'target';populateFiles();op.picking=mobile.matches&&(!targetsReady()||!needsInput(action));document.body.classList.add('has-operation');renderButtons();renderRepos();renderPanel();panel.hidden=false;$('#operation-title').focus({preventScroll:true});revealPickTarget();
  }
  function closeOperation(){op=null;panel.hidden=true;panel.innerHTML='';document.body.classList.remove('has-operation');renderButtons();renderRepos();}
  function field(name,label,placeholder,value,tag='input',type='text'){return `<label class="op-form-field">${label}${tag==='textarea'?`<textarea data-input="${name}" placeholder="${esc(placeholder)}" rows="3">${esc(value)}</textarea>`:`<input data-input="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="${name==='name'?'64':'160'}" autocomplete="off">`}</label>`;}
  function fillSampleEdit(){
    if(op?.action!=='edit'||!op.target)return;
    const input=$('[data-input="content"]',panel);if(!input)return;
    const notes=['使い方の説明を追記しました。','確認用の項目を追加しました。','作業メモを更新しました。','表示するメッセージを変更しました。'];
    const note=notes[Math.floor(Math.random()*notes.length)];
    input.value+=(input.value&&!input.value.endsWith('\n')?'\n':'')+note+'\n';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.scrollTop=input.scrollHeight;
  }
  function pickPrompt(type){return {localBranch:'ローカルのブランチを選択',remoteBranch:'リモートのブランチを選択',anyBranch:'ブランチを選択',localWorktree:'ローカルを選択',localRef:'ローカルのブランチや取得済みの参照を選択',localAny:'ローカルを選択',localRepo:'ローカルのリポジトリを選択',remoteAny:'リモートを選択',remoteRepo:'リモートのリポジトリを選択',empty:'空のローカルを選択',emptyRemote:'未作成のリモートを選択'}[type];}
  function fieldPick(slot){const chosen=op[slot];return `<button class="pick-field ${slot} ${op.active===slot?'current':''}" data-slot="${slot}" aria-pressed="${op.active===slot}"><span class="field-info"><span class="${chosen?'field-value':'field-placeholder'}">${chosen?esc(targetLabel(chosen)):pickPrompt(definitions[op.action][slot])}</span></span>${chosen?'<span class="field-check">✓</span>':''}</button>`;}
  function targetsReady(){const d=definitions[op.action];return(!d.source||!!op.source)&&(!d.target||!!op.target);}
  function canExecute(){if(!targetsReady())return false;if(op.action==='stage')return !!op.values.files?.length;if(op.action==='commit')return !!engine.workingStatus(op.target.repo).staged.length;return true;}
  function commandPreview(){if(!op)return '';const a=op.action,s=op.source?.branch||'<from>',t=op.target?.branch||'<to>',n=op.values.name||'<name>';return ({edit:'# ファイルを編集: '+op.values.file,stage:'git add -- '+(op.values.files||[]).map(file=>JSON.stringify(file)).join(' '),commit:'git commit -m '+JSON.stringify(op.values.message),'remote-commit':'# 共同編集者: '+t+' にコミット',init:'git init -b main','create-remote':'# GitHub: '+n+' を空で作成',connect:'git remote add origin '+(op.source?'https://github.com/'+engine.repo(op.source.repo).name.replaceAll(' / ','/')+'.git':'<GitHub URL>'),push:`git push origin ${s}${op.target?.branch&&t!==s?':'+t:''}`,pull:`git switch ${t}\ngit pull --no-rebase origin ${s}`,fetch:`git fetch origin${op.source?.branch?' '+s:''}`,sync:`git pull --no-rebase origin ${t}\ngit push origin ${s}:${t}`,merge:`git switch ${t}\ngit merge ${s}`,publish:`git push -u origin ${s}`,branch:`git switch -c ${n} ${s}`,checkout:`git switch ${t}`,delete:op.target&&engine.state.repos[op.target.repo]?.kind==='remote'?`git push origin --delete ${t}`:`git branch -d ${t}`,clone:'git clone <origin-url>',fork:'# GitHub 上でフォークを作成',pr:'# GitHub 上で Pull Request を作成'})[a];}
  function renderPanel(){
    if(!op)return;const d=definitions[op.action];panel.classList.toggle('mobile-picking',!!op.picking);let fields='';if(['branch','fork','create-remote'].includes(op.action))fields+=field('name',op.action==='fork'?'新しいリモートの所有者名':op.action==='create-remote'?'新しいリポジトリ名':'新しいブランチ名',op.action==='fork'?'my-work':op.action==='create-remote'?'hello-git':'feature/new-idea',op.values.name);
    if(['commit','remote-commit','pr'].includes(op.action))fields+=field('message',op.action==='pr'?'PR タイトル':'コミットメッセージ','変更の内容',op.values.message);
    if(['edit','remote-commit'].includes(op.action)){
      let names=[];try{const r=engine.repo(op.target.repo);names=Object.keys(op.action==='edit'?r.workingFiles:engine.state.commits[engine.ref(op.target).id].files);}catch{/* No target selected yet. */}
      fields+=field('file','ファイル名（新規ファイルも作れます）','README.md',op.values.file).replace('<input','<input list="editor-file-names"')+`<datalist id="editor-file-names">${names.map(name=>`<option value="${esc(name)}"></option>`).join('')}</datalist>`+field('content','ファイルの内容','新しい内容を入力',op.values.content,'textarea');
      if(op.action==='edit')fields+=`<div class="editor-actions"><button class="secondary-button quick-edit-button" id="random-edit-button" ${op.target?'':'disabled'}>${icon('spark')}適当に編集する</button></div>`;
    }
    if(op.action==='stage'&&op.target){const changes=engine.workingStatus(op.target.repo).unstaged;fields+=`<div class="stage-options"><div class="stage-options-heading">ステージするファイル</div>${changes.length?changes.map(c=>`<label class="stage-file-option"><input type="checkbox" data-stage-file value="${esc(c.file)}" ${(op.values.files||[]).includes(c.file)?'checked':''}><code>${esc(c.file)}</code><span>${c.kind==='added'?'新規':c.kind==='deleted'?'削除':'変更'}</span></label>`).join(''):'<p class="staging-empty">未ステージの変更がありません。先にファイルを編集してください。</p>'}</div>`;}
    if(op.action==='commit'&&op.target){const changes=engine.workingStatus(op.target.repo).staged;fields+=`<div class="staged-preview"><div class="stage-options-heading">このコミットに含まれる内容 · ${changes.length} 件</div>${changes.length?changes.map(c=>`<details class="file-preview"><summary>${esc(c.file)}</summary><pre>${esc(c.after??'（ファイルの削除）')}</pre></details>`).join(''):'<p class="staging-empty">ステージされた変更がありません。編集 → ステージの順に進めてください。</p>'}</div>`;}
    const nextInput=mobile.matches&&op.picking&&needsInput(op.action);
    const instruction=targetsReady()?'選択内容を確認して、次へ進みましょう':pickPrompt(d[op.active])+'してください';
    panel.innerHTML=`<div class="operation-panel-header"><div>${icon(d.icon)}<h2 id="operation-title" tabindex="-1">${d.label}</h2></div><button class="icon-button" data-cancel-operation aria-label="操作を閉じる">${icon('close')}</button></div>
      <p class="mobile-pick-instruction mobile-only">${icon('cursor')}<span>${instruction}</span></p>
      <p class="operation-panel-description">${d.desc}</p><div class="operation-panel-body"><div class="pick-fields ${!d.source||!d.target?'single-field':''}">${d.source?fieldPick('source'):''}${d.source&&d.target?'<span class="pick-between">↓</span>':''}${d.target?fieldPick('target'):''}</div>
      ${op.action==='fork'?'<div class="pick-hint">'+icon('layers')+'新しいタブにフォークを作成します。</div>':''}<div class="pick-hint">${icon('cursor')}<span>${d.hint}</span></div>${op.action==='pr'?'<p class="cross-workspace-note">上部のワークスペースタブを切り替えても、このパネルは開いたままです。元のタブでリモートの main などを選べます。</p>':''}
      ${fields}<code class="command-preview" style="white-space:pre-wrap">${esc(commandPreview())}</code><p class="operation-command-note">コマンド例です。リポジトリやブランチを選んでから実行します。</p>${op.error?`<p class="operation-error" role="alert">${esc(op.error)}</p>`:''}
      <div class="operation-panel-actions"><button class="secondary-button" data-cancel-operation>キャンセル</button><button class="primary-button ${op.action==='delete'?'danger-button':''}" id="${nextInput?'finish-target-picking':'execute-button'}" ${(nextInput?targetsReady():canExecute())?'':'disabled'}>${icon(nextInput?'checkout':op.action==='delete'?'delete':'check')}${nextInput?(op.action==='stage'?'ファイルを選ぶ':'内容を入力する'):executeLabels[op.action]}</button></div></div>`;panel.hidden=false;
  }
  function choose(t){
    if(op){const d=definitions[op.action];let type=d[op.active];if(!matches(type,t)){const other=op.active==='source'?'target':'source';if(d[other]&&matches(d[other],t)){op.active=other;type=d[other];}else{toast(({localBranch:'ローカルのブランチ',remoteBranch:'リモートのブランチ',anyBranch:'ブランチ',localWorktree:'ローカル本体、または作業中のローカルブランチ',localRepo:'ローカル本体',emptyRemote:'未作成のリモート本体',localRef:'ローカル内のブランチか origin の参照',localAny:'ローカル本体かブランチ',remoteAny:'リモート本体かブランチ',remoteRepo:'リモートの本体',empty:'空のローカル'})[type]+'を選んでください。',true);return;}}
      op[op.active]=clone(t);op.error='';populateFiles();
      if(op.active==='source'&&d.target)op.active='target';else if(op.active==='target'&&d.source&&!op.source)op.active='source';
    }
    selected=t;
    renderRepos();renderSelection();if(op){renderPanel();revealPickTarget();}
  }
  function switchSpace(id){if(!engine.state.spaces.some(s=>s.id===id))return;clearTimeout(flowTimer);$('#flow-overlay').innerHTML='';engine.state.active=id;selected={repo:engine.space.remote,kind:'repo'};render();revealPickTarget();}
  function showFlow(source,target){
    clearTimeout(flowTimer);const map=$('#repository-map'),overlay=$('#flow-overlay');overlay.innerHTML='';if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const elements=$$('[data-ref]',map),find=t=>elements.find(el=>same(JSON.parse(el.dataset.ref),t));let a=find(source),b=find(target);
    if(!a&&source?.repo)a=find({repo:source.repo,kind:'repo'});if(!b&&target?.repo)b=find({repo:target.repo,kind:'repo'});if(!a||!b)return;
    const rect=map.getBoundingClientRect(),ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),x1=ar.left+ar.width/2-rect.left,y1=ar.top+ar.height/2-rect.top,x2=br.left+br.width/2-rect.left,y2=br.top+br.height/2-rect.top;
    overlay.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);overlay.innerHTML=`<circle class="flow-dot" cx="${x1}" cy="${y1}" r="4.5" style="--flow-dx:${x2-x1}px;--flow-dy:${y2-y1}px"/>`;
    flowTimer=setTimeout(()=>overlay.innerHTML='',500);
  }
  function executeOperation(){if(!op||!canExecute())return;const request=clone(op),before=snapshot();
    try{const result=engine.execute(request.action,request.source,request.target,request.values);
      if(result.conflicts){resolveConflicts(result,request,before);return;}
      remember(before);closeOperation();if(request.action==='fork')selected={repo:engine.space.remote,kind:'repo'};else if(['clone','branch','checkout','commit'].includes(request.action))selected={repo:engine.space.local,kind:'branch',branch:engine.repo(engine.space.local).head};
      render();toast(result.title);showFlow(request.source,request.target);requestSetupAction();
    }catch(error){engine.state=before;op.error=error.message;if(needsInput(op.action))op.picking=false;renderPanel();}
  }
  function modalOpen(title,body,footer=''){if(document.body.classList.contains('mobile-tools-open'))toolbox(false);lastFocus=document.activeElement;$('#modal').classList.remove('start-chooser','required-start');$('#modal').innerHTML=`<div class="modal-heading"><h2 id="modal-title">${title}</h2><button class="icon-button" data-close-modal aria-label="閉じる">${icon('close')}</button></div>${body}${footer?`<div class="modal-footer">${footer}</div>`:''}`;$('#modal-backdrop').hidden=false;$('#modal').focus({preventScroll:true});}
  function modalClose(){if(startChoiceRequired)return;const conflict=!!$('#resolve-conflicts');if(conflict&&pendingConflict){engine.state=pendingConflict.before;pendingConflict=null;render();}$('#modal-backdrop').hidden=true;document.body.classList.remove('start-choosing');if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
  function showStartChooser(){
    closeOperation();startChoiceRequired=!engine.state.onboardingVersion;document.body.classList.add('start-choosing');
    modalOpen('開始地点を選択',`<p class="start-intro">プロジェクトの場所に応じて、必要な初期設定を順に案内します。</p><div class="start-choices"><button class="start-choice" data-start="local"><span class="start-choice-icon">${icon('monitor')}</span><span class="start-choice-label">自分のPCにある<br>プロジェクトから</span><span class="start-choice-detail">Git管理を始めて、GitHubに公開する</span><span class="start-choice-next">git init ${icon('checkout')}</span></button><button class="start-choice" data-start="github"><span class="start-choice-icon">${icon('cloud')}</span><span class="start-choice-label">GitHubにある<br>プロジェクトから</span><span class="start-choice-detail">GitHubのリポジトリをPCに複製する</span><span class="start-choice-next">git clone ${icon('checkout')}</span></button></div><p class="start-model-note">サンプルのプロジェクトを使用します。</p>${!engine.state.entryPending?'<p class="start-model-note">これまでの作業はタブに残して、新しい練習を始めます。</p>':''}`);
    $('#modal').classList.add('start-chooser');$('#modal').classList.toggle('required-start',startChoiceRequired);
  }
  function requestSetupAction(){const action=engine.requiredAction();if(!action)return;selected=['clone','connect'].includes(action)?{repo:engine.space.remote,kind:'repo'}:action==='create-remote'?null:defaultSelection();openOperation(action);}
  function startProject(kind){const before=snapshot();engine.startProject(kind,{replace:!!engine.state.entryPending});startChoiceRequired=false;modalClose();remember(before);selected=defaultSelection();render();requestSetupAction();}
  let pendingConflict=null;
  function resolveConflicts(result,request,before){
    pendingConflict={request,before,result};renderRepos();
    modalOpen('変更がぶつかりました',`<p>同じファイルが両方で変更されています。取り込む内容を選んで、マージを完了しましょう。</p><p class="modal-subtitle">このモデルはファイル単位の3方向マージです。実際のGitは行単位でも統合します。キャンセルすると操作前に戻ります。</p>${result.conflicts.map((c,i)=>`<div class="conflict-card"><h3>${esc(c.file)}</h3><div class="conflict-choices"><label><input type="radio" name="conflict-${i}" value="target" checked> 統合先を残す · ${esc(result.to)}<pre>${esc(c.target??'（削除）')}</pre></label><label><input type="radio" name="conflict-${i}" value="source"> 取り込み元を使う · ${esc(result.from)}<pre>${esc(c.source??'（削除）')}</pre></label></div></div>`).join('')}`,`<button class="secondary-button" data-close-modal>操作を取り消す</button><button class="primary-button" id="resolve-conflicts">${icon('merge')}解決してマージ</button>`);
  }
  function finishConflict(){if(!pendingConflict)return;const {request,before,result}=pendingConflict;const resolutions={};result.conflicts.forEach((c,i)=>{resolutions[c.file]=$(`input[name="conflict-${i}"]:checked`).value;});engine.state=clone(before);
    try{const done=engine.execute(request.action,request.source,request.target,{...request.values,resolutions});if(done.conflicts)throw new Error('すべての競合を解決してください。');remember(before);pendingConflict=null;$('#modal-backdrop').hidden=true;closeOperation();render();toast(done.title);}catch(e){engine.state=clone(before);pendingConflict=null;$('#modal-backdrop').hidden=true;render();toast(e.message,true);}
  }
  function showCommit(id){const c=engine.state.commits[id];if(!c)return;modalOpen('コミットの中身',`<span class="commit-detail-id">${esc(c.id)}</span><h3 style="margin:0 0 12px">${esc(c.message)}</h3><p>親コミット：${c.parents.length?c.parents.map(p=>`<code>${esc(p)}</code>`).join(' + '):'なし（最初のコミット）'}</p><p class="modal-subtitle">${c.parents.length===2?'2つの履歴がここで合流しています。':'各コミットは、その時点のファイルのスナップショットです。'}</p>${Object.entries(c.files).map(([name,content])=>`<details class="file-preview" open><summary>${esc(name)}</summary><pre>${esc(content)}</pre></details>`).join('')}`,`<button class="primary-button" data-close-modal>わかりました</button>`);}
  function help(){
    const layout=mobile.matches?'リモートとローカルは上下に並びます。画面下のボタンでそれぞれへ移動できます。':'左がリモート、右がローカル。操作は右端にまとまっています。';
    const start=mobile.matches?'画面下の「操作する」から「フェッチ」などをタップ。':'右の「フェッチ」などをクリック。';
    modalOpen('使い方',`<p>${layout}</p><ol><li><strong>操作を選択。</strong> ${start}</li><li><strong>対象を指定。</strong> ポップアップの選択欄を押し、画面上のブランチやリポジトリ本体をタップ。</li><li><strong>実行。</strong> 作業フォルダ・ステージ・履歴・操作ログで結果を確認します。</li></ol>${mobile.matches?'<p>対象を選ぶ間はパネルが小さくなります。名前や内容が必要な操作は「内容を入力する」、ステージは「ファイルを選ぶ」で次へ進めます。</p>':''}<h3>編集からコミットまで</h3><p><strong>ファイルを編集</strong>して保存したら、<strong>ステージ</strong>で次のコミットに含めるファイルを選びます。最後に<strong>コミット</strong>でメッセージを付け、ステージ時点の内容を記録します。ステージ後の再編集は、もう一度ステージするまで含まれません。</p><h3>取得と統合</h3><p>リモート main → ローカル本体に<strong>フェッチ</strong>。<code>origin/main</code> だけが進みます。手元の <code>main</code> に切り替えて<strong>プル</strong>すると、ブランチと作業フォルダにも変更が入ります。</p><h3>フォークとプルリクエスト</h3><p>フォークすると上部にタブが増えます。クローン → ブランチ作成 → 編集 → ステージ → コミット → 公開の順に進めます。PRの作成中に元のタブへ切り替え、元の main に提案できます。</p><p class="modal-subtitle">操作はブラウザ内で完結します。実際のリポジトリは変更しません。</p>`,`<button class="secondary-button" id="empty-demo">クローンの練習</button><button class="primary-button" data-close-modal>閉じる</button>`);
  }
  function glossary(){const terms=[['repository','履歴とブランチを管理する場所。リモートと手元のローカルは別々です。'],['commit','その時点のスナップショットと、親へのつながり。丸で表示します。'],['branch','コミットを指す名前。コミットすると、そのブランチの参照が進みます。'],['HEAD','今作業しているブランチを指します。クリックによる選択では動きません。'],['origin','クローン元のリモートに付く標準的な名前。フォーク先をクローンすると、そのフォークが origin です。'],['origin/main','最後に取得したリモート main の状態を、手元に記録した参照。実物とずれることがあります。'],['upstream','ローカルブランチが追跡する相手。push -u で設定します。フォーク元リモートの別名 upstream とは区別します。'],['fetch / pull','fetch は取得。pull は取得して統合。このモデルはマージ方式です。'],['fork / clone','fork はGitHub上で別の所有者に複製。clone は手元へ複製します。'],['pull request','公開済みの変更を取り込んでもらう提案。作成とマージは別の操作です。']];modalOpen('Gitのことば',`<dl class="definition-list">${terms.map(([t,d])=>`<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>`,`<button class="primary-button" data-close-modal>閉じる</button>`);}
  function modelInfo(){
    modalOpen('この学習モデルについて',`<p>コミットの親子関係とファイルのスナップショットを持つ、ブラウザ内のGitシミュレーターです。</p><h3>編集・ステージ・コミット</h3><p>作業フォルダ、ステージ、コミットを分けています。編集を保存してもステージは変わりません。ステージでは選んだファイルの現在の内容を記録し、コミットではその内容だけを履歴に残します。</p><p>ステージ後に再編集すると、新しい編集は未ステージのまま残ります。もう一度ステージすると、次のコミットに含める内容が更新されます。</p><h3>再現していること</h3><p>ブランチ参照、HEAD、リモート追跡参照、fast-forward、2つの親を持つマージ、プッシュ拒否、フォークとPRを再現します。</p><h3>理解しやすくするための簡略化</h3><p>ステージと競合判定はファイル単位です。競合解決では片方の内容を選びます。プルは fetch + merge、シンクは pull + push で固定しています。rebase、認証、権限、通信エラー、行単位のステージは扱いません。未コミットの変更がある場合、ブランチの切り替えと統合は中止します。</p><p>「共同編集者が更新」は、別の人によるリモートへのコミットを表します。PRマージは fast-forward が可能なら参照を進め、分岐していればマージコミットを作ります。</p><h3>公式ドキュメント</h3><p><a href="https://git-scm.com/docs/git-add" target="_blank" rel="noopener noreferrer">Git add</a> · <a href="https://git-scm.com/docs/git-commit" target="_blank" rel="noopener noreferrer">Git commit</a> · <a href="https://git-scm.com/docs/git-fetch" target="_blank" rel="noopener noreferrer">Git fetch</a> · <a href="https://git-scm.com/docs/git-pull" target="_blank" rel="noopener noreferrer">Git pull</a> · <a href="https://git-scm.com/docs/git-push" target="_blank" rel="noopener noreferrer">Git push</a></p><p class="modal-subtitle">状態はこのブラウザに保存されます。1つ戻す／やり直すの履歴は、画面を開いている間のみ保持します。file:// での保存可否はブラウザの設定に依存します。</p>`,`<button class="primary-button" data-close-modal>閉じる</button>`);
  }
  function history(direction){const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;if(!from.length)return;to.push(snapshot());engine.state=from.pop();closeOperation();selected=null;render();if(!engine.state.onboardingVersion)showStartChooser();else requestSetupAction();toast(direction==='undo'?'1つ前の状態に戻しました':'操作をやり直しました');}
  function newDemo(empty=false){const before=snapshot();engine.demo(empty);remember(before);closeOperation();selected={repo:engine.space.remote,kind:'repo'};render();toast(empty?'クローン練習用の空のローカルを用意しました':'新しい練習タブを用意しました');}
  function mergePR(id){const pr=engine.state.prs.find(p=>p.id===id);if(!pr)return;modalOpen(`PR #${id} をマージ`, `<h3>${esc(pr.title)}</h3><p><code>${esc(engine.repo(pr.source.repo).name)}:${esc(pr.source.branch)}</code> から <code>${esc(engine.repo(pr.target.repo).name)}:${esc(pr.target.branch)}</code> に統合します。</p><p>リモートの履歴が更新されます。ローカルには、自分でプルするまで反映されません。</p>`,`<button class="secondary-button" data-close-modal>キャンセル</button><button class="primary-button" data-confirm-pr="${id}">${icon('merge')}マージする</button>`);}
  document.addEventListener('click',event=>{const el=event.target.closest('button,a,[data-commit]');if(!el)return;
    if(el.id==='random-edit-button'){fillSampleEdit();return;}
    if(el.id==='guide-hide'||el.id==='guide-show'){setGuideVisible(el.id==='guide-show');return;}
    if(el.dataset.start){startProject(el.dataset.start);return;}
    if(el.dataset.open){if(el.dataset.workingRepo)selected={repo:el.dataset.workingRepo,kind:'repo'};openOperation(el.dataset.open);return;}
    if(el.dataset.ref){choose(JSON.parse(el.dataset.ref));return;}
    if(el.dataset.space){switchSpace(el.dataset.space);return;}
    if(el.dataset.commit){showCommit(el.dataset.commit);return;}
    if(el.dataset.slot){op.active=el.dataset.slot;if(mobile.matches)op.picking=true;renderRepos();renderPanel();revealPickTarget();return;}
    if(el.id==='finish-target-picking'){op.picking=false;renderPanel();panel.scrollTop=0;$('[data-input]',panel)?.focus({preventScroll:true});return;}
    if(el.id==='mobile-tools'){toolbox(true);return;}
    if(el.id==='mobile-tool-close'){toolbox(false);return;}
    if(el.id==='mobile-remote'||el.id==='mobile-local'){scrollToRepo(el.id==='mobile-remote'?'remote':'local');return;}
    if(el.hasAttribute('data-cancel-operation')){const a=op?.action;closeOperation();(mobile.matches?$('#mobile-tools'):$(`[data-open="${a}"]`))?.focus({preventScroll:true});return;}
    if(el.hasAttribute('data-close-modal')){modalClose();return;}
    if(el.dataset.mergePr){mergePR(Number(el.dataset.mergePr));return;}
    if(el.dataset.confirmPr){const id=Number(el.dataset.confirmPr),before=snapshot(),request={action:'merge-pr',values:{id}};try{const result=engine.execute('merge-pr',null,null,{id});if(result.conflicts){resolveConflicts(result,request,before);return;}remember(before);modalClose();render();toast(result.title);}catch(error){engine.state=before;modalClose();toast(error.message,true);}return;}
    if(el.dataset.guide){if(engine.requiredAction()){requestSetupAction();return;}const action=el.dataset.guide;closeOperation();if(['edit','stage','commit'].includes(action))selected=defaultSelection();else if(action==='checkout'&&engine.space.local){selected={repo:engine.space.local,kind:'branch',branch:'main'};}else selected=action==='pull'?{repo:engine.space.remote,kind:'branch',branch:'main'}:{repo:engine.space.remote,kind:'repo'};openOperation(action);return;}
    switch(el.id){case'execute-button':executeOperation();break;case'resolve-conflicts':finishConflict();break;case'help-button':help();break;case'glossary-button':glossary();break;case'model-button':modelInfo();break;case'undo-button':history('undo');break;case'redo-button':history('redo');break;case'scenario-button':showStartChooser();break;case'empty-demo':modalClose();newDemo(true);openOperation('clone');break;case'reset-button':modalOpen('最初の状態に戻しますか？','<p>すべてのワークスペースとPRをリセットし、開始地点の選択からやり直します。この画面を開いている間は「1つ戻す」で復元できます。</p>','<button class="secondary-button" data-close-modal>キャンセル</button><button class="primary-button danger-button" id="confirm-reset">最初の状態に戻す</button>');break;case'confirm-reset':{const before=snapshot();engine=new GitEngine();engine.state.entryPending=true;remember(before);modalClose();closeOperation();selected=defaultSelection();render();showStartChooser();break;}}
  });
  document.addEventListener('input',event=>{const name=event.target.dataset.input;if(!name||!op)return;op.values[name]=event.target.value;op.error='';if(name==='file'&&op.target&&['edit','remote-commit'].includes(op.action)){const r=engine.repo(op.target.repo),files=op.action==='edit'?r.workingFiles:engine.state.commits[engine.ref(op.target).id].files;if(Object.hasOwn(files,op.values.file)){op.values.content=files[op.values.file];$('[data-input="content"]',panel).value=op.values.content;}}const preview=$('.command-preview',panel);if(preview)preview.textContent=commandPreview();$('.operation-error',panel)?.remove();});
  document.addEventListener('change',event=>{if(!op||!event.target.hasAttribute('data-stage-file'))return;op.values.files=$$('[data-stage-file]:checked',panel).map(input=>input.value);const execute=$('#execute-button');if(execute)execute.disabled=!canExecute();const preview=$('.command-preview',panel);if(preview)preview.textContent=commandPreview();});
  document.addEventListener('keydown',event=>{
    if(document.body.classList.contains('mobile-tools-open')){if(event.key==='Escape'){event.preventDefault();toolbox(false);}else if(event.key==='Tab'){const items=$$('button,a[href]',$('#toolbox')).filter(e=>!e.disabled),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}return;}
    if(!$('#modal-backdrop').hidden){if(event.key==='Escape'){event.preventDefault();modalClose();return;}if(event.key==='Tab'){const items=$$('button,a[href],input,select,textarea,[tabindex="0"]',$('#modal')).filter(e=>!e.disabled),first=items[0],last=items.at(-1);if(!items.length)return;if(event.shiftKey&&(document.activeElement===first||document.activeElement===$('#modal'))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===$('#modal'))){event.preventDefault();first.focus();}}return;}
    if(event.key==='Escape'&&op){const action=op.action;closeOperation();(mobile.matches?$('#mobile-tools'):$(`[data-open="${action}"]`))?.focus({preventScroll:true});}
    if(event.target.matches('[data-commit]')&&['Enter',' '].includes(event.key)){event.preventDefault();showCommit(event.target.dataset.commit);}
    if(event.target.matches('[data-space]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=$$('[data-space]'),i=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;switchSpace(tabs[next].dataset.space);$$('[data-space]')[next].focus();}
  });
  $('#modal-backdrop').addEventListener('click',event=>{if(event.target.id==='modal-backdrop')modalClose();});
  $('#mobile-tool-backdrop').addEventListener('click',()=>toolbox(false));
  window.addEventListener('scroll',fitToolbox,{passive:true});
  window.addEventListener('resize',fitToolbox);
  mobile.addEventListener('change',()=>{toolbox(false,false);if(op){op.picking=mobile.matches&&(!targetsReady()||!needsInput(op.action));renderPanel();}});
  $$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  render();fitToolbox();if(!engine.state.onboardingVersion)showStartChooser();else requestSetupAction();if(loadFailed)toast('保存データを読み込めなかったため、開始地点の選択から開きました。',true);
})();
