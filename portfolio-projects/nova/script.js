/* NOVA — motor agêntico local
   Pipeline: entender → ler contexto → montar plano → pedir permissão → executar (reversível).
   Tudo roda no navegador: sem servidor, sem modelo externo. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORE = 'nova_workspace_v1';
  const CFG = 'nova_config_v1';
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* ================= util ================= */

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  function rotuloData(isoStr) {
    const d = fromIso(isoStr);
    const diff = Math.round((d - hoje()) / 86400000);
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'amanhã';
    if (diff === -1) return 'ontem';
    if (diff < 0) return `atrasada · ${Math.abs(diff)}d`;
    if (diff < 7) return DIAS[d.getDay()];
    return `${d.getDate()} ${MESES[d.getMonth()]}`;
  }

  const money = (v) =>
    (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ================= estado ================= */

  function seed() {
    const h = hoje();
    return {
      tarefas: [
        { id: uid(), titulo: 'Fechar proposta do cliente novo', data: iso(addDias(h, -2)), prioridade: 'alta', feita: false },
        { id: uid(), titulo: 'Revisar o relatório do trimestre', data: iso(addDias(h, -1)), prioridade: 'media', feita: false },
        { id: uid(), titulo: 'Responder e-mails pendentes', data: iso(h), prioridade: 'media', feita: false },
        { id: uid(), titulo: 'Preparar apresentação de sexta', data: iso(addDias(h, 2)), prioridade: 'alta', feita: false },
        { id: uid(), titulo: 'Atualizar currículo', data: iso(addDias(h, 5)), prioridade: 'baixa', feita: false },
        { id: uid(), titulo: 'Pagar a conta de luz', data: iso(addDias(h, -3)), prioridade: 'alta', feita: true },
      ],
      agenda: [
        { id: uid(), titulo: 'Reunião de alinhamento', data: iso(addDias(h, 1)), hora: '10:00', dur: 60, foco: false },
        { id: uid(), titulo: 'Consulta médica', data: iso(addDias(h, 1)), hora: '15:30', dur: 60, foco: false },
        { id: uid(), titulo: 'Call com fornecedor', data: iso(addDias(h, 3)), hora: '14:00', dur: 30, foco: false },
      ],
      metas: [
        { id: uid(), titulo: 'Ler 12 livros no ano', alvo: 12, atual: 7, unidade: 'livros' },
        { id: uid(), titulo: 'Guardar R$ 6.000', alvo: 6000, atual: 2400, unidade: 'R$' },
      ],
      habitos: [
        { id: uid(), titulo: 'Beber 2L de água', dias: [1, 1, 1, 0, 1, 1, 0], hoje: false },
        { id: uid(), titulo: 'Exercício 30 min', dias: [1, 0, 1, 1, 0, 1, 0], hoje: false },
      ],
      financas: [
        { id: uid(), titulo: 'Salário', valor: 4200, tipo: 'entrada', data: iso(addDias(h, -8)) },
        { id: uid(), titulo: 'Mercado', valor: -520, tipo: 'saida', data: iso(addDias(h, -5)) },
        { id: uid(), titulo: 'Aluguel', valor: -1600, tipo: 'saida', data: iso(addDias(h, -4)) },
        { id: uid(), titulo: 'Freela de design', valor: 900, tipo: 'entrada', data: iso(addDias(h, -2)) },
      ],
      log: [],
    };
  }

  /* Conta nova começa do zero: nada de exemplo fictício no workspace de ninguém.
     O seed acima só existe para a demonstração da landing, antes de criar conta. */
  function vazio() {
    return { tarefas: [], agenda: [], metas: [], habitos: [], financas: [], log: [] };
  }

  let state = load();
  let config = loadCfg();
  let undoStack = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage bloqueado: segue com o seed */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }
  function loadCfg() {
    try {
      const raw = localStorage.getItem(CFG);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { nome: 'Luna', dono: '', email: '', modo: 'copiloto', criada: false, logado: false };
  }
  function saveCfg() {
    try { localStorage.setItem(CFG, JSON.stringify(config)); } catch (e) {}
  }

  /* ================= extração de entidades ================= */

  function extrairData(txt) {
    const t = norm(txt);
    const h = hoje();

    if (/\bdepois de amanha\b/.test(t)) return { iso: iso(addDias(h, 2)), achou: 'depois de amanhã' };
    if (/\bamanha\b/.test(t)) return { iso: iso(addDias(h, 1)), achou: 'amanhã' };
    if (/\bhoje\b/.test(t)) return { iso: iso(h), achou: 'hoje' };
    if (/\b(semana que vem|proxima semana|semana seguinte)\b/.test(t)) return { iso: iso(addDias(h, 7)), achou: 'semana que vem' };

    const nomes = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    for (let i = 0; i < nomes.length; i++) {
      if (new RegExp(`\\b${nomes[i]}(\\-feira| feira)?\\b`).test(t)) {
        let delta = (i - h.getDay() + 7) % 7;
        if (delta === 0) delta = 7;
        return { iso: iso(addDias(h, delta)), achou: DIAS[i] };
      }
    }

    let m = t.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
    if (m) {
      const d = new Date(h.getFullYear(), Number(m[2]) - 1, Number(m[1]));
      if (d < h) d.setFullYear(d.getFullYear() + 1);
      return { iso: iso(d), achou: m[0] };
    }
    m = t.match(/\bdia\s+(\d{1,2})\b/);
    if (m) {
      const d = new Date(h.getFullYear(), h.getMonth(), Number(m[1]));
      if (d < h) d.setMonth(d.getMonth() + 1);
      return { iso: iso(d), achou: m[0] };
    }
    if (/\bem (\d+) dias?\b/.test(t)) {
      const n = Number(t.match(/\bem (\d+) dias?\b/)[1]);
      return { iso: iso(addDias(h, n)), achou: `em ${n} dias` };
    }
    return null;
  }

  /* Hora e duração disputam o mesmo texto ("15h" é horário, "de 2h" é duração).
     Resolvo a duração primeiro, removo o trecho dela, e só então procuro o horário. */
  function extrairTempo(txt) {
    let t = norm(txt);
    let dur = null;

    const padroesDur = [
      /\b(?:de|por|durante)\s+(\d{1,2})\s*h\s*(\d{2})\b/,
      /\b(?:de|por|durante)\s+(\d{1,2})\s*(?:h|horas?)\b/,
      /\b(\d{1,3})\s*(?:min|minutos?)\b/,
      /\b(?:de|por|durante)\s+(uma|duas|tres)\s+horas?\b/,
    ];
    for (let i = 0; i < padroesDur.length; i++) {
      const m = t.match(padroesDur[i]);
      if (!m) continue;
      if (i === 0) dur = Number(m[1]) * 60 + Number(m[2]);
      else if (i === 1) dur = Number(m[1]) * 60;
      else if (i === 2) dur = Number(m[1]);
      else dur = { uma: 60, duas: 120, tres: 180 }[m[1]];
      t = t.replace(m[0], ' ');
      break;
    }

    let hora = null;
    let m = t.match(/\b(\d{1,2})\s*[:h]\s*(\d{2})\b/);
    if (m) hora = `${String(m[1]).padStart(2, '0')}:${m[2]}`;
    else if ((m = t.match(/\b(\d{1,2})\s*h\b/))) hora = `${String(m[1]).padStart(2, '0')}:00`;
    else if ((m = t.match(/\bas (\d{1,2})\b/))) hora = `${String(m[1]).padStart(2, '0')}:00`;
    else if (/\bmeio-?dia\b/.test(t)) hora = '12:00';
    else if (/\bde manha\b/.test(t)) hora = '09:00';
    else if (/\ba tarde\b|\bde tarde\b/.test(t)) hora = '14:00';
    else if (/\ba noite\b|\bde noite\b/.test(t)) hora = '19:00';

    return { hora, dur };
  }

  function extrairValor(txt) {
    const t = norm(txt);
    const m = t.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:reais|conto|pila)?/);
    if (!m) return null;
    if (!/r\$|reais|conto|pila|gast|paguei|receb|entrou|comprei|custou|invest/.test(t)) {
      if (!m[0].includes('r$')) return null;
    }
    const inteiro = Number(m[1].replace(/\./g, ''));
    const cents = m[2] ? Number(m[2].padEnd(2, '0')) / 100 : 0;
    return inteiro + cents;
  }

  function extrairPrioridade(txt) {
    const t = norm(txt);
    if (/\burgente\b|\bimportante\b|\bpra ontem\b|\bprioridade alta\b/.test(t)) return 'alta';
    if (/\bsem pressa\b|\bquando der\b|\bprioridade baixa\b/.test(t)) return 'baixa';
    // "muda a prioridade de X pra alta": o nivel vem solto, longe da palavra prioridade
    if (/\bprioridade\b/.test(t)) {
      if (/\b(pra|para|como|em|de)\s+(alta|maxima)\b|\balta\b/.test(t)) return 'alta';
      if (/\b(pra|para|como|em|de)\s+(baixa|minima)\b|\bbaixa\b/.test(t)) return 'baixa';
    }
    return 'media';
  }

  /* limpa o texto para virar título: tira verbo de comando, datas e ruído */
  function tituloDe(txt, extras = []) {
    let s = txt.trim();
    const prefixos = [
      /^(por favor,?\s*)/i,
      /^(um |uma |o |a )/i,
      /^(nov[ao] )?(tarefa|task|lembrete|compromisso|evento|meta|habito|hábito)\b\s*(?::|(?:de|para|pra)\s+)?\s*/i,
      /^(me lembra|me lembre|nao posso esquecer|nao esquece)\b(?:\s+de\b)?\s*/i,
      /^(adiciona|adicionar|adicione|add|cria|criar|crie|coloca|colocar|marca|marcar|agenda|agendar|anota|anotar|lembra|lembrar|preciso|quero|vou|tenho que|tenho de|tenho|bota na lista|bota|botar|poe|por na lista|registra|registrar|gastei|paguei|recebi|entrou|ganhei|comprei|custou|faturei|vendi)\b(?:\s+de\b)?\s*/i,
      /^(na lista|pra mim|para mim)\s*:?\s*/i,
    ];
    // várias passadas: "adiciona tarefa X" precisa perder o verbo E o substantivo
    for (let i = 0; i < 4; i++) {
      const antes = s;
      prefixos.forEach((r) => { s = s.replace(r, '').trim(); });
      if (s === antes) break;
    }
    s = s.replace(/\b(por favor|pfv|pls)\b/gi, '');
    extras.forEach((e) => { if (e) s = s.replace(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ''); });

    // \b não funciona depois de letra acentuada ("amanhã," não casaria com /\bamanhã\b/),
    // então delimito com espaço/pontuação em vez de usar \b.
    const tira = (alternativas) =>
      new RegExp(`(^|[\\s,;])(?:${alternativas})(?=[\\s,;.!?]|$)`, 'gi');

    s = s
      .replace(/(?:r\$\s*)?\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{2}|r\$\s*\d+/gi, ' ')
      .replace(/\b\d+\s*(reais|real|conto|contos|pila|paus)\b/gi, ' ')
      .replace(/\b(reais|real|conto|contos|pila)\b/gi, ' ')
      .replace(tira('hoje|amanh[aã]|depois de amanh[aã]|semana que vem|pr[oó]xima semana'), '$1')
      .replace(tira('(?:segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira| feira)?'), '$1')
      .replace(tira('dia \\d{1,2}'), '$1')
      .replace(tira('\\d{1,2}\\s*\\/\\s*\\d{1,2}'), '$1')
      .replace(tira('\\d{1,2}\\s*[:h]\\s*\\d{2}'), '$1')
      .replace(tira('\\d{1,2}\\s*h'), '$1')
      .replace(tira('(?:as|às)\\s+\\d{1,2}'), '$1')
      .replace(tira('(?:de|à|a)\\s*(?:manh[aã]|tarde|noite)|meio-?\\s?dia'), '$1')
      .replace(tira('urgente|importante|prioridade (?:alta|baixa|m[eé]dia)|sem pressa|quando der'), '$1')
      .replace(tira('a[ií]|pra mim|para mim|pra nois|por favor'), '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
      .trim();

    // segunda passada: o verbo pode ter ficado no meio antes ("amanhã tenho dentista")
    for (let i = 0; i < 3; i++) {
      const antes2 = s;
      prefixos.forEach((r) => { s = s.replace(r, '').trim(); });
      s = s.replace(/^(tem|tenho|vou|quero|preciso|ter)\s+/i, '').trim();
      if (s === antes2) break;
    }

    s = s
      .replace(/^(de|do|da|para|pra|no|na|em|com|que|um|uma|o|a)\s+/i, '')
      .replace(/\s+(de|do|da|para|pra|ate|até|ao|aos|no|na|em|com|e|a|o|que)$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* acha uma tarefa pelo texto (fuzzy por palavras em comum) */
  function acharTarefa(txt) {
    const alvo = textoBusca(txt);
    const palavras = alvo.split(/\s+/).filter((w) => w.length > 3);
    let melhor = null, melhorScore = 0;
    state.tarefas.filter((t) => !t.feita).forEach((t) => {
      const tn = norm(t.titulo);
      let score = 0;
      palavras.forEach((w) => { if (tn.includes(w)) score += w.length; });
      if (tn.includes(alvo) && alvo.length > 4) score += 20;
      if (score > melhorScore) { melhorScore = score; melhor = t; }
    });
    return melhorScore >= 4 ? melhor : null;
  }

  function acharHabito(txt) {
    const alvo = norm(txt);
    let melhor = null, melhorScore = 0;
    state.habitos.forEach((hb) => {
      const palavras = norm(hb.titulo).split(/\s+/).filter((w) => w.length > 2 && !/^\d/.test(w));
      let score = 0;
      palavras.forEach((w) => { if (alvo.includes(w)) score += w.length; });
      if (score > melhorScore) { melhorScore = score; melhor = hb; }
    });
    return melhorScore >= 4 ? melhor : null;
  }

  /* ================= intenções ================= */

  /* verbos e escopos que aparecem em várias intenções */
  const V_REMOVER = /\b(tira|tirar|tire|apaga|apagar|apague|remove|remover|remova|deleta|deletar|delete|limpa|limpar|limpe|exclui|excluir|exclua|zera|zerar|cancela|cancelar|cancele|some com)\b/;
  const V_CONCLUIR = /\b(conclui|concluir|concluido|terminei|terminar|finalizei|finalizar|acabei|acabar|fiz|feito|feita|pronto|prontas|marca como feit|risca|riscar|checa|dar baixa)\b/;
  const V_ADIAR = /\b(adia|adiar|adie|empurra|empurrar|move|mover|mova|remarca|remarcar|passa|passar|joga|jogar|transfere|transferir|reagenda|reagendar)\b/;
  const TUDO = /\b(tudo|todas|todos|geral|inteir[ao]|atrasad[ao]s|pendentes)\b/;

  /* Pergunta nunca pode virar criacao: "quando e minha proxima reuniao?" estava
     criando um compromisso com esse titulo. */
  const CRIADORAS = new Set(['criar_tarefa', 'criar_evento', 'criar_meta', 'criar_habito', 'bloco_foco']);

  function ehPergunta(txt) {
    const n = norm(txt);
    if (/^tenho (que|de)\b|^preciso\b|^vou\b|^quero\b/.test(n)) return false;
    if (/\?\s*$/.test(txt.trim())) return true;
    return /^(o que|oq|que |qual|quais|quando|quant[ao]s?|quanto|onde|como|quem|tem |ha |sera|sobrou|falta|to devendo|estou devendo)/.test(n);
  }

  const INTENTS = [
    // ---- conversa: sem isso ela parece um robo travado ----
    { id: 'saudacao',     req: [/^\s*(oi+|ola|opa|e ai|eai|fala|hey|hi|bom dia|boa tarde|boa noite|tudo bem|tudo bom|como vai|beleza)\b/] },
    { id: 'agradecimento', req: [/^\s*(obrigad\w*|valeu|vlw|brigad\w*|show|perfeito|legal|otimo|massa|top|isso|isso ai|boa)\s*[!.]*\s*$/] },
    { id: 'identidade',   req: [/\b(quem (e|eh) (voce|vc)|qual (e )?(o )?seu nome|(voce|vc) (e|eh) (real|de verdade|uma ia|um rob|humana?)|o que (voce|vc) (e|eh))\b/] },
    { id: 'desabafo',     req: [/\b(perdid[oa]|atarefad[oa]|sobrecarregad[oa]|cansad[oa]|enrolad[oa]|afogad[oa]|estressad[oa]|ansios[oa]|sem tempo|com muita coisa|cheio de coisa|muita coisa pra fazer|nao dou conta|nao to dando conta)\b/] },
    { id: 'sugestao',     req: [/\b(devia|deveria|deveria fazer|fa[cç]o primeiro|fazer primeiro|por onde (eu )?come[cç]|me d[aá] uma ideia|me ajuda a (organizar|priorizar)|prioriza|o que fazer agora|no que (eu )?fo[cç]o)\b/] },

    { id: 'desfazer',      req: [/\b(desfaz|desfazer|desfaça|volta atras|voltar atras|cancela a ultima|reverte|reverter)\b/] },
    { id: 'ajuda',         req: [/\bajuda\b|\bo que (voce|vc) (faz|sabe|consegue|pode)\b|\bcomo funciona\b|\bo que da pra (fazer|pedir)\b|\bcomandos\b|\bo que posso pedir\b/] },

    // ações em lote vêm antes das individuais: "apaga todas as tarefas" não é "apaga a tarefa X"
    { id: 'remover_tudo',  req: [V_REMOVER], tambem: [TUDO] },
    { id: 'concluir_tudo', req: [V_CONCLUIR], tambem: [TUDO] },
    { id: 'adiar_tudo',    req: [V_ADIAR], tambem: [TUDO] },

    { id: 'organizar_semana', req: [/\b(organiz|arrum|planej|ajeit|otimiz)\w*\b[^.]*\bsemana\b|\bsemana\b[^.]*\b(organiz|arrum|planej)\w*/] },
    { id: 'resumo_semana', req: [/\b(como (esta|ta)|resumo d[ao]|visao d[ao]|panorama)\b.*\bsemana\b/] },
    { id: 'contar',        req: [/\bquant[ao]s?\b/], veta: [/\bquanto (eu )?(gast|paguei|custou|sobrou|recebi|guard)/] },
    { id: 'gasto_categoria', req: [/\bquanto (eu )?(gast|paguei)\w*\b[^?]*\b(com|no|na|em|de)\b/] },
    { id: 'resumo_financas', req: [/\b(financ|quanto (eu )?gast|meu saldo|saldo do mes|quanto sobrou|quanto entrou|como (estao|tao) (minhas )?financ|extrato|balanco)/] },
    { id: 'resumo_dia',    req: [/\b(o que|oq|que)\b.*\b(hoje|pra hoje|para hoje)\b|\bmeu dia\b|\bresumo do dia\b|\bagenda de hoje\b|\bcomo (esta|ta) meu dia\b/] },
    { id: 'consultar_dia', req: [/\b(o que|oq|que|tem algo|tenho algo|tem alguma coisa)\b.*\b(amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia \d{1,2}|semana que vem|proxima semana)\b/],
      veta: [/\btenho (que|de)\b|\bpreciso\b|\bvou\b|\bmarca\b|\bagenda\b/] },
    { id: 'proximo_item',  req: [/\b(proxim[ao])\b/] },
    { id: 'dia_cheio',     req: [/\b(dia (ta|esta|vai estar) cheio|muita coisa (hoje|amanha|essa semana)|to (muito )?ocupad|agenda (ta|esta) (cheia|livre))\b/] },
    { id: 'devendo',       req: [/\b(devendo|pendente|pendencias?|atrasad[ao]s?)\b/], tambem: [/\?|^\s*(to|estou|tenho|tem|quais|alguma)/] },
    { id: 'sobrou',        req: [/\b(sobrou|sobra|consigo guardar|da pra guardar|fecho no (azul|vermelho)|to no (azul|vermelho))\b/] },
    { id: 'listar_area',   req: [/\b(nao (consigo|to conseguindo) lembrar|nao lembro|esqueci)\b[^.]*\b(fazer|tarefas?|compromissos?)\b/] },
    { id: 'listar_area',   req: [/\b(lista|listar|mostra|mostrar|ver|quais|me diz)\b.*\b(tarefas?|compromissos?|eventos?|agenda|metas?|objetivos?|habitos?|financas|gastos?|lancamentos?|atrasad)/] },

    { id: 'registrar_gasto', req: [/\b(gastei|paguei|comprei|custou|saiu|torrei)\b/], needValor: true },
    { id: 'registrar_receita', req: [/\b(recebi|entrou|ganhei|caiu|faturei|vendi)\b/], needValor: true },
    { id: 'progresso_meta', req: [/\b(ja (li|guardei|economizei|corri|fiz|juntei)|adiciona|soma|avanca|avancar|progresso)\b[^.]*\b(meta|objetivo|livros?|km|kg|r\$|reais)\b|\b(meta|objetivo)\b[^.]*\b(mais|avanc|progress)/] },

    { id: 'marcar_habito', req: [/\b(fiz|completei|cumpri|bati|marca(r)?)\b.*\b(habito|meta diaria)\b|\bmarca(r)? (o )?habito\b/] },
    { id: 'criar_habito',  req: [/\b(habito|todo dia|todos os dias|diariamente|toda manha|toda noite|toda semana)\b/] },
    { id: 'criar_meta',    req: [/\b(meta|objetivo)\b|\bquero (ler|economizar|guardar|juntar|correr|perder|estudar)\b/] },

    { id: 'mudar_prioridade', req: [/\b(prioridade|urgente|urgencia)\b/], tambem: [/\b(muda|mudar|troca|trocar|marca|marcar|deixa|deixar|poe|por|coloca|passa|vira|virar|tornar?)\b/] },
    { id: 'mudar_horario', req: [/\b(muda|mudar|troca|trocar|remarca|remarcar|passa|adia|antecipa)\b/], tambem: [/\b(horario|hora|\d{1,2}\s*[:h])\b/] },

    { id: 'remover_item',  req: [V_REMOVER] },
    { id: 'limpar_feitas', req: [/\b(limpa|limpar|apaga|apagar|tira|tirar|remove|remover)\b.*\b(feitas|concluidas|prontas|finalizadas)\b/] },
    { id: 'concluir_tarefa', req: [V_CONCLUIR] },
    { id: 'adiar_tarefa',  req: [V_ADIAR] },
    { id: 'bloco_foco',    req: [/\b(bloco de foco|tempo de foco|foco|concentra)\b/] },
    { id: 'criar_evento',  req: [/\b(reuni\w*|consult\w*|call|compromiss\w*|event\w*|encontr\w*|almoc\w*|jant\w*|cafe|entrevist\w*|aul\w*|trein\w*|dentista|medic[oa]|viag\w*|visit\w*|aniversari\w*|festa|show|palestra|apresenta\w*)\b/] },
    { id: 'criar_tarefa',  req: [/\b(tarefa|adiciona|adicionar|add|cria|criar|anota|anotar|lembra|lembrar|preciso|tenho que|tenho de|nao posso esquecer|coloca|bota|poe|nova tarefa|agenda pra mim|na lista)\b/] },
  ];

  function entender(texto) {
    const t = norm(texto);
    const valor = extrairValor(texto);
    const pergunta = ehPergunta(texto);

    // "e amanha?" logo depois de uma consulta: so uma data solta vira consulta de dia
    const resto = t.replace(/[?!.]/g, '').replace(/^(e|entao|ok|beleza)\s+/, '').replace(/^(na|no|em|pra|para|de)\s+/, '').trim();
    if (extrairData(texto) && resto.split(/\s+/).length <= 2 &&
        /^(amanha|hoje|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia \d+|semana que vem|proxima semana)/.test(resto)) {
      return { id: 'consultar_dia', confianca: 0.85 };
    }

    for (const it of INTENTS) {
      if (!it.req.some((r) => r.test(t))) continue;
      if (it.tambem && !it.tambem.every((r) => r.test(t))) continue;
      if (it.veta && it.veta.some((r) => r.test(t))) continue;
      if (it.needValor && valor === null) continue;
      // pergunta jamais cria coisa
      if (pergunta && CRIADORAS.has(it.id)) continue;
      return { id: it.id, confianca: 0.9 };
    }
    if (!pergunta && valor !== null && /\bno |na |com |de /.test(t)) return { id: 'registrar_gasto', confianca: 0.55 };
    if (pergunta) return { id: 'resumo_dia', confianca: 0.4 };
    return { id: null, confianca: 0 };
  }

  /* "adiciona tarefa X e marca reuniao amanha" sao dois pedidos num texto so */
  function dividirPedidos(texto) {
    const bruto = texto.split(/\s*;\s*/).filter(Boolean);
    const saida = [];
    const inicioAcao = /^(marca|marcar|cria|criar|adiciona|adicionar|add|agenda|agendar|anota|anotar|coloca|bota|poe|lembra|outra|outro|tambem|depois|gastei|paguei|recebi|ganhei)\b/;

    bruto.forEach((parte) => {
      const pedacos = parte.split(/\s+e\s+/i);
      if (pedacos.length < 2) { saida.push(parte.trim()); return; }

      let atual = pedacos[0].trim();
      const verboFin = (atual.match(/^(gastei|paguei|recebi|ganhei|comprei)\b/i) || [])[0];
      for (let i = 1; i < pedacos.length; i++) {
        const prox = pedacos[i].trim();
        const comecaAcao = inicioAcao.test(norm(prox));
        // "gastei 50 no mercado e 30 na farmacia": o segundo herda o verbo do primeiro
        const valorSolto = verboFin && /^\d/.test(prox);
        const herda = /^(outra|outro|tambem|tb)\b/.test(norm(prox));
        const verboIni = (pedacos[0].trim().match(/^(cria|criar|adiciona|adicionar|add|marca|marcar|agenda|agendar|anota|anotar)\b/i) || [])[0];
        if (comecaAcao || valorSolto) {
          saida.push(atual);
          if (valorSolto) atual = `${verboFin} ${prox}`;
          else if (herda && verboIni) atual = `${verboIni} ${prox.replace(/^(outra|outro|tambem|tb)\s*(de\s+)?/i, '')}`;
          else atual = prox;
        } else {
          atual += ` e ${prox}`;
        }
      }
      saida.push(atual);
    });
    return saida.filter((x) => x.length > 2);
  }

  /* qual área a pessoa está falando; null = todas */
  function detectarArea(texto) {
    const t = norm(texto);
    if (/\b(tarefas?|afazer|a fazer|pra fazer|para fazer|to-?do|pendencias?)\b/.test(t)) return 'tarefas';
    if (/\b(compromissos?|eventos?|agenda|reunioes|reuniao|calendario)\b/.test(t)) return 'agenda';
    if (/\b(metas?|objetivos?)\b/.test(t)) return 'metas';
    if (/\b(habitos?|rotinas?)\b/.test(t)) return 'habitos';
    if (/\b(financas|gastos?|despesas?|lancamentos?|receitas?|extrato)\b/.test(t)) return 'financas';
    return null;
  }

  const NOME_AREA = {
    tarefas: 'tarefa', agenda: 'compromisso', metas: 'objetivo',
    habitos: 'hábito', financas: 'lançamento',
  };
  const plural = (n, singular) => {
    if (n === 1) return `${n} ${singular}`;
    const p = singular.endsWith('m') ? singular.slice(0, -1) + 'ns' : `${singular}s`;
    return `${n} ${p}`;
  };

  /* recorte de tempo dentro da área: hoje, semana, atrasadas... */
  function filtrarPorTempo(lista, texto, campoData = 'data') {
    const t = norm(texto);
    const h = hoje();
    if (/\batrasad/.test(t)) return lista.filter((i) => fromIso(i[campoData]) < h && !i.feita);
    if (/\bde hoje\b|\bhoje\b/.test(t)) return lista.filter((i) => i[campoData] === iso(h));
    if (/\bde amanha\b|\bamanha\b/.test(t)) return lista.filter((i) => i[campoData] === iso(addDias(h, 1)));
    if (/\b(dessa|desta|da) semana\b/.test(t)) return lista.filter((i) => {
      const d = fromIso(i[campoData]);
      return d >= h && d < addDias(h, 7);
    });
    const dt = extrairData(texto);
    if (dt) return lista.filter((i) => i[campoData] === dt.iso);
    return lista;
  }

  /* Antes de procurar um item pelo nome, tiro palavras de data/hora e de comando:
     sem isso, "remarca a consulta pra sexta" casava com uma tarefa cujo titulo
     continha "sexta". */
  function textoBusca(txt) {
    return norm(txt)
      .replace(/\b(hoje|amanha|depois de amanha|ontem|semana que vem|proxima semana)\b/g, ' ')
      .replace(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)(-feira| feira)?\b/g, ' ')
      .replace(/\bdia \d{1,2}\b|\b\d{1,2}\s*\/\s*\d{1,2}\b/g, ' ')
      .replace(/\b\d{1,2}\s*[:h]\s*\d{2}\b|\b\d{1,2}\s*h\b/g, ' ')
      .replace(/\b(de|da|do|pra|para|no|na|em|as|com|que|meu|minha|meus|minhas)\b/g, ' ')
      .replace(/\b(tarefa|tarefas|compromisso|evento|meta|objetivo|habito|gasto|lancamento|prioridade|horario)\b/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /* acha um item de qualquer area pelo texto */
  function acharItem(txt, area) {
    const alvo = textoBusca(txt);
    const palavras = alvo.split(/\s+/).filter((w) => w.length > 3);
    const pools = area ? [[area, state[area]]] : Object.entries({
      tarefas: state.tarefas, agenda: state.agenda, metas: state.metas,
      habitos: state.habitos, financas: state.financas,
    });
    let melhor = null, melhorScore = 0, melhorArea = null;
    pools.forEach(([nome, lista]) => {
      (lista || []).forEach((item) => {
        const tn = norm(item.titulo || '');
        let score = 0;
        palavras.forEach((w) => { if (tn.includes(w)) score += w.length; });
        if (score > melhorScore) { melhorScore = score; melhor = item; melhorArea = nome; }
      });
    });
    return melhorScore >= 4 ? { item: melhor, area: melhorArea } : null;
  }

  /* ================= planejamento ================= */

  const vazioTotalSeguro = () => !state.tarefas.length && !state.agenda.length &&
    !state.metas.length && !state.habitos.length && !state.financas.length;
  const abertas = () => state.tarefas.filter((t) => !t.feita);
  const atrasadas = () => abertas().filter((t) => fromIso(t.data) < hoje());
  const doDia = (isoStr) => abertas().filter((t) => t.data === isoStr);
  const eventosDe = (isoStr) => state.agenda.filter((e) => e.data === isoStr).sort((a, b) => a.hora.localeCompare(b.hora));

  function planejar(texto, semDividir) {
    if (!semDividir) {
      const partes = dividirPedidos(texto);
      if (partes.length > 1) {
        const planos = partes.map((p) => planejar(p, true)).filter((pl) => pl.ops && pl.ops.length);
        if (planos.length > 1) {
          return {
            contexto: `${planos.length} pedidos no mesmo texto`,
            fala: 'Peguei mais de um pedido aí — juntei tudo num plano só.',
            ops: planos.flatMap((pl) => pl.ops),
          };
        }
      }
    }

    const { id, confianca } = entender(texto);
    const data = extrairData(texto);
    const { hora, dur } = extrairTempo(texto);
    const valor = extrairValor(texto);
    const h = hoje();

    switch (id) {
      case 'ajuda':
        return {
          fala: 'Eu leio o seu workspace e executo mudanças de verdade — criar, alterar, concluir, mover, apagar (inclusive em lote) e responder perguntas sobre o que você tem. Alguns exemplos:',
          dicas: [
            'Organize minha semana', 'Adiciona tarefa revisar contrato pra sexta',
            'Reunião com o time quarta 15h', 'Tira tudo que eu tenho pra fazer',
            'Adia tudo de hoje pra amanhã', 'Quantas tarefas eu tenho?',
            'O que eu tenho na sexta?', 'Gastei 80 no mercado',
            'Quanto gastei com mercado?', 'Deixa revisar contrato urgente',
          ],
        };

      case 'desfazer':
        return { fala: undoStack.length ? 'Desfazendo a última execução.' : 'Não há nada para desfazer ainda.', acao: undoStack.length ? 'undo' : null };

      /* ---------- conversa ---------- */
      case 'saudacao': {
        const hora = new Date().getHours();
        const cumprimento = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
        if (vazioTotalSeguro()) {
          return {
            fala: `${cumprimento}${config.dono ? ', ' + config.dono : ''}! Seu workspace ainda está vazio. Me conta o que você precisa organizar que eu começo a montar.`,
            dicas: ['Adiciona tarefa revisar contrato pra sexta', 'Reunião com o time quarta 15h', 'Meta: guardar 6000'],
          };
        }
        const atr = atrasadas().length;
        const evs = eventosDe(iso(h)).length;
        return {
          fala: `${cumprimento}${config.dono ? ', ' + config.dono : ''}! Hoje você tem ${plural(doDia(iso(h)).length, 'tarefa')} e ${plural(evs, 'compromisso')}${atr ? `, e ${plural(atr, 'tarefa')} em atraso` : ''}. Quer que eu organize alguma coisa?`,
          dicas: atr ? ['Organize minha semana', 'O que eu tenho pra hoje?'] : ['O que eu tenho pra hoje?', 'Organize minha semana'],
        };
      }

      case 'agradecimento':
        return {
          fala: 'De nada! Se precisar de mais alguma coisa é só falar.',
          dicas: ['O que eu tenho pra hoje?', 'Organize minha semana'],
        };

      case 'identidade':
        return {
          fala: `Sou a ${config.nome}, a assistente que você criou aqui na NOVA. Não sou uma pessoa: sou um programa que roda dentro do seu navegador, lê o seu workspace e executa o que você pedir — sempre mostrando o plano antes e deixando você desfazer.`,
          dicas: ['O que você faz?', 'O que eu tenho pra hoje?'],
        };

      case 'desabafo': {
        const atr = atrasadas().length;
        const ab = abertas().length;
        if (!ab) {
          return { fala: 'Entendo. Pelo que vejo aqui, nada está registrado ainda — às vezes tirar tudo da cabeça e colocar numa lista já alivia. Me conta o que está pesando que eu organizo.' };
        }
        return {
          fala: `Entendo — dá para respirar. Você tem ${plural(ab, 'tarefa')} aberta(s)${atr ? `, sendo ${atr} em atraso` : ''}. Se quiser, eu reorganizo a semana, tiro o atraso do caminho e reservo um bloco de foco pra você.`,
          dicas: ['Organize minha semana', 'O que devo fazer primeiro?'],
        };
      }

      case 'sugestao': {
        const ab = abertas();
        if (!ab.length) {
          return { fala: 'Não há nada aberto no momento — você está em dia. Se quiser adiantar algo, me diz o que tem em mente.' };
        }
        const peso = (t) => (fromIso(t.data) < h ? 100 : 0) + ({ alta: 30, media: 15, baixa: 5 }[t.prioridade] || 0) - Math.round((fromIso(t.data) - h) / 86400000);
        const ordenadas = [...ab].sort((a2, b2) => peso(b2) - peso(a2));
        const top = ordenadas[0];
        const motivo = fromIso(top.data) < h
          ? `está atrasada (${rotuloAtraso(top.data)})`
          : `é prioridade ${top.prioridade} e vence ${rotuloData(top.data)}`;
        const seguintes = ordenadas.slice(1, 3).map((t) => `“${t.titulo}”`).join(' e ');
        return {
          contexto: `${plural(ab.length, 'tarefa')} aberta(s)`,
          fala: `Eu começaria por “${top.titulo}” — ${motivo}.${seguintes ? ` Depois dela viriam ${seguintes}.` : ''}`,
          dicas: [`Concluí ${top.titulo.toLowerCase()}`, 'Organize minha semana'],
        };
      }

      /* ---------- consultas novas ---------- */
      case 'proximo_item': {
        const area = detectarArea(texto);
        if (area === 'agenda' || /(reuni|compromiss|call|consult)/.test(norm(texto))) {
          const prox = state.agenda.filter((e) => fromIso(e.data) >= h)
            .sort((a2, b2) => (a2.data + a2.hora).localeCompare(b2.data + b2.hora))[0];
          return { fala: prox ? `Seu próximo compromisso é “${prox.titulo}”, ${rotuloData(prox.data)} às ${prox.hora}.` : 'Você não tem nenhum compromisso marcado daqui pra frente.' };
        }
        const prox = [...abertas()].sort((a2, b2) => a2.data.localeCompare(b2.data))[0];
        return { fala: prox ? `A próxima é “${prox.titulo}” (${rotuloData(prox.data)}, prioridade ${prox.prioridade}).` : 'Não há tarefas abertas.' };
      }

      case 'dia_cheio': {
        const alvo = data ? data.iso : iso(h);
        const tar = abertas().filter((t) => t.data === alvo).length;
        const evs = eventosDe(alvo).length;
        const carga = tar + evs;
        const leitura = carga === 0 ? 'está livre' : carga <= 2 ? 'está tranquilo' : carga <= 5 ? 'tem um volume normal' : 'está bem cheio';
        return { fala: `${rotuloData(alvo).charAt(0).toUpperCase() + rotuloData(alvo).slice(1)} ${leitura}: ${plural(tar, 'tarefa')} e ${plural(evs, 'compromisso')}.` };
      }

      case 'devendo': {
        const atr = atrasadas();
        if (!atr.length) return { fala: 'Nada em atraso — você está em dia.' };
        return {
          contexto: `${plural(atr.length, 'tarefa')} em atraso`,
          fala: `Sim: ${atr.map((t) => `“${t.titulo}” (${rotuloAtraso(t.data)})`).join(', ')}.`,
          dicas: ['Organize minha semana', 'Adia as atrasadas pra amanhã'],
        };
      }

      case 'sobrou': {
        const total = saldo();
        return {
          fala: total > 0
            ? `Sim, sobrou ${money(total)} considerando tudo que está registrado.`
            : total === 0
              ? 'O saldo está zerado: entradas e saídas se anulam.'
              : `Não: você está ${money(total)} no vermelho considerando o que está registrado.`,
        };
      }

      /* ---------- ações em lote ---------- */
      case 'remover_tudo': {
        const area = detectarArea(texto);
        const areas = area ? [area] : ['tarefas', 'agenda', 'metas', 'habitos', 'financas'];
        const ops = [];
        let total = 0;

        areas.forEach((a) => {
          let lista = state[a] || [];
          if (a === 'tarefas' || a === 'agenda') lista = filtrarPorTempo(lista, texto);
          if (a === 'tarefas' && /\bfeitas|concluidas|prontas\b/.test(norm(texto))) lista = lista.filter((x) => x.feita);
          if (!lista.length) return;
          total += lista.length;
          ops.push({
            tipo: 'bulk.remove', area: a, ids: lista.map((x) => x.id), risco: 'alto',
            label: `Remover ${plural(lista.length, NOME_AREA[a])}`,
          });
        });

        if (!total) {
          return { fala: area ? `Não há nada em ${area} para remover.` : 'Seu workspace já está vazio — não há nada para remover.' };
        }
        return {
          contexto: `${plural(total, 'item')} serão apagados`,
          fala: `Isso apaga ${plural(total, 'item')} de uma vez e não dá para recuperar depois que você sair da página. Confirma?`,
          ops,
        };
      }

      case 'concluir_tudo': {
        let lista = filtrarPorTempo(abertas(), texto);
        if (!lista.length) return { fala: 'Não há tarefas abertas nesse recorte para concluir.' };
        return {
          contexto: `${plural(lista.length, 'tarefa')} aberta(s)`,
          fala: `Vou marcar ${plural(lista.length, 'tarefa')} como concluída(s).`,
          ops: [{
            tipo: 'bulk.done', ids: lista.map((t) => t.id), risco: 'medio',
            label: `Concluir ${plural(lista.length, 'tarefa')}: ${lista.slice(0, 3).map((t) => `“${t.titulo}”`).join(', ')}${lista.length > 3 ? '…' : ''}`,
          }],
        };
      }

      case 'adiar_tudo': {
        let lista = filtrarPorTempo(abertas(), texto);
        if (!lista.length) lista = atrasadas();
        if (!lista.length) return { fala: 'Não há tarefas para mover nesse recorte.' };
        const destino = data ? data.iso : iso(addDias(h, 1));
        return {
          contexto: `${plural(lista.length, 'tarefa')} selecionada(s)`,
          fala: `Vou mover ${plural(lista.length, 'tarefa')} para ${rotuloData(destino)}.`,
          ops: [{
            tipo: 'bulk.move', ids: lista.map((t) => t.id), data: destino, risco: 'medio',
            label: `Mover ${plural(lista.length, 'tarefa')} para ${rotuloData(destino)}`,
          }],
        };
      }

      /* ---------- consultas ---------- */
      case 'contar': {
        const area = detectarArea(texto) || 'tarefas';
        const mapa = {
          tarefas: () => filtrarPorTempo(abertas(), texto).length + ' tarefa(s) aberta(s)',
          agenda: () => filtrarPorTempo(state.agenda, texto).length + ' compromisso(s)',
          metas: () => state.metas.length + ' objetivo(s)',
          habitos: () => state.habitos.length + ' hábito(s)',
          financas: () => state.financas.length + ' lançamento(s)',
        };
        return { fala: `Você tem ${mapa[area]()}.` };
      }

      case 'consultar_dia': {
        const alvo = data ? data.iso : iso(addDias(h, 1));
        const tar = abertas().filter((t) => t.data === alvo);
        const evs = eventosDe(alvo);
        if (!tar.length && !evs.length) return { fala: `${rotuloData(alvo).charAt(0).toUpperCase() + rotuloData(alvo).slice(1)} está livre: nada marcado.` };
        const partes = [];
        if (evs.length) partes.push(evs.map((e) => `${e.hora} ${e.titulo}`).join(', '));
        if (tar.length) partes.push(`${plural(tar.length, 'tarefa')}: ${tar.map((t) => t.titulo).join(', ')}`);
        return { fala: `Em ${rotuloData(alvo)}: ${partes.join(' · ')}.` };
      }

      case 'listar_area': {
        const area = detectarArea(texto) || 'tarefas';
        const listas = {
          tarefas: () => filtrarPorTempo(abertas(), texto).map((t) => `${t.titulo} (${rotuloData(t.data)})`),
          agenda: () => filtrarPorTempo(state.agenda, texto).map((e) => `${e.titulo} — ${rotuloData(e.data)} ${e.hora}`),
          metas: () => state.metas.map((m) => `${m.titulo} (${Math.round((m.atual / m.alvo) * 100)}%)`),
          habitos: () => state.habitos.map((hb) => `${hb.titulo} (${hb.dias.filter(Boolean).length}/7)`),
          financas: () => state.financas.map((f) => `${f.titulo}: ${money(f.valor)}`),
        };
        const itens = listas[area]();
        if (!itens.length) return { fala: `Nada em ${area} nesse recorte.` };
        return { fala: `${itens.length === 1 ? 'Item' : 'Itens'} em ${area}: ${itens.slice(0, 8).join(' · ')}${itens.length > 8 ? ` … e mais ${itens.length - 8}` : ''}.` };
      }

      case 'gasto_categoria': {
        const termo = norm(texto).replace(/.*\b(com|no|na|em|de)\b\s*/, '').replace(/[?.!]/g, '').trim();
        if (!termo) return { fala: 'Com o que você quer saber quanto gastou?' };
        const achados = state.financas.filter((f) => f.valor < 0 && norm(f.titulo).includes(termo.split(' ')[0]));
        if (!achados.length) return { fala: `Não encontrei saídas relacionadas a “${termo}”.` };
        const soma = achados.reduce((s, f) => s + Math.abs(f.valor), 0);
        return { fala: `Você gastou ${money(soma)} em ${plural(achados.length, 'lançamento')} com “${termo}”.` };
      }

      /* ---------- edições ---------- */
      case 'progresso_meta': {
        const alvo = acharItem(texto, 'metas') || (state.metas.length === 1 ? { item: state.metas[0] } : null);
        if (!alvo) {
          return {
            fala: 'Em qual objetivo eu lanço esse progresso?',
            dicas: state.metas.slice(0, 3).map((m) => `Adiciona progresso em ${m.titulo.toLowerCase()}`),
          };
        }
        const m = alvo.item;
        const num = texto.match(/\b(\d{1,3}(?:\.\d{3})*|\d+)\b/);
        const delta = valor !== null ? valor : (num ? Number(num[1].replace(/\./g, '')) : 1);
        const fmt = (v) => (m.unidade === 'R$' ? money(v) : `${v}${m.unidade ? ' ' + m.unidade : ''}`);
        return {
          contexto: `${m.titulo}: ${fmt(m.atual)} de ${fmt(m.alvo)}`,
          fala: `Vou somar ${fmt(delta)} nesse objetivo.`,
          ops: [{
            tipo: 'goal.progress', id: m.id, delta, risco: 'baixo',
            label: `Somar ${fmt(delta)} em “${m.titulo}” (fica ${fmt(Math.min(m.alvo, m.atual + delta))})`,
          }],
        };
      }

      case 'mudar_prioridade': {
        const alvo = acharItem(texto, 'tarefas');
        if (!alvo) {
          return {
            fala: 'Qual tarefa muda de prioridade?',
            dicas: abertas().slice(0, 3).map((t) => `Deixa ${t.titulo.toLowerCase()} urgente`),
          };
        }
        const nova = extrairPrioridade(texto);
        const t = alvo.item;
        if (t.prioridade === nova) return { fala: `“${t.titulo}” já está com prioridade ${nova}.` };
        return {
          fala: `Ajustando a prioridade de “${t.titulo}”.`,
          ops: [{
            tipo: 'task.priority', id: t.id, prioridade: nova, risco: 'baixo',
            label: `Mudar “${t.titulo}” de prioridade ${t.prioridade} para ${nova}`,
          }],
        };
      }

      case 'mudar_horario': {
        const alvo = acharItem(texto, 'agenda');
        if (!alvo) {
          return {
            fala: 'Qual compromisso você quer remarcar?',
            dicas: state.agenda.slice(0, 3).map((e) => `Muda ${e.titulo.toLowerCase()} para 16h`),
          };
        }
        const e = alvo.item;
        const novaHora = hora || e.hora;
        const novaData = data ? data.iso : e.data;
        if (novaHora === e.hora && novaData === e.data) {
          return { fala: `Para onde eu movo “${e.titulo}”? Diga o dia ou o horário.` };
        }
        return {
          contexto: `Hoje em ${rotuloData(e.data)} às ${e.hora}`,
          fala: `Vou remarcar “${e.titulo}”.`,
          ops: [{
            tipo: 'event.move', id: e.id, data: novaData, hora: novaHora, risco: 'medio',
            label: `Mover “${e.titulo}” para ${rotuloData(novaData)} às ${novaHora}`,
          }],
        };
      }

      case 'remover_item': {
        const areaDica = detectarArea(texto);
        const alvo = acharItem(texto, areaDica);
        if (!alvo) {
          // pediu para remover, mas não disse o quê: oferece o caminho em lote
          if (areaDica) {
            const lista = state[areaDica] || [];
            if (!lista.length) return { fala: `Não há nada em ${areaDica} para remover.` };
            return {
              fala: `Quer remover algum item específico de ${areaDica} ou tudo?`,
              dicas: [`Apaga todas as ${areaDica}`, ...lista.slice(0, 2).map((i) => `Apaga ${String(i.titulo).toLowerCase()}`)],
            };
          }
          return {
            fala: 'O que você quer remover? Diga o nome do item, ou peça para apagar tudo de uma área.',
            dicas: ['Apaga todas as tarefas', 'Limpa minhas finanças', 'Apaga tudo'],
          };
        }
        return {
          fala: `Encontrei em ${alvo.area}: “${alvo.item.titulo}”.`,
          ops: [{
            tipo: 'item.remove', area: alvo.area, id: alvo.item.id, risco: 'medio',
            label: `Remover ${NOME_AREA[alvo.area]} “${alvo.item.titulo}”`,
          }],
        };
      }

      case 'resumo_dia': {
        const tar = doDia(iso(h));
        const atr = atrasadas();
        const evs = eventosDe(iso(h));
        const linhas = [];
        linhas.push(`${tar.length} tarefa${tar.length === 1 ? '' : 's'} para hoje`);
        if (atr.length) linhas.push(`${atr.length} atrasada${atr.length === 1 ? '' : 's'}`);
        linhas.push(`${evs.length} compromisso${evs.length === 1 ? '' : 's'}`);
        let fala = `Contexto de hoje: ${linhas.join(', ')}.`;
        if (evs.length) fala += ` O primeiro é ${evs[0].titulo} às ${evs[0].hora}.`;
        if (atr.length) fala += ` Quer que eu puxe as atrasadas para hoje?`;
        return { fala, dicas: atr.length ? ['Organize minha semana'] : [] };
      }

      case 'resumo_semana': {
        const fim = addDias(h, 7);
        const tar = abertas().filter((t) => fromIso(t.data) < fim);
        const evs = state.agenda.filter((e) => fromIso(e.data) >= h && fromIso(e.data) < fim);
        return {
          fala: `Nos próximos 7 dias: ${tar.length} tarefas abertas e ${evs.length} compromissos. ${atrasadas().length} tarefa(s) estão atrasadas.`,
          dicas: ['Organize minha semana'],
        };
      }

      case 'organizar_semana': {
        const atr = atrasadas();
        const ops = [];
        atr.slice(0, 4).forEach((t, i) => {
          const nova = iso(addDias(h, t.prioridade === 'alta' ? 0 : Math.min(i + 1, 3)));
          ops.push({
            tipo: 'task.move', id: t.id, data: nova, risco: 'medio',
            label: `Reagendar “${t.titulo}” para ${rotuloData(nova)}`,
          });
        });

        const temFoco = state.agenda.some((e) => e.foco && fromIso(e.data) >= h);
        if (!temFoco) {
          const alvo = iso(addDias(h, 1));
          ops.push({
            tipo: 'event.add', risco: 'baixo',
            payload: { titulo: 'Bloco de foco', data: alvo, hora: '08:30', dur: 90, foco: true },
            label: `Criar bloco de foco de 1h30 ${rotuloData(alvo)} às 08:30`,
          });
        }

        // não mexer de novo em quem o plano já reagendou acima
        const jaNoPlano = new Set(ops.filter((o) => o.id).map((o) => o.id));
        const prioritarias = abertas()
          .filter((t) => !jaNoPlano.has(t.id) && t.prioridade !== 'alta' && fromIso(t.data) <= addDias(h, 1))
          .slice(0, 1);
        prioritarias.forEach((t) => {
          const nova = iso(addDias(h, 4));
          ops.push({
            tipo: 'task.move', id: t.id, data: nova, risco: 'medio',
            label: `Adiar “${t.titulo}” para ${rotuloData(nova)} e abrir espaço`,
          });
        });

        if (!ops.length) return { fala: 'Sua semana já está organizada: nenhuma tarefa atrasada e você tem bloco de foco marcado.' };

        return {
          contexto: `${abertas().length} tarefas abertas · ${atr.length} atrasadas · ${state.agenda.length} eventos`,
          fala: 'Li sua semana e montei um plano para desafogar os atrasos e proteger um espaço de foco.',
          ops,
        };
      }

      case 'criar_tarefa': {
        const titulo = tituloDe(texto);
        if (!titulo) return { fala: 'Entendi que é uma tarefa, mas não peguei o nome dela. Pode repetir? Ex.: “adiciona tarefa revisar contrato pra sexta”.' };
        const quando = data ? data.iso : iso(h);
        const pri = extrairPrioridade(texto);
        return {
          contexto: `${abertas().length} tarefas abertas`,
          fala: `Vou criar essa tarefa para ${rotuloData(quando)}.`,
          ops: [{
            tipo: 'task.add', risco: 'baixo',
            payload: { titulo, data: quando, prioridade: pri, feita: false },
            label: `Criar tarefa “${titulo}” · ${rotuloData(quando)} · prioridade ${pri}`,
          }],
        };
      }

      case 'concluir_tarefa': {
        const alvo = acharTarefa(texto);
        if (!alvo) {
          // "marca beber água como feito" é hábito, não tarefa — tento por lá antes de desistir
          const hb = acharHabito(texto);
          if (hb) {
            if (hb.hoje) return { fala: `“${hb.titulo}” já está marcado como feito hoje.` };
            return {
              fala: `Isso é um hábito seu: “${hb.titulo}”.`,
              ops: [{ tipo: 'habit.check', id: hb.id, risco: 'baixo', label: `Marcar hábito “${hb.titulo}” como feito hoje` }],
            };
          }
          return {
            fala: 'Não achei essa tarefa entre as abertas. Qual delas você concluiu?',
            dicas: abertas().slice(0, 3).map((t) => `Concluí ${t.titulo.toLowerCase()}`),
          };
        }
        return {
          fala: `Encontrei: “${alvo.titulo}”.`,
          ops: [{ tipo: 'task.done', id: alvo.id, risco: 'baixo', label: `Marcar “${alvo.titulo}” como concluída` }],
        };
      }

      case 'adiar_tarefa': {
        const alvo = acharTarefa(texto);
        if (!alvo) {
          // "remarca a consulta pra sexta" e evento, nao tarefa
          const ev = acharItem(texto, 'agenda');
          if (ev) {
            const novaData = data ? data.iso : ev.item.data;
            const novaHora = hora || ev.item.hora;
            if (novaData === ev.item.data && novaHora === ev.item.hora) {
              return { fala: `Para quando eu movo “${ev.item.titulo}”?` };
            }
            return {
              contexto: `Hoje em ${rotuloData(ev.item.data)} às ${ev.item.hora}`,
              fala: `Vou remarcar “${ev.item.titulo}”.`,
              ops: [{
                tipo: 'event.move', id: ev.item.id, data: novaData, hora: novaHora, risco: 'medio',
                label: `Mover “${ev.item.titulo}” para ${rotuloData(novaData)} às ${novaHora}`,
              }],
            };
          }
          return {
            fala: 'Qual item você quer mover? Me diz o nome dele.',
            dicas: abertas().slice(0, 3).map((t) => `Adia ${t.titulo.toLowerCase()} pra sexta`),
          };
        }
        const nova = data ? data.iso : iso(addDias(h, 1));
        return {
          fala: `Vou mover “${alvo.titulo}”.`,
          ops: [{ tipo: 'task.move', id: alvo.id, data: nova, risco: 'medio', label: `Mover “${alvo.titulo}” de ${rotuloData(alvo.data)} para ${rotuloData(nova)}` }],
        };
      }

      case 'criar_evento': {
        const titulo = tituloDe(texto) || 'Compromisso';
        const quando = data ? data.iso : iso(addDias(h, 1));
        const hr = hora || '10:00';
        const conflito = eventosDe(quando).find((e) => e.hora === hr);
        return {
          contexto: conflito ? `Conflito com “${conflito.titulo}” no mesmo horário` : `${eventosDe(quando).length} evento(s) nesse dia`,
          fala: conflito
            ? `Atenção: já existe “${conflito.titulo}” ${rotuloData(quando)} às ${hr}. Posso marcar mesmo assim.`
            : `Vou marcar isso ${rotuloData(quando)} às ${hr}.`,
          ops: [{
            tipo: 'event.add', risco: 'medio',
            payload: { titulo, data: quando, hora: hr, dur: dur || 60, foco: false },
            label: `Criar “${titulo}” · ${rotuloData(quando)} às ${hr} · ${dur || 60} min`,
          }],
        };
      }

      case 'bloco_foco': {
        const quando = data ? data.iso : iso(addDias(h, 1));
        const hr = hora || '08:30';
        const minutos = dur || 90;
        const titulo = tituloDe(texto) || 'Bloco de foco';
        return {
          fala: `Reservando ${minutos} minutos de foco ${rotuloData(quando)}.`,
          ops: [{
            tipo: 'event.add', risco: 'baixo',
            payload: { titulo: titulo.length > 3 ? titulo : 'Bloco de foco', data: quando, hora: hr, dur: minutos, foco: true },
            label: `Criar bloco de foco · ${rotuloData(quando)} às ${hr} · ${minutos} min`,
          }],
        };
      }

      case 'criar_meta': {
        const num = texto.match(/\b(\d{1,3}(?:\.\d{3})*|\d+)\b/);
        const alvo = num ? Number(num[1].replace(/\./g, '')) : 10;
        const titulo = tituloDe(texto.replace(/^meta:?\s*/i, ''), [num ? num[0] : '']) || 'Nova meta';
        const unidade = /r\$|reais|economiz|guard|junt/i.test(texto) ? 'R$' : '';
        return {
          fala: 'Vou criar essa meta e acompanhar o progresso dela.',
          ops: [{
            tipo: 'goal.add', risco: 'baixo',
            payload: { titulo, alvo, atual: 0, unidade },
            label: `Criar meta “${titulo}” · alvo ${unidade ? money(alvo) : alvo}`,
          }],
        };
      }

      case 'criar_habito': {
        const titulo = tituloDe(texto.replace(/\b(todo dia|todos os dias|diariamente|toda manha|toda manhã|toda noite|habito|hábito)\b/gi, '')) || 'Novo hábito';
        return {
          fala: 'Vou acompanhar esse hábito todo dia.',
          ops: [{
            tipo: 'habit.add', risco: 'baixo',
            payload: { titulo, dias: [0, 0, 0, 0, 0, 0, 0], hoje: false },
            label: `Criar hábito “${titulo}” com acompanhamento diário`,
          }],
        };
      }

      case 'marcar_habito': {
        const alvo = acharHabito(texto) || state.habitos.find((hb) => !hb.hoje);
        if (!alvo) return { fala: 'Todos os hábitos de hoje já estão marcados.' };
        if (alvo.hoje) return { fala: `“${alvo.titulo}” já está marcado como feito hoje.` };
        return {
          fala: `Marcando “${alvo.titulo}”.`,
          ops: [{ tipo: 'habit.check', id: alvo.id, risco: 'baixo', label: `Marcar hábito “${alvo.titulo}” como feito hoje` }],
        };
      }

      case 'registrar_gasto': {
        const titulo = tituloDe(texto, [String(valor)]) || 'Gasto';
        return {
          contexto: `Saldo atual ${money(saldo())}`,
          fala: `Registrando uma saída de ${money(valor)}.`,
          ops: [{
            tipo: 'fin.add', risco: 'baixo',
            payload: { titulo, valor: -Math.abs(valor), tipo: 'saida', data: data ? data.iso : iso(h) },
            label: `Registrar saída “${titulo}” · ${money(-Math.abs(valor))}`,
          }],
        };
      }

      case 'registrar_receita': {
        const titulo = tituloDe(texto, [String(valor)]) || 'Entrada';
        return {
          contexto: `Saldo atual ${money(saldo())}`,
          fala: `Registrando uma entrada de ${money(valor)}.`,
          ops: [{
            tipo: 'fin.add', risco: 'baixo',
            payload: { titulo, valor: Math.abs(valor), tipo: 'entrada', data: data ? data.iso : iso(h) },
            label: `Registrar entrada “${titulo}” · ${money(Math.abs(valor))}`,
          }],
        };
      }

      case 'resumo_financas': {
        const ent = state.financas.filter((f) => f.valor > 0).reduce((s, f) => s + f.valor, 0);
        const sai = state.financas.filter((f) => f.valor < 0).reduce((s, f) => s + f.valor, 0);
        const maior = state.financas.filter((f) => f.valor < 0).sort((a, b) => a.valor - b.valor)[0];
        let fala = `Entradas ${money(ent)}, saídas ${money(sai)}. Saldo de ${money(ent + sai)}.`;
        if (maior) fala += ` A maior saída foi “${maior.titulo}” (${money(maior.valor)}).`;
        return { fala };
      }

      case 'limpar_feitas': {
        const feitas = state.tarefas.filter((t) => t.feita);
        if (!feitas.length) return { fala: 'Não há tarefas concluídas para limpar.' };
        return {
          fala: `Encontrei ${feitas.length} tarefa(s) concluída(s).`,
          ops: [{ tipo: 'task.clear', risco: 'medio', label: `Remover ${feitas.length} tarefa(s) concluída(s) da lista` }],
        };
      }

      default:
        return {
          fala: confianca > 0
            ? 'Entendi mais ou menos, mas prefiro confirmar a ter certeza errada. Pode reformular?'
            : 'Não peguei esse pedido. Eu mexo em tarefas, agenda, objetivos, hábitos e finanças — crio, altero, concluo, movo, apago e também respondo perguntas. Alguns exemplos:',
          dicas: ['O que eu tenho pra hoje?', 'Tira tudo que eu tenho pra fazer', 'Adiciona tarefa ligar pro contador amanhã', 'Quanto gastei esse mês?', 'Ajuda'],
        };
    }
  }

  const saldo = () => state.financas.reduce((s, f) => s + f.valor, 0);

  /* ================= execução ================= */

  function executar(ops) {
    undoStack.push(clone(state));
    if (undoStack.length > 20) undoStack.shift();
    const tocados = [];

    ops.forEach((op) => {
      switch (op.tipo) {
        case 'task.add': {
          const t = { id: uid(), ...op.payload };
          state.tarefas.unshift(t); tocados.push(t.id); break;
        }
        case 'task.done': {
          const t = state.tarefas.find((x) => x.id === op.id);
          if (t) { t.feita = true; tocados.push(t.id); } break;
        }
        case 'task.move': {
          const t = state.tarefas.find((x) => x.id === op.id);
          if (t) { t.data = op.data; tocados.push(t.id); } break;
        }
        case 'task.clear':
          state.tarefas = state.tarefas.filter((t) => !t.feita); break;
        case 'event.add': {
          const e = { id: uid(), ...op.payload };
          state.agenda.push(e);
          state.agenda.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
          tocados.push(e.id); break;
        }
        case 'goal.add': {
          const g = { id: uid(), ...op.payload };
          state.metas.push(g); tocados.push(g.id); break;
        }
        case 'habit.add': {
          const hb = { id: uid(), ...op.payload };
          state.habitos.push(hb); tocados.push(hb.id); break;
        }
        case 'habit.check': {
          const hb = state.habitos.find((x) => x.id === op.id);
          if (hb) { hb.hoje = true; hb.dias = hb.dias.slice(1).concat(1); tocados.push(hb.id); } break;
        }
        case 'fin.add': {
          const f = { id: uid(), ...op.payload };
          state.financas.unshift(f); tocados.push(f.id); break;
        }
        case 'bulk.remove': {
          const fora = new Set(op.ids);
          state[op.area] = (state[op.area] || []).filter((x) => !fora.has(x.id));
          break;
        }
        case 'bulk.done': {
          const dentro = new Set(op.ids);
          state.tarefas.forEach((t) => { if (dentro.has(t.id)) { t.feita = true; tocados.push(t.id); } });
          break;
        }
        case 'bulk.move': {
          const dentro = new Set(op.ids);
          state.tarefas.forEach((t) => { if (dentro.has(t.id)) { t.data = op.data; tocados.push(t.id); } });
          break;
        }
        case 'item.remove':
          state[op.area] = (state[op.area] || []).filter((x) => x.id !== op.id);
          break;
        case 'task.priority': {
          const t = state.tarefas.find((x) => x.id === op.id);
          if (t) { t.prioridade = op.prioridade; tocados.push(t.id); } break;
        }
        case 'event.move': {
          const e = state.agenda.find((x) => x.id === op.id);
          if (e) {
            e.data = op.data; e.hora = op.hora;
            state.agenda.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
            tocados.push(e.id);
          }
          break;
        }
        case 'goal.progress': {
          const m = state.metas.find((x) => x.id === op.id);
          if (m) { m.atual = Math.max(0, Math.min(m.alvo, m.atual + op.delta)); tocados.push(m.id); } break;
        }
      }
    });

    state.log.unshift({
      t: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      texto: ops.map((o) => o.label).join(' · '),
      n: ops.length,
    });
    if (state.log.length > 60) state.log.pop();

    save();
    renderTudo(tocados);
    $('#btn-undo').disabled = false;
  }

  function desfazer() {
    if (!undoStack.length) return false;
    state = undoStack.pop();
    save();
    renderTudo();
    $('#btn-undo').disabled = !undoStack.length;
    return true;
  }

  /* ================= chat ================= */

  /* O mesmo motor atende dois chats: o da landing e o de dentro do app.
     Cada um é descrito por um contexto com os seus elementos. */
  const chats = {
    landing: { chat: '#chat', sug: '#suggestions', input: '#input' },
    app: { chat: '#app-chat', sug: '#app-sugestoes', input: '#app-input' },
  };
  const elChat = (ctx) => $(chats[ctx].chat);

  function bolha(tipo, html, ctx = 'landing') {
    const alvo = elChat(ctx);
    if (!alvo) return null;
    const wrap = document.createElement('div');
    wrap.className = `msg msg-${tipo}`;
    wrap.innerHTML = `<div class="msg-text">${html}</div>`;
    alvo.appendChild(wrap);
    alvo.scrollTop = alvo.scrollHeight;
    return wrap;
  }

  function pensando(ctx) {
    const alvo = elChat(ctx);
    const el = document.createElement('div');
    el.className = 'msg msg-ai';
    el.innerHTML = '<div class="msg-text thinking"><span></span><span></span><span></span></div>';
    alvo.appendChild(el);
    alvo.scrollTop = alvo.scrollHeight;
    return el;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function renderPlano(wrap, plano, ms, ctx = 'landing') {
    const alvoChat = elChat(ctx);
    const auto = config.modo === 'autonomo' && plano.ops.every((o) => o.risco === 'baixo');
    const box = document.createElement('div');
    box.className = 'plan';
    box.innerHTML = `
      <div class="plan-head">
        <svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px" aria-hidden="true"><path d="M5 12l5 5L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Plano · ${plano.ops.length} operação${plano.ops.length === 1 ? '' : 'ões'} · ${ms}ms
      </div>
      <ul class="plan-ops">
        ${plano.ops.map((o) => `
          <li class="plan-op">
            <span class="plan-op-dot"></span>
            <span>${esc(o.label)}</span>
            <span class="plan-op-risk risk-${o.risco}">${o.risco}</span>
          </li>`).join('')}
      </ul>
      <div class="plan-actions"></div>`;
    wrap.appendChild(box);

    const acoes = $('.plan-actions', box);

    if (auto) {
      executar(plano.ops);
      box.classList.add('is-done');
      $('.plan-head', box).innerHTML = `✓ Executado automaticamente · risco baixo · ${ms}ms`;
      acoes.innerHTML = '<button class="btn btn-quiet btn-sm" type="button" data-undo>Desfazer</button>';
      $('[data-undo]', acoes).addEventListener('click', () => {
        if (desfazer()) { toast('Desfeito'); box.classList.remove('is-done'); box.classList.add('is-refused'); $('.plan-head', box).textContent = 'Execução desfeita'; acoes.innerHTML = ''; }
      });
      toast('Executado automaticamente');
    } else {
      const aprovar = document.createElement('button');
      aprovar.className = 'btn btn-primary btn-sm';
      aprovar.type = 'button';
      aprovar.textContent = 'Aprovar e executar';
      const recusar = document.createElement('button');
      recusar.className = 'btn btn-quiet btn-sm';
      recusar.type = 'button';
      recusar.textContent = 'Agora não';
      acoes.append(aprovar, recusar);

      aprovar.addEventListener('click', () => {
        executar(plano.ops);
        box.classList.add('is-done');
        $('.plan-head', box).innerHTML = `✓ Executado · ${plano.ops.length} operação${plano.ops.length === 1 ? '' : 'ões'} · reversível`;
        acoes.innerHTML = '<button class="btn btn-quiet btn-sm" type="button" data-undo>Desfazer</button>';
        $('[data-undo]', acoes).addEventListener('click', () => {
          if (desfazer()) { toast('Desfeito'); box.classList.add('is-refused'); box.classList.remove('is-done'); $('.plan-head', box).textContent = 'Execução desfeita'; acoes.innerHTML = ''; }
        });
        toast('Plano executado');
      });

      recusar.addEventListener('click', () => {
        box.classList.add('is-refused');
        $('.plan-head', box).textContent = 'Plano recusado — nada foi alterado';
        acoes.innerHTML = '';
      });
    }
    alvoChat.scrollTop = alvoChat.scrollHeight;
  }

  function responder(texto, ctx = 'landing') {
    const alvoChat = elChat(ctx);
    bolha('user', esc(texto), ctx);
    // mede só o motor: a pausa visual abaixo é enfeite, não pode entrar na conta
    const t0 = performance.now();
    const plano = planejar(texto);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const carregando = pensando(ctx);

    setTimeout(() => {
      carregando.remove();

      const wrap = document.createElement('div');
      wrap.className = 'msg msg-ai';
      const partes = [];
      if (plano.contexto) partes.push(`<div class="msg-text" style="font-family:var(--mono);font-size:.76rem;color:var(--dim)">contexto · ${esc(plano.contexto)}</div>`);
      partes.push(`<div class="msg-text">${esc(plano.fala)}</div>`);
      wrap.innerHTML = partes.join('');
      alvoChat.appendChild(wrap);

      if (plano.acao === 'undo') {
        if (desfazer()) toast('Desfeito');
      }
      if (plano.ops && plano.ops.length) renderPlano(wrap, plano, ms, ctx);
      if (plano.dicas && plano.dicas.length) renderDicas(plano.dicas, ctx);

      const lat = $('#proof-latency');
      if (lat) lat.textContent = ms + 'ms';
      const status = $('#agent-status');
      if (status) status.textContent = `Última resposta em ${ms}ms · ${abertas().length} tarefas abertas`;
      alvoChat.scrollTop = alvoChat.scrollHeight;
    }, reduceMotion ? 0 : 110);
  }

  function renderDicas(lista, ctx = 'landing') {
    const box = $(chats[ctx].sug);
    if (!box) return;
    box.innerHTML = '';
    lista.forEach((d) => {
      const b = document.createElement('button');
      b.className = 'chip-btn';
      b.type = 'button';
      b.textContent = d;
      b.addEventListener('click', () => { $(chats[ctx].input).value = d; responder(d, ctx); $(chats[ctx].input).value = ''; box.innerHTML = ''; });
      box.appendChild(b);
    });
  }

  /* ================= render do estado ================= */

  function icone() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function renderTarefas(tocados = []) {
    const ul = $('#list-tarefas');
    const ordem = [...state.tarefas].sort((a, b) => (a.feita - b.feita) || a.data.localeCompare(b.data));
    if (!ordem.length) { ul.innerHTML = '<li class="empty">Nenhuma tarefa. Peça para a sua IA criar uma.</li>'; return; }
    ul.innerHTML = ordem.map((t) => `
      <li class="item ${t.feita ? 'is-done' : ''} ${tocados.includes(t.id) ? 'just-changed' : ''}" data-id="${t.id}">
        <button class="item-check" type="button" data-toggle="${t.id}" aria-label="${t.feita ? 'Reabrir' : 'Concluir'} tarefa">${icone()}</button>
        <div class="item-main">
          <span class="item-title">${esc(t.titulo)}</span>
          <span class="item-meta">
            <span>${rotuloData(t.data)}</span>
            <span class="tag tag-${t.prioridade}">${t.prioridade}</span>
          </span>
        </div>
        <button class="item-x" type="button" data-del-tarefa="${t.id}" aria-label="Remover tarefa">×</button>
      </li>`).join('');
  }

  function renderAgenda(tocados = []) {
    const ul = $('#list-agenda');
    const futuros = [...state.agenda].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    if (!futuros.length) { ul.innerHTML = '<li class="empty">Agenda vazia.</li>'; return; }
    ul.innerHTML = futuros.map((e) => `
      <li class="item ${tocados.includes(e.id) ? 'just-changed' : ''}">
        <div class="item-main">
          <span class="item-title">${esc(e.titulo)}</span>
          <span class="item-meta">
            <span>${rotuloData(e.data)} · ${e.hora}</span>
            <span>${e.dur} min</span>
            ${e.foco ? '<span class="tag tag-foco">foco</span>' : ''}
          </span>
        </div>
        <button class="item-x" type="button" data-del-evento="${e.id}" aria-label="Remover evento">×</button>
      </li>`).join('');
  }

  function renderMetas(tocados = []) {
    const ul = $('#list-metas');
    if (!state.metas.length) { ul.innerHTML = '<li class="empty">Nenhuma meta ativa.</li>'; return; }
    ul.innerHTML = state.metas.map((m) => {
      const pct = Math.min(100, Math.round((m.atual / m.alvo) * 100));
      const fmt = (v) => (m.unidade === 'R$' ? money(v) : `${v}${m.unidade ? ' ' + m.unidade : ''}`);
      return `
      <li class="item ${tocados.includes(m.id) ? 'just-changed' : ''}" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;gap:10px;align-items:baseline">
          <span class="item-title" style="flex:1">${esc(m.titulo)}</span>
          <span class="item-meta">${pct}%</span>
          <button class="item-x" type="button" data-del-meta="${m.id}" aria-label="Remover meta">×</button>
        </div>
        <span class="item-meta">${fmt(m.atual)} de ${fmt(m.alvo)}</span>
        <div class="bar"><span class="bar-fill" style="width:${pct}%"></span></div>
      </li>`;
    }).join('');
  }

  function renderHabitos(tocados = []) {
    const ul = $('#list-habitos');
    if (!state.habitos.length) { ul.innerHTML = '<li class="empty">Nenhum hábito em acompanhamento.</li>'; return; }
    ul.innerHTML = state.habitos.map((hb) => `
      <li class="item ${tocados.includes(hb.id) ? 'just-changed' : ''}">
        <button class="item-check ${hb.hoje ? '' : ''}" type="button" data-habito="${hb.id}" aria-label="Marcar hábito"
          style="${hb.hoje ? 'background:var(--mint);border-color:var(--mint);color:#06281c' : ''}">${icone()}</button>
        <div class="item-main">
          <span class="item-title">${esc(hb.titulo)}</span>
          <span class="item-meta">
            <span class="streak">${hb.dias.map((d) => `<i class="${d ? 'on' : ''}"></i>`).join('')}</span>
            <span>${hb.dias.filter(Boolean).length}/7 dias</span>
          </span>
        </div>
        <button class="item-x" type="button" data-del-habito="${hb.id}" aria-label="Remover hábito">×</button>
      </li>`).join('');
  }

  function renderFinancas(tocados = []) {
    const ent = state.financas.filter((f) => f.valor > 0).reduce((s, f) => s + f.valor, 0);
    const sai = state.financas.filter((f) => f.valor < 0).reduce((s, f) => s + f.valor, 0);
    $('#fin-summary').innerHTML = `
      <div class="fin-box fin-in"><span>Entradas</span><strong>${money(ent)}</strong></div>
      <div class="fin-box fin-out"><span>Saídas</span><strong>${money(sai)}</strong></div>
      <div class="fin-box"><span>Saldo</span><strong>${money(ent + sai)}</strong></div>`;

    const ul = $('#list-financas');
    if (!state.financas.length) { ul.innerHTML = '<li class="empty">Nenhum lançamento.</li>'; return; }
    ul.innerHTML = state.financas.map((f) => `
      <li class="item ${tocados.includes(f.id) ? 'just-changed' : ''}">
        <div class="item-main">
          <span class="item-title">${esc(f.titulo)}</span>
          <span class="item-meta">${rotuloData(f.data)}</span>
        </div>
        <strong style="font-size:.86rem;font-variant-numeric:tabular-nums;color:${f.valor > 0 ? 'var(--mint)' : 'var(--rose)'}">${money(f.valor)}</strong>
        <button class="item-x" type="button" data-del-fin="${f.id}" aria-label="Remover lançamento">×</button>
      </li>`).join('');
  }

  function renderContadores() {
    const set = (k, v) => { const el = $(`[data-count="${k}"]`); if (el) el.textContent = v; };
    set('tarefas', abertas().length);
    set('agenda', state.agenda.length);
    set('metas', state.metas.length);
    set('habitos', state.habitos.length);
    set('financas', money(saldo()));
  }

  function renderLog() {
    const html = state.log.length
      ? state.log.map((l) => `<li class="audit-item"><span class="audit-time">${l.t}</span><span class="audit-text">${esc(l.texto)}</span></li>`).join('')
      : '<li class="audit-item"><span class="audit-text" style="color:var(--dim)">Nenhuma ação ainda. Dê um comando para a sua IA.</span></li>';
    $('#audit-list').innerHTML = html;
    $('#log-list').innerHTML = html;
  }

  function renderTudo(tocados = []) {
    renderTarefas(tocados);
    renderAgenda(tocados);
    renderMetas(tocados);
    renderHabitos(tocados);
    renderFinancas(tocados);
    renderContadores();
    renderLog();
    renderApp();
  }

  /* ================= toast ================= */

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-on');
      setTimeout(() => { el.hidden = true; }, 300);
    }, 2200);
  }

  /* ================= identidade ================= */

  function aplicarConfig() {
    const papel = config.dono ? `Assistente de ${config.dono}` : 'Sua assistente';
    const modoLabel = config.modo === 'autonomo' ? 'autônomo' : 'copiloto';
    $('#agent-name').textContent = config.nome;
    $('#demo-name').textContent = config.nome;
    $('#demo-role').textContent = `${papel} · modo ${modoLabel}`;
    $$('.mode-opt').forEach((b) => {
      const on = b.dataset.mode === config.modo;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    $('#mode-hint').textContent = config.modo === 'copiloto'
      ? 'Pede permissão para tudo'
      : 'Age sozinha no que é de risco baixo';

    // identidade dentro do app
    $$('.ia-nome, #nav-ia-nome').forEach((el) => { el.textContent = config.nome; });
    const un = $('#app-user-nome');
    if (un) {
      un.textContent = config.dono || 'Você';
      $('#app-user-email').textContent = config.email || 'conta local';
      $('#app-user-avatar').textContent = (config.dono || 'V').trim().charAt(0).toUpperCase();
    }
    if (appAberto && appAberto() && $('#app-title')) {
      const view = $('.app-nav-item.is-on')?.dataset.view;
      if (view === 'chat') $('#app-title').textContent = `Chat com a ${config.nome}`;
    }
  }

  /* ================= demo do hero ================= */

  const DEMOS = {
    'Organize minha semana': [
      { t: 'Contexto identificado', s: () => `${abertas().length} tarefas abertas · ${atrasadas().length} atrasadas`, ok: true },
      { t: 'Plano criado', s: () => 'Reagendar tarefas atrasadas, criar 1 bloco de foco', ok: true },
      { t: 'Aguardando permissão', s: () => 'Alterar 3 itens da sua semana', ok: false },
      { t: 'Executado', s: () => 'Alterações aplicadas · reversível', ok: true, muted: true },
    ],
    'Como estão minhas finanças?': [
      { t: 'Contexto identificado', s: () => `${state.financas.length} lançamentos no período`, ok: true },
      { t: 'Cálculo pronto', s: () => `Saldo de ${money(saldo())}`, ok: true },
      { t: 'Somente leitura', s: () => 'Nenhuma alteração necessária', ok: true, muted: true },
    ],
    'O que eu tenho pra hoje?': [
      { t: 'Contexto identificado', s: () => `${doDia(iso(hoje())).length} tarefas · ${eventosDe(iso(hoje())).length} compromissos`, ok: true },
      { t: 'Prioridade definida', s: () => 'Tarefas de alta prioridade primeiro', ok: true },
      { t: 'Somente leitura', s: () => 'Nenhuma alteração necessária', ok: true, muted: true },
    ],
  };

  let demoTimers = [];
  function rodarDemo(chave) {
    demoTimers.forEach(clearTimeout);
    demoTimers = [];
    $('#demo-request').textContent = chave;
    const trace = $('#demo-trace');
    trace.innerHTML = '';
    const passos = DEMOS[chave] || DEMOS['Organize minha semana'];
    passos.forEach((p, i) => {
      demoTimers.push(setTimeout(() => {
        const el = document.createElement('div');
        el.className = `trace-step ${p.ok ? '' : 'is-pending'} ${p.muted ? 'is-muted' : ''}`;
        el.innerHTML = `
          <span class="trace-icon">${p.ok ? '✓' : '–'}</span>
          <span class="trace-text"><strong>${p.t}</strong><span>${p.s()}</span></span>`;
        trace.appendChild(el);
      }, reduceMotion ? 0 : i * 420));
    });
  }

  /* ================= wiring ================= */


  /* ===================== APP (pós-cadastro/login) ===================== */

  const filtros = { area: 'tudo', periodo: 7, tarefa: 'abertas', fin: 'tudo' };
  const TITULOS = {
    visao: ['Visão geral', 'Seu contexto de hoje'],
    agenda: ['Agenda', 'Tudo o que está marcado, por área'],
    tarefas: ['Tarefas', 'O que precisa sair do papel'],
    metas: ['Objetivos', 'Progresso do que você quer alcançar'],
    habitos: ['Hábitos', 'O que sustenta os objetivos'],
    financas: ['Finanças', 'Entradas, saídas e saldo'],
    chat: ['Chat', 'Peça e ela executa'],
    historico: ['Histórico', 'Auditoria das ações da IA'],
  };

  const appAberto = () => !$('#app').hidden;
  const vazioTotal = () => !state.tarefas.length && !state.agenda.length &&
    !state.metas.length && !state.habitos.length && !state.financas.length;

  function entrarApp(viewInicial = 'visao') {
    config.logado = true;
    saveCfg();
    $('#app').hidden = false;
    document.body.style.overflow = 'hidden';
    aplicarConfig();
    rotularCTAs();
    irPara(viewInicial);
    renderApp();
    if (!elChat('app').children.length) {
      if (vazioTotal()) {
        bolha('ai', `Oi${config.dono ? ', ' + esc(config.dono) : ''}! Sou a <strong>${esc(config.nome)}</strong>. Seu workspace está limpo — nada aqui além do que você criar. Me diz o que você precisa organizar e eu começo a montar.`, 'app');
        renderDicas(['Adiciona tarefa revisar contrato pra sexta', 'Reunião com o time quarta 15h', 'Meta: guardar 6000', 'Todo dia beber 2L de água'], 'app');
      } else {
        bolha('ai', `Oi${config.dono ? ', ' + esc(config.dono) : ''}! Sou a <strong>${esc(config.nome)}</strong>. Já li o seu workspace: <strong>${abertas().length} tarefas abertas</strong>, ${atrasadas().length} atrasada(s) e ${state.agenda.length} compromissos.`, 'app');
        renderDicas(['Organize minha semana', 'O que eu tenho pra hoje?', 'Gastei 80 no mercado'], 'app');
      }
    }
  }

  function sairApp() {
    $('#app').hidden = true;
    $('#app').classList.remove('side-open');
    document.body.style.overflow = '';
    rotularCTAs();
  }

  function irPara(view) {
    $$('.app-nav-item').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
    $$('.app-view').forEach((s) => s.classList.toggle('is-on', s.dataset.view === view));
    const [t, sub] = TITULOS[view] || ['', ''];
    $('#app-title').textContent = view === 'chat' ? `Chat com a ${config.nome}` : t;
    $('#app-subtitle').textContent = sub;
    $('#app').classList.remove('side-open');
    $('.app-body').scrollTop = 0;
    if (view === 'chat') setTimeout(() => $('#app-input').focus(), 80);
  }

  /* ---------- agenda unificada: junta as áreas num só fluxo ---------- */
  function itensAgenda() {
    const itens = [];
    state.agenda.forEach((e) => {
      itens.push({
        area: e.foco ? 'foco' : 'evento',
        rotuloArea: e.foco ? 'foco' : 'compromisso',
        data: e.data, hora: e.hora, titulo: e.titulo,
        meta: `${e.dur} min`, id: e.id, feito: false,
      });
    });
    const rotuloPri = { alta: 'alta', media: 'média', baixa: 'baixa' };
    state.tarefas.forEach((t) => {
      itens.push({
        area: 'tarefa', rotuloArea: 'tarefa',
        data: t.data, hora: '', titulo: t.titulo,
        meta: `prioridade ${rotuloPri[t.prioridade] || t.prioridade}`, id: t.id, feito: t.feita,
      });
    });
    state.habitos.forEach((hb) => {
      itens.push({
        area: 'habito', rotuloArea: 'hábito',
        data: iso(hoje()), hora: '', titulo: hb.titulo,
        meta: hb.hoje ? 'feito hoje' : 'pendente hoje', id: hb.id, feito: hb.hoje,
      });
    });
    return itens;
  }

  function rotuloAtraso(isoStr) {
    const dias = Math.round((hoje() - fromIso(isoStr)) / 86400000);
    if (dias === 1) return 'venceu ontem';
    return `venceu há ${dias} dias`;
  }

  /* estado vazio que ensina o próximo passo em vez de só avisar que não tem nada */
  function nadaAqui(texto, exemplo) {
    return `<div class="nada">
      <p>${esc(texto)}</p>
      ${exemplo ? `<button class="chip-btn" type="button" data-exemplo="${esc(exemplo)}">${esc(exemplo)}</button>` : ''}
    </div>`;
  }

  function linhaHtml(i, h) {
    return `
      <div class="linha linha-${i.area} ${i.feito ? 'is-done' : ''}">
        <span class="linha-hora">${i.hora || '—'}</span>
        <div class="linha-main">
          <span class="linha-titulo">${esc(i.titulo)}</span>
          <span class="linha-meta">
            <span class="linha-area">${i.rotuloArea}</span>
            <span>${esc(i.meta)}</span>
            ${fromIso(i.data) < h && !i.feito && i.area === 'tarefa' ? `<span class="tag tag-alta">${rotuloAtraso(i.data)}</span>` : ''}
          </span>
        </div>
        ${btnEditar(i.area === 'tarefa' ? 'tarefas' : i.area === 'habito' ? 'habitos' : 'agenda', i.id)}
      </div>`;
  }

  function renderAgendaApp() {
    const h = hoje();
    const naArea = itensAgenda().filter((i) => filtros.area === 'tudo' || i.area === filtros.area);

    // atrasado não pertence a nenhum período: vai para um bloco próprio no topo
    const atrasado = naArea.filter((i) => i.area === 'tarefa' && !i.feito && fromIso(i.data) < h);
    const limite = filtros.periodo ? addDias(h, filtros.periodo) : null;
    const futuros = naArea.filter((i) => {
      const d = fromIso(i.data);
      if (d < h) return false;
      return limite ? d < limite : true;
    });

    const total = atrasado.length + futuros.length;
    $('#agenda-contagem').textContent = `${total} ${total === 1 ? 'item' : 'itens'}` +
      (atrasado.length ? ` · ${atrasado.length} atrasado${atrasado.length === 1 ? '' : 's'}` : '');

    const porDia = {};
    futuros.forEach((i) => { (porDia[i.data] = porDia[i.data] || []).push(i); });
    const dias = Object.keys(porDia).sort();

    const box = $('#agenda-lista');
    if (!total) {
      box.innerHTML = vazioTotal()
        ? nadaAqui('Sua agenda está vazia. Peça algo para a sua IA e ela marca aqui.', 'Reunião com o time quarta 15h')
        : nadaAqui('Nada nesse filtro. Experimente outro período ou outra área.');
      return;
    }

    const blocoAtrasado = atrasado.length ? `
      <div class="dia-bloco">
        <div class="dia-head">
          <strong>Atrasado</strong>
          <span class="hoje-tag" style="background:rgba(248,113,113,.18);color:var(--rose)">precisa de decisão</span>
          <span>${atrasado.length} ${atrasado.length === 1 ? 'item' : 'itens'}</span>
        </div>
        ${atrasado.sort((a, b) => a.data.localeCompare(b.data)).map((i) => linhaHtml(i, h)).join('')}
      </div>` : '';

    box.innerHTML = blocoAtrasado + dias.map((d) => {
      const data = fromIso(d);
      const ehHoje = d === iso(h);
      const lista = porDia[d].sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
      return `
        <div class="dia-bloco">
          <div class="dia-head">
            <strong>${DIAS[data.getDay()].charAt(0).toUpperCase() + DIAS[data.getDay()].slice(1)}, ${data.getDate()} ${MESES[data.getMonth()]}</strong>
            ${ehHoje ? '<span class="hoje-tag">hoje</span>' : ''}
            <span>${lista.length} ${lista.length === 1 ? 'item' : 'itens'}</span>
          </div>
          ${lista.map((i) => linhaHtml(i, h)).join('')}
        </div>`;
    }).join('');
  }

  /* ---------- tarefas com filtro ---------- */
  function renderTarefasApp() {
    const h = hoje();
    let lista = [...state.tarefas];
    switch (filtros.tarefa) {
      case 'abertas': lista = lista.filter((t) => !t.feita); break;
      case 'hoje': lista = lista.filter((t) => !t.feita && t.data === iso(h)); break;
      case 'atrasadas': lista = lista.filter((t) => !t.feita && fromIso(t.data) < h); break;
      case 'alta': lista = lista.filter((t) => !t.feita && t.prioridade === 'alta'); break;
      case 'feitas': lista = lista.filter((t) => t.feita); break;
    }
    lista.sort((a, b) => (a.feita - b.feita) || a.data.localeCompare(b.data));

    $('#tarefas-contagem').textContent = `${lista.length} ${lista.length === 1 ? 'tarefa' : 'tarefas'}`;
    $('#app-tarefas').innerHTML = lista.length ? lista.map((t) => `
      <li class="item ${t.feita ? 'is-done' : ''}">
        <button class="item-check" type="button" data-toggle="${t.id}" aria-label="${t.feita ? 'Reabrir' : 'Concluir'}">${icone()}</button>
        <div class="item-main">
          <span class="item-title">${esc(t.titulo)}</span>
          <span class="item-meta">
            <span>${rotuloData(t.data)}</span>
            <span class="tag tag-${t.prioridade}">${t.prioridade}</span>
          </span>
        </div>
        ${btnEditar('tarefas', t.id)}
        <button class="item-x" type="button" data-del-tarefa="${t.id}" aria-label="Remover">×</button>
      </li>`).join('') : `<li>${vazioTotal()
        ? nadaAqui('Nenhuma tarefa ainda. Diga o que precisa fazer e ela cria.', 'Adiciona tarefa revisar contrato pra sexta')
        : nadaAqui('Nenhuma tarefa nesse filtro.')}</li>`;
  }

  /* ---------- objetivos ---------- */
  function renderMetasApp() {
    const box = $('#app-metas');
    if (!state.metas.length) {
      box.innerHTML = nadaAqui('Nenhum objetivo ainda. Diga o que você quer alcançar.', 'Meta: guardar 6000');
      return;
    }
    box.innerHTML = state.metas.map((m) => {
      const pct = Math.min(100, Math.round((m.atual / m.alvo) * 100));
      const fmt = (v) => (m.unidade === 'R$' ? money(v) : `${v}${m.unidade ? ' ' + m.unidade : ''}`);
      const passo = m.unidade === 'R$' ? 100 : 1;
      return `
        <article class="meta-card">
          <div class="meta-topo">
            <h4>${esc(m.titulo)}</h4>
            <span class="meta-pct">${pct}%</span>
          </div>
          <span class="meta-valores">${fmt(m.atual)} de ${fmt(m.alvo)}</span>
          <div class="bar"><span class="bar-fill" style="width:${pct}%"></span></div>
          <div class="meta-acoes">
            <button class="btn btn-quiet btn-sm" type="button" data-meta-mais="${m.id}" data-passo="${passo}">+ ${m.unidade === 'R$' ? money(passo) : passo}</button>
            <button class="btn btn-quiet btn-sm" type="button" data-meta-menos="${m.id}" data-passo="${passo}">−</button>
            <button class="btn btn-quiet btn-sm" type="button" data-editar="metas:${m.id}">Editar</button>
            <button class="btn btn-quiet btn-sm" type="button" data-del-meta="${m.id}">Remover</button>
          </div>
        </article>`;
    }).join('');
  }

  /* ---------- hábitos ---------- */
  function renderHabitosApp() {
    const box = $('#app-habitos');
    if (!state.habitos.length) {
      box.innerHTML = nadaAqui('Nenhum hábito em acompanhamento.', 'Todo dia beber 2L de água');
      return;
    }
    box.innerHTML = state.habitos.map((hb) => `
      <article class="habito-card">
        <h4>${esc(hb.titulo)}</h4>
        <div class="habito-streak">
          <span class="streak">${hb.dias.map((d) => `<i class="${d ? 'on' : ''}"></i>`).join('')}</span>
          <span class="habito-dias">${hb.dias.filter(Boolean).length} de 7 dias</span>
        </div>
        <div class="habito-acoes">
          <button class="btn ${hb.hoje ? 'btn-quiet' : 'btn-primary'} btn-sm" type="button" data-habito="${hb.id}" ${hb.hoje ? 'disabled' : ''}>
            ${hb.hoje ? 'Feito hoje' : 'Marcar hoje'}
          </button>
          <button class="btn btn-quiet btn-sm" type="button" data-editar="habitos:${hb.id}">Editar</button>
          <button class="btn btn-quiet btn-sm" type="button" data-del-habito="${hb.id}">Remover</button>
        </div>
      </article>`).join('');
  }

  /* ---------- finanças ---------- */
  function renderFinancasApp() {
    const ent = state.financas.filter((f) => f.valor > 0).reduce((s, f) => s + f.valor, 0);
    const sai = state.financas.filter((f) => f.valor < 0).reduce((s, f) => s + f.valor, 0);
    $('#app-fin-resumo').innerHTML = `
      <div class="fin-box fin-in"><span>Entradas</span><strong>${money(ent)}</strong></div>
      <div class="fin-box fin-out"><span>Saídas</span><strong>${money(sai)}</strong></div>
      <div class="fin-box"><span>Saldo</span><strong>${money(ent + sai)}</strong></div>`;

    let lista = [...state.financas];
    if (filtros.fin === 'entrada') lista = lista.filter((f) => f.valor > 0);
    if (filtros.fin === 'saida') lista = lista.filter((f) => f.valor < 0);

    $('#fin-contagem').textContent = `${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}`;
    $('#app-financas').innerHTML = lista.length ? lista.map((f) => `
      <li class="item">
        <div class="item-main">
          <span class="item-title">${esc(f.titulo)}</span>
          <span class="item-meta">${rotuloData(f.data)}</span>
        </div>
        <strong style="font-size:.88rem;font-variant-numeric:tabular-nums;color:${f.valor > 0 ? 'var(--mint)' : 'var(--rose)'}">${money(f.valor)}</strong>
        ${btnEditar('financas', f.id)}
        <button class="item-x" type="button" data-del-fin="${f.id}" aria-label="Remover">×</button>
      </li>`).join('') : `<li>${vazioTotal()
        ? nadaAqui('Nenhum lançamento ainda. Conte um gasto ou uma entrada.', 'Gastei 80 no mercado')
        : nadaAqui('Nenhum lançamento nesse filtro.')}</li>`;
  }

  /* ---------- visão geral ---------- */
  function renderVisao() {
    const h = hoje();
    const atr = atrasadas();
    const evsHoje = eventosDe(iso(h));
    const seq = state.habitos.length
      ? Math.max(...state.habitos.map((hb) => hb.dias.filter(Boolean).length))
      : 0;

    $('#kpi-row').innerHTML = `
      <div class="kpi"><span>Tarefas abertas</span><strong>${abertas().length}</strong><em>${doDia(iso(h)).length} para hoje</em></div>
      <div class="kpi ${atr.length ? 'kpi-alerta' : 'kpi-bom'}"><span>Atrasadas</span><strong>${atr.length}</strong><em>${atr.length ? 'peça para reorganizar' : 'nada atrasado'}</em></div>
      <div class="kpi"><span>Compromissos hoje</span><strong>${evsHoje.length}</strong><em>${evsHoje.length ? 'primeiro às ' + evsHoje[0].hora : 'agenda livre'}</em></div>
      <div class="kpi ${saldo() >= 0 ? 'kpi-bom' : 'kpi-alerta'}"><span>Saldo</span><strong>${money(saldo())}</strong><em>${state.financas.length} lançamentos</em></div>`;

    const d = new Date();
    $('#visao-data').textContent = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;

    const doDiaItens = itensAgenda()
      .filter((i) => i.data === iso(h) || (i.area === 'tarefa' && !i.feito && fromIso(i.data) < h))
      .sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));

    $('#visao-dia').innerHTML = doDiaItens.length
      ? `<div class="panel-conteudo">${doDiaItens.map((i) => linhaHtml(i, h)).join('')}</div>`
      : `<div class="panel-conteudo">${vazioTotal()
        ? nadaAqui('Nada marcado para hoje. Comece dizendo o que você precisa fazer.', 'Adiciona tarefa ligar pro contador amanhã')
        : nadaAqui('Nada marcado para hoje.')}</div>`;

    $('#visao-metas').innerHTML = state.metas.length
      ? `<div class="panel-conteudo">${state.metas.map((m) => {
          const pct = Math.min(100, Math.round((m.atual / m.alvo) * 100));
          return `<div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:5px">
              <span style="font-size:.86rem">${esc(m.titulo)}</span>
              <span style="font-size:.82rem;color:var(--iris-soft);font-variant-numeric:tabular-nums">${pct}%</span>
            </div>
            <div class="bar"><span class="bar-fill" style="width:${pct}%"></span></div>
          </div>`;
        }).join('')}</div>`
      : `<div class="panel-conteudo">${nadaAqui('Nenhum objetivo ainda.', 'Meta: ler 12 livros')}</div>`;

    const log = state.log.slice(0, 6);
    $('#visao-log').innerHTML = log.length
      ? log.map((l) => `<li class="audit-item"><span class="audit-time">${l.t}</span><span class="audit-text">${esc(l.texto)}</span></li>`).join('')
      : '<li class="audit-item"><span class="audit-text" style="color:var(--dim)">Nenhuma ação ainda.</span></li>';
  }

  function renderApp() {
    if (!$('#app')) return;
    renderVisao();
    renderAgendaApp();
    renderTarefasApp();
    renderMetasApp();
    renderHabitosApp();
    renderFinancasApp();
    $('[data-nav-count="agenda"]').textContent = state.agenda.length;
    $('[data-nav-count="tarefas"]').textContent = abertas().length;
    $('#app-log').innerHTML = state.log.length
      ? state.log.map((l) => `<li class="audit-item"><span class="audit-time">${l.t}</span><span class="audit-text">${esc(l.texto)}</span></li>`).join('')
      : '<li class="audit-item"><span class="audit-text" style="color:var(--dim)">Nenhuma ação registrada ainda.</span></li>';
    const btn = $('#app-undo');
    if (btn) btn.disabled = !undoStack.length;
  }


  /* ===== criação/edição manual, sem passar pela IA ===== */

  const FORMS = {
    tarefas: {
      titulo: 'tarefa',
      campos: (it) => [
        { id: 'titulo', rotulo: 'O que precisa ser feito', tipo: 'text', valor: it?.titulo || '', req: true },
        { id: 'data', rotulo: 'Para quando', tipo: 'date', valor: it?.data || iso(hoje()) },
        { id: 'prioridade', rotulo: 'Prioridade', tipo: 'select', valor: it?.prioridade || 'media',
          opcoes: [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']] },
      ],
      montar: (v, it) => ({ titulo: v.titulo, data: v.data, prioridade: v.prioridade, feita: it ? it.feita : false }),
    },
    agenda: {
      titulo: 'compromisso',
      campos: (it) => [
        { id: 'titulo', rotulo: 'Compromisso', tipo: 'text', valor: it?.titulo || '', req: true },
        { id: 'data', rotulo: 'Dia', tipo: 'date', valor: it?.data || iso(addDias(hoje(), 1)) },
        { id: 'hora', rotulo: 'Horário', tipo: 'time', valor: it?.hora || '10:00' },
        { id: 'dur', rotulo: 'Duração (minutos)', tipo: 'number', valor: it?.dur ?? 60, min: 5, step: 5 },
        { id: 'foco', rotulo: 'É um bloco de foco', tipo: 'check', valor: !!it?.foco },
      ],
      montar: (v) => ({ titulo: v.titulo, data: v.data, hora: v.hora, dur: Number(v.dur) || 60, foco: !!v.foco }),
    },
    metas: {
      titulo: 'objetivo',
      campos: (it) => [
        { id: 'titulo', rotulo: 'Objetivo', tipo: 'text', valor: it?.titulo || '', req: true },
        { id: 'alvo', rotulo: 'Meta a alcançar', tipo: 'number', valor: it?.alvo ?? 10, min: 1 },
        { id: 'atual', rotulo: 'Progresso atual', tipo: 'number', valor: it?.atual ?? 0, min: 0 },
        { id: 'unidade', rotulo: 'Unidade', tipo: 'select', valor: it?.unidade ?? '',
          opcoes: [['', 'Sem unidade'], ['R$', 'Reais (R$)'], ['livros', 'Livros'], ['km', 'Quilômetros'], ['kg', 'Quilos'], ['horas', 'Horas']] },
      ],
      montar: (v) => ({ titulo: v.titulo, alvo: Number(v.alvo) || 1, atual: Number(v.atual) || 0, unidade: v.unidade }),
    },
    habitos: {
      titulo: 'hábito',
      campos: (it) => [
        { id: 'titulo', rotulo: 'Hábito diário', tipo: 'text', valor: it?.titulo || '', req: true },
        { id: 'hoje', rotulo: 'Já fiz hoje', tipo: 'check', valor: !!it?.hoje },
      ],
      montar: (v, it) => ({ titulo: v.titulo, dias: it ? it.dias : [0, 0, 0, 0, 0, 0, 0], hoje: !!v.hoje }),
    },
    financas: {
      titulo: 'lançamento',
      campos: (it) => [
        { id: 'titulo', rotulo: 'Descrição', tipo: 'text', valor: it?.titulo || '', req: true },
        { id: 'tipo', rotulo: 'Tipo', tipo: 'select', valor: it && it.valor > 0 ? 'entrada' : 'saida',
          opcoes: [['saida', 'Saída (gasto)'], ['entrada', 'Entrada (receita)']] },
        { id: 'valor', rotulo: 'Valor (R$)', tipo: 'number', valor: it ? Math.abs(it.valor) : '', min: 0, step: '0.01', req: true },
        { id: 'data', rotulo: 'Data', tipo: 'date', valor: it?.data || iso(hoje()) },
      ],
      montar: (v) => {
        const bruto = Math.abs(Number(String(v.valor).replace(',', '.')) || 0);
        return { titulo: v.titulo, valor: v.tipo === 'entrada' ? bruto : -bruto, tipo: v.tipo, data: v.data };
      },
    },
  };

  let itemEmEdicao = null; // { area, id }

  function abrirFormItem(area, id) {
    const cfg = FORMS[area];
    if (!cfg) return;
    const it = id ? (state[area] || []).find((x) => x.id === id) : null;
    itemEmEdicao = { area, id: id || null };

    $('#item-title').textContent = it ? `Editar ${cfg.titulo}` : `Novo ${cfg.titulo}`;
    $('#item-sub').textContent = it
      ? 'Altere o que quiser e salve — a IA não precisa participar.'
      : 'Preencha à mão. Você também pode pedir isso para a sua IA, se preferir.';
    $('#item-erro').hidden = true;

    $('#campos-item').innerHTML = cfg.campos(it).map((c) => {
      if (c.tipo === 'check') {
        return `<label class="radio" style="margin-bottom:14px">
          <input type="checkbox" id="f-${c.id}" ${c.valor ? 'checked' : ''}>
          <span>${esc(c.rotulo)}</span>
        </label>`;
      }
      if (c.tipo === 'select') {
        return `<label class="field"><span>${esc(c.rotulo)}</span>
          <select id="f-${c.id}">${c.opcoes.map(([v, r]) => `<option value="${esc(v)}" ${String(c.valor) === String(v) ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
        </label>`;
      }
      const extra = [
        c.min !== undefined ? `min="${c.min}"` : '',
        c.step !== undefined ? `step="${c.step}"` : '',
        c.req ? 'required' : '',
      ].join(' ');
      return `<label class="field"><span>${esc(c.rotulo)}</span>
        <input type="${c.tipo}" id="f-${c.id}" value="${esc(String(c.valor ?? ''))}" ${extra}>
      </label>`;
    }).join('');

    $('#item-salvar').textContent = it ? 'Salvar alterações' : `Criar ${cfg.titulo}`;
    abrir('#modal-item');
    setTimeout(() => { const p = $('#campos-item input, #campos-item select'); if (p) p.focus(); }, 60);
  }

  function salvarItemManual(e) {
    e.preventDefault();
    if (!itemEmEdicao) return;
    const { area, id } = itemEmEdicao;
    const cfg = FORMS[area];
    const it = id ? (state[area] || []).find((x) => x.id === id) : null;

    const valores = {};
    cfg.campos(it).forEach((c) => {
      const el = $(`#f-${c.id}`);
      if (!el) return;
      valores[c.id] = c.tipo === 'check' ? el.checked : el.value;
    });

    const erro = $('#item-erro');
    if (!String(valores.titulo || '').trim()) {
      erro.textContent = 'Dê um nome para esse item.';
      erro.hidden = false;
      return;
    }
    if (area === 'financas' && !(Math.abs(Number(String(valores.valor).replace(',', '.'))) > 0)) {
      erro.textContent = 'Informe um valor maior que zero.';
      erro.hidden = false;
      return;
    }
    erro.hidden = true;

    const dados = cfg.montar(valores, it);
    undoStack.push(clone(state));

    let tocado;
    if (it) {
      Object.assign(it, dados);
      tocado = it.id;
      if (area === 'agenda') state.agenda.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    } else {
      const novo = { id: uid(), ...dados };
      if (area === 'agenda') {
        state.agenda.push(novo);
        state.agenda.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
      } else if (area === 'tarefas' || area === 'financas') {
        state[area].unshift(novo);
      } else {
        state[area].push(novo);
      }
      tocado = novo.id;
    }

    state.log.unshift({
      t: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      texto: `${it ? 'Editado' : 'Criado'} à mão: ${NOME_AREA[area]} “${dados.titulo}”`,
      n: 1,
    });

    save();
    renderTudo([tocado]);
    $('#app-undo').disabled = false;
    fechar('#modal-item');
    toast(it ? 'Alterações salvas' : `${cfg.titulo.charAt(0).toUpperCase() + cfg.titulo.slice(1)} criado`);
    itemEmEdicao = null;
  }

  const btnEditar = (area, id) =>
    `<button class="item-editar" type="button" data-editar="${area}:${id}" aria-label="Editar" title="Editar">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14.5 5.5l4 4" stroke="currentColor" stroke-width="1.7"/></svg>
    </button>`;

  function wireApp() {
    // navegação
    $$('.app-nav-item').forEach((b) => b.addEventListener('click', () => irPara(b.dataset.view)));
    $('#app-menu').addEventListener('click', () => $('#app').classList.toggle('side-open'));
    $('#app-side-close').addEventListener('click', () => $('#app').classList.remove('side-open'));
    $('#app-voltar').addEventListener('click', sairApp);
    $('#app-undo').addEventListener('click', () => { if (desfazer()) toast('Desfeito'); });

    $('#app-sair').addEventListener('click', () => {
      config.logado = false;
      saveCfg();
      sairApp();
      toast('Você saiu da conta');
    });

    // filtros
    $$('[data-area]').forEach((b) => b.addEventListener('click', () => {
      filtros.area = b.dataset.area;
      $$('[data-area]').forEach((x) => x.classList.toggle('is-on', x === b));
      renderAgendaApp();
    }));
    $$('[data-periodo]').forEach((b) => b.addEventListener('click', () => {
      filtros.periodo = Number(b.dataset.periodo);
      $$('[data-periodo]').forEach((x) => x.classList.toggle('is-on', x === b));
      renderAgendaApp();
    }));
    $$('[data-tarefa]').forEach((b) => b.addEventListener('click', () => {
      filtros.tarefa = b.dataset.tarefa;
      $$('[data-tarefa]').forEach((x) => x.classList.toggle('is-on', x === b));
      renderTarefasApp();
    }));
    $$('[data-fin]').forEach((b) => b.addEventListener('click', () => {
      filtros.fin = b.dataset.fin;
      $$('[data-fin]').forEach((x) => x.classList.toggle('is-on', x === b));
      renderFinancasApp();
    }));

    // chat do app
    $('#app-composer').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#app-input').value.trim();
      if (!v) return;
      $('#app-input').value = '';
      $('#app-sugestoes').innerHTML = '';
      responder(v, 'app');
    });

    // pedido rápido da visão geral leva para o chat
    $('#visao-composer').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#visao-input').value.trim();
      if (!v) return;
      $('#visao-input').value = '';
      irPara('chat');
      responder(v, 'app');
    });

    // ações dentro das telas
    $('.app-body').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const d = btn.dataset;
      if (d.novo) { abrirFormItem(d.novo); return; }
      if (d.editar) {
        const [area, id] = d.editar.split(':');
        abrirFormItem(area, id);
        return;
      }
      if (d.exemplo) {
        irPara('chat');
        responder(d.exemplo, 'app');
        return;
      }
      const mexer = (fn) => {
        undoStack.push(clone(state));
        fn();
        save(); renderTudo();
        $('#app-undo').disabled = false;
      };
      if (d.toggle) return mexer(() => { const t = state.tarefas.find((x) => x.id === d.toggle); if (t) t.feita = !t.feita; });
      if (d.delTarefa) return mexer(() => { state.tarefas = state.tarefas.filter((x) => x.id !== d.delTarefa); });
      if (d.delMeta) return mexer(() => { state.metas = state.metas.filter((x) => x.id !== d.delMeta); });
      if (d.delHabito) return mexer(() => { state.habitos = state.habitos.filter((x) => x.id !== d.delHabito); });
      if (d.delFin) return mexer(() => { state.financas = state.financas.filter((x) => x.id !== d.delFin); });
      if (d.habito) return mexer(() => { const hb = state.habitos.find((x) => x.id === d.habito); if (hb && !hb.hoje) { hb.hoje = true; hb.dias = hb.dias.slice(1).concat(1); } });
      if (d.metaMais) return mexer(() => { const m = state.metas.find((x) => x.id === d.metaMais); if (m) m.atual = Math.min(m.alvo, m.atual + Number(d.passo)); });
      if (d.metaMenos) return mexer(() => { const m = state.metas.find((x) => x.id === d.metaMenos); if (m) m.atual = Math.max(0, m.atual - Number(d.passo)); });
    });

    // cadastro
    $('#form-signup').addEventListener('submit', (e) => {
      e.preventDefault();
      const erro = $('#su-erro');
      const nome = $('#su-nome').value.trim();
      const email = $('#su-email').value.trim().toLowerCase();
      const ia = $('#su-ia').value.trim();
      if (!nome || !email || !ia) {
        erro.textContent = 'Preencha todos os campos.';
        erro.hidden = false;
        return;
      }
      erro.hidden = true;
      config.dono = nome.slice(0, 24);
      config.email = email;
      config.nome = ia.slice(0, 18);
      config.modo = document.querySelector('input[name="su-modo"]:checked').value;
      config.criada = true;
      saveCfg();
      // workspace limpo: a pessoa monta o dela do jeito que quiser
      state = vazio();
      undoStack = [];
      save();
      renderTudo();
      elChat('app').innerHTML = '';
      fechar('#modal-signup');
      entrarApp('visao');
      toast(`Conta criada — ${config.nome} está pronta`);
    });

    // login
    $('#form-login').addEventListener('submit', (e) => {
      e.preventDefault();
      const erro = $('#li-erro');
      const email = $('#li-email').value.trim().toLowerCase();
      if (!config.criada || !config.email) {
        erro.textContent = 'Nenhuma conta foi criada neste navegador ainda. Crie a sua primeiro.';
        erro.hidden = false;
        return;
      }
      if (email !== config.email) {
        erro.textContent = 'Esse e-mail não confere com a conta salva neste navegador.';
        erro.hidden = false;
        return;
      }
      erro.hidden = true;
      fechar('#modal-login');
      entrarApp('visao');
      toast(`Bem-vindo de volta${config.dono ? ', ' + config.dono : ''}`);
    });

    $('#form-item').addEventListener('submit', salvarItemManual);
    $('#ir-login').addEventListener('click', () => { fechar('#modal-signup'); abrirLogin(); });
    $('#ir-signup').addEventListener('click', () => { fechar('#modal-login'); abrirSignup(); });
  }

  /* os botões do site mudam de texto conforme a pessoa já tenha conta ou sessão aberta */
  function rotularCTAs() {
    const logado = config.logado && config.criada;
    const criar = logado ? 'Abrir meu workspace' : 'Criar minha IA';
    [['#cta-criar', criar], ['#cta-final', logado ? 'Abrir meu workspace' : 'Criar minha IA']].forEach(([sel, txt]) => {
      const el = $(sel);
      if (el) el.textContent = txt;
    });
    const heroBtn = $('#hero-criar');
    if (heroBtn) heroBtn.innerHTML = `${criar} <span aria-hidden="true">→</span>`;
    const entrar = $('#cta-entrar');
    if (entrar) entrar.textContent = logado ? 'Voltar ao app' : 'Entrar';
  }

  function abrirSignup() {
    $('#su-erro').hidden = true;
    const aviso = $('#su-aviso');
    if (aviso) aviso.hidden = !config.criada;
    $('#su-nome').value = config.dono || '';
    $('#su-email').value = config.email || '';
    $('#su-ia').value = config.nome || 'Luna';
    const r = document.querySelector(`input[name="su-modo"][value="${config.modo}"]`);
    if (r) r.checked = true;
    abrir('#modal-signup');
    setTimeout(() => $('#su-nome').focus(), 60);
  }

  function abrirLogin() {
    $('#li-erro').hidden = true;
    $('#li-email').value = config.email || '';
    abrir('#modal-login');
    setTimeout(() => $('#li-email').focus(), 60);
  }


  function init() {
    aplicarConfig();
    renderTudo();

    // mede o motor de verdade numa passada em seco, para a faixa já abrir com número real
    const t0 = performance.now();
    planejar('o que eu tenho pra hoje');
    $('#proof-latency').textContent = Math.max(1, Math.round(performance.now() - t0)) + 'ms';

    rodarDemo('Organize minha semana');
    renderDicas(['Organize minha semana', 'O que eu tenho pra hoje?', 'Gastei 80 no mercado']);

    bolha('ai', `Oi${config.dono ? ', ' + esc(config.dono) : ''}! Eu sou a ${esc(config.nome)}. Já li seu workspace: <strong>${abertas().length} tarefas abertas</strong>, ${atrasadas().length} atrasada(s) e ${state.agenda.length} compromissos. O que você quer resolver primeiro?`);

    $('#btn-undo').disabled = true;

    // composer
    $('#composer').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#input').value.trim();
      if (!v) return;
      $('#input').value = '';
      $('#suggestions').innerHTML = '';
      responder(v);
    });

    // demo chips
    $$('[data-demo]').forEach((b) => b.addEventListener('click', () => rodarDemo(b.dataset.demo)));

    // modo
    $$('.mode-opt').forEach((b) => b.addEventListener('click', () => {
      config.modo = b.dataset.mode;
      saveCfg(); aplicarConfig();
      toast(config.modo === 'autonomo' ? 'Modo autônomo: ações de risco baixo sem perguntar' : 'Modo copiloto: pede permissão para tudo');
    }));

    // abas
    $$('.state-tab').forEach((b) => b.addEventListener('click', () => {
      $$('.state-tab').forEach((x) => { x.classList.remove('is-on'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('is-on'); b.setAttribute('aria-selected', 'true');
      $$('.state-panel').forEach((p) => p.classList.toggle('is-on', p.dataset.panel === b.dataset.tab));
    }));

    // cards de domínio levam para a aba
    $$('[data-domain]').forEach((c) => c.addEventListener('click', () => {
      const alvo = $(`.state-tab[data-tab="${c.dataset.domain}"]`);
      if (alvo) alvo.click();
      $('#workspace').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }));

    // interações nas listas
    $('.state-body').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const acoes = {
        toggle: (id) => { const t = state.tarefas.find((x) => x.id === id); if (t) t.feita = !t.feita; },
        delTarefa: (id) => { state.tarefas = state.tarefas.filter((x) => x.id !== id); },
        delEvento: (id) => { state.agenda = state.agenda.filter((x) => x.id !== id); },
        delMeta: (id) => { state.metas = state.metas.filter((x) => x.id !== id); },
        delHabito: (id) => { state.habitos = state.habitos.filter((x) => x.id !== id); },
        delFin: (id) => { state.financas = state.financas.filter((x) => x.id !== id); },
        habito: (id) => { const hb = state.habitos.find((x) => x.id === id); if (hb && !hb.hoje) { hb.hoje = true; hb.dias = hb.dias.slice(1).concat(1); } },
      };
      const mapa = [
        ['toggle', btn.dataset.toggle], ['delTarefa', btn.dataset.delTarefa], ['delEvento', btn.dataset.delEvento],
        ['delMeta', btn.dataset.delMeta], ['delHabito', btn.dataset.delHabito], ['delFin', btn.dataset.delFin],
        ['habito', btn.dataset.habito],
      ];
      for (const [k, id] of mapa) {
        if (id) {
          undoStack.push(clone(state));
          acoes[k](id);
          save(); renderTudo(); $('#btn-undo').disabled = false;
          return;
        }
      }
    });

    // rodapé do estado
    $('#btn-undo').addEventListener('click', () => { if (desfazer()) toast('Desfeito'); });
    $('#btn-log').addEventListener('click', () => abrir('#modal-log'));
    $('#btn-reset').addEventListener('click', () => {
      undoStack.push(clone(state));
      // com conta criada, reiniciar limpa — nunca devolve dado de exemplo pra um workspace real
      const temConta = config.criada;
      state = temConta ? vazio() : seed();
      save(); renderTudo();
      elChat('landing').innerHTML = '';
      bolha('ai', temConta
        ? `Workspace limpo. Sou a ${esc(config.nome)} — me diz o que você quer montar.`
        : `Demonstração reiniciada. Sou a ${esc(config.nome)} — me diz o que precisa.`);
      $('#btn-undo').disabled = false;
      toast(temConta ? 'Workspace limpo' : 'Demo reiniciada');
    });

    // modal config
    const abrirConfig = () => {
      $('#cfg-name').value = config.nome;
      $('#cfg-owner').value = config.dono;
      const r = document.querySelector(`input[name="cfg-mode"][value="${config.modo}"]`);
      if (r) r.checked = true;
      abrir('#modal-config');
      setTimeout(() => $('#cfg-name').focus(), 60);
    };
    // o engrenagem do workspace da landing segue configurando a IA sem sair da página
    $('#btn-config').addEventListener('click', abrirConfig);

    // quem está logado volta pro próprio workspace; o resto vai pro cadastro
    ['#cta-criar', '#hero-criar', '#cta-final'].forEach((s) => {
      const el = $(s);
      if (el) el.addEventListener('click', () => {
        if (config.logado && config.criada) entrarApp('visao');
        else abrirSignup();
      });
    });
    $('#cta-entrar').addEventListener('click', () => {
      if (config.logado && config.criada) entrarApp('visao');
      else if (config.criada && config.email) abrirLogin();
      else abrirSignup();
    });
    rotularCTAs();

    wireApp();
    // sessão continua aberta entre visitas, como num app de verdade
    if (config.logado && config.criada) entrarApp('visao');

    $('#form-config').addEventListener('submit', (e) => {
      e.preventDefault();
      config.nome = ($('#cfg-name').value.trim() || 'Luna').slice(0, 18);
      config.dono = $('#cfg-owner').value.trim().slice(0, 18);
      config.modo = document.querySelector('input[name="cfg-mode"]:checked').value;
      saveCfg(); aplicarConfig(); fechar('#modal-config');
      elChat('landing').innerHTML = '';
      bolha('ai', `Prontinho${config.dono ? ', ' + esc(config.dono) : ''}. Sou a <strong>${esc(config.nome)}</strong>, no modo ${config.modo === 'autonomo' ? 'autônomo' : 'copiloto'}. Já estou de olho em ${abertas().length} tarefas abertas — manda o primeiro comando.`);
      renderDicas(['Organize minha semana', 'O que eu tenho pra hoje?']);
      toast(`${config.nome} está pronta`);
      $('#workspace').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // modais
    $$('[data-close]').forEach((b) => b.addEventListener('click', () => {
      const m = b.closest('.modal'); if (m) fechar('#' + m.id);
    }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.modal:not([hidden])').forEach((m) => fechar('#' + m.id));
    });

    // scroll suave dos botões
    $$('[data-scroll]').forEach((b) => b.addEventListener('click', () => {
      const alvo = $(b.dataset.scroll);
      if (alvo) alvo.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }));

    // nav
    const navToggle = $('#nav-toggle'), navLinks = $('#nav-links');
    navToggle.addEventListener('click', () => {
      const aberto = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', aberto);
      navToggle.setAttribute('aria-expanded', String(aberto));
    });
    $$('#nav-links a').forEach((a) => a.addEventListener('click', () => {
      navLinks.classList.remove('open'); navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));

    let scrollAgendado = false;
    window.addEventListener('scroll', () => {
      if (scrollAgendado) return;
      scrollAgendado = true;
      setTimeout(() => {
        $('#site-header').classList.toggle('scrolled', window.scrollY > 16);
        scrollAgendado = false;
      }, 60);
    });

    // reveal
    const alvos = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      alvos.forEach((el) => el.classList.add('is-visible'));
    } else {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.style.transitionDelay = `${(Number(en.target.dataset.delay) || 0) * 90}ms`;
          en.target.classList.add('is-visible');
          obs.unobserve(en.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
      alvos.forEach((el) => obs.observe(el));
    }
  }

  function abrir(sel) { const m = $(sel); if (m) { m.hidden = false; document.body.style.overflow = 'hidden'; } }
  function fechar(sel) { const m = $(sel); if (m) { m.hidden = true; document.body.style.overflow = ''; } }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
