# Backlog – Só Processo

Quadro no **GitHub Projects** com as colunas pedidas na especificação da A3 (item 10.2):

**Backlog → A fazer → Em desenvolvimento → Em teste → Concluído**

Cada linha abaixo vira um cartão (issue) no quadro. Os responsáveis são uma sugestão: o grupo deve ajustar conforme a divisão real.

- **Sprint 1:** até 21/10/2026 (pré-projeto e Canvas)
- **Sprint 2:** 22/10 a 18/11/2026 (projeto final e pitch)

| ID | Tarefa | Entrega da A3 | Responsável | Sprint | Situação |
|---|---|---|---|---|---|
| T01 | Formar o grupo e definir o tema (app de organização de tarefas) | 1. Definição do grupo e do tema | Todos | 1 | Concluído |
| T02 | Escrever a proposta: problema, objetivo, público-alvo e escopo inicial | 2. Proposta e escopo inicial | Matheus | 1 | Concluído |
| T03 | Pesquisar concorrentes (Todoist, Microsoft To Do, Trello) | Pré-projeto (Q3) | Matheus | 1 | Em teste |
| T04 | Desenhar o fluxograma do processo atual e o de uso da solução | Pré-projeto (Q5 e Q8) | Matheus | 1 | Em teste |
| T05 | Preencher o pré-projeto e enviar no Ânima Hub | Sprint 1 – Pré-projeto | Matheus | 1 | Em teste |
| T06 | Preencher os 12 blocos do Canvas e conferir as referências no Google Acadêmico | Sprint 1 – Canvas | Pedro | 1 | Em teste |
| T07 | Levantar os requisitos funcionais (RF01–RF08 do escopo inicial) | 3. Levantamento de requisitos | Matheus | 1 | Concluído |
| T08 | Especificar requisitos funcionais da evolução (RF09–RF23) e não funcionais (RNF01–RNF08) | 4. Requisitos funcionais e não funcionais | Matheus | 2 | Concluído |
| T09 | Diagrama e especificação dos casos de uso, com fluxos principais e alternativos | 5. Casos de uso e fluxos | Matheus | 2 | Em teste |
| T10 | Diagrama de classes | 6. Diagrama de classes | Pedro | 2 | Em teste |
| T11 | Protótipo das telas (lista, quadro, calendário, foco, escuro, celular) | 7. Protótipo das telas | Vitor | 2 | Concluído |
| T12 | Modelo de dados, dicionário de dados e DER | 8. Modelo de dados/DER | Pedro | 2 | Em teste |
| T13 | Regras de negócio: validar, cadastrar, editar, excluir e concluir tarefas (RF01–RF05) | 9. Versão parcial | Pedro | 2 | Concluído |
| T14 | Prazo, prioridade e filtro por status (RF06–RF08) | 9. Versão parcial | Pedro | 2 | Concluído |
| T15 | Tela principal: lista agrupada por período, painel de resumo e janela da tarefa | 9. Versão parcial | Vitor | 2 | Concluído |
| T16 | Quadro Kanban com arrastar e soltar e status "Em andamento" (RF09, RF10) | 11. Versão final | Vitor | 2 | Concluído |
| T17 | Categorias com cor e subtarefas com progresso (RF11, RF12) | 11. Versão final | Pedro | 2 | Concluído |
| T18 | Visões prontas, busca sem acento, filtros e ordenações (RF13–RF15, RF17) | 11. Versão final | Pedro | 2 | Concluído |
| T19 | Adição rápida com comandos (RF18) | 11. Versão final | Pedro | 2 | Concluído |
| T20 | Backup: exportar e importar JSON (RF19) | 11. Versão final | Pedro | 2 | Concluído |
| T21 | Tema claro/escuro e fundo personalizado (RF20, RF23) | 11. Versão final | Vitor | 2 | Concluído |
| T22 | Calendário do mês com remarcação por arrastar (RF21) | 11. Versão final | Vitor | 2 | Concluído |
| T23 | Modo foco (Pomodoro) que soma minutos na tarefa (RF22) | 11. Versão final | Vitor | 2 | Concluído |
| T24 | Testes automatizados das regras de negócio (38 testes) | 11. Versão final | Pedro | 2 | Concluído |
| T25 | Layout responsivo e acessibilidade (RNF02, RNF06) | 11. Versão final | Vitor | 2 | Concluído |
| T26 | Criar o repositório no GitHub e subir o código | Gestão (10.3) | Pedro | 2 | Concluído |
| T27 | Montar o quadro no GitHub Projects e enviar o link ao professor | Gestão (10.1 e 10.2) | Matheus | 2 | A fazer |
| T28 | Site de apresentação e publicação do app | 11. Versão final | Vitor | 2 | Concluído |
| T29 | Documentação completa (seguir o template do professor quando sair) | 10. Documentação | Matheus | 2 | Em desenvolvimento |
| T30 | Teste final em Chrome, Edge, Firefox e celular | 11. Versão final | Todos | 2 | A fazer |
| T31 | Roteiro e slides do pitch, com ensaio da demonstração | 12. Apresentação final | Todos | 2 | Em desenvolvimento |
| T32 | Entregar software, documentação e pitch no Ânima Hub e no Ulife | Sprint 2 – Projeto final e Pitch | Matheus | 2 | A fazer |

## Ligação backlog → commit

Para cumprir a relação **Backlog → Tarefa → Desenvolvimento → Commit → Versão** (item 10.3), cada commit deve citar o número da issue, por exemplo:

```
git commit -m "Adiciona filtro por prioridade (#18)"
```

O GitHub liga o commit ao cartão automaticamente. Usar `Closes #18` na mensagem fecha a issue quando o commit chega na `main`.
