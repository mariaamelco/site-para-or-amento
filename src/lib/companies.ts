/**
 * Empresas que emitem orçamentos e recibos. A escolha fica no navegador
 * (`STORAGE_KEYS.company`) e muda o cabeçalho, o rodapé e a assinatura do
 * documento, além da marca no cabeçalho do site.
 */
export const COMPANY_IDS = ["jm", "vision"] as const;
export type CompanyId = (typeof COMPANY_IDS)[number];

export const DEFAULT_COMPANY: CompanyId = "jm";

export interface Company {
  id: CompanyId;
  /** Nome curto, usado no seletor e no histórico. */
  name: string;
  /** Linhas do rodapé do documento. */
  phone: string;
  email: string;
  cnpj: string;
  /** Nome sugerido abaixo da assinatura do recibo. */
  signer: string;
  /** Imagem do cabeçalho do documento (1800×596 px, em `public/`). */
  headerSrc: string;
  /** Cor do título (“ORÇAMENTO”/“RECIBO”) sobre a faixa do cabeçalho. */
  titleColor: string;
  /** Cores do cabeçalho desenhado quando a imagem não carrega. */
  fallback: { band: string; stripe: string };
  /** Cor da borda inferior do cabeçalho do site. */
  accent: string;
}

export const COMPANIES: Record<CompanyId, Company> = {
  jm: {
    id: "jm",
    name: "J&M System",
    phone: "Telefone (47) 991463725",
    email: "Email: jmsystem.itp@gmail.com",
    cnpj: "CNPJ: 64.087.537/0001-13",
    signer: "Juliana O. da Conceição",
    headerSrc: "/header.png",
    titleColor: "#fff",
    fallback: { band: "#000", stripe: "#c43333" },
    accent: "#c43333",
  },
  vision: {
    id: "vision",
    name: "Vision Tech",
    // PENDENTE: dados da Vision Tech a confirmar.
    phone: "Telefone (00) 000000000",
    email: "Email: contato@visiontech.com.br",
    cnpj: "CNPJ: 00.000.000/0000-00",
    signer: "Vision Tech",
    headerSrc: "/header-vision-tech.png",
    titleColor: "#111",
    fallback: { band: "#000", stripe: "#c9cdd2" },
    accent: "#a7adb4",
  },
};

export function getCompany(id: CompanyId): Company {
  return COMPANIES[id] ?? COMPANIES[DEFAULT_COMPANY];
}
