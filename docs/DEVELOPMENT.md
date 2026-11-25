# Desenvolvimento, testes e publicação

## Requisitos

- [Bun](https://bun.com) **1.3+** (`packageManager: bun@1.3.14`).
- Node.js disponível para os workflows do GitHub Actions (não é necessário para o
  app em si).

```bash
bun install
bun run dev      # http://localhost:3000
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento (Next.js). |
| `bun run build` | Build de produção. |
| `bun run start` | Serve o build de produção. |
| `bun run typecheck` | `tsc --noEmit`. |
| `bun run lint` | ESLint (flat config). |
| `bun test` | Roda `test:bun` e `test:unit`. |
| `bun run test:bun` | `bun test src/lib/__tests__/lib.test.ts`. |
| `bun run test:unit` | `vitest run`. |
| `bunx shadcn@latest add <nome>` | Adiciona primitiva em `src/components/ui`. |
| `bun scripts/atualizar-catalogo.mjs` | Atualiza o catálogo manualmente. |

## Testes

Há dois executores por motivos históricos. **Mantenha a divisão:**

| Executor | Onde o teste fica | Quando usar |
| --- | --- | --- |
| `bun test` | `src/lib/__tests__/*.test.ts` | Regras de negócio: dinheiro, totais, catálogo, nome de arquivo. |
| `vitest` | `src/lib/unit/**/*.test.ts` | Testes unitários isolados (hoje, a busca). |

- O `vitest.config.mts` inclui **apenas** `src/**/unit/**/*.test.ts` e resolve o alias
  `@` para `src`.
- Para um teste novo de busca/regra isolada: crie `src/lib/unit/<assunto>.test.ts`
  e importe com `@/lib/...`.
- Para um teste de regra do app: acrescente em `src/lib/__tests__/lib.test.ts`.
- Teste comportamento introduzido/corrigido pela mudança; não teste constantes nem
  detalhes internos.
- Não crie teste de componente/UI: não há infraestrutura de DOM configurada.

Cobertura atual: `parseMoney`, formatadores, `maskCNPJ`, `productId`, busca do
catálogo, destaque, totais, `documentName`, Sellers/tolerância e as duas camadas da
busca.

## Validação mínima por tipo de mudança

| Mudança | Rodar |
| --- | --- |
| Texto, CSS, ícone | `bun run lint` |
| Regra em `src/lib` | `bun run typecheck` + `bun test` |
| Componente/página | `bun run typecheck` + `bun run lint` |
| Documento/PDF | `bun run typecheck` + `bun test` + conferir prévia e PDF manualmente |
| Catálogo/script | `bun scripts/atualizar-catalogo.mjs` (quando seguro) + `bun test` |
| Versão/deploy | `bun run build` |

Documentação pura não exige validação de código, mas deve passar por revisão de
acentos e links.

## Codificação e integridade de arquivos

- Todo arquivo é **UTF-8 sem BOM**, com **LF**, 2 espaços e newline final
  (`.editorconfig`).
- Preserve acentos exatamente: `orçamento`, `configuração`, `assinatura`.
- No Windows, **não** use `Get-Content`/`Set-Content` do PowerShell para editar
  código: sem `-Encoding`, eles leem como ANSI e gravam `orçamento` como
  `orÃ§amento`. Prefira a ferramenta de edição ou
  `[System.IO.File]::ReadAllText`/`WriteAllText` com `UTF8Encoding($false)`.
- Depois de editar, revise o diff (`git --no-pager diff`) procurando:
  - `Ã£`, `Ã§`, `Ã©`, `â€™`;
  - `$` inesperado dentro de palavras;
  - remoção de trechos não relacionados.

## Next.js 16

A versão usada tem mudanças em relação a versões anteriores. O `AGENTS.md` na raiz
avisa: leia o guia correspondente em `node_modules/next/dist/docs/` antes de mexer
em APIs do framework. O bloco `BEGIN:nextjs-agent-rules` é reescrito pelo
`next dev`; não o remova do diff.

## Organização do código

Regras completas em [ARCHITECTURE.md](./ARCHITECTURE.md) e
[AGENTS.md](../AGENTS.md). Resumo:

- Página = pasta em `src/app`; seções na mesma pasta.
- `src/components` só reutilizável; `src/components/ui` só primitivas.
- Regra de negócio em `src/lib`.
- Imports relativos dentro da página; `@/` para o resto.
- TypeScript estrito, sem `any` novo.
- Textos de interface em português; identificadores em inglês.

## Fluxo de branches e versões

| Branch | Papel |
| --- | --- |
| `main` | **Produção**. Só recebe código por versão. |
| `staging` | **Testes**. Recebe PRs primeiro, inclusive o catálogo automático. |

Fluxo:

1. Mudança entra na `staging` por pull request.
2. Testa-se no endereço fixo da `staging` na Vercel.
3. Para publicar:
   - atualizar `"version"` em `package.json`;
   - adicionar a seção da versão no topo de `CHANGELOG.md`;
   - abrir PR `staging` → `main` e mesclar.
4. Criar a tag/Release `vX.Y.Z` apontando para `main`
   (GitHub → Releases → Draft a new release, ou `git tag`).
5. O workflow `.github/workflows/release.yml`:
   - confere se a tag bate com `package.json`;
   - extrai as notas da seção correspondente do `CHANGELOG.md`;
   - cria a Release ou apenas preenche o texto, se ela já existir.

Versionamento **vX.Y.Z**:

- **X**: mudança grande ou que altera o modo de usar.
- **Y**: função nova.
- **Z**: correção/ajuste pequeno.

`APP_VERSION` (`src/lib/version.ts`) lê a versão direto do `package.json`; o número
aparece na tela de login e na barra de ações.

## Deploy (Vercel)

- Um único projeto, com **Production Branch = `main`**.
- A `staging` ganha uma URL fixa de prévia; opcionalmente um domínio próprio.
- Preset Next.js detectado automaticamente; build `bun run build`.
- O rewrite `/foto/:id` e os headers de cache estão em `next.config.ts`, então
  funcionam igual em produção e no dev.
- Configurações no GitHub:
  - default branch `main`;
  - Actions com permissão para criar/aprovar pull requests (necessário para o PR do
    catálogo).
- Se as URLs de prévia pedirem login, desligue a Deployment Protection para a
  `staging`.

## Segurança e privacidade

- A autenticação é **cosmética** (credenciais no bundle). Não use a mesma senha em
  outros serviços. Detalhes em [DATA-MODEL.md](./DATA-MODEL.md).
- Não há variáveis de ambiente, API routes ou banco. Não introduza segredos no
  repositório.
- Dados de cliente, preços e assinatura ficam no `localStorage`; não são enviados a
  servidor.
- As únicas requisições externas são as imagens da loja Digital Sat via `/foto/:id`.

## Problemas comuns

| Sintoma | Verifique |
| --- | --- |
| Página em branco no início | `(home)/page.tsx` deve carregar `app-shell` com `ssr: false` (`dynamic`). |
| Acentos quebrados no código | Encoding do arquivo; regrave como UTF-8 sem BOM. |
| Fontes diferentes no PDF | Fontes em `public/fonts` e `ensureFonts` antes de renderizar. |
| Foto some no PDF | `/foto/:id` em `next.config.ts`, id no slug e cache de fotos. |
| Catálogo não carrega | `/catalog.json` em `public` e `fetch` ao carregar o app. |
| Login em loop | Cookie `jm_auth` bloqueado no navegador ou matcher do proxy sem `/auth`. |
| Dados não persistem | Modo privado/cota cheia: o app funciona, mas não salva. |
| Build falha por tipos | `bun run typecheck` antes de `bun run build`. |
| Release falha | Tag `vX.Y.Z` diferente de `"version"` no `package.json`. |

## Manutenção desta documentação

Ao concluir uma mudança, revise a tabela “Quando a documentação precisa mudar” em
[README.md](./README.md) e atualize o arquivo correspondente. Se a mudança criar uma
regra nova de arquitetura, registre-a em [ARCHITECTURE.md](./ARCHITECTURE.md).
