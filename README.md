# Só Processo

Projeto A3 – Aplicação para Organização de Tarefas
Disciplina: Projeto e Engenharia de Software

**Grupo:** Pedro Duarte (RA 4261212023) · Vitor Ramos (RA 4261216220) · Matheus Brum (RA 4261215149)

Aplicação web para organizar as tarefas do dia a dia. Com ela dá pra cadastrar tarefas com prazo, prioridade, categoria e subtarefas, acompanhar o progresso num painel e trabalhar em lista, em quadro (estilo Kanban) ou no calendário, com modo foco (Pomodoro) pra se concentrar numa tarefa.

## Como usar

1. Abra o arquivo `index.html` no navegador (Chrome, Edge ou Firefox) com dois cliques.
2. Não precisa instalar nada nem ter internet. As tarefas ficam salvas no próprio navegador (`localStorage`) e continuam lá depois de fechar a página.
3. Na primeira vez, clique em **Carregar exemplos** pra ver o app com dados.

**Atalhos:** `N` abre uma nova tarefa, `/` vai pra busca e `Esc` fecha a janela.

**Adição rápida:** escreva a tarefa e aperte Enter. Dá pra incluir comandos no texto: `Estudar SQL @amanhã !alta #faculdade`.
- `@hoje`, `@amanhã` ou `@25/12` definem o prazo.
- `!alta`, `!media` ou `!baixa` definem a prioridade.
- `#categoria` define a categoria.

## Requisitos funcionais

### Escopo inicial (proposta do projeto)

| Código | Requisito | Onde está no código |
|---|---|---|
| RF01 | Cadastrar tarefas (título obrigatório) | `adicionar` + `validarTarefa` em `js/tarefas.js` |
| RF02 | Visualizar as tarefas cadastradas | `consultarTarefas` + `lista` em `js/app.js` |
| RF03 | Editar tarefas | `editar` |
| RF04 | Excluir tarefas (com opção de desfazer) | `excluir` / `restaurar` |
| RF05 | Marcar tarefas como concluídas | `alternarConclusao` |
| RF06 | Definir uma data de prazo; mostra "Hoje", "Amanhã", o dia da semana ou "Atrasada há N dias" | `estaAtrasada`, `periodoDaTarefa` |
| RF07 | Definir a prioridade: baixa, média (padrão) ou alta | `validarTarefa` |
| RF08 | Filtrar por status: pendentes ou concluídas (e também "em andamento") | `consultarTarefas` |

### Evolução (além do escopo inicial)

| Código | Requisito | Onde está no código |
|---|---|---|
| RF09 | Status "Em andamento", além de "A fazer" e "Concluída" | `STATUS`, `moverPara` |
| RF10 | Quadro Kanban com 3 colunas: arrastar e soltar (ou setas, no celular) | `quadro` em `js/app.js` |
| RF11 | Categorias com cor: criar, filtrar e excluir (as tarefas ficam sem categoria) | `adicionarCategoria`, `excluirCategoria` |
| RF12 | Subtarefas (checklist) com progresso, ex.: 2/5 | `validarSubtarefas`, `alternarSubtarefa` |
| RF13 | Visões prontas: Hoje, Próximos 7 dias, Atrasadas, Todas | `pertenceAVisao` |
| RF14 | Busca por texto (ignora acento e maiúscula, procura também nas subtarefas) | `consultarTarefas` |
| RF15 | Filtro por prioridade e 4 ordenações (prazo, prioridade, recentes, alfabética) | `ORDENACOES` |
| RF16 | Painel de resumo: pendentes, em andamento, atrasadas, concluídas e % de progresso | `resumirTarefas` |
| RF17 | Lista agrupada por período: Atrasadas, Hoje, Amanhã, Próximos 7 dias… | `PERIODOS`, `periodoDaTarefa` |
| RF18 | Adição rápida com comandos no texto | `interpretarAdicaoRapida` |
| RF19 | Backup: exportar e importar as tarefas em arquivo JSON | `exportar`, `importar` |
| RF20 | Tema claro, escuro ou automático | `aplicarTema` em `js/app.js` |
| RF21 | Calendário do mês: tarefas no dia do prazo, arrastar pra outro dia muda o prazo, dois cliques num dia criam uma tarefa nele | `montarMes`, `remarcar` |
| RF22 | Modo foco (Pomodoro) de 15, 25 ou 50 minutos, que soma o tempo de foco em cada tarefa | `registrarFoco` |
| RF23 | Fundo personalizado: degradês prontos, cor sólida ou imagem própria (reduzida automaticamente), com controle de intensidade | `aplicarFundo` em `js/app.js` |

## Requisitos não funcionais

- **RNF01 – Usabilidade:** interface em português, com atalhos de teclado, mensagens de erro claras e opção de desfazer exclusões.
- **RNF02 – Portabilidade:** funciona em qualquer navegador moderno, no computador e no celular (layout responsivo).
- **RNF03 – Persistência:** os dados ficam salvos no navegador, sem servidor. Os dados da versão 1 são migrados sozinhos.
- **RNF04 – Manutenibilidade:** as regras de negócio (`js/tarefas.js`) ficam separadas da interface (`js/app.js`) e têm testes automatizados.
- **RNF05 – Segurança:** o texto digitado nunca é inserido como HTML, o que evita injeção de código (XSS).
- **RNF06 – Acessibilidade:** os botões têm rótulos para leitores de tela, o foco do teclado fica visível e cor nunca é a única informação (todas as etiquetas têm texto).

## Fora do escopo

Login de usuários, notificações automáticas e integração com outros sistemas.

## Documentação da A3

| Documento | Entrega |
|---|---|
| [docs/01-pre-projeto.md](docs/01-pre-projeto.md) | Sprint 1 – Pré-projeto (8 questões) |
| [docs/02-canvas.md](docs/02-canvas.md) | Sprint 1 – Canvas (12 blocos) |
| [docs/03-documentacao.md](docs/03-documentacao.md) | Sprint 2 – Documentação: requisitos, casos de uso, fluxos, diagramas, modelo de dados, DER, protótipos |
| [docs/04-backlog.md](docs/04-backlog.md) | Backlog do projeto (GitHub Projects) |
| [docs/05-pitch.md](docs/05-pitch.md) | Sprint 2 – Roteiro do pitch |

Os diagramas também estão em imagem (PNG) em [docs/diagramas/](docs/diagramas/), prontos para colar nos templates.

**Versões em PDF** (em [docs/pdf/](docs/pdf/)): [Pré-projeto](docs/pdf/Pre-projeto%20-%20So%20Processo.pdf) · [Canvas](docs/pdf/Canvas%20-%20So%20Processo.pdf) · [Documentação](docs/pdf/Documentacao%20-%20So%20Processo.pdf) · [Backlog](docs/pdf/Backlog%20-%20So%20Processo.pdf) · [Roteiro do pitch](docs/pdf/Roteiro%20do%20Pitch%20-%20So%20Processo.pdf)

## Estrutura do projeto

```
so-processo/
├── docs/                   Documentação da A3 e diagramas (docs/diagramas/)
├── index.html              Estrutura da tela e das janelas
├── css/style.css           Aparência (cores, temas, layout, celular)
├── js/tarefas.js           Regras de negócio e armazenamento (sem tela)
├── js/app.js               Interface: menu, resumo, lista, quadro, janelas
├── testes/tarefas.test.js  Testes automatizados das regras
├── site/                   Site de apresentação (index.html + img/)
├── ferramentas/            gerar-site.js: monta os arquivos de publicação
└── publicar/               Gerado pelo "npm run site": é o que vai pra hospedagem
```

**Arquitetura em camadas:**
- **Regras (`tarefas.js`):** valida, filtra, ordena, resume e salva. Não sabe nada da tela.
- **Interface (`app.js`):** cada ação do usuário chama o repositório e depois `renderizar()`, que redesenha a tela a partir dos dados salvos.
- **Armazenamento trocável:** o repositório recebe o armazenamento como parâmetro (`criarRepositorio(armazenamento)`). No navegador ele recebe o `localStorage`; nos testes recebe um armazenamento falso em memória. Dá pra trocar por um banco de dados sem mexer na interface.

## Site de apresentação e publicação

A pasta `site/` tem a página de apresentação do projeto (problema, proposta, funcionalidades, capturas de tela, engenharia e equipe), com as imagens em `site/img/`.

Pra gerar os arquivos de publicação, rode:

```
npm run site
```

Isso cria em `publicar/`:
- `index.html`: o site de apresentação, com as imagens dentro do próprio arquivo.
- `app.html`: o app inteiro em um arquivo só.
- `so-processo-site.zip`: os dois juntos, pra subir na hospedagem e extrair na pasta do site.

## Testes

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo. Na pasta do projeto, rode:

```
npm test
```

São 38 testes, organizados por assunto: requisitos do escopo inicial (RF01–RF08), status e quadro, subtarefas, categorias, visões/busca/ordenação, adição rápida, armazenamento/backup, calendário, modo foco e datas.
