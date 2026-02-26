/* ============================================================
   STUDYFLOW — Motor de Notas
   Dynamic formula builder (calculator UI)
   Safe expression evaluator + survival calculator
   ============================================================ */

const Grades = {
  formula: '',
  customVars: [],
  DEFAULT_VARS: [
    { letter: 'P', name: 'Prova' },
    { letter: 'T', name: 'Trabalho' },
  ],

  /* ==================== INITIALIZATION ==================== */

  async render() {
    await this.loadCustomVars();
    const main = document.getElementById('main-content');
    const subjects = await db.getSubjects();

    main.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="page-header-icon"><i class="fa-solid fa-chart-column"></i></div>
          <div>
            <h1 class="page-title">Motor de Notas</h1>
            <p class="page-description">Fórmulas dinâmicas, cálculo de média e sobrevivência</p>
          </div>
        </div>
      </div>
      <div id="grades-content"></div>
    `;

    await this.renderContent(subjects);
  },

  async renderContent(subjects) {
    const container = document.getElementById('grades-content');

    if (!subjects.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-regular fa-chart-bar"></i></div>
          <div class="empty-state-text">Cadastre matérias primeiro para gerenciar notas.</div>
        </div>
      `;
      return;
    }

    let html = '';
    for (const sub of subjects) {
      const scheme = await db.getGradeScheme(sub.id);
      const grades = await db.getGradesBySubject(sub.id);
      const gradeMap = {};
      grades.forEach(g => { gradeMap[g.name] = g.value; });

      const formula = scheme?.formula || '';
      const passingGrade = scheme?.passingGrade || 6;
      const vars = this.extractVars(formula);

      let avg = null;
      let allFilled = false;
      let filledCount = 0;

      if (formula && vars.length) {
        const values = {};
        vars.forEach(v => {
          if (gradeMap[v] !== undefined && gradeMap[v] !== null) {
            values[v] = gradeMap[v];
            filledCount++;
          }
        });
        allFilled = filledCount === vars.length;

        if (filledCount > 0) {
          const fullValues = {};
          vars.forEach(v => { fullValues[v] = values[v] ?? 0; });
          try { avg = this.evaluate(formula, fullValues); } catch (e) { /* ignore */ }
        }
      }

      const status = avg === null ? 'pending' :
        (allFilled && avg >= passingGrade) ? 'passing' :
        (allFilled && avg < passingGrade) ? 'failing' : 'partial';

      // Survival
      let survivalHtml = '';
      if (formula && vars.length && filledCount > 0 && filledCount < vars.length) {
        const survival = this.calcSurvival(formula, gradeMap, vars, passingGrade);
        if (survival !== null) {
          if (survival <= 10) {
            survivalHtml = `<div class="survival-indicator"><i class="fa-solid fa-bullseye"></i> Precisa de <strong>${survival.toFixed(1)}</strong> nas restantes para atingir ${passingGrade}</div>`;
          } else {
            survivalHtml = `<div class="survival-indicator danger"><i class="fa-solid fa-triangle-exclamation"></i> Necessário ${survival.toFixed(1)} — aprovação difícil</div>`;
          }
        }
      }

      const statusBadge = status === 'passing'
        ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Aprovado</span>'
        : status === 'failing'
        ? '<span class="badge badge-danger"><i class="fa-solid fa-xmark"></i> Reprovando</span>'
        : status === 'partial'
        ? '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Em andamento</span>'
        : '<span class="badge"><i class="fa-solid fa-minus"></i> Pendente</span>';

      html += `
        <div class="card" style="margin-bottom:var(--sp-4)">
          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3);flex-wrap:wrap;gap:var(--sp-2)">
            <div style="display:flex;align-items:center;gap:var(--sp-2)">
              ${Utils.colorBadge(sub.color, 12)}
              <strong style="font-size:1.05rem">${Utils.escapeHtml(sub.name)}</strong>
              ${statusBadge}
            </div>
            <div style="display:flex;align-items:center;gap:var(--sp-2)">
              <span style="font-size:1.6rem;font-weight:800;color:${
                status === 'passing' ? 'var(--sf-success)' :
                status === 'failing' ? 'var(--sf-danger)' : 'var(--text-primary)'
              }">${avg !== null ? avg.toFixed(1) : '—'}</span>
              <span class="text-xs text-muted">/ ${passingGrade}</span>
            </div>
          </div>

          ${formula ? `
            <!-- Formula -->
            <div style="margin-bottom:var(--sp-3)">
              <div class="text-xs text-muted" style="margin-bottom:4px">
                <i class="fa-solid fa-square-root-variable"></i> Fórmula:
              </div>
              <div class="calc-display-inline">${this.highlightFormula(formula)}</div>
            </div>

            <!-- Grade Inputs -->
            ${vars.length ? `
              <div class="grade-inputs-grid" id="grade-inputs-${sub.id}">
                ${vars.map(v => `
                  <div class="grade-input-item">
                    <label class="grade-input-label">
                      <strong>${v}</strong>
                      <span class="text-dim">· ${this.getVarFullName(v)}</span>
                    </label>
                    <input class="input grade-value-input" type="number"
                           step="0.1" min="0" max="10" placeholder="—"
                           value="${gradeMap[v] !== undefined && gradeMap[v] !== null ? gradeMap[v] : ''}"
                           data-subject="${sub.id}" data-var="${v}"
                           oninput="Grades.onGradeInput('${sub.id}')"
                           onblur="Grades.saveGradeValue('${sub.id}','${v}', this.value)">
                  </div>
                `).join('')}
              </div>

              <div id="grade-result-${sub.id}" style="margin-top:var(--sp-3)">
                ${survivalHtml}
              </div>
            ` : ''}
          ` : `
            <div class="text-sm text-dim" style="margin-bottom:var(--sp-3)">
              <i class="fa-solid fa-info-circle"></i> Configure a fórmula para calcular a média automaticamente.
            </div>
          `}

          <!-- Actions -->
          <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border-light)">
            <button class="btn btn-sm" onclick="Grades.openFormulaBuilder('${sub.id}')">
              <i class="fa-solid fa-calculator"></i> ${formula ? 'Editar Fórmula' : 'Criar Fórmula'}
            </button>
            ${formula && vars.length ? `
              <button class="btn btn-sm btn-danger" onclick="Grades.clearGrades('${sub.id}')">
                <i class="fa-solid fa-eraser"></i> Limpar Notas
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  /* ==================== CUSTOM VARIABLES ==================== */

  async loadCustomVars() {
    const saved = await db.getSetting('customGradeVars');
    this.customVars = saved || [];
  },

  async saveCustomVars() {
    await db.saveSetting('customGradeVars', this.customVars);
  },

  getAllVarTypes() {
    return [...this.DEFAULT_VARS, ...this.customVars];
  },

  getVarFullName(varStr) {
    const letter = varStr.match(/^[A-Z]+/i)?.[0] || '';
    const num = varStr.match(/\d+$/)?.[0] || '';
    const found = this.getAllVarTypes().find(v => v.letter.toUpperCase() === letter.toUpperCase());
    return found ? `${found.name} ${num}` : `${letter}${num}`;
  },

  /* ==================== FORMULA ENGINE ==================== */

  tokenize(formula) {
    const tokens = [];
    let i = 0;
    while (i < formula.length) {
      const ch = formula[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[A-Za-z]/.test(ch)) {
        let name = '';
        while (i < formula.length && /[A-Za-z0-9]/.test(formula[i])) { name += formula[i]; i++; }
        tokens.push({ type: 'VAR', value: name.toUpperCase() });
      } else if (/[\d.]/.test(ch)) {
        let num = '';
        while (i < formula.length && /[\d.]/.test(formula[i])) { num += formula[i]; i++; }
        tokens.push({ type: 'NUM', value: parseFloat(num) });
      } else if (ch === '%') {
        tokens.push({ type: 'PCT' }); i++;
      } else if ('+-*/'.includes(ch)) {
        tokens.push({ type: 'OP', value: ch }); i++;
      } else if ('(['.includes(ch)) {
        tokens.push({ type: 'OPEN' }); i++;
      } else if (')]'.includes(ch)) {
        tokens.push({ type: 'CLOSE' }); i++;
      } else {
        i++;
      }
    }
    return tokens;
  },

  evaluate(formula, vars) {
    const tokens = this.tokenize(formula);
    let pos = 0;

    function peek() { return tokens[pos]; }
    function advance() { return tokens[pos++]; }

    function expr() {
      let left = term();
      while (peek() && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
        const op = advance().value;
        left = op === '+' ? left + term() : left - term();
      }
      return left;
    }

    function term() {
      let left = unary();
      while (peek() && peek().type === 'OP' && (peek().value === '*' || peek().value === '/')) {
        const op = advance().value;
        const right = unary();
        left = op === '*' ? left * right : (right !== 0 ? left / right : 0);
      }
      return left;
    }

    function unary() {
      if (peek() && peek().type === 'OP' && peek().value === '-') {
        advance();
        return -unary();
      }
      return primary();
    }

    function primary() {
      const tok = peek();
      if (!tok) return 0;

      if (tok.type === 'OPEN') {
        advance();
        const val = expr();
        if (peek() && peek().type === 'CLOSE') advance();
        return pct(val);
      }

      if (tok.type === 'NUM') {
        advance();
        return pct(tok.value);
      }

      if (tok.type === 'VAR') {
        advance();
        return pct(vars[tok.value] ?? 0);
      }

      advance();
      return 0;
    }

    function pct(val) {
      if (peek() && peek().type === 'PCT') { advance(); return val / 100; }
      return val;
    }

    return expr();
  },

  extractVars(formula) {
    if (!formula) return [];
    const matches = formula.match(/[A-Za-z]+\d+/g) || [];
    const unique = [...new Set(matches.map(m => m.toUpperCase()))];
    unique.sort((a, b) => {
      const la = a.match(/^[A-Z]+/)[0], lb = b.match(/^[A-Z]+/)[0];
      if (la !== lb) return la.localeCompare(lb);
      return parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]);
    });
    return unique;
  },

  getBracketInfo(formula) {
    let parenDepth = 0, bracketDepth = 0;
    for (const ch of formula) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
    }
    return {
      balanced: parenDepth === 0 && bracketDepth === 0,
      openParens: Math.max(0, parenDepth),
      openBrackets: Math.max(0, bracketDepth),
      total: Math.max(0, parenDepth) + Math.max(0, bracketDepth),
    };
  },

  highlightFormula(formula) {
    if (!formula) return '<span class="text-dim">Sem fórmula</span>';

    // Find unmatched brackets
    const stack = [];
    const unmatchedSet = new Set();
    for (let i = 0; i < formula.length; i++) {
      if ('(['.includes(formula[i])) {
        stack.push({ idx: i, ch: formula[i] });
      } else if (')]'.includes(formula[i])) {
        const expected = formula[i] === ')' ? '(' : '[';
        if (stack.length && stack[stack.length - 1].ch === expected) {
          stack.pop();
        } else {
          unmatchedSet.add(i);
        }
      }
    }
    stack.forEach(s => unmatchedSet.add(s.idx));

    const bracketColors = ['#6366f1', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b'];
    let html = '';
    let depth = 0;
    let i = 0;

    while (i < formula.length) {
      const ch = formula[i];

      if (/[A-Za-z]/.test(ch)) {
        let v = '';
        while (i < formula.length && /[A-Za-z0-9]/.test(formula[i])) { v += formula[i]; i++; }
        html += `<span class="calc-hl-var">${v}</span>`;
        continue;
      }

      if (/[\d.]/.test(ch)) {
        let n = '';
        while (i < formula.length && /[\d.]/.test(formula[i])) { n += formula[i]; i++; }
        html += `<span class="calc-hl-num">${n}</span>`;
        continue;
      }

      if ('(['.includes(ch)) {
        if (unmatchedSet.has(i)) {
          html += `<span class="calc-hl-err">${ch}</span>`;
        } else {
          html += `<span style="color:${bracketColors[depth % bracketColors.length]};font-weight:700">${ch}</span>`;
        }
        depth++;
        i++; continue;
      }

      if (')]'.includes(ch)) {
        depth--;
        if (unmatchedSet.has(i)) {
          html += `<span class="calc-hl-err">${ch}</span>`;
        } else {
          html += `<span style="color:${bracketColors[Math.max(0, depth) % bracketColors.length]};font-weight:700">${ch}</span>`;
        }
        i++; continue;
      }

      if ('+-*/%'.includes(ch)) {
        html += `<span class="calc-hl-op">${ch === '*' ? '×' : ch === '/' ? '÷' : ch}</span>`;
        i++; continue;
      }

      html += ch;
      i++;
    }

    return html;
  },

  /* ==================== FORMULA BUILDER (CALCULATOR UI) ==================== */

  async openFormulaBuilder(subjectId) {
    const scheme = await db.getGradeScheme(subjectId);
    this.formula = scheme?.formula || '';
    const passingGrade = scheme?.passingGrade || 6;
    const allVars = this.getAllVarTypes();

    const body = `
      <!-- Passing Grade -->
      <div class="form-group" style="margin-bottom:var(--sp-4)">
        <label class="label">Nota Mínima para Aprovação</label>
        <input class="input" type="number" id="fb-passing" step="0.1" min="0" max="10"
               value="${passingGrade}" style="max-width:120px">
      </div>

      <!-- Formula Display -->
      <div class="calc-display" id="fb-display">
        <div class="calc-formula" id="fb-formula"></div>
        <div class="calc-status" id="fb-status"></div>
      </div>

      <!-- Variable Buttons -->
      <div class="calc-section-label"><i class="fa-solid fa-font"></i> Variáveis</div>
      <div class="calc-btn-row" id="fb-var-buttons">
        ${allVars.map(v => `
          <button class="calc-btn calc-btn-var" onclick="Grades.builderInsertVar('${v.letter}')" title="${v.name}">
            ${v.letter}<sub id="fb-var-count-${v.letter}"></sub>
          </button>
        `).join('')}
        <button class="calc-btn calc-btn-add" onclick="Grades.openAddVarDialog()" title="Nova variável personalizada">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>

      <!-- Calculator Keypad -->
      <div class="calc-section-label"><i class="fa-solid fa-hashtag"></i> Números & Operadores</div>
      <div class="calc-keypad">
        <button class="calc-btn" onclick="Grades.builderInsertChar('7')">7</button>
        <button class="calc-btn" onclick="Grades.builderInsertChar('8')">8</button>
        <button class="calc-btn" onclick="Grades.builderInsertChar('9')">9</button>
        <button class="calc-btn calc-btn-op" onclick="Grades.builderInsertChar(' / ')" title="Dividir">÷</button>
        <button class="calc-btn calc-btn-action" onclick="Grades.builderBackspace()" title="Apagar"><i class="fa-solid fa-delete-left"></i></button>

        <button class="calc-btn" onclick="Grades.builderInsertChar('4')">4</button>
        <button class="calc-btn" onclick="Grades.builderInsertChar('5')">5</button>
        <button class="calc-btn" onclick="Grades.builderInsertChar('6')">6</button>
        <button class="calc-btn calc-btn-op" onclick="Grades.builderInsertChar(' * ')" title="Multiplicar">×</button>
        <button class="calc-btn calc-btn-action" onclick="Grades.builderClear()" title="Limpar tudo">C</button>

        <button class="calc-btn" onclick="Grades.builderInsertChar('1')">1</button>
        <button class="calc-btn" onclick="Grades.builderInsertChar('2')">2</button>
        <button class="calc-btn" onclick="Grades.builderInsertChar('3')">3</button>
        <button class="calc-btn calc-btn-op" onclick="Grades.builderInsertChar(' - ')" title="Subtrair">−</button>
        <button class="calc-btn calc-btn-op" onclick="Grades.builderInsertChar('%')" title="Porcentagem">%</button>

        <button class="calc-btn" onclick="Grades.builderInsertChar('0')">0</button>
        <button class="calc-btn" onclick="Grades.builderInsertChar('.')">.</button>
        <button class="calc-btn calc-btn-op" onclick="Grades.builderInsertChar(' + ')" title="Somar">+</button>
        <button class="calc-btn calc-btn-bracket" onclick="Grades.builderInsertChar('(')">(</button>
        <button class="calc-btn calc-btn-bracket" onclick="Grades.builderInsertChar(')')">)</button>
      </div>

      <!-- Extra Brackets + Auto-close -->
      <div class="calc-btn-row" style="margin-top:var(--sp-2)">
        <button class="calc-btn calc-btn-bracket" onclick="Grades.builderInsertChar('[')">[</button>
        <button class="calc-btn calc-btn-bracket" onclick="Grades.builderInsertChar(']')">]</button>
        <button class="calc-btn calc-btn-special" onclick="Grades.builderAutoClose()" id="fb-autoclose" title="Fechar parênteses automaticamente">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-fechar
        </button>
      </div>

      <!-- Examples -->
      <details class="calc-examples">
        <summary class="text-xs text-muted" style="cursor:pointer;user-select:none">
          <i class="fa-solid fa-lightbulb"></i> Exemplos de fórmulas
        </summary>
        <div class="calc-examples-body">
          <div><code>(P1 + P2) / 2</code> — Média simples</div>
          <div><code>P1 * 40% + P2 * 60%</code> — Média ponderada</div>
          <div><code>(P1 * 40% + P2 * 60%) * 70% + T1 * 30%</code> — Provas + Trabalho</div>
          <div style="margin-top:var(--sp-2);display:flex;flex-wrap:wrap;gap:4px">
            <button class="btn btn-sm" onclick="Grades.builderSetFormula('(P1 + P2) / 2')">Média Simples</button>
            <button class="btn btn-sm" onclick="Grades.builderSetFormula('P1 * 40% + P2 * 60%')">Ponderada</button>
            <button class="btn btn-sm" onclick="Grades.builderSetFormula('(P1 * 40% + P2 * 60%) * 70% + T1 * 30%')">Provas + Trabalho</button>
          </div>
        </div>
      </details>
    `;

    const footer = `
      <div class="form-actions">
        <button class="btn" onclick="Utils.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Grades.builderSave('${subjectId}')">
          <i class="fa-solid fa-check"></i> Salvar Fórmula
        </button>
      </div>
    `;

    Utils.openModal('Construtor de Fórmula', body, footer);

    // Widen modal
    const modal = document.getElementById('sf-modal');
    if (modal) modal.style.maxWidth = '580px';

    this.builderUpdateDisplay();
  },

  builderInsertVar(letter) {
    // Find highest existing number for this letter
    const regex = new RegExp(letter.toUpperCase() + '(\\d+)', 'gi');
    let max = 0;
    let match;
    while ((match = regex.exec(this.formula)) !== null) {
      max = Math.max(max, parseInt(match[1]));
    }
    this.formula += letter.toUpperCase() + (max + 1);
    this.builderUpdateDisplay();
  },

  builderInsertChar(ch) {
    this.formula += ch;
    this.builderUpdateDisplay();
  },

  builderBackspace() {
    const f = this.formula.trimEnd();
    if (!f) return;

    // If ends with a variable (e.g., P1, T12), remove whole variable
    const varMatch = f.match(/[A-Za-z]+\d+$/);
    if (varMatch) {
      this.formula = f.slice(0, -varMatch[0].length);
    } else {
      // Remove last char, then trim trailing space
      this.formula = f.slice(0, -1);
    }
    this.builderUpdateDisplay();
  },

  builderClear() {
    this.formula = '';
    this.builderUpdateDisplay();
  },

  builderAutoClose() {
    const info = this.getBracketInfo(this.formula);
    if (info.balanced) return;
    for (let i = 0; i < info.openBrackets; i++) this.formula += ']';
    for (let i = 0; i < info.openParens; i++) this.formula += ')';
    this.builderUpdateDisplay();
    Utils.toast(`${info.total} parêntese(s) fechado(s) automaticamente`, 'success');
  },

  builderSetFormula(f) {
    this.formula = f;
    this.builderUpdateDisplay();
  },

  builderUpdateDisplay() {
    const formulaEl = document.getElementById('fb-formula');
    const statusEl = document.getElementById('fb-status');
    if (!formulaEl) return;

    // Formula display
    if (this.formula) {
      formulaEl.innerHTML = this.highlightFormula(this.formula) +
        '<span class="calc-cursor">|</span>';
    } else {
      formulaEl.innerHTML = '<span class="text-dim">Clique nos botões para montar a fórmula…</span>';
    }

    // Status bar
    const vars = this.extractVars(this.formula);
    const info = this.getBracketInfo(this.formula);
    let parts = [];

    if (vars.length) {
      parts.push(`<span><i class="fa-solid fa-font" style="margin-right:3px"></i>${vars.length} var: ${vars.join(', ')}</span>`);
    }

    if (this.formula) {
      if (info.balanced) {
        parts.push(`<span style="color:var(--sf-success)"><i class="fa-solid fa-circle-check"></i> Balanceado</span>`);
      } else {
        parts.push(`<span style="color:var(--sf-danger)"><i class="fa-solid fa-circle-exclamation"></i> ${info.total} a fechar</span>`);
      }

      // Test evaluate with dummy values
      if (vars.length && info.balanced) {
        const testVars = {};
        vars.forEach(v => { testVars[v] = 7; });
        try {
          const testResult = this.evaluate(this.formula, testVars);
          parts.push(`<span class="text-dim">Teste(7): ${testResult.toFixed(2)}</span>`);
        } catch (e) {
          parts.push(`<span style="color:var(--sf-danger)">Erro</span>`);
        }
      }
    }

    statusEl.innerHTML = parts.join('<span class="calc-status-sep">·</span>');

    // Auto-close button state
    const autoBtn = document.getElementById('fb-autoclose');
    if (autoBtn) {
      autoBtn.disabled = info.balanced;
      autoBtn.style.opacity = info.balanced ? '0.4' : '1';
    }

    // Update variable counter subscripts
    this.getAllVarTypes().forEach(v => {
      const el = document.getElementById(`fb-var-count-${v.letter}`);
      if (el) {
        const regex = new RegExp(v.letter.toUpperCase() + '(\\d+)', 'gi');
        let max = 0;
        let m;
        while ((m = regex.exec(this.formula)) !== null) {
          max = Math.max(max, parseInt(m[1]));
        }
        el.textContent = max + 1;
      }
    });
  },

  async builderSave(subjectId) {
    const passingGrade = parseFloat(document.getElementById('fb-passing').value) || 6;

    if (!this.formula.trim()) {
      Utils.toast('Monte a fórmula antes de salvar', 'warning');
      return;
    }

    // Auto-close brackets if needed
    const info = this.getBracketInfo(this.formula);
    if (!info.balanced) {
      this.builderAutoClose();
    }

    const vars = this.extractVars(this.formula);
    if (!vars.length) {
      Utils.toast('A fórmula precisa ter pelo menos uma variável (ex: P1)', 'warning');
      return;
    }

    // Validate with test evaluation
    const testVars = {};
    vars.forEach(v => { testVars[v] = 5; });
    try {
      this.evaluate(this.formula, testVars);
    } catch (e) {
      Utils.toast('Fórmula inválida — verifique a sintaxe', 'error');
      return;
    }

    await db.saveGradeScheme({ subjectId, formula: this.formula, passingGrade });
    Utils.closeModal();
    Utils.toast('Fórmula salva!', 'success');
    this.render();
  },

  /* ==================== CUSTOM VARIABLE DIALOG ==================== */

  openAddVarDialog() {
    let dialog = document.getElementById('fb-var-dialog');
    if (dialog) dialog.remove();

    dialog = document.createElement('div');
    dialog.id = 'fb-var-dialog';
    dialog.className = 'calc-var-dialog';
    dialog.innerHTML = `
      <div class="calc-var-dialog-content">
        <h4 style="margin-bottom:var(--sp-3)">
          <i class="fa-solid fa-plus-circle" style="color:var(--sf-purple)"></i> Nova Variável
        </h4>
        <div class="form-grid" style="gap:var(--sp-3)">
          <div class="form-group" style="margin-bottom:0">
            <label class="label">Letra (A-Z)</label>
            <input class="input" id="fb-new-var-letter" maxlength="1" placeholder="S"
                   style="text-transform:uppercase;width:100%"
                   oninput="this.value = this.value.toUpperCase().replace(/[^A-Z]/g,'')">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="label">Nome</label>
            <input class="input" id="fb-new-var-name" placeholder="Seminário">
          </div>
        </div>
        <div class="form-actions" style="margin-top:var(--sp-3)">
          <button class="btn btn-sm" onclick="document.getElementById('fb-var-dialog').remove()">Cancelar</button>
          <button class="btn btn-sm btn-primary" onclick="Grades.confirmAddVar()">
            <i class="fa-solid fa-check"></i> Adicionar
          </button>
        </div>
        ${this.customVars.length ? `
          <div style="margin-top:var(--sp-3);padding-top:var(--sp-3);border-top:1px solid var(--border-light)">
            <div class="text-xs text-muted" style="margin-bottom:var(--sp-2)">Variáveis personalizadas salvas:</div>
            ${this.customVars.map(v => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0">
                <span class="text-sm"><strong>${v.letter}</strong> — ${v.name}</span>
                <button class="btn btn-sm btn-icon delete-btn" onclick="Grades.removeCustomVar('${v.letter}')" title="Remover">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    document.querySelector('.modal-body')?.appendChild(dialog);
    document.getElementById('fb-new-var-letter')?.focus();
  },

  async confirmAddVar() {
    const letter = (document.getElementById('fb-new-var-letter').value || '').trim().toUpperCase();
    const name = (document.getElementById('fb-new-var-name').value || '').trim();

    if (!letter || !name) { Utils.toast('Preencha a letra e o nome', 'warning'); return; }
    if (!/^[A-Z]$/.test(letter)) { Utils.toast('Use apenas uma letra de A a Z', 'warning'); return; }

    const all = this.getAllVarTypes();
    if (all.find(v => v.letter.toUpperCase() === letter)) {
      Utils.toast(`A letra "${letter}" já está em uso`, 'warning');
      return;
    }

    this.customVars.push({ letter, name });
    await this.saveCustomVars();

    // Insert button dynamically
    const row = document.getElementById('fb-var-buttons');
    if (row) {
      const addBtn = row.querySelector('.calc-btn-add');
      const btn = document.createElement('button');
      btn.className = 'calc-btn calc-btn-var';
      btn.setAttribute('onclick', `Grades.builderInsertVar('${letter}')`);
      btn.title = name;
      btn.innerHTML = `${letter}<sub id="fb-var-count-${letter}">1</sub>`;
      row.insertBefore(btn, addBtn);
    }

    document.getElementById('fb-var-dialog')?.remove();
    Utils.toast(`Variável "${letter}" (${name}) adicionada!`, 'success');
  },

  async removeCustomVar(letter) {
    this.customVars = this.customVars.filter(v => v.letter !== letter);
    await this.saveCustomVars();
    document.getElementById('fb-var-dialog')?.remove();
    this.openAddVarDialog(); // Refresh dialog
    Utils.toast('Variável removida', 'success');
  },

  /* ==================== GRADE INPUT (LIVE) ==================== */

  onGradeInput(subjectId) {
    this._recalcDebounce = this._recalcDebounce || {};
    clearTimeout(this._recalcDebounce[subjectId]);
    this._recalcDebounce[subjectId] = setTimeout(() => this.recalculate(subjectId), 120);
  },

  async recalculate(subjectId) {
    const scheme = await db.getGradeScheme(subjectId);
    if (!scheme?.formula) return;

    const vars = this.extractVars(scheme.formula);
    const container = document.getElementById(`grade-inputs-${subjectId}`);
    const resultEl = document.getElementById(`grade-result-${subjectId}`);
    if (!container || !resultEl) return;

    const values = {};
    let filledCount = 0;
    container.querySelectorAll('.grade-value-input').forEach(inp => {
      const varName = inp.dataset.var;
      if (inp.value !== '') {
        values[varName] = parseFloat(inp.value);
        filledCount++;
      }
    });

    if (filledCount === 0) { resultEl.innerHTML = ''; return; }

    // Evaluate
    const fullValues = {};
    vars.forEach(v => { fullValues[v] = values[v] ?? 0; });
    let result;
    try { result = this.evaluate(scheme.formula, fullValues); }
    catch (e) { resultEl.innerHTML = '<span class="text-sm text-dim">Erro na fórmula</span>'; return; }

    const passingGrade = scheme.passingGrade || 6;
    const allFilled = filledCount === vars.length;

    let html = `
      <div style="display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap">
        <span class="text-sm" style="color:var(--text-secondary)">Resultado:</span>
        <span style="font-size:1.4rem;font-weight:800;color:${
          allFilled && result >= passingGrade ? 'var(--sf-success)' :
          allFilled && result < passingGrade ? 'var(--sf-danger)' : 'var(--text-primary)'
        }">${result.toFixed(2)}</span>
        ${allFilled
          ? `<span class="badge ${result >= passingGrade ? 'badge-success' : 'badge-danger'}">
               ${result >= passingGrade ? '<i class="fa-solid fa-check"></i> Aprovado' : '<i class="fa-solid fa-xmark"></i> Reprovado'}
             </span>`
          : `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Parcial (${filledCount}/${vars.length})</span>`
        }
      </div>
    `;

    // Survival calculation
    if (!allFilled && filledCount > 0) {
      const survival = this.calcSurvival(scheme.formula, values, vars, passingGrade);
      if (survival !== null) {
        if (survival <= 10) {
          html += `<div class="survival-indicator" style="margin-top:var(--sp-2)"><i class="fa-solid fa-bullseye"></i> Precisa de <strong>${survival.toFixed(1)}</strong> nas restantes para atingir ${passingGrade}</div>`;
        } else {
          html += `<div class="survival-indicator danger" style="margin-top:var(--sp-2)"><i class="fa-solid fa-triangle-exclamation"></i> Necessário ${survival.toFixed(1)} — aprovação difícil</div>`;
        }
      }
    }

    resultEl.innerHTML = html;
  },

  async saveGradeValue(subjectId, varName, rawValue) {
    const value = rawValue !== '' ? parseFloat(rawValue) : null;
    const grades = await db.getGradesBySubject(subjectId);
    let grade = grades.find(g => g.name === varName);

    if (value !== null) {
      if (grade) {
        grade.value = value;
      } else {
        grade = { id: Utils.uuid(), subjectId, name: varName, value, weight: 1 };
      }
      await db.saveGrade(grade);
    } else if (grade) {
      await db.deleteGrade(grade.id);
    }
  },

  async clearGrades(subjectId) {
    const confirmed = await Utils.confirm('Limpar todas as notas desta matéria?');
    if (!confirmed) return;
    const grades = await db.getGradesBySubject(subjectId);
    for (const g of grades) await db.deleteGrade(g.id);
    Utils.toast('Notas limpas', 'success');
    this.render();
  },

  /* ==================== SURVIVAL CALCULATOR ==================== */

  calcSurvival(formula, filledValues, allVars, passingGrade) {
    const emptyVars = allVars.filter(v => filledValues[v] === undefined || filledValues[v] === null);
    if (!emptyVars.length) return null;

    // Binary search: find minimum X for all empty vars such that result >= passingGrade
    let lo = 0, hi = 15;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      const testValues = {};
      allVars.forEach(v => {
        testValues[v] = (filledValues[v] !== undefined && filledValues[v] !== null) ? filledValues[v] : mid;
      });

      let result;
      try { result = this.evaluate(formula, testValues); } catch (e) { return null; }

      if (result >= passingGrade) hi = mid;
      else lo = mid;
    }

    return Math.ceil(hi * 10) / 10;
  },
};
