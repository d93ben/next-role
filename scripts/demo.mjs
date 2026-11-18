import fs from 'node:fs';
import path from 'node:path';
import { ROOT, init, load, lock, mutate, resume, intake, build } from './lib.mjs';

export function createDemo(root) {
  return lock(root, () => {
    if (fs.existsSync(path.join(root, 'workspace.json'))) {
      if (!load(root).meta.demo) throw new Error('Refusing to add demo content to a personal workspace.');
      if (load(root).jobs.length) return build(root);
    }
    init(root, true);
    const d = offset => { const date = new Date(); date.setDate(date.getDate()+offset); return date.toISOString().slice(0,10); };
    fs.writeFileSync(path.join(root, 'input', 'Alex-Morgan-career-notes.txt'), `FICTIONAL DEMO — NOT A REAL PERSON\nAlex Morgan, Operations & Program Coordinator, Portland OR\nNorthstar Studio, Operations Coordinator, 2022–2026\nCoordinated weekly staffing plans for three team leads. Built a spreadsheet tracker for 24 contractors. Trained four new hires and wrote a quick reference guide.\nFieldwork Collective, Project Assistant, 2020–2022\nOrganized project schedules and vendor communications across six concurrent projects. Prepared weekly status summaries for the program manager.\nSkills: Project coordination, Excel, Google Sheets, Process documentation, Stakeholder communication, Onboarding\nEducation: BA Communication, Cascade College, 2020\n`);
    const sources = intake(root);
    mutate(root, 'profile set', {name:'Alex Morgan',headline:'Operations & Program Coordinator',location:'Portland, OR',email:'alex@example.com',summary:'Operations professional with experience coordinating people, projects, and day-to-day processes. Enjoys turning scattered information into clear plans and helping teams work well together.',skills:['Project coordination','Excel','Google Sheets','Process documentation','Stakeholder communication','Onboarding'],education:[{institution:'Cascade College',qualification:'BA Communication',date:'2020'}],preferences:{roles:['Operations Coordinator','Program Coordinator','Project Coordinator'],locations:['Portland, OR','United States'],work_style:'Remote or hybrid',salary:'$70,000–$90,000',priorities:['Thoughtful team culture','Room to grow','Useful, tangible work']}});
    const answer = mutate(root,'answer add',{question:'Tell me about a process you improved.',response:'At Northstar I built a shared spreadsheet to track 24 contractors and their availability. Three team leads used it for weekly staffing. I also trained four new hires and wrote a quick reference guide. I don’t have a measured time-savings figure.'});
    const exp = mutate(root,'experience add',{company:'Northstar Studio',title:'Operations Coordinator',period:'2022–2026',context:'Supported staffing, onboarding, and operational coordination for a growing studio.',source_refs:[sources[0].id,answer.id],accomplishments:[{text:'Built a shared availability tracker for 24 contractors, used by three team leads for weekly staffing.',source_refs:[answer.id]},{text:'Trained four new hires on the inventory system and created a quick reference guide.',source_refs:[sources[0].id],evidence_type:'documented'}]});
    const exp2 = mutate(root,'experience add',{company:'Fieldwork Collective',title:'Project Assistant',period:'2020–2022',context:'Kept project schedules and communications organized across a small program team.',source_refs:[sources[0].id],accomplishments:[{text:'Coordinated schedules and vendor communications across six concurrent projects.',evidence_type:'documented'},{text:'Prepared weekly status summaries for the program manager.',evidence_type:'documented'}]});
    const [staffing, onboarding] = exp.accomplishments;
    const [scheduling, updates] = exp2.accomplishments;
    const rate = (status, reason, ...facts) => ({status, reason, evidence_refs: facts.map(fact => fact.id)});
    const fitExamples = [
      [
        rate('direct', 'Coordinated weekly staffing and schedules across six projects.', staffing, scheduling),
        rate('direct', 'Supported staffing decisions for three team leads.', staffing),
        rate('direct', 'Created a quick reference guide for new hires.', onboarding)
      ],
      [
        rate('direct', 'Built a spreadsheet to track availability for 24 contractors.', staffing),
        rate('direct', 'Supported staffing operations with three team leads.', staffing),
        rate('partial', 'Introduced a shared tracker. The operational improvement was not measured.', staffing)
      ],
      [
        rate('unknown', 'Event planning experience is unverified.'),
        rate('partial', 'Vendor communication is transferable to member support.', scheduling),
        rate('direct', 'Built a shared staffing tracker for three team leads.', staffing)
      ],
      [
        rate('direct', 'Tracked schedules and vendor communications across six projects.', scheduling),
        rate('direct', 'Prepared weekly status summaries for the program manager.', updates),
        rate('direct', 'Created a quick reference guide and weekly project summaries.', onboarding, updates)
      ],
      [
        rate('direct', 'Trained four new hires on the inventory system.', onboarding),
        rate('partial', 'Maintained staffing details for 24 contractors.', staffing),
        rate('direct', 'Trained new employees and created a guide they could use.', onboarding)
      ]
    ];
    mutate(root,'question add',{question:'What kind of team helps you do your best work?',why:'This helps your assistant assess culture fit beyond a job title.'});
    mutate(root,'question add',{question:'Have you managed a project budget?',why:'Several program roles ask for budget tracking. A small example can still be relevant.'});
    const definitions = [
      {company:'Canopy',title:'Program Coordinator',location:'Portland, OR',work_style:'Hybrid',salary:'$78,000–$88,000',status:'queued',next_action:'Prepare for the team conversation',next_action_date:d(2),summary:'A people-focused program role with a strong connection to your coordination and onboarding experience.',requirements:['Program scheduling','Cross-team coordination','Process documentation'],matches:['Coordinated weekly staffing for three team leads.','Documented processes and trained new hires.'],gaps:['Confirm experience with project budget tracking.']},
      {company:'Forma',title:'Operations Specialist',location:'United States',work_style:'Remote',salary:'$75,000–$90,000',status:'queued',next_action:'Review the tailored resume',next_action_date:d(1),summary:'A practical operations role that draws on your experience building clear, shared processes.',requirements:['Spreadsheet fluency','Operations support','Continuous improvement'],matches:['Built and maintained a tracker for 24 contractors.','Supported day-to-day staffing operations.'],gaps:['The listing mentions Airtable; your current profile does not.']},
      {company:'Common Ground',title:'Community Operations Coordinator',location:'Portland, OR',work_style:'Hybrid',salary:'$72,000–$82,000',status:'queued',next_action:'Follow up with the recruiting team',next_action_date:d(5),summary:'An opportunity to bring your organization and communication skills to a community-oriented team.',requirements:['Event coordination','Member communication','Administrative systems'],matches:['Coordinated vendor communications across six projects.'],gaps:['Ask about direct event-planning experience.']},
      {company:'Linear Works',title:'Project Coordinator',location:'United States',work_style:'Remote',salary:'$80,000–$95,000',status:'saved',next_action:'Explore fit with your assistant',next_action_date:'',summary:'A project coordination opportunity worth a closer look.',requirements:['Project tracking','Stakeholder updates','Documentation'],matches:['Prepared weekly project summaries.','Managed schedules across concurrent projects.'],gaps:['Confirm comfort working across time zones.']},
      {company:'Sunday',title:'People Operations Associate',location:'Portland, OR',work_style:'Hybrid',salary:'$70,000–$80,000',status:'saved',next_action:'Compare the role with your priorities',next_action_date:'',summary:'A potential move toward employee experience and onboarding.',requirements:['Onboarding','Attention to detail','Employee communication'],matches:['Trained four new hires and created a reference guide.'],gaps:['HR information system experience is not yet documented.']}
    ];
    const jobs = definitions.map((j,i)=>mutate(root,'job add',{...j,fit_assessment:j.requirements.map((requirement,index)=>({requirement,priority:'required',...fitExamples[i][index]})),url:`https://example.com/demo-jobs/${i+1}`,user_request:j.status==='queued'?`Please prepare an application for the ${j.title} role at ${j.company}.`:'',requested_action:j.status==='queued'?'apply':'research',listing_text:`FICTIONAL DEMO LISTING\n\n${j.company} — ${j.title}\n${j.location} · ${j.work_style} · ${j.salary}\n\nWe are looking for a thoughtful coordinator who enjoys helping teams work well together.\n\nYou will:\n• Coordinate schedules and keep stakeholders informed.\n• Maintain clear records and improve everyday processes.\n• Support onboarding and cross-team projects.\n\nWhat you bring:\n${j.requirements.map(r=>'• '+r).join('\n')}\n\nThis is sample content for exploring Next Role. It is not a live opening.`}));
    const makeResume = j=>resume(root,j.id,{headline:j.title,summary:'Organized operations and project professional with experience coordinating staffing, maintaining shared records, and helping new team members get started.',skills:['Project coordination','Excel','Process documentation','Stakeholder communication'],tailoring_notes:`Emphasizes scheduling, process documentation, and clear stakeholder updates for ${j.company}. Omits unverified budget responsibility and unmeasured time savings.`,experiences:[{experience_id:exp.id,bullets:exp.accomplishments.map(a=>({text:a.text,fact_ids:[a.id]}))},{experience_id:exp2.id,bullets:exp2.accomplishments.map(a=>({text:a.text,fact_ids:[a.id]}))}]});
    const r0=makeResume(jobs[0]); makeResume(jobs[1]); const r2=makeResume(jobs[2]);
    const coverPath=path.join(root,'input','Canopy-cover-letter.txt');
    fs.writeFileSync(coverPath,'FICTIONAL DEMO COVER LETTER\n\nDear Canopy team,\n\nI would bring practical coordination experience to your program team. At Northstar Studio I maintained a contractor availability tracker used by three team leads, trained four new hires, and wrote a quick reference guide. I would welcome the opportunity to learn more about how your team coordinates its programs.\n\nAlex Morgan\n');
    const cover=mutate(root,'document add',{kind:'cover_letter',source_path:coverPath,title:'Canopy cover letter'},jobs[0].id).documents.at(-1);
    const samplePath=path.join(root,'input','Coordination-work-sample.txt');
    fs.writeFileSync(samplePath,'FICTIONAL DEMO WORK SAMPLE\n\nProject coordination approach\nMaintain a shared schedule, confirm each owner and deadline, surface blockers, and prepare a concise weekly status summary.\n\nThis is an illustrative sample, not a real client document.\n');
    const sample=mutate(root,'document add',{kind:'other',source_path:samplePath,title:'Coordination work sample'},jobs[0].id).documents.at(-1);
    mutate(root,'submission record',{resume_id:r0.id,attachment_ids:[cover.id,sample.id],evidence_type:'user_reported',evidence:'Fictional demo: candidate reported submitting this resume, cover letter, and work sample through the company careers page.',at:d(-5),next_action:'Prepare for the team conversation',next_action_date:d(2)},jobs[0].id);
    mutate(root,'job update',{status:'interview',change_note:'Fictional demo: interview invitation recorded.'},jobs[0].id);
    mutate(root,'job update',{status:'ready'},jobs[1].id);
    mutate(root,'submission record',{resume_id:r2.id,evidence_type:'user_reported',evidence:'Fictional demo: candidate confirmed the application was sent.',at:d(-3),next_action:'Follow up with the recruiting team',next_action_date:d(5)},jobs[2].id);
    mutate(root,'research add',{kind:'company',title:'A collaborative program team',content:'Fictional demo research: Canopy is described as a community-focused organization with a small operations team. In a real search, the assistant would verify this against current company sources.',url:'https://example.com/demo-company',source_name:'Fictional demo source',role_context:'Program team'},jobs[0].id);
    mutate(root,'research add',{kind:'predicted_question',title:'Tell me about a process you made easier for your team.',content:'A practice question suggested from the role’s focus on operational processes.',answer_outline:'Situation: Team leads needed a shared view of contractor availability.\nAction: Built an availability tracker for 24 contractors and helped three team leads use it for staffing.\nResult: The tracker became part of weekly staffing planning. Do not claim a measured time saving.',experience_ids:[exp.id]},jobs[0].id);
    mutate(root,'research add',{kind:'predicted_question',title:'How do you keep several projects moving at once?',content:'A practice question based on the requirement to coordinate schedules and communicate progress.',answer_outline:'Use your Fieldwork example: six concurrent projects, shared schedules, vendor communications, and weekly status summaries. Explain how you decided which update mattered next.',experience_ids:[exp2.id]},jobs[3].id);
    mutate(root,'message add',{direction:'inbound',subject:'Let’s meet the program team',contact:'Jordan Lee · Canopy recruiting (fictional)',body:'Hi Alex,\n\nWe enjoyed learning about your background and would like to invite you to a conversation with our program team. We’ll talk about your coordination experience and how you approach improving a process.\n\nLooking forward to connecting,\nJordan',source:'Fictional demo message',at:d(-1),next_action:'Prepare two examples for the team conversation',due_date:d(2)},jobs[0].id);
    mutate(root,'message add',{direction:'draft',subject:'Thank you — looking forward to meeting the team',contact:'Jordan Lee · Canopy recruiting (fictional)',body:'Hi Jordan,\n\nThank you for the invitation. I’m looking forward to learning more about the program team and sharing a few examples of my coordination work.\n\nBest,\nAlex',source:'Fictional reply draft — not sent',at:d(0)},jobs[0].id);
    mutate(root,'message add',{direction:'inbound',subject:'We received your application',contact:'Common Ground recruiting (fictional)',body:'Thanks for your interest in the Community Operations Coordinator role. We’ve received your application and will be in touch about next steps.',source:'Fictional demo message',at:d(-3),next_action:'Check in if there is no update',due_date:d(5)},jobs[2].id);
    mutate(root,'note add',{text:'Fictional demo note: Ask about how the program and operations teams share responsibility for onboarding.'},jobs[0].id);
    mutate(root,'favorite set',{favorite:true},jobs[0].id);
    mutate(root,'favorite set',{favorite:true},jobs[4].id);
    mutate(root,'brain-dump add',{title:'Onboarding guide — more to remember',text:'Fictional demo note: I remember walking new hires through the quick reference guide and answering follow-up questions. I should explain what the guide covered and how I kept it updated before using that detail in a resume.'});
    mutate(root,'memory set',{summary:'Fictional demo: five opportunities, three tailored resumes, and two recorded applications.',current_focus:'Prepare for the Canopy conversation and review the Forma draft.',decisions:['Canopy and Sunday are starred interests.','Do not claim measured time savings without supporting evidence.'],next_steps:['Review the unprocessed onboarding note.','Ask about budget tracking experience.','Practice the contractor-tracker interview example.']});
    return build(root);
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT,'scripts','demo.mjs')) console.log(JSON.stringify(createDemo(path.join(ROOT,'demo')),null,2));
