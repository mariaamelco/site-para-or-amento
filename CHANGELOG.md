# Histórico de versões

Cada versão de produção (branch `main`) recebe uma tag `vX.Y.Z` e uma Release no GitHub.
Ao publicar uma versão nova, acrescente a seção dela no topo desta lista e atualize o número em `index.html` (atributo `data-version` e os dois textos `vX.Y.Z`).

- **X** (maior): mudança grande ou que altera o jeito de usar.
- **Y** (menor): função nova.
- **Z** (correção): conserto ou ajuste pequeno.

## v1.0.0 — 2026-11-20

Primeira versão de produção.

- Orçamentos e recibos em PDF, PNG e "copiar imagem", no modelo J&M System.
- Tela de login (usuário único).
- Busca no catálogo da Digital Sat (2.790 produtos); a lista de resultados recolhe ao escolher um item.
- Fotos dos produtos na busca, na lista de itens e no PDF do orçamento (coluna "FOTO").
- Orçamento e recibo quebram em mais páginas quando há muitos itens.
- Atualização automática do catálogo a cada 2 meses (abre um pull request para `staging`).
