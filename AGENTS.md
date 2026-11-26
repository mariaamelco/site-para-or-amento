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
  página. `src/components/ui` é para as primitivas do shadcn/ui,
  `src/components` para os componentes do app (`money-input`, `product-thumb`,
  `auto-grow-textarea`, `brand-logo`) e `src/components/layout` para as
  especializações de primitiva (ex.: `layout/Form/form.layout.tsx` e
  `layout/Form/input/input.layout.tsx`).
- **Componente de layout não recebe `value`/`onChange`**: lê e grava pelo
  `useFormContext`. A primitiva especializada precisa de teste vitest e de
  cobertura Playwright em `e2e/`.
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

## Validação e testes (regra do repositório)

- **Toda validação/regra de negócio** deve ter um schema **zod** em
  `src/lib/schemas/<assunto>.ts` e um teste correspondente em
  `src/lib/__tests__/lib.test.ts` (`bun test`).
- A validação de entrada do orçamento (`src/lib/schemas/budget.ts`) exige ao menos
  um item e, em cada item, quantidade e valor unitário maiores que zero.
- O formulário completo de cada documento também tem schema
  (`budgetFormSchema`, `receiptFormSchema`): é dele que sai o `isValid` usado para
  habilitar os botões de exportação.
- Regras aplicadas antes de exportar ficam em `AppShell.validate()`; a mesma
  validade é calculada com `formErrors` + `formIsValid` (`src/lib/form.ts`) para
  desabilitar PDF/PNG/copiar.
- Comportamento de tela (mensagem de erro por campo, `aria-invalid`, botões de
  exportação desabilitados) é coberto por **Playwright** em `e2e/*.spec.ts`:
  `bun run test:e2e` builda, serve na porta 3100 e roda os testes.

## Codificação dos arquivos

- Todo arquivo do projeto é **UTF-8 sem BOM**. O `.editorconfig` já fixa isso.
- No Windows, não use `Get-Content`/`Set-Content` do PowerShell para editar
  código: sem `-Encoding` eles leem como ANSI e gravam os acentos quebrados
  (`orçamento` → `orÃ§amento`). Prefira a ferramenta de edição ou
  `[System.IO.File]::ReadAllText`/`WriteAllText` com `UTF8Encoding($false)`.
