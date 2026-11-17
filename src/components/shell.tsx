"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-provider";
const links = [
  { href: "/", icon: "◉", name: "今日の当番" },
  { href: "/history", icon: "▥", name: "履歴と集計" },
  { href: "/settings", icon: "⚙", name: "設定" },
  { href: "/about", icon: "ⓘ", name: "このデモについて" },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { state, notice, notify, update } = useApp();
  if (path === "/share" || path === "/board") return <main className="standalone">{children}</main>;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-symbol">◉</span>
          <span>
            今日の当番
            <br />
            <strong>ルーレット</strong>
          </span>
        </Link>
        <div className="workspace">
          <span className="eyebrow">YOUR TEAM</span>
          <p>{state?.team ?? "チームを読み込み中"}</p>
          <span className="tag">ローカル保存</span>
        </div>
        <nav aria-label="メインナビゲーション">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={path === link.href ? "page" : undefined}
            >
              <span>{link.icon}</span>
              {link.name}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>ひと回しで、気持ちよく。</span>
          <p>小さな当番を、みんなで公平に。</p>
          <small>デモ用の架空データです</small>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span className="breadcrumb">
            うみねこ /{" "}
            <strong>
              {path.startsWith("/spin") ? "ルーレット" : links.find((l) => l.href === path)?.name}
            </strong>
          </span>
          <div className="top-actions">
            <span className="demo-tag">架空データのデモ</span>
            <button
              className="sound-button"
              aria-pressed={state?.sound ?? false}
              onClick={() => state && update({ ...state, sound: !state.sound })}
            >
              {state?.sound ? "♪ 音オン" : "♪ 音オフ"}
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="通知を閉じる" onClick={() => notify("")}>
                ×
              </button>
            </div>
          )}
          {state ? children : <div className="loading">今日の当番を準備しています…</div>}
        </main>
        <footer>
          今日の当番ルーレット <span>データはこのブラウザに保存されます</span>
        </footer>
      </div>
      <nav className="mobile-tabs" aria-label="モバイルナビゲーション">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={path === link.href ? "page" : undefined}
          >
            <span>{link.icon}</span>
            {link.href === "/about" ? "デモについて" : link.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
