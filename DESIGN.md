# Design System — Meu Financeiro

**Sistema bloqueado:** decisões abaixo devem permanecer consistentes entre telas.
**Referência:** Hallmark v2.0.0, MIT — https://github.com/Nutlope/hallmark
**Referência fixada:** commit 04977e15f3dfd6ee4b74c887dac3eb52665d6c92.
**Escopo:** app screens — não é uma landing page.
**Direção:** Cobalt adaptado para uma aplicação financeira pessoal clara e acolhedora.

## Produto

O usuário abre o app e registra uma entrada ou despesa. Em seguida, acompanha o saldo do mês, contas próximas e seus lançamentos. O registro financeiro é manual.

O projeto não tem login, senha, conta, API, banco remoto ou sincronização automática. Dados ficam exclusivamente no IndexedDB do navegador/aparelho. Backup JSON é uma ação manual e pertence ao usuário, nunca ao repositório.

## Hierarquia de tela

- Saldo do mês como principal figura.
- Entradas e despesas como duas métricas de apoio.
- Um gráfico de despesas por categoria.
- Um resumo de vencimentos.
- Uma tabela de lançamentos recentes.
- Tabelas antes de galerias para registros. Cartões e metas podem usar cartões quando representam objetos distintos.

Não criar mural de indicadores, medidores decorativos, gráficos de rosca, séries fictícias ou números demonstrativos que pareçam reais.

## Paleta de tokens

Todos os valores de cor devem ser declarados em `:root` no CSS e reutilizados como tokens. Não escrever cores literais nos seletores dos componentes.

- Papel: `--color-paper`, `--color-paper-2`, `--color-paper-3`.
- Texto: `--color-ink`, `--color-ink-2`, `--color-muted`.
- Bordas e campos: `--color-rule`, `--color-field-edge`.
- Azul de ação e seleção: `--color-accent`, `--color-accent-deep`, `--color-accent-wash`, `--color-accent-ink`.
- Semântica: `--color-positive` e `--color-negative`, com suas superfícies suaves.
- Foco: `--color-focus`.

Azul marca apenas ação primária e seleção. Verde significa entrada/sucesso; vermelho significa despesa/erro. Não usar gradientes, roxo, neon, glassmorphism, sombras decorativas, cartões aninhados ou enfeites sem função.

## Tipografia e números

- Uma única família system sans-serif.
- Texto do corpo de 14–16px; tabela e apoio podem usar 12px quando legíveis.
- Labels em caixa normal, sem eyebrow, tracking ou small caps.
- Valores em BRL e datas em pt-BR.
- Valores, percentuais e datas usam números tabulares.
- Não inventar transações, limites, saldo, progresso ou conexão bancária.

## Layout e navegação

- Seis destinos usam navegação superior no desktop e menu recolhível em telas estreitas.
- Sidebar lateral fixa não é o shell padrão deste app.
- Container central com largura máxima e gutters responsivos.
- Tabelas mantêm identificação da linha e ação acessível em telas estreitas.
- Sem overflow horizontal em 320–1920px: `overflow-x: clip` em `html` e `body`.
- Alvos de toque têm pelo menos 44px.
- Controles usam o mesmo sistema de altura, borda e foco.
- Sem animação de largura, altura, top ou left; sem `transition: all`.

## Estados e acessibilidade

- Todo controle interativo tem default, hover, focus-visible, active, disabled, loading, error e success quando o fluxo realmente suporta esses estados.
- Todo dado regional tem estados de carregamento, vazio, erro e conteúdo.
- Labels ficam visíveis e associados aos campos por `for` e `id`.
- Valores monetários aceitam entrada brasileira, como `1.234,56` e `125,90`.
- Ações destrutivas pedem confirmação.
- Movimento respeita `prefers-reduced-motion`.
- Feedback de sucesso só aparece depois de a gravação local ou o download ter sido concluído.

## Privacidade

- Nunca introduzir token, chave, senha ou endpoint remoto para ler/escrever dados financeiros.
- Nunca versionar backups JSON.
- Não prometer que o site é privado: sem autenticação, a publicação é acessível a quem tiver o endereço.
- Nunca adicionar sincronização automática sem redesenhar a arquitetura e explicar as implicações de privacidade.
