# J&M System — Orçamentos e Recibos

Site estático (HTML, CSS e JavaScript), sem build e sem servidor.

## Arquivos

- `index.html` — o site inteiro (tela de login, interface, desenho do orçamento/recibo, geração de PDF e PNG)
- `catalog.json` — lista de produtos da Digital Sat usada na busca (2.788 itens)
- `header.png` — cabeçalho J&M System usado nos documentos
- `vercel.json` — configuração opcional para a Vercel

## Publicar na Vercel

**Opção 1: pelo site (sem instalar nada)**

1. Entre em https://vercel.com e faça login.
2. Clique em **Add New… → Project**.
3. Envie esta pasta para um repositório no GitHub (pode ser pelo próprio site do GitHub, em "Upload files") e importe esse repositório na Vercel.
4. Em **Framework Preset**, escolha **Other**. Deixe Build Command e Output Directory vazios.
5. Clique em **Deploy**.

**Opção 2: pela linha de comando**

```
npm i -g vercel
cd jm-system
vercel --prod
```

## Observações

- Os orçamentos, recibos, preços digitados e a assinatura enviada ficam salvos no navegador de quem usa (localStorage). Não vão para nenhum servidor e não passam de um navegador para outro.
- Ao mudar de endereço (do Claude para a Vercel), o navegador trata como outro site: o que estava salvo na versão do Claude não aparece na versão da Vercel. A assinatura precisa ser enviada de novo uma vez.
- As fontes vêm do Google Fonts, então é preciso internet para que fiquem iguais ao modelo.
- Para testar no computador, abra um servidor local na pasta (por exemplo `npx serve .` ou `python3 -m http.server`) e acesse pelo navegador. Abrir o `index.html` direto com dois cliques não carrega o catálogo.

## Login

- Usuário: `Juliana` (maiúsculas/minúsculas tanto faz) · Senha: `jm1416`
- Para trocar, edite as constantes `USER` e `PASS` no início do segundo `<script>` do `index.html` (usuário em minúsculas).
- O login fica salvo até fechar a aba; marcando "Manter conectado neste aparelho", fica salvo até clicar em **Sair**.
- Atenção: como o site é estático (sem servidor), o login só impede o acesso casual. Quem abrir o código-fonte da página consegue ver a senha e o catálogo. Não use essa senha em outros lugares.

## Atualização automática do catálogo

- O arquivo `.github/workflows/atualizar-catalogo.yml` roda no GitHub Actions **no dia 1 de janeiro, março, maio, julho, setembro e novembro** (a cada 2 meses).
- Ele lê a lista de produtos da loja Digital Sat (`sitemap_produtos.xml`), tira do `catalog.json` os produtos que saíram da loja e acrescenta os novos, já com o grupo (Câmeras, Redes e Wi-Fi…) escolhido pelo nome do produto.
- Se algo mudou, ele grava o novo `catalog.json` no repositório; se a Vercel estiver ligada ao repositório, o site é publicado de novo sozinho.
- Para rodar na hora: no GitHub, aba **Actions** → **Atualizar catálogo Digital Sat** → **Run workflow**.
- Para rodar no computador: `node scripts/atualizar-catalogo.mjs` (Node 20 ou mais novo).
- Proteção: se a loja estiver fora do ar ou a lista vier com menos de 1.000 produtos, o catálogo não é alterado.
