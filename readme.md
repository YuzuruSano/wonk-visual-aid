# WONK CITY

**記事を書くほど、都市になるブログ。**

noteのように記事が時系列で沈むのではなく、記事をひとつ書くたびに、女神転生・
ソウルハッカーズのマップを下敷きにしたネオン都市へ区画がひとつ生まれる。
記事一覧はリストではなく、歩いて見下ろす都市マップになる。

添付画像を含めて記事をAI（Claude）が解析し、区画のパレット・アーキタイプ・
周辺への道路（関連）を生成して、都市を拡張していく。完全ローカルビルド・静的アップ。

```bash
npm run dev        # ビルド + プレビュー → http://localhost:5050
npm run build      # 静的サイトを docs/ に生成（GitHub Pages 等へそのまま）
```

→ 詳しい仕組み・記事の追加・AI生成の手順は **[`city/README.md`](./city/README.md)** と
**[`city/GENERATE.md`](./city/GENERATE.md)**。

---

## このリポジトリの前身（アーカイブ）

もともとは Web MIDI API と p5.js による VJ フレームワーク
（*Assumes linkage with Ableton Live 10*）でした。現在は引退し
[`archive/`](./archive/) に保管しています。WONK CITY の手描きマップ表現は、
その p5.scribble エフェクトを移植したものです。

旧VJアプリを動かす場合: `npm run legacy:dev`（`archive/` 配下で実行）。
