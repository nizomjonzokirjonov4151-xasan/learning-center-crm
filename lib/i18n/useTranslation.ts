"use client";

import { useContext } from "react";
import { I18nContext, type I18nContextType } from "./provider";

export function useTranslation(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}
