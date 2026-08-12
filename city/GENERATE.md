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
    "primary":   "#RRGGBB  画像の支配色（建物の面の色）",
    "secondary": "#RRGGBB  暗い地の色（記事ページ背景に使う）",
    "glow":      "#RRGGBB  発光色（ネオンの縁・ラベル）"
  },
  "scale":  "2-6 の整数。区画の広さ（フットプリント）。",
  "height": "2-9 の整数。主要な高さ＝情報密度。長く濃い記事ほど高い。",
  "landmarks": ["この区画の象徴となる建造物名を2〜4個（日本語・詩的に）"],

  "buildings": [
    // 区画内に建てる建物。本文の内容から 2〜5 棟、必ず形状に変化を付ける。
    // u,v は区画内の相対位置(0-1)。w,d は大きさ(cell,省略可)。h は高さ(2-9)。
    // label は landmarks と対応させると記事側にも紐づく（任意）。
    { "form": "spire", "u": 0.5, "v": 0.35, "w": 1.2, "d": 1.2, "h": 8, "label": "宣言の塔" }
  ],

  "features": [
    // 地形/インフラ。本文の情景に出てくるものだけを選ぶ（無ければ空配列）。
    // 座標はすべて区画内の相対値(0-1)。
    { "type": "river",  "path": [[0,0.2],[0.5,0.5],[1,0.6]] },
    { "type": "stairs", "path": [[0.2,0.8],[0.5,0.4]], "steps": 6, "rise": 3 }
  ],

  "roads": [
    { "to": "<関連する既存記事のslug>", "weight": 0.0-1.0 }
  ],
  "aiSummary": "マップ上に表示する40字程度の詩的な一文。",
  "generatedBy": "claude"
}
```

### 建物フォーム（`buildings[].form`）

| form | 見た目 | 向いている題材 |
| --- | --- | --- |
| `tower`   | 縦長の塔（窓あり） | 主役・宣言・軸になる記事 |
| `slab`    | 横長の低い棟 | 蓄積・一覧・データ |
| `block`   | 中くらいの塊 | 一般的な話題・住居 |
| `spire`   | 尖塔（ピラミッド頭） | 思索・象徴・煙突・信念 |
| `terrace` | 段丘（ジグラト） | 積層・段階・丘 |
| `dome`    | 円蓋 | 祝祭・舞台・保護 |
| `gate`    | 門（左右の柱＋梁） | 入口・回廊・境界 |
| `cluster` | 小さな建物の群れ | 雑多・街並み・断片 |

### フィーチャ（`features[].type`）

| type | 意味 | 形 |
| --- | --- | --- |
| `river` / `canal` | 川・水路 | `path`: 折れ線 |
| `stairs` | 階段 | `path`: [下, 上] の2点＋`steps`,`rise` |
| `bridge` | 橋 | `path`: 2点＋`h`（高さ） |
| `plaza`  | 広場 | `path`: 多角形（3点以上） |
| `wall`   | 壁・塀 | `path`: 折れ線＋`h` |
| `grove`  | 木立・緑 | `u`,`v`＋`count` |

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

## 語彙を増やす（建物・地形の種類を足す）

種類はレジストリ化してあるので、AIで都度増やせる。新しい建物フォーム
`pagoda`（塔門）を足す例:

1. **描画** — `city/templates/map.js` の `FORMS` に `pagoda: (cx,cy,w,dd,h,pal,s,hv,gl) => {...}`
   を追加（既存の `drawBox` / `capTriangles` を組み合わせる）。
2. **好み** — `city/generate.mjs` の `ARCHETYPES[...].forms` に `'pagoda'` を混ぜる
   （手続き生成でも出るようになる）。
3. **語彙表** — この `GENERATE.md` の表に一行足す（AIが選べるようになる）。

地形フィーチャも同様に `FEATURES`（map.js）＋ `FEATURE_HINTS`（generate.mjs）＋
上の表に足すだけ。「こういう建物／地形も出したい」と私（Claude）に言えば、この3点を
まとめて実装する。
