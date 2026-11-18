# Ray — finanças pessoais

Um aplicativo pessoal para acompanhar entradas, despesas, cartões, contas e metas com uma interface simples e focada nos registros.

## O que dá para fazer

- Ver o resultado do mês, as entradas e as despesas do período selecionado.
- Registrar, editar, pesquisar e remover lançamentos.
- Organizar cartões e compras parceladas.
- Acompanhar contas e vencimentos.
- Criar metas e registrar contribuições.
- Consultar gráficos e relatórios por categoria.
- Baixar um backup e restaurar os dados em outro aparelho.
- Instalar o site como aplicativo e abrir arquivos de interface já carregados mesmo sem conexão.

## Privacidade e armazenamento

O Ray não pede cadastro ou senha. Os registros financeiros são guardados no IndexedDB do navegador e do perfil local utilizado no aparelho. O código do aplicativo não envia esses registros a um servidor de sincronização.

O site e o repositório são públicos. Qualquer pessoa pode abrir o endereço e usar sua própria cópia local; ela não recebe automaticamente os registros guardados em outro navegador. Por não existir autenticação, alguém que utilize o mesmo aparelho e o mesmo perfil do navegador pode acessar os registros locais.

Isso também significa que:

- Abrir o endereço em outro celular ou computador começa com uma base local independente.
- Os dados não são sincronizados automaticamente entre aparelhos ou navegadores.
- Limpar os dados do navegador pode apagar os lançamentos.
- O backup JSON não é criptografado pelo aplicativo. Guarde-o em local privado.
- Para trocar de aparelho, exporte o backup no aparelho antigo e restaure-o no novo.

Os arquivos públicos da interface são entregues pelo GitHub Pages. Esse serviço de hospedagem é separado do armazenamento financeiro local do aplicativo.

## Uso no iPhone

Abra o endereço pelo Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. Confirme em **Adicionar**. O Ray poderá ser aberto pelo ícone na tela inicial. Essa instalação não cria sincronização em nuvem; os dados continuam vinculados ao armazenamento local do navegador/aparelho.

## Publicar no GitHub Pages

O projeto já inclui o workflow em `.github/workflows/deploy-pages.yml`.

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment**, selecione **GitHub Actions**.
3. Para a primeira publicação, abra **Actions → Deploy to GitHub Pages → Run workflow**.
4. Depois disso, cada envio para `main` fará uma nova publicação automaticamente. O endereço ficará disponível em **Settings → Pages**.

## Desenvolvimento

O site é feito com HTML, CSS e JavaScript nativos. Não precisa de npm nem etapa de build. Para testar recursos como IndexedDB, teclado virtual e instalação PWA, abra o projeto por um servidor local ou por HTTPS.
