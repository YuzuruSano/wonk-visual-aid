# archive/ — 旧VJフレームワーク（引退）

このディレクトリは、このリポジトリの前身である **VJ（ビジュアルジェネレータ）
フレームワーク** を保管したものです。現在の主役は WONK CITY（リポジトリ直下の
`city/` と `docs/`）で、こちらは開発を終了しています。

- Web MIDI API + p5.js によるリアルタイム映像生成
- Ableton Live 10 との連携を前提
- マイク入力の FFT で音に反応、コラージュ／ライン／パルス／フォント等のエフェクト

## 中身

```
app.js            Express + webpack-dev-middleware サーバ
webpack.dev.js    開発ビルド設定
config.json       サイト設定
views/            pug テンプレート（index / controller）
dev/js/           p5 スケッチ本体・エフェクトモジュール・addons（p5.scribble 等）
dev/sass/         スタイル
dev/images/ …     アセット
```

## 動かす

依存をインストールした上で、リポジトリ直下から:

```bash
npm run legacy:dev     # = cd archive && webpack(dev) && node app.js
```

> Node v12 / yarn v1.16 前提で書かれた古いコードです。`node_modules` はリポジトリ
> 直下のものを解決します。

## 受け継がれたもの

WONK CITY のマップの「手描き線」は、ここにある **`dev/js/scripts/addons/p5.scribble.js`**
（Janneck Wullschleger／Jo Wood's Handy 由来）の二重ストローク・アルゴリズムを
vanilla canvas に移植したものです。演出は引退せず、都市に生きています。
