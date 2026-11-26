# Modelo de dados e persistência

## Tipos do domínio

Definidos em `src/lib/types.ts`.

| Tipo | Campos | Observação |
| --- | --- | --- |
| `Mode` | `"orc" \| "rec"` | Aba ativa. |
| `TotMode` | `"auto" \| "man"` | Como o total do orçamento é calculado. |
| `BudgetItem` | `id`, `slug?`, `desc`, `qty`, `unit` | `slug` só existe em item vindo do catálogo; `qty` e `unit` são validados por zod (maior que zero). |
| `BudgetDoc` | `cliente`, `data`, `cnpjOn`, `cnpj`, `items`, `unitCol`, `colTitle`, `obs`, `totMode`, `totManual`, `photos` | Documento de orçamento. |
| `ReceiptItem` | `id`, `desc`, `valor` | Item do recibo (sem quantidade). |
| `ReceiptDoc` | `cliente`, `data`, `cnpjOn`, `cnpj`, `items` | Documento de recibo. |
| `CatalogProduct` | `name`, `slug`, `cat`, `key` | `key` é o nome normalizado para busca. |
| `PriceMemo` | `Record<string, string>` | Último valor unitário por `slug`. |
| `Notice` | `text`, `kind` (`"" \| "ok" \| "err"`) | Mensagem de status. |
| `SignatureSettings` | `raw`, `clean`, `name` | Tipo declarado; o `AppShell` mantém esses campos em estados separados. |
| `HistoryEntry` | `id`, `savedAt`, `cliente`, `data`, `total`, `signature`, `company?`, `mode` + `doc` | União discriminada por `mode`: guarda o orçamento ou o recibo inteiro para gerar o PDF de novo. Ver [Histórico](#histórico-indexeddb). |
| `LoadedImage` | `source`, `width`, `height` | Em `src/lib/document/canvas.ts`; imagem pronta para canvas. |
| `CompanyId` | `"jm" \| "vision"` | Em `src/lib/companies.ts`; empresa que emite o documento. Ver [Empresas](#empresas). |

## Empresas

`src/lib/companies.ts` lista as empresas (`COMPANY_IDS`, `COMPANIES`) e
`getCompany(id)` devolve os dados de uma delas:

| Campo | Uso |
| --- | --- |
| `name` | Nome no seletor, na tela de login e no card do histórico. |
| `phone`, `email`, `cnpj` | Linhas do rodapé do documento (`drawFooter`). Texto vazio não é impresso: a Vision Tech não tem e-mail no rodapé e usa o mesmo CNPJ da J&M. |
| `signer` | Nome padrão abaixo da assinatura do recibo. |
| `headerSrc` | Cabeçalho do documento em `public/` (`/header.png` na J&M, `/header-vision-tech.png` na Vision Tech). |
| `titleColor` | Cor de “ORÇAMENTO”/“RECIBO” sobre a faixa (branco na faixa vermelha, quase preto na prata). |
| `fallback` | Cores do cabeçalho desenhado quando a imagem não carrega. |
| `accent` | Cor da borda do cabeçalho do site e da tela de login. |

- **Regra (zod)**: `companyIdSchema` (`src/lib/schemas/company.ts`) aceita só as
  empresas cadastradas. `parseCompanyId(valor)` lê o que veio do `localStorage` ou
  do histórico e, se faltar ou for desconhecido, devolve **`"jm"`** — que era a
  única empresa antes da troca existir. Testes em `src/lib/__tests__/lib.test.ts`.
- A escolha fica em `jm_company` e é compartilhada por `useCompany`
  (`src/lib/hooks/company.ts`); `saveCompany` dispara o evento `jm-company-change`
  para o cabeçalho e a tela se atualizarem juntos.
- **Assinatura por empresa**: cada empresa tem imagem, “remover fundo” e nome de
  assinante próprios (`signatureKeys(company)`). A J&M usa as chaves antigas, sem
  sufixo; a Vision Tech usa o sufixo `_vision`.
- Para cadastrar outra empresa: acrescentar o id em `COMPANY_IDS`, os dados em
  `COMPANIES`, o cabeçalho (1800×596 px, mesmo desenho) em `public/` e o caso
  correspondente em `BrandLogo`.

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

`itemSubtotal` está em `src/app/(home)/budget-form.tsx` e mostra `qty × unit`.
Diferença conhecida: para **quantidade inválida**, o subtotal exibido é `0`,
enquanto `budgetTotal` trata a quantidade como `1`. Ao mexer nessa regra, decida e
documente o comportamento dos dois lugares juntos.

## Validação do orçamento (`src/lib/schemas/budget.ts`)

**Regra do repositório:** toda validação/regra de negócio tem um arquivo zod em
`src/lib/schemas/<assunto>.ts` e um teste correspondente (ver
[DEVELOPMENT.md](./DEVELOPMENT.md#testes)).

| Regra | Schema | Mensagem |
| --- | --- | --- |
| Lista com pelo menos um item | `budgetItemsSchema` (`.min(1)`) | “Adicione pelo menos um item ao orçamento.” |
| Quantidade maior que zero | `budgetItemSchema.qty` | “Quantidade deve ser maior que zero.” |
| Valor unitário maior que zero | `budgetItemSchema.unit` | “Valor unitário deve ser maior que zero.” |
| Produto do catálogo entra uma vez | `addBudgetProductSchema` | “Este produto já está adicionado ao orçamento.” |

- `validateBudgetItems(items)` devolve `{ ok: true }` ou
  `{ ok: false, message, fieldId? }`. Quando o erro é de um item, a mensagem é
  prefixada com `Item N:`. `fieldId` aponta para o campo (`qty-<id>` ou
  `unit-<id>`) para receber foco.
- `budgetFormSchema` junta o bloco de cliente (`clientFieldsShape`) com
  `budgetItemsSchema`: é o que o `AppShell` usa para dizer se o documento está
  válido (`formErrors` + `formIsValid`) e habilitar a exportação.
- Cada linha de `BudgetItems` usa `budgetItemSchema` no próprio `Form`, então a
  mensagem de erro aparece embaixo do input daquele item.
- `AppShell.validate()` chama essa função antes de exportar: item inexistente,
  quantidade zero/negativa/vazia ou valor unitário zero/negativo/vazio bloqueiam a
  exportação e o campo inválido recebe foco.
- `addedProductSlugs(items)` alimenta o estado “Já adicionado” da busca.
- `canAddBudgetProduct(slug, items)` aplica a regra de duplicidade e é chamada em
  `BudgetForm.addProduct`.
- Itens personalizados e de mão de obra (sem `slug`) seguem a validação normal de
  quantidade e valor.

## Validação do cliente (`src/lib/schemas/client.ts`)

Campos de cliente/data/CNPJ, usados pelo `Form` de `ClientFields` e pelo schema do
documento inteiro (`budgetFormSchema`/`receiptFormSchema`). `clientFieldsShape` (o
objeto de campos) e `requireCnpjWhenOn` são
reaproveitados pelos schemas de documento, para não duplicar a regra do CNPJ.

| Regra | Schema | Mensagem |
| --- | --- | --- |
| Nome do cliente obrigatório | `clientFieldsSchema.cliente` (`trim().min(1)`) | “Informe o nome do cliente.” |
| Data obrigatória | `clientFieldsSchema.data` (`min(1)`) | “Informe a data.” |
| CNPJ obrigatório quando `cnpjOn` | `superRefine` | “Informe o CNPJ do cliente.” |
| CNPJ com 14 dígitos (quando preenchido) | `cnpjSchema` | “Informe os 14 dígitos do CNPJ.” |

- O CNPJ é validado mascarado (`00.000.000/0000-00`): a checagem conta apenas os
  dígitos. Vazio só é erro quando `cnpjOn` está ligado.
- `ClientFieldsValue` (`z.infer`) tipa o contexto do formulário; erros por campo
  são derivados com `formErrors` (`src/lib/form.ts`).
- `AppShell.validate()` continua exigindo o cliente antes de exportar e foca
  `o-cliente`/`r-cliente`.

## Validação do recibo (`src/lib/schemas/receipt.ts`)

| Regra | Schema | Mensagem |
| --- | --- | --- |
| Lista com pelo menos um item | `receiptItemsSchema` (`.min(1)`) | “Adicione pelo menos um item ao recibo.” |
| Nome do cliente obrigatório | `clientFieldsShape.cliente` | “Informe o nome do cliente.” |
| CNPJ obrigatório quando `cnpjOn` | `superRefine` (`requireCnpjWhenOn`) | “Informe o CNPJ do cliente.” |

- `receiptItemSchema` hoje só estrutura `{ id, desc, valor }` (descrição e valor
  não são obrigatórios no recibo).
- `receiptFormSchema` (cliente + itens) é o schema que o `AppShell` usa para
  calcular a validade do recibo e habilitar a exportação.

## Chaves do `localStorage`

Definidas em `STORAGE_KEYS` (`src/lib/storage.ts`). **Não renomeie** essas chaves
sem migração: elas são as mesmas da versão antiga do site e garantir que quem já
usava não perca dados.

| Chave | Conteúdo | Gravada por |
| --- | --- | --- |
| `jm_mode` | `"orc"` ou `"rec"` | `AppShell` |
| `jm_orc` | `BudgetDoc` em JSON | `AppShell` |
| `jm_rec` | `ReceiptDoc` em JSON | `AppShell` |
| `jm_prices` | `PriceMemo` | `AppShell` |
| `jm_sig_raw` | data URL da assinatura ou `null` | `AppShell` |
| `jm_sig_clean` | `boolean` | `AppShell` |
| `jm_sig_name` | `string` | `AppShell` |
| `jm_sig_raw_vision`, `jm_sig_clean_vision`, `jm_sig_name_vision` | assinatura da Vision Tech (mesmos formatos) | `AppShell` |
| `jm_doc_id` | id do documento em edição (`string`) | `useDocumentId` |
| `jm_company` | `"jm"` ou `"vision"` | `useCompany` / `saveCompany` (login, cabeçalho, “Abrir” no histórico) |

### Regras de leitura

- `loadJSON(key, fallback)` devolve o fallback se a chave não existir ou o JSON for
  inválido.
- Ao iniciar, `orc` e `rec` são mesclados com os padrões
  (`{ ...defaultBudget(), ...saved }`). Isso permite **adicionar campos novos** sem
  quebrar dados antigos.
- Itens salvos são aceitos só se `Array.isArray(saved.items)`.

### Regras de gravação

- Cada campo é gravado por `usePersistedState` (`src/lib/hooks/persisted-state.ts`),
  que chama `saveJSON` num `useEffect` sempre que o valor muda.
- Falha de armazenamento (cota cheia, modo privado) é silenciosa: o app continua
  funcionando, mas sem salvar.
- Assinatura grande é reduzida antes de gravar (`shrinkSignature`, ver
  [DOCUMENT-ENGINE.md](./DOCUMENT-ENGINE.md)).

### Adicionar um campo novo a um documento

1. Adicionar ao tipo em `src/lib/types.ts`.
2. Adicionar o valor padrão em `src/lib/documents.ts`.
3. Usar no `AppShell`/seção.
4. A mesclagem com padrões (`restore` em `usePersistedState`) já cobre o resto.
5. Atualizar este documento.

## Histórico (`IndexedDB`)

O histórico vive em **IndexedDB**, não no `localStorage`: são muitos documentos e
cada um carrega o conteúdo completo. A biblioteca é o **Dexie**
(`src/lib/history-store.ts`).

```ts
// banco "jm_history", tabela "entries"
"[mode+id], savedAt"
```

| Campo | Para que serve |
| --- | --- |
| `[mode+id]` | Chave composta: o mesmo id pode ter um orçamento e um recibo. |
| `id` | Id do documento exportado (`jm_doc_id`); salvar de novo **atualiza** a entrada em vez de duplicar. |
| `savedAt` | ISO completo da gravação; índice da ordenação e base do prazo. |
| `cliente`, `data`, `total` | Cópia dos dados que o card mostra, para a lista não abrir o payload. |
| `signature` | `SignatureSettings` usada no documento; sem ela o recibo redesenhado sairia sem assinatura. |
| `company` | Empresa que emitiu o documento. Opcional: entradas gravadas antes da troca de empresa não têm e são lidas como J&M (`parseCompanyId`). |
| `doc` | `BudgetDoc` ou `ReceiptDoc` completo — o que basta para **gerar o PDF de novo**. |

- **O arquivo nunca é guardado**: PDF e PNG são gerados sob demanda a partir de
  `doc` + `signature` (`renderExportPages`).
- **TTL de 30 dias** (`HISTORY_TTL_DAYS` em `src/lib/schemas/history.ts`), porque
  o IndexedDB não expira sozinho: `pruneHistoryEntries` apaga `savedAt` anterior
  ao corte a cada leitura/gravação, e `historyEntryExpired` descarta o que sobrou.
- **Quando grava**: ao baixar o PDF, baixar o PNG ou copiar a imagem
  (`saveToHistory` no `AppShell`). Falha de IndexedDB é silenciosa para não
  quebrar a exportação.
- **Quando nasce um id novo**: na primeira visita (`storedDocumentId`) e a cada
  “Novo documento” (`renewDocumentId`). “Abrir” no histórico devolve o id da
  entrada, então reexportar aquele documento atualiza o mesmo card.
- **Leitura tolerante**: `historyEntrySchema` valida o que foi lido com regras
  mais frouxas que as do formulário, para uma entrada antiga não desaparecer por
  causa de uma validação que mudou.
- Entradas inválidas ou expiradas são ignoradas na listagem (não derrubam a
  página).

## Autenticação

`src/lib/auth.ts`:

- Credenciais fixas no código (usuário e senha de uso interno). Para trocar, edite
  o arquivo — não replique a senha em documentação nem em outros arquivos.
- `persistAuth(keep)` grava o cookie `jm_auth=1` em `path=/` com `SameSite=Lax`.
  Sem “manter conectado” é um cookie de sessão; com a opção marcada, vale por
  30 dias. Em HTTPS o cookie recebe `Secure`.
- `clearAuth()` apaga o cookie (`max-age=0`).
- O cookie é a única fonte de verdade: `src/proxy.ts` o lê no servidor para decidir
  entre `/` e `/auth`, e não há mais `sessionStorage`/`localStorage` para a sessão.
- **Não é segurança real**: o código vai para o navegador. Serve apenas para evitar
  acesso casual. Nunca reutilize essa senha em outros serviços.

## Privacidade

- Documentos, preços, nome, assinatura e o histórico ficam no navegador de quem
  usa.
- Não há sincronização entre navegadores ou aparelhos.
- A única requisição externa do app é para carregar imagens de produto da loja
  Digital Sat (via `/foto/:id`, repassado por `next.config.ts`).
- “Novo documento” limpa o documento atual e gera um id novo, mas **não** apaga
  `jm_prices`, a assinatura nem o histórico.
- O histórico se apaga sozinho depois de 30 dias (ver
  [Histórico](#histórico-indexeddb)); o usuário não tem (ainda) botão de limpar.

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
