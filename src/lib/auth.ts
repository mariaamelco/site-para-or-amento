const USER = "juliana";
const PASS = "jm1416";

export const AUTH_KEY = "jm_auth";
export const AUTH_ROUTE = "/auth";

/** 30 dias para o "manter conectado"; sem ele, o cookie vale só pela sessão. */
const KEEP_MAX_AGE = 60 * 60 * 24 * 30;

export function checkCredentials(user: string, pass: string): boolean {
  return user.trim().toLowerCase() === USER && pass === PASS;
}

function setAuthCookie(value: string, maxAge?: number): void {
  const parts = [`${AUTH_KEY}=${value}`, "path=/", "SameSite=Lax"];
  if (maxAge !== undefined) parts.push(`max-age=${maxAge}`);
  if (window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function persistAuth(keep: boolean): void {
  setAuthCookie("1", keep ? KEEP_MAX_AGE : undefined);
}

export function clearAuth(): void {
  setAuthCookie("", 0);
}
