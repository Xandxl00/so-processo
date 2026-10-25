# Roteiro do Pitch – Só Processo

**Apresentação final A3** · 18/11 ou 24/11/2026 (sorteio) · cerca de 10 minutos

O roteiro cobre todos os itens que a especificação pede na apresentação (itens 13 a 22 do item 9.3). Cada integrante apresenta uma parte, porque a participação de todos é critério de avaliação. Se o professor definir outro tempo, encurte os blocos 4 e 6.

| Bloco | Tempo | Quem | Itens da especificação |
|---|---|---|---|
| 1. Problema | 1 min | Matheus | 13. Problema identificado |
| 2. Proposta e público | 1 min | Matheus | 14. Proposta · 15. Público-alvo |
| 3. Funcionalidades e requisitos | 1 min 30 | Pedro | 16. Funcionalidades · 17. Requisitos |
| 4. Modelagem e arquitetura | 1 min 30 | Pedro | 18. Modelagem · 19. Tecnologias · 20. Funcionamento |
| 5. Demonstração ao vivo | 3 min | Vitor | 21. Demonstração |
| 6. Dificuldades e soluções | 1 min | Pedro | 22. Dificuldades e soluções |
| 7. Fechamento e perguntas | 1 min | Todos | — |

---

## 1. Problema (Matheus)

**Slide:** três cartões: "Tarefas esquecidas", "Prazos perdidos", "Prioridades confusas".

> "Quem aqui já esqueceu de entregar um trabalho porque anotou num papel que sumiu? A gente anota tarefa no caderno, no celular, manda mensagem pra si mesmo… e no fim ninguém avisa o que vence hoje. A literatura de gestão do tempo mostra que planejar e priorizar dá mais controle e menos estresse, mas as ferramentas que existem pedem conta, internet ou cobram pelos recursos principais."

## 2. Proposta e público (Matheus)

**Slide:** logo do Só Processo + frase "Uma aplicação simples para organizar as tarefas do dia a dia."

> "O Só Processo é um app web que junta todas as tarefas num lugar só e organiza sozinho o que é urgente. Abre no navegador, sem instalar, sem criar conta e sem internet. É pra estudantes e pra qualquer pessoa que precisa organizar a rotina."

## 3. Funcionalidades e requisitos (Pedro)

**Slide:** os 8 requisitos do escopo inicial (RF01–RF08) marcados como prontos + "e mais 15 (RF09–RF23)".

> "Começamos com 8 requisitos funcionais: cadastrar, visualizar, editar, excluir, concluir, prazo, prioridade e filtro por status. Entregamos todos e fomos além: quadro Kanban, calendário, modo foco Pomodoro, categorias, subtarefas, adição rápida e backup. São 23 requisitos funcionais e 8 não funcionais, como usabilidade, segurança contra XSS e acessibilidade."

## 4. Modelagem, tecnologias e funcionamento (Pedro)

**Slides:** diagrama de casos de uso → diagrama de classes → arquitetura em camadas (seções 9, 11 e 14 da documentação).

> "Modelamos 13 casos de uso com fluxos principais e alternativos. O diagrama de classes mostra as entidades Tarefa, Subtarefa e Categoria, e o Repositório que grava tudo. O código é dividido em camadas: a interface em `app.js` só chama as regras de negócio em `tarefas.js`, e as regras gravam no `localStorage` do navegador. Usamos HTML, CSS e JavaScript puro, e as regras são verificadas por 38 testes automatizados com Node.js."

**Mostrar rapidamente:** o terminal rodando `npm test` com os 38 testes passando.

## 5. Demonstração ao vivo (Vitor)

Antes da apresentação: carregar os exemplos, **exportar um backup** (fica como plano B, caso algo dê errado), depois limpar os dados do navegador e deixar a janela pronta.

1. **Primeiro acesso:** mostrar "Nenhuma tarefa ainda" e clicar em **Carregar exemplos**.
2. **Lista por período:** mostrar os grupos Atrasadas, Hoje, Amanhã e o painel de resumo.
3. **Adição rápida:** digitar `Apresentar A3 @amanhã !alta #faculdade` + Enter. Mostrar que prazo, prioridade e categoria foram preenchidos.
4. **Validação:** tentar salvar uma tarefa sem título e mostrar a mensagem "Informe o título da tarefa."
5. **Concluir e desfazer:** concluir uma tarefa, mostrar o progresso subindo e clicar em "Desfazer".
6. **Quadro:** trocar para Quadro e arrastar um cartão para "Em andamento".
7. **Calendário:** arrastar uma tarefa para outro dia e mostrar o aviso "Prazo mudado para…".
8. **Modo foco:** abrir o foco de uma tarefa e mostrar o relógio (não precisa esperar terminar).
9. **Tema escuro e celular:** alternar o tema e mostrar a tela em tamanho de celular (F12 → modo dispositivo).
10. **Persistência:** recarregar a página (F5) e mostrar que tudo continua lá.

## 6. Dificuldades e soluções (Pedro)

**Slide:** tabela da seção 17 da documentação (escolher três).

> "Três desafios marcaram o projeto. Primeiro, testar as regras sem navegador: resolvemos separando as camadas e passando o armazenamento como parâmetro. Segundo, datas mudando de dia por causa do fuso: guardamos a data como texto e calculamos a diferença em UTC. Terceiro, não perder os dados se o navegador for limpo: criamos o backup em arquivo, com validação de cada tarefa."

## 7. Fechamento (todos)

**Slide:** "Problema → Requisitos → Modelagem → Desenvolvimento → Produto final" + links do repositório, do quadro e do app.

> "Seguimos o caminho completo da engenharia de software, do problema até um produto funcionando. O código está no GitHub, o backlog no GitHub Projects e o app publicado. Obrigado! Perguntas?"

## Perguntas prováveis da banca

| Pergunta | Resposta curta |
|---|---|
| Por que não tem login? | Ficou fora do escopo para garantir a entrega. O app é individual e os dados não saem do aparelho, o que também evita questões de LGPD. |
| E se limpar o navegador? | Os dados se perdem, por isso existe o backup em JSON. Uma evolução seria trocar o `localStorage` por um banco, e a arquitetura já permite isso sem mexer na interface. |
| Por que JavaScript puro, sem framework? | O app é pequeno, abre na hora e não precisa de instalação nem de etapa de build. Também ajudou a equipe a entender a base da web. |
| Como garantem que as regras funcionam? | 38 testes automatizados cobrindo todos os requisitos do escopo inicial e os principais da evolução. |
| O que fariam numa próxima versão? | Login com sincronização na nuvem, lembretes e tarefas recorrentes. |
