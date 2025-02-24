# poor-zundamonizer

Marp　の presenter notes を利用して、「ずんだもんと春日部つむぎの音声付きのスライド発表」らしきものを作成する。

```
# Slide 1

- hoge
- fuga

<!-- ずんだもん(newutral): こんにちは、ずんだもんです -->
<!-- 春日部つむぎ(happy): 私は春日部つむぎです -->

```

## 利用

```
bun run index.ts $PATH_TO_MARP_FILE $PATH_TO_OUTPUT_DIR
```

出力先ディレクトリに以下が生成される:

- `zundamonized.html`
    - ずんだもんと春日部つむぎの音声付きのスライド発表らしきもの
- `poor-zundamonizer.js`
    - スライド発表らしきものを再生するための JavaScript
- `normalize.css`
    - ブラウザのデフォルトスタイルをリセットするための CSS
- `skeleton.css`
    - スタイルを整えるための CSS
- `audios`
    - 音声ファイル
- `images`
    - 画像ファイル

CSS は [Skeleton](https://github.com/dhg/Skeleton) を利用している。

## 音声生成

ローカルホスト上での [VOICEVOX](https://github.com/VOICEVOX/voicevox_engine) の稼働を期待している。
Marpit　の Presenter Notes を元に音声を生成し、 `audios` ディレクトリに保存する。

## 画像

ずんだもんと春日部つむぎそれぞれについて、 `["neutral", "happy", "sad", "angry", "surprised", "thinking"]` の 6 つの表情画像を `images` ディレクトリに配置する。
これらの画像は `poor-zundamonizer.js` で参照される。

## スライド発表らしきものの再生

Presenter Notes を元に以下のデータ構造を生成する:

```
type Event =
  | {
      type: "nextSlide";
    }
  | {
      type: "speak";
      character: "zundamon" | "tsumugi";
      emotion:
        | "neutral"
        | "happy"
        | "sad"
        | "angry"
        | "surprised"
        | "thinking";
      text: string;
    };
```

Presenter Notes を元に `Array<Event>` を生成し、`zundamonized.html` 内に global 変数 `events` を埋め込む。この `events` を元にスライドのページ遷移と音声再生・表情変更を行う。
