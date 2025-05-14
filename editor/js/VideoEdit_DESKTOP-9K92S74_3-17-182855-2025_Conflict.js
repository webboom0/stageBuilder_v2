import { UIPanel, UIInput, UIButton, UIRow } from "./libs/ui.js";
import { VideoEditTimeline } from "./VideoEdit.timeline.js";
import { Render } from "./VideoEdit.Render.js";
import { Music } from "./Music.js";

function VideoEdit(editor) {
  const signals = editor.signals; // 시그널 참조 저장
  let videoTimeline; // videoTimeline 변수를 함수 스코프에서 선언

  const _totalSeconds = 180; // 예시로 180초
  const _framesPerSecond = 60; // 초당 프레임
  const _newWindow = true; // renderView 새 창 열기

  const videoContainer = new UIPanel();
  videoContainer.setId("videoEdit");

  const setSeconds = () => {
    const _totalSeconds = 180;
    const optionGroup = new UIRow();
    optionGroup.setClass("optionGroup");
    document
      .querySelector("#timeline .leftGroupTop")
      .appendChild(optionGroup.dom);

    const inputSeconds = new UIInput();
    inputSeconds.setId("seconds");
    inputSeconds.setClass("totalSeconds");
    inputSeconds.dom.type = "number";
    inputSeconds.dom.min = 30;
    inputSeconds.dom.max = 180;
    inputSeconds.dom.value = _totalSeconds;
    inputSeconds.dom.step = 1;
    inputSeconds.dom.placeholder = "Seconds";
    // inputSeconds.dom.readOnly = true;
    // document.getElementById("videoEdit").appendChild(inputSeconds.dom);
    // videoContainer.add(inputSeconds);
    optionGroup.add(inputSeconds);

    inputSeconds.dom.addEventListener("change", () => {
      const newSeconds = parseInt(inputSeconds.dom.value);
      if (newSeconds > 30) {
        _totalSeconds = newSeconds;
      }
    });

    const setSecondsBtn = new UIButton();
    setSecondsBtn.setId("setSeconds");
    setSecondsBtn.setClass("setSecondsBtn Button");
    setSecondsBtn.dom.innerHTML = `
      <i class="fas fa-check"></i>
      <span>트랙시간설정(초) 변경하기</span>
    `;
    optionGroup.add(setSecondsBtn);
  };

  // FFmpeg 초기화 및 Music 인스턴스 생성을 Promise로 처리
  let musicInitialized = false;
  const initMusic = async () => {
    if (!musicInitialized) {
      try {
        console.log("Initializing FFmpeg and Music editor...");
        const { createFFmpeg, fetchFile } = FFmpeg;
        const ffmpeg = createFFmpeg({ log: true });
        await ffmpeg.load();
        console.log("FFmpeg loaded successfully");

        // ffmpeg와 fetchFile을 함께 전달
        const musicEditor = new Music({ ffmpeg, fetchFile }, _totalSeconds);

        // Music 인스턴스가 제대로 초기화되었는지 확인
        if (musicEditor && musicEditor.toJSON) {
          console.log("Music editor initialized successfully");
          const musicContainer = document.getElementById("music");
          if (musicContainer) {
            musicContainer.appendChild(musicEditor.dom);
            editor.music = musicEditor;
            musicInitialized = true;
            console.log("Music editor DOM added to container");
          } else {
            console.error("Music container element not found");
          }
        } else {
          console.error("Music editor not properly initialized");
        }
      } catch (error) {
        console.error("FFmpeg/Music initialization error:", error);
      }
    }
  };

  // Music 초기화
  initMusic().catch((error) => {
    console.error("Music initialization failed:", error);
  });

  // 비디오 타임라인 초기화 함수
  const initVideoTimeline = async () => {
    console.log("initVideoTimeline");
    try {
      videoTimeline = new VideoEditTimeline(
        editor,
        _totalSeconds,
        _framesPerSecond,
        _newWindow
      );
      await videoContainer.add(videoTimeline);
      setSeconds();

      // 초기화가 완료된 후 onLoad 호출
      if (videoTimeline && typeof videoTimeline.onLoad === "function") {
        videoTimeline.onLoad();
      }
      return videoTimeline;
    } catch (error) {
      console.error("Error in initVideoTimeline:", error);
      return null;
    }
  };

  // 초기 타임라인 생성
  initVideoTimeline();

  // editor.signals.editorCleared 시그널 리스너 추가
  signals.editorCleared.add(async function () {
    console.log("signals.editorCleared");
    try {
      if (videoTimeline) {
        // 기존 타임라인 제거
        videoContainer.remove(videoTimeline);
        // 새로운 타임라인 초기화 및 완료 대기
        await initVideoTimeline();
        console.log("VideoTimeline reinitialized after editor cleared");
      }
    } catch (error) {
      console.error("Error reinitializing VideoTimeline:", error);
    }
  });

  // objectRemoved 시그널 리스너 추가
  signals.objectRemoved.add(function () {
    console.log("signals.objectRemoved");
    try {
      if (videoTimeline) {
        // 기존 타임라인 제거
        videoContainer.remove(videoTimeline);
        // 새로운 타임라인 초기화
        initVideoTimeline();
        videoTimeline.onLoad();
        console.log("VideoTimeline onLoad called after object removed");
      }
    } catch (error) {
      console.error("Error calling onLoad after object removed:", error);
    }
  });

  return videoContainer;
}

export { VideoEdit };
