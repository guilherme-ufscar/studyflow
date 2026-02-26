/* ============================================================
   STUDYFLOW — Utility Functions
   ============================================================ */

const Utils = {
  /* ---------- ID Generation ---------- */
  uuid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  },

  /* ---------- Date Helpers ---------- */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateLong(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  },

  todayISO() {
    return new Date().toISOString().split('T')[0];
  },

  diffDays(dateStr) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return Math.round((d - today) / 86400000);
  },

  relativeDay(dateStr) {
    const diff = this.diffDays(dateStr);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff === -1) return 'Ontem';
    if (diff > 1 && diff <= 7) return `Em ${diff} dias`;
    if (diff < -1 && diff >= -7) return `${Math.abs(diff)} dias atrás`;
    return this.formatDate(dateStr);
  },

  /* ---------- Toast Notifications ---------- */
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '<i class="fa-solid fa-circle-check" style="color:var(--sf-success)"></i>',
      error:   '<i class="fa-solid fa-circle-xmark" style="color:var(--sf-danger)"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation" style="color:var(--sf-warning)"></i>',
      info:    '<i class="fa-solid fa-circle-info" style="color:var(--sf-purple)"></i>',
    };

    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    container.appendChild(t);

    setTimeout(() => {
      t.classList.add('removing');
      setTimeout(() => t.remove(), 300);
    }, 3500);
  },

  /* ---------- Modal Helper ---------- */
  openModal(titleHtml, bodyHtml, footerHtml = '') {
    let overlay = document.getElementById('sf-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sf-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `<div class="modal" id="sf-modal"></div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) Utils.closeModal();
      });
    }
    const modal = document.getElementById('sf-modal');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${titleHtml}</h3>
        <button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer" style="margin-top:var(--sp-4)">${footerHtml}</div>` : ''}
    `;
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  closeModal() {
    const overlay = document.getElementById('sf-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 250);
    }
  },

  /* ---------- Confirm Dialog ---------- */
  confirm(message) {
    return new Promise((resolve) => {
      const body = `<p style="color:var(--text-secondary);line-height:1.6">${message}</p>`;
      const footer = `
        <div class="form-actions">
          <button class="btn" onclick="Utils._confirmResult(false)">Cancelar</button>
          <button class="btn btn-danger" onclick="Utils._confirmResult(true)">
            <i class="fa-solid fa-trash"></i> Confirmar
          </button>
        </div>
      `;
      Utils.openModal('Confirmar', body, footer);
      Utils._confirmResolve = resolve;
    });
  },

  _confirmResolve: null,
  _confirmResult(val) {
    Utils.closeModal();
    if (Utils._confirmResolve) {
      Utils._confirmResolve(val);
      Utils._confirmResolve = null;
    }
  },

  /* ---------- Subject Color Badge ---------- */
  colorBadge(color, size = 10) {
    return `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:50%;background:${color};flex-shrink:0"></span>`;
  },

  /* ---------- Subject Options <select> ---------- */
  async subjectOptions(selectedId = '') {
    const subjects = await db.getSubjects();
    return subjects.map(s =>
      `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${s.name}</option>`
    ).join('');
  },

  /* ---------- Notifications API ---------- */
  async requestNotifications() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  },

  notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">📘</text></svg>' });
    }
  },

  /* ---------- Misc ---------- */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  formatDuration(minutes) {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m ? `${h}h ${m}min` : `${h}h`;
  },

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};
