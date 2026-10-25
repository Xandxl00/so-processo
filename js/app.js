// Interface do Só Processo: liga a tela às regras de tarefas.js.
// Toda ação passa pelo repositório e depois chama renderizar(), que redesenha a tela a partir dos dados salvos.

const repositorio = criarRepositorio(window.localStorage);
const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Textos e ícones ----------

const NOMES_PRIORIDADE = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const NOMES_STATUS = { a_fazer: 'A fazer', andamento: 'Em andamento', concluida: 'Concluída' };
const NOMES_COR = {
  azul: 'Azul', roxo: 'Roxo', verde: 'Verde', laranja: 'Laranja',
  rosa: 'Rosa', ciano: 'Ciano', amarelo: 'Amarelo', cinza: 'Cinza',
};
const TEMAS = [
  { id: '', nome: 'Tema automático', icone: 'monitor' },
  { id: 'claro', nome: 'Tema claro', icone: 'sol' },
  { id: 'escuro', nome: 'Tema escuro', icone: 'lua' },
];
const MODOS = ['lista', 'quadro', 'calendario'];
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const CORES_CONFETE = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

const VISOES = {
  hoje: { nome: 'Hoje', icone: 'sol', vazio: 'Nada pra hoje. Aproveite o dia!' },
  semana: { nome: 'Próximos 7 dias', icone: 'calendario', vazio: 'Nenhuma tarefa nos próximos 7 dias.' },
  atrasadas: { nome: 'Atrasadas', icone: 'alerta', vazio: 'Nenhuma tarefa atrasada. Tudo em dia!' },
  todas: { nome: 'Todas as tarefas', icone: 'caixa', vazio: 'Nenhuma tarefa por aqui.' },
};

// Ícones de traço (estilo Lucide), em 24x24.
const ICONES = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lua: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  alerta: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  caixa: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  quadro: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  lapis: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  lixeira: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  bandeira: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  enviar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  esquerda: '<path d="m15 18-6-6 6-6"/>',
  direita: '<path d="m9 18 6-6-6-6"/>',
  subtarefas: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  cronometro: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pausa: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  reiniciar: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
};

function icone(nome) {
  return `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
}

// Cria um elemento. Texto entra sempre como texto (nunca como HTML);
// `html` só recebe os ícones fixos deste arquivo.
function el(tag, propriedades = {}, ...filhos) {
  const elemento = document.createElement(tag);
  for (const [chave, valor] of Object.entries(propriedades)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (chave === 'classe') elemento.className = valor;
    else if (chave === 'html') elemento.innerHTML = valor;
    else if (chave.startsWith('on')) elemento.addEventListener(chave.slice(2), valor);
    else if (chave in elemento) elemento[chave] = valor;
    else elemento.setAttribute(chave, valor === true ? '' : valor);
  }
  elemento.append(...filhos.flat().filter((filho) => filho !== null && filho !== undefined && filho !== false));
  return elemento;
}

function botaoIcone(nome, rotulo, aoClicar, classe = '') {
  return el('button', {
    type: 'button',
    classe: `botao-icone ${classe}`.trim(),
    'aria-label': rotulo,
    title: rotulo,
    html: icone(nome),
    onclick: aoClicar,
  });
}

const plural = (n, singular, varios) => `${n} ${n === 1 ? singular : varios}`;
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// ---------- Estado da tela ----------

const CHAVE_PREFERENCIAS = 'so-processo:preferencias';

function lerPreferencias() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PREFERENCIAS)) || {};
  } catch {
    return {};
  }
}

const preferencias = lerPreferencias();
const estado = {
  visao: preferencias.visao || 'todas',
  status: 'todas',
  prioridade: 'todas',
  busca: '',
  ordem: preferencias.ordem || 'prazo',
  modo: MODOS.includes(preferencias.modo) ? preferencias.modo : 'lista',
  tema: preferencias.tema || '',
  mes: hojeISO().slice(0, 7), // mês aberto no calendário
  diaSelecionado: hojeISO(),
};
const expandidas = new Set(); // tarefas com as subtarefas abertas
const novas = new Set(); // tarefas que acabaram de ser criadas (entram com animação)
let animarConteudo = false;
let idEmEdicao = null;
let rascunhoSubtarefas = [];

function salvarPreferencias() {
  const { visao, ordem, modo, tema } = estado;
  try {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify({ visao, ordem, modo, tema }));
  } catch {
    // sem armazenamento: só não lembra as preferências
  }
}

// ---------- Elementos fixos da página ----------

const $ = (id) => document.getElementById(id);
const lateral = $('lateral');
const fundoMenu = $('fundo-menu');
const menuVisoes = $('menu-visoes');
const menuCategorias = $('menu-categorias');
const botaoTema = $('botao-tema');
const arquivoImportar = $('arquivo-importar');
const saudacao = $('saudacao');
const tituloVisao = $('titulo-visao');
const fraseResumo = $('frase-resumo');
const painelResumo = $('resumo');
const formRapido = $('form-rapido');
const campoRapido = $('campo-rapido');
const campoBusca = $('campo-busca');
const filtroStatus = $('filtro-status');
const filtroPrioridade = $('filtro-prioridade');
const seletorOrdem = $('ordem');
const seletorModo = $('modo');
const conteudo = $('conteudo');
const aviso = $('aviso');

const modalTarefa = $('modal-tarefa');
const formTarefa = $('form-tarefa');
const tituloModalTarefa = $('titulo-modal-tarefa');
const campoTitulo = $('campo-titulo');
const campoDescricao = $('campo-descricao');
const campoPrazo = $('campo-prazo');
const campoCategoria = $('campo-categoria');
const campoStatus = $('campo-status');
const listaRascunho = $('lista-rascunho');
const progressoRascunho = $('progresso-rascunho');
const campoSubtarefa = $('campo-subtarefa');
const erroTarefa = $('erro-tarefa');
const botaoExcluirModal = $('botao-excluir-modal');

const modalCategoria = $('modal-categoria');
const formCategoria = $('form-categoria');
const campoNomeCategoria = $('campo-nome-categoria');
const opcoesCor = $('opcoes-cor');
const erroCategoria = $('erro-categoria');

const modalFoco = $('modal-foco');
const focoTitulo = $('foco-titulo');
const focoTempo = $('foco-tempo');
const focoEstado = $('foco-estado');
const focoArco = $('foco-arco');
const focoDuracoes = $('foco-duracoes');
const focoIniciar = $('foco-iniciar');
const focoTotal = $('foco-total');

// ---------- Animações ----------

// Põe a classe, espera a animação e depois segue.
function animarSaida(elemento, classe, duracao) {
  if (semAnimacao || !elemento) return Promise.resolve();
  elemento.classList.add(classe);
  return new Promise((pronto) => setTimeout(pronto, duracao));
}

function soltarConfete(x = innerWidth / 2, y = innerHeight / 3, onde = document.body) {
  if (semAnimacao) return;
  for (let i = 0; i < 80; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const distancia = 120 + Math.random() * 280;
    const peca = el('span', { classe: 'confete' });
    peca.style.left = `${x}px`;
    peca.style.top = `${y}px`;
    peca.style.background = CORES_CONFETE[i % CORES_CONFETE.length];
    peca.style.setProperty('--x', `${Math.cos(angulo) * distancia}px`);
    peca.style.setProperty('--y', `${Math.sin(angulo) * distancia + 160}px`);
    peca.style.setProperty('--r', `${Math.random() * 900 - 450}deg`);
    peca.style.animationDelay = `${Math.random() * 0.12}s`;
    onde.append(peca);
    setTimeout(() => peca.remove(), 1800);
  }
}

function tocarSino() {
  try {
    const audio = new AudioContext();
    [660, 880, 1320].forEach((frequencia, i) => {
      const inicio = audio.currentTime + i * 0.18;
      const oscilador = audio.createOscillator();
      const volume = audio.createGain();
      oscilador.frequency.value = frequencia;
      volume.gain.setValueAtTime(0.0001, inicio);
      volume.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.7);
      oscilador.connect(volume).connect(audio.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + 0.75);
    });
  } catch {
    // navegador sem áudio: segue sem som
  }
}

// ---------- Datas na tela ----------

function lerDataLocal(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatarData(iso, hoje) {
  const [ano, mes, dia] = iso.split('-');
  return ano === hoje.slice(0, 4) ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
}

function descreverPrazo(tarefa, hoje) {
  if (!tarefa.prazo) return null;
  if (estaConcluida(tarefa)) return { texto: formatarData(tarefa.prazo, hoje), classe: '' };
  const dias = diasEntre(hoje, tarefa.prazo);
  if (dias === -1) return { texto: 'Venceu ontem', classe: 'atrasada' };
  if (dias < 0) return { texto: `Atrasada há ${-dias} dias`, classe: 'atrasada' };
  if (dias === 0) return { texto: 'Hoje', classe: 'hoje' };
  if (dias === 1) return { texto: 'Amanhã', classe: '' };
  if (dias < 7) return { texto: DIAS_SEMANA[lerDataLocal(tarefa.prazo).getDay()], classe: '' };
  return { texto: formatarData(tarefa.prazo, hoje), classe: '' };
}

const formatoDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

function descreverDia(iso, hoje) {
  const dias = diasEntre(hoje, iso);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  if (dias === -1) return 'Ontem';
  return capitalizar(formatoDia.format(lerDataLocal(iso)));
}

function formatarMinutos(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const resto = minutos % 60;
  return `${Math.floor(minutos / 60)}h${resto ? ` ${resto}min` : ''}`;
}

// ---------- Desenho da tela ----------

function renderizar() {
  const hoje = hojeISO();
  const tarefas = repositorio.tarefas();
  const categorias = repositorio.categorias();
  const visaoExiste = VISOES[estado.visao] || categorias.some((c) => `categoria:${c.id}` === estado.visao);
  if (!visaoExiste) estado.visao = 'todas';

  renderizarMenu(tarefas, categorias, hoje);
  renderizarCabecalho(tarefas, categorias, hoje);
  atualizarResumo(resumirTarefas(tarefas.filter((t) => pertenceAVisao(t, estado.visao, hoje)), hoje));
  renderizarFerramentas();

  const consulta = { ...estado, status: estado.modo === 'quadro' ? 'todas' : estado.status };
  const visiveis = consultarTarefas(tarefas, consulta, hoje);
  const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));
  if (tarefas.length === 0) conteudo.replaceChildren(mensagemVazia(true));
  else if (estado.modo === 'quadro') conteudo.replaceChildren(quadro(visiveis, categoriasPorId, hoje));
  else if (estado.modo === 'calendario') conteudo.replaceChildren(calendario(visiveis, categoriasPorId, hoje));
  else conteudo.replaceChildren(lista(visiveis, categoriasPorId, hoje));

  // Tarefas novas entram uma depois da outra.
  conteudo.querySelectorAll('.entrando').forEach((item, i) => {
    item.style.animationDelay = `${Math.min(i, 12) * 45}ms`;
  });
  novas.clear();

  if (animarConteudo && !semAnimacao) {
    conteudo.classList.remove('trocando');
    void conteudo.offsetWidth; // reinicia a animação
    conteudo.classList.add('trocando');
  }
  animarConteudo = false;
}

function itemMenu(id, nome, marcador, quantidade, alerta = false) {
  const ativo = estado.visao === id;
  return el('li', { classe: ativo ? 'item-menu ativo' : 'item-menu' },
    el('button', { type: 'button', classe: 'link-menu', 'aria-current': ativo ? 'page' : null, onclick: () => trocarVisao(id) },
      marcador,
      el('span', { classe: 'nome-menu' }, nome),
      quantidade ? el('span', { classe: alerta ? 'contador alerta' : 'contador' }, String(quantidade)) : null));
}

function renderizarMenu(tarefas, categorias, hoje) {
  const contagem = contarPendentesPorVisao(tarefas, categorias, hoje);
  menuVisoes.replaceChildren(...Object.entries(VISOES).map(([id, visao]) =>
    itemMenu(id, visao.nome, el('span', { classe: 'marcador', html: icone(visao.icone) }), contagem[id], id === 'atrasadas')));

  menuCategorias.replaceChildren(...categorias.map((categoria) => {
    const id = `categoria:${categoria.id}`;
    const item = itemMenu(id, categoria.nome, el('span', { classe: `marcador ponto cor-${categoria.cor}` }), contagem[id]);
    item.append(botaoIcone('fechar', `Excluir categoria ${categoria.nome}`, () => excluirCategoria(categoria), 'excluir-categoria'));
    return item;
  }));

  const tema = TEMAS.find((t) => t.id === estado.tema) || TEMAS[0];
  botaoTema.innerHTML = icone(tema.icone);
  botaoTema.append(tema.nome);
}

function fraseDoDia(total, paraHoje, atrasadas) {
  if (total === 0) return 'Comece cadastrando a sua primeira tarefa.';
  const partes = [];
  if (paraHoje) partes.push(plural(paraHoje, 'tarefa pra hoje', 'tarefas pra hoje'));
  if (atrasadas) partes.push(plural(atrasadas, 'atrasada', 'atrasadas'));
  if (partes.length === 0) return 'Nada pendente pra hoje. Bom trabalho!';
  return `Você tem ${partes.join(' e ')}.`;
}

function renderizarCabecalho(tarefas, categorias, hoje) {
  const hora = new Date().getHours();
  const cumprimento = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  saudacao.textContent = `${cumprimento} · ${capitalizar(formatoDia.format(new Date()))}`;

  const categoria = categorias.find((c) => `categoria:${c.id}` === estado.visao);
  tituloVisao.textContent = categoria ? categoria.nome : VISOES[estado.visao].nome;
  if (!modalFoco.open) document.title = `${tituloVisao.textContent} · Só Processo`;

  const pendentes = tarefas.filter((t) => !estaConcluida(t));
  fraseResumo.textContent = fraseDoDia(
    tarefas.length,
    pendentes.filter((t) => t.prazo === hoje).length,
    pendentes.filter((t) => estaAtrasada(t, hoje)).length,
  );
}

// O resumo é montado uma vez só e depois só atualiza os números,
// assim o anel de progresso anima de um valor pro outro.
const RAIO_ANEL = 26;
const CIRCUNFERENCIA_ANEL = 2 * Math.PI * RAIO_ANEL;
const cartoesResumo = {};

function montarResumo() {
  const cartao = (chave, rotulo, nomeIcone, tom, aoClicar) => {
    const valor = el('strong', { classe: 'valor-resumo' }, '0');
    const botao = el('button', { type: 'button', classe: 'cartao-resumo', onclick: aoClicar },
      el('span', { classe: `icone-resumo tom-${tom}`, html: icone(nomeIcone) }),
      el('span', { classe: 'textos-resumo' }, el('span', { classe: 'rotulo-resumo' }, rotulo), valor));
    cartoesResumo[chave] = { botao, valor };
    return botao;
  };

  const progresso = el('div', { classe: 'cartao-resumo progresso' });
  progresso.innerHTML = `
    <div class="anel" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <defs><linearGradient id="gradiente-progresso" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#6366f1"/><stop offset="55%" stop-color="#a855f7"/><stop offset="100%" stop-color="#ec4899"/>
        </linearGradient></defs>
        <circle class="trilho" cx="32" cy="32" r="${RAIO_ANEL}"/>
        <circle class="arco" cx="32" cy="32" r="${RAIO_ANEL}" stroke-dasharray="${CIRCUNFERENCIA_ANEL}" stroke-dashoffset="${CIRCUNFERENCIA_ANEL}"/>
      </svg>
      <span class="percentual">0%</span>
    </div>
    <span class="textos-resumo"><span class="rotulo-resumo">Progresso</span><span class="detalhe-resumo"></span></span>`;
  cartoesResumo.progresso = {
    anel: progresso.querySelector('.anel'),
    arco: progresso.querySelector('.arco'),
    percentual: progresso.querySelector('.percentual'),
    detalhe: progresso.querySelector('.detalhe-resumo'),
  };

  painelResumo.replaceChildren(
    cartao('pendentes', 'Pendentes', 'lista', 'roxo', () => aplicarFiltroStatus('pendentes')),
    cartao('andamento', 'Em andamento', 'relogio', 'azul', () => aplicarFiltroStatus('andamento')),
    cartao('atrasadas', 'Atrasadas', 'alerta', 'vermelho', () => trocarVisao('atrasadas')),
    cartao('concluidas', 'Concluídas', 'check', 'verde', () => aplicarFiltroStatus('concluidas')),
    progresso);
}

function atualizarResumo(r) {
  for (const chave of ['pendentes', 'andamento', 'atrasadas', 'concluidas']) {
    cartoesResumo[chave].valor.textContent = String(r[chave]);
  }
  cartoesResumo.atrasadas.botao.classList.toggle('alerta', r.atrasadas > 0);

  const p = cartoesResumo.progresso;
  p.arco.style.strokeDashoffset = String(CIRCUNFERENCIA_ANEL * (1 - r.percentual / 100));
  p.percentual.textContent = `${r.percentual}%`;
  p.anel.setAttribute('aria-valuenow', String(r.percentual));
  p.detalhe.textContent = r.total === 0 ? 'nenhuma tarefa nesta visão'
    : r.percentual === 100 ? 'tudo concluído!' : `${r.concluidas} de ${r.total} concluídas`;
}

function renderizarFerramentas() {
  filtroStatus.hidden = estado.modo === 'quadro';
  filtroStatus.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.status === estado.status)));
  seletorModo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === estado.modo)));
  seletorOrdem.hidden = estado.modo === 'calendario';
  filtroPrioridade.value = estado.prioridade;
  seletorOrdem.value = estado.ordem;
}

// No quadro a coluna já diz o status, então a etiqueta "Em andamento" fica de fora.
function etiquetas(tarefa, categoriasPorId, hoje, mostrarStatus = true) {
  const categoria = categoriasPorId.get(tarefa.categoriaId);
  const prazo = descreverPrazo(tarefa, hoje);
  const { feitas, total } = progressoSubtarefas(tarefa);

  return el('div', { classe: 'etiquetas' },
    mostrarStatus && tarefa.status === 'andamento' ? el('span', { classe: 'etiqueta andamento' }, 'Em andamento') : null,
    prazo ? el('span', { classe: `etiqueta prazo ${prazo.classe}`.trim(), html: icone(prazo.classe === 'atrasada' ? 'alerta' : 'calendario') }, prazo.texto) : null,
    el('span', { classe: `etiqueta prioridade prioridade-${tarefa.prioridade}`, html: icone('bandeira') }, NOMES_PRIORIDADE[tarefa.prioridade]),
    categoria ? el('span', { classe: 'etiqueta categoria' }, el('span', { classe: `ponto cor-${categoria.cor}` }), categoria.nome) : null,
    total ? el('button', {
      type: 'button',
      classe: feitas === total ? 'etiqueta progresso-sub completas' : 'etiqueta progresso-sub',
      'aria-expanded': String(expandidas.has(tarefa.id)),
      title: 'Mostrar subtarefas',
      html: icone('subtarefas'),
      onclick: () => alternarExpandida(tarefa.id),
    }, `${feitas}/${total}`) : null,
    tarefa.minutosFoco ? el('span', { classe: 'etiqueta foco', title: 'Tempo no modo foco', html: icone('cronometro') }, formatarMinutos(tarefa.minutosFoco)) : null);
}

function listaSubtarefas(tarefa) {
  return el('ul', { classe: 'subtarefas' }, tarefa.subtarefas.map((s) =>
    el('li', {},
      el('label', { classe: s.feita ? 'feita' : '' },
        el('input', { type: 'checkbox', classe: 'caixa pequena', checked: s.feita, onchange: () => alternarSubtarefa(tarefa.id, s.id) }),
        el('span', {}, s.texto)))));
}

function cartaoLista(tarefa, categoriasPorId, hoje) {
  const concluida = estaConcluida(tarefa);
  const classes = ['tarefa', `prioridade-${tarefa.prioridade}`];
  if (concluida) classes.push('concluida');
  if (novas.has(tarefa.id)) classes.push('entrando');

  return el('li', { classe: classes.join(' ') },
    el('input', {
      type: 'checkbox',
      classe: 'caixa',
      checked: concluida,
      'aria-label': `Concluir "${tarefa.titulo}"`,
      onchange: (e) => concluir(tarefa.id, e.target.closest('li')),
    }),
    el('div', { classe: 'corpo' },
      el('button', { type: 'button', classe: 'titulo-tarefa', onclick: () => abrirModalTarefa(tarefa) }, tarefa.titulo),
      tarefa.descricao ? el('p', { classe: 'descricao' }, tarefa.descricao) : null,
      etiquetas(tarefa, categoriasPorId, hoje),
      tarefa.subtarefas.length && expandidas.has(tarefa.id) ? listaSubtarefas(tarefa) : null),
    el('div', { classe: 'acoes' },
      concluida ? null : botaoIcone('cronometro', 'Modo foco', () => abrirFoco(tarefa), 'foco'),
      botaoIcone('lapis', 'Editar', () => abrirModalTarefa(tarefa)),
      botaoIcone('lixeira', 'Excluir', (e) => excluirTarefas([tarefa.id], [e.currentTarget.closest('li')]), 'perigo')));
}

function lista(tarefas, categoriasPorId, hoje) {
  if (tarefas.length === 0) return mensagemVazia(false);
  const cartoes = (grupo) => el('ul', { classe: 'lista' }, grupo.map((t) => cartaoLista(t, categoriasPorId, hoje)));
  if (estado.ordem !== 'prazo') return cartoes(tarefas);

  // Ordenada por prazo, a lista é separada em blocos: Atrasadas, Hoje, Amanhã...
  return el('div', { classe: 'grupos' }, PERIODOS.map((periodo) => {
    const doPeriodo = tarefas.filter((t) => periodoDaTarefa(t, hoje) === periodo.id);
    if (doPeriodo.length === 0) return null;
    return el('section', { classe: `grupo grupo-${periodo.id}` },
      el('header', { classe: 'cabecalho-grupo' },
        el('h2', {}, periodo.nome),
        el('span', { classe: 'contador' }, String(doPeriodo.length)),
        periodo.id === 'concluidas'
          ? el('button', {
            type: 'button',
            classe: 'botao-texto',
            onclick: (e) => excluirTarefas(doPeriodo.map((t) => t.id), [...e.currentTarget.closest('section').querySelectorAll('.tarefa')]),
          }, 'Limpar concluídas')
          : null),
      cartoes(doPeriodo));
  }));
}

function cartaoQuadro(tarefa, categoriasPorId, hoje) {
  const indice = STATUS.indexOf(tarefa.status);
  const anterior = STATUS[indice - 1];
  const proximo = STATUS[indice + 1];
  const classes = ['cartao-quadro', `prioridade-${tarefa.prioridade}`];
  if (estaConcluida(tarefa)) classes.push('concluida');
  if (novas.has(tarefa.id)) classes.push('entrando');

  return el('li', {
    classe: classes.join(' '),
    draggable: true,
    ondragstart: (e) => {
      e.dataTransfer.setData('text/plain', tarefa.id);
      e.dataTransfer.effectAllowed = 'move';
      e.currentTarget.classList.add('arrastando');
    },
    ondragend: (e) => e.currentTarget.classList.remove('arrastando'),
  },
    el('button', { type: 'button', classe: 'titulo-tarefa', onclick: () => abrirModalTarefa(tarefa) }, tarefa.titulo),
    etiquetas(tarefa, categoriasPorId, hoje, false),
    tarefa.subtarefas.length && expandidas.has(tarefa.id) ? listaSubtarefas(tarefa) : null,
    el('div', { classe: 'mover' },
      anterior ? botaoIcone('esquerda', `Mover para ${NOMES_STATUS[anterior]}`, () => mover(tarefa.id, anterior)) : el('span'),
      estaConcluida(tarefa) ? null : botaoIcone('cronometro', 'Modo foco', () => abrirFoco(tarefa), 'foco'),
      proximo ? botaoIcone('direita', `Mover para ${NOMES_STATUS[proximo]}`, () => mover(tarefa.id, proximo)) : el('span')));
}

function quadro(tarefas, categoriasPorId, hoje) {
  return el('div', { classe: 'quadro' }, STATUS.map((status) => {
    const daColuna = tarefas.filter((t) => t.status === status);
    return el('section', {
      classe: `coluna coluna-${status}`,
      ondragover: (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('soltar');
      },
      ondragleave: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('soltar');
      },
      ondrop: (e) => {
        e.preventDefault();
        mover(e.dataTransfer.getData('text/plain'), status);
      },
    },
      el('header', { classe: 'cabecalho-coluna' },
        el('span', { classe: `marca-coluna ${status}` }),
        el('h2', {}, NOMES_STATUS[status]),
        el('span', { classe: 'contador' }, String(daColuna.length))),
      daColuna.length
        ? el('ul', { classe: 'cartoes' }, daColuna.map((t) => cartaoQuadro(t, categoriasPorId, hoje)))
        : el('p', { classe: 'coluna-vazia' }, 'Arraste tarefas pra cá'));
  }));
}

// Clique seleciona o dia; dois cliques seguidos no mesmo dia criam uma tarefa nele.
// (Não dá pra usar dblclick: o primeiro clique redesenha o calendário.)
let ultimoClique = { dia: '', quando: 0 };

function clicarDia(dia) {
  const agora = Date.now();
  if (ultimoClique.dia === dia && agora - ultimoClique.quando < 450) abrirModalTarefa(null, { prazo: dia });
  else selecionarDia(dia);
  ultimoClique = { dia, quando: agora };
}

function celulaDia(dia, doDia, hoje) {
  const classes = ['dia'];
  if (dia.slice(0, 7) !== estado.mes) classes.push('fora');
  if (dia === hoje) classes.push('hoje');
  if (dia === estado.diaSelecionado) classes.push('selecionado');
  if (dia < hoje) classes.push('passado');

  return el('div', {
    classe: classes.join(' '),
    role: 'button',
    tabIndex: 0,
    'aria-label': `${descreverDia(dia, hoje)}: ${plural(doDia.length, 'tarefa', 'tarefas')}`,
    onclick: () => clicarDia(dia),
    onkeydown: (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      selecionarDia(dia);
    },
    ondragover: (e) => {
      e.preventDefault();
      e.currentTarget.classList.add('soltar');
    },
    ondragleave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('soltar');
    },
    ondrop: (e) => {
      e.preventDefault();
      remarcar(e.dataTransfer.getData('text/plain'), dia);
    },
  },
    el('span', { classe: 'numero-dia' }, String(Number(dia.slice(8)))),
    el('div', { classe: 'eventos' },
      doDia.slice(0, 3).map((t) => el('button', {
        type: 'button',
        classe: `evento prioridade-${t.prioridade}${estaConcluida(t) ? ' concluida' : ''}${novas.has(t.id) ? ' entrando' : ''}`,
        draggable: true,
        title: t.titulo,
        ondragstart: (e) => {
          e.dataTransfer.setData('text/plain', t.id);
          e.dataTransfer.effectAllowed = 'move';
        },
        onclick: (e) => {
          e.stopPropagation();
          abrirModalTarefa(t);
        },
      }, t.titulo)),
      doDia.length > 3 ? el('span', { classe: 'mais' }, `+${doDia.length - 3} mais`) : null),
    doDia.length
      ? el('span', { classe: 'pontos', 'aria-hidden': 'true' },
        doDia.slice(0, 4).map((t) => el('i', { classe: `ponto-prioridade ${t.prioridade}${estaConcluida(t) ? ' feito' : ''}` })))
      : null);
}

function calendario(tarefas, categoriasPorId, hoje) {
  const porDia = new Map();
  for (const t of tarefas) {
    if (!t.prazo) continue;
    if (!porDia.has(t.prazo)) porDia.set(t.prazo, []);
    porDia.get(t.prazo).push(t);
  }
  const semPrazo = tarefas.filter((t) => !t.prazo).length;
  const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(lerDataLocal(`${estado.mes}-01`));
  const doDia = porDia.get(estado.diaSelecionado) || [];

  return el('div', { classe: 'calendario' },
    el('section', { classe: 'painel-calendario' },
      el('header', { classe: 'cabecalho-calendario' },
        el('h2', {}, capitalizar(nomeMes)),
        el('div', { classe: 'navegar-mes' },
          botaoIcone('esquerda', 'Mês anterior', () => trocarMes(-1)),
          el('button', { type: 'button', classe: 'botao secundario pequeno', onclick: irParaHoje }, 'Hoje'),
          botaoIcone('direita', 'Próximo mês', () => trocarMes(1)))),
      el('div', { classe: 'grade-calendario' },
        ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => el('div', { classe: 'dia-semana' }, d)),
        montarMes(estado.mes).map((dia) => celulaDia(dia, porDia.get(dia) || [], hoje))),
      el('p', { classe: 'nota' },
        'Clique num dia pra ver as tarefas, clique duas vezes pra criar uma e arraste uma tarefa pra mudar o prazo.',
        semPrazo ? ` ${plural(semPrazo, 'tarefa sem prazo não aparece', 'tarefas sem prazo não aparecem')} aqui.` : '')),
    el('section', { classe: 'dia-detalhe' },
      el('header', { classe: 'cabecalho-grupo' },
        el('h2', {}, descreverDia(estado.diaSelecionado, hoje)),
        el('span', { classe: 'contador' }, String(doDia.length)),
        el('button', { type: 'button', classe: 'botao-texto', onclick: () => abrirModalTarefa(null, { prazo: estado.diaSelecionado }) }, '+ Adicionar neste dia')),
      doDia.length
        ? el('ul', { classe: 'lista' }, doDia.map((t) => cartaoLista(t, categoriasPorId, hoje)))
        : el('p', { classe: 'dia-vazio' }, 'Nenhuma tarefa neste dia.')));
}

function mensagemVazia(semNenhumaTarefa) {
  if (semNenhumaTarefa) {
    return el('div', { classe: 'vazio' },
      el('div', { classe: 'ilustracao', html: icone('subtarefas') }),
      el('h2', {}, 'Nenhuma tarefa ainda'),
      el('p', {}, 'Cadastre a primeira tarefa ou carregue alguns exemplos pra ver como o app funciona.'),
      el('div', { classe: 'botoes' },
        el('button', { type: 'button', classe: 'botao primario', onclick: () => abrirModalTarefa() }, 'Nova tarefa'),
        el('button', { type: 'button', classe: 'botao secundario', onclick: carregarExemplos }, 'Carregar exemplos')));
  }
  if (estado.busca || estado.status !== 'todas' || estado.prioridade !== 'todas') {
    return el('div', { classe: 'vazio' },
      el('h2', {}, 'Nada encontrado'),
      el('p', {}, 'Nenhuma tarefa combina com a busca e os filtros escolhidos.'),
      el('button', { type: 'button', classe: 'botao secundario', onclick: limparFiltros }, 'Limpar filtros'));
  }
  return el('div', { classe: 'vazio' },
    el('div', { classe: 'ilustracao verde', html: icone('check') }),
    el('h2', {}, VISOES[estado.visao]?.vazio || 'Nenhuma tarefa nesta categoria.'),
    el('p', {}, 'Use o campo de adição rápida acima pra criar uma.'));
}

// ---------- Ações ----------

function trocarVisao(visao) {
  estado.visao = visao;
  animarConteudo = true;
  salvarPreferencias();
  fecharMenu();
  renderizar();
}

function aplicarFiltroStatus(status) {
  estado.status = status;
  if (estado.modo === 'quadro') estado.modo = 'lista';
  animarConteudo = true;
  salvarPreferencias();
  renderizar();
}

function limparFiltros() {
  Object.assign(estado, { busca: '', status: 'todas', prioridade: 'todas' });
  campoBusca.value = '';
  renderizar();
}

function alternarExpandida(id) {
  if (expandidas.has(id)) expandidas.delete(id);
  else expandidas.add(id);
  renderizar();
}

function progressoDaVisao() {
  const hoje = hojeISO();
  return resumirTarefas(repositorio.tarefas().filter((t) => pertenceAVisao(t, estado.visao, hoje)), hoje);
}

// Quando a visão aberta fica sem nenhuma pendente, solta confete.
// (Conta pendentes e não %: em "Atrasadas" a tarefa concluída sai da visão.)
function comemorarSeCompletou(antes) {
  const depois = progressoDaVisao();
  if (antes.pendentes > 0 && depois.pendentes === 0) {
    soltarConfete();
    mostrarAviso('Tudo concluído por aqui! Mandou bem.');
    return true;
  }
  return false;
}

async function concluir(id, item) {
  const vaiConcluir = !estaConcluida(repositorio.tarefas().find((t) => t.id === id));
  if (vaiConcluir) await animarSaida(item, 'concluindo', 480);
  const antes = progressoDaVisao();
  repositorio.alternarConclusao(id);
  renderizar();
  if (vaiConcluir && !comemorarSeCompletou(antes)) mostrarAviso('Tarefa concluída.', () => repositorio.alternarConclusao(id));
}

function mover(id, status) {
  if (!id) return;
  const antes = progressoDaVisao();
  repositorio.moverPara(id, status);
  renderizar();
  if (status === 'concluida') comemorarSeCompletou(antes);
}

function remarcar(id, dia) {
  if (!id) return;
  repositorio.remarcar(id, dia);
  estado.diaSelecionado = dia;
  renderizar();
  mostrarAviso(`Prazo mudado para ${descreverDia(dia, hojeISO()).toLowerCase()}.`);
}

function alternarSubtarefa(id, subtarefaId) {
  repositorio.alternarSubtarefa(id, subtarefaId);
  renderizar();
}

async function excluirTarefas(ids, itens = []) {
  await Promise.all(itens.map((item) => animarSaida(item, 'saindo', 260)));
  const removidas = repositorio.excluir(ids);
  renderizar();
  const texto = removidas.length === 1 ? 'Tarefa excluída.' : `${removidas.length} tarefas excluídas.`;
  mostrarAviso(texto, () => {
    repositorio.restaurar(removidas);
    removidas.forEach((t) => novas.add(t.id));
  });
}

function excluirCategoria(categoria) {
  if (!confirm(`Excluir a categoria "${categoria.nome}"? As tarefas dela continuam, só ficam sem categoria.`)) return;
  repositorio.excluirCategoria(categoria.id);
  renderizar();
}

function selecionarDia(dia) {
  estado.diaSelecionado = dia;
  if (dia.slice(0, 7) !== estado.mes) {
    estado.mes = dia.slice(0, 7);
    animarConteudo = true;
  }
  renderizar();
}

function trocarMes(meses) {
  estado.mes = somarMeses(estado.mes, meses);
  animarConteudo = true;
  renderizar();
}

function irParaHoje() {
  const hoje = hojeISO();
  animarConteudo = estado.mes !== hoje.slice(0, 7);
  estado.mes = hoje.slice(0, 7);
  estado.diaSelecionado = hoje;
  renderizar();
}

// Ao criar tarefa dentro de uma visão, ela já nasce encaixada nela.
function padraoDaVisao() {
  const hoje = hojeISO();
  return {
    prazo: estado.visao === 'hoje' || estado.visao === 'semana' ? hoje : '',
    categoriaId: estado.visao.startsWith('categoria:') ? estado.visao.slice('categoria:'.length) : '',
  };
}

function carregarExemplos() {
  const hoje = hojeISO();
  const dia = (n) => somarDias(hoje, n);
  const exemplos = [
    {
      titulo: 'Entregar o relatório do Projeto A3',
      descricao: 'Juntar as partes do grupo e revisar antes de enviar.',
      prazo: dia(2), prioridade: 'alta', categoriaId: 'faculdade', status: 'andamento', foco: 50,
      subtarefas: [
        { texto: 'Escrever a introdução', feita: true },
        { texto: 'Diagrama de casos de uso', feita: true },
        { texto: 'Revisar com o grupo' },
        { texto: 'Gerar o PDF e enviar' },
      ],
    },
    {
      titulo: 'Estudar para a prova de Banco de Dados', prazo: dia(1), prioridade: 'alta', categoriaId: 'faculdade', foco: 25,
      subtarefas: [{ texto: 'Normalização' }, { texto: 'Consultas com JOIN' }, { texto: 'Lista de exercícios' }],
    },
    { titulo: 'Pagar a conta de luz', prazo: dia(-1), prioridade: 'alta', categoriaId: 'casa' },
    { titulo: 'Treino na academia', prazo: hoje, prioridade: 'baixa', categoriaId: 'pessoal' },
    { titulo: 'Reunião com o grupo do A3', prazo: hoje, prioridade: 'media', categoriaId: 'faculdade', status: 'concluida' },
    { titulo: 'Responder os e-mails da semana', prioridade: 'media', categoriaId: 'trabalho', status: 'andamento' },
    { titulo: 'Organizar o guarda-roupa', prazo: dia(5), prioridade: 'baixa', categoriaId: 'casa' },
    { titulo: 'Comprar presente de aniversário', prazo: dia(9), prioridade: 'media', categoriaId: 'pessoal' },
    { titulo: 'Atualizar o currículo', prazo: dia(-3), prioridade: 'media', categoriaId: 'trabalho', status: 'concluida' },
  ];
  const categorias = new Set(repositorio.categorias().map((c) => c.id));
  for (const { foco, ...dados } of exemplos) {
    const tarefa = repositorio.adicionar({ ...dados, categoriaId: categorias.has(dados.categoriaId) ? dados.categoriaId : '' });
    if (foco) repositorio.registrarFoco(tarefa.id, foco);
    novas.add(tarefa.id);
  }
  renderizar();
  mostrarAviso('Tarefas de exemplo carregadas.');
}

// ---------- Aviso com "Desfazer" ----------

let temporizadorAviso;

function esconderAviso() {
  aviso.classList.remove('visivel');
}

function mostrarAviso(texto, desfazer) {
  clearTimeout(temporizadorAviso);
  aviso.replaceChildren(el('span', {}, texto));
  if (desfazer) {
    aviso.append(el('button', {
      type: 'button',
      classe: 'botao-texto',
      onclick: () => {
        desfazer();
        esconderAviso();
        renderizar();
      },
    }, 'Desfazer'));
  }
  aviso.classList.add('visivel');
  temporizadorAviso = setTimeout(esconderAviso, 6000);
}

// ---------- Janela de tarefa (criar e editar) ----------

function mostrarErro(elemento, texto) {
  elemento.textContent = texto;
  elemento.hidden = !texto;
}

function renderizarRascunho() {
  listaRascunho.replaceChildren(...rascunhoSubtarefas.map((s, indice) =>
    el('li', {},
      el('input', { type: 'checkbox', classe: 'caixa pequena', checked: s.feita, 'aria-label': 'Feita', onchange: (e) => { s.feita = e.target.checked; renderizarRascunho(); } }),
      el('input', { type: 'text', value: s.texto, maxLength: 120, 'aria-label': `Subtarefa ${indice + 1}`, oninput: (e) => { s.texto = e.target.value; } }),
      botaoIcone('fechar', 'Remover subtarefa', () => { rascunhoSubtarefas.splice(indice, 1); renderizarRascunho(); }))));
  const feitas = rascunhoSubtarefas.filter((s) => s.feita).length;
  progressoRascunho.textContent = rascunhoSubtarefas.length ? `${feitas}/${rascunhoSubtarefas.length}` : '';
}

function adicionarAoRascunho() {
  const texto = campoSubtarefa.value.trim();
  if (!texto) return;
  rascunhoSubtarefas.push({ texto, feita: false });
  campoSubtarefa.value = '';
  renderizarRascunho();
  campoSubtarefa.focus();
}

function abrirModalTarefa(tarefa = null, padrao = {}) {
  idEmEdicao = tarefa ? tarefa.id : null;
  const base = tarefa || { titulo: '', descricao: '', prioridade: 'media', status: 'a_fazer', subtarefas: [], ...padraoDaVisao(), ...padrao };

  campoCategoria.replaceChildren(
    el('option', { value: '' }, 'Sem categoria'),
    ...repositorio.categorias().map((c) => el('option', { value: c.id }, c.nome)));

  tituloModalTarefa.textContent = tarefa ? 'Editar tarefa' : 'Nova tarefa';
  campoTitulo.value = base.titulo;
  campoDescricao.value = base.descricao;
  campoPrazo.value = base.prazo;
  formTarefa.elements.prioridade.value = base.prioridade;
  campoCategoria.value = base.categoriaId;
  campoStatus.value = base.status;
  rascunhoSubtarefas = base.subtarefas.map((s) => ({ ...s }));
  campoSubtarefa.value = '';
  renderizarRascunho();
  botaoExcluirModal.hidden = !tarefa;
  mostrarErro(erroTarefa, '');

  fecharMenu();
  modalTarefa.showModal();
  campoTitulo.focus();
}

formTarefa.addEventListener('submit', (e) => {
  e.preventDefault();
  if (campoSubtarefa.value.trim()) adicionarAoRascunho(); // subtarefa digitada e não adicionada ainda
  const dados = {
    titulo: campoTitulo.value,
    descricao: campoDescricao.value,
    prazo: campoPrazo.value,
    prioridade: formTarefa.elements.prioridade.value,
    categoriaId: campoCategoria.value,
    status: campoStatus.value,
    subtarefas: rascunhoSubtarefas,
  };
  const editando = Boolean(idEmEdicao);
  let tarefa;
  try {
    tarefa = editando ? repositorio.editar(idEmEdicao, dados) : repositorio.adicionar(dados);
  } catch (erro) {
    mostrarErro(erroTarefa, erro.message);
    return;
  }
  if (!editando) novas.add(tarefa.id);
  if (tarefa.prazo) {
    estado.diaSelecionado = tarefa.prazo;
    estado.mes = tarefa.prazo.slice(0, 7);
  }
  modalTarefa.close();
  renderizar();
  mostrarAviso(editando ? 'Alterações salvas.' : 'Tarefa criada.');
});

$('atalhos-prazo').addEventListener('click', (e) => {
  const botao = e.target.closest('button');
  if (!botao) return;
  campoPrazo.value = botao.dataset.dias === '' ? '' : somarDias(hojeISO(), Number(botao.dataset.dias));
});

campoSubtarefa.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  adicionarAoRascunho();
});
$('botao-subtarefa').addEventListener('click', adicionarAoRascunho);

botaoExcluirModal.addEventListener('click', () => {
  const id = idEmEdicao;
  modalTarefa.close();
  excluirTarefas([id]);
});

// ---------- Janela de categoria ----------

opcoesCor.replaceChildren(...CORES.map((cor, indice) =>
  el('label', { classe: 'opcao-cor', title: NOMES_COR[cor] },
    el('input', { type: 'radio', name: 'cor', value: cor, defaultChecked: indice === 0, 'aria-label': NOMES_COR[cor] }),
    el('span', { classe: `amostra cor-${cor}` }))));

function abrirModalCategoria() {
  formCategoria.reset();
  mostrarErro(erroCategoria, '');
  modalCategoria.showModal();
  campoNomeCategoria.focus();
}

formCategoria.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    const categoria = repositorio.adicionarCategoria({ nome: campoNomeCategoria.value, cor: formCategoria.elements.cor.value });
    modalCategoria.close();
    trocarVisao(`categoria:${categoria.id}`);
    mostrarAviso(`Categoria "${categoria.nome}" criada.`);
  } catch (erro) {
    mostrarErro(erroCategoria, erro.message);
  }
});

// As janelas fecham pelo X, pelo Cancelar, pelo Esc ou clicando fora.
for (const modal of [modalTarefa, modalCategoria, $('modal-fundo')]) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-fechar]')) modal.close();
  });
}

// ---------- Modo foco (Pomodoro) ----------

const CIRCUNFERENCIA_FOCO = 2 * Math.PI * 108;
const foco = {
  tarefaId: null,
  minutos: 25,
  restante: 25 * 60, // segundos
  fim: 0,
  rodando: false,
  intervalo: null,
  contabilizado: 0, // segundos desta rodada já somados na tarefa
};

function textoTempo(segundos) {
  return `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
}

function atualizarTotalFoco() {
  const tarefa = repositorio.tarefas().find((t) => t.id === foco.tarefaId);
  const minutos = tarefa ? tarefa.minutosFoco || 0 : 0;
  focoTotal.textContent = minutos ? `Tempo de foco nesta tarefa: ${formatarMinutos(minutos)}` : 'Primeira sessão de foco nesta tarefa';
}

function atualizarFoco() {
  const texto = textoTempo(foco.restante);
  focoTempo.textContent = texto;
  focoArco.style.strokeDashoffset = String(CIRCUNFERENCIA_FOCO * (1 - foco.restante / (foco.minutos * 60)));
  focoIniciar.innerHTML = icone(foco.rodando ? 'pausa' : 'play');
  focoIniciar.setAttribute('aria-label', foco.rodando ? 'Pausar' : 'Iniciar');
  focoIniciar.title = foco.rodando ? 'Pausar (espaço)' : 'Iniciar (espaço)';
  focoDuracoes.querySelectorAll('button').forEach((b) => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.minutos) === foco.minutos));
    b.disabled = foco.rodando;
  });
  modalFoco.classList.toggle('rodando', foco.rodando);
  if (foco.rodando) document.title = `${texto} · Foco · Só Processo`;
}

// Soma na tarefa os minutos inteiros que ainda não foram somados.
function registrarTempoFoco() {
  const segundos = foco.minutos * 60 - foco.restante - foco.contabilizado;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 1) return;
  repositorio.registrarFoco(foco.tarefaId, minutos);
  foco.contabilizado += minutos * 60;
  atualizarTotalFoco();
}

function pararRelogio() {
  clearInterval(foco.intervalo);
  if (foco.rodando) foco.restante = Math.max(0, Math.ceil((foco.fim - Date.now()) / 1000));
  foco.rodando = false;
}

function definirDuracao(minutos) {
  pararRelogio();
  registrarTempoFoco();
  Object.assign(foco, { minutos, restante: minutos * 60, contabilizado: 0 });
  modalFoco.classList.remove('terminou');
  focoEstado.textContent = 'Pronto pra começar';
  atualizarFoco();
}

function iniciarFoco() {
  if (foco.restante <= 0) definirDuracao(foco.minutos);
  foco.fim = Date.now() + foco.restante * 1000;
  foco.rodando = true;
  foco.intervalo = setInterval(passoFoco, 250);
  focoEstado.textContent = 'Concentrado…';
  atualizarFoco();
}

function pausarFoco() {
  pararRelogio();
  registrarTempoFoco();
  focoEstado.textContent = 'Pausado';
  atualizarFoco();
}

function passoFoco() {
  foco.restante = Math.max(0, Math.ceil((foco.fim - Date.now()) / 1000));
  atualizarFoco();
  if (foco.restante === 0) terminarFoco();
}

function terminarFoco() {
  pararRelogio();
  registrarTempoFoco();
  modalFoco.classList.add('terminou');
  focoEstado.textContent = 'Foco concluído! Faça uma pausa.';
  document.title = 'Foco concluído · Só Processo';
  atualizarFoco();
  tocarSino();
  soltarConfete(innerWidth / 2, innerHeight / 2, modalFoco);
}

function abrirFoco(tarefa) {
  definirDuracao(foco.minutos); // fecha as contas da tarefa anterior antes de trocar
  foco.tarefaId = tarefa.id;
  focoTitulo.textContent = tarefa.titulo;
  atualizarTotalFoco();
  modalFoco.showModal();
  focoIniciar.focus();
}

focoIniciar.addEventListener('click', () => (foco.rodando ? pausarFoco() : iniciarFoco()));
$('foco-reiniciar').addEventListener('click', () => definirDuracao(foco.minutos));
$('foco-fechar').addEventListener('click', () => modalFoco.close());
focoDuracoes.addEventListener('click', (e) => {
  const botao = e.target.closest('button');
  if (botao) definirDuracao(Number(botao.dataset.minutos));
});

$('foco-concluir').addEventListener('click', () => {
  pararRelogio();
  registrarTempoFoco();
  const antes = progressoDaVisao();
  const tarefa = repositorio.tarefas().find((t) => t.id === foco.tarefaId);
  if (tarefa && !estaConcluida(tarefa)) repositorio.moverPara(tarefa.id, 'concluida');
  modalFoco.close();
  if (!comemorarSeCompletou(antes)) {
    soltarConfete();
    mostrarAviso('Tarefa concluída. Bom foco!');
  }
});

// Espaço inicia/pausa (fora dos botões, que já respondem ao espaço sozinhos).
modalFoco.addEventListener('keydown', (e) => {
  if (e.key !== ' ' || e.target.closest('button')) return;
  e.preventDefault();
  focoIniciar.click();
});

// Fechou a janela (X, Esc ou concluir): para o relógio e guarda o tempo.
modalFoco.addEventListener('close', () => {
  pararRelogio();
  registrarTempoFoco();
  renderizar();
});

// ---------- Fundo personalizado ----------

const CHAVE_FUNDO = 'so-processo:fundo';
const FUNDOS = [
  { id: 'aurora', nome: 'Aurora', css: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)' },
  { id: 'oceano', nome: 'Oceano', css: 'linear-gradient(135deg, #0ea5e9 0%, #22d3ee 50%, #34d399 100%)' },
  { id: 'por-do-sol', nome: 'Pôr do sol', css: 'linear-gradient(135deg, #f97316 0%, #f43f5e 50%, #a855f7 100%)' },
  { id: 'floresta', nome: 'Floresta', css: 'linear-gradient(135deg, #065f46 0%, #10b981 55%, #a3e635 100%)' },
  { id: 'noite', nome: 'Noite', css: 'linear-gradient(135deg, #0f172a 0%, #312e81 55%, #581c87 100%)' },
  { id: 'pastel', nome: 'Pastel', css: 'linear-gradient(135deg, #fde68a 0%, #fbcfe8 50%, #bfdbfe 100%)' },
  { id: 'grafite', nome: 'Grafite', css: 'linear-gradient(135deg, #111827 0%, #374151 60%, #6b7280 100%)' },
  {
    id: 'malha',
    nome: 'Malha',
    css: 'radial-gradient(at 15% 20%, #a78bfa 0, transparent 50%), radial-gradient(at 85% 5%, #f472b6 0, transparent 50%), '
      + 'radial-gradient(at 85% 85%, #60a5fa 0, transparent 50%), radial-gradient(at 5% 95%, #34d399 0, transparent 50%), #eef2ff',
  },
];
const FUNDO_PADRAO = { tipo: '', valor: '', intensidade: 40 };

const papelDeParede = $('papel-de-parede');
const modalFundo = $('modal-fundo');
const galeriaFundos = $('galeria-fundos');
const campoCorFundo = $('campo-cor-fundo');
const campoImagemFundo = $('campo-imagem-fundo');
const campoIntensidade = $('campo-intensidade');
const erroFundo = $('erro-fundo');

function lerFundo() {
  try {
    return { ...FUNDO_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE_FUNDO)) };
  } catch {
    return { ...FUNDO_PADRAO };
  }
}

let fundo = lerFundo();

function salvarFundo() {
  try {
    localStorage.setItem(CHAVE_FUNDO, JSON.stringify(fundo));
    return true;
  } catch {
    return false; // sem espaço (imagem grande demais) ou armazenamento bloqueado
  }
}

function cssDoFundo({ tipo, valor }) {
  if (tipo === 'pronto') return FUNDOS.find((f) => f.id === valor)?.css || '';
  if (tipo === 'cor' && /^#[0-9a-f]{6}$/i.test(valor)) return valor;
  // A imagem é sempre um data URL gerado pelo próprio app (canvas), sem aspas dentro.
  if (tipo === 'imagem' && valor.startsWith('data:image/')) return `center / cover no-repeat url("${valor}")`;
  return '';
}

function aplicarFundo() {
  const css = cssDoFundo(fundo);
  papelDeParede.style.background = css;
  papelDeParede.style.setProperty('--veu', String(1 - fundo.intensidade / 100));
  document.body.classList.toggle('com-fundo', Boolean(css));
}

function renderizarGaleriaFundos() {
  const opcao = (tipo, valor, nome, css) => el('button', {
    type: 'button',
    classe: 'opcao-fundo',
    'aria-pressed': String(fundo.tipo === tipo && fundo.valor === valor),
    onclick: () => escolherFundo({ tipo, valor }),
  },
    el('span', { classe: 'amostra-fundo', style: `background: ${css}` }),
    el('span', { classe: 'nome-fundo' }, nome));

  const opcoes = [opcao('', '', 'Padrão', 'var(--fundo)'), ...FUNDOS.map((f) => opcao('pronto', f.id, f.nome, f.css))];
  if (fundo.tipo === 'cor') opcoes.push(opcao('cor', fundo.valor, 'Sua cor', fundo.valor));
  if (fundo.tipo === 'imagem') opcoes.push(opcao('imagem', fundo.valor, 'Sua imagem', cssDoFundo(fundo)));
  galeriaFundos.replaceChildren(...opcoes);

  campoIntensidade.value = fundo.intensidade;
  $('valor-intensidade').textContent = `${fundo.intensidade}%`;
}

function escolherFundo(novo) {
  const anterior = fundo;
  fundo = { ...fundo, ...novo };
  if (!salvarFundo()) {
    fundo = anterior;
    mostrarErro(erroFundo, 'Essa imagem não coube no armazenamento do navegador. Tente uma imagem menor.');
    return false;
  }
  mostrarErro(erroFundo, '');
  aplicarFundo();
  renderizarGaleriaFundos();
  return true;
}

// Reduz a imagem (lado maior até `lado` px, em JPEG) pra caber no armazenamento do navegador.
async function reduzirImagem(arquivo, lado, qualidade) {
  const endereco = URL.createObjectURL(arquivo);
  try {
    const imagem = await new Promise((pronto, falhou) => {
      const img = new Image();
      img.onload = () => pronto(img);
      img.onerror = () => falhou(new Error('Não deu pra abrir essa imagem.'));
      img.src = endereco;
    });
    const escala = Math.min(1, lado / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    const tela = document.createElement('canvas');
    tela.width = Math.round(imagem.naturalWidth * escala);
    tela.height = Math.round(imagem.naturalHeight * escala);
    tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
    return tela.toDataURL('image/jpeg', qualidade);
  } finally {
    URL.revokeObjectURL(endereco);
  }
}

campoImagemFundo.addEventListener('change', async () => {
  const [arquivo] = campoImagemFundo.files;
  campoImagemFundo.value = '';
  if (!arquivo) return;
  if (!arquivo.type.startsWith('image/')) {
    mostrarErro(erroFundo, 'Escolha um arquivo de imagem (JPG, PNG, WEBP…).');
    return;
  }
  try {
    // Se não couber em boa qualidade, tenta de novo menor.
    if (!escolherFundo({ tipo: 'imagem', valor: await reduzirImagem(arquivo, 1920, 0.82) })) {
      escolherFundo({ tipo: 'imagem', valor: await reduzirImagem(arquivo, 1280, 0.68) });
    }
  } catch (erro) {
    mostrarErro(erroFundo, erro.message);
  }
});

campoCorFundo.addEventListener('input', () => escolherFundo({ tipo: 'cor', valor: campoCorFundo.value }));

campoIntensidade.addEventListener('input', () => {
  fundo.intensidade = Number(campoIntensidade.value);
  $('valor-intensidade').textContent = `${fundo.intensidade}%`;
  aplicarFundo();
});
campoIntensidade.addEventListener('change', salvarFundo);

$('botao-remover-fundo').addEventListener('click', () => escolherFundo({ ...FUNDO_PADRAO }));

$('botao-fundo').addEventListener('click', () => {
  fecharMenu();
  mostrarErro(erroFundo, '');
  renderizarGaleriaFundos();
  modalFundo.showModal();
});

// ---------- Menu lateral, tema e backup ----------

function abrirMenu() {
  lateral.classList.add('aberta');
  fundoMenu.hidden = false;
}

function fecharMenu() {
  lateral.classList.remove('aberta');
  fundoMenu.hidden = true;
}

function aplicarTema() {
  if (estado.tema) document.documentElement.dataset.tema = estado.tema;
  else delete document.documentElement.dataset.tema;
}

botaoTema.addEventListener('click', () => {
  const atual = TEMAS.findIndex((t) => t.id === estado.tema);
  estado.tema = TEMAS[(atual + 1) % TEMAS.length].id;
  salvarPreferencias();
  aplicarTema();
  renderizar();
});

$('botao-exportar').addEventListener('click', () => {
  const arquivo = new Blob([repositorio.exportar()], { type: 'application/json' });
  const link = el('a', { href: URL.createObjectURL(arquivo), download: `so-processo-backup-${hojeISO()}.json` });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  mostrarAviso('Backup exportado.');
});

$('botao-importar').addEventListener('click', () => arquivoImportar.click());

arquivoImportar.addEventListener('change', async () => {
  const [arquivo] = arquivoImportar.files;
  arquivoImportar.value = '';
  if (!arquivo || !confirm('Importar este backup? As tarefas e categorias atuais serão substituídas.')) return;
  try {
    repositorio.importar(await arquivo.text());
    fecharMenu();
    renderizar();
    mostrarAviso('Backup importado.');
  } catch (erro) {
    alert(erro.message);
  }
});

// ---------- Eventos fixos ----------

$('botao-nova').addEventListener('click', () => abrirModalTarefa());
$('fab').addEventListener('click', () => abrirModalTarefa());
$('botao-nova-categoria').addEventListener('click', abrirModalCategoria);
$('botao-menu').addEventListener('click', abrirMenu);
fundoMenu.addEventListener('click', fecharMenu);

formRapido.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!campoRapido.value.trim()) return;
  const padrao = padraoDaVisao();
  const dados = interpretarAdicaoRapida(campoRapido.value, repositorio.categorias(), hojeISO());
  let tarefa;
  try {
    tarefa = repositorio.adicionar({ ...dados, prazo: dados.prazo || padrao.prazo, categoriaId: dados.categoriaId || padrao.categoriaId });
  } catch (erro) {
    mostrarAviso(erro.message);
    return;
  }
  novas.add(tarefa.id);
  campoRapido.value = '';
  renderizar();
});

campoBusca.addEventListener('input', () => {
  estado.busca = campoBusca.value;
  renderizar();
});

filtroStatus.addEventListener('click', (e) => {
  const botao = e.target.closest('button');
  if (botao) aplicarFiltroStatus(botao.dataset.status);
});

filtroPrioridade.addEventListener('change', () => {
  estado.prioridade = filtroPrioridade.value;
  animarConteudo = true;
  renderizar();
});

seletorOrdem.addEventListener('change', () => {
  estado.ordem = seletorOrdem.value;
  animarConteudo = true;
  salvarPreferencias();
  renderizar();
});

seletorModo.addEventListener('click', (e) => {
  const botao = e.target.closest('button');
  if (!botao || botao.dataset.modo === estado.modo) return;
  estado.modo = botao.dataset.modo;
  animarConteudo = true;
  salvarPreferencias();
  renderizar();
});

// Atalhos: N = nova tarefa, / = buscar (fora de campos de texto e com nenhuma janela aberta).
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest('input, textarea, select') || document.querySelector('dialog[open]')) return;
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    abrirModalTarefa();
  } else if (e.key === '/') {
    e.preventDefault();
    campoBusca.focus();
  }
});

// ---------- Início ----------

document.querySelectorAll('[data-icone]').forEach((elemento) => {
  elemento.insertAdjacentHTML('afterbegin', icone(elemento.dataset.icone));
});

montarResumo();
aplicarTema();
aplicarFundo();
renderizar();
