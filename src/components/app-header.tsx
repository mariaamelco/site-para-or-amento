"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, History, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { AUTH_ROUTE, clearAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho das rotas protegidas: marca, atalho entre a tela inicial e o
 * histórico e sair. Não depende do documento aberto, só da rota.
 */
export function AppHeader() {
  const pathname = usePathname();
  const onHistory = pathname === "/historico";

  function handleSignOut() {
    clearAuth();
    // Navegação completa para descartar o cache do cliente e revalidar no proxy.
    window.location.replace(AUTH_ROUTE);
  }

  return (
    <header className="border-b-4 border-brand bg-black">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3">
        <BrandLogo />
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
