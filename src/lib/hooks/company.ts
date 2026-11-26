"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_COMPANY, type CompanyId } from "@/lib/companies";
import {
  COMPANY_EVENT,
  STORAGE_KEYS,
  loadCompany,
  saveCompany,
} from "@/lib/storage";

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEYS.company) onChange();
  };
  window.addEventListener(COMPANY_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(COMPANY_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Empresa escolhida, compartilhada entre o cabeçalho do site e a tela do
 * documento (e entre abas). No servidor vale a J&M.
 */
export function useCompany(): [CompanyId, (company: CompanyId) => void] {
  const company = useSyncExternalStore(
    subscribe,
    loadCompany,
    () => DEFAULT_COMPANY,
  );
  return [company, saveCompany];
}
