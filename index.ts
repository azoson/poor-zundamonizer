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
    events.push({ type: "nextSlide" });
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
  return `
<style>
${renderedCSS}
</style>
<link rel="stylesheet" href="./normalize.css">
<link rel="stylesheet" href="./skeleton.css">
<div class="container">
    <section id="header" style="margin-top: 4.0em">
        <h2>
            poor-zundamonizer
        </h2>
    </section>
    <hr>
    <div class="row">
    ${renderedHTML}
    </div>
    <hr>
    <div class="row"">
        <div class="three columns">
            <img src="./images/zundamon/neutral.png" alt="zundamon" class="u-max-full-width" id="left-character" style="transform: scaleX(-1);">
        </div>
        <div class="six columns">
            <strong id="caption" style="font-size: 2rem;">ここにセリフが出ます</strong>
        </div>
        <div class="three columns">
            <img src="./images/tsumugi/neutral.png" alt="tsumugi" class="u-max-full-width" id="right-character">
        </div>
    </div>
    <hr>
    <!-- コントロールパネル -->
    <div id="control-panel" class="row">
            <button id="reset">リセット</button>
            <button id="next">次へ</button>
    </div>
</div>
<script>
    const events = ${JSON.stringify(events)};
</script>
<script src="./poor-zundamonizer.js"></script>
`;
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

// メイン処理
async function main() {
  const [inputPath, outputDir] = process.argv.slice(2);

  if (!inputPath || !outputDir) {
    console.error(
      "使用方法: bun run index.ts <入力Markdownファイル> <出力ディレクトリ>"
    );
    process.exit(1);
  }

  const outputDirPath = path.relative(process.cwd(), outputDir);

  try {
    // 出力ディレクトリの作成
    mkdirSync(outputDirPath, { recursive: true });
    mkdirSync(path.join(outputDirPath, "audios"), { recursive: true });
    mkdirSync(path.join(outputDirPath, "images"), { recursive: true });

    // Markdownファイルの読み込み
    const markdown = readFileSync(inputPath, "utf-8");

    // Marpitでスライドを処理
    const marp = new Marp({
      html: true,
      container: new Element("article", {
        id: "presentation",
      }),
    });

    const { html, css, comments } = marp.render(markdown);

    // プレゼンターノートからイベントを生成
    const events = parsePresenterNotes(comments);

    // 音声ファイルの生成
    await generateVoices(events, outputDirPath);

    // HTMLファイルの生成と出力
    const fullHTML = generateHTML(html, css, events);
    writeFileSync(path.join(outputDirPath, "zundamonized.html"), fullHTML);

    // 必要なアセットファイルのコピー
    cpSync(
      path.join("assets", "normalize.css"),
      path.join(outputDirPath, "normalize.css")
    );
    cpSync(
      path.join("assets", "skeleton.css"),
      path.join(outputDirPath, "skeleton.css")
    );
    cpSync(
      path.join("assets", "poor-zundamonizer.js"),
      path.join(outputDirPath, "poor-zundamonizer.js")
    );
    cpSync(
      path.join("assets", "images"),
      path.join(outputDirPath, "images"),
      { recursive: true }
    );

    console.log("処理が完了しました");
  } catch (error) {
    console.error("処理中にエラーが発生しました:", error);
    process.exit(1);
  }
}

main();
