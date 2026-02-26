/* ============================================================
   STUDYFLOW — Roadmap de Matérias (Topic Tracker)
   ============================================================ */

const Roadmap = {
  async render() {
    const main = document.getElementById('main-content');
    const subjects = await db.getSubjects();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-route"></i></div>
          <div>
            <h1 class="page-title">Roadmap</h1>
            <p class="page-description">Acompanhe os tópicos de cada matéria</p>
          </div>
        </div>
      </div>

      <div id="roadmap-content"></div>
    `;

    await this.loadRoadmap(subjects);
  },

  async loadRoadmap(subjects) {
    const container = document.getElementById('roadmap-content');

    if (!subjects.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-map-signs"></i></div>
          <div class="empty-state-text">Cadastre matérias primeiro para criar o roadmap de tópicos.</div>
        </div>
      `;
      return;
    }

    let html = '';
    for (const sub of subjects) {
      const topics = await db.getTopicsBySubject(sub.id);
      topics.sort((a, b) => (a.order || 0) - (b.order || 0));
      const completed = topics.filter(t => t.completed).length;
      const pct = topics.length ? Math.round((completed / topics.length) * 100) : 0;

      html += `
        <div class="roadmap-subject card" style="margin-bottom:var(--sp-4)">
          <div class="roadmap-subject-header">
            <div style="display:flex;align-items:center;gap:var(--sp-2)">
              ${Utils.colorBadge(sub.color)}
              <span class="roadmap-subject-name">${Utils.escapeHtml(sub.name)}</span>
              <span class="badge">${completed}/${topics.length}</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--sp-2)">
              <span class="roadmap-progress-text">${pct}%</span>
              <button class="btn btn-sm btn-primary" onclick="Roadmap.openTopicForm('${sub.id}')">
                <i class="fa-solid fa-plus"></i> Tópico
              </button>
            </div>
          </div>

          <div class="progress-bar" style="margin-bottom:var(--sp-3)">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>

          ${topics.length ? `
            <div class="topic-list">
              ${topics.map((t, i) => `
                <div class="topic-item">
                  <div class="topic-checkbox ${t.completed ? 'checked' : ''}" onclick="Roadmap.toggleTopic('${t.id}')">
                    ${t.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                  </div>
                  <span class="topic-name ${t.completed ? 'completed' : ''}">${Utils.escapeHtml(t.name)}</span>
                  <div class="topic-actions">
                    <button class="btn btn-sm btn-icon" onclick="Roadmap.openTopicForm('${sub.id}','${t.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-icon delete-btn" onclick="Roadmap.deleteTopic('${t.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="text-sm text-dim" style="padding:var(--sp-2)">Nenhum tópico adicionado.</div>
          `}
        </div>
      `;
    }

    container.innerHTML = html;
  },

  async toggleTopic(id) {
    const topics = await db.getTopics();
    const topic = topics.find(t => t.id === id);
    if (!topic) return;
    topic.completed = !topic.completed;
    await db.saveTopic(topic);
    this.render();
  },

  async openTopicForm(subjectId, editId = null) {
    let topic = { name: '', order: 0 };

    if (editId) {
      const topics = await db.getTopicsBySubject(subjectId);
      const found = topics.find(t => t.id === editId);
      if (found) topic = found;
    } else {
      const topics = await db.getTopicsBySubject(subjectId);
      topic.order = topics.length;
    }

    const body = `
      <div class="form-group">
        <label class="label">Nome do Tópico</label>
        <input class="input" id="topic-name" value="${Utils.escapeHtml(topic.name)}" placeholder="Ex: Derivadas Parciais">
      </div>
      <div class="form-group">
        <label class="label">Ordem</label>
        <input class="input" type="number" id="topic-order" value="${topic.order}" min="0">
      </div>
    `;

    const footer = `
      <div class="form-actions">
        <button class="btn" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Roadmap.saveTopic('${subjectId}','${editId || ''}')">
          <i class="fa-solid fa-check"></i> ${editId ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    `;

    Utils.openModal(editId ? 'Editar Tópico' : 'Novo Tópico', body, footer);
  },

  async saveTopic(subjectId, editId) {
    const name = document.getElementById('topic-name').value.trim();
    if (!name) { Utils.toast('Informe o nome do tópico', 'warning'); return; }

    const topic = {
      id: editId || Utils.uuid(),
      subjectId,
      name,
      order: parseInt(document.getElementById('topic-order').value) || 0,
      completed: false,
    };

    if (editId) {
      const existing = (await db.getTopicsBySubject(subjectId)).find(t => t.id === editId);
      if (existing) topic.completed = existing.completed;
    }

    await db.saveTopic(topic);
    Utils.closeModal();
    Utils.toast(editId ? 'Tópico atualizado' : 'Tópico adicionado', 'success');
    this.render();
  },

  async deleteTopic(id) {
    const confirmed = await Utils.confirm('Excluir este tópico?');
    if (!confirmed) return;
    await db.deleteTopic(id);
    Utils.toast('Tópico excluído', 'success');
    this.render();
  },
};
