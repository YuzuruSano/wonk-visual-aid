# AI区画生成ガイド（Claude向け）

このドキュメントは、新しい記事を WONK CITY の一区画に変換するときに
Claude（Claude Code など）へ渡す指示書です。

## タスク

`city/content/<slug>/` の中身を読み、`city/content/<slug>/district.json` を
生成・保存してください。

1. `index.md` の本文と frontmatter（title / tags / summary）を読む。
2. 同フォルダの画像（`*.png` `*.jpg` …）を**実際に視覚的に解析**し、
   支配的な色を 2〜3色抽出する。
3. 下記スキーマの JSON だけを `district.json` として書き出す。

## スキーマ

```json
{
  "slug": "<フォルダ名と一致>",
  "archetype": "電脳街 | 歓楽街 | 工業区 | 居住区 | 聖域 | 廃墟 のいずれか",
  "palette": {
    "primary":   "#RRGGBB  画像の支配色（塔の面の色）",
    "secondary": "#RRGGBB  暗い地の色（記事ページ背景に使う）",
    "glow":      "#RRGGBB  発光色（ネオンの縁・ラベル）"
  },
  "scale":  "2-6 の整数。記事の重量感・スケール。",
  "height": "2-9 の整数。情報密度＝塔の高さ。長く濃い記事ほど高い。",
  "landmarks": ["この区画の象徴となる建造物名を2〜4個（日本語・詩的に）"],
  "roads": [
    { "to": "<関連する既存記事のslug>", "weight": 0.0-1.0 }
  ],
  "aiSummary": "マップ上に表示する40字程度の詩的な一文。",
  "generatedBy": "claude"
}
```

## 生成の指針

- **archetype** は本文の主題から選ぶ。技術/開発→電脳街、音楽/芸術/夜遊び→
  歓楽街、制作/DIY/機械→工業区、日常/暮らし/旅→居住区、思索/静けさ→聖域、
  記憶/過去/風化→廃墟。
- **palette** は必ず添付画像の実際の色を尊重する。画像が無い場合のみ、
  記事のムードから色を決める。`secondary` は暗めに（背景として成立する濃さ）。
- **roads** は既存記事との「テーマ的な近さ」。既存 slug 一覧は
  `city/content/` のフォルダ名で確認する。強い関連ほど weight を高く（0.7〜1.0）、
  緩い連想は 0.3〜0.5。1〜3本が目安。関連が無ければ空配列でよい。
- **landmarks** は記事の見出しや象徴的モチーフから。単なる要約でなく、
  都市の建造物として名付ける（例: 「宣言の塔」「割れ目の芽」）。
- 出力は **JSON のみ**。コメントや説明文を混ぜない。

## 既存区画の例

`city/content/001-hajimari-no-toshi/district.json` などが参考になる。
接続先（roads.to）の候補は、生成時点で `content/` に存在する他の slug。

## 生成後

```bash
node city/build.mjs      # docs/ を再生成 → 新しい区画が都市に出現する
```
