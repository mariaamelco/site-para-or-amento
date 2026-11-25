<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Documentação obrigatória (`docs/`)

- **Antes de alterar qualquer arquivo**, leia `docs/ARCHITECTURE.md` e o documento
  do assunto (`docs/PAGES.md`, `docs/COMPONENTS.md`, `docs/DATA-MODEL.md`,
  `docs/DOCUMENT-ENGINE.md`, `docs/CATALOG.md`, `docs/DEVELOPMENT.md`).
- A documentação em `docs/` é **obrigatória** e prevalece sobre hábitos genéricos.
- Se a alteração mudar comportamento, estrutura de arquivos, tipos, layout do
  documento, catálogo ou processo, atualize o documento afetado **na mesma
  alteração** (tabela em `docs/README.md`).
- Divergência entre código e `docs/` é um defeito: corrija os dois na mesma tarefa.
- O índice e as regras completas estão em `docs/README.md`.

## Organização de arquivos (regra do repositório)

- **Páginas ficam em `src/app`**, cada uma na sua pasta/route group. Ex.: a página
  inicial é `src/app/(home)/page.tsx`.
- **Todas as partes de uma página ficam dentro da pasta dela.** Página nova = pasta
  nova em `src/app/<rota>/`.
- **Só crie arquivo para o que é reaproveitado ou é uma seção da página.** Um
  componente usado por um único arquivo (ex.: `ProductSearch` dentro de
  `budget-form.tsx`) deve ser declarado no topo desse arquivo, fora da função do
  componente chamador — nunca como arquivo próprio.
- **O chrome da rota fica no layout dela** (`src/app/(home)/layout.tsx`): o
  cabeçalho e o fundo da página não pertencem ao shell cliente. O shell cuida só
  do documento, das abas de modo e da exportação.
- **`src/components` só recebe componentes reutilizáveis**, sem conhecimento de
  página. `src/components/ui` é para as primitivas do shadcn/ui e
  `src/components` para os componentes do app (`money-input`, `product-thumb`,
  `auto-grow-textarea`, `brand-logo`).
- **Nunca** crie pastas como `src/components/app` para guardar telas ou seções de
  página: isso é parte da página e pertence a `src/app`.
- **Hooks de tela ficam em `src/lib/hooks/`**, um arquivo por hook com nome simples
  (`catalog.ts`, `flash.ts`, `persisted-state.ts`, …) exportando `use<Nome>`. Eles
  podem usar React, mas só importam outros módulos de `src/lib`.
- Imports entre arquivos da mesma página usam caminho relativo (`./client-fields`);
  o resto usa o alias `@/`.
- Se a página crescer, prefira declarar o componente auxiliar no arquivo do
  chamador; só divida em outro arquivo **dentro da pasta da página** quando o
  componente for usado por mais de um arquivo (nunca em `components`).

## Codificação dos arquivos

- Todo arquivo do projeto é **UTF-8 sem BOM**. O `.editorconfig` já fixa isso.
- No Windows, não use `Get-Content`/`Set-Content` do PowerShell para editar
  código: sem `-Encoding` eles leem como ANSI e gravam os acentos quebrados
  (`orçamento` → `orÃ§amento`). Prefira a ferramenta de edição ou
  `[System.IO.File]::ReadAllText`/`WriteAllText` com `UTF8Encoding($false)`.
