# Canvas Ânima Hub – Só Processo

**Projeto A3 – Projeto e Engenharia de Software** · Sprint 1 (Pré-projeto e Canvas)

Texto de cada um dos 12 blocos do Canvas, pronto para colar no template.

---

## 1. Quais os tipos de usuários estarão no projeto?

- **Usuário:** estudante ou pessoa que precisa organizar as próprias atividades diárias. Cadastra e acompanha as próprias tarefas.
- Não há administrador nem outros perfis: o app é individual, sem login e sem servidor.

## 2. Quais os casos de uso estarão no projeto?

- Cadastrar tarefa (formulário ou adição rápida em uma linha)
- Visualizar tarefas em lista, quadro Kanban ou calendário
- Filtrar, buscar e ordenar tarefas
- Editar tarefa
- Excluir tarefa (com desfazer)
- Concluir ou reabrir tarefa
- Mover tarefa entre A fazer, Em andamento e Concluída
- Remarcar o prazo arrastando no calendário
- Marcar subtarefas (checklist)
- Criar e excluir categorias
- Usar o modo foco (Pomodoro)
- Exportar e importar backup
- Personalizar tema e fundo

## 3. Contribuições esperadas da ferramenta

- Concentrar em um único lugar tarefas que hoje ficam espalhadas em cadernos, celular e mensagens.
- Reduzir esquecimentos e prazos perdidos, mostrando o que vence hoje e o que já atrasou.
- Facilitar a priorização (baixa, média, alta) e a escolha de por onde começar o dia.
- Acompanhar o progresso com indicadores (pendentes, em andamento, atrasadas, concluídas, % concluído).
- Apoiar a concentração com o modo foco e registrar o tempo dedicado a cada tarefa.
- Ser acessível a qualquer pessoa: grátis, sem instalação, sem conta e sem internet.

## 4. Objetivo geral do app/sistema

Desenvolver uma aplicação web simples que ajude estudantes e pessoas em geral a cadastrar, organizar e acompanhar suas tarefas diárias, com prazos, prioridades e categorias, reduzindo esquecimentos e atrasos.

## 5. Desafios e riscos do app/sistema

- **Dados só no navegador (`localStorage`):** limpar os dados do navegador ou trocar de aparelho apaga as tarefas. Mitigação: backup em arquivo JSON (exportar/importar).
- **Limite de armazenamento do navegador (cerca de 5 MB):** imagens de fundo grandes podem não caber. Mitigação: a imagem é reduzida automaticamente e o app avisa quando não couber.
- **Sem sincronização entre aparelhos e sem lembretes:** funcionalidades fora do escopo desta versão.
- **LGPD:** como não há servidor nem coleta de dados pessoais, o risco é baixo; os dados nunca saem do aparelho do usuário.
- **Segurança:** texto digitado pelo usuário poderia virar código (XSS). Mitigação: o texto nunca é inserido como HTML.

## 6. Desafios e riscos das análises de dados que serão viabilizadas

- Os dados ficam no aparelho de cada usuário, então não há base central para análises com vários usuários; as análises são individuais.
- Os indicadores dependem de o usuário registrar e concluir as tarefas no app; se ele não atualizar, os números ficam errados.
- Datas dependem do relógio e do fuso do aparelho.
- Não há necessidade de autorização especial (INMETRO, ANVISA) nem de ferramenta paga.

## 7. Desafios e riscos da(s) ferramenta(s)

- Nenhuma ferramenta paga: HTML, CSS, JavaScript, Node.js (testes) e GitHub são gratuitos.
- Sem recurso em nuvem: o app roda direto no navegador; a hospedagem do site de apresentação é estática.
- Curva de aprendizado da equipe em JavaScript puro (sem framework), arrastar e soltar (Drag and Drop API) e testes automatizados com o executor de testes do Node.js.
- Compatibilidade entre navegadores (Chrome, Edge, Firefox) e telas de celular.

## 8. Quais análises estatísticas e estratégicas podem ser feitas com o uso do app/sistema?

- Percentual de tarefas concluídas (geral e por visão ou categoria).
- Quantidade de tarefas atrasadas e quantos dias de atraso.
- Distribuição das tarefas por prioridade e por categoria (onde a pessoa gasta mais esforço).
- Tempo de foco acumulado por tarefa (minutos de Pomodoro).
- Tempo médio entre a criação e a conclusão das tarefas (campos `criadaEm` e `concluidaEm`).
- Carga de trabalho por dia ou semana (tarefas com prazo em cada dia do calendário).

## 9. Quais os dados são administrados no projeto?

- **Tarefa:** id, título, descrição, prazo, prioridade (baixa/média/alta), status (a fazer/em andamento/concluída), categoria, data de criação, data de conclusão, minutos de foco.
- **Subtarefa:** id, texto, feita (sim/não).
- **Categoria:** id, nome, cor.
- **Preferências:** visão, ordenação, modo de exibição (lista/quadro/calendário), tema.
- **Fundo:** tipo (degradê, cor ou imagem), valor, intensidade.
- Nenhum dado pessoal (nome, CPF, e-mail) é coletado.

## 10. Quais os trabalhos relacionados a esta proposta?

- BELLOTTI, Victoria *et al.* What a to-do: studies of task management towards the design of a personal task list manager. *In*: CONFERENCE ON HUMAN FACTORS IN COMPUTING SYSTEMS (CHI), 2004, Viena. **Proceedings** [...]. New York: ACM, 2004. p. 735-742.
- KAMSIN, Amirrudin; BLANDFORD, Ann; COX, Anna L. Personal task management: my tools fall apart when I'm very busy! *In*: CHI '12 EXTENDED ABSTRACTS ON HUMAN FACTORS IN COMPUTING SYSTEMS, 2012, Austin. **Proceedings** [...]. New York: ACM, 2012. p. 1369-1374.
- ANDERSON, David J. **Kanban**: successful evolutionary change for your technology business. Sequim: Blue Hole Press, 2010.

## 11. Referências científicas para o problema

- MACAN, Therese Hoff. Time management: test of a process model. **Journal of Applied Psychology**, v. 79, n. 3, p. 381-391, 1994.
- CLAESSENS, Brigitte J. C. *et al.* A review of the time management literature. **Personnel Review**, v. 36, n. 2, p. 255-276, 2007.
- STEEL, Piers. The nature of procrastination: a meta-analytic and theoretical review of quintessential self-regulatory failure. **Psychological Bulletin**, v. 133, n. 1, p. 65-94, 2007.
- ALLEN, David. **A arte de fazer acontecer**: o método GTD – Getting Things Done. Rio de Janeiro: Sextante, 2016.
- CIRILLO, Francesco. **The Pomodoro Technique**. New York: Currency, 2018.

## 12. Referências científicas para a(s) ferramenta(s)

- PRESSMAN, Roger S.; MAXIM, Bruce R. **Engenharia de software**: uma abordagem profissional. 8. ed. Porto Alegre: AMGH, 2016.
- SOMMERVILLE, Ian. **Engenharia de software**. 10. ed. São Paulo: Pearson Education do Brasil, 2018.
- FLANAGAN, David. **JavaScript**: the definitive guide. 7. ed. Sebastopol: O'Reilly Media, 2020.
- MOZILLA. **Web Storage API**. MDN Web Docs. Disponível em: https://developer.mozilla.org/pt-BR/docs/Web/API/Web_Storage_API. Acesso em: 25 out. 2026.
- OPENJS FOUNDATION. **Test runner**. Node.js Documentation. Disponível em: https://nodejs.org/api/test.html. Acesso em: 25 out. 2026.

> **Antes de entregar:** conferir cada referência no Google Acadêmico (scholar.google.com.br → aspas → ABNT), como pede a legenda do Canvas. Ajustar edição, ano ou páginas se a citação gerada lá for diferente.
