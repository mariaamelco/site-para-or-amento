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
- Se algo mudou, ele abre um **pull request para a branch `staging`** com a lista de produtos adicionados e removidos. Depois de mesclado e conferido na staging, o catálogo novo vai para produção junto com a próxima versão.
- Para isso funcionar, em **Settings → Actions → General → Workflow permissions**, marque "Allow GitHub Actions to create and approve pull requests".
- Para rodar na hora: no GitHub, aba **Actions** → **Atualizar catálogo Digital Sat** → **Run workflow**.
- Para rodar no computador: `node scripts/atualizar-catalogo.mjs` (Node 20 ou mais novo).
- Proteção: se a loja estiver fora do ar ou a lista vier com menos de 1.000 produtos, o catálogo não é alterado.

## Fotos dos produtos

- Na busca e na lista de itens, as fotos vêm direto da loja Digital Sat.
- No PDF/PNG do orçamento, as fotos ficam numa coluna própria ("FOTO") à esquerda da descrição e passam pelo endereço `/foto/ID` do próprio site, que a Vercel repassa para a loja (regra `rewrites` no `vercel.json`). Isso é necessário porque o navegador não deixa colocar imagens de outro site dentro do PDF.
- Por isso, **as fotos no PDF só funcionam no site publicado na Vercel**. Testando no computador com `python3 -m http.server`, o orçamento sai sem fotos (o resto funciona normal).
- Para tirar as fotos de um orçamento, desmarque "Mostrar fotos dos produtos no orçamento".

## Produção, staging e versões

| Branch | Para quê | Endereço na Vercel |
|---|---|---|
| `main` | **Produção** — o site que a Juliana usa. Só recebe código por versão. | endereço principal do projeto |
| `staging` | **Testes** — mudanças novas entram aqui primeiro. | endereço fixo da branch `staging` |

Fluxo:

1. Toda mudança entra na `staging` por pull request (inclusive a atualização do catálogo).
2. Testa-se no endereço da staging.
3. Quando estiver pronto: atualiza-se o número da versão (`index.html` e `CHANGELOG.md`), abre-se um pull request de `staging` → `main` e mescla-se.
4. Cria-se a tag da versão na `main` (ex.: `v1.1.0`). O GitHub cria a Release sozinho a partir do `CHANGELOG.md` (`.github/workflows/release.yml`), e a Vercel publica a produção.

### Configuração da Vercel (um projeto, dois endereços)

1. Em https://vercel.com → **Add New… → Project**, importe o repositório `site-para-or-amento`.
2. Framework Preset: **Other**. Build Command e Output Directory vazios. **Deploy**.
3. Em **Settings → Git → Production Branch**, confirme `main`.
4. A branch `staging` ganha um endereço fixo de prévia, no formato `<projeto>-git-staging-<sua-conta>.vercel.app` (aparece em **Deployments**, filtrando pela branch `staging`).
5. (Opcional) Em **Settings → Domains**, adicione um domínio e ligue-o à branch `staging` para ter um endereço mais fácil de lembrar.

Observação: endereços de prévia da Vercel podem pedir login na Vercel ("Vercel Authentication"). Para a staging abrir sem isso, desligue em **Settings → Deployment Protection**.
