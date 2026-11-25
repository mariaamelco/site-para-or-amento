"use client";

import { LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTE, clearAuth } from "@/lib/auth";

/**
 * Cabeçalho da rota protegida. Fica no layout de `(home)` porque não depende do
 * documento aberto, só da sessão.
 */
function AppHeader() {
  function handleSignOut() {
    clearAuth();
    // Navegação completa para descartar o cache do cliente e revalidar no proxy.
    window.location.replace(AUTH_ROUTE);
  }

  return (
    <header className="border-b-4 border-brand bg-black">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3">
        <BrandLogo />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-white/70 hover:bg-white/10 hover:text-white"
          onClick={handleSignOut}
        >
          <LogOut />
          Sair
        </Button>
      </div>
    </header>
  );
}

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 pb-6">
      <AppHeader />
      {children}
    </div>
  );
}
