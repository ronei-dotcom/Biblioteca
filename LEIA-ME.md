# Folio: seu app de leitura

PWA que funciona offline, com biblioteca de PDFs, leitor, cronômetro, páginas lidas, conquistas e estatísticas. Os dados sincronizam entre celular e tablet pelo Supabase.

## 1. Criar o Supabase (uns 5 minutos)

1. Entre em https://supabase.com, crie a conta e clique em **New project**. Escolha um nome, uma senha qualquer e a região mais próxima (South America).
2. No menu da esquerda, abra **SQL Editor > New query**, cole todo o conteúdo do arquivo `supabase-setup.sql` e clique em **Run**. Isso cria as tabelas e o armazenamento dos PDFs.
3. Vá em **Project Settings > API** e copie dois valores:
   - **Project URL**
   - **anon public** (a chave)
4. Abra o arquivo `config.js` e cole os dois valores entre as aspas.

## 2. Publicar no GitHub Pages

1. Crie um repositório no GitHub (pode ser com o nome `folio`).
2. Envie todos os arquivos desta pasta para a raiz do repositório (botão **Add file > Upload files**).
3. Vá em **Settings > Pages**, em *Source* escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e salve.
4. Em um ou dois minutos o app estará em `https://SEU-USUARIO.github.io/folio/`.

## 3. Instalar no celular e no tablet

Abra o endereço no navegador (Chrome no Android, Safari no iPhone/iPad), use **Instalar app** ou **Adicionar à tela inicial**, e pronto. Abra o app uma vez com internet para ele guardar tudo para uso offline.

## Como usar

- **Biblioteca > botão +**: cadastre o livro com título, autor, foto da capa e PDF. O total de páginas é preenchido sozinho. Se você não escolher uma foto, a capa é criada a partir da primeira página do PDF.
- **Botão central**: abre a preparação de leitura (cronometrado de 5 a 120 min ou leitura livre).
- **Dentro do leitor**: o tempo só conta com o app aberto e a tela ativa. Toque no cronômetro para pausar. Deslize para os lados ou use as setas para virar a página. Os botões de lupa dão zoom, e a lua escurece o fundo da página.
- **Ao encerrar**: o app mostra a página onde você parou e as páginas lidas (calculadas pelo avanço). Você pode corrigir antes de salvar.
- **Offline**: o PDF fica salvo no aparelho depois da primeira abertura. Em **Ajustes** há um botão para baixar todos de uma vez. Sessões feitas sem internet sincronizam sozinhas depois.

## Pontos de atenção

- **Sem login, a segurança é fraca.** A chave do `config.js` fica visível no código publicado, e as regras do SQL liberam leitura e escrita para quem tiver essa chave. Na prática, só quem conhecer o endereço do seu app e souber olhar o código consegue mexer, mas não é seguro. Se quiser, é simples adicionar uma senha ou login depois.
- **Limite do plano grátis:** 50 MB por arquivo e cerca de 1 GB no total. Confira no site do Supabase, pois pode mudar.
- **Direitos autorais:** use PDFs que você pode ter. O repositório do GitHub não guarda os livros, só o código.
- **Número da página:** o app usa a numeração do PDF, que pode diferir da numeração impressa no livro (capa, prefácio etc.).
- Ao atualizar o app depois, se o celular continuar mostrando a versão antiga, feche e abra o app duas vezes.
