'use strict';

/* ==========================================================================
   1. DONNÉES — chargées depuis tasks.json (modifiable à la main)
   - owner        : l'étudiant "propriétaire" du cours / à qui la tâche est due
   - responsible  : le responsable réel qui exécute la tâche (peut différer
                     de owner en cas de délégation)
   - status       : 'todo' | 'inprogress' | 'done'  (état par défaut dans le
                     JSON, modifiable ensuite dans l'interface et sauvegardé
                     en localStorage — le fichier JSON lui-même n'est jamais
                     réécrit par le navigateur)
   ========================================================================== */

const DATA_URL = 'tasks.json';

let STUDENTS = [];
let TASKS = [];
let DEADLINES = {};

const STORAGE_KEY = 'tdb2026_status_overrides';
const THEME_KEY = 'tdb2026_theme';

async function loadData() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Impossible de charger ${DATA_URL} (HTTP ${res.status})`);
  const data = await res.json();

  STUDENTS = data.students;
  TASKS = data.tasks;
  DEADLINES = {
    main: new Date(data.deadlines.main.date),
    final: new Date(data.deadlines.final.date),
  };
}

/* ==========================================================================
   2. PERSISTANCE — localStorage
   ========================================================================== */

function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Impossible de lire le localStorage :', e);
    return {};
  }
}

function saveOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn('Impossible d\'écrire dans le localStorage :', e);
  }
}

function applyOverrides() {
  const overrides = loadOverrides();
  TASKS.forEach(t => {
    if (overrides[t.id]) t.status = overrides[t.id];
  });
}

function setTaskStatus(taskId, status) {
  const task = TASKS.find(t => t.id === taskId);
  if (!task) return;
  task.status = status;
  const overrides = loadOverrides();
  overrides[taskId] = status;
  saveOverrides(overrides);
}

/* ==========================================================================
   3. ÉTAT DES FILTRES
   ========================================================================== */

const state = {
  owner: '',
  responsible: '',
  type: '',
  status: '',
  search: '',
};

const STATUS_LABELS = { todo: 'À faire', inprogress: 'En cours', done: 'Terminé' };
const STATUS_ORDER = ['todo', 'inprogress', 'done'];

/* ==========================================================================
   4. RENDU
   ========================================================================== */

function populateFilterOptions() {
  const ownerSelect = document.getElementById('filter-owner');
  const respSelect = document.getElementById('filter-responsible');
  const typeSelect = document.getElementById('filter-type');

  STUDENTS.forEach(s => {
    const o1 = document.createElement('option');
    o1.value = s; o1.textContent = s;
    ownerSelect.appendChild(o1);
    const o2 = document.createElement('option');
    o2.value = s; o2.textContent = s;
    respSelect.appendChild(o2);
  });

  const types = [...new Set(TASKS.map(t => t.type))];
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    typeSelect.appendChild(opt);
  });
}

function taskMatchesFilters(task) {
  if (state.owner && task.owner !== state.owner) return false;
  if (state.responsible && task.responsible !== state.responsible) return false;
  if (state.type && task.type !== state.type) return false;
  if (state.status && task.status !== state.status) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    if (!task.title.toLowerCase().includes(q)) return false;
  }
  return true;
}

function renderGlobalStats(visibleTasks) {
  const total = TASKS.length;
  const done = TASKS.filter(t => t.status === 'done').length;
  const remaining = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-remaining').textContent = remaining;
  document.getElementById('stat-pct').textContent = pct + '%';
  document.getElementById('stat-bar').style.width = pct + '%';

  const countEl = document.getElementById('result-count');
  countEl.textContent = `${visibleTasks} tâche${visibleTasks !== 1 ? 's' : ''} affichée${visibleTasks !== 1 ? 's' : ''} sur ${total}`;
}

function renderStudentCards() {
  const grid = document.getElementById('students-grid');
  grid.innerHTML = '';
  let visibleCount = 0;

  STUDENTS.forEach(student => {
    // Une carte représente la charge réelle de l'étudiant : les tâches
    // dont il est le RESPONSABLE EFFECTIF (celles qu'il doit produire).
    const studentTasks = TASKS.filter(t => t.responsible === student);
    const filteredTasks = studentTasks.filter(taskMatchesFilters);
    visibleCount += filteredTasks.length;

    const doneCount = studentTasks.filter(t => t.status === 'done').length;
    const pct = studentTasks.length ? Math.round((doneCount / studentTasks.length) * 100) : 0;

    const card = document.createElement('article');
    card.className = 'card';

    card.innerHTML = `
      <div class="card-head">
        <div class="card-head-row">
          <h2>${student}</h2>
          <span class="pct">${pct}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="meta">${doneCount}/${studentTasks.length} tâches terminées</div>
      </div>
      <ul class="task-list" data-student="${student}"></ul>
    `;

    const list = card.querySelector('.task-list');

    if (filteredTasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'card-empty';
      empty.textContent = studentTasks.length === 0
        ? 'Aucune tâche.'
        : 'Aucune tâche ne correspond aux filtres.';
      list.appendChild(empty);
    } else {
      filteredTasks.forEach(task => list.appendChild(renderTaskRow(task, student)));
    }

    grid.appendChild(card);
  });

  if (visibleCount === 0) {
    grid.innerHTML = '<div class="grid-empty">Aucune tâche ne correspond à ces filtres. Essayez de réinitialiser.</div>';
  }

  renderGlobalStats(visibleCount);
}

function renderTaskRow(task, cardStudent) {
  const li = document.createElement('li');
  li.className = 'task';
  li.dataset.status = task.status;
  li.dataset.id = task.id;

  const isDelegated = task.owner !== task.responsible;
  const ownerTagHtml = isDelegated
    ? `<span class="tag tag-delegated" title="Propriétaire d'origine">Pour ${task.owner}</span>`
    : '';

  li.innerHTML = `
    <button class="task-check" type="button" aria-label="Changer l'état de la tâche"></button>
    <div class="task-body">
      <div class="task-title">${task.title}</div>
      <div class="task-tags">
        <span class="tag tag-type">${task.type}</span>
        ${ownerTagHtml}
        <span class="task-status-label">${STATUS_LABELS[task.status]}</span>
      </div>
    </div>
  `;

  const checkBtn = li.querySelector('.task-check');
  checkBtn.addEventListener('click', () => {
    const currentIndex = STATUS_ORDER.indexOf(task.status);
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
    setTaskStatus(task.id, nextStatus);
    renderStudentCards();
    renderCountdown(); // refresh not strictly needed but keeps everything consistent
  });

  return li;
}

/* ==========================================================================
   5. COMPTE À REBOURS
   ========================================================================== */

function renderCountdown() {
  const now = new Date();
  renderTickerPanel('main', DEADLINES.main, now);
  renderTickerPanel('final', DEADLINES.final, now);
}

function renderTickerPanel(key, deadline, now) {
  const panel = document.getElementById(`ticker-${key}`);
  const digitsEl = document.getElementById(`ticker-${key}-digits`);
  const noteEl = document.getElementById(`ticker-${key}-note`);

  let diff = deadline.getTime() - now.getTime();
  const isPast = diff <= 0;
  panel.classList.toggle('past', isPast);

  if (isPast) {
    digitsEl.innerHTML = `<div class="d-group"><span class="d-num">✓</span><span class="d-unit">échéance passée</span></div>`;
    noteEl.textContent = 'Échéance atteinte.';
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  digitsEl.innerHTML = `
    <div class="d-group"><span class="d-num">${days}</span><span class="d-unit">jours</span></div>
    <span class="colon">:</span>
    <div class="d-group"><span class="d-num">${pad2(hours)}</span><span class="d-unit">heures</span></div>
    <span class="colon">:</span>
    <div class="d-group"><span class="d-num">${pad2(minutes)}</span><span class="d-unit">min</span></div>
    <span class="colon">:</span>
    <div class="d-group"><span class="d-num">${pad2(seconds)}</span><span class="d-unit">sec</span></div>
  `;
  noteEl.textContent = `Échéance le ${deadline.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

/* ==========================================================================
   6. THÈME (sombre par défaut, clair en option) — sauvegardé aussi
   ========================================================================== */

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeToggleUI(saved);

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeToggleUI(next);
  });
}

function updateThemeToggleUI(theme) {
  const btn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  const isDark = theme === 'dark';
  btn.setAttribute('aria-pressed', String(!isDark));
  icon.textContent = isDark ? '☀️' : '🌙';
  label.textContent = isDark ? 'Mode clair' : 'Mode sombre';
}

/* ==========================================================================
   7. FILTRES — écouteurs
   ========================================================================== */

function initFilters() {
  document.getElementById('filter-owner').addEventListener('change', e => {
    state.owner = e.target.value;
    renderStudentCards();
  });
  document.getElementById('filter-responsible').addEventListener('change', e => {
    state.responsible = e.target.value;
    renderStudentCards();
  });
  document.getElementById('filter-type').addEventListener('change', e => {
    state.type = e.target.value;
    renderStudentCards();
  });
  document.getElementById('filter-status').addEventListener('change', e => {
    state.status = e.target.value;
    renderStudentCards();
  });
  document.getElementById('filter-search').addEventListener('input', e => {
    state.search = e.target.value;
    renderStudentCards();
  });
  document.getElementById('filter-reset').addEventListener('click', () => {
    state.owner = state.responsible = state.type = state.status = state.search = '';
    document.getElementById('filter-owner').value = '';
    document.getElementById('filter-responsible').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-search').value = '';
    renderStudentCards();
  });
}

/* ==========================================================================
   8. INITIALISATION
   ========================================================================== */

async function init() {
  initTheme();

  try {
    await loadData();
  } catch (e) {
    console.error(e);
    document.getElementById('students-grid').innerHTML =
      `<div class="grid-empty">
        Impossible de charger <code>tasks.json</code>.<br>
        Si vous avez ouvert <code>index.html</code> directement depuis vos fichiers
        (URL en <code>file://</code>), le navigateur bloque la lecture du JSON par
        sécurité. Lancez un petit serveur local (voir README.md), par exemple :
        <code>python -m http.server 8000</code>, puis ouvrez
        <code>http://localhost:8000</code>.
      </div>`;
    return;
  }

  applyOverrides();
  populateFilterOptions();
  initFilters();
  renderStudentCards();
  renderCountdown();
  setInterval(renderCountdown, 1000);
}

document.addEventListener('DOMContentLoaded', init);
