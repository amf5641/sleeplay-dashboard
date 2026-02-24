/**
 * Sleeplay Dashboard — Store and manage SOPs, persist in localStorage
 * Login gate: email + password (hashed in localStorage). Session in sessionStorage.
 */

const STORAGE_SOPS = 'sop-dashboard-sops';
const STORAGE_CATEGORIES = 'sop-dashboard-categories';
const STORAGE_ORG_CHART = 'sop-dashboard-orgchart';
const STORAGE_PROJECTS = 'sop-dashboard-projects';
const STORAGE_TASKS = 'sop-dashboard-tasks';
const STORAGE_CONTENT = 'sop-dashboard-content';
const STORAGE_AUTH = 'sop-dashboard-auth';
const SESSION_KEY = 'sop-dashboard-logged-in';
const SESSION_USER_EMAIL = 'sop-dashboard-user-email';

const DEFAULT_USERS = [
  { email: 'admin@sleeplay.com', passwordHash: null },
  { email: 'aaron.fuhrman@sleeplay.com', passwordHash: null }
];
const DEFAULT_PASSWORDS = {
  'admin@sleeplay.com': 'Sleeplay2025!',
  'aaron.fuhrman@sleeplay.com': 'Sleeplay@123'
};

async function hashPassword(pw) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(pw));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function ensureAuth() {
  let auth = null;
  try {
    auth = JSON.parse(localStorage.getItem(STORAGE_AUTH) || 'null');
  } catch (e) {}
  if (!auth || !auth.users || !Array.isArray(auth.users)) {
    if (auth && auth.email && auth.passwordHash) {
      auth = { users: [{ email: auth.email, passwordHash: auth.passwordHash }] };
      const needAaron = auth.users.every(u => (u.email || '').toLowerCase() !== 'aaron.fuhrman@sleeplay.com');
      if (needAaron) {
        auth.users.push({
          email: 'aaron.fuhrman@sleeplay.com',
          passwordHash: await hashPassword('Sleeplay@123')
        });
      }
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
    } else {
      const users = await Promise.all(DEFAULT_USERS.map(async (u) => ({
        email: u.email,
        passwordHash: u.passwordHash || await hashPassword(DEFAULT_PASSWORDS[u.email] || '')
      })));
      auth = { users };
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
    }
  } else {
    const needAaron = !auth.users.some(u => (u.email || '').toLowerCase() === 'aaron.fuhrman@sleeplay.com');
    if (needAaron) {
      auth.users.push({
        email: 'aaron.fuhrman@sleeplay.com',
        passwordHash: await hashPassword('Sleeplay@123')
      });
      localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
    }
  }
  if (auth.users && auth.users.length && auth.users.some(u => u.passwordHash === null)) {
    for (const u of auth.users) {
      if (u.passwordHash === null && DEFAULT_PASSWORDS[u.email])
        u.passwordHash = await hashPassword(DEFAULT_PASSWORDS[u.email]);
    }
    localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
  }
  return auth;
}

function findUserByEmail(auth, email) {
  if (!auth || !auth.users) return null;
  const lower = (email || '').trim().toLowerCase();
  return auth.users.find(u => (u.email || '').toLowerCase() === lower) || null;
}

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_AUTH) || 'null');
  } catch (e) {
    return null;
  }
}

function getCurrentUserEmail() {
  return sessionStorage.getItem(SESSION_USER_EMAIL) || '';
}

function generateTempPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pw = '';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

function setupLoginForm(auth) {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const loginPanel = document.getElementById('login-panel');
  const forgotPanel = document.getElementById('forgot-panel');
  const forgotLink = document.getElementById('login-forgot-link');
  const backLink = document.getElementById('forgot-back-link');
  if (!form || !errorEl) return;

  function showLogin() {
    if (loginPanel) loginPanel.style.display = 'block';
    if (forgotPanel) forgotPanel.style.display = 'none';
  }
  function showForgot() {
    if (loginPanel) loginPanel.style.display = 'none';
    if (forgotPanel) forgotPanel.style.display = 'block';
    const emailForm = document.getElementById('forgot-email-form');
    const emailSent = document.getElementById('forgot-email-sent');
    const pwForm = document.getElementById('forgot-password-form');
    const successEl = document.getElementById('forgot-success');
    if (emailForm) emailForm.style.display = 'block';
    if (emailSent) emailSent.style.display = 'none';
    if (pwForm) pwForm.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
    if (document.getElementById('forgot-email')) document.getElementById('forgot-email').value = '';
    if (document.getElementById('forgot-email-error')) { document.getElementById('forgot-email-error').textContent = ''; document.getElementById('forgot-email-error').style.display = 'none'; }
    if (document.getElementById('forgot-new-password')) document.getElementById('forgot-new-password').value = '';
    if (document.getElementById('forgot-confirm-password')) document.getElementById('forgot-confirm-password').value = '';
    if (document.getElementById('forgot-password-error')) { document.getElementById('forgot-password-error').textContent = ''; document.getElementById('forgot-password-error').style.display = 'none'; }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
    const password = document.getElementById('login-password').value || '';
    const user = findUserByEmail(auth, email);
    const hash = await hashPassword(password);
    if (user && hash === user.passwordHash) {
      sessionStorage.setItem(SESSION_KEY, '1');
      sessionStorage.setItem(SESSION_USER_EMAIL, email);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      initApp();
    } else {
      errorEl.textContent = 'Invalid email or password.';
      errorEl.style.display = 'block';
    }
  });

  if (forgotLink) forgotLink.addEventListener('click', showForgot);
  if (backLink) backLink.addEventListener('click', showLogin);

  setupForgotPasswordForm(auth, showLogin);
}

function setupForgotPasswordForm(auth, onBack) {
  const emailForm = document.getElementById('forgot-email-form');
  const emailSentEl = document.getElementById('forgot-email-sent');
  const emailDisplayEl = document.getElementById('forgot-email-display');
  const continueResetBtn = document.getElementById('forgot-continue-reset');
  const pwForm = document.getElementById('forgot-password-form');
  const emailError = document.getElementById('forgot-email-error');
  const pwError = document.getElementById('forgot-password-error');
  const successEl = document.getElementById('forgot-success');
  if (!emailForm || !pwForm) return;

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (emailError) { emailError.textContent = ''; emailError.style.display = 'none'; }
    const email = (document.getElementById('forgot-email').value || '').trim().toLowerCase();
    const user = findUserByEmail(auth, email);
    if (!user) {
      if (emailError) { emailError.textContent = 'No account found with that email.'; emailError.style.display = 'block'; }
      return;
    }
    emailForm.style.display = 'none';
    if (emailDisplayEl) emailDisplayEl.textContent = email;
    if (emailSentEl) emailSentEl.style.display = 'block';
  });

  if (continueResetBtn) {
    continueResetBtn.addEventListener('click', () => {
      if (emailSentEl) emailSentEl.style.display = 'none';
      pwForm.style.display = 'block';
    });
  }

  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (pwError) { pwError.textContent = ''; pwError.style.display = 'none'; }
    const email = (document.getElementById('forgot-email').value || '').trim().toLowerCase();
    const newPw = document.getElementById('forgot-new-password').value || '';
    const confirmPw = document.getElementById('forgot-confirm-password').value || '';
    if (newPw.length < 6) {
      if (pwError) { pwError.textContent = 'Password must be at least 6 characters.'; pwError.style.display = 'block'; }
      return;
    }
    if (newPw !== confirmPw) {
      if (pwError) { pwError.textContent = 'Passwords do not match.'; pwError.style.display = 'block'; }
      return;
    }
    const user = findUserByEmail(auth, email);
    if (user) {
      user.passwordHash = await hashPassword(newPw);
      try {
        localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
      } catch (err) {}
    }
    pwForm.style.display = 'none';
    if (successEl) successEl.style.display = 'block';
  });
}

function generateCatId() {
  return 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

const CONTENT_CATEGORIES = [
  { id: 'company', name: 'Company' },
  { id: 'policies', name: 'Policies' },
  { id: 'processes', name: 'Processes' }
];

const DEFAULT_CONTENT_DOCS = [
  { id: 'content-1', title: 'Welcome to our company', categoryId: 'company', content: '', updatedAt: new Date().toISOString() },
  { id: 'content-2', title: 'Our 3-year plan', categoryId: 'policies', content: '', updatedAt: new Date().toISOString() },
  { id: 'content-3', title: 'Office overview', categoryId: 'company', content: '', updatedAt: new Date().toISOString() },
  { id: 'content-4', title: 'Our Target Market', categoryId: 'company', content: '', updatedAt: new Date().toISOString() },
  { id: 'content-5', title: 'Services Overview', categoryId: 'company', content: '', updatedAt: new Date().toISOString() },
  { id: 'content-6', title: 'Voice & Style Guides', categoryId: 'processes', content: '', updatedAt: new Date().toISOString() }
];

const DEFAULT_CATEGORIES = [
  { id: 'cat-onboarding', name: 'Onboarding', parentId: null },
  { id: 'cat-operations', name: 'Operations', parentId: null },
  { id: 'cat-operations-shipping', name: 'Shipping', parentId: 'cat-operations' },
  { id: 'cat-operations-inventory', name: 'Inventory', parentId: 'cat-operations' },
  { id: 'cat-support', name: 'Support', parentId: null },
  { id: 'cat-sales', name: 'Sales', parentId: null }
];

const DEFAULT_ORG_CHART = [
  { id: 'person-ceo', name: 'Jordan Lee', title: 'CEO', location: '', managerId: null, photo: null, goals: '', hobbies: '', interests: '' },
  { id: 'person-vp1', name: 'Sam Rivera', title: 'VP of Operations', location: '', managerId: 'person-ceo', photo: null, goals: '', hobbies: '', interests: '' },
  { id: 'person-vp2', name: 'Alex Chen', title: 'VP of Product', location: '', managerId: 'person-ceo', photo: null, goals: '', hobbies: '', interests: '' },
  { id: 'person-mgr1', name: 'Morgan Taylor', title: 'Operations Manager', location: '', managerId: 'person-vp1', photo: null, goals: '', hobbies: '', interests: '' },
  { id: 'person-mgr2', name: 'Casey Davis', title: 'Product Lead', location: '', managerId: 'person-vp2', photo: null, goals: '', hobbies: '', interests: '' }
];

const state = {
  sops: [],
  categories: [],
  orgChart: [],
  projects: [],
  tasks: [],
  currentView: 'list',
  currentFilter: 'all',
  currentSopId: null,
  currentProjectId: null,
  projectView: 'list',
  calendarMonth: null,
  searchQuery: '',
  modalParentId: null,
  editingTaskId: null,
  editingPersonId: null,
  personModalPhotoData: null,
  contentDocuments: [],
  currentContentId: null,
  currentPersonId: null,
  orgChartZoom: 1,
  orgChartPan: { x: 0, y: 0 },
  projectFilter: 'all'
};

// DOM refs
const el = {
  sidebar: document.getElementById('sidebar'),
  categoryList: document.getElementById('category-list'),
  listCategoryList: document.getElementById('list-category-list'),
  sidebarProjectList: document.getElementById('sidebar-project-list'),
  searchInput: document.getElementById('search-input'),
  sopCount: document.getElementById('sop-count'),
  listTitle: document.getElementById('list-title'),
  listSubtitle: document.getElementById('list-subtitle'),
  sopGrid: document.getElementById('sop-grid'),
  emptyState: document.getElementById('empty-state'),
  viewList: document.getElementById('view-list'),
  viewContent: document.getElementById('view-content'),
  viewContentDetail: document.getElementById('view-content-detail'),
  contentGrid: document.getElementById('content-grid'),
  contentDetailTitle: document.getElementById('content-detail-title'),
  contentDetailBody: document.getElementById('content-detail-body'),
  btnBackContent: document.getElementById('btn-back-content'),
  viewOrgchart: document.getElementById('view-orgchart'),
  orgchartTree: document.getElementById('orgchart-tree'),
  orgchartEmpty: document.getElementById('orgchart-empty'),
  orgchartCanvas: document.getElementById('orgchart-canvas'),
  orgchartCanvasInner: document.getElementById('orgchart-canvas-inner'),
  orgchartZoomUi: document.getElementById('orgchart-zoom-ui'),
  orgchartZoomPct: document.getElementById('orgchart-zoom-pct'),
  orgchartZoomOut: document.getElementById('orgchart-zoom-out'),
  orgchartZoomIn: document.getElementById('orgchart-zoom-in'),
  orgchartZoomFit: document.getElementById('orgchart-zoom-fit'),
  viewProjects: document.getElementById('view-projects'),
  viewMeetTeam: document.getElementById('view-meet-team'),
  meetTeamGrid: document.getElementById('meet-team-grid'),
  meetTeamEmpty: document.getElementById('meet-team-empty'),
  meetTeamListWrap: document.getElementById('meet-team-list-wrap'),
  viewMeetTeamDetail: document.getElementById('view-meet-team-detail'),
  meetTeamProfilePhoto: document.getElementById('meet-team-profile-photo'),
  meetTeamProfileName: document.getElementById('meet-team-profile-name'),
  meetTeamProfileTitle: document.getElementById('meet-team-profile-title'),
  meetTeamProfileGoals: document.getElementById('meet-team-profile-goals'),
  meetTeamProfileHobbies: document.getElementById('meet-team-profile-hobbies'),
  meetTeamProfileInterests: document.getElementById('meet-team-profile-interests'),
  btnBackMeetTeam: document.getElementById('btn-back-meet-team'),
  btnSaveMeetTeamProfile: document.getElementById('btn-save-meet-team-profile'),
  viewTeam: document.getElementById('view-team'),
  teamList: document.getElementById('team-list'),
  projectsGrid: document.getElementById('projects-grid'),
  projectsEmpty: document.getElementById('projects-empty'),
  viewProjectDetail: document.getElementById('view-project-detail'),
  projectDetailName: document.getElementById('project-detail-name'),
  projectDetailDesc: document.getElementById('project-detail-desc'),
  taskList: document.getElementById('task-list'),
  taskTableBody: document.getElementById('task-table-body'),
  taskListEmpty: document.getElementById('task-list-empty'),
  viewDetail: document.getElementById('view-detail'),
  btnAddPerson: document.getElementById('btn-add-person'),
  btnNewProject: document.getElementById('btn-new-project'),
  btnBackProject: document.getElementById('btn-back-project'),
  btnDeleteProject: document.getElementById('btn-delete-project'),
  btnAddTask: document.getElementById('btn-add-task'),
  modalProject: document.getElementById('modal-project'),
  modalProjectName: document.getElementById('modal-project-name'),
  modalProjectDesc: document.getElementById('modal-project-desc'),
  btnSaveProject: document.getElementById('btn-save-project'),
  modalTask: document.getElementById('modal-task'),
  modalTaskTitle: document.getElementById('modal-task-title'),
  modalTaskDue: document.getElementById('modal-task-due'),
  modalTaskPriority: document.getElementById('modal-task-priority'),
  modalTaskCollaborators: document.getElementById('modal-task-collaborators'),
  modalTaskTitleLabel: document.getElementById('modal-task-title-label'),
  modalTaskCompletedRow: document.getElementById('modal-task-completed-row'),
  modalTaskCompleted: document.getElementById('modal-task-completed'),
  btnSaveTask: document.getElementById('btn-save-task'),
  taskViewList: document.getElementById('task-view-list'),
  taskViewCalendar: document.getElementById('task-view-calendar'),
  calendarPrev: document.getElementById('calendar-prev'),
  calendarNext: document.getElementById('calendar-next'),
  calendarMonthTitle: document.getElementById('calendar-month-title'),
  calendarGrid: document.getElementById('calendar-grid'),
  calendarNoDateTasks: document.getElementById('calendar-no-date-tasks'),
  btnSidebarPrimary: document.getElementById('btn-sidebar-primary'),
  btnSidebarPrimaryLabel: document.getElementById('btn-sidebar-primary-label'),
  btnLogout: document.getElementById('btn-logout'),
  btnEmptyCta: document.getElementById('btn-empty-cta'),
  btnBack: document.getElementById('btn-back'),
  btnDeleteSop: document.getElementById('btn-delete-sop'),
  sopDetailTitle: document.getElementById('sop-detail-title'),
  sopDetailCategorySelect: document.getElementById('sop-detail-category-select'),
  sopDetailDate: document.getElementById('sop-detail-date'),
  sopDetailPurpose: document.getElementById('sop-detail-purpose'),
  sopDetailSteps: document.getElementById('sop-detail-steps'),
  sopDetailRoles: document.getElementById('sop-detail-roles'),
  sopDetailDecisions: document.getElementById('sop-detail-decisions'),
  sopDetailTools: document.getElementById('sop-detail-tools'),
  sopDetailLoom: document.getElementById('sop-detail-loom'),
  sopLoomEmbedWrap: document.getElementById('sop-loom-embed-wrap'),
  sopLoomEmbed: document.getElementById('sop-loom-embed'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalCategory: document.getElementById('modal-category'),
  modalCategoryTitle: document.getElementById('modal-category-title'),
  modalCategoryParent: document.getElementById('modal-category-parent'),
  modalCategoryInput: document.getElementById('modal-category-input'),
  btnSaveCategory: document.getElementById('btn-save-category'),
  modalPerson: document.getElementById('modal-person'),
  modalPersonName: document.getElementById('modal-person-name'),
  modalPersonTitle: document.getElementById('modal-person-title'),
  modalPersonLocation: document.getElementById('modal-person-location'),
  modalPersonTitleLabel: document.getElementById('modal-person-title-label'),
  modalPersonManager: document.getElementById('modal-person-manager'),
  modalPersonPhotoPreview: document.getElementById('modal-person-photo-preview'),
  modalPersonPhotoInput: document.getElementById('modal-person-photo-input'),
  modalPersonPhotoBtn: document.getElementById('modal-person-photo-btn'),
  modalPersonPhotoRemove: document.getElementById('modal-person-photo-remove'),
  btnSavePerson: document.getElementById('btn-save-person'),
  meetTeamPhotoInput: document.getElementById('meet-team-photo-input')
};

function loadFromStorage() {
  try {
    const sopsJson = localStorage.getItem(STORAGE_SOPS);
    const catJson = localStorage.getItem(STORAGE_CATEGORIES);
    if (sopsJson) state.sops = JSON.parse(sopsJson);
    if (catJson) {
      const parsed = JSON.parse(catJson);
      state.categories = Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'id' in parsed[0]
        ? parsed
        : migrateCategoriesFromStrings(parsed);
    } else {
      state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    }
    migrateSopsCategoryToId();
    state.sops.forEach(migrateSopStructure);
    const orgJson = localStorage.getItem(STORAGE_ORG_CHART);
    if (orgJson) {
      const parsed = JSON.parse(orgJson);
      state.orgChart = Array.isArray(parsed) && parsed.length > 0 ? parsed : JSON.parse(JSON.stringify(DEFAULT_ORG_CHART));
    } else {
      state.orgChart = JSON.parse(JSON.stringify(DEFAULT_ORG_CHART));
    }
    const projJson = localStorage.getItem(STORAGE_PROJECTS);
    if (projJson) state.projects = JSON.parse(projJson);
    const tasksJson = localStorage.getItem(STORAGE_TASKS);
    if (tasksJson) {
      state.tasks = JSON.parse(tasksJson);
      state.tasks.forEach(migrateTask);
    }
    const contentJson = localStorage.getItem(STORAGE_CONTENT);
    if (contentJson) {
      state.contentDocuments = JSON.parse(contentJson);
    } else {
      state.contentDocuments = JSON.parse(JSON.stringify(DEFAULT_CONTENT_DOCS));
    }
  } catch (e) {
    console.warn('Could not load from localStorage', e);
    if (!state.categories.length) state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    if (!state.contentDocuments || !state.contentDocuments.length) state.contentDocuments = JSON.parse(JSON.stringify(DEFAULT_CONTENT_DOCS));
    if (!state.orgChart || !state.orgChart.length) state.orgChart = JSON.parse(JSON.stringify(DEFAULT_ORG_CHART));
  }
}

function migrateCategoriesFromStrings(arr) {
  if (!Array.isArray(arr)) return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  return arr.map(name => ({ id: generateCatId(), name: String(name), parentId: null }));
}

function migrateSopsCategoryToId() {
  state.sops.forEach(sop => {
    if (sop.categoryId != null) return;
    if (typeof sop.category === 'string' && sop.category) {
      const cat = state.categories.find(c => c.name === sop.category);
      sop.categoryId = cat ? cat.id : null;
    } else {
      sop.categoryId = null;
    }
  });
}

function migrateSopStructure(sop) {
  if (sop.purpose === undefined) sop.purpose = '';
  if (sop.steps === undefined) sop.steps = sop.content || '';
  if (sop.rolesResponsibilities === undefined) sop.rolesResponsibilities = '';
  if (sop.decisionPoints === undefined) sop.decisionPoints = '';
  if (sop.toolsSystems === undefined) sop.toolsSystems = '';
  if (sop.loomVideoUrl === undefined) sop.loomVideoUrl = '';
}

function loomShareUrlToEmbedUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  const m = u.match(/loom\.com\/share\/([a-zA-Z0-9]+)/) || u.match(/loom\.com\/embed\/([a-zA-Z0-9]+)/);
  return m ? 'https://www.loom.com/embed/' + m[1] : '';
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_SOPS, JSON.stringify(state.sops));
    localStorage.setItem(STORAGE_CATEGORIES, JSON.stringify(state.categories));
    localStorage.setItem(STORAGE_ORG_CHART, JSON.stringify(state.orgChart));
    localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(state.projects));
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE_CONTENT, JSON.stringify(state.contentDocuments));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

function generateId() {
  return 'sop-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function generateContentId() {
  return 'content-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function showContentView() {
  state.currentView = 'content';
  state.currentContentId = null;
  el.viewList.classList.remove('view-active');
  el.viewDetail.classList.remove('view-active');
  if (el.viewOrgchart) el.viewOrgchart.classList.remove('view-active');
  if (el.viewTeam) el.viewTeam.classList.remove('view-active');
  if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('view-active');
  if (el.viewProjects) el.viewProjects.classList.remove('view-active');
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.add('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(n => n.classList.remove('active'));
  const btn = document.querySelector('.sidebar-nav .nav-item[data-view="content"]');
  if (btn) btn.classList.add('active');
  if (el.sidebar) {
    el.sidebar.classList.remove('show-categories');
    el.sidebar.classList.remove('show-projects-list');
  }
  renderContentView();
  updateSearchPlaceholder();
  updateTopbarCount();
  updateSidebarFooterButton();
}

function renderContentView() {
  if (!el.contentGrid) return;
  const q = (state.searchQuery || '').trim().toLowerCase();
  const byCategory = new Map();
  CONTENT_CATEGORIES.forEach(c => byCategory.set(c.id, []));
  state.contentDocuments.forEach(doc => {
    const match = !q || (doc.title || '').toLowerCase().includes(q) || (doc.content || '').toLowerCase().includes(q);
    if (match && byCategory.has(doc.categoryId)) byCategory.get(doc.categoryId).push(doc);
  });
  el.contentGrid.innerHTML = CONTENT_CATEGORIES.map(cat => {
    const docs = (byCategory.get(cat.id) || []).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return `
      <section class="content-category-section" data-content-category="${escapeAttr(cat.id)}">
        <div class="content-category-header">
          <h2 class="content-category-title">${escapeHtml(cat.name)}</h2>
          <button type="button" class="content-add-doc" data-content-category="${escapeAttr(cat.id)}" title="Add document">+ Add document</button>
        </div>
        <div class="content-doc-list">
          ${docs.length === 0 ? '<p class="content-empty-cat">No documents</p>' : docs.map(d => `
            <button type="button" class="content-doc-card" data-content-id="${escapeAttr(d.id)}">
              <span class="content-doc-card-title">${escapeHtml(d.title || 'Untitled')}</span>
              ${(d.content || '').trim().slice(0, 80) ? `<span class="content-doc-card-preview">${escapeHtml((d.content || '').trim().slice(0, 80))}…</span>` : ''}
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');
  el.contentGrid.querySelectorAll('.content-doc-card').forEach(btn => {
    btn.addEventListener('click', () => openContentDoc(btn.dataset.contentId));
  });
  el.contentGrid.querySelectorAll('.content-add-doc').forEach(btn => {
    btn.addEventListener('click', () => addContentDocument(btn.dataset.contentCategory));
  });
}

function addContentDocument(categoryId) {
  const cat = CONTENT_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return;
  const doc = {
    id: generateContentId(),
    title: 'Untitled',
    categoryId: cat.id,
    content: '',
    updatedAt: new Date().toISOString()
  };
  state.contentDocuments.push(doc);
  saveToStorage();
  renderContentView();
  openContentDoc(doc.id);
}

function openContentDoc(id) {
  const doc = state.contentDocuments.find(d => d.id === id);
  if (!doc || !el.viewContent || !el.viewContentDetail) return;
  state.currentContentId = id;
  el.viewContent.classList.remove('view-active');
  el.viewContentDetail.classList.add('view-active');
  if (el.contentDetailTitle) el.contentDetailTitle.value = doc.title || '';
  if (el.contentDetailBody) el.contentDetailBody.value = doc.content || '';
}

function showContentDetailView() {
  if (el.viewContent) el.viewContent.classList.remove('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.add('view-active');
}

function backToContentView() {
  saveContentDoc();
  state.currentContentId = null;
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.add('view-active');
  renderContentView();
}

function saveContentDoc() {
  if (!state.currentContentId) return;
  const doc = state.contentDocuments.find(d => d.id === state.currentContentId);
  if (!doc) return;
  doc.title = (el.contentDetailTitle && el.contentDetailTitle.value) ? el.contentDetailTitle.value.trim() : 'Untitled';
  doc.content = el.contentDetailBody ? el.contentDetailBody.value : '';
  doc.updatedAt = new Date().toISOString();
  saveToStorage();
}

function getCategoryById(id) {
  return state.categories.find(c => c.id === id);
}

function getCategoryPath(id) {
  if (!id) return '';
  const parts = [];
  let c = getCategoryById(id);
  while (c) {
    parts.unshift(c.name);
    c = c.parentId ? getCategoryById(c.parentId) : null;
  }
  return parts.join(' › ');
}

function getDescendantIds(id) {
  const ids = [id];
  state.categories.filter(c => c.parentId === id).forEach(c => {
    ids.push(c.id, ...getDescendantIds(c.id));
  });
  return ids;
}

function buildCategoryTree() {
  const byParent = new Map();
  byParent.set(null, []);
  state.categories.forEach(c => {
    const pid = c.parentId || null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid).push(c);
  });
  byParent.get(null).sort((a, b) => a.name.localeCompare(b.name));
  state.categories.forEach(c => {
    const kids = byParent.get(c.id);
    if (kids) kids.sort((a, b) => a.name.localeCompare(b.name));
  });
  return byParent;
}

function getFilteredSops() {
  let list = state.sops;
  if (state.currentFilter !== 'all') {
    const ids = getDescendantIds(state.currentFilter);
    list = list.filter(s => s.categoryId && ids.includes(s.categoryId));
  }
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    const match = (s) =>
      s.title.toLowerCase().includes(q) ||
      (s.purpose && s.purpose.toLowerCase().includes(q)) ||
      (s.steps && s.steps.toLowerCase().includes(q)) ||
      (s.rolesResponsibilities && s.rolesResponsibilities.toLowerCase().includes(q)) ||
      (s.decisionPoints && s.decisionPoints.toLowerCase().includes(q)) ||
      (s.toolsSystems && s.toolsSystems.toLowerCase().includes(q)) ||
      (s.content && s.content.toLowerCase().includes(q));
    list = list.filter(match);
  }
  return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getFilteredProjects() {
  let list = state.projects;
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    list = list.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }
  const filter = state.projectFilter || 'all';
  if (filter === 'all') return list;
  return list.filter(proj => {
    const tasks = state.tasks.filter(t => t.projectId === proj.id);
    const doneCount = tasks.filter(t => t.completed).length;
    const taskCount = tasks.length;
    const isComplete = taskCount > 0 && doneCount === taskCount;
    if (filter === 'complete') return isComplete;
    if (filter === 'incomplete') return !isComplete;
    return true;
  });
}

function updateSearchPlaceholder() {
  if (!el.searchInput) return;
  if (state.currentView === 'content') el.searchInput.placeholder = 'Search content...';
  else if (state.currentView === 'projects') el.searchInput.placeholder = 'Search projects...';
  else el.searchInput.placeholder = 'Search SOPs...';
}

function updateTopbarCount() {
  if (!el.sopCount) return;
  if (state.currentView === 'projects') {
    const list = getFilteredProjects();
    el.sopCount.textContent = `${list.length} project${list.length !== 1 ? 's' : ''}`;
  } else if (state.currentView === 'content') {
    const list = state.contentDocuments || [];
    const q = (state.searchQuery || '').trim().toLowerCase();
    const filtered = q ? list.filter(d => (d.title || '').toLowerCase().includes(q) || (d.content || '').toLowerCase().includes(q)) : list;
    el.sopCount.textContent = `${filtered.length} document${filtered.length !== 1 ? 's' : ''}`;
  } else {
    const list = state.currentFilter === 'all' ? [] : getFilteredSops();
    el.sopCount.textContent = `${list.length} SOP${list.length !== 1 ? 's' : ''}`;
  }
}

function renderCategories() {
  const byParent = buildCategoryTree();
  const topLevel = byParent.get(null) || [];

  function renderItem(cat, isSub) {
    const children = byParent.get(cat.id) || [];
    const hasChildren = children.length > 0;
    const subClass = isSub ? ' nav-item-sub' : '';
    return `
      <li class="category-item">
        <div class="category-row">
          <button type="button" class="nav-item${subClass}" data-category-id="${escapeAttr(cat.id)}">
            <span class="nav-icon">${isSub ? '📄' : '📁'}</span>
            <span>${escapeHtml(cat.name)}</span>
          </button>
          <button type="button" class="btn-icon btn-add-sub" title="Add subcategory" data-parent-id="${escapeAttr(cat.id)}">+</button>
          <button type="button" class="btn-icon btn-delete-cat" title="Remove category" data-category-id="${escapeAttr(cat.id)}">×</button>
        </div>
        ${hasChildren ? `<ul class="category-list category-sublist">${children.map(c => renderItem(c, true)).join('')}</ul>` : ''}
      </li>
    `;
  }

  el.categoryList.innerHTML = topLevel.map(c => renderItem(c, false)).join('');
  attachCategoryListHandlers(el.categoryList, true);
  renderListCategories();
}

function attachCategoryListHandlers(container, updateSidebarActive) {
  if (!container) return;
  container.querySelectorAll('.nav-item[data-category-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.btn-add-sub') || e.target.closest('.btn-delete-cat')) return;
      if (updateSidebarActive) {
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
      }
      document.querySelectorAll('#list-category-list .nav-item[data-category-id]').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.categoryId;
      state.currentView = 'list';
      renderList();
      updateListHeader();
    });
  });
  container.querySelectorAll('.btn-add-sub').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCategoryModal(btn.dataset.parentId);
    });
  });
  container.querySelectorAll('.btn-delete-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCategory(btn.dataset.categoryId);
    });
  });
}

function renderListCategories() {
  if (!el.listCategoryList) return;
  const byParent = buildCategoryTree();
  const topLevel = byParent.get(null) || [];

  function renderItem(cat, isSub) {
    const children = byParent.get(cat.id) || [];
    const hasChildren = children.length > 0;
    const subClass = isSub ? ' nav-item-sub' : '';
    const activeClass = state.currentFilter === cat.id ? ' active' : '';
    return `
      <li class="category-item">
        <div class="category-row">
          <button type="button" class="nav-item${subClass}${activeClass}" data-category-id="${escapeAttr(cat.id)}">
            <span class="nav-icon">${isSub ? '📄' : '📁'}</span>
            <span>${escapeHtml(cat.name)}</span>
          </button>
          <button type="button" class="btn-icon btn-add-sub" title="Add subcategory" data-parent-id="${escapeAttr(cat.id)}">+</button>
          <button type="button" class="btn-icon btn-delete-cat" title="Remove category" data-category-id="${escapeAttr(cat.id)}">×</button>
        </div>
        ${hasChildren ? `<ul class="category-list category-sublist">${children.map(c => renderItem(c, true)).join('')}</ul>` : ''}
      </li>
    `;
  }

  el.listCategoryList.innerHTML = topLevel.map(c => renderItem(c, false)).join('');
  attachCategoryListHandlers(el.listCategoryList, false);
}

function deleteCategory(catId) {
  const path = getCategoryPath(catId);
  const idsToRemove = getDescendantIds(catId);
  const subCount = idsToRemove.length - 1;
  const sopCount = state.sops.filter(s => s.categoryId && idsToRemove.includes(s.categoryId)).length;
  let msg = `Remove "${path}"?`;
  if (subCount > 0) msg += ` This will also remove ${subCount} subcategor${subCount === 1 ? 'y' : 'ies'}.`;
  if (sopCount > 0) msg += ` ${sopCount} SOP${sopCount === 1 ? '' : 's'} in this categor${sopCount === 1 ? 'y' : 'ies'} will become Uncategorized.`;
  if (!confirm(msg)) return;
  state.categories = state.categories.filter(c => !idsToRemove.includes(c.id));
  state.sops.forEach(sop => {
    if (sop.categoryId && idsToRemove.includes(sop.categoryId)) sop.categoryId = null;
  });
  if (idsToRemove.includes(state.currentFilter)) {
    state.currentFilter = 'all';
    document.querySelectorAll('.sidebar-nav .nav-item[data-view="all"]').forEach(n => n.classList.add('active'));
    document.querySelectorAll('.sidebar-nav .nav-item[data-category-id]').forEach(n => n.classList.remove('active'));
  }
  saveToStorage();
  renderCategories();
  renderListCategories();
  renderList();
  updateListHeader();
}

function resizeImageToDataUrl(file, maxSize) {
  maxSize = maxSize || 300;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.width;
      const h = img.height;
      let tw = w;
      let th = h;
      if (w > maxSize || h > maxSize) {
        if (w > h) {
          tw = maxSize;
          th = Math.round((h * maxSize) / w);
        } else {
          th = maxSize;
          tw = Math.round((w * maxSize) / h);
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, tw, th);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function escapeAttr(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML.replace(/"/g, '&quot;');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function updateListHeader() {
  const countEl = document.getElementById('list-sop-count');
  if (state.currentFilter === 'all') {
    el.listTitle.textContent = 'SOP';
    el.listSubtitle.textContent = 'Standard operating procedures — pick a category to browse or create new ones.';
    if (countEl) { countEl.textContent = ''; countEl.classList.remove('visible'); }
  } else {
    const path = getCategoryPath(state.currentFilter);
    const count = getFilteredSops().length;
    el.listTitle.textContent = path || 'Category';
    el.listSubtitle.textContent = state.searchQuery.trim()
      ? `${count} result${count !== 1 ? 's' : ''} for "${state.searchQuery}"`
      : `${count} SOP${count !== 1 ? 's' : ''} in this category`;
    if (countEl) {
      countEl.textContent = count + ' SOP' + (count !== 1 ? 's' : '');
      countEl.classList.add('visible');
    }
  }
}

function renderList() {
  if (state.currentView === 'list') updateTopbarCount();

  if (state.currentFilter === 'all') {
    el.sopGrid.innerHTML = '';
    el.emptyState.classList.add('visible');
    const titleEl = el.emptyState.querySelector('.empty-state-title');
    const descEl = el.emptyState.querySelector('.empty-state-desc');
    if (titleEl) titleEl.textContent = 'Choose a category';
    if (descEl) descEl.textContent = 'Select a category on the right to see SOPs in that area.';
    if (el.emptyState.querySelector('.btn-empty-cta')) el.emptyState.querySelector('.btn-empty-cta').style.display = 'none';
    return;
  }

  const list = getFilteredSops();
  if (list.length === 0) {
    el.sopGrid.innerHTML = '';
    el.emptyState.classList.add('visible');
    const titleEl = el.emptyState.querySelector('.empty-state-title');
    const descEl = el.emptyState.querySelector('.empty-state-desc');
    if (titleEl) titleEl.textContent = 'No SOPs in this category';
    if (descEl) descEl.textContent = 'Create an SOP and assign it to this category to get started.';
    if (el.emptyState.querySelector('.btn-empty-cta')) el.emptyState.querySelector('.btn-empty-cta').style.display = '';
    return;
  }

  el.emptyState.classList.remove('visible');
  el.sopGrid.innerHTML = list.map(sop => {
    const previewSource = sop.purpose || sop.steps || sop.content || '';
    const preview = previewSource.slice(0, 140).trim();
    const date = formatDate(sop.updatedAt);
    const categoryPath = getCategoryPath(sop.categoryId);
    return `
      <div class="sop-card" data-id="${escapeAttr(sop.id)}" role="button" tabindex="0">
        <div class="sop-card-accent"></div>
        <div class="sop-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div class="sop-card-body">
          <h3 class="sop-card-title">${escapeHtml(sop.title)}</h3>
          ${preview ? `<p class="sop-card-preview">${escapeHtml(preview)}</p>` : '<p class="sop-card-preview sop-card-preview-empty">No content yet</p>'}
          <div class="sop-card-meta">
            ${categoryPath ? `<span class="sop-card-category">${escapeHtml(categoryPath)}</span>` : ''}
            <span class="sop-card-date">${escapeHtml(date)}</span>
          </div>
          <span class="sop-card-action">View →</span>
        </div>
      </div>
    `;
  }).join('');

  el.sopGrid.querySelectorAll('.sop-card').forEach(card => {
    card.addEventListener('click', () => openSop(card.dataset.id));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSop(card.dataset.id); } });
  });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return 'Updated today';
  if (diff < 172800000) return 'Updated yesterday';
  if (diff < 604800000) return `Updated ${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString();
}

function fillCategorySelect(selectEl, selectedId) {
  const byParent = buildCategoryTree();
  const options = ['<option value="">Uncategorized</option>'];
  function addOptions(parentId, prefix) {
    const children = byParent.get(parentId) || [];
    children.forEach(c => {
      const label = prefix ? prefix + ' › ' + c.name : c.name;
      options.push(`<option value="${escapeAttr(c.id)}"${c.id === selectedId ? ' selected' : ''}>${escapeHtml(label)}</option>`);
      addOptions(c.id, label);
    });
  }
  addOptions(null, '');
  selectEl.innerHTML = options.join('');
}

function openSop(id) {
  state.currentSopId = id;
  state.currentView = 'detail';
  const sop = state.sops.find(s => s.id === id);
  if (!sop) return;
  migrateSopStructure(sop);

  el.sopDetailTitle.value = sop.title;
  fillCategorySelect(el.sopDetailCategorySelect, sop.categoryId || '');
  el.sopDetailDate.textContent = 'Updated ' + formatDate(sop.updatedAt);
  el.sopDetailPurpose.value = sop.purpose || '';
  el.sopDetailSteps.value = sop.steps || '';
  el.sopDetailRoles.value = sop.rolesResponsibilities || '';
  el.sopDetailDecisions.value = sop.decisionPoints || '';
  el.sopDetailTools.value = sop.toolsSystems || '';
  if (el.sopDetailLoom) el.sopDetailLoom.value = sop.loomVideoUrl || '';
  if (el.sopLoomEmbedWrap && el.sopLoomEmbed) {
    const embedSrc = loomShareUrlToEmbedUrl(sop.loomVideoUrl || '');
    if (embedSrc) {
      el.sopLoomEmbed.src = embedSrc;
      el.sopLoomEmbedWrap.style.display = 'block';
    } else {
      el.sopLoomEmbed.src = '';
      el.sopLoomEmbedWrap.style.display = 'none';
    }
  }

  el.viewList.classList.remove('view-active');
  if (el.viewOrgchart) el.viewOrgchart.classList.remove('view-active');
  if (el.viewProjects) el.viewProjects.classList.remove('view-active');
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  el.viewDetail.classList.add('view-active');
}

function saveCurrentSop() {
  if (!state.currentSopId) return;
  const sop = state.sops.find(s => s.id === state.currentSopId);
  if (!sop) return;
  sop.title = el.sopDetailTitle.value.trim() || 'Untitled SOP';
  sop.purpose = (el.sopDetailPurpose && el.sopDetailPurpose.value) ? el.sopDetailPurpose.value : '';
  sop.steps = (el.sopDetailSteps && el.sopDetailSteps.value) ? el.sopDetailSteps.value : '';
  sop.rolesResponsibilities = (el.sopDetailRoles && el.sopDetailRoles.value) ? el.sopDetailRoles.value : '';
  sop.decisionPoints = (el.sopDetailDecisions && el.sopDetailDecisions.value) ? el.sopDetailDecisions.value : '';
  sop.toolsSystems = (el.sopDetailTools && el.sopDetailTools.value) ? el.sopDetailTools.value : '';
  sop.loomVideoUrl = (el.sopDetailLoom && el.sopDetailLoom.value) ? el.sopDetailLoom.value.trim() : '';
  sop.categoryId = el.sopDetailCategorySelect.value || null;
  sop.updatedAt = new Date().toISOString();
  saveToStorage();
  el.sopDetailDate.textContent = 'Updated ' + formatDate(sop.updatedAt);
  if (el.sopLoomEmbedWrap && el.sopLoomEmbed) {
    const embedSrc = loomShareUrlToEmbedUrl(sop.loomVideoUrl || '');
    if (embedSrc) {
      el.sopLoomEmbed.src = embedSrc;
      el.sopLoomEmbedWrap.style.display = 'block';
    } else {
      el.sopLoomEmbed.src = '';
      el.sopLoomEmbedWrap.style.display = 'none';
    }
  }
}

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function showList() {
  state.currentView = 'list';
  state.currentSopId = null;
  document.body.classList.remove('orgchart-view');
  el.viewDetail.classList.remove('view-active');
  if (el.viewOrgchart) el.viewOrgchart.classList.remove('view-active');
  if (el.viewTeam) el.viewTeam.classList.remove('view-active');
  if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.remove('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  if (el.viewProjects) el.viewProjects.classList.remove('view-active');
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  el.viewList.classList.add('view-active');
  if (el.sidebar) {
    el.sidebar.classList.add('show-categories');
    el.sidebar.classList.remove('show-projects-list');
  }
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(n => n.classList.remove('active'));
  const allBtn = document.querySelector('.sidebar-nav .nav-item[data-view="all"]');
  if (allBtn) allBtn.classList.add('active');
  updateSearchPlaceholder();
  renderList();
  updateListHeader();
  updateTopbarCount();
  updateSidebarFooterButton();
}

function createSop() {
  const categoryId = state.currentFilter !== 'all' ? state.currentFilter : (state.categories[0]?.id || null);
  const sop = {
    id: generateId(),
    title: 'Untitled SOP',
    purpose: '',
    steps: '',
    rolesResponsibilities: '',
    decisionPoints: '',
    toolsSystems: '',
    loomVideoUrl: '',
    categoryId: categoryId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.sops.push(sop);
  saveToStorage();
  openSop(sop.id);
  renderList();
  updateListHeader();
}

function deleteCurrentSop() {
  if (!state.currentSopId) return;
  if (!confirm('Delete this SOP? This cannot be undone.')) return;
  state.sops = state.sops.filter(s => s.id !== state.currentSopId);
  saveToStorage();
  state.currentSopId = null;
  showList();
}

function openCategoryModal(parentId) {
  state.modalParentId = parentId || null;
  el.modalCategoryInput.value = '';
  el.modalCategoryTitle.textContent = parentId ? 'New subcategory' : 'New category';

  const byParent = buildCategoryTree();
  const parentOptions = ['<option value="">— Top level —</option>'];
  function addOptions(pid, prefix) {
    (byParent.get(pid) || []).forEach(c => {
      const label = prefix ? prefix + ' › ' + c.name : c.name;
      parentOptions.push(`<option value="${escapeAttr(c.id)}"${c.id === parentId ? ' selected' : ''}>${escapeHtml(label)}</option>`);
      addOptions(c.id, label);
    });
  }
  addOptions(null, '');
  el.modalCategoryParent.innerHTML = parentOptions.join('');
  el.modalCategoryParent.value = parentId || '';
  el.modalCategoryParent.style.display = parentId ? 'none' : 'block';
  const label = document.getElementById('modal-parent-label');
  if (label) label.style.display = parentId ? 'none' : 'block';

  el.modalOverlay.classList.add('visible');
  el.modalCategory.classList.add('visible');
  el.modalCategoryInput.focus();
}

function closeCategoryModal() {
  el.modalOverlay.classList.remove('visible');
  el.modalCategory.classList.remove('visible');
  state.modalParentId = null;
}

function generatePersonId() {
  return 'person-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function generateProjectId() {
  return 'project-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function generateTaskId() {
  return 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

// —— Org chart (from scratch) ——
function orgChartSortPeople(a, b) {
  const nameA = (a.name || '').trim();
  const nameB = (b.name || '').trim();
  if (nameA === 'Daniel Palacios' && nameB !== 'Daniel Palacios') return -1;
  if (nameA !== 'Daniel Palacios' && nameB === 'Daniel Palacios') return 1;
  return nameA.localeCompare(nameB);
}

function buildOrgTree() {
  const byManager = new Map();
  byManager.set(null, []);
  state.orgChart.forEach(p => {
    const mid = p.managerId || null;
    if (!byManager.has(mid)) byManager.set(mid, []);
    byManager.get(mid).push(p);
  });
  const roots = byManager.get(null) || [];
  roots.sort(orgChartSortPeople);
  state.orgChart.forEach(p => {
    const kids = byManager.get(p.id);
    if (kids) kids.sort(orgChartSortPeople);
  });
  return byManager;
}

function renderOrgChart() {
  if (!el.orgchartTree || !el.orgchartEmpty) return;
  const byManager = buildOrgTree();
  const roots = byManager.get(null) || [];

  function renderRow(siblings, isChildRow) {
    if (!siblings.length) return '';
    return `
      <div class="orgchart-row">
        ${siblings.map(person => {
          const children = byManager.get(person.id) || [];
          const name = escapeHtml(person.name || 'Unnamed');
          const title = escapeHtml(person.title || '');
          const location = escapeHtml(person.location || '');
          return `
            <div class="orgchart-cell">
              ${isChildRow ? '<div class="orgchart-connector-v orgchart-connector-to-card"></div>' : ''}
              <div class="orgchart-node-card" data-person-id="${escapeAttr(person.id)}">
                <div class="orgchart-node-card-content">
                  <strong class="orgchart-node-name">${name}</strong>
                  ${title ? `<span class="orgchart-node-title">${title}</span>` : ''}
                  ${location ? `<span class="orgchart-node-location">${location}</span>` : ''}
                </div>
                <div class="orgchart-node-card-actions">
                  <button type="button" class="btn-icon orgchart-person-add-report" title="Add report" data-person-id="${escapeAttr(person.id)}">+</button>
                  <button type="button" class="btn-icon orgchart-person-edit" title="Edit" data-person-id="${escapeAttr(person.id)}">✎</button>
                  <button type="button" class="btn-icon orgchart-person-delete" title="Remove" data-person-id="${escapeAttr(person.id)}">×</button>
                </div>
              </div>
              ${children.length ? `
                <div class="orgchart-connector-v orgchart-connector-from-card"></div>
                <div class="orgchart-children">
                  <div class="orgchart-connector-h"></div>
                  ${renderRow(children, true)}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  if (roots.length === 0) {
    el.orgchartTree.innerHTML = '';
    el.orgchartEmpty.classList.add('visible');
    if (el.orgchartCanvas) el.orgchartCanvas.style.display = 'none';
    if (el.orgchartZoomUi) el.orgchartZoomUi.style.display = 'none';
    return;
  }
  el.orgchartEmpty.classList.remove('visible');
  if (el.orgchartCanvas) el.orgchartCanvas.style.display = '';
  if (el.orgchartZoomUi) el.orgchartZoomUi.style.display = '';
  el.orgchartTree.innerHTML = renderRow(roots);
  applyOrgChartTransform();
}

const ORG_ZOOM_MIN = 0.25;
const ORG_ZOOM_MAX = 2;
const ORG_ZOOM_STEP = 0.25;

function applyOrgChartTransform() {
  if (!el.orgchartCanvasInner) return;
  const { x, y } = state.orgChartPan;
  const s = state.orgChartZoom;
  el.orgchartCanvasInner.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  if (el.orgchartZoomPct) el.orgchartZoomPct.textContent = Math.round(s * 100) + '%';
}

function setOrgChartZoomAt(clientX, clientY, newZoom) {
  const wrap = el.orgchartCanvas;
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const viewX = clientX - rect.left;
  const viewY = clientY - rect.top;
  const { x, y } = state.orgChartPan;
  const oldZoom = state.orgChartZoom;
  const contentX = (viewX - x) / oldZoom;
  const contentY = (viewY - y) / oldZoom;
  state.orgChartZoom = Math.max(ORG_ZOOM_MIN, Math.min(ORG_ZOOM_MAX, newZoom));
  state.orgChartPan.x = viewX - contentX * state.orgChartZoom;
  state.orgChartPan.y = viewY - contentY * state.orgChartZoom;
  applyOrgChartTransform();
}

function setOrgChartZoomCenter(newZoom) {
  const wrap = el.orgchartCanvas;
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const viewX = rect.width / 2;
  const viewY = rect.height / 2;
  setOrgChartZoomAt(rect.left + viewX, rect.top + viewY, newZoom);
}

function fitOrgChartToView() {
  const wrap = el.orgchartCanvas;
  const tree = el.orgchartTree;
  if (!wrap || !tree || !tree.firstElementChild) return;
  const wrapW = wrap.clientWidth;
  const wrapH = wrap.clientHeight;
  const treeW = tree.offsetWidth;
  const treeH = tree.offsetHeight;
  if (treeW <= 0 || treeH <= 0) return;
  const padding = 48;
  const scaleX = (wrapW - padding * 2) / treeW;
  const scaleY = (wrapH - padding * 2) / treeH;
  const s = Math.max(ORG_ZOOM_MIN, Math.min(ORG_ZOOM_MAX, Math.min(scaleX, scaleY, 1)));
  state.orgChartZoom = s;
  state.orgChartPan.x = wrapW / 2 - (treeW * s) / 2;
  state.orgChartPan.y = wrapH / 2 - (treeH * s) / 2;
  applyOrgChartTransform();
}

function deletePerson(personId) {
  const person = state.orgChart.find(p => p.id === personId);
  const name = person ? (person.name || 'Unnamed') : 'this person';
  if (!confirm(`Remove ${name} from the org chart? Their direct reports will move to the top level.`)) return;
  state.orgChart = state.orgChart.filter(p => p.id !== personId);
  state.orgChart.forEach(p => {
    if (p.managerId === personId) p.managerId = null;
  });
  saveToStorage();
  renderOrgChart();
}

function updateSidebarFooterButton() {
  const btn = el.btnSidebarPrimary;
  const label = el.btnSidebarPrimaryLabel;
  if (!btn) return;
  if (state.currentView === 'orgchart' || state.currentView === 'team' || state.currentView === 'meet-team' || state.currentView === 'content') {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  if (state.currentView === 'projects') {
    if (label) label.textContent = 'New Project';
  } else {
    if (label) label.textContent = 'New SOP';
  }
}

  function showOrgChartView() {
  state.currentView = 'orgchart';
  document.body.classList.add('orgchart-view');
  el.viewList.classList.remove('view-active');
  el.viewDetail.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.remove('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  if (el.viewTeam) el.viewTeam.classList.remove('view-active');
  if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('view-active');
  if (el.viewProjects) el.viewProjects.classList.remove('view-active');
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  if (el.viewOrgchart) el.viewOrgchart.classList.add('view-active');
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(n => n.classList.remove('active'));
  const orgBtn = document.querySelector('.sidebar-nav .nav-item[data-view="orgchart"]');
  if (orgBtn) orgBtn.classList.add('active');
  renderOrgChart();
  requestAnimationFrame(() => {
    if (state.orgChart.length > 0 && el.orgchartCanvas) fitOrgChartToView();
  });
  updateSidebarFooterButton();
}

function getPersonName(id) {
  const p = state.orgChart.find(x => x.id === id);
  return p ? (p.name || 'Unnamed') : '';
}

function migrateTask(task) {
  if (task.priority === undefined) task.priority = 'medium';
  if (task.collaborators === undefined) {
    task.collaborators = task.assigneeId ? [task.assigneeId] : [];
  }
}

function renderProjectsList() {
  if (!el.projectsGrid || !el.projectsEmpty) return;
  const list = getFilteredProjects();
  if (list.length === 0) {
    el.projectsGrid.innerHTML = '';
    el.projectsEmpty.classList.add('visible');
    updateTopbarCount();
    return;
  }
  el.projectsEmpty.classList.remove('visible');
  el.projectsGrid.innerHTML = list.map(proj => {
    const taskCount = state.tasks.filter(t => t.projectId === proj.id).length;
    const doneCount = state.tasks.filter(t => t.projectId === proj.id && t.completed).length;
    return `
      <div class="project-card" data-project-id="${escapeAttr(proj.id)}">
        <h3 class="project-card-name">${escapeHtml(proj.name || 'Unnamed project')}</h3>
        ${proj.description ? `<p class="project-card-desc">${escapeHtml(proj.description)}</p>` : ''}
        <div class="project-card-meta">${doneCount}/${taskCount} tasks</div>
      </div>
    `;
  }).join('');
  el.projectsGrid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => openProject(card.dataset.projectId));
  });
  updateTopbarCount();
}

function renderSidebarProjects() {
  if (!el.sidebarProjectList) return;
  const items = ['<li><button type="button" class="nav-item" data-sidebar-project="">All projects</button></li>'];
  state.projects.forEach(proj => {
    const active = state.currentProjectId === proj.id ? ' active' : '';
    items.push(`<li><button type="button" class="nav-item${active}" data-sidebar-project="${escapeAttr(proj.id)}">${escapeHtml(proj.name || 'Unnamed')}</button></li>`);
  });
  el.sidebarProjectList.innerHTML = items.join('');
  el.sidebarProjectList.querySelectorAll('[data-sidebar-project]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sidebarProject || '';
      if (!id) {
        state.currentProjectId = null;
        el.viewProjectDetail && el.viewProjectDetail.classList.remove('view-active');
        el.viewProjects && el.viewProjects.classList.add('view-active');
        renderProjectsList();
      } else {
        openProject(id);
      }
      renderSidebarProjects();
    });
  });
}

function showProjectsView() {
  state.currentView = 'projects';
  state.currentProjectId = null;
  el.viewList.classList.remove('view-active');
  el.viewDetail.classList.remove('view-active');
  if (el.viewOrgchart) el.viewOrgchart.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.remove('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  if (el.viewTeam) el.viewTeam.classList.remove('view-active');
  if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('view-active');
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  if (el.viewProjects) {
    el.viewProjects.classList.add('view-active');
    el.viewProjects.querySelectorAll('.project-filter-btn').forEach(b => {
      b.classList.toggle('active', (b.dataset.projectFilter || '') === (state.projectFilter || 'all'));
    });
  }
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(n => n.classList.remove('active'));
  const btn = document.querySelector('.sidebar-nav .nav-item[data-view="projects"]');
  if (btn) btn.classList.add('active');
  updateSearchPlaceholder();
  renderProjectsList();
  renderSidebarProjects();
}

function showMeetTeamView() {
  state.currentView = 'meet-team';
  state.currentPersonId = null;
  el.viewList.classList.remove('view-active');
  el.viewDetail.classList.remove('view-active');
  if (el.viewOrgchart) el.viewOrgchart.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.remove('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  if (el.viewProjects) el.viewProjects.classList.remove('view-active');
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  if (el.viewTeam) el.viewTeam.classList.remove('view-active');
  if (el.viewMeetTeam) el.viewMeetTeam.classList.add('view-active');
  if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('showing-detail');
  if (el.meetTeamListWrap) el.meetTeamListWrap.style.display = '';
  if (el.viewMeetTeamDetail) el.viewMeetTeamDetail.classList.remove('visible');
  document.body.classList.remove('orgchart-view');
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(n => n.classList.remove('active'));
  const btn = document.querySelector('.sidebar-nav .nav-item[data-view="meet-team"]');
  if (btn) btn.classList.add('active');
  if (el.sidebar) {
    el.sidebar.classList.remove('show-categories');
    el.sidebar.classList.remove('show-projects-list');
  }
  renderMeetTeamView();
  updateSidebarFooterButton();
}

function openMeetTeamPerson(personId) {
  const person = state.orgChart.find(p => p.id === personId);
  if (!person) return;
  state.currentPersonId = personId;
  if (el.meetTeamListWrap) el.meetTeamListWrap.style.display = 'none';
  if (el.viewMeetTeamDetail) el.viewMeetTeamDetail.classList.add('visible');
  renderMeetTeamProfile();
}

function backToMeetTeamList() {
  saveMeetTeamProfile();
  state.currentPersonId = null;
  if (el.meetTeamListWrap) el.meetTeamListWrap.style.display = '';
  if (el.viewMeetTeamDetail) el.viewMeetTeamDetail.classList.remove('visible');
  renderMeetTeamView();
}

function renderMeetTeamProfile() {
  const person = state.orgChart.find(p => p.id === state.currentPersonId);
  if (!person) return;
  if (el.meetTeamProfileName) el.meetTeamProfileName.textContent = person.name || 'Unnamed';
  if (el.meetTeamProfileTitle) {
    el.meetTeamProfileTitle.textContent = person.title || '';
    el.meetTeamProfileTitle.style.display = person.title ? '' : 'none';
  }
  if (el.meetTeamProfilePhoto) {
    el.meetTeamProfilePhoto.innerHTML = '';
    if (person.photo && String(person.photo).startsWith('data:')) {
      const img = document.createElement('img');
      img.src = person.photo;
      img.alt = '';
      img.className = 'meet-team-profile-photo-img';
      el.meetTeamProfilePhoto.appendChild(img);
    } else {
      el.meetTeamProfilePhoto.innerHTML = '<svg class="meet-team-profile-placeholder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    }
  }
  if (el.meetTeamProfileGoals) el.meetTeamProfileGoals.value = person.goals || '';
  if (el.meetTeamProfileHobbies) el.meetTeamProfileHobbies.value = person.hobbies || '';
  if (el.meetTeamProfileInterests) el.meetTeamProfileInterests.value = person.interests || '';
}

function saveMeetTeamProfile() {
  const person = state.orgChart.find(p => p.id === state.currentPersonId);
  if (!person) return;
  if (el.meetTeamProfileGoals) person.goals = el.meetTeamProfileGoals.value.trim() || '';
  if (el.meetTeamProfileHobbies) person.hobbies = el.meetTeamProfileHobbies.value.trim() || '';
  if (el.meetTeamProfileInterests) person.interests = el.meetTeamProfileInterests.value.trim() || '';
  saveToStorage();
}

function renderMeetTeamView() {
  if (!el.meetTeamGrid || !el.meetTeamEmpty) return;
  const people = [...state.orgChart].sort((a, b) => {
    const na = (a.name || '').trim();
    const nb = (b.name || '').trim();
    if (na === 'Daniel Palacios' && nb !== 'Daniel Palacios') return -1;
    if (na !== 'Daniel Palacios' && nb === 'Daniel Palacios') return 1;
    return na.localeCompare(nb);
  });
  const placeholderSvg = '<svg class="meet-team-placeholder-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
  if (people.length === 0) {
    el.meetTeamGrid.innerHTML = '';
    el.meetTeamEmpty.classList.add('visible');
    return;
  }
  el.meetTeamEmpty.classList.remove('visible');
  el.meetTeamGrid.innerHTML = people.map(p => {
    const name = escapeHtml(p.name || 'Unnamed');
    const title = escapeHtml(p.title || '');
    const hasPhoto = p.photo && String(p.photo).startsWith('data:');
    const photoContent = hasPhoto
      ? `<img class="meet-team-card-img" data-photo-src="" alt="" />`
      : placeholderSvg;
    return `
      <div class="meet-team-card">
        <button type="button" class="meet-team-card-photo meet-team-card-photo-btn" data-person-id="${escapeAttr(p.id)}" title="Upload photo">
          ${photoContent}
          <span class="meet-team-photo-hint">${hasPhoto ? 'Change photo' : 'Add photo'}</span>
        </button>
        <button type="button" class="meet-team-card-name-btn" data-person-id="${escapeAttr(p.id)}">
          <h3 class="meet-team-card-name">${name}</h3>
        </button>
        ${title ? `<p class="meet-team-card-title">${title}</p>` : ''}
      </div>
    `;
  }).join('');
  el.meetTeamGrid.querySelectorAll('.meet-team-card').forEach((card, i) => {
    const img = card.querySelector('.meet-team-card-img');
    if (img && people[i] && people[i].photo) img.src = people[i].photo;
  });
  el.meetTeamGrid.querySelectorAll('.meet-team-card-photo-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!el.meetTeamPhotoInput) return;
      el.meetTeamPhotoInput.dataset.personId = btn.dataset.personId;
      el.meetTeamPhotoInput.click();
    });
  });
  el.meetTeamGrid.querySelectorAll('.meet-team-card-name-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.dataset.personId) openMeetTeamPerson(btn.dataset.personId);
    });
  });
  if (el.meetTeamPhotoInput && !el.meetTeamPhotoInput._bound) {
    el.meetTeamPhotoInput._bound = true;
    el.meetTeamPhotoInput.addEventListener('change', async () => {
      const personId = el.meetTeamPhotoInput.dataset.personId;
      const file = el.meetTeamPhotoInput.files && el.meetTeamPhotoInput.files[0];
      el.meetTeamPhotoInput.value = '';
      delete el.meetTeamPhotoInput.dataset.personId;
      if (!personId || !file || !file.type.startsWith('image/')) return;
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        const person = state.orgChart.find(p => p.id === personId);
        if (person) {
          person.photo = dataUrl;
          saveToStorage();
          renderMeetTeamView();
        }
      } catch (e) {
        console.warn('Photo upload failed', e);
      }
    });
  }
}

function showTeamView() {
  state.currentView = 'team';
  el.viewList.classList.remove('view-active');
  el.viewDetail.classList.remove('view-active');
  if (el.viewOrgchart) el.viewOrgchart.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.remove('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  if (el.viewProjects) el.viewProjects.classList.remove('view-active');
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('view-active');
  if (el.viewTeam) el.viewTeam.classList.add('view-active');
  document.querySelectorAll('.sidebar-nav .nav-item[data-view]').forEach(n => n.classList.remove('active'));
  const btn = document.querySelector('.sidebar-nav .nav-item[data-view="team"]');
  if (btn) btn.classList.add('active');
  if (el.sidebar) {
    el.sidebar.classList.remove('show-categories');
    el.sidebar.classList.remove('show-projects-list');
  }
  renderTeamView();
  updateSidebarFooterButton();
}

function renderTeamView() {
  if (!el.teamList) return;
  const auth = getAuth();
  const users = (auth && auth.users) ? auth.users : [];
  const currentEmail = getCurrentUserEmail().toLowerCase();
  el.teamList.innerHTML = users.map(u => {
    const email = (u.email || '').trim();
    const isCurrent = email.toLowerCase() === currentEmail;
    return `
      <li class="team-list-item">
        <span class="team-list-email">${escapeHtml(email)}</span>
        ${isCurrent ? '<span class="team-list-you">(you)</span>' : ''}
        ${!isCurrent ? `<button type="button" class="btn-icon team-list-remove" title="Remove user" data-team-email="${escapeAttr(email)}">×</button>` : ''}
      </li>
    `;
  }).join('');
  el.teamList.querySelectorAll('.team-list-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTeamUser(btn.dataset.teamEmail);
    });
  });
}

function removeTeamUser(email) {
  const auth = getAuth();
  if (!auth || !auth.users) return;
  const currentEmail = getCurrentUserEmail().toLowerCase();
  if ((email || '').toLowerCase() === currentEmail) return;
  if (!confirm(`Remove ${email}? They will no longer be able to sign in.`)) return;
  auth.users = auth.users.filter(u => (u.email || '').toLowerCase() !== (email || '').toLowerCase());
  localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
  renderTeamView();
}

function openAddUserModal() {
  const modal = document.getElementById('modal-add-user');
  const email = document.getElementById('modal-add-user-email');
  const password = document.getElementById('modal-add-user-password');
  const confirm = document.getElementById('modal-add-user-confirm');
  const err = document.getElementById('modal-add-user-error');
  if (!modal || !email) return;
  email.value = '';
  password.value = '';
  confirm.value = '';
  if (err) { err.textContent = ''; err.style.display = 'none'; }
  el.modalOverlay.classList.add('visible');
  modal.classList.add('visible');
  email.focus();
}

function closeAddUserModal() {
  const modal = document.getElementById('modal-add-user');
  if (modal) modal.classList.remove('visible');
  el.modalOverlay.classList.remove('visible');
}

async function saveAddUser() {
  const emailEl = document.getElementById('modal-add-user-email');
  const passwordEl = document.getElementById('modal-add-user-password');
  const confirmEl = document.getElementById('modal-add-user-confirm');
  const errEl = document.getElementById('modal-add-user-error');
  if (!emailEl || !passwordEl || !confirmEl) return;
  const email = (emailEl.value || '').trim().toLowerCase();
  const password = passwordEl.value || '';
  const confirm = confirmEl.value || '';
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  if (!email) {
    if (errEl) { errEl.textContent = 'Enter an email.'; errEl.style.display = 'block'; }
    return;
  }
  const auth = getAuth();
  if (!auth) { closeAddUserModal(); return; }
  if (!auth.users) auth.users = [];
  if (findUserByEmail(auth, email)) {
    if (errEl) { errEl.textContent = 'A user with this email already exists.'; errEl.style.display = 'block'; }
    return;
  }
  if (password.length < 6) {
    if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = 'block'; }
    return;
  }
  if (password !== confirm) {
    if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.style.display = 'block'; }
    return;
  }
  auth.users.push({ email, passwordHash: await hashPassword(password) });
  localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
  renderTeamView();
  closeAddUserModal();
}

function openInviteUserModal() {
  const modal = document.getElementById('modal-invite-user');
  const form = document.getElementById('modal-invite-form');
  const success = document.getElementById('modal-invite-success');
  const emailEl = document.getElementById('modal-invite-email');
  const errEl = document.getElementById('modal-invite-error');
  if (!modal) return;
  if (emailEl) emailEl.value = '';
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  if (form) form.style.display = 'block';
  if (success) success.style.display = 'none';
  el.modalOverlay.classList.add('visible');
  modal.classList.add('visible');
  if (emailEl) emailEl.focus();
}

function closeInviteUserModal() {
  const modal = document.getElementById('modal-invite-user');
  if (modal) modal.classList.remove('visible');
  el.modalOverlay.classList.remove('visible');
}

async function sendInviteUser() {
  const emailEl = document.getElementById('modal-invite-email');
  const errEl = document.getElementById('modal-invite-error');
  const form = document.getElementById('modal-invite-form');
  const success = document.getElementById('modal-invite-success');
  const successEmail = document.getElementById('modal-invite-success-email');
  const successPw = document.getElementById('modal-invite-success-password');
  if (!emailEl || !form || !success) return;
  const email = (emailEl.value || '').trim().toLowerCase();
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
  if (!email) {
    if (errEl) { errEl.textContent = 'Enter an email.'; errEl.style.display = 'block'; }
    return;
  }
  const auth = getAuth();
  if (!auth) { closeInviteUserModal(); return; }
  if (!auth.users) auth.users = [];
  if (findUserByEmail(auth, email)) {
    if (errEl) { errEl.textContent = 'A user with this email already exists.'; errEl.style.display = 'block'; }
    return;
  }
  const tempPassword = generateTempPassword(12);
  auth.users.push({ email, passwordHash: await hashPassword(tempPassword) });
  localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth));
  renderTeamView();
  form.style.display = 'none';
  success.style.display = 'block';
  if (successEmail) successEmail.textContent = email;
  if (successPw) successPw.textContent = tempPassword;
}

function openProject(projectId) {
  state.currentProjectId = projectId;
  if (!state.calendarMonth) state.calendarMonth = new Date().toISOString().slice(0, 7);
  const proj = state.projects.find(p => p.id === projectId);
  if (!proj || !el.viewProjectDetail) return;
  el.viewProjects.classList.remove('view-active');
  el.viewProjectDetail.classList.add('view-active');
  renderProjectDetail();
  renderSidebarProjects();
}

function renderProjectDetail() {
  const proj = state.projects.find(p => p.id === state.currentProjectId);
  if (!proj) return;

  if (el.projectDetailName) {
    el.projectDetailName.innerHTML = `<span class="project-detail-name-editable" role="button" tabindex="0" title="Click to edit">${escapeHtml(proj.name || 'Unnamed project')}</span>`;
    const nameSpan = el.projectDetailName.querySelector('.project-detail-name-editable');
    if (nameSpan) {
      nameSpan.addEventListener('click', () => startInlineEditProjectName(state.currentProjectId));
      nameSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startInlineEditProjectName(state.currentProjectId); } });
    }
  }
  if (el.projectDetailDesc) {
    el.projectDetailDesc.textContent = proj.description || '';
    el.projectDetailDesc.style.display = proj.description ? 'block' : 'none';
  }

  const projectTasks = state.tasks.filter(t => t.projectId === state.currentProjectId);
  const isList = state.projectView === 'list';

  if (el.taskViewList) el.taskViewList.style.display = isList ? 'block' : 'none';
  if (el.taskViewCalendar) el.taskViewCalendar.style.display = isList ? 'none' : 'block';

  if (isList) {
    if (!el.taskTableBody || !el.taskListEmpty) return;
    if (projectTasks.length === 0) {
      const wrap = el.taskTableBody && el.taskTableBody.closest('.task-table-wrap');
      if (wrap) wrap.classList.remove('visible');
      el.taskListEmpty.classList.add('visible');
      return;
    }
    el.taskListEmpty.classList.remove('visible');
    const wrap = el.taskTableBody && el.taskTableBody.closest('.task-table-wrap');
    if (wrap) wrap.classList.add('visible');

    const groupOrder = ['Overdue', 'Today', 'This week'];
    function getTaskGroup(task) {
      if (!task.dueDate) return 'No date';
      const d = new Date(task.dueDate);
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      const today = t.toDateString();
      const dStr = d.toDateString();
      if (d < t && dStr !== today) return 'Overdue';
      if (dStr === today) return 'Today';
      const weekEnd = new Date(t);
      weekEnd.setDate(weekEnd.getDate() + 7);
      if (d >= t && d < weekEnd) return 'This week';
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const byGroup = new Map();
    projectTasks.forEach(task => {
      migrateTask(task);
      const g = getTaskGroup(task);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(task);
    });
    const sortedGroups = [];
    groupOrder.forEach(g => { if (byGroup.has(g)) sortedGroups.push(g); });
    byGroup.forEach((_, g) => { if (!groupOrder.includes(g) && g !== 'No date') sortedGroups.push(g); });
    if (byGroup.has('No date')) sortedGroups.push('No date');

    let tableHtml = '';
    sortedGroups.forEach(groupName => {
      const tasks = byGroup.get(groupName) || [];
      tableHtml += `<tr class="task-group-header"><td colspan="6">${escapeHtml(groupName)}</td></tr>`;
      tasks.forEach(task => {
        const checked = task.completed ? ' checked' : '';
        const collabNames = (task.collaborators || []).map(getPersonName).filter(Boolean);
        const due = task.dueDate ? formatTaskDue(task.dueDate) : '—';
        const priority = (task.priority || 'medium');
        const priorityLabel = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium';
        tableHtml += `
          <tr class="task-row" data-task-id="${escapeAttr(task.id)}" title="Click to open task">
            <td class="task-col-check"><input type="checkbox" class="task-checkbox" ${checked} data-task-id="${escapeAttr(task.id)}" /></td>
            <td class="task-col-name"><span class="task-title task-title-clickable ${task.completed ? 'task-completed' : ''}" data-task-id="${escapeAttr(task.id)}">${escapeHtml(task.title || 'Untitled')}</span></td>
            <td class="task-col-due"><span class="task-due-clickable" data-task-id="${escapeAttr(task.id)}">${escapeHtml(due)}</span></td>
            <td class="task-col-collab task-collab-cell"><span class="task-collab-clickable" data-task-id="${escapeAttr(task.id)}">${collabNames.length ? escapeHtml(collabNames.join(', ')) : '—'}</span></td>
            <td class="task-col-priority"><span class="task-priority-badge task-priority-clickable task-priority-${escapeAttr(priority)}" data-task-id="${escapeAttr(task.id)}">${escapeHtml(priorityLabel)}</span></td>
            <td class="task-col-actions">
              <button type="button" class="btn-icon task-edit" title="Edit" data-task-id="${escapeAttr(task.id)}">✎</button>
              <button type="button" class="btn-icon task-delete" title="Delete" data-task-id="${escapeAttr(task.id)}">×</button>
            </td>
          </tr>
        `;
      });
    });
    el.taskTableBody.innerHTML = tableHtml;
    el.taskTableBody.querySelectorAll('tr.task-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('input[type=checkbox]') || e.target.closest('.task-delete')) return;
        const taskId = row.dataset.taskId;
        if (taskId) openTaskModal(null, taskId);
      });
    });
    el.taskTableBody.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => { e.stopPropagation(); toggleTask(cb.dataset.taskId); });
    });
    el.taskTableBody.querySelectorAll('.task-edit').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openTaskModal(null, btn.dataset.taskId); });
    });
    el.taskTableBody.querySelectorAll('.task-delete').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(btn.dataset.taskId); });
    });
  } else {
    renderCalendar();
  }
}

function formatTaskDue(iso) {
  const d = new Date(iso);
  const t = new Date();
  const today = t.toDateString();
  const tomorrow = new Date(t);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today) return 'Due today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Due tomorrow';
  if (d < t && d.toDateString() !== today) return 'Overdue';
  return 'Due ' + d.toLocaleDateString();
}

function renderCalendar() {
  if (!el.calendarGrid || !el.calendarMonthTitle || !el.calendarNoDateTasks) return;
  const now = new Date();
  const month = state.calendarMonth ? new Date(state.calendarMonth + '-01') : new Date(now.getFullYear(), now.getMonth(), 1);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  el.calendarMonthTitle.textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const projectTasks = state.tasks.filter(t => t.projectId === state.currentProjectId && t.dueDate);
  const noDateTasks = state.tasks.filter(t => t.projectId === state.currentProjectId && !t.dueDate);

  let html = '<div class="calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="calendar-days">';
  for (let i = 0; i < startPad; i++) html += '<div class="calendar-day calendar-day-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayTasks = projectTasks.filter(t => t.dueDate && t.dueDate.startsWith(dateKey));
    const isToday = now.getFullYear() === year && now.getMonth() === monthIndex && now.getDate() === d;
    html += `<div class="calendar-day ${isToday ? 'calendar-day-today' : ''}">
      <div class="calendar-day-num">${d}</div>
      <div class="calendar-day-tasks">${dayTasks.map(t => `
        <div class="calendar-task task-priority-${escapeAttr(t.priority || 'medium')}" data-task-id="${escapeAttr(t.id)}">
          ${escapeHtml(t.title || 'Untitled')}
        </div>
      `).join('')}</div>
    </div>`;
  }
  html += '</div>';
  el.calendarGrid.innerHTML = html;

  el.calendarNoDateTasks.innerHTML = noDateTasks.map(t => `
    <div class="calendar-task calendar-task-no-date task-priority-${escapeAttr(t.priority || 'medium')}" data-task-id="${escapeAttr(t.id)}" role="button" tabindex="0" title="Click to edit">
      ${escapeHtml(t.title || 'Untitled')}
    </div>
  `).join('');

  el.calendarGrid.querySelectorAll('.calendar-task[data-task-id]').forEach(node => {
    node.addEventListener('click', () => openTaskModal(null, node.dataset.taskId));
  });
  el.calendarNoDateTasks.querySelectorAll('.calendar-task[data-task-id]').forEach(node => {
    node.addEventListener('click', () => openTaskModal(null, node.dataset.taskId));
  });
}

function openProjectModal() {
  if (el.modalProjectName) el.modalProjectName.value = '';
  if (el.modalProjectDesc) el.modalProjectDesc.value = '';
  el.modalOverlay.classList.add('visible');
  el.modalProject.classList.add('visible');
  if (el.modalProjectName) el.modalProjectName.focus();
}

function closeProjectModal() {
  el.modalOverlay.classList.remove('visible');
  el.modalProject.classList.remove('visible');
}

function saveProject() {
  const name = el.modalProjectName && el.modalProjectName.value.trim();
  if (!name) return;
  const description = (el.modalProjectDesc && el.modalProjectDesc.value) ? el.modalProjectDesc.value.trim() : '';
  state.projects.push({ id: generateProjectId(), name, description });
  saveToStorage();
  renderProjectsList();
  renderSidebarProjects();
  closeProjectModal();
}

function startInlineEditTaskName(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || !el.taskTableBody) return;
  const row = el.taskTableBody.querySelector(`tr.task-row[data-task-id="${CSS.escape(taskId)}"]`);
  const span = row && row.querySelector('.task-title-clickable');
  if (!span) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'task-title-inline-input';
  input.value = task.title || '';
  input.setAttribute('data-task-id', taskId);

  const finish = (save) => {
    if (save) {
      const val = input.value.trim();
      task.title = val || 'Untitled';
      saveToStorage();
    }
    renderProjectDetail();
  };

  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });

  span.replaceWith(input);
  input.focus();
  input.select();
}

function startInlineEditTaskDue(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || !el.taskTableBody) return;
  const row = el.taskTableBody.querySelector(`tr.task-row[data-task-id="${CSS.escape(taskId)}"]`);
  const span = row && row.querySelector('.task-due-clickable');
  if (!span) return;

  const input = document.createElement('input');
  input.type = 'date';
  input.className = 'task-due-inline-input';
  input.value = task.dueDate ? task.dueDate.slice(0, 10) : '';
  input.setAttribute('data-task-id', taskId);

  const finish = (save) => {
    if (save) {
      const val = input.value;
      task.dueDate = val ? new Date(val).toISOString().slice(0, 10) : null;
      saveToStorage();
    }
    renderProjectDetail();
  };

  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });

  span.replaceWith(input);
  input.focus();
}

function openCollaboratorsDropdown(anchorElement, taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  closeCollaboratorsDropdown();
  closePriorityDropdown();

  const rect = anchorElement.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'task-collab-dropdown';
  dropdown.setAttribute('data-task-id', taskId);
  const collabIds = new Set(task.collaborators || []);

  dropdown.innerHTML = state.orgChart.length === 0
    ? '<div class="task-collab-dropdown-empty">No people in org chart</div>'
    : state.orgChart.map(p => {
        const checked = collabIds.has(p.id) ? ' checked' : '';
        return `<label class="task-collab-dropdown-item"><input type="checkbox" value="${escapeAttr(p.id)}" ${checked} /> ${escapeHtml(p.name || 'Unnamed')}</label>`;
      }).join('');

  dropdown.style.position = 'fixed';
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.minWidth = `${Math.max(rect.width, 180)}px`;
  document.body.appendChild(dropdown);

  const updateTaskAndDisplay = () => {
    const checked = dropdown.querySelectorAll('input:checked');
    task.collaborators = Array.from(checked).map(cb => cb.value);
    saveToStorage();
    const names = task.collaborators.map(getPersonName).filter(Boolean);
    const span = el.taskTableBody && el.taskTableBody.querySelector(`tr.task-row[data-task-id="${CSS.escape(taskId)}"] .task-collab-clickable`);
    if (span) span.textContent = names.length ? names.join(', ') : '—';
  };

  dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateTaskAndDisplay);
  });

  const close = () => {
    closeCollaboratorsDropdown();
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', escapeKey);
  };

  const outsideClick = (e) => {
    if (!dropdown.contains(e.target) && e.target !== anchorElement) close();
  };
  const escapeKey = (e) => { if (e.key === 'Escape') close(); };

  setTimeout(() => document.addEventListener('click', outsideClick), 0);
  document.addEventListener('keydown', escapeKey);
}

function closeCollaboratorsDropdown() {
  const existing = document.querySelector('.task-collab-dropdown');
  if (existing) existing.remove();
}

function openPriorityDropdown(anchorElement, taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  closePriorityDropdown();
  closeCollaboratorsDropdown();

  const rect = anchorElement.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'task-priority-dropdown';
  const current = task.priority || 'medium';

  const options = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  dropdown.innerHTML = options.map(o => {
    const active = o.value === current ? ' task-priority-dropdown-item-active' : '';
    return `<button type="button" class="task-priority-dropdown-item task-priority-${o.value}${active}" data-priority="${o.value}">${escapeHtml(o.label)}</button>`;
  }).join('');

  dropdown.style.position = 'fixed';
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom + 4}px`;
  dropdown.style.minWidth = `${Math.max(rect.width, 100)}px`;
  document.body.appendChild(dropdown);

  const close = () => {
    closePriorityDropdown();
    document.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', escapeKey);
  };

  const outsideClick = (e) => {
    if (!dropdown.contains(e.target) && e.target !== anchorElement) close();
  };
  const escapeKey = (e) => { if (e.key === 'Escape') close(); };

  dropdown.querySelectorAll('.task-priority-dropdown-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const priority = btn.dataset.priority;
      task.priority = priority;
      saveToStorage();
      const label = priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium';
      const badge = el.taskTableBody && el.taskTableBody.querySelector(`tr.task-row[data-task-id="${CSS.escape(taskId)}"] .task-priority-clickable`);
      if (badge) {
        badge.textContent = label;
        badge.className = `task-priority-badge task-priority-clickable task-priority-${priority}`;
      }
      close();
    });
  });

  setTimeout(() => document.addEventListener('click', outsideClick), 0);
  document.addEventListener('keydown', escapeKey);
}

function closePriorityDropdown() {
  const existing = document.querySelector('.task-priority-dropdown');
  if (existing) existing.remove();
}

function startInlineEditProjectName(projectId) {
  const proj = state.projects.find(p => p.id === projectId);
  if (!proj || !el.projectDetailName) return;
  const span = el.projectDetailName.querySelector('.project-detail-name-editable');
  if (!span) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'project-detail-name-inline-input';
  input.value = proj.name || '';
  input.setAttribute('data-project-id', projectId);

  const finish = (save) => {
    if (save) {
      const val = input.value.trim();
      proj.name = val || 'Unnamed project';
      saveToStorage();
    }
    renderProjectDetail();
    renderSidebarProjects();
  };

  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });

  span.replaceWith(input);
  input.focus();
  input.select();
}

function openTaskModal(_projectId, taskId) {
  state.editingTaskId = taskId || null;
  if (!el.modalTaskTitle) return;
  if (!taskId && !state.currentProjectId) return;

  if (el.modalTaskTitleLabel) el.modalTaskTitleLabel.textContent = taskId ? 'Edit task' : 'Add task';

  if (taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      migrateTask(task);
      if (el.modalTaskCompletedRow) el.modalTaskCompletedRow.style.display = 'flex';
      if (el.modalTaskCompleted) el.modalTaskCompleted.checked = !!task.completed;
      el.modalTaskTitle.value = task.title || '';
      if (el.modalTaskDue) el.modalTaskDue.value = task.dueDate ? task.dueDate.slice(0, 10) : '';
      if (el.modalTaskPriority) el.modalTaskPriority.value = task.priority || 'medium';
      const collabIds = task.collaborators || [];
      if (el.modalTaskCollaborators) {
        el.modalTaskCollaborators.innerHTML = state.orgChart.map(p => {
          const checked = collabIds.includes(p.id) ? ' checked' : '';
          return `<label class="modal-checkbox-label"><input type="checkbox" class="modal-collab-checkbox" value="${escapeAttr(p.id)}" ${checked} /> ${escapeHtml(p.name || 'Unnamed')}</label>`;
        }).join('');
      }
    }
  } else {
    if (el.modalTaskCompletedRow) el.modalTaskCompletedRow.style.display = 'none';
    el.modalTaskTitle.value = '';
    if (el.modalTaskDue) el.modalTaskDue.value = '';
    if (el.modalTaskPriority) el.modalTaskPriority.value = 'medium';
    if (el.modalTaskCollaborators) {
      el.modalTaskCollaborators.innerHTML = state.orgChart.map(p => `
        <label class="modal-checkbox-label"><input type="checkbox" class="modal-collab-checkbox" value="${escapeAttr(p.id)}" /> ${escapeHtml(p.name || 'Unnamed')}</label>
      `).join('');
    }
  }

  el.modalOverlay.classList.add('visible');
  el.modalTask.classList.add('visible');
  el.modalTaskTitle.focus();
}

function closeTaskModal() {
  el.modalOverlay.classList.remove('visible');
  el.modalTask.classList.remove('visible');
  state.editingTaskId = null;
}

function saveTask() {
  const title = el.modalTaskTitle && el.modalTaskTitle.value.trim();
  const projectId = state.currentProjectId;
  if (!title || !projectId) return;
  const dueVal = el.modalTaskDue && el.modalTaskDue.value;
  const dueDate = dueVal ? new Date(dueVal).toISOString().slice(0, 10) : null;
  const priority = (el.modalTaskPriority && el.modalTaskPriority.value) || 'medium';
  const collaborators = [];
  if (el.modalTaskCollaborators) {
    el.modalTaskCollaborators.querySelectorAll('.modal-collab-checkbox:checked').forEach(cb => collaborators.push(cb.value));
  }

  if (state.editingTaskId) {
    const task = state.tasks.find(t => t.id === state.editingTaskId);
    if (task) {
      task.title = title;
      task.dueDate = dueDate;
      task.priority = priority;
      task.collaborators = collaborators;
      if (el.modalTaskCompleted) task.completed = el.modalTaskCompleted.checked;
    }
  } else {
    state.tasks.push({
      id: generateTaskId(),
      projectId,
      title,
      dueDate,
      priority,
      collaborators,
      completed: false
    });
  }
  saveToStorage();
  renderProjectDetail();
  renderSidebarProjects();
  closeTaskModal();
}

function toggleTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  saveToStorage();
  renderProjectDetail();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  saveToStorage();
  renderProjectDetail();
}

function deleteProject() {
  if (!state.currentProjectId) return;
  if (!confirm('Delete this project and all its tasks?')) return;
  state.tasks = state.tasks.filter(t => t.projectId !== state.currentProjectId);
  state.projects = state.projects.filter(p => p.id !== state.currentProjectId);
  saveToStorage();
  state.currentProjectId = null;
  if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
  if (el.viewProjects) el.viewProjects.classList.add('view-active');
  showProjectsView();
}

function openPersonModal(personId, options) {
  const editingId = typeof personId === 'string' ? personId : null;
  const reportToId = (options && typeof options.reportToId === 'string') ? options.reportToId : null;
  state.editingPersonId = editingId;

  const nameError = document.getElementById('modal-person-name-error');
  if (nameError) { nameError.textContent = ''; nameError.style.display = 'none'; }
  if (!el.modalPersonName || !el.modalPersonManager) return;

  if (el.modalPersonTitleLabel) el.modalPersonTitleLabel.textContent = editingId ? 'Edit person' : 'Add person';

  const opts = ['<option value="">— No manager (top level) —</option>'];
  state.orgChart.forEach(p => {
    if (p.id === editingId) return;
    const label = (p.name || 'Unnamed') + (p.title ? ' · ' + p.title : '') + (p.location ? ' · ' + p.location : '');
    opts.push(`<option value="${escapeAttr(p.id)}">${escapeHtml(label)}</option>`);
  });
  el.modalPersonManager.innerHTML = opts.join('');

  if (editingId) {
    const person = state.orgChart.find(p => p.id === editingId);
    if (person) {
      el.modalPersonName.value = person.name || '';
      el.modalPersonTitle.value = person.title || '';
      if (el.modalPersonLocation) el.modalPersonLocation.value = person.location || '';
      el.modalPersonManager.value = person.managerId || '';
      state.personModalPhotoData = person.photo && String(person.photo).startsWith('data:') ? person.photo : null;
    }
  } else {
    el.modalPersonName.value = '';
    el.modalPersonTitle.value = '';
    if (el.modalPersonLocation) el.modalPersonLocation.value = '';
    el.modalPersonManager.value = reportToId || '';
    state.personModalPhotoData = null;
  }
  updatePersonModalPhotoPreview();

  if (el.modalOverlay) el.modalOverlay.classList.add('visible');
  if (el.modalPerson) el.modalPerson.classList.add('visible');
  if (el.modalPersonName) el.modalPersonName.focus();
}

function updatePersonModalPhotoPreview() {
  if (!el.modalPersonPhotoPreview) return;
  el.modalPersonPhotoPreview.innerHTML = '';
  if (state.personModalPhotoData) {
    const img = document.createElement('img');
    img.src = state.personModalPhotoData;
    img.alt = 'Photo';
    img.className = 'modal-person-photo-img';
    el.modalPersonPhotoPreview.appendChild(img);
    if (el.modalPersonPhotoRemove) el.modalPersonPhotoRemove.style.display = '';
  } else {
    if (el.modalPersonPhotoRemove) el.modalPersonPhotoRemove.style.display = 'none';
  }
}

function closePersonModal() {
  el.modalOverlay.classList.remove('visible');
  el.modalPerson.classList.remove('visible');
  state.editingPersonId = null;
  state.personModalPhotoData = null;
}

function savePerson() {
  const name = el.modalPersonName ? el.modalPersonName.value.trim() : '';
  const nameError = document.getElementById('modal-person-name-error');
  if (!name) {
    if (nameError) {
      nameError.textContent = 'Please enter a name.';
      nameError.style.display = 'block';
    }
    if (el.modalPersonName) {
      el.modalPersonName.focus();
      el.modalPersonName.setAttribute('aria-invalid', 'true');
    }
    return;
  }
  if (nameError) { nameError.textContent = ''; nameError.style.display = 'none'; }
  if (el.modalPersonName) el.modalPersonName.removeAttribute('aria-invalid');
  const title = (el.modalPersonTitle && el.modalPersonTitle.value.trim()) || '';
  const location = (el.modalPersonLocation && el.modalPersonLocation.value.trim()) || '';
  const managerId = (el.modalPersonManager && el.modalPersonManager.value) || null;

  if (state.editingPersonId) {
    const person = state.orgChart.find(p => p.id === state.editingPersonId);
    if (person) {
      person.name = name;
      person.title = title;
      person.location = location;
      person.managerId = managerId;
      person.photo = state.personModalPhotoData || null;
    }
  } else {
    state.orgChart.push({
      id: generatePersonId(),
      name,
      title,
      location,
      managerId,
      photo: state.personModalPhotoData || null
    });
  }
  saveToStorage();
  renderOrgChart();
  if (el.meetTeamGrid && state.currentView === 'meet-team') renderMeetTeamView();
  closePersonModal();
}

function saveCategory() {
  const name = el.modalCategoryInput.value.trim();
  if (!name) return;
  const parentId = state.modalParentId || (el.modalCategoryParent.value || null) || null;
  const exists = state.categories.some(c => c.name === name && (c.parentId || null) === parentId);
  if (exists) {
    closeCategoryModal();
    return;
  }
  state.categories.push({ id: generateCatId(), name, parentId });
  saveToStorage();
  renderCategories();
  renderListCategories();
  closeCategoryModal();
}

function initApp() {
  loadFromStorage();
  if (el.sidebar) {
    el.sidebar.classList.add('show-categories');
    el.sidebar.classList.remove('show-projects-list');
  }
  if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('view-active');
  if (el.viewContent) el.viewContent.classList.remove('view-active');
  if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
  renderCategories();
  updateListHeader();
  renderList();
  renderListCategories();
  updateSearchPlaceholder();
  updateTopbarCount();
  updateSidebarFooterButton();

  document.querySelectorAll('.sidebar-nav .nav-item[data-view="all"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentView = 'list';
      state.currentFilter = 'all';
      document.body.classList.remove('orgchart-view');
      if (el.sidebar) { el.sidebar.classList.add('show-categories'); el.sidebar.classList.remove('show-projects-list'); }
      if (el.viewOrgchart) el.viewOrgchart.classList.remove('view-active');
      if (el.viewTeam) el.viewTeam.classList.remove('view-active');
      if (el.viewMeetTeam) el.viewMeetTeam.classList.remove('view-active');
      if (el.viewContent) el.viewContent.classList.remove('view-active');
      if (el.viewContentDetail) el.viewContentDetail.classList.remove('view-active');
      if (el.viewProjects) el.viewProjects.classList.remove('view-active');
      if (el.viewProjectDetail) el.viewProjectDetail.classList.remove('view-active');
      el.viewList.classList.add('view-active');
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
      renderList();
      renderListCategories();
      updateListHeader();
      updateSearchPlaceholder();
      updateTopbarCount();
      updateSidebarFooterButton();
    });
  });

  document.querySelectorAll('.sidebar-nav .nav-item[data-view="content"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.remove('orgchart-view');
      showContentView();
    });
  });

  document.querySelectorAll('.sidebar-nav .nav-item[data-view="orgchart"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (el.sidebar) { el.sidebar.classList.remove('show-categories'); el.sidebar.classList.remove('show-projects-list'); }
      el.viewList.classList.remove('view-active');
      el.viewDetail.classList.remove('view-active');
      showOrgChartView();
    });
  });

  document.querySelectorAll('.sidebar-nav .nav-item[data-view="projects"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.remove('orgchart-view');
      if (el.sidebar) { el.sidebar.classList.remove('show-categories'); el.sidebar.classList.add('show-projects-list'); }
      el.viewList.classList.remove('view-active');
      el.viewDetail.classList.remove('view-active');
      showProjectsView();
      updateSidebarFooterButton();
    });
  });

  document.querySelectorAll('.sidebar-nav .nav-item[data-view="meet-team"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.remove('orgchart-view');
      showMeetTeamView();
    });
  });

  document.querySelectorAll('.sidebar-nav .nav-item[data-view="team"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.remove('orgchart-view');
      showTeamView();
    });
  });

  if (el.btnAddPerson) el.btnAddPerson.addEventListener('click', () => openPersonModal(null));
  if (el.orgchartTree) {
    el.orgchartTree.addEventListener('click', (e) => {
      const addReport = e.target.closest('.orgchart-person-add-report');
      const editBtn = e.target.closest('.orgchart-person-edit');
      const deleteBtn = e.target.closest('.orgchart-person-delete');
      if (addReport && addReport.dataset.personId) {
        e.stopPropagation();
        openPersonModal(null, { reportToId: addReport.dataset.personId });
        return;
      }
      if (editBtn && editBtn.dataset.personId) {
        e.stopPropagation();
        openPersonModal(editBtn.dataset.personId);
        return;
      }
      if (deleteBtn && deleteBtn.dataset.personId) {
        e.stopPropagation();
        deletePerson(deleteBtn.dataset.personId);
      }
    });
  }
  (function initOrgChartCanvas() {
    const canvas = el.orgchartCanvas;
    if (!canvas) return;
    let panning = false;
    let startPageX = 0, startPageY = 0, startPanX = 0, startPanY = 0;
    canvas.addEventListener('wheel', (e) => {
      if (!el.orgchartCanvasInner || !el.orgchartTree || !el.orgchartTree.firstElementChild) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ORG_ZOOM_STEP : ORG_ZOOM_STEP;
      setOrgChartZoomAt(e.clientX, e.clientY, state.orgChartZoom + delta);
    }, { passive: false });
    canvas.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      if (!el.orgchartTree || !el.orgchartTree.firstElementChild) return;
      panning = true;
      startPageX = e.pageX;
      startPageY = e.pageY;
      startPanX = state.orgChartPan.x;
      startPanY = state.orgChartPan.y;
      canvas.classList.add('orgchart-canvas-grabbing');
    });
    const onMouseMove = (e) => {
      if (!panning) return;
      state.orgChartPan.x = startPanX + (e.pageX - startPageX);
      state.orgChartPan.y = startPanY + (e.pageY - startPageY);
      applyOrgChartTransform();
    };
    const onMouseUp = () => {
      panning = false;
      canvas.classList.remove('orgchart-canvas-grabbing');
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    if (el.orgchartZoomOut) el.orgchartZoomOut.addEventListener('click', () => setOrgChartZoomCenter(state.orgChartZoom - ORG_ZOOM_STEP));
    if (el.orgchartZoomIn) el.orgchartZoomIn.addEventListener('click', () => setOrgChartZoomCenter(state.orgChartZoom + ORG_ZOOM_STEP));
    if (el.orgchartZoomFit) el.orgchartZoomFit.addEventListener('click', fitOrgChartToView);
  })();
  if (el.btnNewProject) el.btnNewProject.addEventListener('click', openProjectModal);
  if (el.viewProjects) {
    el.viewProjects.addEventListener('click', (e) => {
      const btn = e.target.closest('.project-filter-btn');
      if (!btn) return;
      const value = btn.dataset.projectFilter;
      if (!value) return;
      state.projectFilter = value;
      el.viewProjects.querySelectorAll('.project-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjectsList();
    });
  }
  const btnAddUser = document.getElementById('btn-add-user');
  const btnInviteUser = document.getElementById('btn-invite-user');
  if (btnAddUser) btnAddUser.addEventListener('click', openAddUserModal);
  if (btnInviteUser) btnInviteUser.addEventListener('click', openInviteUserModal);
  const btnSaveAddUser = document.getElementById('btn-save-add-user');
  if (btnSaveAddUser) btnSaveAddUser.addEventListener('click', () => saveAddUser());
  document.querySelectorAll('.btn-add-user-cancel').forEach(btn => { btn.addEventListener('click', closeAddUserModal); });
  const btnSendInvite = document.getElementById('btn-send-invite');
  if (btnSendInvite) btnSendInvite.addEventListener('click', (e) => { e.preventDefault(); sendInviteUser(); });
  document.querySelectorAll('.btn-invite-user-cancel').forEach(btn => { btn.addEventListener('click', closeInviteUserModal); });
  const btnCopyInvite = document.getElementById('btn-copy-invite');
  if (btnCopyInvite) {
    btnCopyInvite.addEventListener('click', () => {
      const pwEl = document.getElementById('modal-invite-success-password');
      const emailEl = document.getElementById('modal-invite-success-email');
      if (pwEl && emailEl) {
        const text = `Email: ${emailEl.textContent}\nTemporary password: ${pwEl.textContent}`;
        navigator.clipboard.writeText(text).then(() => { btnCopyInvite.textContent = 'Copied!'; setTimeout(() => { btnCopyInvite.textContent = 'Copy to clipboard'; }, 2000); });
      }
    });
  }
  const btnCloseInvite = document.getElementById('btn-close-invite');
  if (btnCloseInvite) btnCloseInvite.addEventListener('click', closeInviteUserModal);
  if (el.btnSidebarPrimary) {
    el.btnSidebarPrimary.addEventListener('click', () => {
      if (state.currentView === 'list') createSop();
      else if (state.currentView === 'projects') openProjectModal();
    });
  }
  if (el.btnLogout) {
    el.btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
    });
  }
  if (el.btnBackContent) el.btnBackContent.addEventListener('click', backToContentView);
  if (el.btnBackProject) el.btnBackProject.addEventListener('click', showProjectsView);
  if (el.btnBackMeetTeam) el.btnBackMeetTeam.addEventListener('click', backToMeetTeamList);
  if (el.btnSaveMeetTeamProfile) el.btnSaveMeetTeamProfile.addEventListener('click', () => { saveMeetTeamProfile(); });
  if (el.btnDeleteProject) el.btnDeleteProject.addEventListener('click', deleteProject);
  if (el.btnAddTask) el.btnAddTask.addEventListener('click', openTaskModal);
  const saveContentOnEdit = debounce(saveContentDoc, 400);
  if (el.contentDetailTitle) el.contentDetailTitle.addEventListener('input', saveContentOnEdit);
  if (el.contentDetailBody) el.contentDetailBody.addEventListener('input', saveContentOnEdit);

  document.querySelectorAll('.project-view-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.projectView = btn.dataset.projectView || 'list';
      document.querySelectorAll('.project-view-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjectDetail();
    });
  });
  if (el.calendarPrev) el.calendarPrev.addEventListener('click', () => {
    const d = state.calendarMonth ? new Date(state.calendarMonth + '-01') : new Date();
    d.setMonth(d.getMonth() - 1);
    state.calendarMonth = d.toISOString().slice(0, 7);
    renderCalendar();
  });
  if (el.calendarNext) el.calendarNext.addEventListener('click', () => {
    const d = state.calendarMonth ? new Date(state.calendarMonth + '-01') : new Date();
    d.setMonth(d.getMonth() + 1);
    state.calendarMonth = d.toISOString().slice(0, 7);
    renderCalendar();
  });

  document.querySelectorAll('.btn-add-category, .btn-add-category-right').forEach(btn => {
    if (btn) btn.addEventListener('click', () => openCategoryModal(null));
  });
  el.searchInput.addEventListener('input', () => {
    state.searchQuery = el.searchInput.value;
    if (state.currentView === 'list') {
      renderList();
      updateListHeader();
      updateTopbarCount();
    } else if (state.currentView === 'projects') {
      renderProjectsList();
    } else if (state.currentView === 'content') {
      renderContentView();
      updateTopbarCount();
    }
  });

  updateSidebarFooterButton();
  el.btnEmptyCta.addEventListener('click', createSop);
  el.btnBack.addEventListener('click', showList);
  el.btnDeleteSop.addEventListener('click', deleteCurrentSop);

  el.sopDetailCategorySelect.addEventListener('change', () => saveCurrentSop());

  el.modalOverlay.addEventListener('click', () => {
    if (el.modalCategory.classList.contains('visible')) closeCategoryModal();
    if (el.modalPerson && el.modalPerson.classList.contains('visible')) closePersonModal();
    if (el.modalProject && el.modalProject.classList.contains('visible')) closeProjectModal();
    if (el.modalTask && el.modalTask.classList.contains('visible')) closeTaskModal();
    const modalAddUser = document.getElementById('modal-add-user');
    const modalInvite = document.getElementById('modal-invite-user');
    if (modalAddUser && modalAddUser.classList.contains('visible')) closeAddUserModal();
    if (modalInvite && modalInvite.classList.contains('visible')) closeInviteUserModal();
  });
  el.modalCategory.querySelector('.btn-modal-cancel').addEventListener('click', closeCategoryModal);
  el.btnSaveCategory.addEventListener('click', saveCategory);
  el.modalCategoryInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCategory();
  });
  if (el.modalPerson) {
    el.modalPerson.querySelector('.btn-person-cancel').addEventListener('click', closePersonModal);
    el.btnSavePerson.addEventListener('click', savePerson);
    el.modalPersonName.addEventListener('keydown', e => { if (e.key === 'Enter') savePerson(); });
    if (el.modalPersonPhotoBtn) {
      el.modalPersonPhotoBtn.addEventListener('click', () => el.modalPersonPhotoInput && el.modalPersonPhotoInput.click());
    }
    if (el.modalPersonPhotoInput) {
      el.modalPersonPhotoInput.addEventListener('change', async () => {
        const file = el.modalPersonPhotoInput.files && el.modalPersonPhotoInput.files[0];
        el.modalPersonPhotoInput.value = '';
        if (!file || !file.type.startsWith('image/')) return;
        try {
          state.personModalPhotoData = await resizeImageToDataUrl(file);
          updatePersonModalPhotoPreview();
        } catch (e) {
          console.warn('Photo load failed', e);
        }
      });
    }
    if (el.modalPersonPhotoRemove) {
      el.modalPersonPhotoRemove.addEventListener('click', () => {
        state.personModalPhotoData = null;
        updatePersonModalPhotoPreview();
      });
    }
  }
  if (el.modalProject) {
    el.modalProject.querySelector('.btn-project-cancel').addEventListener('click', closeProjectModal);
    el.btnSaveProject.addEventListener('click', saveProject);
    if (el.modalProjectName) el.modalProjectName.addEventListener('keydown', e => { if (e.key === 'Enter') saveProject(); });
  }
  if (el.modalTask) {
    el.modalTask.querySelector('.btn-task-cancel').addEventListener('click', closeTaskModal);
    el.btnSaveTask.addEventListener('click', saveTask);
    if (el.modalTaskTitle) el.modalTaskTitle.addEventListener('keydown', e => { if (e.key === 'Enter') saveTask(); });
  }

  const saveOnEdit = debounce(saveCurrentSop, 400);
  el.sopDetailTitle.addEventListener('input', saveOnEdit);
  [el.sopDetailPurpose, el.sopDetailSteps, el.sopDetailRoles, el.sopDetailDecisions, el.sopDetailTools, el.sopDetailLoom].forEach(input => {
    if (input) input.addEventListener('input', saveOnEdit);
  });
  if (el.sopDetailLoom) el.sopDetailLoom.addEventListener('change', saveOnEdit);
}

(async function bootstrap() {
  const loginScreen = document.getElementById('login-screen');
  const app = document.getElementById('app');
  if (!loginScreen || !app) return;
  const auth = await ensureAuth();
  if (sessionStorage.getItem(SESSION_KEY)) {
    loginScreen.style.display = 'none';
    app.style.display = 'flex';
    initApp();
  } else {
    loginScreen.style.display = 'flex';
    app.style.display = 'none';
    setupLoginForm(auth);
  }
})();
