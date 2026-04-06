const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

const PERSON_MAP = {
  'aaron m fuhrman': 'person-ceo',
  'aaron fuhrman': 'person-ceo',
  'gabriel garcia': 'person-vp1',
  'nicole brener': 'person-vp2',
  'martin rinaldini': 'cmm9egjzb0001ts2ycybc3vhl',
  'alejandro castaño d': 'person-mgr2',
  'alejandro castano': 'person-mgr2',
  'bryan shneiderman': 'cmm9ehthn0005ts2y21eu1t2o',
  'dominic panoncillon': 'cmm9f1kmj001dts2ykw96olft',
  'daniel palacios': 'cmm9eh80y0003ts2yb8fxutou',
  'lewis armas': 'cmm9en4sr000dts2yqf45tajp',
  'iara rosemffet': 'cmm9enrcv000fts2yhlyyl5tb',
  'guadalupe mattar': 'cmm9eo9p7000hts2yps72i7kr',
  'oluwaseun adeola': 'cmm9eot2o000jts2yo3pvm5rj',
  'lauren martinez': 'cmm9ewzur000xts2yb7120cvo',
  'lesni mendez': 'cmm9ern08000rts2y0wnwh8ms',
  'lorena zuluaga': 'cmm9es3fp000vts2yx1ilysof',
  'maria laura alfonzo': 'cmm9eraxp000pts2yikue91yr',
  'aryya abanacion': 'cmm9f0kuw0019ts2ylrf2o85f',
  'chitly rodriguez': 'cmm9f03g20017ts2y45i4r8ah',
  'chloe cervantes': 'cmm9f2218001hts2ysibs6iva',
  'czarina mae gutierres': 'cmm9ey1w5000zts2y972nkkal',
  'daniel feldman': 'cmm9ezpwr0015ts2ysa75xh9r',
  'david rivera': 'cmnm68o340001gnjodzyr0oe8',
  'ria maecazin': 'cmm9eydza0011ts2y8zh3cc76',
  'lily perez': 'cmm9elbcl0009ts2yuhjwpurf',
  'paul fuentes': 'cmnm7m7f8000112m3kn2474c6',
  'eunice uccgi': 'cmm9ez1ip0013ts2yvdk3mo00',
  'hola@aditivo.digital': null, // External contractor, skip
};

function findPersonId(name) {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  if (n === 'hola@aditivo.digital') return null;
  if (PERSON_MAP[n]) return PERSON_MAP[n];
  for (const [key, id] of Object.entries(PERSON_MAP)) {
    if (id && (n.includes(key) || key.includes(n))) return id;
  }
  return null;
}

function mapStatus(customFields) {
  // Handle both array format (raw Asana) and dict format (pre-processed)
  if (!Array.isArray(customFields)) return 'On Track';
  const statusField = customFields.find(f =>
    f.name === 'Status' || f.name === 'Blog Status' || f.name === 'Task Progress'
  );
  if (!statusField || !statusField.display_value) return 'On Track';
  const s = statusField.display_value.toLowerCase();
  if (s.includes('off track')) return 'Off Track';
  if (s.includes('at risk') || s.includes('slightly')) return 'Slightly Off';
  if (s.includes('on hold') || s.includes('hold')) return 'On Hold';
  if (s.includes('done') || s.includes('complete') || s.includes('published') || s.includes('scheduled') || s.includes('ready for upload')) return 'Done';
  if (s.includes('not started') || s.includes('tbd') || s.includes('design requested') || s.includes('requested')) return 'On Track';
  if (s.includes('ready for development') || s.includes('under review') || s.includes('ready to publish') || s.includes('ready for review') || s.includes('in review') || s.includes('to do')) return 'On Track';
  return 'On Track';
}

function extractNotes(customFields) {
  if (!Array.isArray(customFields)) return '';
  const notesField = customFields.find(f => f.name === 'Notes' || f.name === 'Copy');
  return notesField?.display_value || '';
}

function cleanHtml(html) {
  if (!html) return '';
  return html.replace(/<body>/g, '').replace(/<\/body>/g, '').trim();
}

function getSection(task) {
  // Handle pre-processed format with direct section string
  if (typeof task.section === 'string') return task.section;
  for (const m of (task.memberships || [])) {
    if (m.section?.name) return m.section.name;
  }
  return '';
}

async function importProject(projectName, tasks) {
  let project = await prisma.project.findFirst({ where: { name: projectName } });

  if (project) {
    console.log(`  Project "${projectName}" already exists (id: ${project.id}), adding new tasks...`);
  } else {
    project = await prisma.project.create({
      data: { name: projectName, description: '', status: 'On Track', notes: '' }
    });
    console.log(`  Created project "${projectName}" (id: ${project.id})`);
  }

  let created = 0;
  let skipped = 0;
  let unmappedAssignees = new Set();

  for (const task of tasks) {
    if (task.completed) continue;

    const title = (task.name || '').trim();
    if (!title) continue; // Skip empty-named tasks

    const description = cleanHtml(task.html_notes);
    const dueDate = task.due_on || null;
    const status = mapStatus(task.custom_fields || []);
    const notes = extractNotes(task.custom_fields || []);
    const section = getSection(task);
    const assigneeName = typeof task.assignee === 'string' ? task.assignee : (task.assignee?.name || null);
    const personId = findPersonId(assigneeName);

    if (assigneeName && !personId && assigneeName !== 'hola@aditivo.digital') {
      unmappedAssignees.add(assigneeName);
    }

    let fullNotes = notes;
    if (section && !notes.includes(section)) {
      fullNotes = notes ? `[${section}] ${notes}` : `[${section}]`;
    }

    const existing = await prisma.task.findFirst({
      where: { projectId: project.id, title: title }
    });
    if (existing) {
      skipped++;
      continue;
    }

    const taskData = {
      projectId: project.id,
      title,
      description,
      dueDate,
      priority: 'medium',
      status,
      notes: fullNotes,
      completed: false,
    };

    if (personId) {
      taskData.collaborators = {
        create: [{ personId }]
      };
    }

    await prisma.task.create({ data: taskData });
    created++;
  }

  return { created, skipped, unmappedAssignees: [...unmappedAssignees] };
}

async function main() {
  console.log('=== Asana Import: 5 Projects ===\n');

  const projects = [
    { name: 'Web Design', file: '/tmp/asana_webdesign.json' },
    { name: 'YouTube Videos', file: '/tmp/asana_youtube.json' },
    { name: 'Meta Ads', file: '/tmp/asana_metaads.json' },
    { name: 'Email Campaigns', file: '/tmp/asana_project_1200862139450233.json' },
    { name: 'SMS Campaigns', file: '/tmp/asana_sms.json' },
  ];

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    console.log(`${i + 1}. ${p.name}`);
    const tasks = JSON.parse(fs.readFileSync(p.file, 'utf-8'));
    const result = await importProject(p.name, tasks);
    console.log(`   Created: ${result.created}, Skipped: ${result.skipped}`);
    if (result.unmappedAssignees.length) console.log(`   Unmapped: ${result.unmappedAssignees.join(', ')}`);
  }

  console.log('\n=== Summary ===');
  const totalProjects = await prisma.project.count();
  const totalTasks = await prisma.task.count();
  console.log(`Total projects in DB: ${totalProjects}`);
  console.log(`Total tasks in DB: ${totalTasks}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
