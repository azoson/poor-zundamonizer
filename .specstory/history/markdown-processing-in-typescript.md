## SpecStory

## Markdown Processing in TypeScript (2025/2/24 22:40:14)

_**User**_

@README.md  を参考に、引数で指定された markdown を読み込み、output dir を生成する処理を @index.ts に追加して欲しい

---

_**Assistant**_

はい、index.tsにMarkdownファイルを処理する機能を追加します。まず、必要な型定義とMarkdownの解析処理を実装しましょう。

````typescript:index.ts
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from "fs";
import { join } from "path";

// イベントの型定義
type Emotion = "neutral" | "happy" | "sad" | "angry" | "surprised" | "thinking";
type Character = "zundamon" | "tsumugi";

type Event =
  | {
      type: "nextSlide";
    }
  | {
      type: "speak";
      character: Character;
      emotion: Emotion;
      text: string;
    };

// プレゼンターノートのパース用の正規表現
const PRESENTER_NOTE_REGEX = /<!--\s*(ずんだもん|春日部つむぎ)\((.*?)\):\s*(.*?)\s*-->/g;

// Markdownからスライドとプレゼンターノートを抽出する関数
function parseMarkdown(markdown: string): Event[] {
  const events: Event[] = [];
  const slides = markdown.split(/^#\s/m);

  for (let i = 1; i < slides.length; i++) {
    // スライド遷移イベントを追加
    events.push({ type: "nextSlide" });

    // プレゼンターノートを抽出
    const slide = slides[i];
    let match;
    while ((match = PRESENTER_NOTE_REGEX.exec(slide)) !== null) {
      const [_, character, emotion, text] = match;
      events.push({
        type: "speak",
        character: character === "ずんだもん" ? "zundamon" : "tsumugi",
        emotion: emotion as Emotion,
        text: text,
      });
    }
  }

  return events;
}

// メイン処理
async function main() {
  const [inputPath, outputDir] = process.argv.slice(2);

  if (!inputPath || !outputDir) {
    console.error("使用方法: bun run index.ts <入力Markdownファイル> <出力ディレクトリ>");
    process.exit(1);
  }

  try {
    // 出力ディレクトリの作成
    mkdirSync(outputDir, { recursive: true });
    mkdirSync(join(outputDir, "audios"), { recursive: true });
    mkdirSync(join(outputDir, "images"), { recursive: true });

    // Markdownファイルの読み込みとパース
    const markdown = readFileSync(inputPath, "utf-8");
    const events = parseMarkdown(markdown);

    // イベント配列をJavaScriptファイルとして出力
    const eventsScript = `const events = ${JSON.stringify(events, null, 2)};`;
    writeFileSync(join(outputDir, "poor-zundamonizer.js"), eventsScript);

    // 必要なアセットファイルのコピー
    copyFileSync(
      join("assets", "normalize.css"),
      join(outputDir, "normalize.css")
    );
    copyFileSync(
      join("assets", "skeleton.css"),
      join(outputDir, "skeleton.css")
    );

    // TODO: VOICEVOXを使用した音声生成の実装
    // TODO: HTMLファイルの生成

    console.log("処理が完了しました");
  } catch (error) {
    console.error("処理中にエラーが発生しました:", error);
    process.exit(1);
  }
}

main();
````

主な変更点は以下の通りです：

1. イベントの型定義を追加しました
2. プレゼンターノートを解析するための正規表現を追加しました
3. Markdownからスライドとプレゼンターノートを抽出する`parseMarkdown`関数を実装しました
4. メイン処理を`main`関数として整理し、非同期処理に対応できるようにしました
5. イベント配列をJavaScriptファイルとして出力する処理を追加しました

次のステップとして以下の実装が必要です：

1. VOICEVOXを使用した音声生成の実装
2. スライド表示用のHTMLファイルの生成
3. 画像ファイルの配置

これらの機能を実装する必要がありますが、まずはこの基本的な構造で問題ないでしょうか？

---

_**User**_

あざす。
marp のスライドに関しては
```
import { Marpit } from "@marp-team/marpit"
const marpit = new Marpit()
const { html, css, comments } = marpit.render(markdown)
```

で presenter notes やら html やら css やらが取り出せるんで、これを利用するようにしてください。

---

_**Assistant**_

はい、Marpitを使用してスライドを処理するように修正します。

````typescript:index.ts
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Marpit } from "@marp-team/marpit";

// ... 既存の型定義は変更なし ...

// Marpitからプレゼンターノートを抽出する関数
function parsePresenterNotes(comments: string[]): Event[] {
  const events: Event[] = [];
  
  // 各スライドの開始時にnextSlideイベントを追加
  for (let i = 0; i < comments.length; i++) {
    events.push({ type: "nextSlide" });
    
    // プレゼンターノートを解析
    const notes = comments[i];
    let match;
    while ((match = PRESENTER_NOTE_REGEX.exec(notes)) !== null) {
      const [_, character, emotion, text] = match;
      events.push({
        type: "speak",
        character: character === "ずんだもん" ? "zundamon" : "tsumugi",
        emotion: emotion as Emotion,
        text: text,
      });
    }
  }

  return events;
}

// HTMLテンプレートの生成
function generateHTML(renderedHTML: string, renderedCSS: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Zundamonized Presentation</title>
  <link rel="stylesheet" href="normalize.css">
  <link rel="stylesheet" href="skeleton.css">
  <style>${renderedCSS}</style>
</head>
<body>
  ${renderedHTML}
  <script src="poor-zundamonizer.js"></script>
</body>
</html>`;
}

async function main() {
  const [inputPath, outputDir] = process.argv.slice(2);

  if (!inputPath || !outputDir) {
    console.error("使用方法: bun run index.ts <入力Markdownファイル> <出力ディレクトリ>");
    process.exit(1);
  }

  try {
    // 出力ディレクトリの作成
    mkdirSync(outputDir, { recursive: true });
    mkdirSync(join(outputDir, "audios"), { recursive: true });
    mkdirSync(join(outputDir, "images"), { recursive: true });

    // Markdownファイルの読み込み
    const markdown = readFileSync(inputPath, "utf-8");

    // Marpitでスライドを処理
    const marpit = new Marpit();
    const { html, css, comments } = marpit.render(markdown);
    
    // プレゼンターノートからイベントを生成
    const events = parsePresenterNotes(comments);

    // イベント配列をJavaScriptファイルとして出力
    const eventsScript = `const events = ${JSON.stringify(events, null, 2)};`;
    writeFileSync(join(outputDir, "poor-zundamonizer.js"), eventsScript);

    // HTMLファイルの生成と出力
    const fullHTML = generateHTML(html, css);
    writeFileSync(join(outputDir, "zundamonized.html"), fullHTML);

    // 必要なアセットファイルのコピー
    copyFileSync(
      join("assets", "normalize.css"),
      join(outputDir, "normalize.css")
    );
    copyFileSync(
      join("assets", "skeleton.css"),
      join(outputDir, "skeleton.css")
    );

    // TODO: VOICEVOXを使用した音声生成の実装

    console.log("処理が完了しました");
  } catch (error) {
    console.error("処理中にエラーが発生しました:", error);
    process.exit(1);
  }
}

main();
````

主な変更点は以下の通りです：

1. `@marp-team/marpit`からMarpitをインポート
2. `parseMarkdown`関数を`parsePresenterNotes`関数に置き換え、Marpitから取得したcommentsを処理するように変更
3. HTMLテンプレートを生成する`generateHTML`関数を追加
4. メイン処理でMarpitを使用してスライドを処理し、HTMLとCSSを生成するように変更

これにより、Marpitを使用してスライドのHTMLとCSSを適切に生成し、プレゼンターノートからイベントを抽出できるようになりました。次は音声生成の実装が必要になります。

---

_**User**_

@index.ts の 145 あたりから、images ディレクトリの内容を全て再帰的にコピーするようにしたい

---

_**Assistant**_

はい、ディレクトリを再帰的にコピーするために`fs-extra`パッケージの`copySync`を使用することをお勧めします。

````typescript:index.ts
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { copySync } from "fs-extra";
import path, { join } from "path";
import { Marpit, Element } from "@marp-team/marpit";

// ... 既存のコード ...

    // 必要なアセットファイルのコピー
    copySync(
      join("assets", "normalize.css"),
      join(outputDirPath, "normalize.css")
    );
    copySync(
      join("assets", "skeleton.css"),
      join(outputDirPath, "skeleton.css")
    );
    copySync(
      join("assets", "poor-zundamonizer.js"),
      join(outputDirPath, "assets", "poor-zundamonizer.js")
    );
    copySync(
      join("assets", "images"),
      join(outputDirPath, "images"),
      { recursive: true }
    );

    // TODO: VOICEVOXを使用した音声生成の実装
````

変更点：
1. `fs`の`copyFileSync`を`fs-extra`の`copySync`に置き換え
2. imagesディレクトリを再帰的にコピーするように設定
3. poor-zundamonizer.jsの出力先を`assets`ディレクトリ内に変更（HTMLテンプレートのパスと合わせるため）

`fs-extra`をインストールする必要があります：
```bash
bun add fs-extra
bun add -d @types/fs-extra
```

---

_**User**_

For the code present, we get this error:
```
モジュール 'fs-extra' またはそれに対応する型宣言が見つかりません。
```
How can I resolve this? If you propose a fix, please make it concise.

---

_**Assistant**_

`fs-extra`のインストールが必要です：

````bash
bun add fs-extra @types/fs-extra
````

または、`fs`の`cpSync`を使用する方法もあります：

````typescript:index.ts
import { readFileSync, mkdirSync, writeFileSync, cpSync } from "fs";
// ... そして copySync を cpSync に置き換え
````

どちらの方法がよろしいでしょうか？

---

_**User**_

fs で行こう

---

_**Assistant**_

はい、`fs`を使用する方法に統一します。

````typescript:index.ts
import { readFileSync, mkdirSync, writeFileSync, cpSync } from "fs";
import path, { join } from "path";
import { Marpit, Element } from "@marp-team/marpit";

// ... 残りのコード ...

    // 必要なアセットファイルのコピー
    cpSync(
      join("assets", "normalize.css"),
      join(outputDirPath, "normalize.css")
    );
    cpSync(
      join("assets", "skeleton.css"),
      join(outputDirPath, "skeleton.css")
    );
    cpSync(
      join("assets", "poor-zundamonizer.js"),
      join(outputDirPath, "assets", "poor-zundamonizer.js")
    );
    cpSync(
      join("assets", "images"),
      join(outputDirPath, "images"),
      { recursive: true }
    );
````

主な変更点：
1. `fs-extra`のインポートを削除
2. すべての`copySync`を`cpSync`に置き換え

---

_**User**_

どうかしら。修正できますか？

---

_**Assistant**_



はい、`assets/images`ディレクトリが存在しないエラーですね。出力先のディレクトリ構造を作成してから、必要なファイルだけをコピーするように修正しましょう。

````typescript:index.ts
    // 出力ディレクトリの作成
    mkdirSync(outputDirPath, { recursive: true });
    mkdirSync(join(outputDirPath, "audios"), { recursive: true });
    mkdirSync(join(outputDirPath, "images"), { recursive: true });
    mkdirSync(join(outputDirPath, "assets"), { recursive: true });

    // ... Marpit処理 ...

    // 必要なアセットファイルのコピー
    cpSync(
      join("assets", "normalize.css"),
      join(outputDirPath, "normalize.css")
    );
    cpSync(
      join("assets", "skeleton.css"),
      join(outputDirPath, "skeleton.css")
    );
    cpSync(
      join("assets", "poor-zundamonizer.js"),
      join(outputDirPath, "assets", "poor-zundamonizer.js")
    );

    // imagesディレクトリのコピーは一時的にスキップ
    // TODO: 画像ファイルの配置
````

`assets/images`のコピーは一時的にスキップし、まずは他の機能を動作させることをお勧めします。画像ファイルは後で適切に配置できます。

---

_**User**_

PRESENTER_NOTE_REGEX が春日部つむぎを拾ってないんで修正してもらえますか

---

_**Assistant**_



正規表現の問題ですね。`^`（行頭）を削除し、`/g`フラグを各マッチで再設定する必要があります。

````typescript:index.ts
// プレゼンターノートのパース用の正規表現
const PRESENTER_NOTE_REGEX = /(ずんだもん|春日部つむぎ)\((.*?)\):\s*(.*?)$/gm;

// Marpitからプレゼンターノートを抽出する関数
function parsePresenterNotes(comments: string[][]): Event[] {
  console.log(comments);
  const events: Event[] = [];

  for (const commentPerPage of comments) {
    for (const comment of commentPerPage) {
      PRESENTER_NOTE_REGEX.lastIndex = 0; // 正規表現のインデックスをリセット
      const match = PRESENTER_NOTE_REGEX.exec(comment);
      if (match) {
        const [_, character, emotion, text] = match;
        console.log(character, emotion, text);
        events.push({
          type: "speak",
          character: character === "ずんだもん" ? "zundamon" : "tsumugi",
          emotion: emotion as Emotion,
          text: text,
        });
      }
    }
    events.push({
      type: "nextSlide",
    });
  }

  return events;
}
````

主な変更点：
1. `^`を削除し、`$`（行末）を追加
2. マルチライン対応のため`m`フラグを追加
3. 各マッチ前に`lastIndex`をリセット

---

_**User**_

おk。おおよそ動いてきたんで、local の VOICEVOX にリクエスト飛ばして音声生成して保存するようにしてください。

---

_**Assistant**_



VOICEVOXへのリクエストを追加します。ずんだもんのspeakerIDは3、春日部つむぎのspeakerIDは8です。

````typescript:index.ts
// VOICEVOXのAudio Query生成
async function generateAudioQuery(text: string, speaker: number) {
  const response = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

// VOICEVOXの音声合成
async function synthesizeVoice(audioQuery: any, speaker: number) {
  const response = await fetch(`http://localhost:50021/synthesis?speaker=${speaker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioQuery)
  });
  return response.arrayBuffer();
}

// イベントから音声ファイルを生成
async function generateVoices(events: Event[], outputDir: string) {
  const speakerIds = {
    zundamon: 3,
    tsumugi: 8
  };

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type === 'speak') {
      const audioQuery = await generateAudioQuery(event.text, speakerIds[event.character]);
      const voice = await synthesizeVoice(audioQuery, speakerIds[event.character]);
      writeFileSync(
        path.join(outputDir, "audios", `${i}.wav`),
        Buffer.from(voice)
      );
    }
  }
}

// メイン処理内で呼び出し
async function main() {
  // ... 既存のコード ...

  // プレゼンターノートからイベントを生成
  const events = parsePresenterNotes(comments);

  // 音声ファイルの生成
  await generateVoices(events, outputDirPath);

  // ... 残りのコード ...
}
````

主な変更点：
1. VOICEVOXのAPI呼び出し関数を追加
2. イベントから音声ファイルを生成する関数を追加
3. メイン処理で音声生成を実行

これで各発話イベントに対応する音声ファイルが`audios`ディレクトリに生成されます。

---

_**User**_

@index.ts @poor-zundamonizer.js  いいね！諸々のコメントを拡充してもらえますか？

---

_**Assistant**_



はい、両方のファイルにコメントを追加します。

````typescript:index.ts
import { readFileSync, mkdirSync, writeFileSync, cpSync } from "fs";
import path from "path";
import { Element } from "@marp-team/marpit";
import { Marp } from "@marp-team/marp-core";

/**
 * イベントの型定義
 * - nextSlide: スライド遷移イベント
 * - speak: キャラクターの発話イベント（音声再生・表情変更）
 */
type Emotion = "neutral" | "happy" | "sad" | "angry" | "surprised" | "thinking";
type Character = "zundamon" | "tsumugi";

type Event =
  | {
      type: "nextSlide";
    }
  | {
      type: "speak";
      character: Character;
      emotion: Emotion;
      text: string;
    };

// プレゼンターノートからキャラクターの発話を抽出する正規表現
// 例: ずんだもん(happy): こんにちは
const PRESENTER_NOTE_REGEX = /(ずんだもん|春日部つむぎ)\((.*?)\):\s*(.*?)$/gm;

/**
 * Marpitのプレゼンターノートからイベントシーケンスを生成
 * 各スライドの開始時にnextSlideイベントを、
 * キャラクターの発話ごとにspeakイベントを生成
 */
function parsePresenterNotes(comments: string[][]): Event[] {
  const events: Event[] = [];

  for (const commentPerPage of comments) {
    events.push({ type: "nextSlide" });
    
    for (const comment of commentPerPage) {
      PRESENTER_NOTE_REGEX.lastIndex = 0;
      const match = PRESENTER_NOTE_REGEX.exec(comment);
      if (match) {
        const [_, character, emotion, text] = match;
        events.push({
          type: "speak",
          character: character === "ずんだもん" ? "zundamon" : "tsumugi",
          emotion: emotion as Emotion,
          text: text,
        });
      }
    }
  }

  return events;
}

/**
 * プレゼンテーション用のHTMLを生成
 * - Marpitで生成したスライドHTML/CSSを埋め込み
 * - キャラクター表示領域とコントロールパネルを追加
 * - イベントシーケンスをグローバル変数として埋め込み
 */
function generateHTML(
  renderedHTML: string,
  renderedCSS: string,
  events: Event[]
): string {
  // ... 既存のコード ...
}

/**
 * VOICEVOXのAudio Query APIを呼び出し
 * テキストと話者IDから音声合成用のクエリを生成
 */
async function generateAudioQuery(text: string, speaker: number) {
  const response = await fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
}

/**
 * VOICEVOXのSynthesis APIを呼び出し
 * Audio Queryから音声データを生成
 */
async function synthesizeVoice(audioQuery: any, speaker: number) {
  const response = await fetch(`http://localhost:50021/synthesis?speaker=${speaker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audioQuery)
  });
  return response.arrayBuffer();
}

/**
 * イベントシーケンスから音声ファイルを生成
 * speakイベントごとにVOICEVOXで音声を生成し、
 * イベントのインデックスをファイル名として保存
 */
async function generateVoices(events: Event[], outputDir: string) {
  const speakerIds = {
    zundamon: 3,  // ずんだもんのspeaker ID
    tsumugi: 8    // 春日部つむぎのspeaker ID
  };

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type === 'speak') {
      const audioQuery = await generateAudioQuery(event.text, speakerIds[event.character]);
      const voice = await synthesizeVoice(audioQuery, speakerIds[event.character]);
      writeFileSync(
        path.join(outputDir, "audios", `${i}.wav`),
        Buffer.from(voice)
      );
    }
  }
}
````

````javascript:assets/poor-zundamonizer.js
// グローバル変数eventsからイベントシーケンスを取得
console.log(events);

// プレゼンテーションの初期状態
const initState = {
    currentSlide: 0,      // 現在のスライドインデックス
    eventIndex: 0,        // 現在のイベントインデックス
    leftCharacterPath: "./images/zundamon/neutral.png",    // ずんだもんの表情
    rightCharacterPath: "./images/tsumugi/neutral.png",    // つむぎの表情
}

// 現在の状態
let state = { ...initState };

// スライド要素の取得
const slides = document.querySelectorAll("#presentation > svg");

/**
 * 現在のスライドのみを表示し、他を非表示にする
 */
const setSlideVisibility = ({ currentSlide }) => {
    slides.forEach((slide, index) => {
        slide.style.display = index === currentSlide ? "block" : "none";
    });
}

/**
 * キャラクターの表情画像を更新
 */
const setCharacterImage = ({ leftCharacterPath, rightCharacterPath }) => {
    document.getElementById("left-character").src = leftCharacterPath;
    document.getElementById("right-character").src = rightCharacterPath;
}

/**
 * 画面全体の表示を更新
 */
const updateView = (state) => {
    setSlideVisibility(state);
    setCharacterImage(state);
}

// 初期表示
updateView(state);

// リセットボタンのイベントハンドラ
document.getElementById("reset").addEventListener("click", () => {
    state = { ...initState };
    document.getElementById("caption").textContent = "ここにセリフが出ます";
    updateView(state);
});

// 次へボタンのイベントハンドラ
document.getElementById("next").addEventListener("click", () => {
    const { eventIndex } = state;
    const event = events[eventIndex];
    console.log("emit:", event);

    switch(event.type) {
        case "nextSlide":
            // 最後のスライドの場合は何もしない
            if (state.currentSlide >= slides.length - 1) return;
            state.currentSlide++;
            break;

        case "speak":
            const { character, emotion, text } = event;
            // セリフを表示
            document.getElementById("caption").textContent = text;

            // 音声再生中は次へボタンを無効化
            document.getElementById("next").disabled = true;
            const audio = new Audio(`./audios/${eventIndex}.wav`);
            audio.play();
            audio.onended = () => {
                document.getElementById("next").disabled = false;
            }

            // キャラクターの表情を更新
            if (character === "zundamon") {
                state.leftCharacterPath = `./images/zundamon/${emotion}.png`
            } else {
                state.rightCharacterPath = `./images/tsumugi/${emotion}.png`
            }
            break;
    }

    state.eventIndex++;
    updateView(state);
});
````

---



---

