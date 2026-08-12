# WONK CITY

**記事を書くほど、都市になるブログ。**

noteのように記事が時系列で沈んでいくのではなく、記事をひとつ書くたびに
**都市に区画（district）がひとつ生まれる**。記事一覧はリストではなく、
女神転生・ソウルハッカーズのマップを下敷きにしたネオンの都市マップだ。

- 記事 = 塔（建物）
- 関連するテーマ同士 = 道路（発光する線）でつながる
- 情報の密度 = 塔の高さ
- 添付画像の色 = 区画のパレット

生成には **あなたのAI（Claude）** を使う。完全ローカルビルド・静的アップ。

---

## 仕組み

```
city/
  content/<slug>/
    index.md        ← 記事本文（frontmatter付き Markdown）
    *.png|jpg …     ← 添付画像
    district.json   ← 区画記述子（AI or 手続き生成）※無くてもビルド可
  generate.mjs      ← 区画記述子の生成（AIプロンプト出力 / 手続きフォールバック）
  build.mjs         ← 静的サイトジェネレータ → ../docs
  serve.mjs         ← プレビュー用サーバ
  lib/              ← markdownパーサ / 都市レイアウト
  templates/        ← マップ・記事のHTML/CSS/JS
docs/               ← ビルド出力（静的ホスティングにそのまま上げる）
```

区画記述子（`district.json`）のスキーマ:

```json
{
  "slug": "003-kikai-jikake",
  "archetype": "電脳街|歓楽街|工業区|居住区|聖域|廃墟",
  "palette": { "primary": "#RRGGBB", "secondary": "#RRGGBB", "glow": "#RRGGBB" },
  "scale": 4,                 // 2-6: 塔のフットプリント
  "height": 6,                // 2-9: 塔の高さ = 情報密度
  "landmarks": ["生成工場", "部品倉庫"],
  "roads": [{ "to": "001-hajimari-no-toshi", "weight": 0.8 }],
  "aiSummary": "マップに出る詩的な一文",
  "generatedBy": "claude"
}
```

`build.mjs` は各記事の `district.json` を読む。**無ければ本文だけから手続き的に
生成**するので、AIを通さなくても都市は必ず建つ。

---

## 使い方

### 1. 記事を書く

```
city/content/006-your-slug/index.md
```

```markdown
---
title: 記事タイトル
date: 2026-08-12
tags: [tag1, tag2]
summary: 一覧に出る短い要約
---

# 見出し

本文…

![説明](./photo.png)
```

画像は同じフォルダに置き、本文からは `./photo.png` で参照する。

### 2. 区画を生成する（＝都市を拡張する）

**AIで生成（推奨・画像も解析される）:**

```bash
node city/generate.mjs prompt 006-your-slug   # プロンプトが出力される
```

出力されたプロンプトを Claude（Claude Code など）に渡す。Claude は本文と
**添付画像を視覚的に解析**し、支配的な色を `palette` に反映、テーマから
`archetype` を選び、既存記事への `roads`（関連）を張った JSON を返す。
その JSON を `city/content/006-your-slug/district.json` に保存する。

> Claude Code なら、記事フォルダを見せて「この記事の district.json を
> `city/GENERATE.md` の手順で作って」と頼めば、画像を読んで直接書き出せる。

**AI無しの手続き生成（フォールバック）:**

```bash
node city/generate.mjs procedural 006-your-slug
```

### 3. ビルドしてプレビュー

```bash
node city/build.mjs        # → docs/
node city/serve.mjs        # → http://localhost:5050
# もしくは一括：
npm run city:preview
```

### 4. 静的アップ

`docs/` をそのまま GitHub Pages / Netlify / S3 等に上げるだけ。
GitHub Pages の場合は Settings → Pages → Source を `docs/` に向ける。

---

## 操作（マップ）

| 操作 | 効果 |
| --- | --- |
| ドラッグ | 都市を見回す |
| ホイール | ズーム |
| ホバー | 区画情報をHUD表示 |
| クリック | 区画（記事）に入る |

詳しいAI生成の指示は [`GENERATE.md`](./GENERATE.md) を参照。
