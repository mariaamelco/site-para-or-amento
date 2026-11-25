import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_KEY, AUTH_ROUTE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  if (request.cookies.get(AUTH_KEY)?.value === "1") {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
}

export const config = {
  // Protege as rotas do app; /auth e arquivos estáticos ficam de fora.
  matcher: ["/((?!auth|_next|foto|.*\\..*).*)"],
};
