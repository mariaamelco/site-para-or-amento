# Componentes

Existem duas categorias, com regras diferentes:

| Categoria | Pasta | Pode conhecer documento? | Quem usa |
| --- | --- | --- | --- |
| **Reutilizável do app** | `src/components/*.tsx` | Não | Qualquer página |
| **Primitiva de UI** | `src/components/ui/*.tsx` | Não | Seções e reutilizáveis |

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

## Promover um componente de seção para reutilizável

Só promova (`src/app/**` → `src/components`) quando:

1. Ele já é usado (ou será usado) em **mais de uma página**; e
2. Ele não depende de tipos/props específicos de um documento além do necessário; e
3. O nome e as props fizerem sentido fora do contexto original.

Ao mover, atualize os imports nos arquivos de página e registre o componente na
tabela de [COMPONENTS.md](./COMPONENTS.md) (este arquivo) e, se a estrutura de
pastas mudar, em [ARCHITECTURE.md](./ARCHITECTURE.md).
