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
