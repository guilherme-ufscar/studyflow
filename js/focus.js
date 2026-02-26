/* ============================================================
   STUDYFLOW — Focus Mode (Pomodoro Timer + Stats)
   ============================================================ */

const Focus = {
  timer: null,
  seconds: 0,
  isRunning: false,
  currentSubjectId: null,
  sessionStart: null,

  async render() {
    const main = document.getElementById('main-content');
    const subjectOpts = await Utils.subjectOptions();
    const sessions = await db.getFocusSessions();
    const todaySessions = sessions.filter(s => s.date === Utils.todayISO());
    const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-crosshairs"></i></div>
          <div>
            <h1 class="page-title">Focus Mode</h1>
            <p class="page-description">Cronometre sessões de estudo e acompanhe sua produtividade</p>
          </div>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fa-solid fa-stopwatch"></i></div>
          <div class="stat-info">
            <div class="stat-label">Sessões Hoje</div>
            <div class="stat-value">${todaySessions.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa-solid fa-clock"></i></div>
          <div class="stat-info">
            <div class="stat-label">Tempo Hoje</div>
            <div class="stat-value">${Utils.formatDuration(todayMinutes)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-chart-line"></i></div>
          <div class="stat-info">
            <div class="stat-label">Total Geral</div>
            <div class="stat-value">${Utils.formatDuration(totalMinutes)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><i class="fa-solid fa-fire"></i></div>
          <div class="stat-info">
            <div class="stat-label">Total Sessões</div>
            <div class="stat-value">${sessions.length}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="focus-timer-container">
          <div class="flex items-center gap-3 mb-4">
            <label class="label" style="margin:0">Matéria:</label>
            <select class="select" id="focus-subject" style="width:220px">
              <option value="">Estudo Geral</option>
              ${subjectOpts}
            </select>
          </div>

          <div class="timer-display ${this.isRunning ? 'running' : ''}" id="timer-display">
            <div class="timer-time" id="timer-time">${this.formatTimer(this.seconds)}</div>
            <div class="timer-label">${this.isRunning ? 'Em foco...' : 'Pronto'}</div>
          </div>

          <div class="timer-controls">
            <button class="timer-btn" onclick="Focus.reset()" title="Resetar">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button class="timer-btn primary" onclick="Focus.toggleTimer()" id="timer-toggle-btn">
              <i class="fa-solid fa-${this.isRunning ? 'pause' : 'play'}"></i>
            </button>
            <button class="timer-btn" onclick="Focus.saveSession()" title="Salvar Sessão">
              <i class="fa-solid fa-floppy-disk"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="focus-ranking" style="margin-top:var(--sp-6)">
        <div class="section-title"><i class="fa-solid fa-trophy"></i> Ranking por Matéria</div>
        <div class="ranking-list" id="focus-ranking"></div>
      </div>

      <div style="margin-top:var(--sp-6)">
        <div class="section-title"><i class="fa-solid fa-list"></i> Sessões Recentes</div>
        <div id="focus-sessions-list"></div>
      </div>
    `;

    if (this.currentSubjectId) {
      document.getElementById('focus-subject').value = this.currentSubjectId;
    }

    await this.loadRanking(sessions);
    await this.loadRecentSessions(sessions);
  },

  formatTimer(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  },

  startTimer() {
    this.isRunning = true;
    this.currentSubjectId = document.getElementById('focus-subject')?.value || null;
    if (!this.sessionStart) this.sessionStart = Date.now();

    this.timer = setInterval(() => {
      this.seconds++;
      const timeEl = document.getElementById('timer-time');
      if (timeEl) timeEl.textContent = this.formatTimer(this.seconds);
    }, 1000);

    // Update UI
    const display = document.getElementById('timer-display');
    const toggleBtn = document.getElementById('timer-toggle-btn');
    if (display) display.classList.add('running');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';

    const label = display?.querySelector('.timer-label');
    if (label) label.textContent = 'Em foco...';
  },

  pauseTimer() {
    this.isRunning = false;
    clearInterval(this.timer);
    this.timer = null;

    const display = document.getElementById('timer-display');
    const toggleBtn = document.getElementById('timer-toggle-btn');
    if (display) display.classList.remove('running');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>';

    const label = display?.querySelector('.timer-label');
    if (label) label.textContent = 'Pausado';
  },

  reset() {
    this.pauseTimer();
    this.seconds = 0;
    this.sessionStart = null;
    const timeEl = document.getElementById('timer-time');
    if (timeEl) timeEl.textContent = this.formatTimer(0);

    const label = document.getElementById('timer-display')?.querySelector('.timer-label');
    if (label) label.textContent = 'Pronto';
  },

  async saveSession() {
    if (this.seconds < 10) {
      Utils.toast('Sessão muito curta (mín. 10s)', 'warning');
      return;
    }

    this.pauseTimer();
    const subjectId = document.getElementById('focus-subject')?.value || null;

    const session = {
      id: Utils.uuid(),
      subjectId,
      date: Utils.todayISO(),
      duration: Math.round(this.seconds / 60 * 10) / 10, // minutes with 1 decimal
      startedAt: this.sessionStart,
      endedAt: Date.now(),
    };

    await db.saveFocusSession(session);
    Utils.toast(`Sessão de ${Utils.formatDuration(session.duration)} salva!`, 'success');

    this.seconds = 0;
    this.sessionStart = null;
    this.render();
  },

  async loadRanking(sessions) {
    const container = document.getElementById('focus-ranking');
    const subjects = await db.getSubjects();
    const subMap = {};
    subjects.forEach(s => subMap[s.id] = s);

    // Aggregate by subject
    const agg = {};
    sessions.forEach(s => {
      const key = s.subjectId || '__general';
      if (!agg[key]) agg[key] = 0;
      agg[key] += s.duration || 0;
    });

    const ranking = Object.entries(agg)
      .map(([key, mins]) => ({ key, mins, name: key === '__general' ? 'Estudo Geral' : (subMap[key]?.name || 'Desconhecido'), color: subMap[key]?.color || '#9ca3af' }))
      .sort((a, b) => b.mins - a.mins);

    if (!ranking.length) {
      container.innerHTML = '<div class="text-sm text-dim">Nenhuma sessão registrada ainda.</div>';
      return;
    }

    const posClasses = ['gold', 'silver', 'bronze'];

    container.innerHTML = ranking.map((r, i) => `
      <div class="ranking-item">
        <div class="ranking-pos ${posClasses[i] || ''}">${i + 1}</div>
        <span>${Utils.colorBadge(r.color, 8)}</span>
        <span class="ranking-subject">${Utils.escapeHtml(r.name)}</span>
        <span class="ranking-hours">${Utils.formatDuration(r.mins)}</span>
      </div>
    `).join('');
  },

  async loadRecentSessions(sessions) {
    const container = document.getElementById('focus-sessions-list');
    const subjects = await db.getSubjects();
    const subMap = {};
    subjects.forEach(s => subMap[s.id] = s);

    const recent = [...sessions].sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0)).slice(0, 10);

    if (!recent.length) {
      container.innerHTML = '<div class="text-sm text-dim">Nenhuma sessão ainda.</div>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Data</th><th>Matéria</th><th>Duração</th><th></th></tr></thead>
        <tbody>
          ${recent.map(s => {
            const sub = subMap[s.subjectId];
            return `
              <tr>
                <td>${Utils.formatDate(s.date)}</td>
                <td>${sub ? `${Utils.colorBadge(sub.color, 8)} ${sub.name}` : 'Estudo Geral'}</td>
                <td><strong>${Utils.formatDuration(s.duration)}</strong></td>
                <td style="text-align:right">
                  <button class="btn btn-sm btn-icon delete-btn" onclick="Focus.deleteSession('${s.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  async deleteSession(id) {
    const confirmed = await Utils.confirm('Excluir esta sessão?');
    if (!confirmed) return;
    await db.deleteFocusSession(id);
    Utils.toast('Sessão excluída', 'success');
    this.render();
  },
};
