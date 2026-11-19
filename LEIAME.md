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
