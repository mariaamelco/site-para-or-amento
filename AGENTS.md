<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Organização de arquivos (regra do repositório)

- **Páginas ficam em `src/app`**, cada uma na sua pasta/route group. Ex.: a página
  inicial é `src/app/(home)/page.tsx`.
- **Todas as partes de uma página ficam dentro da pasta dela**, em arquivos
  separados (`src/app/(home)/budget-form.tsx`, `budget-items.tsx`,
  `product-search.tsx`, …). Página nova = pasta nova em `src/app/<rota>/`.
- **`src/components` só recebe componentes reutilizáveis**, sem conhecimento de
  página. `src/components/ui` é para as primitivas do shadcn/ui e
  `src/components` para os componentes do app (`money-input`, `product-thumb`,
  `auto-grow-textarea`, `brand-logo`).
- **Nunca** crie pastas como `src/components/app` para guardar telas ou seções de
  página: isso é parte da página e pertence a `src/app`.
- Imports entre arquivos da mesma página usam caminho relativo (`./budget-items`);
  o resto usa o alias `@/`.
- Se uma página crescer, divida em mais arquivos **dentro da pasta dela**, não em
  `components`.

## Codificação dos arquivos

- Todo arquivo do projeto é **UTF-8 sem BOM**. O `.editorconfig` já fixa isso.
- No Windows, não use `Get-Content`/`Set-Content` do PowerShell para editar
  código: sem `-Encoding` eles leem como ANSI e gravam os acentos quebrados
  (`orçamento` → `orÃ§amento`). Prefira a ferramenta de edição ou
  `[System.IO.File]::ReadAllText`/`WriteAllText` com `UTF8Encoding($false)`.
