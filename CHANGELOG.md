# Histórico de versões

Cada versão de produção (branch `main`) recebe uma tag `vX.Y.Z` e uma Release no GitHub.
Ao publicar uma versão nova, acrescente a seção dela no topo desta lista e atualize `"version"` no `package.json` (é de lá que o site mostra o número).

- **X** (maior): mudança grande ou que altera o jeito de usar.
- **Y** (menor): função nova.
- **Z** (correção): conserto ou ajuste pequeno.

## Próxima versão (ainda na staging)

- Duas empresas: **J&M System** e **Vision Tech**. Escolha na tela de login e troca a qualquer momento pela marca no cabeçalho. Cada empresa tem cabeçalho do documento (Vision Tech com faixa prata), dados de rodapé e assinatura próprios; o histórico guarda a empresa de cada documento.
- Celular: PDF e imagem vão pela tela de compartilhar só com o arquivo (o WhatsApp não recebe mais o link "blob:").

## v1.0.0 — 2026-11-20

Primeira versão de produção, já na estrutura Next.js + TypeScript + Tailwind (shadcn/ui).

- Orçamentos e recibos em PDF, PNG e "copiar imagem", no modelo J&M System.
- Tela de login (usuário único).
- Busca no catálogo da Digital Sat; a lista de resultados recolhe ao escolher um item.
- Fotos dos produtos na busca, na lista de itens e no PDF do orçamento (coluna "FOTO").
- Orçamento e recibo quebram em mais páginas quando há muitos itens.
- Atualização automática do catálogo a cada 2 meses (abre um pull request para `staging`).
- Número da versão na tela de login e na barra de ações.
