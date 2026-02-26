/* ============================================================
   STUDYFLOW — Flashcards (SM-2 Spaced Repetition)
   ============================================================ */

const Flashcards = {
  currentDeck: [],
  currentIndex: 0,
  isFlipped: false,

  async render() {
    const main = document.getElementById('main-content');
    const subjects = await db.getSubjects();
    const allCards = await db.getFlashcards();
    const dueCards = allCards.filter(c => !c.nextReview || new Date(c.nextReview) <= new Date());

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-brain"></i></div>
          <div>
            <h1 class="page-title">Flashcards</h1>
            <p class="page-description">Revisão espaçada inteligente — algoritmo SM-2</p>
          </div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Flashcards.openForm()">
            <i class="fa-solid fa-plus"></i> Novo Card
          </button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon purple"><i class="fa-solid fa-layer-group"></i></div>
          <div class="stat-info">
            <div class="stat-label">Total</div>
            <div class="stat-value">${allCards.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><i class="fa-solid fa-clock-rotate-left"></i></div>
          <div class="stat-info">
            <div class="stat-label">Para Revisar</div>
            <div class="stat-value">${dueCards.length}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><i class="fa-solid fa-graduation-cap"></i></div>
          <div class="stat-info">
            <div class="stat-label">Dominados</div>
            <div class="stat-value">${allCards.filter(c => (c.repetitions || 0) >= 5).length}</div>
          </div>
        </div>
      </div>

      <div class="tab-bar" id="fc-tabs">
        <button class="tab-item active" data-mode="review">Revisar</button>
        <button class="tab-item" data-mode="browse">Gerenciar</button>
      </div>

      <div id="fc-content"></div>
    `;

    document.getElementById('fc-tabs').addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-item')) return;
      document.querySelectorAll('#fc-tabs .tab-item').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      if (e.target.dataset.mode === 'review') this.startReview();
      else this.showBrowser();
    });

    this.startReview();
  },

  async startReview() {
    const allCards = await db.getFlashcards();
    this.currentDeck = allCards.filter(c => !c.nextReview || new Date(c.nextReview) <= new Date());
    this.currentIndex = 0;
    this.isFlipped = false;
    this.showCurrentCard();
  },

  showCurrentCard() {
    const container = document.getElementById('fc-content');

    if (!this.currentDeck.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-circle-check" style="color:var(--sf-success)"></i></div>
          <div class="empty-state-text">Nenhum card para revisar agora!<br>Volte mais tarde ou adicione novos cards.</div>
        </div>
      `;
      return;
    }

    const card = this.currentDeck[this.currentIndex];
    const subjects = this._cachedSubjects || [];

    container.innerHTML = `
      <div class="flashcard-progress">
        <span><i class="fa-solid fa-layer-group"></i> ${this.currentIndex + 1} / ${this.currentDeck.length}</span>
        <span>Repetição: ${card.repetitions || 0}</span>
        <span>Fator: ${(card.easeFactor || 2.5).toFixed(2)}</span>
      </div>

      <div class="flashcard-deck">
        <div class="flashcard ${this.isFlipped ? 'flipped' : ''}" onclick="Flashcards.flipCard()">
          <div class="flashcard-face">
            <div class="flashcard-label"><i class="fa-solid fa-question"></i> Pergunta</div>
            <div class="flashcard-text">${Utils.escapeHtml(card.front)}</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-label"><i class="fa-solid fa-lightbulb"></i> Resposta</div>
            <div class="flashcard-text">${Utils.escapeHtml(card.back)}</div>
          </div>
        </div>
      </div>

      ${this.isFlipped ? `
        <div class="flashcard-rating">
          <button class="rating-btn again" onclick="Flashcards.rate(0)">
            <i class="fa-solid fa-rotate-left"></i>
            <span>De novo</span>
          </button>
          <button class="rating-btn hard" onclick="Flashcards.rate(3)">
            <i class="fa-solid fa-face-meh"></i>
            <span>Difícil</span>
          </button>
          <button class="rating-btn good" onclick="Flashcards.rate(4)">
            <i class="fa-solid fa-face-smile"></i>
            <span>Bom</span>
          </button>
          <button class="rating-btn easy" onclick="Flashcards.rate(5)">
            <i class="fa-solid fa-fire"></i>
            <span>Fácil</span>
          </button>
        </div>
      ` : `
        <div style="text-align:center;margin-top:var(--sp-4)">
          <button class="btn btn-primary btn-lg" onclick="Flashcards.flipCard()">
            <i class="fa-solid fa-rotate"></i> Virar Card
          </button>
        </div>
      `}
    `;
  },

  flipCard() {
    this.isFlipped = !this.isFlipped;
    this.showCurrentCard();
  },

  async rate(quality) {
    const card = this.currentDeck[this.currentIndex];

    // SM-2 algorithm
    let { easeFactor = 2.5, interval = 0, repetitions = 0 } = card;

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      repetitions++;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    card.easeFactor = easeFactor;
    card.interval = interval;
    card.repetitions = repetitions;
    card.nextReview = nextReview.toISOString();
    card.lastReviewed = new Date().toISOString();

    await db.saveFlashcard(card);

    // Move to next card
    this.currentDeck.splice(this.currentIndex, 1);
    if (this.currentIndex >= this.currentDeck.length) this.currentIndex = 0;
    this.isFlipped = false;
    this.showCurrentCard();

    if (!this.currentDeck.length) {
      Utils.toast('Revisão completa! Excelente trabalho!', 'success');
    }
  },

  async showBrowser() {
    const container = document.getElementById('fc-content');
    const allCards = await db.getFlashcards();
    const subjects = await db.getSubjects();
    const subMap = {};
    subjects.forEach(s => subMap[s.id] = s);

    if (!allCards.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-regular fa-clone"></i></div>
          <div class="empty-state-text">Nenhum flashcard criado.<br>Crie cards para começar a revisão espaçada.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Frente</th><th>Verso</th><th>Matéria</th><th>Revisões</th><th></th></tr></thead>
        <tbody>
          ${allCards.map(c => {
            const sub = subMap[c.subjectId];
            return `
              <tr>
                <td>${Utils.escapeHtml(c.front).slice(0, 50)}${c.front.length > 50 ? '…' : ''}</td>
                <td class="text-muted">${Utils.escapeHtml(c.back).slice(0, 40)}${c.back.length > 40 ? '…' : ''}</td>
                <td>${sub ? `${Utils.colorBadge(sub.color, 8)} ${sub.name}` : '—'}</td>
                <td><span class="badge">${c.repetitions || 0}</span></td>
                <td style="text-align:right">
                  <button class="btn btn-sm btn-icon" onclick="Flashcards.openForm('${c.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn btn-sm btn-icon delete-btn" onclick="Flashcards.deleteCard('${c.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  async openForm(editId = null) {
    const subjectOpts = await Utils.subjectOptions();
    let card = { front: '', back: '', subjectId: '' };

    if (editId) {
      const cards = await db.getFlashcards();
      const found = cards.find(c => c.id === editId);
      if (found) card = found;
    }

    const body = `
      <div class="form-group">
        <label class="label">Matéria</label>
        <select class="select" id="fc-subject">
          <option value="">Nenhuma</option>
          ${subjectOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="label">Frente (Pergunta)</label>
        <textarea class="textarea" id="fc-front" rows="3" placeholder="Qual a pergunta?">${Utils.escapeHtml(card.front)}</textarea>
      </div>
      <div class="form-group">
        <label class="label">Verso (Resposta)</label>
        <textarea class="textarea" id="fc-back" rows="3" placeholder="Qual a resposta?">${Utils.escapeHtml(card.back)}</textarea>
      </div>
    `;

    const footer = `
      <div class="form-actions">
        <button class="btn" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Flashcards.saveCard('${editId || ''}')">
          <i class="fa-solid fa-check"></i> ${editId ? 'Salvar' : 'Criar Card'}
        </button>
      </div>
    `;

    Utils.openModal(editId ? 'Editar Flashcard' : 'Novo Flashcard', body, footer);
    if (card.subjectId) document.getElementById('fc-subject').value = card.subjectId;
  },

  async saveCard(editId) {
    const front = document.getElementById('fc-front').value.trim();
    const back = document.getElementById('fc-back').value.trim();
    if (!front || !back) { Utils.toast('Preencha frente e verso', 'warning'); return; }

    const card = {
      id: editId || Utils.uuid(),
      front,
      back,
      subjectId: document.getElementById('fc-subject').value || null,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: null,
      lastReviewed: null,
    };

    // Preserve stats on edit
    if (editId) {
      const existing = (await db.getFlashcards()).find(c => c.id === editId);
      if (existing) {
        card.easeFactor = existing.easeFactor;
        card.interval = existing.interval;
        card.repetitions = existing.repetitions;
        card.nextReview = existing.nextReview;
        card.lastReviewed = existing.lastReviewed;
      }
    }

    await db.saveFlashcard(card);
    Utils.closeModal();
    Utils.toast(editId ? 'Card atualizado' : 'Card criado', 'success');
    this.render();
  },

  async deleteCard(id) {
    const confirmed = await Utils.confirm('Excluir este flashcard?');
    if (!confirmed) return;
    await db.deleteFlashcard(id);
    Utils.toast('Card excluído', 'success');
    this.render();
  },
};
