const USER = "juliana";
const PASS = "jm1416";

export const AUTH_KEY = "jm_auth";

export function checkCredentials(user: string, pass: string): boolean {
  return user.trim().toLowerCase() === USER && pass === PASS;
}

export function isAuthenticated(): boolean {
  try {
    return (
      sessionStorage.getItem(AUTH_KEY) === "1" ||
      localStorage.getItem(AUTH_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function persistAuth(keep: boolean): void {
  try {
    sessionStorage.setItem(AUTH_KEY, "1");
    if (keep) localStorage.setItem(AUTH_KEY, "1");
  } catch {
    // sem armazenamento: o login vale só enquanto a aba estiver aberta
  }
}

export function clearAuth(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignora
  }
}
