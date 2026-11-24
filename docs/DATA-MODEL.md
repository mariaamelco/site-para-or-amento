# Modelo de dados e persistência

## Tipos do domínio

Definidos em `src/lib/types.ts`.

| Tipo | Campos | Observação |
| --- | --- | --- |
| `Mode` | `"orc" \| "rec"` | Aba ativa. |
| `TotMode` | `"auto" \| "man"` | Como o total do orçamento é calculado. |
| `BudgetItem` | `id`, `slug?`, `desc`, `qty`, `unit` | `slug` só existe em item vindo do catálogo. |
| `BudgetDoc` | `cliente`, `data`, `cnpjOn`, `cnpj`, `items`, `unitCol`, `colTitle`, `obs`, `totMode`, `totManual`, `photos` | Documento de orçamento. |
| `ReceiptItem` | `id`, `desc`, `valor` | Item do recibo (sem quantidade). |
| `ReceiptDoc` | `cliente`, `data`, `cnpjOn`, `cnpj`, `items` | Documento de recibo. |
| `CatalogProduct` | `name`, `slug`, `cat`, `key` | `key` é o nome normalizado para busca. |
| `PriceMemo` | `Record<string, string>` | Último valor unitário por `slug`. |
| `Notice` | `text`, `kind` (`"" \| "ok" \| "err"`) | Mensagem de status. |
| `SignatureSettings` | `raw`, `clean`, `name` | Tipo declarado; o `AppShell` mantém esses campos em estados separados. |
| `LoadedImage` | `source`, `width`, `height` | Em `src/lib/document/canvas.ts`; imagem pronta para canvas. |

### Valores padrão

Definidos em `src/lib/documents.ts`:

- Orçamento: cliente vazio, data de hoje, CNPJ desligado, sem itens,
  `unitCol: false`, `colTitle: "DESCRIÇÃO"`, sem observações, `totMode: "auto"`,
  `totManual: ""`, `photos: true`.
- Recibo: cliente vazio, data de hoje, CNPJ desligado e **um item vazio** (o recibo
  sempre abre com uma linha para preencher).

## Dinheiro e quantidade são `string`

O estado guarda o texto digitado, não `number`. Isso preserva vírgula, ponto e
formatação parcial enquanto a pessoa digita. A conversão acontece só na hora de
calcular ou desenhar, sempre com `parseMoney` (`src/lib/format.ts`).

| Entrada | `parseMoney` |
| --- | --- |
| `"R$ 1.234,56"` | `1234.56` |
| `"1234,56"` | `1234.56` |
| `"1.234"` | `1234` (padrão de milhar) |
| `"89.90"` | `89.9` |
| `""`, `"   "`, `null`, `"abc"` | `NaN` |

Regras:

- Remove `R$` e espaços.
- Se houver vírgula: remove pontos e troca a vírgula por ponto.
- Sem vírgula, se casar com `1.234`/`1.234.567`: remove os pontos.
- **Nunca** use `parseFloat` direto em campo digitado.

Formatadores:

- `fmt(n)` → `"1.234,50"` (pt-BR, 2 casas).
- `brl(n)` → `"R$ 1.234,50"`.
- `brDate("2026-02-09")` → `"09/02/2026"`.
- `todayISO()` → data local no formato `yyyy-mm-dd`.
- `maskCNPJ` → máscara progressiva `00.000.000/0000-00`.
- `productId(slug)` → id numérico no fim do slug (`camera-vhd-1120-1234` → `1234`).

## Totais

`src/lib/totals.ts`:

### `budgetTotal(doc)`

- `totMode === "man"`: usa `totManual`; inválido → `0`.
- `totMode === "auto"`: soma `unit × qty` de cada item.
  - `unit` inválido → item ignorado.
  - `qty` inválido **conta como 1**.

### `receiptTotal(doc)`

- Soma os `valor` válidos; ignora vazios e inválidos.

### Subtotais da lista (exibição)

`itemSubtotal` está em `src/app/(home)/budget-items.tsx` e mostra `qty × unit`.
Diferença conhecida: para **quantidade inválida**, o subtotal exibido é `0`,
enquanto `budgetTotal` trata a quantidade como `1`. Ao mexer nessa regra, decida e
documente o comportamento dos dois lugares juntos.

## Chaves do `localStorage`

Definidas no `AppShell` (e em `src/lib/auth.ts` para a sessão). **Não renomeie**
essas chaves sem migração: elas são as mesmas da versão antiga do site e garantir
que quem já usava não perca dados.

| Chave | Conteúdo | Gravada por |
| --- | --- | --- |
| `jm_auth` | `"1"` (sessão e/ou aparelho) | `lib/auth.ts` |
| `jm_mode` | `"orc"` ou `"rec"` | `AppShell` |
| `jm_orc` | `BudgetDoc` em JSON | `AppShell` |
| `jm_rec` | `ReceiptDoc` em JSON | `AppShell` |
| `jm_prices` | `PriceMemo` | `AppShell` |
| `jm_sig_raw` | data URL da assinatura ou `null` | `AppShell` |
| `jm_sig_clean` | `boolean` | `AppShell` |
| `jm_sig_name` | `string` | `AppShell` |

### Regras de leitura

- `loadJSON(key, fallback)` devolve o fallback se a chave não existir ou o JSON for
  inválido.
- Ao iniciar, `orc` e `rec` são mesclados com os padrões
  (`{ ...defaultBudget(), ...saved }`). Isso permite **adicionar campos novos** sem
  quebrar dados antigos.
- Itens salvos são aceitos só se `Array.isArray(saved.items)`.

### Regras de gravação

- Cada campo é gravado por um `useEffect` quando muda (`saveJSON`).
- Falha de armazenamento (cota cheia, modo privado) é silenciosa: o app continua
  funcionando, mas sem salvar.
- Assinatura grande é reduzida antes de gravar (`shrinkSignature`, ver
  [DOCUMENT-ENGINE.md](./DOCUMENT-ENGINE.md)).

### Adicionar um campo novo a um documento

1. Adicionar ao tipo em `src/lib/types.ts`.
2. Adicionar o valor padrão em `src/lib/documents.ts`.
3. Usar no `AppShell`/seção.
4. O efeito de persistência e a mesclagem com padrões já cobrem o resto.
5. Atualizar este documento.

## Autenticação

`src/lib/auth.ts`:

- Credenciais fixas no código (usuário e senha de uso interno). Para trocar, edite
  o arquivo — não replique a senha em documentação nem em outros arquivos.
- `persistAuth(keep)` grava `jm_auth = "1"` em `sessionStorage`; com “manter
  conectado”, também em `localStorage`.
- `isAuthenticated()` aceita qualquer um dos dois.
- `clearAuth()` remove os dois.
- **Não é segurança real**: o código vai para o navegador. Serve apenas para evitar
  acesso casual. Nunca reutilize essa senha em outros serviços.

## Privacidade

- Documentos, preços, nome e assinatura ficam no navegador de quem usa.
- Não há sincronização entre navegadores ou aparelhos.
- A única requisição externa do app é para carregar imagens de produto da loja
  Digital Sat (via `/foto/:id`, repassado por `next.config.ts`).
- “Novo documento” limpa o documento atual, mas **não** apaga `jm_prices` nem a
  assinatura.

## Exemplo de `jm_orc`

```json
{
  "cliente": "Loja Exemplo",
  "data": "2026-11-23",
  "cnpjOn": true,
  "cnpj": "12.345.678/0001-99",
  "items": [
    {
      "id": "i1k9x2",
      "slug": "camera-vhd-1120-1234",
      "desc": "Câmera VHD 1120",
      "qty": "2",
      "unit": "189,90"
    }
  ],
  "unitCol": true,
  "colTitle": "DESCRIÇÃO",
  "obs": "Garantia de 12 meses.",
  "totMode": "auto",
  "totManual": "",
  "photos": true
}
```
