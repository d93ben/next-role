(() => {
  'use strict';
  const data = window.NEXT_ROLE;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {saved:'Saved',queued:'Queued',preparing:'Preparing',ready:'Ready to apply',applied:'Applied',interview:'Interview',offer:'Offer',rejected:'Rejected',withdrawn:'Withdrawn'};
  const icons = {
    arrow:'M7 17 17 7M7 7h10v10', back:'m9 5-7 7 7 7M3 12h18',chevron:'m9 5 7 7-7 7',
    briefcase:'M3 7h18v13H3zM8 7V4h8v3M3 12c5 4 13 4 18 0',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3',
    star:'m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2L12 17.3 6.3 20.2l1.1-6.2L2.9 9.6l6.3-.9z',
    search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',refresh:'M20 7v5h-5M4 17v-5h5M19 8a8 8 0 0 0-14-3M5 16a8 8 0 0 0 14 3',
    file:'M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6',mail:'M3 5h18v14H3zM3 6l9 7 9-7',
    link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
    check:'m5 12 4 4L19 6',plus:'M12 5v14M5 12h14',clock:'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    folder:'M3 6h7l2 2h9v12H3zM3 6V4h6l2 2',note:'M4 3h16v18H4zM8 8h8M8 12h8M8 16h5',close:'m6 6 12 12M6 18 18 6',pin:'M12 21v-5M7 3h10l-2 6 4 5H5l4-5z'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.file}"/></svg>`;
  const fmt = (v, time=false) => !v ? '—' : new Date(v.length===10?v+'T12:00:00':v).toLocaleString(undefined,time?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',year:'numeric'});
  const initials = s => (s || 'My workspace').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const fileURL = s => String(s).split('/').map(encodeURIComponent).join('/');
  const webURL = s => {try{const url=new URL(s);return ['https:','http:'].includes(url.protocol)?esc(url.href):'';}catch{return '';}};
  const pill = s => `<span class="status ${esc(s)}"><i></i>${esc(labels[s] || s.replaceAll('_',' '))}</span>`;
  const companyIcon = name => `<span class="company-icon c${[...name].reduce((a,c)=>a+c.charCodeAt(0),0)%5}">${esc(initials(name))}</span>`;
  const scope = data.meta.demo ? 'demo' : 'workspace';
  const desktop = window.nextRoleDesktop;
  const local = Boolean(desktop) || (['127.0.0.1','localhost'].includes(location.hostname) && /^https?:$/.test(location.protocol));
  let token='', writable=false, mutationBusy=false, refreshing=false, errorMessage='', toastTimer;
  const storeKey=`next-role-ui-${data.meta.workspace_id}`;
  const draftKey=`next-role-note-${data.meta.workspace_id}`;
  let filters={search:'',status:'all',starred:false,sort:'updated'};
  let draft={title:'',text:'',request_id:''};
  try { filters={...filters,...JSON.parse(sessionStorage.getItem(storeKey)||'{}')};draft={...draft,...JSON.parse(sessionStorage.getItem(draftKey)||'{}')}; } catch {}
  const persistUI=()=>{try{sessionStorage.setItem(storeKey,JSON.stringify(filters));}catch{}};
  const persistDraft=()=>{try{sessionStorage.setItem(draftKey,JSON.stringify(draft));}catch{}};
  function route() {
    const hash=location.hash.slice(1).split('/');
    if(hash[0]==='job')return{view:'job',id:hash[1],tab:['overview','interview','correspondence','activity'].includes(hash[2])?hash[2]:'overview'};
    return{view:hash[0]==='profile'?'profile':'applications'};
  }
  const empty=(title,body)=>`<div class="empty"><span>${icon('folder')}</span><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`;
  const notice=()=>errorMessage?`<div class="notice error" role="alert">${esc(errorMessage)}<button data-dismiss-error aria-label="Dismiss error">${icon('close')}</button></div>`:'';
  function starButton(job) {
    if (!local) return job.favorite ? '<span class="star-button starred" role="img" aria-label="Favorite">' + icon('star') + '</span>' : '';
    return `<button class="star-button ${job.favorite?'starred':''}" data-star="${job.id}" aria-label="${job.favorite?'Unstar':'Star'} ${esc(job.company)} — ${esc(job.title)}" aria-pressed="${job.favorite}" ${!writable||mutationBusy?'disabled':''} title="${!writable?'Open the local app to save favorites':job.favorite?'Remove favorite':'Add to favorites'}">${icon('star')}</button>`;
  }
  function render() {
    const r=route();const job=r.view==='job'?data.jobs.find(j=>j.id===r.id):null;
    $('#app').innerHTML=`<header class="app-header"><div class="header-inner"><a class="brand" href="#applications"><span>${icon('arrow')}</span>next role<span class="brand-dot">.</span></a><nav aria-label="Main navigation"><a href="#applications" class="${r.view!=='profile'?'selected':''}" ${r.view!=='profile'?'aria-current="page"':''}>${icon('briefcase')}Applications<span class="nav-count">${data.jobs.length}</span></a><a href="#profile" class="${r.view==='profile'?'selected':''}" ${r.view==='profile'?'aria-current="page"':''}>${icon('user')}Career profile</a></nav><div class="header-right"><span class="sync-state"><i></i>${writable?'Live workspace':'Saved workspace'}</span><button class="icon-button" data-refresh aria-label="Refresh dashboard" title="Refresh dashboard">${icon('refresh')}</button><div class="avatar" title="${esc(data.profile.name||'Personal workspace')}">${esc(initials(data.profile.name))}</div></div></div></header><main id="main" class="${r.view==='job'?'detail-page':''}">${data.meta.demo?`<div class="demo-banner"><span><b>Demo workspace</b> · Fictional examples for exploring the app.</span><a href="../workspace/dashboard.html">My workspace ${icon('arrow')}</a></div>`:''}${notice()}${!writable&&!local?'<div class="notice">Ask your assistant in chat to update your workspace. Refresh this page to see saved changes.</div>':''}${r.view==='job'?(job?jobPage(job,r.tab):`${empty('Opportunity not found','Return to Applications to see your saved roles.')}<a class="button" href="#applications">Back to applications</a>`):r.view==='profile'?profilePage():applicationsPage()}<footer><span>Stored in your workspace. Ready for your next move.</span><span>Updated ${esc(fmt(data.built_at,true))} · <a href="${data.meta.demo?'../workspace/dashboard.html':'../demo/dashboard.html'}">${data.meta.demo?'My workspace':'Explore demo'}</a></span></footer></main>`;
    bindInputs();
  }
  function applicationsPage() {
    const sent=data.jobs.filter(j=>j.submission).length;
    return `<div class="page-heading"><div><div class="eyebrow">YOUR JOB SEARCH</div><h1>Applications</h1><p>Every opportunity, with everything that goes with it.</p></div><div class="summary-strip"><span><b>${data.jobs.length}</b> opportunities</span><span><b>${sent}</b> applied</span><span><b>${data.jobs.filter(j=>j.status==='interview').length}</b> interviewing</span></div></div><section class="applications-panel"><div class="table-toolbar"><div class="collection-tabs" aria-label="Application collection"><button data-collection="all" class="${!filters.starred?'selected':''}" aria-pressed="${!filters.starred}">All jobs <span>${data.jobs.length}</span></button><button data-collection="starred" class="${filters.starred?'selected':''}" aria-pressed="${filters.starred}">${icon('star')}Favorites <span id="star-count">${data.jobs.filter(j=>j.favorite).length}</span></button></div><div class="table-controls"><label class="search">${icon('search')}<input id="job-search" type="search" aria-label="Search applications" placeholder="Search roles or companies" value="${esc(filters.search)}"></label><select id="status-filter" aria-label="Filter by status"><option value="all">All statuses</option>${data.statuses.map(s=>`<option value="${s}" ${filters.status===s?'selected':''}>${labels[s]}</option>`).join('')}</select><select id="sort-order" aria-label="Sort applications">${[['updated','Recently updated'],['match','Highest match'],['company','Company A–Z'],['next','Next action date'],['favorites','Favorites first']].map(([v,l])=>`<option value="${v}" ${filters.sort===v?'selected':''}>${l}</option>`).join('')}</select></div></div><div id="table-results">${applicationTable()}</div></section><div class="table-caption"><span>${icon('star')}Open a role to review its details.</span><span>${local?'Click a star to save a favorite.':'Ask your assistant to save favorites in chat.'}</span></div>`;
  }
  function filteredJobs() {
    const jobs=data.jobs.filter(j=>(filters.status==='all'||j.status===filters.status)&&(!filters.starred||j.favorite)&&`${j.company} ${j.title} ${j.location} ${j.work_style}`.toLowerCase().includes(filters.search.toLowerCase()));
    if (filters.sort === 'match') {
      return jobs.sort((a, b) => (b.fit_assessment?.percent ?? -1) - (a.fit_assessment?.percent ?? -1) ||
        b.updated_at.localeCompare(a.updated_at));
    }
    return jobs.sort((a,b)=>filters.sort==='company'?a.company.localeCompare(b.company):filters.sort==='next'?(a.next_action_date||'9999').localeCompare(b.next_action_date||'9999'):filters.sort==='favorites'?Number(b.favorite)-Number(a.favorite)||b.updated_at.localeCompare(a.updated_at):b.updated_at.localeCompare(a.updated_at));
  }
  function matchBadge(assessment) {
    return assessment ? `<span class="match-badge" aria-label="${assessment.percent}% evidence match">${assessment.percent}%</span>` :
      '<span class="muted" aria-label="Match not assessed" title="Match not assessed">—</span>';
  }
  function matchAssessment(assessment) {
    if (!assessment) return '';
    const {criteria, percent, assessed_at} = assessment;
    const requiredCriteria = criteria.filter(item => item.priority === 'required');
    const reviewed = requiredCriteria.length ? requiredCriteria : criteria;
    const supported = reviewed.filter(item => item.status === 'direct').length;
    const unresolved = requiredCriteria.length - supported;
    const statusText = {direct:'Direct evidence', partial:'Transferable', gap:'Gap', unknown:'Unverified'};
    return `<section class="match-assessment detail-section" aria-label="Evidence match">
      <div class="match-overview">
        <div><h2>Evidence match</h2><p>${supported} of ${reviewed.length} ${requiredCriteria.length ? 'required criteria' : 'criteria'} directly supported${unresolved ? ` · ${unresolved} required ${unresolved === 1 ? 'item needs' : 'items need'} review` : ''}</p></div>
        <strong class="match-number">${percent}%</strong>
      </div>
      <meter min="0" max="100" value="${percent}" aria-label="Evidence match percentage"></meter>
      <details>
        <summary>See score breakdown</summary>
        <p class="match-method">Required criteria count twice. Direct evidence earns full credit. Transferable experience earns half. Gaps and unverified items earn zero. Assessed ${esc(fmt(assessed_at))}.</p>
        <ul class="match-criteria">${criteria.map(item => `<li>
          <div class="match-row"><strong>${esc(item.requirement)}</strong><span class="match-level ${esc(item.status)}">${esc(statusText[item.status])}</span></div>
          <p><span>${item.priority === 'required' ? 'Required' : 'Preferred'}</span> · ${esc(item.reason)}</p>
        </li>`).join('')}</ul>
      </details>
    </section>`;
  }
  function applicationTable() {
    const jobs=filteredJobs();
    if(!jobs.length)return empty(data.jobs.length?'No matching opportunities':'Your shortlist starts here',data.jobs.length?'Try another search or filter.':'Drop your resume or LinkedIn export into your AI chat, or describe a recent role. Ask your assistant to find matching jobs.');
    return `<div class="table-scroll"><table><thead><tr><th class="favorite-col"><span class="sr-only">Favorite</span>${icon('star')}</th><th>Opportunity</th><th>Status</th><th>Match</th><th>Location</th><th>Compensation</th><th>Next step</th><th>Files</th><th>Applied</th></tr></thead><tbody>${jobs.map(j=>`<tr data-open-job="${j.id}"><td>${starButton(j)}</td><td><div class="job-cell">${companyIcon(j.company)}<div class="job-info"><a class="job-title" href="#job/${j.id}/overview"><strong>${esc(j.title)}</strong></a><div class="job-meta-line"><span>${esc(j.company)}</span>${webURL(j.url)?`<a class="listing-link" href="${webURL(j.url)}" target="_blank" rel="noopener noreferrer" aria-label="View job at ${esc(j.company)}: ${esc(j.title)} (opens in a new tab)">View job ${icon('arrow')}</a>`:'<span class="listing-missing">No link saved</span>'}</div></div></div></td><td>${pill(j.status)}</td><td>${matchBadge(j.fit_assessment)}</td><td><span class="cell-primary">${esc(j.location||'Not recorded')}</span><span class="cell-secondary">${esc(j.work_style)}</span></td><td class="salary">${esc(j.salary||'Not listed')}</td><td class="next-cell"><span class="cell-primary">${esc(j.next_action||'—')}</span>${j.next_action_date?`<span class="cell-secondary">${esc(fmt(j.next_action_date))}</span>`:''}</td><td><span class="file-count" title="${j.documents.length} prepared documents">${icon('file')}${j.documents.length}</span></td><td class="applied-date">${esc(j.submission?fmt(j.submission.at):'—')}</td></tr>`).join('')}</tbody></table></div><div class="table-bottom"><span>${jobs.length} of ${data.jobs.length} opportunities</span><span>${filters.starred?'Favorites':'All opportunities'}${filters.status==='all'?'':' · '+labels[filters.status]}</span></div>`;
  }
  function jobPage(job,tab) {
    return `<div class="detail-breadcrumb"><a href="#applications">${icon('back')}Applications</a><span>/</span><span>${esc(job.company)}</span></div><div class="job-heading">${companyIcon(job.company)}<div class="job-heading-copy"><h1>${esc(job.title)}</h1><p>${esc(job.company)}<span>·</span>${esc([job.location,job.work_style].filter(Boolean).join(' · '))}</p></div>${starButton(job)}<a class="icon-button" href="#applications" aria-label="Close opportunity">${icon('close')}</a></div><div class="job-meta">${pill(job.status)}${job.salary?`<span class="salary-pill">${esc(job.salary)}</span>`:''}${job.submission?`<span class="submitted-date">Applied ${esc(fmt(job.submission.at))}</span>`:''}</div><div class="detail-layout"><section class="job-content"><nav class="detail-tabs" aria-label="Opportunity sections">${[['overview','Overview'],['interview','Interview prep'],['correspondence','Correspondence'],['activity','Activity']].map(([key,title])=>`<a href="#job/${job.id}/${key}" class="${tab===key?'selected':''}" ${tab===key?'aria-current="page"':''}>${title}${key==='correspondence'&&job.messages.length?`<span>${job.messages.length}</span>`:''}</a>`).join('')}</nav><div class="detail-body">${job.next_action?`<div class="next-action">${icon('clock')}<div><span>Next step${job.next_action_date?' · '+esc(fmt(job.next_action_date)):''}</span><strong>${esc(job.next_action)}</strong></div></div>`:''}${tab==='overview'?jobOverview(job):tab==='interview'?jobInterview(job):tab==='correspondence'?jobMessages(job):jobActivity(job)}</div></section>${resourceSidebar(job)}</div>`;
  }
  function jobOverview(j) {
    return `${matchAssessment(j.fit_assessment)}${j.summary?`<section class="detail-section"><h2>Why this opportunity</h2><p>${esc(j.summary)}</p></section>`:''}<div class="fit-columns"><section><h2>Experience that fits</h2>${j.matches.length?`<ul class="check-list">${j.matches.map(x=>`<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul>`:'<p class="muted">No fit assessment recorded yet.</p>'}</section><section><h2>Worth exploring</h2>${j.gaps.length?`<ul class="plain-list">${j.gaps.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="muted">No gaps recorded.</p>'}</section></div>${j.requirements.length?`<section class="detail-section"><h2>What they’re looking for</h2><div class="chips">${j.requirements.map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>`:''}<section class="detail-section"><h2>Saved job description</h2><p class="small muted">Captured ${esc(fmt(j.listing_captured_at))}. Preserved with your application.</p><div class="listing">${esc(j.listing_text)}</div></section>${j.notes.length?`<section class="detail-section"><h2>Notes</h2>${j.notes.map(n=>`<div class="saved-note"><p>${esc(n.text)}</p><small>${esc(fmt(n.at))}</small></div>`).join('')}</section>`:''}${j.documents.some(d=>d.tailoring_notes)?`<section class="detail-section"><h2>What your application emphasizes</h2>${j.documents.filter(d=>d.tailoring_notes).map(d=>`<div class="saved-note"><strong>${esc(d.title)}</strong><p>${esc(d.tailoring_notes)}</p></div>`).join('')}</section>`:''}`;
  }
  function researchCard(r) {
    return `<article class="research-card"><span class="research-label ${esc(r.kind)}">${r.kind==='predicted_question'?'Practice question':r.kind==='reported_question'?'Reported interview question':'Company research'}</span><h3>${esc(r.title)}</h3><p>${esc(r.content)}</p>${r.role_context?`<p class="small muted">Context: ${esc(r.role_context)}</p>`:''}${r.answer_outline?`<div class="answer-outline"><strong>Your experience to draw on</strong><p>${esc(r.answer_outline)}</p></div>`:''}${r.experience_ids.length?`<div class="chips">${r.experience_ids.map(ref=>{const e=data.experiences.find(e=>e.id===ref);return `<span>${esc(e?e.company+' · '+e.title:ref)}</span>`;}).join('')}</div>`:''}${r.url?`<a class="source-link" href="${webURL(r.url)}" target="_blank" rel="noopener noreferrer">${icon('link')}${esc(r.source_name)} · checked ${esc(fmt(r.checked_at))}</a>`:'<p class="small muted">Suggested practice based on the role; not a reported interview question.</p>'}</article>`;
  }
  function jobInterview(j) {return j.research.length?`<p class="section-intro">Company context and questions connected to your experience.</p>${j.research.map(researchCard).join('')}`:empty('Room to prepare','Company research, interview reports, and practice questions will appear here when saved.');}
  function jobMessages(j) {return j.messages.length?[...j.messages].sort((a,b)=>b.at.localeCompare(a.at)).map(m=>`<article class="message" id="message-${m.id}"><div class="message-top"><div><h2>${esc(m.subject)}</h2><p class="small muted">${esc(m.contact)}</p></div><div><span class="message-direction ${m.direction}">${m.direction==='draft'?'Unsent draft':m.direction==='inbound'?'Received':'Sent'}</span><small>${esc(fmt(m.at))}</small></div></div><p class="message-body">${esc(m.body)}</p><div class="message-bottom"><span>Source: ${esc(m.source)}</span>${m.url?`<a href="${webURL(m.url)}" target="_blank" rel="noopener noreferrer">Open original email ${icon('arrow')}</a>`:''}</div>${m.next_action?`<div class="message-next">${icon('clock')}${esc(m.next_action)}${m.due_date?' · '+esc(fmt(m.due_date)):''}</div>`:''}</article>`).join(''):empty('No correspondence saved yet','Connected email messages or correspondence supplied to your agent will be collected here.');}
  function jobActivity(j) {return `<h2>Application history</h2><ol class="timeline">${[...j.history].reverse().map(h=>`<li><strong>${esc(h.action)}</strong>${h.detail?`<p>${esc(h.detail)}</p>`:''}<time>${esc(fmt(h.at,true))}</time></li>`).join('')}</ol>${j.user_request?`<h2>Your original request</h2><div class="listing">${esc(j.user_request)}</div>`:''}`;}
  function fileGroup(files, title, description = 'Prepared document') {
    const order = {pdf:0, docx:1, html:2, txt:3, md:4, json:5};
    const sorted = [...files].sort((a, b) => (order[a.format] ?? 9) - (order[b.format] ?? 9));
    const primary = sorted[0];
    if (!primary) return '';
    const formats = `<div class="format-links">${sorted.map(file => {
      const url = fileURL(file.path);
      if (file.format === 'html' && sorted.some(item => item.format === 'json')) {
        return `<a href="${url}" target="_blank" rel="noopener">Printable HTML</a>`;
      }
      return `<a href="${url}" download>${file.format === 'json' ? 'Evidence' : 'Download ' + esc(file.format.toUpperCase())}</a>`;
    }).join('')}</div>`;
    const canPreview = ['pdf', 'docx', 'html', 'txt', 'md'].includes(primary.format);
    const fallback = primary.format === 'docx' && sorted.find(file => file.format === 'html');
    const details = `<span class="resource-icon">${icon('file')}</span><span><strong>${esc(title)}</strong><small>${description} · ${esc(primary.format.toUpperCase())}</small></span>`;
    const card = canPreview ? `<button class="resource-primary preview-link" type="button"
      data-preview-url="${fileURL(primary.path)}" data-preview-format="${esc(primary.format)}"
      data-preview-title="${esc(title)}" data-preview-fallback="${fallback ? fileURL(fallback.path) : ''}"
      aria-label="Preview ${esc(title)}">${details}${icon('chevron')}</button>` :
      `<div class="resource-primary">${details}</div>`;
    return `<div class="resource-file">${card}${formats}</div>`;
  }
  function archivedGroups(j) {
    const groups=new Map();
    for(const f of j.submission?.files||[]) {
      const original=j.documents.find(d=>d.files.some(df=>df.path.split('/').pop()===f.path.split('/').pop()));
      const title=f.document_title||original?.title||'Submitted resume';const kind=f.document_kind||original?.kind||'resume';const key=f.document_id || original?.id || f.path.replace(/\.[^.]+$/, '');
      if(!groups.has(key))groups.set(key,{title,kind,files:[]});groups.get(key).files.push(f);
    }
    return [...groups.values()];
  }
  function resourceSidebar(j) {
    const archived=archivedGroups(j);const companyResearch=j.research.filter(r=>r.url);
    return `<aside class="resource-sidebar"><div class="resource-heading"><h2>Links & files</h2>${icon('folder')}</div><section class="resource-section"><h3>Job listing</h3>${j.url?`<a class="resource-primary" href="${webURL(j.url)}" target="_blank" rel="noopener noreferrer"><span class="resource-icon">${icon('link')}</span><span><strong>Original job listing</strong><small>${esc(j.company)}</small></span>${icon('arrow')}</a>`:'<p class="small muted">No external link recorded.</p>'}</section><section class="resource-section"><h3>Submitted materials${archived.length?`<span>${archived.length}</span>`:''}</h3>${archived.length?archived.map(g=>fileGroup(g.files,g.kind==='resume'?'Resume':g.kind==='cover_letter'?'Cover letter':g.title,'Submitted copy')).join(''):'<p class="small muted">No submission recorded yet. Prepared files are below.</p>'}${j.submission?`<div class="submission-receipt">${icon('check')}<div>Submitted ${esc(fmt(j.submission.at))}<details><summary>Submission record</summary><p>${esc(j.submission.evidence)}</p></details></div></div>`:''}</section><section class="resource-section"><h3>Prepared files<span>${j.documents.length}</span></h3>${j.documents.length?[...j.documents].reverse().map(d=>fileGroup(d.files,d.kind==='resume'?(d.imported?'Imported resume':'Current resume'):d.kind==='cover_letter'?'Cover letter draft':d.title)).join(''):'<p class="small muted">Resume, cover letter, and supporting files will appear here.</p>'}</section><section class="resource-section"><h3>Resources</h3>${companyResearch.length?companyResearch.map(r=>`<a class="resource-primary" href="${webURL(r.url)}" target="_blank" rel="noopener noreferrer"><span class="resource-icon">${icon('link')}</span><span><strong>${esc(r.title)}</strong><small>${esc(r.source_name)}</small></span>${icon('arrow')}</a>`).join(''):'<p class="small muted">No research links saved.</p>'}</section><section class="resource-section"><h3>Emails & correspondence<span>${j.messages.length}</span></h3>${j.messages.length?[...j.messages].sort((a,b)=>b.at.localeCompare(a.at)).map(m=>`<a class="resource-primary" href="#job/${j.id}/correspondence"><span class="resource-icon">${icon('mail')}</span><span><strong>${esc(m.subject)}</strong><small>${m.direction==='draft'?'Unsent draft':esc(m.contact)} · ${esc(fmt(m.at))}</small></span>${icon('chevron')}</a>`).join(''):'<p class="small muted">Emails appear here when your agent records connected or supplied correspondence.</p>'}</section></aside>`;
  }
  function sourceLabel(ref) {const answer=data.answers.find(a=>a.id===ref);if(answer)return 'Saved answer · '+fmt(answer.at);const note=data.brain_dump.find(n=>n.id===ref);if(note)return 'Brain dump · '+note.title;return data.intake.find(s=>s.id===ref)?.name||ref;}
  function sourceFileCard(source) {
    const format = source.name.split('.').at(-1).toLowerCase();
    const readStatus = source.status === 'needs_extraction' ? 'Awaiting text extraction' : 'Text available';
    if (['docx', 'pdf'].includes(format)) {
      return fileGroup([{path: source.path, format}], source.name, readStatus);
    }
    return `<a class="resource-primary" href="${fileURL(source.path)}" target="_blank" rel="noopener">
      <span class="resource-icon">${icon('file')}</span>
      <span><strong>${esc(source.name)}</strong><small>${readStatus} · ${Math.ceil(source.bytes / 1024)} KB</small></span>
      ${icon('arrow')}</a>`;
  }
  function profilePage() {
    const p=data.profile;const notes=[...data.brain_dump].sort((a,b)=>b.created_at.localeCompare(a.created_at));
    return `<div class="page-heading"><div><div class="eyebrow">THE STORY BEHIND YOUR SEARCH</div><h1>Career profile</h1><p>Your experience, useful details, and thoughts that aren’t polished yet.</p></div><span class="quiet-count">${data.experiences.length} experiences · ${notes.length} notes</span></div><div class="profile-layout"><div><section class="panel profile-summary"><div class="profile-name"><div class="avatar large">${esc(initials(p.name))}</div><div><h2>${esc(p.name||'Your career story')}</h2><p>${esc(p.headline||'A place for the work you’ve done and what comes next.')}</p><small>${esc([p.location,p.email].filter(Boolean).join(' · '))}</small></div></div>${p.summary?`<p class="profile-description">${esc(p.summary)}</p>`:''}${p.skills.length?`<div class="chips">${p.skills.map(s=>`<span>${esc(s)}</span>`).join('')}</div>`:''}</section><section class="panel brain-panel"><div class="panel-heading"><div><h2>Brain dump</h2><p></p></div>${icon('note')}</div>${local ? `<form id="brain-form"><label class="sr-only" for="brain-title">Note title</label><input id="brain-title" maxlength="200" placeholder="Give this thought a title (optional)" value="${esc(draft.title)}"><label class="sr-only" for="brain-text">Your experience or rough notes</label><textarea id="brain-text" placeholder="I helped our team organize…\nOne project I’m proud of…\nSomething I’d like my next role to include…" maxlength="100000" required>${esc(draft.text)}</textarea><div class="brain-actions"><span id="save-state">${writable?'Saved notes are available to your agent.':'Open the local app to save notes to your workspace.'}</span><button class="button primary" type="submit" ${!writable||mutationBusy?'disabled':''}>${icon('plus')}Save note</button></div></form>` : ''}<div id="saved-thoughts">${notes.length?notes.map(n=>`<article class="thought"><div class="thought-heading"><h3>${esc(n.title)}</h3><span class="note-state ${n.status}">${n.status==='processed'?'Added to profile':'Ready to organize'}</span></div><p>${esc(n.text)}</p>${n.processing_note?`<div class="processing-note">${icon('check')}${esc(n.processing_note)}</div>`:''}<small>${esc(fmt(n.created_at,true))}</small></article>`).join(''):'<div class="first-note">Your notes stay here until your agent helps organize them. The original wording is preserved.</div>'}</div></section><section class="panel"><div class="panel-heading"><h2>Experience & accomplishments</h2><span class="quiet-count">${data.experiences.length}</span></div>${data.experiences.length?data.experiences.map(e=>`<article class="experience"><div><h3>${esc(e.title)}</h3><p>${esc(e.company)} · ${esc(e.period)}</p></div>${e.context?`<p class="muted">${esc(e.context)}</p>`:''}<ul class="fact-list">${e.accomplishments.map(a=>`<li>${icon('check')}<div>${esc(a.text)}<small>${a.source_refs.map(ref=>esc(sourceLabel(ref))).join(' · ')}</small></div></li>`).join('')}</ul></article>`).join(''):empty('Your experience will take shape here','Tell your assistant about your experience or attach a resume in chat.')}</section>${data.answers.length?`<section class="panel saved-answers"><details><summary>Your saved answers <span>${data.answers.length}</span></summary>${data.answers.map(a=>`<blockquote><strong>${esc(a.question)}</strong><p>${esc(a.response)}</p><small>${esc(fmt(a.at))}</small></blockquote>`).join('')}</details></section>`:''}</div><aside><section class="panel preferences"><div class="panel-heading"><h2>What you’re looking for</h2>${icon('pin')}</div>${[['Roles',p.preferences.roles.join(', ')],['Location',p.preferences.locations.join(', ')],['Work style',p.preferences.work_style],['Compensation',p.preferences.salary],['What matters',p.preferences.priorities.join(' · ')]].map(([k,v])=>`<div class="preference"><h3>${k}</h3><p>${esc(v||'Not recorded yet')}</p></div>`).join('')}</section><section class="panel"><div class="panel-heading"><h2>Source files</h2>${icon('folder')}</div><div class="source-files">${data.intake.filter(source => source.status !== 'superseded_or_removed').map(sourceFileCard).join('')||'<p class="small muted">Attach career files in your AI chat.</p>'}</div></section>${data.questions.filter(q=>q.status==='open').length?`<section class="panel questions"><div class="panel-heading"><h2>Open questions</h2>${icon('note')}</div>${data.questions.filter(q=>q.status==='open').map(q=>`<div><h3>${esc(q.question)}</h3><p>${esc(q.why)}</p></div>`).join('')}</section>`:''}${p.education.length?`<section class="panel education"><div class="panel-heading"><h2>Education</h2></div>${p.education.map(e=>`<div><h3>${esc(e.qualification)}</h3><p>${esc(e.institution)} · ${esc(e.date)}</p></div>`).join('')}</section>`:''}</aside></div>`;
  }
  function bindInputs() {
    $('#job-search')?.addEventListener('input',e=>{filters.search=e.target.value;persistUI();$('#table-results').innerHTML=applicationTable();});
    $('#status-filter')?.addEventListener('change',e=>{filters.status=e.target.value;persistUI();$('#table-results').innerHTML=applicationTable();});
    $('#sort-order')?.addEventListener('change',e=>{filters.sort=e.target.value;persistUI();$('#table-results').innerHTML=applicationTable();});
    $('#brain-title')?.addEventListener('input',e=>{draft.title=e.target.value;draft.request_id='';persistDraft();});
    $('#brain-text')?.addEventListener('input',e=>{draft.text=e.target.value;draft.request_id='';persistDraft();});
    $('#brain-form')?.addEventListener('submit',saveBrainDump);
  }
  function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
  async function sendAction(payload) {
    if(!writable)throw new Error('Start the local app to save changes.');
    if(desktop)return desktop.save(payload);
    const res=await fetch('/__next-role/action',{method:'POST',headers:{'Content-Type':'application/json','X-Next-Role-Token':token},body:JSON.stringify({workspace:scope,...payload})});
    const response=await res.json();if(!res.ok)throw new Error(response.error||'Could not save.');return response;
  }
  async function toggleFavorite(jobId) {
    if(mutationBusy)return;const job=data.jobs.find(j=>j.id===jobId);if(!job)return;
    mutationBusy=true;const buttons=[...document.querySelectorAll('[data-star]')];buttons.forEach(b=>b.disabled=true);
    try{const response=await sendAction({action:'favorite',job_id:job.id,favorite:!job.favorite});Object.assign(job,response.result);errorMessage='';mutationBusy=false;render();toast(job.favorite?'Added to favorites':'Removed from favorites');}
    catch(e){mutationBusy=false;errorMessage=e.message;render();}
  }
  async function saveBrainDump(e) {
    e.preventDefault();if(mutationBusy||!draft.text.trim())return;
    draft.request_id ||= crypto.randomUUID();persistDraft();mutationBusy=true;$('#brain-form').querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);$('#save-state').textContent='Saving to your workspace…';
    try{const response=await sendAction({action:'brain-dump',...draft});if(!data.brain_dump.some(n=>n.id===response.result.id))data.brain_dump.push(response.result);draft={title:'',text:'',request_id:''};persistDraft();mutationBusy=false;errorMessage='';render();toast('Note saved. Your agent can pick it up from the workspace index.');}
    catch(error){mutationBusy=false;errorMessage=error.message;render();}
  }
  document.addEventListener('click',e=>{
    const preview = e.target.closest('[data-preview-url]');
    if (preview) {
      const {previewUrl, previewFormat, previewTitle, previewFallback} = preview.dataset;
      window.nextRoleDocumentPreview.open({url: previewUrl, format: previewFormat, title: previewTitle, fallback: previewFallback});
      return;
    }
    const star=e.target.closest('[data-star]');if(star){e.stopPropagation();toggleFavorite(star.dataset.star);return;}
    const collection=e.target.closest('[data-collection]');if(collection){filters.starred=collection.dataset.collection==='starred';persistUI();render();return;}
    if(e.target.closest('[data-refresh]')){persistDraft();location.reload();return;}
    if(e.target.closest('[data-dismiss-error]')){errorMessage='';render();return;}
    const row=e.target.closest('[data-open-job]');if(row&&!e.target.closest('a,button,input'))location.hash=`job/${row.dataset.openJob}/overview`;
  });
  window.addEventListener('hashchange', () => {
    window.nextRoleDocumentPreview.close();
    render();
    window.scrollTo(0, 0);
  });
  document.addEventListener('keydown', e => {
    if (window.nextRoleDocumentPreview.active) return;
    if (e.key === 'Escape' && route().view === 'job') location.hash = 'applications';
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      location.hash = 'applications';
      render();
      $('#job-search')?.focus();
    }
  });
  async function connect() {
    if(!local)return;
    if(desktop){writable=true;render();}
    else try{const res=await fetch('/__next-role/session',{cache:'no-store'});if(!res.ok)return;const session=await res.json();token=session.token;writable=Boolean(token);render();}catch{}
    setInterval(async () => {
      if (mutationBusy || refreshing || window.nextRoleDocumentPreview.active || document.activeElement?.matches('input,textarea,select')) return;
      try {
        let version;
        if (desktop) version = await desktop.version();
        else {
          const res = await fetch(`/__next-role/version?workspace=${scope}`, {cache:'no-store'});
          if (!res.ok) return;
          version = await res.json();
        }
        if (version.built_at && version.built_at !== data.built_at && !mutationBusy && !window.nextRoleDocumentPreview.active && !document.activeElement?.matches('input,textarea,select')) {
          refreshing = true;
          persistUI();
          persistDraft();
          location.reload();
        }
      } catch {}
    }, 2500);
  }
  render();connect();
})();
