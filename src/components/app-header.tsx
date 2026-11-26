"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FileText, History, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AUTH_ROUTE, clearAuth } from "@/lib/auth";
import { COMPANIES, COMPANY_IDS, getCompany } from "@/lib/companies";
import { useCompany } from "@/lib/hooks/company";
import { parseCompanyId } from "@/lib/schemas/company";
import { cn } from "@/lib/utils";

/**
 * Marca da empresa escolhida; clicando nela, troca a empresa que emite os
 * documentos. Usado só pelo cabeçalho.
 */
function CompanySwitcher() {
  const [company, setCompany] = useCompany();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md p-1 -m-1 text-white/60 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        aria-label={`Empresa: ${getCompany(company).name}. Trocar empresa`}
        title="Trocar empresa"
      >
        <BrandLogo company={company} />
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Emitir documentos como</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={company}
            onValueChange={(value) => setCompany(parseCompanyId(value))}
          >
            {COMPANY_IDS.map((id) => (
              <DropdownMenuRadioItem key={id} value={id} closeOnClick>
                {COMPANIES[id].name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Cabeçalho das rotas protegidas: empresa (com troca), atalho entre a tela
 * inicial e o histórico e sair. Não depende do documento aberto, só da rota.
 */
export function AppHeader() {
  const pathname = usePathname();
  const onHistory = pathname === "/historico";
  const [company] = useCompany();

  function handleSignOut() {
    clearAuth();
    // Navegação completa para descartar o cache do cliente e revalidar no proxy.
    window.location.replace(AUTH_ROUTE);
  }

  return (
    <header
      className="border-b-4 bg-black"
      style={{ borderBottomColor: getCompany(company).accent }}
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3">
        <CompanySwitcher />
        <div className="ml-auto flex items-center gap-1">
          <Link
            href={onHistory ? "/" : "/historico"}
            aria-label={onHistory ? "Voltar para o orçamento" : "Histórico"}
            title={onHistory ? "Orçamento" : "Histórico"}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            {onHistory ? <FileText /> : <History />}
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleSignOut}
          >
            <LogOut />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
