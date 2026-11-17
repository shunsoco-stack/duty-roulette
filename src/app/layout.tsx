import type { Metadata } from "next";
import { AppProvider } from "@/components/app-provider";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: "今日の当番ルーレット",
  description:
    "小さなチームのちょっとした当番を、公平なルーレットで。担当回数の偏りを補正し、今日の当番をみんなに共有。",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
