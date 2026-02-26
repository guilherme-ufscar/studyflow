/* ============================================================
   STUDYFLOW — SPA Shell, Router, Home & Subjects Module
   ============================================================ */

const SUBJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#3b82f6', '#06b6d4',
  '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
  '#f97316', '#64748b',
];

/* ---------- Theme (light/dark) ---------- */
const Theme = {
  storageKey: 'sf-theme',
  init() {
    const saved = localStorage.getItem(this.storageKey);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    this.apply(theme);

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
      this.updateButton(btn, theme);
    }
  },
  apply(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(this.storageKey, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1220' : '#6366f1');
    const btn = document.getElementById('theme-toggle');
    if (btn) this.updateButton(btn, theme);
  },
  toggle() {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    this.apply(cur === 'dark' ? 'light' : 'dark');
  },
  updateButton(btn, theme) {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }
};

const App = {
  currentPage: 'home',

  async init() {
    await db.ready();
    // Request persistent storage so data survives cache clearing
    if (navigator.storage && navigator.storage.persist) {
      const granted = await navigator.storage.persist();
      console.log('[StudyFlow] Persistent storage:', granted ? 'granted' : 'denied');
    }
    this.bindRouter();
    this.bindSidebar();
    Theme.init();
    this.navigate(location.hash.slice(1) || 'home');
    Utils.requestNotifications();
    Timeline.scheduleAllNotifications();
    this.hideLoading();
  },

  hideLoading() {
    const el = document.getElementById('loading-screen');
    if (el) {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 500);
    }
  },

  /* ---------- Router ---------- */
  bindRouter() {
    window.addEventListener('hashchange', () => {
      this.navigate(location.hash.slice(1) || 'home');
    });
  },

  navigate(page) {
    this.currentPage = page;
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });
    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    // Render page
    this.renderPage(page);
  },

  async renderPage(page) {
    switch (page) {
      case 'home':       await this.renderHome(); break;
      case 'subjects':   await this.renderSubjects(); break;
      case 'timeline':   await Timeline.render(); break;
      case 'grades':     await Grades.render(); break;
      case 'flashcards': await Flashcards.render(); break;
      case 'locker':     await Locker.render(); break;
      case 'roadmap':    await Roadmap.render(); break;
      case 'focus':      await Focus.render(); break;
      default:           await this.renderHome(); break;
    }
    // Scroll to top
    window.scrollTo(0, 0);
  },

  /* ---------- Sidebar ---------- */
  bindSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
      // Close on outside click (mobile)
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  },

  /* ---------- Home Page ---------- */
  async renderHome() {
    const main = document.getElementById('main-content');
    const subjects    = await db.getSubjects();
    const events      = await db.getEvents();
    const flashcards  = await db.getFlashcards();
    const sessions    = await db.getFocusSessions();
    const topics      = await db.getTopics();

    const today = Utils.todayISO();
    const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const dueCards = flashcards.filter(c => !c.nextReview || new Date(c.nextReview) <= new Date());
    const todayMinutes = sessions.filter(s => s.date === today).reduce((sum, s) => sum + (s.duration || 0), 0);
    const completedTopics = topics.filter(t => t.completed).length;
    const totalTopics = topics.length;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-house"></i></div>
          <div>
            <h1 class="page-title">Painel Geral</h1>
            <p class="page-description">Visão geral do seu progresso acadêmico</p>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fa-solid fa-book-open"></i></div>
          <div class="stat-info">
            <div class="stat-label">Matérias</div>
            <div class="stat-value">${subjects.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa-solid fa-calendar-days"></i></div>
          <div class="stat-info">
            <div class="stat-label">Próx. Eventos</div>
            <div class="stat-value">${upcoming.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><i class="fa-solid fa-brain"></i></div>
          <div class="stat-info">
            <div class="stat-label">Cards p/ Revisar</div>
            <div class="stat-value">${dueCards.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-clock"></i></div>
          <div class="stat-info">
            <div class="stat-label">Foco Hoje</div>
            <div class="stat-value">${Utils.formatDuration(todayMinutes)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon cyan"><i class="fa-solid fa-route"></i></div>
          <div class="stat-info">
            <div class="stat-label">Roadmap</div>
            <div class="stat-value">${completedTopics}/${totalTopics}</div>
            <div class="stat-sub">${totalTopics ? Math.round(completedTopics / totalTopics * 100) : 0}% concluído</div>
          </div>
        </div>
      </div>

      <!-- Upcoming Events -->
      <div class="card" style="margin-bottom:var(--sp-6)">
        <div class="section-title"><i class="fa-solid fa-calendar-check"></i> Próximos Eventos</div>
        ${upcoming.length ? upcoming.map(e => {
          const sub = subjects.find(s => s.id === e.subjectId);
          return `
            <div class="flex items-center gap-3" style="padding:var(--sp-2) 0;border-bottom:1px solid var(--border-light)">
              <span class="event-dot" style="background:${sub ? sub.color : '#9ca3af'}"></span>
              <div style="flex:1">
                <div style="font-size:0.875rem;font-weight:600">${Utils.escapeHtml(e.title)}</div>
                <div class="text-xs text-muted">${Utils.relativeDay(e.date)} ${e.time ? '· ' + Utils.formatTime(e.time) : ''}</div>
              </div>
              <span class="badge">${Utils.capitalize(e.type)}</span>
            </div>
          `;
        }).join('') : '<div class="text-sm text-dim">Nenhum evento próximo.</div>'}
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="section-title"><i class="fa-solid fa-bolt"></i> Ações Rápidas</div>
        <div class="flex gap-2 flex-wrap">
          <a class="btn" href="#subjects"><i class="fa-solid fa-book-open"></i> Matérias</a>
          <a class="btn" href="#timeline"><i class="fa-solid fa-calendar-days"></i> Cronograma</a>
          <a class="btn" href="#flashcards"><i class="fa-solid fa-brain"></i> Revisar Cards</a>
          <a class="btn btn-primary" href="#focus"><i class="fa-solid fa-crosshairs"></i> Iniciar Foco</a>
        </div>
      </div>
    `;
  },

  /* ---------- Subjects Page ---------- */
  async renderSubjects() {
    const main = document.getElementById('main-content');
    const subjects = await db.getSubjects();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-book-open"></i></div>
          <div>
            <h1 class="page-title">Matérias</h1>
            <p class="page-description">Gerencie suas disciplinas e componentes curriculares</p>
          </div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="App.openSubjectForm()">
            <i class="fa-solid fa-plus"></i> Nova Matéria
          </button>
        </div>
      </div>

      <div class="subjects-grid" id="subjects-grid"></div>
    `;

    this.loadSubjects(subjects);
  },

  loadSubjects(subjects) {
    const grid = document.getElementById('subjects-grid');

    if (!subjects.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon"><i class="fa-regular fa-folder-open"></i></div>
          <div class="empty-state-text">Nenhuma matéria cadastrada.<br>Comece adicionando suas disciplinas do semestre.</div>
          <button class="btn btn-primary" onclick="App.openSubjectForm()"><i class="fa-solid fa-plus"></i> Cadastrar Matéria</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = subjects.map(s => `
      <div class="subject-card anim-slide-up">
        <div class="subject-card-color" style="background:${s.color}"></div>
        <div class="subject-card-header">
          <span class="subject-card-name">${Utils.escapeHtml(s.name)}</span>
          <div class="subject-card-actions">
            <button onclick="App.openSubjectForm('${s.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="delete-btn" onclick="App.deleteSubject('${s.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        ${s.teacher ? `<div class="subject-card-teacher"><i class="fa-solid fa-user"></i>${Utils.escapeHtml(s.teacher)}</div>` : ''}
        ${(s.days && s.days.length) || s.timeStart ? `<div class="text-xs text-muted"><i class="fa-regular fa-clock" style="margin-right:4px"></i>${App.formatSchedule(s)}</div>` : (s.schedule ? `<div class="text-xs text-muted"><i class="fa-regular fa-clock" style="margin-right:4px"></i>${Utils.escapeHtml(s.schedule)}</div>` : '')}
        ${s.room ? `<div class="text-xs text-muted mt-2"><i class="fa-solid fa-location-dot" style="margin-right:4px"></i>${Utils.escapeHtml(s.room)}</div>` : ''}
      </div>
    `).join('');
  },

  async openSubjectForm(editId = null) {
    let subject = { name: '', teacher: '', schedule: '', room: '', color: SUBJECT_COLORS[0], days: [], timeStart: '', timeEnd: '' };

    if (editId) {
      const found = await db.getSubject(editId);
      if (found) subject = { ...subject, ...found };
    }

    const WEEKDAYS = [
      { key: 'seg', label: 'Seg' },
      { key: 'ter', label: 'Ter' },
      { key: 'qua', label: 'Qua' },
      { key: 'qui', label: 'Qui' },
      { key: 'sex', label: 'Sex' },
      { key: 'sab', label: 'Sáb' },
    ];
    const selectedDays = subject.days || [];

    const body = `
      <div class="form-grid">
        <div class="form-group full">
          <label class="label">Nome da Matéria</label>
          <input class="input" id="sub-name" value="${Utils.escapeHtml(subject.name)}" placeholder="Ex: Cálculo Diferencial II">
        </div>
        <div class="form-group">
          <label class="label">Professor(a)</label>
          <input class="input" id="sub-teacher" value="${Utils.escapeHtml(subject.teacher || '')}" placeholder="Nome do professor">
        </div>
        <div class="form-group">
          <label class="label">Sala</label>
          <input class="input" id="sub-room" value="${Utils.escapeHtml(subject.room || '')}" placeholder="Ex: Bloco A, Sala 203">
        </div>
        <div class="form-group full">
          <label class="label">Dias da Semana</label>
          <div class="weekday-picker" id="weekday-picker">
            ${WEEKDAYS.map(d => `
              <button type="button" class="weekday-btn ${selectedDays.includes(d.key) ? 'active' : ''}" data-day="${d.key}" onclick="App.toggleWeekday(this)">${d.label}</button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="label">Início da Aula</label>
          <input class="input time-masked" id="sub-time-start" value="${subject.timeStart || ''}" placeholder="08:00" maxlength="5" inputmode="numeric" oninput="App.maskTime(this)" onblur="App.validateTime(this)">
        </div>
        <div class="form-group">
          <label class="label">Fim da Aula</label>
          <input class="input time-masked" id="sub-time-end" value="${subject.timeEnd || ''}" placeholder="10:00" maxlength="5" inputmode="numeric" oninput="App.maskTime(this)" onblur="App.validateTime(this)">
        </div>
        <div class="form-group full">
          <label class="label">Cor</label>
          <div class="color-picker-grid" id="color-picker">
            ${SUBJECT_COLORS.map(c => `
              <div class="color-swatch ${c === subject.color ? 'selected' : ''}" style="background:${c}" data-color="${c}" onclick="App.selectColor(this)"></div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const footer = `
      <div class="form-actions">
        <button class="btn" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="App.saveSubject('${editId || ''}')">
          <i class="fa-solid fa-check"></i> ${editId ? 'Salvar' : 'Criar Matéria'}
        </button>
      </div>
    `;

    Utils.openModal(editId ? 'Editar Matéria' : 'Nova Matéria', body, footer);
  },

  selectColor(el) {
    document.querySelectorAll('#color-picker .color-swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
  },

  async saveSubject(editId) {
    const name = document.getElementById('sub-name').value.trim();
    if (!name) { Utils.toast('Informe o nome da matéria', 'warning'); return; }

    const selectedColor = document.querySelector('#color-picker .color-swatch.selected');

    const subject = {
      id: editId || Utils.uuid(),
      name,
      teacher: document.getElementById('sub-teacher').value.trim() || null,
      room: document.getElementById('sub-room').value.trim() || null,
      days: Array.from(document.querySelectorAll('#weekday-picker .weekday-btn.active')).map(b => b.dataset.day),
      timeStart: document.getElementById('sub-time-start').value.trim() || null,
      timeEnd: document.getElementById('sub-time-end').value.trim() || null,
      schedule: App.buildScheduleString(),
      color: selectedColor ? selectedColor.dataset.color : SUBJECT_COLORS[0],
      createdAt: editId ? undefined : Date.now(),
    };

    if (editId) {
      const existing = await db.getSubject(editId);
      if (existing) subject.createdAt = existing.createdAt;
    }

    await db.saveSubject(subject);
    Utils.closeModal();
    Utils.toast(editId ? 'Matéria atualizada' : 'Matéria criada', 'success');
    this.renderSubjects();
  },

  async deleteSubject(id) {
    const confirmed = await Utils.confirm('Excluir esta matéria e todos os dados associados?');
    if (!confirmed) return;
    await db.deleteSubject(id);
    Utils.toast('Matéria excluída', 'success');
    this.renderSubjects();
  },

  /* ---------- Schedule Helpers ---------- */
  toggleWeekday(btn) {
    btn.classList.toggle('active');
  },

  maskTime(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    if (v.length >= 3) {
      v = v.slice(0, 2) + ':' + v.slice(2);
    }
    input.value = v;
  },

  validateTime(input) {
    const v = input.value;
    if (!v) return;
    const match = v.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) { input.value = ''; return; }
    let h = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);
    if (h > 23 || m > 59) { input.value = ''; return; }
    input.value = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  },

  buildScheduleString() {
    const DAY_LABELS = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb' };
    const days = Array.from(document.querySelectorAll('#weekday-picker .weekday-btn.active')).map(b => DAY_LABELS[b.dataset.day] || b.dataset.day);
    const start = document.getElementById('sub-time-start').value.trim();
    const end = document.getElementById('sub-time-end').value.trim();
    let parts = [];
    if (days.length) parts.push(days.join('/'));
    if (start && end) parts.push(start + '-' + end);
    else if (start) parts.push(start);
    return parts.join(' ') || null;
  },

  formatSchedule(s) {
    const DAY_LABELS = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb' };
    let parts = [];
    if (s.days && s.days.length) parts.push(s.days.map(d => DAY_LABELS[d] || d).join('/'));
    if (s.timeStart && s.timeEnd) parts.push(s.timeStart + '-' + s.timeEnd);
    else if (s.timeStart) parts.push(s.timeStart);
    return parts.join(' ') || (s.schedule ? Utils.escapeHtml(s.schedule) : '');
  },
};

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => App.init());
