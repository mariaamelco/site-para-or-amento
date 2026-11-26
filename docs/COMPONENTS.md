# Componentes

Existem três categorias, com regras diferentes:

| Categoria | Pasta | Pode conhecer documento? | Quem usa |
| --- | --- | --- | --- |
| **Reutilizável do app** | `src/components/*.tsx` | Não | Qualquer página |
| **Layout (especializado)** | `src/components/layout/**` | Não | Seções e reutilizáveis |
| **Primitiva de UI** | `src/components/ui/*.tsx` | Não | Seções, reutilizáveis e layouts |

Um **layout** é a especialização de uma primitiva (ou de um reutilizável) para uma
funcionalidade do projeto. A primitiva continua genérica; o layout sabe qual campo
do formulário editar, qual variante usar e quando mostrar erro. Regra da
especialização: a primitiva precisa de **teste vitest** da lógica que isola e de
**teste Playwright** (`e2e/`) cobrindo os estados que o layout decide.

Se o componente só existe para uma página, ele **não** pertence a
`src/components`: fica na pasta da página (ver [PAGES.md](./PAGES.md)).

## Componentes reutilizáveis

### `MoneyInput` — `money-input.tsx`

Campo de dinheiro com “R$” fixo à esquerda.

| Prop | Tipo | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `value` | `string` | sim | Valor como texto (o estado guarda string). |
| `onValueChange` | `(value: string) => void` | sim | Recebe o texto digitado, sem conversão. |
| `className` | `string` | não | Aplicado ao container. |
| demais props | `ComponentProps<Input>` | não | Repassadas ao `Input` (exceto `onChange`). |

- `inputMode="decimal"`, altura `h-10` e `pl-9` para o prefixo.
- **Não** formata o número enquanto digita; a conversão é feita depois por
  `parseMoney`.

### `AutoGrowTextarea` — `auto-grow-textarea.tsx`

`Textarea` que cresce com o conteúdo.

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `value` | `string` | — | Conteúdo controlado. |
| `maxHeight` | `number` | `160` | Altura máxima em px antes de rolar. |
| `className` | `string` | — | Somado às classes base. |

- Recalcula a altura em um efeito a cada `value`/`maxHeight`.
- `rows={1}`, `resize-none` e `overflow-hidden`.
- Usado nas descrições dos itens, observações e assinatura.

### `ProductThumb` — `product-thumb.tsx`

Miniatura quadrada da foto do produto da Digital Sat.

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `slug` | `string \| undefined` | — | Slug do produto; o id numérico vem do fim dele. |
| `size` | `number` | `120` | Tamanho solicitado à loja via `productImageUrl`. |
| `className` | `string` | — | Somado às classes base (`size-12`). |

- Sem id no slug → retorna `null`.
- `loading="lazy"`, `decoding="async"`, `referrerPolicy="no-referrer"`.
- Em erro, troca `src` por `NO_IMAGE` (SVG cinza) uma única vez.
- A imagem da **prévia/PDF** não usa este componente: o motor baixa via `/foto/:id`
  e desenha no canvas (ver [DOCUMENT-ENGINE.md](./DOCUMENT-ENGINE.md)).

### `BrandLogo` — `brand-logo.tsx`

Logotipo em SVG + texto “J&M SYSTEM / SEGURANÇA E TECNOLOGIA”.

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `color` | `string` | `"#fff"` | Cor do traço/ícone do escudo. |

- Textos em branco fixo; pensado para fundo escuro (cabeçalho e login).
- Usado no cabeçalho do app e na tela de login.

### `AppHeader` — `app-header.tsx`

Cabeçalho das rotas protegidas, usado por `(home)/layout.tsx` e
`historico/layout.tsx`.

- À esquerda, `BrandLogo`; à direita, o atalho entre as telas e “Sair”.
- Não recebe props: lê a rota com `usePathname`. Em `/` mostra o ícone `History`
  (leva a `/historico`); em `/historico` mostra `FileText` (volta para `/`), com
  `aria-label` e `title` correspondentes.
- “Sair” chama `clearAuth()` e usa `window.location.replace(AUTH_ROUTE)` para
  descartar o cache do cliente.

## Componentes de layout (`src/components/layout`)

Componentes que pegam uma primitiva e a especializam para o app. Nunca recebem
`value`/`onChange`: leem e gravam no contexto do formulário.

### `Form` + `useFormContext` — `layout/Form/form.layout.tsx`

Contexto de formulário tipado por um schema zod. `values` continua sendo do
chamador; o contexto calcula `dirty` e `errors`.

| Prop | Tipo | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `schema` | `z.ZodType<T>` | sim | Tipa `values` e define o erro de cada campo. |
| `values` | `T` | sim | Valores atuais, sem cópia interna. |
| `onValuesChange` | `(patch: Partial<T>) => void` | sim | Recebe só o campo alterado. |
| `idPrefix` | `string` | não | Prefixo dos ids gerados (`<prefixo>-<campo>`). |
| `children` | `ReactNode` | sim | Campos do formulário. |

O que `useFormContext<T>()` expõe:

| Membro | Tipo | Descrição |
| --- | --- | --- |
| `values` | `T` | Valores atuais. |
| `dirty` | `Partial<Record<keyof T, boolean>>` | Campos já editados. |
| `errors` | `Partial<Record<keyof T, string>>` | Primeiro erro de cada campo. |
| `isValid` | `boolean` | `true` quando nenhum campo tem erro (independe de `dirty`). |
| `idPrefix` | `string \| undefined` | Prefixo dos ids gerados. |
| `setField` | `(name, value) => void` | Grava um campo e marca como editado. |
| `isInvalid` | `(name) => boolean` | Editado **e** com erro no schema. |

- `useFormValidity()` devolve só o `isValid`, para quem não precisa do resto
  (ex.: habilitar botões de exportação).
- A lógica pura (erros, `dirty`, campo inválido, formulário válido) está em
  `src/lib/form.ts` e é coberta por `src/lib/unit/form.test.ts`.
- O contexto não persiste nada: quem grava no `localStorage` continua sendo
  `AppShell` via `usePersistedState`.
- Cada seção cria o seu: `ClientFields` (`clientFieldsSchema`) e cada item de
  `BudgetItems` (`budgetItemSchema`). Contextos aninhados não se misturam — o
  input usa sempre o `Form` mais próximo.

### `useFieldBinding` + `FieldError` — `layout/Form/field.tsx`

Ligação de um campo ao contexto, compartilhada pelos layouts de input: devolve
`fieldId` (respeitando `idPrefix` ou um `id` explícito), `errorId`, `invalid`,
`error`, `value` e `setValue`. `FieldError` renderiza a mensagem em `role="alert"`
abaixo do input. `TextField<T>` (chaves com valor `string`) também mora aqui.

### `InputLayout` — `layout/Form/input/input.layout.tsx`

`Input` especializado para o formulário.

| Prop | Tipo | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `name` | `keyof T` (valor `string`) | sim | Campo editado por este input. |
| `label` | `string` | sim | Rótulo do campo. |
| `size` | `"default" \| "sm"` | não | Altura do input (`h-10`/`h-9`) e tamanho do rótulo. |
| `id` | `string` | não | Sobrescreve o id gerado. |
| `format` | `(value: string) => string` | não | Transforma o texto antes de gravar (ex.: `maskCNPJ`). |
| `className` | `string` | não | Aplicado ao container. |
| demais props | `ComponentProps<"input">` | não | Repassadas ao `Input` (`type`, `inputMode`, `placeholder`, `autoComplete`). |

- Variantes: `default` e `invalid` (`data-variant` no container). A variante
  `invalid` aplica `aria-invalid`, `aria-describedby` e mostra a mensagem do schema
  em `role="alert"` — só depois que o campo foi editado.
- Perde o foco visual de erro ao corrigir: o erro vem do schema, não de estado
  local do input.

### `MoneyInputLayout` — `layout/Form/input/money-input.layout.tsx`

`MoneyInput` (primitiva com o `R$` fixo) especializado para o formulário. Mesmas
props de `InputLayout` (sem `format`/`type`), com o mesmo comportamento de erro:
`aria-invalid` chega ao `input` interno e a mensagem aparece embaixo. É o que os
itens do orçamento usam no valor unitário.

## Primitivas de UI (`src/components/ui`)

Geradas pelo shadcn/ui no estilo **`base-nova`**, sobre **Base UI**
(`@base-ui/react`). Não têm regra de negócio; podem receber ajustes visuais pontuais.

Componentes instalados hoje:

| Arquivo | Exporta |
| --- | --- |
| `badge.tsx` | `Badge`, `badgeVariants` |
| `button.tsx` | `Button`, `buttonVariants` |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `CardDescription`, `CardAction` |
| `checkbox.tsx` | `Checkbox` |
| `dialog.tsx` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogOverlay`, `DialogPortal` |
| `dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` |
| `input.tsx` | `Input` |
| `label.tsx` | `Label` |
| `select.tsx` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` |
| `separator.tsx` | `Separator` |
| `tabs.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants` |
| `textarea.tsx` | `Textarea` |

### Adicionar uma primitiva

```bash
bunx shadcn@latest add <nome>
```

- A configuração está em `components.json` (alias `@/components`, `@/lib/utils`).
- O arquivo entra em `src/components/ui/` e os estilos globais em
  `src/app/globals.css`.
- Depois de adicionar, **atualize a tabela acima** neste documento.
- Se a primitiva for especializada por um layout, cubra com um teste em `e2e/` os
  estados que o layout expõe (válido, inválido, mensagem de erro).

### Variantes do `Button`

- `variant`: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.
- `size`: `default` (`h-8`), `xs` (`h-6`), `sm` (`h-7`), `lg` (`h-9`), `icon`
  (`size-8`), `icon-xs`, `icon-sm`, `icon-lg`.
- O código costuma ajustar altura com `className` (`h-9`, `h-10`, `h-12`) em
  botões de ação principais.
- Classes de cor da marca usam o token `brand` (`text-brand`, `bg-brand/10`).

## Convenções

- Todo componente interativo novo começa com `"use client"` (o app já é client-side).
- Props tipadas com `interface Props` logo acima do componente.
- Callbacks nomeados como `onAlgo`; handlers internos como `handleAlgo`.
- Combinar classes com `cn()`; não montar string de classe condicional manualmente
  (exceção histórica: `receipt-form.tsx` e `app-shell.tsx`).
- Ícones do `lucide-react` sem tamanho explícito herdam `size-4` do botão; fora de
  botões, use `className="size-4"` (ou similar).
- Textos visíveis, `aria-label` e mensagens em português.
- Não colocar `parseMoney`, totais, `localStorage` ou chamadas ao canvas dentro de
  componentes de UI.
- Componentes de layout não recebem `value`/`onChange`: leem e gravam pelo
  `useFormContext`.
- Toda primitiva especializada por um layout precisa de cobertura em `e2e/`
  (Playwright), com os estados que o layout decide.

## Promover um componente de seção para reutilizável

Só promova (`src/app/**` → `src/components`) quando:

1. Ele já é usado (ou será usado) em **mais de uma página**; e
2. Ele não depende de tipos/props específicos de um documento além do necessário; e
3. O nome e as props fizerem sentido fora do contexto original.

Ao mover, atualize os imports nos arquivos de página e registre o componente na
tabela de [COMPONENTS.md](./COMPONENTS.md) (este arquivo) e, se a estrutura de
pastas mudar, em [ARCHITECTURE.md](./ARCHITECTURE.md).
