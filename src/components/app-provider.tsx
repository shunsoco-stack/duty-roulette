"use client";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { State } from "@/lib/types";
import { restoreState, STORAGE_KEY } from "@/lib/storage";
import { japanNow } from "@/lib/dates";
type Context = {
  state: State | null;
  today: string;
  update: (next: State | ((current: State) => State)) => void;
  notice: string;
  notify: (text: string) => void;
};
const Store = createContext<Context | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const isShare = usePathname() === "/share";
  const [state, setState] = useState<State | null>(null);
  const [today, setToday] = useState("");
  const [notice, notify] = useState("");
  const current = useRef<State | null>(null);
  useEffect(() => {
    if (isShare) return;
    function load() {
      const now = new Date();
      setToday(japanNow(now).date);
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch {
        notify("ブラウザに保存できません。この画面を閉じると変更が失われます。");
      }
      const restored = restoreState(raw, now);
      current.current = restored.state;
      setState(restored.state);
      if (restored.recovered) {
        notify("保存データに問題があったため、既定の架空データに戻しました。");
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored.state));
      } catch {
        notify("保存できません。表示中のデータはバックアップで保管してください。");
      }
    }
    const timer = setTimeout(() => {
      if (window.location.pathname !== "/share") load();
    }, 0);
    const interval = setInterval(() => setToday(japanNow(new Date()).date), 1000);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) load();
    };
    window.addEventListener("storage", sync);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("storage", sync);
    };
  }, [isShare]);
  function update(next: State | ((current: State) => State)) {
    if (!current.current) return;
    const value = typeof next === "function" ? next(current.current) : next;
    current.current = value;
    setState(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      notify("保存できませんでした。バックアップを書き出して変更を保管してください。");
    }
  }
  return (
    <Store.Provider value={{ state, today, update, notice, notify }}>{children}</Store.Provider>
  );
}
export function useApp() {
  const context = useContext(Store);
  if (!context) throw new Error("Provider is missing");
  return context;
}
