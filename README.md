# StudyFlow — Escopo do Projeto

## 1. Visão Geral

**StudyFlow** é uma plataforma web offline-first de gestão acadêmica pessoal. Construída com HTML5, CSS3 e JavaScript puro (sem frameworks), armazena todos os dados no IndexedDB do navegador. Arquitetura SPA (Single Page Application) com roteamento por hash.

**Público-alvo:** Estudantes universitários que desejam organizar matérias, provas, notas, flashcards, arquivos e sessões de estudo em um único painel.

**Stack:**
- HTML5 semântico
- CSS3 customizado (design system próprio)
- JavaScript ES2020+ (módulos vanilla)
- IndexedDB (persistência offline)
- Font Awesome 6 (iconografia)
- Inter (tipografia via Google Fonts)

---

## 2. Design System — Modern Clean SaaS

O design do StudyFlow segue uma estética **moderna e limpa** inspirada em dashboards SaaS profissionais, com foco em clareza, legibilidade e hierarquia visual.

### 2.1 Paleta de Cores

| Token              | Valor      | Uso                              |
|---------------------|-----------|----------------------------------|
| `--bg-body`         | `#f5f7fb` | Fundo geral da aplicação         |
| `--bg-card`         | `#ffffff` | Cards, sidebar, modais           |
| `--bg-card-hover`   | `#fafbfe` | Hover leve sobre cards           |
| `--bg-input`        | `#f9fafb` | Campos de formulário             |
| `--border-color`    | `#e5e7eb` | Bordas de separação              |
| `--sf-purple`       | `#6366f1` | Cor de destaque principal        |
| `--sf-purple-deep`  | `#4f46e5` | Hover da cor principal           |
| `--sf-purple-50`    | `#eef2ff` | Fundo sutil de elementos ativos  |
| `--sf-blue`         | `#3b82f6` | Cor secundária                   |
| `--sf-success`      | `#22c55e` | Estados positivos / aprovação    |
| `--sf-warning`      | `#f59e0b` | Alertas, atenção                 |
| `--sf-danger`       | `#ef4444` | Erros, reprovação, exclusão      |
| `--text-primary`    | `#111827` | Texto principal                  |
| `--text-secondary`  | `#6b7280` | Texto secundário                 |
| `--text-tertiary`   | `#9ca3af` | Texto terciário / placeholders   |

### 2.2 Tipografia

- **Font family:** Inter (Google Fonts)
- **Pesos:** 300 (light) — 400 (regular) — 500 (medium) — 600 (semibold) — 700 (bold) — 800 (extrabold)
- **Hierarchy:** h1=1.75rem, h2=1.375rem, h3=1.125rem, body=1rem, small=0.875rem, xs=0.75rem

### 2.3 Componentes Visuais

- **Cards:** Background branco `#ffffff`, borda `1px solid #e5e7eb`, `border-radius: 16px`, sombra sutil `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`
- **Botões:** Cantos arredondados `8px`, variantes primary (roxo), success, danger, outline
- **Inputs:** Fundo `#f9fafb`, borda cinza, foco com `box-shadow` roxo e borda roxa
- **Modais:** Overlay escurecido com `blur(4px)`, card central `max-width: 520px`, cantos arredondados `20px`
- **Badges:** Pill shape, backgrounds sutis por tipo (purple-50, success-bg, etc.)
- **Progress bars:** Gradiente roxo→azul, altura 8px
- **Toasts:** Canto superior direito, animados

### 2.4 Iconografia

Toda iconografia usa **Font Awesome 6** (CDN). Zero emojis na interface.

Ícones principais por módulo:
| Módulo          | Ícone                              |
|-----------------|-------------------------------------|
| Home            | `fa-solid fa-house`                |
| Matérias        | `fa-solid fa-book-open`            |
| Cronograma      | `fa-solid fa-calendar-days`        |
| Notas           | `fa-solid fa-chart-column`         |
| Flashcards      | `fa-solid fa-brain`                |
| Roadmap         | `fa-solid fa-route`                |
| Armário Digital | `fa-solid fa-folder-open`          |
| Focus Mode      | `fa-solid fa-crosshairs`           |

### 2.5 Layout

- **Sidebar fixa à esquerda** (260px): background branco, navegação vertical, logo com gradiente roxo/azul
- **Área principal à direita**: padding generoso, page headers com ícone + título
- **Mobile responsivo**: sidebar se esconde, toggle hamburger no canto

### 2.6 Efeitos e Detalhes

- Gradientes sutis (decorativos) no fundo da página com `radial-gradient` e `filter: blur(120px)` (baixa opacidade)
- Sem glassmorphism / sem backdrop-filter nos componentes - visual limpo e direto
- Transições e animações suaves (fade-in, slide-up) para feedback interativo
- Scrollbar customizada (fina, cinza)

---

## 3. Módulo: Smart Timeline (Cronograma)

Gerenciamento de eventos acadêmicos com visualização agrupada por data.

**Funcionalidades:**
- CRUD completo de eventos (título, tipo, data, horário, matéria, local, notas)
- Tipos de evento: Prova, Trabalho, Evento, Lembrete
- Visualização agrupada por dia (cards com separação visual)
- Filtros: Próximos, Passados, Todos
- Stats cards com totais (Total, Próximos, Esta Semana, Atrasados)
- Notificação browser 10min antes (Notifications API)
- Indicador de tempo relativo ("Hoje", "Amanhã", "Em 3 dias")

---

## 4. Módulo: Motor de Notas (Grades)

Sistema de acompanhamento de notas com cálculo de sobrevivência.

**Funcionalidades:**
- Overview visual por matéria (card com média, status, indicador de sobrevivência)
- Configuração de fórmula de avaliação por matéria (componentes + pesos)
- CRUD de notas individuais por matéria (nome, valor 0-10, peso)
- Cálculo automático de média ponderada
- **Cálculo de sobrevivência**: dado pesos e notas obtidas, calcula a nota mínima necessária nas avaliações pendentes para atingir a média de aprovação
- Status visuais: Aprovado (verde), Atenção (amarelo), Reprovando (vermelho)
- Tabela de notas por matéria com edição/exclusão inline

---

## 5. Módulo: Flashcards (SM-2 Spaced Repetition)

Sistema de repetição espaçada para memorização ativa.

**Funcionalidades:**
- CRUD de flashcards (frente, verso, matéria)
- Algoritmo SM-2: `easeFactor`, `interval` e `repetitions` atualizados a cada revisão
- Qualidades de resposta: De novo (0), Difícil (3), Bom (4), Fácil (5)
- Visualização tipo card com flip (frente/verso)
- Stats: Total, Para Revisar (due), Dominados (repetitions ≥ 5)
- Dois modos: Revisão (estudo ativo) e Gerenciar (browse + CRUD)
- Cards devidos filtrados por `nextReview <= agora`

---

## 6. Módulo: Armário Digital (Locker) & Roadmap

### 6.1 Armário Digital
Repositório centralizado de arquivos e links.

**Funcionalidades:**
- CRUD de itens (nome, tipo, matéria, URL, descrição)
- Tipos: PDF, Imagem, Link, Nota, Outro
- Grid de file cards com ícone de tipo (Font Awesome)
- Filtro por tipo via tabs
- Stats: Total, Imagens, Links, Notas
- Links abrem em nova aba

### 6.2 Roadmap de Matérias
Tracker de tópicos por matéria.

**Funcionalidades:**
- Listagem de matérias com barra de progresso
- CRUD de tópicos por matéria (nome, ordem)
- Toggle de conclusão (checkbox visual com animação)
- Progresso percentual por matéria
- Ordenação por campo `order`

---

## 7. Módulo: Focus Mode (Monitoramento)

Cronômetro de sessões de estudo com analytics.

**Funcionalidades:**
- Timer visual circular (display grande, modo running com destaque roxo)
- Controles: Play/Pause, Reset, Salvar Sessão
- Seleção de matéria para a sessão
- Registro de sessão com duração em minutos
- Stats: Sessões Hoje, Tempo Hoje, Total Geral, Total Sessões
- **Ranking por matéria** (pódio visual: ouro/prata/bronze)
- Tabela de sessões recentes (últimas 10)
- Persistência: timer mantém estado durante navegação entre páginas

---

## 8. Créditos

Desenvolvido por **Guilherme Rampazzo** — [www.codermaster.com.br](https://www.codermaster.com.br)

