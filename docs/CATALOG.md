# Catálogo de produtos e busca

## Fonte

- Arquivo: `public/catalog.json`.
- Formato: lista de linhas `[nome, slug, categoria]`.
- Tamanho atual: ~2.788 produtos da loja **Digital Sat**.
- Cada `slug` termina com o id numérico do produto na loja
  (`camera-vhd-1120-1234` → id `1234`), usado para montar a foto.

```json
[
  ["Câmera VHD 1120", "camera-vhd-1120-1234", "Câmeras"],
  ["Cabo HDMI 2m", "cabo-hdmi-2m-9012", "Cabos"]
]
```

## Leitura no app

`src/lib/catalog.ts`:

- `parseCatalog(rows)` transforma as linhas em `CatalogProduct`, criando `key` com
  `norm(nome + " " + slug sem o id e com hífens trocados por espaço)`.
- `catalogIndex(products)` monta o índice de busca **uma vez por lista**, em um
  `WeakMap` (o catálogo só troca depois do `fetch`).
- `catalogCategories(products)` devolve as categorias únicas, ordenadas com
  `localeCompare(..., "pt-BR")`.
- `searchProducts(products, query, category, limit = 60)`:
  - sem termo → `{ results: [], total: 0 }`;
  - filtra pelo `cat` quando há categoria;
  - devolve os resultados limitados e o total antes do limite.

O `AppShell` busca `/catalog.json` ao carregar o app (a rota já é protegida pelo
proxy) e trata `loading` e `failed`.
Na interface, `ProductSearch` mostra a mensagem correspondente e sugere “Item
personalizado” quando o catálogo falha.

## Busca em duas camadas (`src/lib/search.ts`)

1. **Exata por trecho**
   - Normaliza o termo e o nome (sem acentos, minúsculas).
   - Todos os tokens precisam aparecer no nome, em qualquer ordem.
   - Pontuação por token: `3` se o nome começa com ele, `2` se alguma palavra começa,
     `1` se apenas contém.
   - Resultados ordenados pela soma dos pontos.
2. **Fuzzy (Sellers/Levenshtein por trecho)**
   - Só roda quando a camada exata devolve **menos de 5** resultados.
   - Não reordena nem remove os exatos: os fuzzy entram depois, ordenados por
     número de erros.
   - Tolerância por tamanho do token: até 3 letras = 0 erro; 4–6 = 1; 7+ = 2.
   - `sellersDistance` usa a primeira linha zerada, o que permite casar em qualquer
     trecho do texto.

Testes: `src/lib/unit/search.test.ts` (vitest).

## Destaque do termo (`highlightSegments`)

- Usa um mapa de índices sobre o nome normalizado para que **acentos não desloquem**
  as posições.
- Tokens com menos de 2 caracteres são ignorados.
- Devolve trechos `{ text, hit }`; a interface marca os `hit` com `<mark>`.

## Componente de busca

`src/app/(home)/budget-form.tsx` — componente `ProductSearch` (detalhes em
[PAGES.md](./PAGES.md)):

- Categoria vazia = todas; valor interno `__all__`.
- Lista suspensa em portal, com `↑`/`↓`/`Enter`/`Escape`.
- Produto já presente no orçamento aparece riscado, com opacidade reduzida e o
  selo “Já adicionado”; clicar nele não duplica o item. A regra fica em
  `canAddBudgetProduct` (`src/lib/schemas/budget.ts`).
- Mostra “último: R$ …” quando o slug já tem preço em `jm_prices`.
- Link para a página do produto na loja.
- Limite visual de 60 resultados, com o total informado no rodapé.

## Script de atualização (`scripts/atualizar-catalogo.mjs`)

Uso:

```bash
bun scripts/atualizar-catalogo.mjs
```

O que faz:

1. Lê `https://loja.digitalsat.com.br/sitemap_produtos.xml`.
2. Extrai e deduplica os slugs de produto.
3. **Proteção:** se vierem menos de `MIN_PRODUCTS = 1000`, encerra com erro e **não
   altera** o catálogo.
4. Remove do catálogo os slugs que não estão mais na loja.
5. Para cada slug novo, lê o nome na página do produto (`h1.product-detail__product-name`
   ou `<title>`).
6. Classifica a categoria com um **Naive Bayes simples** treinado no catálogo atual:
   - tokens unigramas + bigramas (`palavra_palavra`);
   - suavização de Laplace `A = 0.1`;
   - categorias possíveis são as já existentes no catálogo.
7. Grava `public/catalog.json` no formato de uma linha por produto.
8. Imprime resumo (sitemap, novos, removidos, adicionados).

Detalhes técnicos:

- Requisições com `User-Agent` próprio, `Accept-Language: pt-BR` e timeout de 30 s.
- Até 4 tentativas por URL, com espera progressiva (`1500 ms × tentativa`).
- Concorrência de 6 páginas de produto, com `150 ms` entre cada uma.
- `404` em página de produto é tratado como “sem nome” (produto não entra).
- Produtos removidos saem do arquivo; produtos existentes mantêm a posição relativa.

### Adicionar uma categoria nova

O classificador só escolhe categorias que já existem no catálogo. Para introduzir
um grupo novo:

1. Acrescente manualmente ao menos alguns produtos com `cat` nova em
   `public/catalog.json` (ou ajuste o script).
2. Rode o script e confira se os novos produtos passaram a ser classificados nela.
3. Documente a mudança e valide a interface (o filtro usa as categorias do arquivo).

## Atualização automática no GitHub

Workflow: `.github/workflows/atualizar-catalogo.yml`.

- **Quando:** `cron: '17 9 1 */2 *'` → dia 1, 09:17 UTC (06:17 em Brasília), a cada
  2 meses (janeiro, março, maio, julho, setembro, novembro). Também pode ser
  disparado manualmente (`workflow_dispatch`).
- **Base:** faz checkout da branch **`staging`**.
- **Permissões:** `contents: write` e `pull-requests: write`.
- **Concorrência:** grupo `atualizar-catalogo`, sem cancelar execução em andamento.
- **Passos:**
  1. roda o script e salva o resumo;
  2. se o arquivo não mudou, encerra;
  3. cria a branch `catalogo/AAAA-MM-DD`, commita e envia;
  4. abre um PR para `staging` (ou atualiza o corpo se o PR já existir);
  5. publica o resumo no job summary.
- O PR é revisado e mesclado na `staging`; entra em produção com a próxima versão.

Configurações necessárias no GitHub: branch padrão `main` e “Allow GitHub Actions
to create and approve pull requests” habilitado (ver [DEVELOPMENT.md](./DEVELOPMENT.md)).

## Falhas conhecidas e o que fazer

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| “Catálogo indisponível” na busca | `fetch` de `/catalog.json` falhou | Recarregar; conferir o arquivo em `public/`. |
| Script encerra com “poucos produtos” | Loja fora do ar ou sitemap incompleto | Rodar novamente mais tarde; o catálogo atual é preservado. |
| Produto novo sem categoria ideal | Classificador só conhece grupos existentes | Ajustar o catálogo/classificador e documentar. |
| Foto não aparece no PDF | Produto sem id no slug, loja fora ou rewrite indisponível | Conferir `/foto/:id` em `next.config.ts`. |
| Termo não encontra o produto | Menos de 5 resultados exatos e erro acima da tolerância | Ajustar nome/token ou a regra em `search.ts` (com teste). |
