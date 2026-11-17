# Identidade visual — Ray

**Produto:** Ray — finanças pessoais.  
**Direção:** colagem editorial, serena e funcional. O Ray deve parecer um caderno financeiro pessoal com recortes de papel, não uma página de marketing.

## Paleta

| Uso | Cor |
|---|---|
| Papel de fundo | `#F1EEE7` |
| Papel claro | `#FFFCF6` |
| Texto principal | `#1E2D42` |
| Texto secundário | `#3B4A5F` |
| Texto auxiliar | `#657386` |
| Divisórias | `#D7D0C3` |
| Azul principal | `#003459` |
| Acento de recorte | `#C77A56` |
| Detalhe de papel | `#E1BE80` |

O modo escuro mantém o azul-marinho (`#071B31`) e superfícies azul profundo, com detalhes azul-claro.

## Linguagem visual

- Composição inspirada em recortes de papel, notas sobrepostas e pequenas fitas.
- Cartões com pequenas rotações, camadas e sombras curtas.
- Assimetrias pequenas e intencionais; tabelas, valores e datas permanecem alinhados.
- Textura discreta feita em CSS, sem dependência de imagens externas.
- Símbolo original em SVG composto por folhas e tiras de papel sobrepostas.
- Ícones vetoriais consistentes; não usar emojis como ícones de interface.

## Tipografia e composição

- Títulos com serifas discretas: Baskerville, Iowan Old Style, Palatino ou Georgia.
- Interface com fontes nativas do sistema.
- Hierarquia baseada em tamanho, peso e espaço.
- Contraste alto para valores, datas e informações financeiras.

## Princípios funcionais

- Sem estatísticas inventadas, avaliações fictícias ou depoimentos.
- Ações com rótulos claros e áreas de toque confortáveis.
- Navegação inferior adaptada ao iPhone; opções secundárias ficam no menu “Mais”.
- Formulários devem permanecer utilizáveis com o teclado virtual aberto, com suporte a `visualViewport`.
- Tema claro de papel; modo escuro azul-marinho permanece disponível.
- Interface responsiva para celular e computador.

## Dados

A aparência é independente dos registros financeiros. O armazenamento continua no IndexedDB já utilizado pelo Ray. Não alterar o nome do banco, a versão do schema ou a chave do perfil local durante ajustes visuais.
