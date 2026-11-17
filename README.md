# Ray — finanças pessoais

Um espaço simples para Ray acompanhar o próprio dinheiro, sem excesso de telas ou complicação.

## O que dá para fazer

- Ver o saldo, as entradas e as despesas do mês.
- Registrar, editar, pesquisar e remover lançamentos.
- Organizar cartões e compras parceladas.
- Acompanhar contas e vencimentos.
- Criar metas e registrar contribuições.
- Consultar gráficos e relatórios por categoria.
- Baixar um backup e restaurar os dados em outro aparelho.
- Instalar o site como aplicativo e abrir recursos já carregados mesmo sem conexão.

## Privacidade e armazenamento

O Ray não pede cadastro ou senha. Os lançamentos são guardados no IndexedDB do navegador, no aparelho em que foram criados. Não existe servidor, sincronização automática ou envio dos registros financeiros para este repositório.

Isso também significa que:

- Abrir o endereço em outro celular ou computador começa com os dados vazios.
- Outra pessoa que usar o mesmo perfil do navegador e aparelho poderá acessar os dados locais.
- Limpar os dados do navegador pode apagar os lançamentos.
- Para trocar de aparelho, use **Baixar backup** no aparelho antigo e **Restaurar** no novo.

O repositório e a página publicada são públicos. O que fica no aparelho não é enviado ao GitHub, mas o site não tem autenticação. Use somente em um dispositivo confiável e proteja o arquivo de backup.

## Publicar no GitHub Pages

O projeto já inclui o workflow em `.github/workflows/deploy-pages.yml`.

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment**, selecione **GitHub Actions**.
3. Envie alterações para a branch `main` ou execute o workflow **Deploy to GitHub Pages** manualmente.
4. Depois da primeira execução, o endereço ficará disponível em **Settings → Pages**.

## Desenvolvimento

O site é feito com HTML, CSS e JavaScript nativos. Não precisa de npm, etapa de build, API key ou serviço pago. Para testar recursos como IndexedDB e instalação PWA, abra o projeto por um servidor local ou por HTTPS.
