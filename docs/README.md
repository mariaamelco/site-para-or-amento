# Documentação do J&M System

O J&M System monta **orçamentos e recibos** no navegador. A aplicação é **Next.js 16
(App Router) + TypeScript + Tailwind CSS 4**, com componentes [shadcn/ui](https://ui.shadcn.com)
sobre [Base UI](https://base-ui.com). O documento A4 é desenhado em `<canvas>` e
exportado em PDF ou PNG; nada é enviado para um servidor.

> **Regra obrigatória.** Toda pessoa ou agente de IA que altere este repositório
> **deve ler os documentos relevantes desta pasta antes de escrever código** e
> **atualizar a documentação afetada na mesma alteração** sempre que o
> comportamento, a estrutura de arquivos ou uma decisão técnica mudar.
> Implementar sem consultar `docs/` é considerado erro de processo.

## Como esta pasta está organizada

A estrutura segue a convenção usada em repositórios conhecidos — por exemplo, o
Next.js mantém um `docs/` com um índice e arquivos por assunto (`architecture`,
guias etc.), enquanto `README`/`CONTRIBUTING` ficam na raiz. Aqui vale o mesmo
princípio: **um assunto por arquivo**, um índice no topo e nenhuma duplicação de
conteúdo entre documentos.

```
docs/
├── README.md              ← este índice + regras obrigatórias
├── ARCHITECTURE.md        ← camadas, árvore de arquivos, fluxos e regras de organização
├── PAGES.md               ← rotas, tela e seções de página (src/app)
├── COMPONENTS.md          ← reutilizáveis, componentes de layout e primitivas de UI
├── DATA-MODEL.md          ← tipos, documentos e persistência no navegador
├── DOCUMENT-ENGINE.md     ← desenho do A4, fotos, assinatura e exportação
├── CATALOG.md             ← catálogo de produtos, busca e atualização automática
└── DEVELOPMENT.md         ← ambiente, comandos, testes, git, versões e deploy
```

## Ordem de leitura recomendada

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — obrigatório antes de qualquer mudança.
2. O documento do assunto que você vai mexer:

   | Se a mudança envolve… | Leia também |
   | --- | --- |
   | tela, formulário, comportamento da página | [PAGES.md](./PAGES.md) |
   | componente compartilhado, componente de layout ou primitiva de UI | [COMPONENTS.md](./COMPONENTS.md) |
   | campos, tipos, totais ou `localStorage` | [DATA-MODEL.md](./DATA-MODEL.md) |
   | PDF, PNG, A4, fotos, assinatura | [DOCUMENT-ENGINE.md](./DOCUMENT-ENGINE.md) |
   | busca, categorias ou catálogo Digital Sat | [CATALOG.md](./CATALOG.md) |
   | instalar, testar, publicar, versionar | [DEVELOPMENT.md](./DEVELOPMENT.md) |

3. **[DEVELOPMENT.md](./DEVELOPMENT.md)** antes de validar ou publicar.

## Contrato para agentes de IA

### Antes de alterar código

- Ler [ARCHITECTURE.md](./ARCHITECTURE.md) e o documento específico do assunto.
- Verificar se já existe padrão equivalente no projeto; **não criar convenção nova**
  sem necessidade. Em caso de dúvida, siga o padrão mais próximo do código atual.
- Confirmar em qual camada o código pertence (tabela “Onde colocar código novo”
  em [ARCHITECTURE.md](./ARCHITECTURE.md)).
- Consultar `node_modules/next/dist/docs/` quando a mudança envolver APIs do
  Next.js 16 — esta versão tem mudanças em relação ao que muitos modelos conhecem
  (aviso em [AGENTS.md](../AGENTS.md)).

### Regras invioláveis

| Regra | Detalhe |
| --- | --- |
| Página mora em `src/app` | Cada rota é uma pasta; todas as seções da página ficam dentro dela. |
| Um componente, um arquivo só quando reaproveitado | Componente usado por um único arquivo é declarado no topo desse arquivo, fora do componente chamador. |
| Cabeçalho no layout da rota | O cabeçalho fica em `src/app/(home)/layout.tsx` (`AppHeader`); as abas de modo são seção da página. |
| `src/components` é só reutilizável | Nunca criar `src/components/app` nem guardar seção de página ali. |
| Regra de negócio em `src/lib` | Componentes não calculam totais, não formatam dinheiro e não desenham documento. |
| Hook de tela em `src/lib/hooks` | Um arquivo por hook (`catalog.ts`, `flash.ts`, …) e exporta `use<Nome>`. Não importa `src/app` nem `src/components`. |
| Sem backend | Sem API routes, server actions ou autenticação real. Só `src/proxy.ts` roda no servidor, para exigir o cookie `jm_auth`. |
| Dinheiro e quantidade são `string` | Converter apenas com `parseMoney`; nunca `parseFloat` solto. |
| Validação/regra de negócio tem zod + teste | Schema em `src/lib/schemas/<assunto>.ts` e teste correspondente em `src/lib/__tests__/lib.test.ts`. |
| Documento é `<canvas>` | O A4 é renderizado imperativamente em `src/lib/document`; não migrar para HTML/print. |
| UTF-8 sem BOM | Preservar acentos exatamente (`orçamento`, `assinatura`). Ver [DEVELOPMENT.md](./DEVELOPMENT.md). |
| Comentários e textos em português | Identificadores de código em inglês, como no restante do projeto. |

### Depois de alterar código

- Atualizar **o(s) documento(s) afetado(s)** nesta pasta, na mesma alteração.
- Rodar a validação mínima indicada em [DEVELOPMENT.md](./DEVELOPMENT.md)
  (`bun run typecheck`, `bun run lint`, `bun test`, `bun run test:e2e` conforme o
  escopo).
- Revisar o diff procurando corrupção de acentos e mudanças fora do escopo.

### Quando a documentação precisa mudar

| Mudança feita no código | Documento a atualizar |
| --- | --- |
| Nova página, seção, campo ou fluxo de tela | [PAGES.md](./PAGES.md) |
| Novo componente reutilizável, prop ou primitiva de UI | [COMPONENTS.md](./COMPONENTS.md) |
| Novo hook de tela (`src/lib/hooks`) | [PAGES.md](./PAGES.md) |
| Tipo, valor padrão, total ou chave de armazenamento | [DATA-MODEL.md](./DATA-MODEL.md) |
| Nova validação ou regra de negócio | [DATA-MODEL.md](./DATA-MODEL.md) (regra) e [DEVELOPMENT.md](./DEVELOPMENT.md) (teste) |
| Layout do documento, paginação, foto, assinatura ou exportação | [DOCUMENT-ENGINE.md](./DOCUMENT-ENGINE.md) |
| Busca, formato do catálogo ou script de atualização | [CATALOG.md](./CATALOG.md) |
| Comando, versão, teste, branch ou deploy | [DEVELOPMENT.md](./DEVELOPMENT.md) |
| Nova regra de organização ou de camada | [ARCHITECTURE.md](./ARCHITECTURE.md) e este índice |

### Divergência entre código e documentação

- O **código** descreve o que o sistema faz hoje; a **documentação** descreve o que
  ele deve fazer e como deve ser alterado.
- Se os dois divergirem, isso é um **defeito**: investigue qual lado está errado e
  corrija os dois na mesma alteração. Não use a divergência como justificativa para
  ignorar uma regra.

## Estado desta documentação

Descreve a versão **v1.0.0** (estrutura Next.js). O histórico de mudanças
funcionais fica em [CHANGELOG.md](../CHANGELOG.md); instruções para quem usa o site
ficam em [LEIAME.md](../LEIAME.md).
