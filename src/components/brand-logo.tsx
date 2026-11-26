/* eslint-disable @next/next/no-img-element */
import type { CompanyId } from "@/lib/companies";

/** Marca da empresa para fundo escuro (cabeçalho do site e tela de login). */
export function BrandLogo({
  company = "jm",
  color = "#fff",
}: {
  company?: CompanyId;
  color?: string;
}) {
  if (company === "vision") {
    return (
      <img
        src="/logo-vision-tech.png"
        alt="Vision Tech — Instalações & Segurança"
        width={175}
        height={48}
        className="block h-10 w-auto"
      />
    );
  }

  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap font-semibold tracking-[0.14em]">
      <svg
        width="26"
        height="30"
        viewBox="0 0 26 30"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M13 1.5c4.5 0 8.2 1 11 2.6v10.3c0 7.2-5.1 13.5-11 14.1C7.1 27.9 2 21.6 2 14.4V4.1C4.8 2.5 8.5 1.5 13 1.5z"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
        />
        <rect x="8.2" y="12.6" width="9.6" height="7.6" rx="1.4" fill={color} />
        <path
          d="M10.2 12.8v-2.2a2.8 2.8 0 015.6 0v2.2"
          fill="none"
          stroke={color}
          strokeWidth="1.9"
        />
      </svg>
      <div>
        <b className="block text-sm font-medium text-white">J&amp;M SYSTEM</b>
        <small className="block text-[10px] font-normal tracking-[0.12em] text-[#ff3131]">
          SEGURANÇA E TECNOLOGIA
        </small>
      </div>
    </div>
  );
}
