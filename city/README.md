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
  "scale": 4,                 // 2-6: 区画の広さ
  "height": 7,                // 2-9: 主要な高さ = 情報密度
  "landmarks": ["生成工場", "部品倉庫"],
  "buildings": [              // 区画内に建つ複数の建物（文章からバリエーション）
    { "form": "slab",  "u": 0.34, "v": 0.34, "h": 3.5, "label": "生成工場" },
    { "form": "spire", "u": 0.5,  "v": 0.64, "h": 7,   "label": "ビルドの煙突" }
  ],
  "features": [               // 川・階段・橋・広場・壁・緑 などの地形/インフラ
    { "type": "canal", "path": [[0, 0.82], [0.5, 0.76], [1, 0.86]] }
  ],
  "roads": [{ "to": "001-hajimari-no-toshi", "weight": 0.8 }],
  "aiSummary": "マップに出る詩的な一文",
  "generatedBy": "claude"
}
```

- **buildings** … `form` は `tower/slab/block/spire/terrace/dome/gate/cluster`。
  文章の要素を建物に翻訳し、形状に変化を付ける。
- **features** … `river/canal/stairs/bridge/plaza/wall/grove`。本文の情景に応じて。
- 種類は増やせる（レジストリ方式）。手順は [`GENERATE.md`](./GENERATE.md) 参照。

`build.mjs` は各記事の `district.json` を読む。**無ければ本文だけから手続き的に
生成**（建物・地形も自動で付く）するので、AIを通さなくても都市は必ず建つ。
`buildings` が無い古い記述子は、従来どおり単一の塔にフォールバックする。

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
| `S` | 手描き線 ⇄ 直線 |
| `W` | 天候を変える（背景のジェネラティブアート） |
| `D` | **潜行（アーカイブ・ダイブ）** の開始/終了 |
| 潜行中 `↑` `↓` | 階層を昇降（新しい⇄古い） |
| 潜行中 `ENTER` | その階層の記事に突入 |

### 天候（generative weather）— VJの末裔

背景では **天候がジェネラティブアートとして毎回生成され、動き続ける**。旧VJフレームワークの
p5.js 映像生成を受け継ぐ部分で、6種の手続き生成が用意されている:

`晴 CLEAR`（星の瞬き）/ `雨 RAIN` / `雪 SNOW`（揺れる雪片）/ `霧 FOG`（漂う霧）/
`雷雨 STORM`（雨＋稲妻の閃光）/ `極光 AURORA`（流れる光のリボン）

- 開くたびにランダムで種類が選ばれ、粒子や流れも毎回別のシード＝**同じ空は二度と出ない**。
- 左上のタグをクリック、または `W` で切り替え。`?weather=aurora` のように URL で固定も可能。
- `city.json` に `"weather": "storm"` を書けば既定の天候をピン留めできる（AIが記事の気分に
  合わせて指定する余地）。

### アーカイブ・ダイブ（潜行）— 女神転生オマージュ

`D` で **潜行モード**に入ると、時間が深度になる。**最新記事が地表（B0）、古い記事ほど
地下の地層**へ沈み、`↓` で都市をもぐるように降りていく（アマラ経廊のダンジョン降下の趣）。
関連の道路は地層をつなぐ縦の坑道になり、いちばん深い底には最初の記事が眠る。
記事は年月で地層（B0, B1, …）にまとまり、左の深度ゲージで任意の階層へ跳べる。

### 都市を貫く通し線（cross-district connections）

区画内で完結しないインフラを、`build.mjs` が都市スケールで自動生成する（`city.json`
の `cityFeatures`）。

- **歴史の大通り（avenue）** … 全区画を時系列で貫く金色の背骨。地表では都市を横断する
  大通り、潜行すると **全時代を貫く一本の坑道** になる（＝空間と時間の両方を「またぐ」接続）。
- **大河（river）** … 区画の隙間を縫って都市を横断する水系。地表の水面として流れ、潜行時は退く。
- **橋（bridge）** … 大通りが大河と交差する地点に自動で架かる。都市の背骨が水を **またぐ** 部分。
- **支流（tributary）** … 大河が近くの区画へ送る分流。都市を貫く水を、各区画へ引き込む配線。

橋と支流は交差判定・最近傍で自動生成されるので、記事が増えて大通りや大河の形が変われば
架かる場所も流れ込む先も勝手に更新される。

詳しいAI生成の指示は [`GENERATE.md`](./GENERATE.md) を参照。
