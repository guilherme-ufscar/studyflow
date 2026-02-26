/* ============================================================
   STUDYFLOW — Smart Timeline
   ============================================================ */

const Timeline = {
  async render() {
    const main = document.getElementById('main-content');
    const subjectOpts = await Utils.subjectOptions();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-calendar-days"></i></div>
          <div>
            <h1 class="page-title">Cronograma</h1>
            <p class="page-description">Organize provas, trabalhos e eventos acadêmicos</p>
          </div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Timeline.openForm()">
            <i class="fa-solid fa-plus"></i> Novo Evento
          </button>
        </div>
      </div>

      <div class="stats-row" id="timeline-stats"></div>

      <div class="tab-bar" id="timeline-tabs">
        <button class="tab-item active" data-filter="upcoming">Próximos</button>
        <button class="tab-item" data-filter="past">Passados</button>
        <button class="tab-item" data-filter="all">Todos</button>
      </div>

      <div class="timeline-container" id="timeline-list"></div>
    `;

    document.getElementById('timeline-tabs').addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-item')) return;
      document.querySelectorAll('#timeline-tabs .tab-item').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      Timeline.loadEvents(e.target.dataset.filter);
    });

    await this.loadStats();
    await this.loadEvents('upcoming');
  },

  async loadStats() {
    const events = await db.getEvents();
    const today = Utils.todayISO();
    const upcoming = events.filter(e => e.date >= today);
    const thisWeek = upcoming.filter(e => Utils.diffDays(e.date) <= 7);
    const overdue = events.filter(e => e.date < today && !e.completed);

    document.getElementById('timeline-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-icon purple"><i class="fa-solid fa-calendar-check"></i></div>
        <div class="stat-info">
          <div class="stat-label">Total</div>
          <div class="stat-value">${events.length}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><i class="fa-solid fa-clock"></i></div>
        <div class="stat-info">
          <div class="stat-label">Próximos</div>
          <div class="stat-value">${upcoming.length}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber"><i class="fa-solid fa-bolt"></i></div>
        <div class="stat-info">
          <div class="stat-label">Esta Semana</div>
          <div class="stat-value">${thisWeek.length}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red"><i class="fa-solid fa-circle-exclamation"></i></div>
        <div class="stat-info">
          <div class="stat-label">Atrasados</div>
          <div class="stat-value">${overdue.length}</div>
        </div>
      </div>
    `;
  },

  async loadEvents(filter = 'upcoming') {
    const events = await db.getEvents();
    const subjects = await db.getSubjects();
    const subMap = {};
    subjects.forEach(s => subMap[s.id] = s);

    const today = Utils.todayISO();
    let filtered = events;
    if (filter === 'upcoming') filtered = events.filter(e => e.date >= today);
    else if (filter === 'past') filtered = events.filter(e => e.date < today);

    filtered.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return filter === 'past' ? -d : d;
      return (a.time || '').localeCompare(b.time || '');
    });

    const container = document.getElementById('timeline-list');

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-regular fa-calendar"></i></div>
          <div class="empty-state-text">Nenhum evento encontrado.<br>Adicione provas, trabalhos e prazos importantes.</div>
        </div>
      `;
      return;
    }

    // Group by date
    const groups = {};
    filtered.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });

    const typeIcons = {
      prova:    '<i class="fa-solid fa-file-pen"></i>',
      trabalho: '<i class="fa-solid fa-file-lines"></i>',
      evento:   '<i class="fa-solid fa-star"></i>',
      lembrete: '<i class="fa-solid fa-bell"></i>',
    };

    const typeColors = {
      prova: 'var(--sf-danger)',
      trabalho: 'var(--sf-purple)',
      evento: 'var(--sf-blue)',
      lembrete: 'var(--sf-warning)',
    };

    container.innerHTML = Object.entries(groups).map(([date, evts]) => `
      <div class="timeline-day anim-slide-up">
        <div class="timeline-day-header">
          <span class="timeline-day-date"><i class="fa-regular fa-calendar" style="margin-right:6px;color:var(--text-tertiary)"></i>${Utils.formatDateLong(date)} — ${Utils.relativeDay(date)}</span>
          <span class="timeline-day-count">${evts.length} evento${evts.length > 1 ? 's' : ''}</span>
        </div>
        ${evts.map(e => {
          const sub = subMap[e.subjectId];
          const color = sub ? sub.color : '#9ca3af';
          return `
            <div class="timeline-event">
              <span class="event-time">${Utils.formatTime(e.time) || '--:--'}</span>
              <span class="event-dot" style="background:${color}"></span>
              <div class="timeline-type-icon" style="background:${color}15;color:${color}">
                ${typeIcons[e.type] || '<i class="fa-solid fa-circle"></i>'}
              </div>
              <div class="event-info">
                <div class="event-title">${Utils.escapeHtml(e.title)}</div>
                <div class="event-meta">
                  ${sub ? `<span>${Utils.colorBadge(color, 8)} ${sub.name}</span>` : ''}
                  <span><i class="fa-solid fa-tag"></i> ${Utils.capitalize(e.type)}</span>
                  ${e.location ? `<span><i class="fa-solid fa-location-dot"></i> ${Utils.escapeHtml(e.location)}</span>` : ''}
                </div>
              </div>
              <div class="event-actions">
                <button class="btn btn-sm btn-icon" title="Editar" onclick="Timeline.openForm('${e.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-icon delete-btn" title="Excluir" onclick="Timeline.deleteEvent('${e.id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
  },

  async openForm(editId = null) {
    const subjectOpts = await Utils.subjectOptions();
    let event = { title: '', type: 'prova', date: Utils.todayISO(), time: '', subjectId: '', location: '', notes: '' };

    if (editId) {
      const events = await db.getEvents();
      const found = events.find(e => e.id === editId);
      if (found) event = found;
    }

    const body = `
      <div class="form-grid">
        <div class="form-group full">
          <label class="label">Título</label>
          <input class="input" id="evt-title" value="${Utils.escapeHtml(event.title)}" placeholder="Ex: Prova de Cálculo II">
        </div>
        <div class="form-group">
          <label class="label">Tipo</label>
          <select class="select" id="evt-type">
            <option value="prova" ${event.type === 'prova' ? 'selected' : ''}>Prova</option>
            <option value="trabalho" ${event.type === 'trabalho' ? 'selected' : ''}>Trabalho</option>
            <option value="evento" ${event.type === 'evento' ? 'selected' : ''}>Evento</option>
            <option value="lembrete" ${event.type === 'lembrete' ? 'selected' : ''}>Lembrete</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label">Matéria</label>
          <select class="select" id="evt-subject">
            <option value="">Nenhuma</option>
            ${subjectOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="label">Data</label>
          <input class="input" type="date" id="evt-date" value="${event.date}">
        </div>
        <div class="form-group">
          <label class="label">Horário</label>
          <input class="input" type="time" id="evt-time" value="${event.time || ''}">
        </div>
        <div class="form-group full">
          <label class="label">Local</label>
          <input class="input" id="evt-location" value="${Utils.escapeHtml(event.location || '')}" placeholder="Ex: Sala 203-B">
        </div>
        <div class="form-group full">
          <label class="label">Observações</label>
          <textarea class="textarea" id="evt-notes" rows="2" placeholder="Anotações extras...">${Utils.escapeHtml(event.notes || '')}</textarea>
        </div>
      </div>
    `;

    const footer = `
      <div class="form-actions">
        <button class="btn" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Timeline.saveEvent('${editId || ''}')">
          <i class="fa-solid fa-check"></i> ${editId ? 'Salvar' : 'Criar'}
        </button>
      </div>
    `;

    Utils.openModal(editId ? 'Editar Evento' : 'Novo Evento', body, footer);
    if (event.subjectId) document.getElementById('evt-subject').value = event.subjectId;
  },

  async saveEvent(editId) {
    const title = document.getElementById('evt-title').value.trim();
    if (!title) { Utils.toast('Informe o título do evento', 'warning'); return; }

    const evt = {
      id: editId || Utils.uuid(),
      title,
      type: document.getElementById('evt-type').value,
      subjectId: document.getElementById('evt-subject').value || null,
      date: document.getElementById('evt-date').value,
      time: document.getElementById('evt-time').value || null,
      location: document.getElementById('evt-location').value.trim() || null,
      notes: document.getElementById('evt-notes').value.trim() || null,
      completed: false,
      createdAt: editId ? undefined : Date.now(),
    };

    // Preserve createdAt on edit
    if (editId) {
      const existing = (await db.getEvents()).find(e => e.id === editId);
      if (existing) evt.createdAt = existing.createdAt;
    }

    await db.saveEvent(evt);
    Utils.closeModal();
    Utils.toast(editId ? 'Evento atualizado' : 'Evento criado', 'success');
    this.render();

    // Schedule notification 10min before
    this.scheduleNotification(evt);
  },

  async deleteEvent(id) {
    const confirmed = await Utils.confirm('Tem certeza que deseja excluir este evento?');
    if (!confirmed) return;
    await db.deleteEvent(id);
    Utils.toast('Evento excluído', 'success');
    this.render();
  },

  scheduleNotification(evt) {
    if (!evt.date || !evt.time) return;
    const eventTime = new Date(`${evt.date}T${evt.time}`);
    const notifyAt = eventTime.getTime() - 10 * 60 * 1000;
    const now = Date.now();
    if (notifyAt > now) {
      setTimeout(() => {
        Utils.notify('StudyFlow — Lembrete', `${evt.title} começa em 10 minutos!`);
      }, notifyAt - now);
    }
  },

  async scheduleAllNotifications() {
    const events = await db.getEvents();
    events.forEach(e => this.scheduleNotification(e));
  }
};
