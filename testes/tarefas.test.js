// Testes das regras de negócio. Rodar com: npm test (ou node --test testes/tarefas.test.js)

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  hojeISO,
  somarDias,
  somarMeses,
  montarMes,
  diasEntre,
  validarTarefa,
  estaAtrasada,
  progressoSubtarefas,
  periodoDaTarefa,
  ordenarTarefas,
  consultarTarefas,
  resumirTarefas,
  contarPendentesPorVisao,
  interpretarAdicaoRapida,
  criarRepositorio,
} = require('../js/tarefas.js');

const HOJE = '2026-10-25';

// Substitui o localStorage do navegador por um Map em memória.
function armazenamentoFalso(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
  };
}

// Tarefa mínima pra testar as funções puras.
function tarefa(campos) {
  return { titulo: 'X', descricao: '', prazo: '', prioridade: 'media', status: 'a_fazer', categoriaId: '', subtarefas: [], ...campos };
}

describe('Requisitos do escopo inicial', () => {
  test('RF01/RF02: cadastra uma tarefa e ela aparece na lista', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    repo.adicionar({ titulo: 'Estudar para a prova', prazo: '2026-11-10', prioridade: 'alta' });

    const [salva] = repo.tarefas();
    assert.equal(salva.titulo, 'Estudar para a prova');
    assert.equal(salva.status, 'a_fazer');
  });

  test('RF01: não aceita tarefa sem título', () => {
    assert.throws(() => validarTarefa({ titulo: '   ' }), /título/);
  });

  test('RF03: edita os campos e mantém id e data de criação', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const original = repo.adicionar({ titulo: 'Antigo' });
    repo.editar(original.id, { titulo: 'Novo', prazo: '2026-12-01', prioridade: 'baixa', categoriaId: 'casa' });

    const [editada] = repo.tarefas();
    assert.equal(editada.titulo, 'Novo');
    assert.equal(editada.prazo, '2026-12-01');
    assert.equal(editada.prioridade, 'baixa');
    assert.equal(editada.categoriaId, 'casa');
    assert.equal(editada.id, original.id);
    assert.equal(editada.criadaEm, original.criadaEm);
  });

  test('RF03: edição inválida não altera nada', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id } = repo.adicionar({ titulo: 'Original' });
    assert.throws(() => repo.editar(id, { titulo: '' }), /título/);
    assert.equal(repo.tarefas()[0].titulo, 'Original');
  });

  test('RF04: exclui e desfaz a exclusão', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id } = repo.adicionar({ titulo: 'Apagar' });
    repo.adicionar({ titulo: 'Manter' });

    const removidas = repo.excluir([id]);
    assert.deepEqual(repo.tarefas().map((t) => t.titulo), ['Manter']);

    repo.restaurar(removidas);
    assert.equal(repo.tarefas().length, 2);
  });

  test('RF05: marca e desmarca como concluída, registrando quando', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id } = repo.adicionar({ titulo: 'Lavar louça' });

    const concluida = repo.alternarConclusao(id);
    assert.equal(concluida.status, 'concluida');
    assert.ok(concluida.concluidaEm);

    const reaberta = repo.alternarConclusao(id);
    assert.equal(reaberta.status, 'a_fazer');
    assert.equal(reaberta.concluidaEm, null);
  });

  test('RF06: pendente com prazo vencido fica atrasada; concluída não', () => {
    assert.equal(estaAtrasada(tarefa({ prazo: '2026-10-24' }), HOJE), true);
    assert.equal(estaAtrasada(tarefa({ prazo: HOJE }), HOJE), false);
    assert.equal(estaAtrasada(tarefa({ prazo: '2026-10-24', status: 'concluida' }), HOJE), false);
    assert.equal(estaAtrasada(tarefa({ prazo: '' }), HOJE), false);
  });

  test('RF07: prioridade é baixa, média (padrão) ou alta', () => {
    assert.equal(validarTarefa({ titulo: 'X' }).prioridade, 'media');
    assert.throws(() => validarTarefa({ titulo: 'X', prioridade: 'urgente' }), /Prioridade/);
  });

  test('RF08: filtra por pendentes, em andamento e concluídas', () => {
    const lista = [
      tarefa({ titulo: 'a fazer' }),
      tarefa({ titulo: 'fazendo', status: 'andamento' }),
      tarefa({ titulo: 'feita', status: 'concluida' }),
    ];
    const titulos = (status) => consultarTarefas(lista, { status }, HOJE).map((t) => t.titulo);

    assert.deepEqual(titulos('pendentes'), ['a fazer', 'fazendo']);
    assert.deepEqual(titulos('andamento'), ['fazendo']);
    assert.deepEqual(titulos('concluidas'), ['feita']);
    assert.equal(titulos('todas').length, 3);
  });
});

describe('Status e quadro', () => {
  test('move a tarefa entre as colunas do quadro', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id } = repo.adicionar({ titulo: 'Relatório' });

    assert.equal(repo.moverPara(id, 'andamento').status, 'andamento');
    assert.equal(repo.moverPara(id, 'concluida').status, 'concluida');
    assert.throws(() => repo.moverPara(id, 'arquivada'), /Status/);
  });

  test('cadastrar já como concluída registra a data de conclusão', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    assert.ok(repo.adicionar({ titulo: 'Feita', status: 'concluida' }).concluidaEm);
  });
});

describe('Subtarefas', () => {
  test('ignora subtarefas vazias e calcula o progresso', () => {
    const { subtarefas } = validarTarefa({
      titulo: 'Relatório',
      subtarefas: [{ texto: 'Introdução', feita: true }, { texto: '  ' }, { texto: 'Conclusão' }],
    });
    assert.equal(subtarefas.length, 2);
    assert.deepEqual(progressoSubtarefas({ subtarefas }), { feitas: 1, total: 2 });
  });

  test('marca uma subtarefa como feita', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id, subtarefas } = repo.adicionar({ titulo: 'Relatório', subtarefas: [{ texto: 'Introdução' }] });

    assert.equal(repo.alternarSubtarefa(id, subtarefas[0].id).feita, true);
  });
});

describe('Categorias', () => {
  test('vem com as categorias padrão', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    assert.deepEqual(repo.categorias().map((c) => c.nome), ['Faculdade', 'Trabalho', 'Pessoal', 'Casa']);
  });

  test('cria categoria nova e não aceita nome repetido', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const saude = repo.adicionarCategoria({ nome: 'Saúde', cor: 'rosa' });

    assert.equal(saude.id, 'saude');
    assert.throws(() => repo.adicionarCategoria({ nome: 'saude' }), /Já existe/);
  });

  test('não aceita tarefa com categoria que não existe', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    assert.throws(() => repo.adicionar({ titulo: 'X', categoriaId: 'inventada' }), /Categoria/);
  });

  test('excluir categoria mantém as tarefas, sem categoria', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    repo.adicionar({ titulo: 'Lavar o carro', categoriaId: 'casa' });
    repo.excluirCategoria('casa');

    assert.equal(repo.tarefas()[0].categoriaId, '');
    assert.ok(!repo.categorias().some((c) => c.id === 'casa'));
  });
});

describe('Visões, busca e ordenação', () => {
  const lista = [
    tarefa({ titulo: 'Pagar luz', prazo: '2026-10-23', prioridade: 'alta', categoriaId: 'casa' }),
    tarefa({ titulo: 'Academia', prazo: HOJE, prioridade: 'baixa', categoriaId: 'pessoal' }),
    tarefa({ titulo: 'Prova de SQL', prazo: '2026-10-26', subtarefas: [{ texto: 'Normalização', feita: false }] }),
    tarefa({ titulo: 'Viagem', prazo: '2026-12-20' }),
    tarefa({ titulo: 'Ler livro' }),
    tarefa({ titulo: 'Reunião', prazo: HOJE, status: 'concluida' }),
  ];
  const titulos = (opcoes) => consultarTarefas(lista, opcoes, HOJE).map((t) => t.titulo);

  test('"Hoje" mostra as de hoje e as atrasadas', () => {
    assert.deepEqual(titulos({ visao: 'hoje' }), ['Pagar luz', 'Academia', 'Reunião']);
  });

  test('"Próximos 7 dias" não inclui tarefa distante nem sem prazo', () => {
    assert.deepEqual(titulos({ visao: 'semana' }), ['Pagar luz', 'Academia', 'Prova de SQL', 'Reunião']);
  });

  test('filtra por categoria e por prioridade', () => {
    assert.deepEqual(titulos({ visao: 'categoria:casa' }), ['Pagar luz']);
    assert.deepEqual(titulos({ prioridade: 'baixa' }), ['Academia']);
  });

  test('busca sem diferenciar acento e maiúscula, inclusive nas subtarefas', () => {
    assert.deepEqual(titulos({ busca: 'REUNIAO' }), ['Reunião']);
    assert.deepEqual(titulos({ busca: 'normalizacao' }), ['Prova de SQL']);
  });

  test('ordena por prazo: pendentes primeiro, prazo mais próximo, sem prazo no fim', () => {
    assert.deepEqual(titulos({}), ['Pagar luz', 'Academia', 'Prova de SQL', 'Viagem', 'Ler livro', 'Reunião']);
  });

  test('no mesmo prazo, prioridade mais alta primeiro', () => {
    const ordenadas = ordenarTarefas([
      tarefa({ titulo: 'baixa', prazo: HOJE, prioridade: 'baixa' }),
      tarefa({ titulo: 'alta', prazo: HOJE, prioridade: 'alta' }),
    ]);
    assert.deepEqual(ordenadas.map((t) => t.titulo), ['alta', 'baixa']);
  });

  test('separa a lista em períodos', () => {
    assert.deepEqual(lista.map((t) => periodoDaTarefa(t, HOJE)), ['atrasadas', 'hoje', 'amanha', 'depois', 'sem_prazo', 'concluidas']);
  });

  test('resumo e contadores da barra lateral', () => {
    assert.deepEqual(resumirTarefas(lista, HOJE), { total: 6, concluidas: 1, pendentes: 5, andamento: 0, atrasadas: 1, percentual: 17 });

    const contagem = contarPendentesPorVisao(lista, [{ id: 'casa' }], HOJE);
    assert.equal(contagem.hoje, 2);
    assert.equal(contagem.atrasadas, 1);
    assert.equal(contagem.todas, 5);
    assert.equal(contagem['categoria:casa'], 1);
  });
});

describe('Adição rápida', () => {
  const categorias = [{ id: 'faculdade', nome: 'Faculdade' }];

  test('entende prazo, prioridade e categoria escritos no texto', () => {
    assert.deepEqual(interpretarAdicaoRapida('Estudar SQL @amanhã !alta #faculdade', categorias, HOJE), {
      titulo: 'Estudar SQL',
      prazo: '2026-10-26',
      prioridade: 'alta',
      categoriaId: 'faculdade',
    });
  });

  test('data dia/mês que já passou vai pro ano que vem', () => {
    assert.equal(interpretarAdicaoRapida('Natal @25/12', [], HOJE).prazo, '2026-12-25');
    assert.equal(interpretarAdicaoRapida('Férias @10/01', [], HOJE).prazo, '2027-01-10');
  });

  test('o que não for comando fica no título', () => {
    const resultado = interpretarAdicaoRapida('Ligar pro #suporte @31/02', categorias, HOJE);
    assert.equal(resultado.titulo, 'Ligar pro #suporte @31/02');
    assert.equal(resultado.prazo, '');
  });
});

describe('Armazenamento e backup', () => {
  test('os dados continuam salvos ao abrir o app de novo', () => {
    const armazenamento = armazenamentoFalso();
    criarRepositorio(armazenamento).adicionar({ titulo: 'Persistente' });
    assert.equal(criarRepositorio(armazenamento).tarefas()[0].titulo, 'Persistente');
  });

  test('aproveita as tarefas salvas pela versão 1 do app', () => {
    const antigas = [{ id: 'a1', titulo: 'Antiga', descricao: '', prazo: '', prioridade: 'alta', concluida: true, criadaEm: '2026-10-20T10:00:00.000Z' }];
    const repo = criarRepositorio(armazenamentoFalso({ 'so-processo:tarefas': JSON.stringify(antigas) }));

    const [migrada] = repo.tarefas();
    assert.equal(migrada.status, 'concluida');
    assert.deepEqual(migrada.subtarefas, []);
  });

  test('exporta e importa o backup', () => {
    const origem = criarRepositorio(armazenamentoFalso());
    origem.adicionarCategoria({ nome: 'Saúde', cor: 'rosa' });
    origem.adicionar({ titulo: 'Consulta', categoriaId: 'saude', subtarefas: [{ texto: 'Levar exames' }] });

    const destino = criarRepositorio(armazenamentoFalso());
    destino.importar(origem.exportar());

    assert.deepEqual(destino.tarefas(), origem.tarefas());
    assert.deepEqual(destino.categorias(), origem.categorias());
  });

  test('recusa arquivo que não é backup', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    assert.throws(() => repo.importar('isso não é json'), /backup/);
    assert.throws(() => repo.importar('{"tarefas": []}'), /backup/);
  });
});

describe('Calendário', () => {
  test('o mês tem 6 semanas começando na segunda', () => {
    const dias = montarMes('2026-10'); // 1º de outubro de 2026 é quinta
    assert.equal(dias.length, 42);
    assert.equal(dias[0], '2026-09-28');
    assert.equal(dias[3], '2026-10-01');
    assert.equal(dias[41], '2026-11-08');
  });

  test('avança e volta meses, virando o ano', () => {
    assert.equal(somarMeses('2026-12', 1), '2027-01');
    assert.equal(somarMeses('2026-01', -1), '2025-12');
  });

  test('arrastar no calendário muda só o prazo', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id } = repo.adicionar({ titulo: 'Prova', prazo: '2026-10-26', prioridade: 'alta' });

    const remarcada = repo.remarcar(id, '2026-10-30');
    assert.equal(remarcada.prazo, '2026-10-30');
    assert.equal(remarcada.prioridade, 'alta');
    assert.throws(() => repo.remarcar(id, '30/10/2026'), /prazo/);
  });
});

describe('Modo foco', () => {
  test('soma o tempo de cada sessão na tarefa', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id, minutosFoco } = repo.adicionar({ titulo: 'Estudar' });
    assert.equal(minutosFoco, 0);

    repo.registrarFoco(id, 25);
    assert.equal(repo.registrarFoco(id, 15).minutosFoco, 40);
    assert.throws(() => repo.registrarFoco(id, 0), /foco/);
  });

  test('editar a tarefa não apaga o tempo de foco', () => {
    const repo = criarRepositorio(armazenamentoFalso());
    const { id } = repo.adicionar({ titulo: 'Estudar' });
    repo.registrarFoco(id, 25);
    repo.editar(id, { titulo: 'Estudar SQL' });

    assert.equal(repo.tarefas()[0].minutosFoco, 25);
  });
});

describe('Datas', () => {
  test('formato AAAA-MM-DD e contas de dias, inclusive virando o mês', () => {
    assert.equal(hojeISO(new Date(2026, 0, 5)), '2026-01-05');
    assert.equal(somarDias('2026-10-31', 1), '2026-11-01');
    assert.equal(diasEntre('2026-10-25', '2026-11-01'), 7);
  });
});
