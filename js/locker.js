/* ============================================================
   STUDYFLOW — Armário Digital (File Locker)
   ============================================================ */

const Locker = {
  async render() {
    const main = document.getElementById('main-content');
    const subjects = await db.getSubjects();
    const files = await db.getFiles();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-folder-open"></i></div>
          <div>
            <h1 class="page-title">Armário Digital</h1>
            <p class="page-description">Repositório centralizado de arquivos e links</p>
          </div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Locker.openForm()">
            <i class="fa-solid fa-plus"></i> Novo Arquivo
          </button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fa-solid fa-file"></i></div>
          <div class="stat-info">
            <div class="stat-label">Total</div>
            <div class="stat-value">${files.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><i class="fa-solid fa-image"></i></div>
          <div class="stat-info">
            <div class="stat-label">Imagens</div>
            <div class="stat-value">${files.filter(f => f.type === 'image').length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-link"></i></div>
          <div class="stat-info">
            <div class="stat-label">Links</div>
            <div class="stat-value">${files.filter(f => f.type === 'link').length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><i class="fa-solid fa-sticky-note"></i></div>
          <div class="stat-info">
            <div class="stat-label">Notas</div>
            <div class="stat-value">${files.filter(f => f.type === 'note').length}</div>
          </div>
        </div>
      </div>

      <div class="tab-bar" id="locker-tabs">
        <button class="tab-item active" data-filter="all">Todos</button>
        <button class="tab-item" data-filter="pdf">PDF</button>
        <button class="tab-item" data-filter="image">Imagens</button>
        <button class="tab-item" data-filter="link">Links</button>
        <button class="tab-item" data-filter="note">Notas</button>
      </div>

      <div class="locker-files" id="locker-list"></div>
    `;

    document.getElementById('locker-tabs').addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-item')) return;
      document.querySelectorAll('#locker-tabs .tab-item').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      this.loadFiles(e.target.dataset.filter);
    });

    await this.loadFiles('all');
  },

  async loadFiles(filter = 'all') {
    const files = await db.getFiles();
    const subjects = await db.getSubjects();
    const subMap = {};
    subjects.forEach(s => subMap[s.id] = s);

    let filtered = files;
    if (filter !== 'all') filtered = files.filter(f => f.type === filter);

    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const container = document.getElementById('locker-list');

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon"><i class="fa-regular fa-folder-open"></i></div>
          <div class="empty-state-text">Nenhum arquivo encontrado.<br>Adicione PDFs, links, imagens e notas.</div>
        </div>
      `;
      return;
    }

    const typeIcons = {
      pdf:   { icon: 'fa-solid fa-file-pdf',       cls: 'pdf' },
      image: { icon: 'fa-solid fa-image',           cls: 'image' },
      link:  { icon: 'fa-solid fa-arrow-up-right-from-square', cls: 'link' },
      note:  { icon: 'fa-solid fa-sticky-note',     cls: 'note' },
      other: { icon: 'fa-solid fa-file',             cls: 'other' },
    };

    container.innerHTML = filtered.map(f => {
      const sub = subMap[f.subjectId];
      const t = typeIcons[f.type] || typeIcons.other;
      return `
        <div class="file-card anim-slide-up">
          <div class="file-card-icon ${t.cls}"><i class="${t.icon}"></i></div>
          <div class="file-card-name">${Utils.escapeHtml(f.name)}</div>
          <div class="file-card-meta">
            ${sub ? `<span>${Utils.colorBadge(sub.color, 7)} ${sub.name}</span>` : ''}
            <span>${Utils.capitalize(f.type)}</span>
            ${f.size ? `<span>${Utils.formatFileSize(f.size)}</span>` : ''}
          </div>
          ${f.description ? `<div class="text-xs text-muted mt-2" style="line-height:1.5">${Utils.escapeHtml(f.description)}</div>` : ''}
          <div class="file-card-actions">
            ${f.type === 'link' && f.url ? `<a class="btn btn-sm" href="${Utils.escapeHtml(f.url)}" target="_blank"><i class="fa-solid fa-external-link"></i> Abrir</a>` : ''}
            <button class="btn btn-sm btn-icon" onclick="Locker.openForm('${f.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-icon delete-btn" onclick="Locker.deleteFile('${f.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  },

  async openForm(editId = null) {
    const subjectOpts = await Utils.subjectOptions();
    let file = { name: '', type: 'note', subjectId: '', url: '', description: '' };

    if (editId) {
      const files = await db.getFiles();
      const found = files.find(f => f.id === editId);
      if (found) file = found;
    }

    const body = `
      <div class="form-grid">
        <div class="form-group full">
          <label class="label">Nome</label>
          <input class="input" id="file-name" value="${Utils.escapeHtml(file.name)}" placeholder="Ex: Resumo - Cap 1">
        </div>
        <div class="form-group">
          <label class="label">Tipo</label>
          <select class="select" id="file-type">
            <option value="note" ${file.type === 'note' ? 'selected' : ''}>Nota/Anotação</option>
            <option value="pdf" ${file.type === 'pdf' ? 'selected' : ''}>PDF</option>
            <option value="image" ${file.type === 'image' ? 'selected' : ''}>Imagem</option>
            <option value="link" ${file.type === 'link' ? 'selected' : ''}>Link</option>
            <option value="other" ${file.type === 'other' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label">Matéria</label>
          <select class="select" id="file-subject">
            <option value="">Geral</option>
            ${subjectOpts}
          </select>
        </div>
        <div class="form-group full">
          <label class="label">URL / Link</label>
          <input class="input" id="file-url" value="${Utils.escapeHtml(file.url || '')}" placeholder="https://...">
        </div>
        <div class="form-group full">
          <label class="label">Descrição</label>
          <textarea class="textarea" id="file-desc" rows="2" placeholder="Breve descrição...">${Utils.escapeHtml(file.description || '')}</textarea>
        </div>
      </div>
    `;

    const footer = `
      <div class="form-actions">
        <button class="btn" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Locker.saveFile('${editId || ''}')">
          <i class="fa-solid fa-check"></i> ${editId ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    `;

    Utils.openModal(editId ? 'Editar Arquivo' : 'Novo Arquivo', body, footer);
    if (file.subjectId) document.getElementById('file-subject').value = file.subjectId;
  },

  async saveFile(editId) {
    const name = document.getElementById('file-name').value.trim();
    if (!name) { Utils.toast('Informe o nome do arquivo', 'warning'); return; }

    const file = {
      id: editId || Utils.uuid(),
      name,
      type: document.getElementById('file-type').value,
      subjectId: document.getElementById('file-subject').value || null,
      url: document.getElementById('file-url').value.trim() || null,
      description: document.getElementById('file-desc').value.trim() || null,
      createdAt: editId ? undefined : Date.now(),
    };

    if (editId) {
      const existing = (await db.getFiles()).find(f => f.id === editId);
      if (existing) file.createdAt = existing.createdAt;
    }

    await db.saveFile(file);
    Utils.closeModal();
    Utils.toast(editId ? 'Arquivo atualizado' : 'Arquivo adicionado', 'success');
    this.render();
  },

  async deleteFile(id) {
    const confirmed = await Utils.confirm('Excluir este arquivo?');
    if (!confirmed) return;
    await db.deleteFile(id);
    Utils.toast('Arquivo excluído', 'success');
    this.render();
  },
};
