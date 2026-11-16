/* Espiral v2 — objetivos em trilha. Tudo local (localStorage), sem IA, sem dependências. */
const KEY = 'espiral.v1';
const CATS = ['Faculdade e desenvolvimento profissional', 'Tatuagem e negócios',
  'Projetos criativos e conteúdo', 'Finanças', 'Rotina e vida pessoal'];
const COLORS = ['#5b3df5', '#ff5b1f', '#ffc93c', '#3be0a0', '#ff7ab6'];
const STATUS_LABEL = { rascunho: 'Proposta', ativo: 'Ativo', pausado: 'Pausado', concluido: 'Concluído', arquivado: 'Arquivado' };

/* Modelos de caminho: [etapa, horas]. A última etapa é sempre marco. */
const TEMPLATES = {
  faculdade: [
    ['Listar as matérias com nota abaixo da meta e a causa de cada uma', 1],
    ['Montar horário fixo semanal para as matérias críticas', 1],
    ['Refazer o resumo de uma matéria com prova marcada', 3],
    ['Resolver exercícios ou simulados da matéria mais crítica', 4],
    ['Anotar no calendário a data de cada prova e entrega', 0.5],
    ['Conferir notas e horas de estudo ao fim do mês', 1]],
  tatu: [
    ['Fotografar e catalogar os 10 melhores trabalhos feitos', 2],
    ['Definir tabela de preço por tamanho e por sessão', 1],
    ['Publicar 3 trabalhos com estilo, cidade e legenda', 2],
    ['Responder e converter os 5 contatos mais recentes', 1.5],
    ['Medir agendamentos por semana durante 4 semanas', 1]],
  /* Portfólio de publicidade: baseado em orientações de recrutadores (Meio & Mensagem, Miami Ad School,
     Shift, Na Prática) e na disciplina de Criação Publicitária (P2 · Portfólio, a partir das entregas B1–B6). */
  portfolio: [
    ['Definir foco e juntar referências', 1.5, {
      how: ['Escolha a área principal: direção de arte, redação, social media ou criação em geral',
        'Olhe 5 portfólios de publicitários iniciantes no Behance ou no Cargo e anote o que te fez continuar olhando',
        'Escreva uma frase de posicionamento: "sou ___ e resolvo ___ com ___"'],
      ok: 'Frase de posicionamento escrita e 5 referências salvas'
    }],
    ['Selecionar os 4 a 6 melhores trabalhos', 2, {
      how: ['Reúna tudo: entregas B1 a B6 de Criação, Lab de Campanha, Social Media e projetos pessoais',
        'Fique só com o que você teve participação real e corte a peça mais fraca: você é julgado por ela',
        'Garanta variedade de formatos (título, imagem, manifesto, redes, filme) e anote o que falta'],
      ok: 'Lista de 4 a 6 projetos em ordem, com o mais forte em primeiro'
    }],
    ['Escrever o case de cada projeto', 4, {
      how: ['Para cada projeto: 1 linha de desafio, o insight, a ideia e as peças',
        'Diga o seu papel exato (arte, texto, os dois) e com quem fez',
        'Texto curto: no máximo 80 palavras por case; mostre a campanha, não só uma peça solta'],
      ok: 'Texto final de todos os cases revisado'
    }],
    ['Finalizar as peças e preencher uma lacuna', 6, {
      how: ['Ajuste as peças com o feedback recebido dos professores',
        'Use o mesmo padrão de mockup, tamanho e capa em todos os projetos',
        'Se faltar um formato, crie 1 projeto autoral e deixe claro que é fictício; termine a série inteira'],
      ok: 'Todas as imagens e vídeos exportados no mesmo padrão (vídeo com até 2 min)'
    }],
    ['Montar, revisar e publicar o portfólio', 4, {
      how: ['Monte no Behance (gratuito) ou no Cargo: melhor projeto primeiro, contato na primeira tela',
        'Escreva o "sobre mim" em 3 a 4 linhas, com interesses e repertório além da publicidade',
        'Peça revisão a 2 pessoas (use a orientação de portfólio em aula), gere o PDF e entregue a P2'],
      ok: 'Link publicado, PDF pronto e P2 entregue'
    }]],
  conteudo: [
    ['Escolher 1 formato e 1 canal para os próximos 30 dias', 1],
    ['Definir uma pauta de 8 publicações com títulos provisórios', 2],
    ['Produzir as 2 primeiras peças', 6],
    ['Publicar e registrar alcance e comentários de cada uma', 1],
    ['Ajustar a próxima pauta com base no que teve resposta', 1]],
  financas: [
    ['Somar contas fixas e renda média dos últimos 3 meses', 1],
    ['Definir o valor mensal da reserva e em qual conta ele fica', 0.5],
    ['Cancelar ou renegociar uma despesa recorrente', 1],
    ['Registrar todas as entradas e saídas por 30 dias', 2],
    ['Revisar o saldo da reserva no fim do mês', 0.5]],
  default: [
    ['Escrever o resultado com um número ou uma data', 0.5],
    ['Listar o que já existe relacionado a isso', 1],
    ['Escolher a primeira entrega concreta', 0.5],
    ['Executar a primeira entrega', 3],
    ['Revisar o que funcionou e ajustar o próximo passo', 1]]
};
const TPL_CAT = { faculdade: 0, tatu: 1, portfolio: 0, conteudo: 2, financas: 3, default: 4 };

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- estado ---------- */
let S = load();
const UI = { view: 'mapa', goal: null, zoom: 1, px: 0, py: 0, wiz: null };

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.goals)) { s.settings ||= { weeklyHours: 5 }; s.log ||= []; s.reviews ||= {}; return s; }
  } catch (e) { /* dados ilegíveis: começa vazio sem apagar a chave */ }
  return { v: 1, settings: { weeklyHours: 5 }, goals: [], log: [], reviews: {} };
}
function persist() { localStorage.setItem(KEY, JSON.stringify(S)); }
function commit() { persist(); render(); }

const goal = id => S.goals.find(g => g.id === id);
const progress = g => g.steps.length ? g.steps.filter(s => s.done).length / g.steps.length : 0;
const daysUntil = d => d ? Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000) : null;
const fmtDate = d => d ? d.split('-').reverse().join('/') : '';
function weekStart(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
function keyOf(text) {
  const t = norm(text);
  if (/faculdade|prova|nota|materia|semestre|estudo/.test(t)) return 'faculdade';
  if (/tatu|estudio|cliente|agendament/.test(t)) return 'tatu';
  if (/portf?i?olio|portifolio|behance|vaga|publicidade|agencia|curriculo|networking/.test(t)) return 'portfolio';
  if (/conteudo|youtube|instagram|tiktok|video|canal|post/.test(t)) return 'conteudo';
  if (/financ|dinheiro|reserva|divida|economiz|fundo/.test(t)) return 'financas';
  return 'default';
}

/* Saúde: derivada só de etapas concluídas e datas reais. */
function health(g) {
  if (g.status !== 'ativo') return { k: g.status, t: STATUS_LABEL[g.status] };
  const d = daysUntil(g.deadline);
  if (d !== null && d < 0 && progress(g) < 1) return { k: 'revisar', t: 'Prazo passou' };
  if (!g.steps.some(s => s.done)) return { k: 'novo', t: 'Ainda não começou' };
  const last = S.log.filter(l => l.goal === g.id).map(l => l.at).sort().pop();
  const idle = last ? (Date.now() - new Date(last)) / 86400000 : 999;
  if (idle <= 14) return { k: 'avancando', t: 'Avançando' };
  return { k: 'parado', t: `Sem progresso há ${Math.floor(idle)} dias` };
}
/* Próximo passo: primeira etapa não feita cujas dependências já estão concluídas. */
function nextStep(g) {
  const done = new Set(g.steps.filter(s => s.done).map(s => s.id));
  return g.steps.find(s => !s.done && (s.dependsOn || []).every(d => done.has(d))) || null;
}
/* Estimativa: horas restantes e semanas no ritmo informado. */
function estimate(g, hpw = S.settings.weeklyHours || 5) {
  const hours = g.steps.filter(s => !s.done).reduce((a, s) => a + (+s.hours || 0), 0);
  return { hours, weeks: hours ? Math.ceil(hours / hpw) : 0, hpw };
}

/* ---------- semana ---------- */
function planWeek() {
  const cap = Number(S.settings.weeklyHours) || 5;
  const wk = weekStart();
  const doneIds = new Set(S.goals.flatMap(g => g.steps.filter(s => s.done).map(s => s.id)));
  const cands = [];
  S.goals.filter(g => g.status === 'ativo').forEach(g => g.steps.forEach((s, i) => {
    if (!s.done) cands.push({ g, s, i, blocked: (s.dependsOn || []).some(d => !doneIds.has(d)) });
  }));
  cands.sort((a, b) => (a.blocked - b.blocked) || (a.g.priority - b.g.priority) || (a.i - b.i));
  const now = [], later = [], carry = [];
  let used = 0;
  for (const c of cands) {
    if (c.blocked) { later.push(c); continue; }
    if (c.s.lastPlanned && c.s.lastPlanned < wk) { carry.push(c); continue; }
    if (used + c.s.hours <= cap || now.length === 0) { now.push(c); used += c.s.hours; c.s.lastPlanned ||= wk; }
    else later.push(c);
  }
  return { now, later, carry, used, cap };
}

/* ---------- ações ---------- */
function toggleStep(gid, sid) {
  const g = goal(gid); const s = g?.steps.find(x => x.id === sid); if (!s) return;
  s.done = !s.done;
  if (s.done) {
    s.doneAt = new Date().toISOString();
    S.log.push({ goal: gid, step: sid, at: s.doneAt, title: s.title });
    if (g.steps.every(x => x.done)) { g.status = 'concluido'; g.doneAt = s.doneAt; }
  } else {
    delete s.doneAt;
    S.log = S.log.filter(l => !(l.goal === gid && l.step === sid));
    if (g.status === 'concluido') g.status = 'ativo';
  }
  commit();
}
/* Cria objetivo a partir do assistente. steps: [{title,hours,done,milestone}] */
function createGoal({ text, cat, result, deadline, steps }) {
  const id = uid();
  const ids = steps.map(() => uid());
  const built = steps.map((s, i) => ({
    id: ids[i], title: s.title, hours: s.hours, done: !!s.done, milestone: !!s.milestone,
    how: s.how || [], ok: s.ok || '',
    dependsOn: i > 0 ? [ids[i - 1]] : []
  }));
  const g = {
    id, title: text.split('\n')[0].slice(0, 80) || 'Objetivo sem título', description: text,
    category: cat || CATS[4], result: result || '', deadline: deadline || '',
    status: 'rascunho', priority: 2, steps: built, createdAt: new Date().toISOString()
  };
  S.goals.push(g); UI.goal = id;
  commit();
  return g;
}
function removeGoal(gid) {
  S.goals = S.goals.filter(g => g.id !== gid);
  S.log = S.log.filter(l => l.goal !== gid);
  UI.goal = null;
  commit();
}

/* ---------- renderização ---------- */
function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === UI.view && !UI.goal));
  const main = $('#main');
  if (UI.goal && goal(UI.goal)) { main.innerHTML = goalHTML(goal(UI.goal)); return; }
  if (!S.goals.length) {
    main.innerHTML = `<div class="empty"><div>
      <h2>Qual é o seu<br>próximo passo?</h2>
      <p>Responda 4 perguntas curtas. O Espiral desenha o caminho até o objetivo, em etapas, e diz quantas semanas ele leva no seu ritmo.</p>
      <button class="primary" data-action="novo" style="font-size:18px;padding:14px 24px">Começar um caminho →</button></div>
      <div class="art">${orbArt()}</div></div>`;
    return;
  }
  if (UI.view === 'mapa') { main.innerHTML = mapHTML(); drawMap(); }
  else if (UI.view === 'semana') main.innerHTML = weekHTML();
  else main.innerHTML = listHTML();
}

/* Trilha em espiral: "Hoje" no centro, cada etapa é um nó, a meta fica na ponta. */
function trailSVG(g) {
  const n = g.steps.length, end = n + 1, gap = 30, k = 0.8;
  const R = t => 50 + t * gap, A = t => t * k - Math.PI / 2;
  const P = t => [R(t) * Math.cos(A(t)), R(t) * Math.sin(A(t))];
  const path = tm => {
    const m = Math.max(2, Math.ceil(tm / 0.02)); let d = '';
    for (let i = 0; i <= m; i++) { const [x, y] = P(Math.min(i * 0.02, tm)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    return d;
  };
  const doneIdx = g.steps.reduce((acc, s, i) => s.done ? i : acc, -1);
  const tf = doneIdx >= 0 ? doneIdx + 1 : 0;
  const nxt = nextStep(g);
  const maxR = R(end) + 60;
  const sc = Math.min(1.6, 430 / maxR) * UI.zoom;
  const short = t => t.length > 26 ? t.slice(0, 25) + '…' : t;
  let nodes = '';
  const [sx, sy] = P(0);
  nodes += `<g class="node start" transform="translate(${sx.toFixed(1)} ${sy.toFixed(1)})"><circle r="20" class="disc"/><text class="nt" dy="4" text-anchor="middle">Hoje</text></g>`;
  g.steps.forEach((s, i) => {
    const [x, y] = P(i + 1);
    const isCur = nxt && nxt.id === s.id;
    const r = s.milestone ? 24 : 18;
    nodes += `<g class="node ${s.done ? 'done' : ''} ${isCur ? 'cur' : ''} ${s.milestone ? 'ms' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" data-action="done" data-goal="${g.id}" data-step="${s.id}" style="cursor:pointer">
      <title>${esc(s.title)}</title>
      ${isCur ? `<circle class="pulse" r="${r + 6}"/>` : ''}
      <circle r="${r}" class="disc"/>
      <text class="nt" dy="5" text-anchor="middle">${s.done ? '✓' : (s.milestone ? '★' : i + 1)}</text>
      ${isCur ? `<text class="nlabel" y="${r + 22}" text-anchor="middle">${esc(short(s.title))}</text>` : ''}
    </g>`;
  });
  const [gx, gy] = P(end);
  const reached = progress(g) === 1;
  nodes += `<g class="node goal ${reached ? 'done' : ''}" transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)})"><circle r="28" class="disc"/><text class="nt" dy="7" text-anchor="middle">✦</text>
    <text class="nlabel" y="48" text-anchor="middle">${Math.round(progress(g) * 100)}%</text></g>`;
  return `<svg class="trail" viewBox="${-maxR} ${-maxR} ${2 * maxR} ${2 * maxR}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="gradLine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c9cff"/><stop offset=".55" stop-color="#c49bff"/><stop offset="1" stop-color="#ff8fb1"/></linearGradient>
      <linearGradient id="gradFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c9cff"/><stop offset="1" stop-color="#c49bff"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <g transform="scale(${sc.toFixed(3)})">
      <path d="${path(end)}" class="rail"/>
      ${tf ? `<path d="${path(tf)}" class="fillbg"/><path d="${path(tf)}" class="fill"/>` : ''}
      ${nodes}
    </g></svg>`;
}

function goalHTML(g) {
  const h = health(g), nx = nextStep(g), est = estimate(g), d = daysUntil(g.deadline);
  const tight = d !== null && est.weeks * 7 > d;
  const stepRows = g.steps.map((s, i) => `
    <div class="srow ${s.done ? 'done' : ''} ${nx && nx.id === s.id ? 'cur' : ''}">
      <input type="checkbox" data-action="done" data-goal="${g.id}" data-step="${s.id}" ${s.done ? 'checked' : ''} title="marcar como feito">
      <span class="sn">${i + 1}</span>
      <input class="stitle" data-sfield="title" data-goal="${g.id}" data-step="${s.id}" value="${esc(s.title)}">
      <input class="sh" type="number" step="0.5" min="0" data-sfield="hours" data-goal="${g.id}" data-step="${s.id}" value="${s.hours}" title="horas">
      <select data-sfield="dependsOn" data-goal="${g.id}" data-step="${s.id}" title="só libera depois de">
        <option value="">sem dependência</option>
        ${g.steps.filter(o => o.id !== s.id).map(o => `<option value="${o.id}" ${(s.dependsOn || []).includes(o.id) ? 'selected' : ''}>depois de ${g.steps.indexOf(o) + 1}</option>`).join('')}
      </select>
      <button class="sm ghost" data-action="milestone" data-goal="${g.id}" data-step="${s.id}" title="marco" style="${s.milestone ? 'color:var(--warn)' : ''}">★</button>
      <button class="sm ghost danger" data-action="rmstep" data-goal="${g.id}" data-step="${s.id}" title="remover">✕</button>
      ${s.how?.length || s.ok ? `<details class="howbox"><summary>Como fazer</summary>
        ${s.how?.length ? `<ol class="how">${s.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol>` : ''}
        ${s.ok ? `<div class="okline">✓ Pronto quando: ${esc(s.ok)}</div>` : ''}</details>` : ''}
    </div>`).join('');
  return `
    <div class="goalhead">
      <button class="ghost sm" data-action="voltar">← Universo</button>
      <span style="flex:1"></span>
      ${g.status === 'ativo' || g.status === 'pausado' ? `<button class="sm ${g.reminder ? '' : 'violet'}" data-action="lembrete" data-goal="${g.id}">⏰ ${g.reminder ? esc(fmtRem(g.reminder)) : 'Criar lembrete'}</button>` : ''}
    </div>
    <section class="hero">
      ${g.status === 'concluido' ? `<div class="stamp">CONCLUÍDO</div>` : ''}
      <div class="hero-txt">
        <div class="tags">
          <span class="badge ${h.k}">${h.t}</span>
          <span class="tag">${esc(g.category)}</span>
          <span class="tag">${g.deadline ? 'prazo ' + fmtDate(g.deadline) + (d !== null ? ` · ${d < 0 ? 'vencido' : d + ' dias'}` : '') : 'sem prazo'}</span>
        </div>
        <h1 class="gtitle">${esc(g.title)}</h1>
        <div class="segs" title="uma barra por etapa">${g.steps.map((s, i) => `<i class="${s.done ? 'on' : (nx && nx.id === s.id ? 'cur' : '')}"></i>`).join('')}</div>
        <div class="muted">${g.steps.filter(s => s.done).length} de ${g.steps.length} etapas${g.result ? ' · alvo: ' + esc(g.result) : ''}${g.status !== 'rascunho' && est.weeks ? ` · faltam ~${est.weeks} semana(s)` : ''}</div>
      </div>
      <div class="orb" style="--p:${Math.round(progress(g) * 100)}">${progress(g) > 0 ? '<div class="liquid"></div>' : ''}<div class="pct">${Math.round(progress(g) * 100)}<small>%</small></div></div>
    </section>

    ${g.status === 'rascunho' ? `
    <div class="approve">
      <div class="info"><b>Caminho proposto.</b> Ajuste as etapas e aprove quando estiver certo. Nada começa antes disso.
        <div class="muted">${est.hours} h no total ≈ <b>${est.weeks} semana(s)</b> com ${est.hpw} h por semana${tight ? ' · <span class="warn">prazo apertado para esse ritmo</span>' : ''}</div></div>
      <button class="primary" data-action="aprovar" data-goal="${g.id}">Aprovar caminho</button>
    </div>` : ''}

    <div class="trailwrap">${trailSVG(g)}
      <div class="hint-bar">Toque em um nó para marcar como feito · zoom: + / −</div>
    </div>
    <div class="mapctl" style="position:relative;right:auto;bottom:auto;flex-direction:row;justify-content:flex-end;margin-top:8px">
      <button data-action="zout" title="Afastar">−</button>
      <button data-action="zin" title="Aproximar">+</button>
    </div>

    <div class="nextcard">
      <div class="info">${nx
        ? `<div class="muted">PRÓXIMO PASSO · etapa ${g.steps.indexOf(nx) + 1} de ${g.steps.length} · ${nx.hours} h</div>
           <div class="nxt">${esc(nx.title)}</div>
           ${nx.how?.length ? `<ol class="how">${nx.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol>` : ''}
           ${nx.ok ? `<div class="okline">✓ Pronto quando: ${esc(nx.ok)}</div>` : ''}`
        : (progress(g) === 1 ? `<div class="nxt">Caminho concluído ✦</div>` : `<div class="muted">Nenhum passo liberado agora. Confira as dependências abaixo.</div>`)}
      </div>
      ${nx ? `<button class="primary" data-action="done" data-goal="${g.id}" data-step="${nx.id}">Marcar como feito</button>` : ''}
    </div>

    <div class="sec">Etapas</div>
    ${stepRows}
    <div class="acts"><button class="sm" data-action="addstep" data-goal="${g.id}">+ Etapa</button></div>

    <div class="sec">Objetivo</div>
    <div class="acts">
      ${g.status === 'ativo' ? `<button data-action="status" data-goal="${g.id}" data-to="pausado">Pausar</button>` : ''}
      ${g.status === 'pausado' ? `<button data-action="status" data-goal="${g.id}" data-to="ativo">Retomar</button>` : ''}
      ${g.status !== 'concluido' && g.status !== 'rascunho' ? `<button data-action="status" data-goal="${g.id}" data-to="concluido">Marcar concluído</button>` : ''}
      ${g.status !== 'arquivado' ? `<button data-action="status" data-goal="${g.id}" data-to="arquivado">Arquivar</button>` : `<button data-action="status" data-goal="${g.id}" data-to="ativo">Desarquivar</button>`}
      <button class="danger" data-action="excluir" data-goal="${g.id}">Excluir</button>
    </div>
    <div class="sec">Histórico</div>
    ${S.log.filter(l => l.goal === g.id).slice(-8).reverse().map(l => `<div class="muted">${new Date(l.at).toLocaleDateString('pt-BR')} · ${esc(l.title)}</div>`).join('') || '<div class="muted">Nenhuma etapa concluída ainda.</div>'}
  `;
}

function mapHTML() {
  return `<div class="mapwrap">
    <svg id="map" viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="hint-bar">Toque em um objetivo · arraste para mover · roda do mouse para zoom</div>
    <div class="mapctl">
      <button data-action="zin" title="Aproximar">+</button>
      <button data-action="zout" title="Afastar">−</button>
      <button data-action="zreset" title="Centralizar">◎</button>
    </div></div>`;
}

/* Universo: objetivos dispostos ao longo de uma espiral; cada um mostra o progresso como anel. */
function drawMap() {
  const svg = $('#map'); if (!svg) return;
  const gs = S.goals.filter(g => g.status !== 'arquivado');
  const cx = 500, cy = 360;
  const th = i => 1.2 + 0.85 * i, rr = i => 90 + 36 * i;
  const n = gs.length, maxR = n ? rr(Math.max(n - 1, 0)) + 60 : 200;
  const z = Math.min(1, 470 / maxR) * UI.zoom;
  let d = '';
  for (let i = 0; i <= Math.max(n, 3) + 0.5; i += 0.05) {
    const x = cx + rr(i) * Math.cos(th(i)), y = cy + rr(i) * Math.sin(th(i));
    d += (d ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  let nodes = '';
  gs.forEach((g, i) => {
    const x = cx + rr(i) * Math.cos(th(i)), y = cy + rr(i) * Math.sin(th(i));
    const col = COLORS[CATS.indexOf(g.category) % COLORS.length] || COLORS[0];
    const p = progress(g), R = 24, C = 2 * Math.PI * R;
    const dim = g.status === 'rascunho' || g.status === 'pausado' ? 0.5 : 1;
    const label = g.title.length > 24 ? g.title.slice(0, 23) + '…' : g.title;
    nodes += `<g data-goal="${g.id}" style="cursor:pointer" opacity="${dim}">
      <circle cx="${x}" cy="${y}" r="${R + 10}" fill="${col}" opacity=".12"/>
      <circle cx="${x}" cy="${y}" r="${R}" fill="#fffdf8" stroke="#111" stroke-width="3"/>
      <circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${x} ${y})"/>
      <text class="nlabel" x="${x}" y="${y + R + 18}" text-anchor="middle">${esc(label)}</text>
      <text class="nsub" x="${x}" y="${y + R + 34}" text-anchor="middle">${Math.round(p * 100)}% · ${STATUS_LABEL[g.status]}</text>
    </g>`;
  });
  svg.innerHTML = `
    <defs><filter id="mglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g id="world" transform="translate(${500 + UI.px} ${360 + UI.py}) scale(${z}) translate(-500 -360)">
      <path d="${d}" fill="none" stroke="#111" stroke-width="${2.5 / z}" stroke-dasharray="2 10" stroke-linecap="round" opacity=".5"/>
      <circle cx="${cx}" cy="${cy}" r="36" fill="#3be0a0" stroke="#111" stroke-width="3"/>
      <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="#111" font-size="15" font-family="Archivo Black">VOCÊ</text>
      ${nodes}
    </g>`;
  bindMap(svg, maxR);
}
function bindMap(svg, maxR) {
  let drag = null, moved = false;
  svg.onpointerdown = e => {
    drag = { x: e.clientX, y: e.clientY, px: UI.px, py: UI.py, node: e.target.closest('[data-goal]') };
    moved = false; svg.setPointerCapture(e.pointerId);
  };
  svg.onpointermove = e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
    const k = 1000 / svg.getBoundingClientRect().width;
    UI.px = drag.px + dx * k; UI.py = drag.py + dy * k;
    drawMap();
  };
  svg.onpointerup = svg.onpointercancel = () => {
    const was = drag; drag = null;
    if (!was || moved || !was.node) return;
    UI.goal = was.node.dataset.goal; render();
  };
  svg.onwheel = e => { e.preventDefault(); UI.zoom = clamp(UI.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.5, 3); drawMap(); };
}

function weekHTML() {
  const p = planWeek();
  const wk = weekStart();
  const item = c => `<div class="row">
      <input type="checkbox" data-action="done" data-goal="${c.g.id}" data-step="${c.s.id}" ${c.s.done ? 'checked' : ''}>
      <div class="grow"><div>${esc(c.s.title)}</div>
      <div class="muted">${esc(c.g.title)} · ${c.s.hours} h${c.s.milestone ? ' · ★ marco' : ''}${c.blocked ? ' · aguarda outra etapa' : ''}</div></div>
    </div>`;
  const carry = p.carry.map(c => `<div class="row carry"><div class="grow">
      <div>${esc(c.s.title)}</div><div class="muted">${esc(c.g.title)} · não concluída na semana anterior</div>
      <div class="acts">
        <button class="sm" data-action="reagendar" data-goal="${c.g.id}" data-step="${c.s.id}">Reagendar</button>
        <button class="sm" data-action="reduzir" data-goal="${c.g.id}" data-step="${c.s.id}">Reduzir pela metade</button>
        <button class="sm" data-action="substituir" data-goal="${c.g.id}" data-step="${c.s.id}">Substituir</button>
        <button class="sm danger" data-action="descartar" data-goal="${c.g.id}" data-step="${c.s.id}">Descartar</button>
      </div></div></div>`).join('');
  const rv = S.reviews[wk] || {};
  return `
    <div class="sec">Semana de ${fmtDate(wk)} · ${p.used.toFixed(1)} de ${p.cap} h planejadas</div>
    ${p.carry.length ? `<div class="sec">Pendências da semana anterior</div>${carry}` : ''}
    <div class="sec">Prioridade desta semana</div>
    ${p.now.map(item).join('') || '<p class="muted">Nada ativo para planejar. Aprove um caminho para ver as ações aqui.</p>'}
    <div class="sec">Pode esperar</div>
    ${p.later.map(item).join('') || '<p class="muted">—</p>'}
    <div class="sec">Revisão semanal</div>
    <div class="card" style="cursor:default">
      <label>O que foi feito?</label><textarea data-review="feito">${esc(rv.feito)}</textarea>
      <label>O que travou?</label><textarea data-review="travou">${esc(rv.travou)}</textarea>
      <label>O que mudou?</label><textarea data-review="mudou">${esc(rv.mudou)}</textarea>
      <label>O que vem a seguir?</label><textarea data-review="seguir">${esc(rv.seguir)}</textarea>
    </div>`;
}

function listHTML() {
  const order = { revisar: 0, parado: 1, novo: 2, avancando: 3, rascunho: 4, pausado: 5, concluido: 6, arquivado: 7 };
  const gs = [...S.goals].sort((a, b) => order[health(a).k] - order[health(b).k]);
  return `<div class="grid">${gs.map(g => {
    const h = health(g), p = progress(g), d = daysUntil(g.deadline), nx = nextStep(g);
    const col = COLORS[CATS.indexOf(g.category) % COLORS.length] || COLORS[0];
    return `<div class="card" data-goal="${g.id}">
      <div class="orbmini" style="--c:${col}"></div>
      <span class="badge ${h.k}">${h.t}</span>
      <h3>${esc(g.title)}</h3>
      <div class="muted">${esc(g.category)}</div>
      <div class="bar">${g.steps.map(s => `<i class="${s.done ? 'on' : ''}"></i>`).join('')}</div>
      <div class="muted">${g.steps.filter(s => s.done).length} de ${g.steps.length} etapas${g.deadline ? ` · prazo ${fmtDate(g.deadline)}${d !== null ? ` (${d < 0 ? 'vencido' : d + ' dias'})` : ''}` : ''}</div>
      ${nx ? `<div class="muted" style="margin-top:6px">→ ${esc(nx.title)}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

/* ---------- assistente de criação (4 perguntas, sem IA) ---------- */
const WIZ_LAST = 4; // índice da tela de revisão
function wizStart() {
  UI.wiz = { step: 0, text: '', cat: CATS[4], done: [], deadline: '', hours: S.settings.weeklyHours || 5 };
  openModal(wizHTML());
}
function readWiz() {
  const w = UI.wiz; if (!w) return;
  const t = $('#w-text'); if (t) w.text = t.value.trim();
  const c = $('#w-cat'); if (c) w.cat = c.value;
  const dt = $('#w-date'); if (dt) w.deadline = dt.value;
  const h = $('#w-hours'); if (h) w.hours = Number(h.value) || 5;
  const boxes = document.querySelectorAll('[data-wdone]');
  if (boxes.length) w.done = [...boxes].filter(b => b.checked).map(b => +b.dataset.wdone);
}
function wizHTML() {
  const w = UI.wiz, tpl = TEMPLATES[keyOf(w.text)], steps = w.step === WIZ_LAST ? buildSteps() : null;
  const bar = `<div class="progress">${[0, 1, 2, 3, 4].map(i => `<i class="${i <= w.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (w.step === 0) body = `<h2>O que você quer alcançar?</h2>
    <p class="muted">Escreva com as suas palavras. Pode ser curto.</p>
    <textarea id="w-text" placeholder="Ex.: melhorar minhas notas na faculdade até o fim do semestre">${esc(w.text)}</textarea>
    <label>Área da vida</label>
    <select id="w-cat">${CATS.map(c => `<option ${c === w.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
  else if (w.step === 1) body = `<h2>O que você já fez?</h2>
    <p class="muted">Marque o que já está pronto. Se começa do zero, deixe tudo desmarcado.</p>
    ${tpl.map((s, i) => `<label class="ck"><input type="checkbox" data-wdone="${i}" ${w.done.includes(i) ? 'checked' : ''}> ${esc(s[0])}</label>`).join('')}`;
  else if (w.step === 2) body = `<h2>Existe um prazo real?</h2>
    <p class="muted">Se for só uma intenção de longo prazo, deixe vazio. O Espiral avisa se o ritmo não couber no prazo.</p>
    <label>Prazo</label><input id="w-date" type="date" value="${w.deadline}">`;
  else if (w.step === 3) body = `<h2>Quantas horas por semana você consegue dar?</h2>
    <p class="muted">Seja realista. Um plano menor que você cumpre vale mais.</p>
    <label>Horas por semana</label><input id="w-hours" type="number" min="0.5" step="0.5" value="${w.hours}">`;
  else {
    const hours = steps.reduce((a, s) => a + (s.done ? 0 : s.hours), 0);
    const weeks = Math.ceil(hours / (w.hours || 5));
    const d = daysUntil(w.deadline);
    body = `<h2>Caminho proposto</h2>
      <p class="muted">Você poderá ajustar tudo depois. Nada começa antes de você aprovar.</p>
      ${steps.map((s, i) => `<div class="ck" style="cursor:default;${s.done ? 'opacity:.55' : ''}"><b style="color:var(--a);width:22px">${i + 1}</b> <span style="flex:1">${esc(s.title)}${s.milestone ? ' ★' : ''}</span><span class="muted">${s.hours} h</span></div>`).join('')}
      <div class="summary">${hours} h restantes ≈ <b>${weeks} semana(s)</b> no ritmo de ${w.hours} h por semana.
        ${d !== null && weeks * 7 > d ? `<div class="warn">O prazo (${d} dias) é curto para esse ritmo. Aumente as horas ou ajuste o prazo.</div>` : ''}</div>`;
  }
  const nav = `<div class="acts" style="justify-content:space-between">
      <button data-action="${w.step === 0 ? 'fecharmodal' : 'wback'}">${w.step === 0 ? 'Cancelar' : 'Voltar'}</button>
      ${w.step === WIZ_LAST
        ? `<button class="primary" data-action="wgen">Criar caminho</button>`
        : `<button class="primary" data-action="wnext">${w.step === 0 && !w.text ? 'Escreva algo' : 'Próximo'}</button>`}
    </div>`;
  return bar + body + nav;
}
function buildSteps() {
  const w = UI.wiz, tpl = TEMPLATES[keyOf(w.text)];
  return tpl.map(([title, hours, extra], i) => ({ title, hours, done: w.done.includes(i), milestone: i === tpl.length - 1, how: extra?.how || [], ok: extra?.ok || '' }));
}

/* Decoração da tela inicial: esferas 3D com as cores do app. */
function orbArt() {
  const sph = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#sph${c})" stroke="#111" stroke-width="3"/>`;
  return `<svg viewBox="0 0 360 360" width="100%" style="max-width:340px">
    <defs>
      ${['o', 'v', 'y', 'm', 'p'].map((k, i) => {
        // gradiente radial dá o efeito de esfera 3D
        const c = ['#ff5b1f', '#5b3df5', '#ffc93c', '#3be0a0', '#ff7ab6'][i];
        return `<radialGradient id="sph${k}" cx="32%" cy="28%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".18" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".85"/></radialGradient>`;
      }).join('')}
    </defs>
    <rect x="20" y="20" width="320" height="320" rx="36" fill="#fffdf8" stroke="#111" stroke-width="3"/>
    <path d="M60 280 C120 220 170 240 210 190 S 290 110 300 80" fill="none" stroke="#111" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
    ${sph(120, 150, 52, 'v')}
    ${sph(230, 110, 34, 'o')}
    ${sph(245, 225, 40, 'y')}
    ${sph(105, 260, 22, 'm')}
  </svg>`;
}

/* ---------- lembretes: Google Agenda ou arquivo .ics (avisam mesmo com o app fechado) ---------- */
const DAYS = [['MO', 'Seg'], ['TU', 'Ter'], ['WE', 'Qua'], ['TH', 'Qui'], ['FR', 'Sex'], ['SA', 'Sáb'], ['SU', 'Dom']];
const JS_DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const APP_URL = location.protocol.startsWith('http') ? location.origin + location.pathname.replace(/index\.html$/, '') : '';
const pad = n => String(n).padStart(2, '0');
const stamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const fmtRem = r => `${DAYS.filter(([c]) => r.days.includes(c)).map(([, n]) => n).join(', ')} · ${r.time}`;

function firstOccurrence(days, time) {
  const [hh, mm] = time.split(':').map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(hh, mm, 0, 0);
    if (days.includes(JS_DAY[d.getDay()]) && d > now) return d;
  }
  return null;
}
function reminderEvent(r) {
  const g = r.gid ? goal(r.gid) : null;
  const nx = g ? nextStep(g) : null;
  const title = g ? `Espiral · ${g.title}` : 'Espiral · revisão semanal';
  const details = g
    ? `Próximo passo: ${nx ? `${nx.title} (${nx.hours} h)` : 'abrir o Espiral e escolher o próximo passo'}\n\nAbra o Espiral${APP_URL ? ': ' + APP_URL : ''} e marque o que fez.`
    : `Revisão no Espiral: o que foi feito, o que travou, o que mudou e o que vem a seguir.${APP_URL ? '\n\n' + APP_URL : ''}`;
  const start = firstOccurrence(r.days, r.time);
  const end = new Date(start.getTime() + r.dur * 60000);
  return { title, details, start, end, rrule: `RRULE:FREQ=WEEKLY;BYDAY=${r.days.join(',')}` };
}
function googleURL(ev) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  const p = { action: 'TEMPLATE', text: ev.title, details: ev.details, dates: `${stamp(ev.start)}/${stamp(ev.end)}`, ctz: tz, recur: ev.rrule };
  return 'https://calendar.google.com/calendar/render?' + Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}
function icsText(ev) {
  const e = s => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const fold = l => l.length <= 74 ? l : l.match(/.{1,73}/g).join('\r\n ');
  const utc = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Espiral//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${uid()}-${Date.now()}@espiral`, `DTSTAMP:${utc}`,
    `DTSTART:${stamp(ev.start)}`, `DTEND:${stamp(ev.end)}`, ev.rrule,
    `SUMMARY:${e(ev.title)}`, `DESCRIPTION:${e(ev.details)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${e(ev.title)}`, 'TRIGGER:-PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
function openReminder(gid) {
  const saved = gid ? goal(gid)?.reminder : S.settings.reviewReminder;
  UI.rem = saved ? { gid, ...saved, days: [...saved.days] }
    : gid ? { gid, days: ['MO', 'TH'], time: '19:00', dur: 60 } : { gid: null, days: ['SU'], time: '18:00', dur: 30 };
  openModal(reminderHTML());
}
function reminderHTML() {
  const r = UI.rem, g = r.gid ? goal(r.gid) : null;
  return `<h2>${g ? 'Lembrete' : 'Revisão semanal'}</h2>
    <p class="muted">${g ? `Escolha quando você vai trabalhar em <b>${esc(g.title)}</b>. O lembrete vai para a sua agenda e avisa mesmo com o app fechado, em qualquer aparelho.` : 'Um lembrete por semana para revisar o que foi feito e planejar a próxima.'}</p>
    <label>Dias</label>
    <div class="days">${DAYS.map(([c, n]) => `<button class="sm day ${r.days.includes(c) ? 'on' : ''}" data-action="rday" data-day="${c}">${n}</button>`).join('')}</div>
    <label>Hora</label><input id="r-time" type="time" value="${r.time}">
    <label>Duração</label><select id="r-dur">${[15, 30, 60, 90, 120].map(m => `<option value="${m}" ${r.dur == m ? 'selected' : ''}>${m < 60 ? m + ' min' : (m / 60) + ' h'}</option>`).join('')}</select>
    <div class="summary">A notificação vem da sua agenda, no aviso padrão dela. ${g ? 'O evento leva o próximo passo atual.' : ''}</div>
    <div class="acts">
      <button class="primary" data-action="rgoogle">Adicionar ao Google Agenda</button>
      <button data-action="rics">Outra agenda (.ics)</button>
      <button class="ghost" data-action="fecharmodal">Agora não</button>
    </div>`;
}
function readRem() {
  const r = UI.rem; if (!r) return;
  const t = $('#r-time'); if (t && t.value) r.time = t.value;
  const d = $('#r-dur'); if (d) r.dur = Number(d.value) || 60;
}
function saveRem() {
  const r = UI.rem, data = { days: r.days, time: r.time, dur: r.dur };
  if (r.gid) goal(r.gid).reminder = data; else S.settings.reviewReminder = data;
  persist();
}
function downloadICS(ev) {
  const text = icsText(ev);
  if (isIOS) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  a.download = 'espiral-lembrete.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/* ---------- instalação como app ---------- */
let installPrompt = null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function showInstall() {
  if (!isStandalone() && location.protocol.startsWith('http')) $('#btn-install')?.classList.remove('hidden');
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; showInstall(); });
window.addEventListener('appinstalled', () => { installPrompt = null; $('#btn-install')?.classList.add('hidden'); });
if (isIOS) showInstall(); // o iPhone não avisa quando dá para instalar; mostra o botão com instruções
function installHelp() {
  openModal(`<h2>Instalar o Espiral</h2>
    ${isIOS
      ? `<div class="ck" style="cursor:default"><b>1</b> Abra este link no <b>Safari</b>.</div>
         <div class="ck" style="cursor:default"><b>2</b> Toque em <b>Compartilhar</b> (quadrado com seta para cima).</div>
         <div class="ck" style="cursor:default"><b>3</b> Escolha <b>Adicionar à Tela de Início</b> e toque em Adicionar.</div>`
      : `<div class="ck" style="cursor:default"><b>Chrome ou Edge:</b> clique no ícone de instalar no fim da barra de endereço, ou no menu ⋮ → Instalar Espiral.</div>
         <div class="ck" style="cursor:default"><b>Android:</b> menu ⋮ → Instalar app (ou Adicionar à tela inicial).</div>`}
    <div class="summary">O app instalado abre em janela própria, funciona sem internet e ocupa menos de 200 KB.</div>
    <div class="acts"><button data-action="fecharmodal">Fechar</button></div>`);
}
navigator.storage?.persist?.().catch(() => {}); // pede ao navegador para não apagar os dados

/* ---------- modais ---------- */
function openModal(html) { $('#modal').innerHTML = `<div class="box">${html}</div>`; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; UI.wiz = null; UI.rem = null; }
function openSettings() {
  openModal(`<h2>Configurações</h2>
    <label>Horas por semana que você consegue dedicar</label>
    <input id="s-h" type="number" min="0" step="0.5" value="${S.settings.weeklyHours}">
    <div class="acts">
      <button data-action="exportar">Exportar dados (JSON)</button>
      <label class="sm" style="display:inline-block;margin:0"><span class="sm" style="border:1px solid var(--line);border-radius:12px;padding:8px 14px;cursor:pointer">Importar JSON</span>
        <input id="imp" type="file" accept="application/json" style="display:none"></label>
      <button class="danger" data-action="apagar">Apagar tudo</button>
    </div>
    <label>Lembrete da revisão semanal</label>
    <div class="acts" style="margin-top:0">
      <button data-action="revisao">⏰ ${S.settings.reviewReminder ? esc(fmtRem(S.settings.reviewReminder)) : 'Criar lembrete de revisão'}</button>
      ${isStandalone() ? '' : `<button data-action="instalar">⤓ Instalar o app</button>`}
    </div>
    <div class="summary">Os dados ficam neste aparelho. Para levar a outro, use Exportar e depois Importar.</div>
    <div class="acts"><button class="primary" data-action="salvarcfg">Salvar</button><button data-action="fecharmodal">Fechar</button></div>`);
}

/* ---------- ações do plano semanal ---------- */
function weekAction(gid, sid, fn) {
  const g = goal(gid); const s = g?.steps.find(x => x.id === sid); if (!s) return;
  fn(g, s); commit();
}

/* ---------- eventos (delegação) ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-action],[data-view],[data-goal]');
  if (!t) return;
  const a = t.dataset.action;
  if (t.dataset.view) { UI.view = t.dataset.view; UI.goal = null; render(); return; }
  if (!a) { if (t.matches('.card[data-goal]')) { UI.goal = t.dataset.goal; render(); window.scrollTo(0, 0); } return; }
  const g = goal(t.dataset.goal);
  switch (a) {
    case 'novo': return wizStart();
    case 'config': return openSettings();
    case 'fecharmodal': return closeModal();
    case 'voltar': UI.goal = null; return render();
    case 'wnext': readWiz(); {
      const w = UI.wiz;
      if (w.step === 0 && !w.text) return alert('Escreva o que você quer alcançar.');
      w.step++; return openModal(wizHTML());
    }
    case 'wback': readWiz(); UI.wiz.step--; return openModal(wizHTML());
    case 'wgen': {
      readWiz(); const w = UI.wiz;
      S.settings.weeklyHours = w.hours;
      const steps = buildSteps();
      closeModal();
      createGoal({ text: w.text, cat: w.cat, result: '', deadline: w.deadline, steps });
      return;
    }
    case 'aprovar': g.status = 'ativo'; commit(); return openReminder(g.id); // já sugere o lembrete
    case 'lembrete': return openReminder(g.id);
    case 'revisao': return openReminder(null);
    case 'rday': {
      readRem(); const r = UI.rem, c = t.dataset.day;
      r.days = r.days.includes(c) ? r.days.filter(x => x !== c) : [...r.days, c];
      return openModal(reminderHTML());
    }
    case 'rgoogle': case 'rics': {
      readRem();
      if (!UI.rem.days.length) return alert('Escolha pelo menos um dia.');
      const ev = reminderEvent(UI.rem);
      saveRem();
      if (a === 'rgoogle') window.open(googleURL(ev), '_blank', 'noopener'); else downloadICS(ev);
      closeModal(); return render();
    }
    case 'instalar':
      if (installPrompt) { installPrompt.prompt(); installPrompt.userChoice.finally(() => { installPrompt = null; }); return; }
      return installHelp();
    case 'status': g.status = t.dataset.to; if (g.status === 'concluido') g.doneAt = new Date().toISOString(); return commit();
    case 'excluir': if (confirm('Excluir este objetivo e seu histórico?')) removeGoal(g.id); return;
    case 'done': {
      const s = g.steps.find(x => x.id === t.dataset.step);
      if (!s) return;
      if (!s.done && (s.dependsOn || []).some(d => !g.steps.find(x => x.id === d)?.done)) {
        return alert('Esta etapa depende de outra ainda não feita.');
      }
      return toggleStep(g.id, s.id);
    }
    case 'milestone': { const s = g.steps.find(x => x.id === t.dataset.step); s.milestone = !s.milestone; return commit(); }
    case 'rmstep': {
      if (!confirm('Remover esta etapa?')) return;
      g.steps = g.steps.filter(s => s.id !== t.dataset.step);
      g.steps.forEach(s => s.dependsOn = (s.dependsOn || []).filter(d => d !== t.dataset.step));
      return commit();
    }
    case 'addstep': g.steps.push({ id: uid(), title: 'Nova etapa', hours: 1, done: false, milestone: false, dependsOn: g.steps.length ? [g.steps.at(-1).id] : [] }); return commit();
    case 'reagendar': return weekAction(t.dataset.goal, t.dataset.step, (g, s) => s.lastPlanned = weekStart());
    case 'reduzir': return weekAction(t.dataset.goal, t.dataset.step, (g, s) => { s.hours = Math.max(0.5, s.hours / 2); s.lastPlanned = weekStart(); });
    case 'substituir': {
      const s = g.steps.find(x => x.id === t.dataset.step);
      const n = prompt('Nova descrição da ação:', s.title);
      if (n) { s.title = n.trim(); s.lastPlanned = weekStart(); commit(); }
      return;
    }
    case 'descartar': if (confirm('Descartar esta ação?')) return weekAction(t.dataset.goal, t.dataset.step, (g, s) => g.steps = g.steps.filter(x => x.id !== s.id)); return;
    case 'zin': UI.zoom = clamp(UI.zoom * 1.2, 0.5, 3); return UI.goal ? render() : drawMap();
    case 'zout': UI.zoom = clamp(UI.zoom / 1.2, 0.5, 3); return UI.goal ? render() : drawMap();
    case 'zreset': UI.zoom = 1; UI.px = 0; UI.py = 0; return drawMap();
    case 'exportar': return exportData();
    case 'apagar': if (confirm('Apagar todos os objetivos neste navegador? Exporte antes se quiser guardar.')) { S = { v: 1, settings: { weeklyHours: 5 }, goals: [], log: [], reviews: {} }; UI.goal = null; closeModal(); commit(); } return;
    case 'salvarcfg': S.settings.weeklyHours = Number($('#s-h').value) || 5; closeModal(); return commit();
  }
});

/* Assistente: sugere a área da vida pelo texto, até a pessoa escolher outra manualmente. */
document.addEventListener('input', e => {
  if (e.target.id !== 'w-text' || !UI.wiz || UI.wiz.catTouched) return;
  const sel = $('#w-cat'); if (sel) sel.value = CATS[TPL_CAT[keyOf(e.target.value)]];
});

/* Campos editáveis: salvam ao sair do campo. */
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'w-cat' && UI.wiz) { UI.wiz.catTouched = true; return; }
  if (t.id === 'imp' && t.files[0]) return importFile(t.files[0]);
  if (t.dataset.review) { const k = weekStart(); S.reviews[k] ||= {}; S.reviews[k][t.dataset.review] = t.value; return persist(); }
  const g = goal(t.dataset.goal); if (!g) return;
  if (t.dataset.sfield) {
    const s = g.steps.find(x => x.id === t.dataset.step); if (!s) return;
    const f = t.dataset.sfield;
    if (f === 'hours') s.hours = Math.max(0, Number(t.value) || 0);
    else if (f === 'dependsOn') s.dependsOn = t.value ? [t.value] : [];
    else s.title = t.value.trim() || s.title;
    return commit();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) closeModal();
  if (e.key === 'Escape' && UI.goal) { UI.goal = null; render(); }
});

/* ---------- sincronização com afazeres.json (lista mantida no repositório) ----------
   Ao abrir (com internet), lê afazeres.json e mescla com os dados do aparelho:
   - item novo (id nunca visto) é adicionado; nada do aparelho é apagado ou sobrescrito;
   - item que você excluiu no aparelho não volta (o id fica em S.sync.seen);
   - "feito": true no arquivo marca o item como feito uma única vez; desmarcar no aparelho vale. */
async function syncFromRepo() {
  if (location.protocol === 'file:') return;
  let data;
  try {
    const r = await fetch('afazeres.json', { cache: 'no-store' });
    if (!r.ok) return;
    data = await r.json();
  } catch (e) { return; /* offline ou arquivo ausente: segue com os dados locais */ }
  if (!Array.isArray(data?.objetivos)) return;
  S.sync ||= {};
  const seen = new Set(S.sync.seen || []), doneApplied = new Set(S.sync.done || []);
  let changed = false;
  const now = new Date().toISOString();
  for (const o of data.objetivos) {
    if (!o?.id) continue;
    let g = goal(o.id);
    if (!g) {
      if (seen.has(o.id)) continue; // objetivo excluído no aparelho
      g = { id: o.id, title: String(o.titulo || 'Afazeres').slice(0, 80), description: '',
        category: CATS.includes(o.categoria) ? o.categoria : CATS[4], result: '', deadline: o.prazo || '',
        status: 'ativo', priority: 1, steps: [], createdAt: now, synced: true };
      S.goals.push(g); changed = true;
    }
    seen.add(o.id);
    for (const it of o.itens || []) {
      if (!it?.id) continue;
      let s = g.steps.find(x => x.id === it.id);
      if (!s) {
        if (seen.has(it.id)) continue; // item excluído no aparelho
        s = { id: it.id, title: String(it.titulo || ''), hours: Number(it.horas) || 1, done: false,
          milestone: false, how: [], ok: '', dependsOn: [] };
        g.steps.push(s); changed = true;
        if (g.status === 'concluido') g.status = 'ativo';
      }
      seen.add(it.id);
      if (it.feito && !doneApplied.has(it.id)) {
        doneApplied.add(it.id);
        if (!s.done) {
          s.done = true; s.doneAt = now;
          S.log.push({ goal: g.id, step: s.id, at: now, title: s.title });
          if (g.steps.every(x => x.done)) { g.status = 'concluido'; g.doneAt = now; }
        }
        changed = true;
      }
    }
  }
  const before = JSON.stringify(S.sync);
  S.sync.seen = [...seen]; S.sync.done = [...doneApplied];
  if (changed || before !== JSON.stringify(S.sync)) {
    persist();
    if (!document.querySelector('input:focus, textarea:focus, select:focus')) render();
  }
}

/* ---------- exportar / importar ---------- */
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `espiral-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importFile(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.goals)) throw new Error('formato');
      if (!confirm(`Importar ${d.goals.length} objetivo(s)? Isso substitui os dados atuais deste navegador.`)) return;
      S = d; S.settings ||= { weeklyHours: 5 }; S.log ||= []; S.reviews ||= {};
      closeModal(); commit();
    } catch (err) { alert('Arquivo inválido. Use um JSON exportado pelo Espiral.'); }
  };
  r.readAsText(file);
}

render();
syncFromRepo();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncFromRepo(); });
