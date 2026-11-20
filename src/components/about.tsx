"use client";
import { useState } from "react";
import { useApp } from "./app-provider";
import { createSeed } from "@/lib/seed";
import { PageHeading } from "./ui";
export function About() {
  const { update, notify } = useApp();
  const [reset, setReset] = useState(false);
  return (
    <>
      <PageHeading eyebrow="ABOUT THIS LITTLE TOOL" title="このデモについて">
        小さな当番を、みんなで気持ちよく分け合うために。
      </PageHeading>
      <section className="panel prose">
        <h2>デモ用の架空データです</h2>
        <p>
          「うみねこデザイン室（架空）」の7名と5種類の当番を用意しました。すべて架空のデータで、実在の企業・個人とは無関係です。休止中の1名は育休などで参加していない想定です。
        </p>
        <h2>担当を決めることに、集中しています</h2>
        <p>
          朝会の司会、ゴミ出し、給湯室の片付けなど、その日のちょっとした当番を決めます。シフト・勤務時間・出退勤・作業チェック・ゲームのスコアは管理しません。
        </p>
        <h2>保存先は、このブラウザだけ</h2>
        <p>
          設定と履歴はlocalStorageの「dtr:v1」に保存します。認証・外部API・データベース・通知はありません。ブラウザのデータを消すと失われるため、設定画面からバックアップできます。
        </p>
        <h2>広告について</h2>
        <p>
          本番のトップページ末尾では、忍者ツールズ株式会社の広告配信サービス「忍者AdMax」を利用しています。詳細は
          <a href="/privacy">プライバシーポリシー</a>
          をご覧ください。
        </p>
        <h2>公平性の考え方</h2>
        <p>
          同じ当番について過去の担当回数を数え、重みを「1 ÷（1 ＋ 自分の回数 −
          候補者の最少回数）」にします。不在・休止・対象外・直近の担当者を除き、同日の重複もできる限り避けます。少ない回数の人ほど当たりやすくなりますが、均等な結果を保証するものではありません。
        </p>
        <h2>日付は、開いた日の日本時間</h2>
        <p>
          初回の履歴は過去約8週間から作成します。朝会前は今日の担当がすべて未決定です。朝会後の営業日に初めて開いた場合だけ、一部が決定済みになります。通常の利用中に自動で担当を確定することはありません。
        </p>
        <h2>既定データに戻す</h2>
        <p>今の日時を基準に架空データを作り直します。現在の設定・履歴は置き換わります。</p>
        {!reset ? (
          <button onClick={() => setReset(true)}>既定データに戻す</button>
        ) : (
          <div className="notice">
            <p>現在のデータを置き換えます。必要なバックアップは保存済みですか？</p>
            <div className="button-row">
              <button
                onClick={() => {
                  update(createSeed(new Date()));
                  setReset(false);
                  notify("現在の日時を基準に、既定データを再生成しました。");
                }}
              >
                置き換えて再生成する
              </button>
              <button onClick={() => setReset(false)}>キャンセル</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
