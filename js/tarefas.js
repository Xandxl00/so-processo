// Regras de negócio do Só Processo: tarefas, subtarefas, categorias, filtros,
// ordenação, resumo, adição rápida e armazenamento. Não mexe na tela, por isso
// roda também no Node (ver testes/tarefas.test.js).

const PRIORIDADES = ['baixa', 'media', 'alta'];
const STATUS = ['a_fazer', 'andamento', 'concluida'];
const CORES = ['azul', 'roxo', 'verde', 'laranja', 'rosa', 'ciano', 'amarelo', 'cinza'];
const PESO_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };
const CHAVE_ARMAZENAMENTO = 'so-processo:dados';
const CHAVE_VERSAO_1 = 'so-processo:tarefas';
const SEM_PRAZO = '9999-12-31';

const CATEGORIAS_PADRAO = [
  { id: 'faculdade', nome: 'Faculdade', cor: 'azul' },
  { id: 'trabalho', nome: 'Trabalho', cor: 'roxo' },
  { id: 'pessoal', nome: 'Pessoal', cor: 'verde' },
  { id: 'casa', nome: 'Casa', cor: 'laranja' },
];

// Blocos da lista quando ela está ordenada por prazo, na ordem em que aparecem.
const PERIODOS = [
  { id: 'atrasadas', nome: 'Atrasadas' },
  { id: 'hoje', nome: 'Hoje' },
  { id: 'amanha', nome: 'Amanhã' },
  { id: 'semana', nome: 'Próximos 7 dias' },
  { id: 'depois', nome: 'Mais adiante' },
  { id: 'sem_prazo', nome: 'Sem prazo' },
  { id: 'concluidas', nome: 'Concluídas' },
];

// ---------- Datas (sempre no formato AAAA-MM-DD, no fuso do usuário) ----------

function hojeISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function lerData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return { ano, mes, dia };
}

function somarDias(iso, dias) {
  const { ano, mes, dia } = lerData(iso);
  return hojeISO(new Date(ano, mes - 1, dia + dias));
}

function diasEntre(de, ate) {
  const a = lerData(de);
  const b = lerData(ate);
  return Math.round((Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86400000);
}

// "2026-10" + 1 mês = "2026-11"; aceita negativo.
function somarMeses(anoMes, meses) {
  const [ano, mes] = anoMes.split('-').map(Number);
  return hojeISO(new Date(ano, mes - 1 + meses, 1)).slice(0, 7);
}

// Os 42 dias (6 semanas, começando na segunda) que aparecem no calendário do mês.
function montarMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const recuo = (new Date(ano, mes - 1, 1).getDay() + 6) % 7; // segunda = 0
  const inicio = hojeISO(new Date(ano, mes - 1, 1 - recuo));
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
}

// Próxima ocorrência de dia/mês a partir de hoje (25/12 em novembro = este ano; em janeiro = já passou, ano que vem).
function proximaData(dia, mes, hoje) {
  const anoAtual = lerData(hoje).ano;
  for (const ano of [anoAtual, anoAtual + 1]) {
    const data = new Date(ano, mes - 1, dia);
    if (data.getMonth() !== mes - 1 || data.getDate() !== dia) return '';
    const iso = hojeISO(data);
    if (iso >= hoje) return iso;
  }
  return '';
}

// ---------- Texto ----------

// Minúsculas e sem acento, pra busca e comparação ("Saúde" == "saude").
function normalizar(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function criarSlug(texto) {
  return normalizar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Validação ----------

function validarSubtarefas(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .map((s) => ({ id: s.id || gerarId(), texto: String(s.texto || '').trim(), feita: Boolean(s.feita) }))
    .filter((s) => s.texto)
    .slice(0, 30);
}

function validarTarefa(dados, categorias = []) {
  const titulo = String(dados.titulo || '').trim();
  if (!titulo) throw new Error('Informe o título da tarefa.');
  if (titulo.length > 100) throw new Error('O título pode ter no máximo 100 caracteres.');

  const prioridade = dados.prioridade || 'media';
  if (!PRIORIDADES.includes(prioridade)) throw new Error('Prioridade inválida.');

  const status = dados.status || 'a_fazer';
  if (!STATUS.includes(status)) throw new Error('Status inválido.');

  const prazo = dados.prazo || '';
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) throw new Error('Data de prazo inválida.');

  const categoriaId = dados.categoriaId || '';
  if (categoriaId && !categorias.some((c) => c.id === categoriaId)) throw new Error('Categoria inválida.');

  return {
    titulo,
    descricao: String(dados.descricao || '').trim().slice(0, 500),
    prazo,
    prioridade,
    status,
    categoriaId,
    subtarefas: validarSubtarefas(dados.subtarefas),
  };
}

function validarCategoria(dados, existentes = []) {
  const nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Informe o nome da categoria.');
  if (nome.length > 30) throw new Error('O nome da categoria pode ter no máximo 30 caracteres.');
  if (existentes.some((c) => normalizar(c.nome) === normalizar(nome))) {
    throw new Error('Já existe uma categoria com esse nome.');
  }
  return { nome, cor: CORES.includes(dados.cor) ? dados.cor : CORES[0] };
}

// ---------- Consultas ----------

function estaConcluida(tarefa) {
  return tarefa.status === 'concluida';
}

function estaAtrasada(tarefa, hoje = hojeISO()) {
  return !estaConcluida(tarefa) && Boolean(tarefa.prazo) && tarefa.prazo < hoje;
}

function progressoSubtarefas(tarefa) {
  const total = tarefa.subtarefas.length;
  const feitas = tarefa.subtarefas.filter((s) => s.feita).length;
  return { feitas, total };
}

function periodoDaTarefa(tarefa, hoje) {
  if (estaConcluida(tarefa)) return 'concluidas';
  if (!tarefa.prazo) return 'sem_prazo';
  const dias = diasEntre(hoje, tarefa.prazo);
  if (dias < 0) return 'atrasadas';
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanha';
  if (dias <= 7) return 'semana';
  return 'depois';
}

// Visões da barra lateral: hoje, semana, atrasadas, todas ou "categoria:<id>".
function pertenceAVisao(tarefa, visao, hoje) {
  if (visao.startsWith('categoria:')) return tarefa.categoriaId === visao.slice('categoria:'.length);
  if (visao === 'hoje') return tarefa.prazo === hoje || estaAtrasada(tarefa, hoje);
  if (visao === 'semana') {
    if (!tarefa.prazo) return false;
    return estaAtrasada(tarefa, hoje) || (tarefa.prazo >= hoje && diasEntre(hoje, tarefa.prazo) <= 7);
  }
  if (visao === 'atrasadas') return estaAtrasada(tarefa, hoje);
  return true;
}

const FILTROS_STATUS = {
  todas: () => true,
  pendentes: (t) => !estaConcluida(t),
  andamento: (t) => t.status === 'andamento',
  concluidas: estaConcluida,
};

function compararTexto(a, b) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

const compararPrazo = (a, b) => compararTexto(a.prazo || SEM_PRAZO, b.prazo || SEM_PRAZO);
const compararPrioridade = (a, b) => PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade];

const ORDENACOES = {
  prazo: (a, b) => compararPrazo(a, b) || compararPrioridade(a, b),
  prioridade: (a, b) => compararPrioridade(a, b) || compararPrazo(a, b),
  recentes: (a, b) => compararTexto(b.criadaEm, a.criadaEm),
  titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'),
};

// Concluídas sempre vão pro fim; o resto segue a ordenação escolhida.
function ordenarTarefas(lista, ordem = 'prazo') {
  const comparar = ORDENACOES[ordem] || ORDENACOES.prazo;
  return [...lista].sort((a, b) => estaConcluida(a) - estaConcluida(b) || comparar(a, b));
}

function consultarTarefas(lista, opcoes = {}, hoje = hojeISO()) {
  const { visao = 'todas', status = 'todas', prioridade = 'todas', busca = '', ordem = 'prazo' } = opcoes;
  const termo = normalizar(busca);
  const atendeStatus = FILTROS_STATUS[status] || FILTROS_STATUS.todas;
  const filtradas = lista.filter((t) => {
    if (!pertenceAVisao(t, visao, hoje) || !atendeStatus(t)) return false;
    if (prioridade !== 'todas' && t.prioridade !== prioridade) return false;
    if (!termo) return true;
    const textos = [t.titulo, t.descricao, ...t.subtarefas.map((s) => s.texto)].join(' ');
    return normalizar(textos).includes(termo);
  });
  return ordenarTarefas(filtradas, ordem);
}

function resumirTarefas(lista, hoje = hojeISO()) {
  const total = lista.length;
  const concluidas = lista.filter(estaConcluida).length;
  return {
    total,
    concluidas,
    pendentes: total - concluidas,
    andamento: lista.filter((t) => t.status === 'andamento').length,
    atrasadas: lista.filter((t) => estaAtrasada(t, hoje)).length,
    percentual: total ? Math.round((concluidas / total) * 100) : 0,
  };
}

// Quantas tarefas pendentes tem em cada visão da barra lateral.
function contarPendentesPorVisao(tarefas, categorias, hoje = hojeISO()) {
  const pendentes = tarefas.filter((t) => !estaConcluida(t));
  const visoes = ['hoje', 'semana', 'atrasadas', 'todas', ...categorias.map((c) => `categoria:${c.id}`)];
  const contagem = {};
  for (const visao of visoes) contagem[visao] = pendentes.filter((t) => pertenceAVisao(t, visao, hoje)).length;
  return contagem;
}

// ---------- Adição rápida ----------

// "Estudar SQL @amanhã !alta #faculdade" vira título + prazo + prioridade + categoria.
// Palavra que não for comando (ou data/categoria que não existe) fica no título.
function interpretarAdicaoRapida(texto, categorias = [], hoje = hojeISO()) {
  const resultado = { titulo: '', prazo: '', prioridade: 'media', categoriaId: '' };
  const palavras = [];
  for (const palavra of String(texto).trim().split(/\s+/)) {
    const chave = normalizar(palavra);
    const data = chave.match(/^@(\d{1,2})\/(\d{1,2})$/);
    const categoria = chave.startsWith('#') && categorias.find((c) => c.id === chave.slice(1) || normalizar(c.nome) === chave.slice(1));

    if (/^!(alta|media|baixa)$/.test(chave)) resultado.prioridade = chave.slice(1);
    else if (chave === '@hoje') resultado.prazo = hoje;
    else if (chave === '@amanha') resultado.prazo = somarDias(hoje, 1);
    else if (data && proximaData(Number(data[1]), Number(data[2]), hoje)) resultado.prazo = proximaData(Number(data[1]), Number(data[2]), hoje);
    else if (categoria) resultado.categoriaId = categoria.id;
    else palavras.push(palavra);
  }
  resultado.titulo = palavras.join(' ');
  return resultado;
}

// ---------- Backup ----------

function lerBackup(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não é um backup válido.');
  }
  if (!dados || !Array.isArray(dados.tarefas) || !Array.isArray(dados.categorias)) {
    throw new Error('O arquivo não é um backup do Só Processo.');
  }

  const categorias = [];
  for (const c of dados.categorias) {
    categorias.push({ id: String(c.id || criarSlug(c.nome)), ...validarCategoria(c, categorias) });
  }

  const tarefas = dados.tarefas.map((t, indice) => {
    try {
      const campos = validarTarefa(t, categorias);
      return {
        id: String(t.id || gerarId()),
        ...campos,
        criadaEm: t.criadaEm || new Date().toISOString(),
        concluidaEm: campos.status === 'concluida' ? t.concluidaEm || new Date().toISOString() : null,
        minutosFoco: Math.max(0, Math.round(Number(t.minutosFoco) || 0)),
      };
    } catch (erro) {
      throw new Error(`Tarefa ${indice + 1} do arquivo: ${erro.message}`);
    }
  });

  return { categorias, tarefas };
}

// ---------- Armazenamento ----------

// `armazenamento` é qualquer objeto com getItem/setItem (no navegador, o localStorage).
function criarRepositorio(armazenamento) {
  function carregar() {
    try {
      const dados = JSON.parse(armazenamento.getItem(CHAVE_ARMAZENAMENTO));
      if (dados && Array.isArray(dados.tarefas) && Array.isArray(dados.categorias)) return dados;
    } catch {
      // dado corrompido: recomeça abaixo
    }
    return { tarefas: lerVersao1(), categorias: CATEGORIAS_PADRAO.map((c) => ({ ...c })) };
  }

  // A versão 1 do app guardava só uma lista de tarefas com `concluida: true/false`.
  function lerVersao1() {
    try {
      const antigas = JSON.parse(armazenamento.getItem(CHAVE_VERSAO_1)) || [];
      return antigas.map(({ concluida, ...tarefa }) => ({
        ...tarefa,
        status: concluida ? 'concluida' : 'a_fazer',
        categoriaId: '',
        subtarefas: [],
        concluidaEm: concluida ? tarefa.criadaEm : null,
      }));
    } catch {
      return [];
    }
  }

  function gravar(dados) {
    armazenamento.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
  }

  // Carrega, aplica a mudança e grava. Se a mudança der erro, nada é gravado.
  function alterar(mudanca) {
    const dados = carregar();
    const resultado = mudanca(dados);
    gravar(dados);
    return resultado;
  }

  function buscar(dados, id) {
    const tarefa = dados.tarefas.find((t) => t.id === id);
    if (!tarefa) throw new Error('Tarefa não encontrada.');
    return tarefa;
  }

  function definirStatus(tarefa, status) {
    if (tarefa.status === status) return;
    tarefa.status = status;
    tarefa.concluidaEm = status === 'concluida' ? new Date().toISOString() : null;
  }

  return {
    tarefas: () => carregar().tarefas,
    categorias: () => carregar().categorias,

    adicionar(dados) {
      return alterar((d) => {
        const { status, ...campos } = validarTarefa(dados, d.categorias);
        const tarefa = {
          id: gerarId(),
          ...campos,
          status: 'a_fazer',
          concluidaEm: null,
          criadaEm: new Date().toISOString(),
          minutosFoco: 0,
        };
        definirStatus(tarefa, status);
        d.tarefas.push(tarefa);
        return tarefa;
      });
    },

    editar(id, dados) {
      return alterar((d) => {
        const tarefa = buscar(d, id);
        const { status, ...campos } = validarTarefa(dados, d.categorias);
        Object.assign(tarefa, campos);
        definirStatus(tarefa, status);
        return tarefa;
      });
    },

    // Devolve as tarefas removidas, pra poder desfazer com restaurar().
    excluir(ids) {
      return alterar((d) => {
        ids.forEach((id) => buscar(d, id));
        const removidas = d.tarefas.filter((t) => ids.includes(t.id));
        d.tarefas = d.tarefas.filter((t) => !ids.includes(t.id));
        return removidas;
      });
    },

    restaurar(tarefas) {
      alterar((d) => {
        const existentes = new Set(d.tarefas.map((t) => t.id));
        d.tarefas.push(...tarefas.filter((t) => !existentes.has(t.id)));
      });
    },

    alternarConclusao(id) {
      return alterar((d) => {
        const tarefa = buscar(d, id);
        definirStatus(tarefa, estaConcluida(tarefa) ? 'a_fazer' : 'concluida');
        return tarefa;
      });
    },

    moverPara(id, status) {
      if (!STATUS.includes(status)) throw new Error('Status inválido.');
      return alterar((d) => {
        const tarefa = buscar(d, id);
        definirStatus(tarefa, status);
        return tarefa;
      });
    },

    // Muda só o prazo (usado ao arrastar a tarefa no calendário).
    remarcar(id, prazo) {
      if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) throw new Error('Data de prazo inválida.');
      return alterar((d) => {
        const tarefa = buscar(d, id);
        tarefa.prazo = prazo;
        return tarefa;
      });
    },

    // Soma o tempo de uma sessão do modo foco na tarefa.
    registrarFoco(id, minutos) {
      if (!Number.isFinite(minutos) || minutos < 1) throw new Error('Tempo de foco inválido.');
      return alterar((d) => {
        const tarefa = buscar(d, id);
        tarefa.minutosFoco = (tarefa.minutosFoco || 0) + Math.round(minutos);
        return tarefa;
      });
    },

    alternarSubtarefa(id, subtarefaId) {
      return alterar((d) => {
        const subtarefa = buscar(d, id).subtarefas.find((s) => s.id === subtarefaId);
        if (!subtarefa) throw new Error('Subtarefa não encontrada.');
        subtarefa.feita = !subtarefa.feita;
        return subtarefa;
      });
    },

    adicionarCategoria(dados) {
      return alterar((d) => {
        const campos = validarCategoria(dados, d.categorias);
        const base = criarSlug(campos.nome) || 'categoria';
        let id = base;
        for (let n = 2; d.categorias.some((c) => c.id === id); n++) id = `${base}-${n}`;
        const categoria = { id, ...campos };
        d.categorias.push(categoria);
        return categoria;
      });
    },

    // As tarefas da categoria excluída continuam, só ficam sem categoria.
    excluirCategoria(id) {
      alterar((d) => {
        if (!d.categorias.some((c) => c.id === id)) throw new Error('Categoria não encontrada.');
        d.categorias = d.categorias.filter((c) => c.id !== id);
        d.tarefas.forEach((t) => {
          if (t.categoriaId === id) t.categoriaId = '';
        });
      });
    },

    exportar() {
      const { categorias, tarefas } = carregar();
      return JSON.stringify({ app: 'so-processo', versao: 2, exportadoEm: new Date().toISOString(), categorias, tarefas }, null, 2);
    },

    importar(texto) {
      const dados = lerBackup(texto);
      gravar(dados);
      return dados;
    },
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    PRIORIDADES,
    STATUS,
    CORES,
    PERIODOS,
    hojeISO,
    somarDias,
    somarMeses,
    montarMes,
    diasEntre,
    validarTarefa,
    validarCategoria,
    estaConcluida,
    estaAtrasada,
    progressoSubtarefas,
    periodoDaTarefa,
    pertenceAVisao,
    ordenarTarefas,
    consultarTarefas,
    resumirTarefas,
    contarPendentesPorVisao,
    interpretarAdicaoRapida,
    criarRepositorio,
  };
}
