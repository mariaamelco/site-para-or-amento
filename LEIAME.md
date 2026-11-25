# J&M System — Orçamentos e Recibos

Aplicação **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**, com componentes [shadcn/ui](https://ui.shadcn.com). O site monta orçamentos e recibos no navegador (o documento A4 é desenhado em `<canvas>`) e exporta em PDF ou PNG — nada é enviado para servidor.

## Como rodar

Requisitos: [Bun](https://bun.com) 1.3 ou mais novo.

```bash
bun install     # instala as dependências
bun run dev     # http://localhost:3000
```

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `bun run build` | gera a versão de produção |
| `bun run start` | serve a versão de produção |
| `bun run typecheck` | confere os tipos (`tsc --noEmit`) |
| `bun run lint` | roda o ESLint |
| `bun test` | roda os testes |

## Estrutura

```
docs/                       documentação técnica obrigatória (arquitetura, páginas,
                            componentes, dados, motor do documento, catálogo)
public/                     arquivos servidos como estão
  catalog.json              produtos da Digital Sat usados na busca (2.788 itens)
  header.png                cabeçalho J&M System usado nos documentos
  fonts/                    Arimo e Open Sans (usadas no documento e na tela)
scripts/atualizar-catalogo.mjs   atualiza o catálogo a partir do sitemap da loja
src/app/                    App Router: layout, estilos globais e páginas
  (home)/                   página inicial (rota /) e as seções dela
                            (orçamento, recibo, prévia, ações)
src/components/             componentes reutilizáveis (money-input, product-thumb…)
  ui/                       componentes do shadcn/ui
src/lib/                    regras do app
  format.ts                 dinheiro, datas, CNPJ, id de produto
  catalog.ts                leitura e busca do catálogo
  totals.ts                 soma dos itens
  storage.ts                persistência no localStorage
  documents.ts              documento novo (orçamento/recibo)
  document/                 desenho do A4 e exportação
    render.ts               escolhe orçamento ou recibo e pagina
    budget.ts, receipt.ts   layout de cada documento
    table.ts, header.ts     tabela, textos e cabeçalho
    photos.ts               fotos dos produtos (recorte de margem branca)
    signature.ts            tratamento da assinatura enviada
    pdf.ts, download.ts     geração do PDF/PNG e nomes dos arquivos
next.config.ts              repasse de /foto/ID para a loja e cache dos assets
```

Componentes de interface ficam em `src/components/ui` (gerados pelo shadcn — `bunx shadcn@latest add <nome>`). As seções de cada página ficam dentro da pasta da própria página em `src/app` — por exemplo, a página inicial em `src/app/(home)/`. Um componente usado por um único arquivo é declarado no topo desse arquivo, não vira arquivo novo. Em `src/components` só ficam componentes reutilizáveis, nunca partes de página.

## Documentação técnica

A pasta `docs/` guarda a documentação **obrigatória** do projeto: arquitetura,
páginas, componentes, dados, motor do documento, catálogo e desenvolvimento.
Comece por [`docs/README.md`](docs/README.md).

Qualquer mudança de comportamento, estrutura ou decisão técnica deve atualizar o
documento correspondente **na mesma alteração**.

## Publicar na Vercel

1. Suba o repositório para o GitHub e importe na Vercel.
2. O preset **Next.js** é detectado sozinho; o comando de build é `bun run build`.
3. Clique em **Deploy**.

O repasse de `/foto/:id` para a loja (necessário para as fotos aparecerem no PDF) está em `next.config.ts`, então funciona igual na Vercel e no `bun run dev`.

## Login

- Usuário: `juliana` (maiúsculas/minúsculas tanto faz) · Senha: `jm1416`
- Para trocar, edite `src/lib/auth.ts`.
- O login fica salvo até fechar a aba; marcando "Manter conectado neste aparelho", fica salvo até clicar em **Sair**.
- Atenção: como não existe servidor de autenticação, o login só impede o acesso casual. Quem abrir o JavaScript da página consegue ver a senha. Não use essa senha em outros lugares.

## Observações

- Os orçamentos, recibos, preços digitados e a assinatura enviada ficam salvos no navegador de quem usa (`localStorage`). Não vão para nenhum servidor e não passam de um navegador para outro.
- As chaves usadas são as mesmas da versão antiga (`jm_orc`, `jm_rec`, `jm_mode`, `jm_prices`, `jm_sig_raw`, `jm_sig_clean`, `jm_sig_name`, `jm_auth`), então quem já usava o site não perde nada ao trocar de versão no mesmo endereço.
- As fontes são servidas pelo próprio site (`public/fonts`), sem depender do Google Fonts.

## Atualização automática do catálogo

- O arquivo `.github/workflows/atualizar-catalogo.yml` roda no GitHub Actions **no dia 1 de janeiro, março, maio, julho, setembro e novembro** (a cada 2 meses).
- Ele lê a lista de produtos da loja Digital Sat (`sitemap_produtos.xml`), tira do catálogo os produtos que saíram da loja e acrescenta os novos, já com o grupo (Câmeras, Redes e Wi-Fi…) escolhido pelo nome do produto.
- Se algo mudou, ele grava o novo `public/catalog.json` no repositório; com a Vercel ligada ao repositório, o site é publicado de novo sozinho.
- Para rodar na hora: no GitHub, aba **Actions** → **Atualizar catálogo Digital Sat** → **Run workflow**.
- Para rodar no computador: `bun scripts/atualizar-catalogo.mjs`.
- Proteção: se a loja estiver fora do ar ou a lista vier com menos de 1.000 produtos, o catálogo não é alterado.

## Fotos dos produtos

- Na busca e na lista de itens, as fotos vêm direto da loja Digital Sat.
- No PDF/PNG do orçamento, as fotos ficam numa coluna própria ("FOTO") à esquerda da descrição e passam pelo endereço `/foto/ID` do próprio site, que repassa para a loja (regra `rewrites` em `next.config.ts`). Isso é necessário porque o navegador não deixa colocar imagens de outro site dentro do PDF.
- Para tirar as fotos de um orçamento, desmarque "Mostrar fotos dos produtos no orçamento".

## Produção, staging e versões

| Branch | Para quê | Endereço na Vercel |
|---|---|---|
| `main` | **Produção** — o site que a Juliana usa. Só recebe código por versão. | endereço principal do projeto |
| `staging` | **Testes** — mudanças novas entram aqui primeiro. | endereço fixo da branch `staging` |

Fluxo:

1. Toda mudança entra na `staging` por pull request (inclusive a atualização automática do catálogo, que abre um PR para `staging` a cada 2 meses).
2. Testa-se no endereço da staging.
3. Quando estiver pronto: atualiza-se `"version"` no `package.json` e a seção nova no `CHANGELOG.md`, abre-se um pull request de `staging` → `main` e mescla-se.
4. Cria-se a versão na `main`: no GitHub, **Releases → Draft a new release → Choose a tag**, digite `v1.1.0` (por exemplo), escolha **Target: main** e **Publish release** (ou envie a tag pelo Git). O GitHub cria a Release sozinho a partir do `CHANGELOG.md` (`.github/workflows/release.yml`, que confere se a tag bate com o `package.json`), e a Vercel publica a produção.

Versões: **vX.Y.Z** — X para mudança grande, Y para função nova, Z para correção.

Configurações no GitHub:

- **Settings → General → Default branch**: `main` (as tarefas agendadas só rodam a partir da branch padrão).
- **Settings → Actions → General → Workflow permissions**: marcar "Allow GitHub Actions to create and approve pull requests" (para o PR do catálogo).

### Vercel (um projeto, dois endereços)

1. Importe o repositório na Vercel (preset **Next.js**, detectado sozinho).
2. Em **Settings → Git → Production Branch**, use `main`.
3. A branch `staging` ganha um endereço fixo de prévia, no formato `<projeto>-git-staging-<sua-conta>.vercel.app` (em **Deployments**, filtrando pela branch `staging`). Opcional: em **Settings → Domains**, ligue um domínio próprio à branch `staging`.
4. Endereços de prévia podem pedir login na Vercel. Para a staging abrir sem isso, desligue em **Settings → Deployment Protection**.
