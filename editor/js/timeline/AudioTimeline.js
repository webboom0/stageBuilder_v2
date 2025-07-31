import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText, UIElement } from "../libs/ui.js";
import * as THREE from "three";

// editor/timeline/AudioTimeline.js
// 사용 가능한 음악 파일 목록 (동적으로 로드됨)
let AUDIO_FILES = [];

// 음악 파일 목록을 동적으로 로드하는 함수
async function loadAudioFilesFromFolder() {
  try {
    console.log("음악 폴더 스캔 시작...");

    // 기본 파일 목록 (Service Worker 캐시 문제를 피하기 위해 단순화)
    const defaultFiles = [
      { path: "../files/music/SUJESHUN.mp3", name: "SUJESHUN", displayName: "수제순" },
      { path: "../files/music/DRAMA.mp3", name: "DRAMA", displayName: "드라마" }
    ];

    console.log("기본 음악 파일 목록 사용:", defaultFiles);
    return defaultFiles;

  } catch (error) {
    console.error("음악 폴더 스캔 실패:", error);

    // 기본 파일 목록 반환
    return [
      {
        path: "../files/music/SUJESHUN.mp3",
        name: "SUJESHUN",
        displayName: "수제순"
      },
      {
        path: "../files/music/DRAMA.mp3",
        name: "DRAMA",
        displayName: "드라마"
      }
    ];
  }
}

// 음악 asset 선택을 위한 UI 클래스
class UIAudioAssetSelector extends UIElement {
  constructor(audioFiles, onSelect) {
    const dom = document.createElement("div");
    super(dom);

    this.dom.className = "audio-asset-selector";
    this.audioFiles = audioFiles;
    this.onSelect = onSelect;

    this.createUI();
  }

  createUI() {
    // 헤더
    const header = document.createElement("div");
    header.className = "asset-selector-header";
    header.innerHTML = `
      <h3>음악 선택</h3>
      <button class="close-btn">&times;</button>
    `;
    this.dom.appendChild(header);

    // 음악 목록 컨테이너
    const listContainer = document.createElement("div");
    listContainer.className = "audio-list-container";
    this.dom.appendChild(listContainer);

    // 음악 목록 생성 (안전성 검사 추가)
    if (!this.audioFiles || !Array.isArray(this.audioFiles)) {
      console.warn("음악 파일 목록이 유효하지 않습니다:", this.audioFiles);
      const noFilesMessage = document.createElement("div");
      noFilesMessage.className = "no-files-message";
      noFilesMessage.innerHTML = `
        <p>사용 가능한 음악 파일이 없습니다.</p>
        <p>files/music 폴더에 음악 파일을 추가해주세요.</p>
      `;
      listContainer.appendChild(noFilesMessage);
      return;
    }

    if (this.audioFiles.length === 0) {
      const noFilesMessage = document.createElement("div");
      noFilesMessage.className = "no-files-message";
      noFilesMessage.innerHTML = `
        <p>사용 가능한 음악 파일이 없습니다.</p>
        <p>files/music 폴더에 음악 파일을 추가해주세요.</p>
      `;
      listContainer.appendChild(noFilesMessage);
      return;
    }

    this.audioFiles.forEach((audioFile) => {
      const audioItem = document.createElement("div");
      audioItem.className = "audio-item";
      audioItem.innerHTML = `
        <div class="audio-info">
          <span class="audio-name">${audioFile.displayName}</span>
          <span class="audio-filename">${audioFile.name}.mp3</span>
        </div>
        <button class="add-audio-btn">추가</button>
      `;

      // 추가 버튼 클릭 이벤트
      const addBtn = audioItem.querySelector(".add-audio-btn");
      addBtn.addEventListener("click", () => {
        this.onSelect(audioFile);
        this.hide();
      });

      listContainer.appendChild(audioItem);
    });

    // 닫기 버튼 이벤트
    const closeBtn = header.querySelector(".close-btn");
    closeBtn.addEventListener("click", () => {
      this.hide();
    });

    // 스타일 추가
    this.addStyles();
  }

  addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .audio-asset-selector {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 20px;
        min-width: 300px;
        max-height: 400px;
        overflow-y: auto;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      }

      .asset-selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #444;
      }

      .asset-selector-header h3 {
        margin: 0;
        color: #fff;
        font-size: 16px;
      }

      .close-btn {
        background: none;
        border: none;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        background: #444;
        border-radius: 4px;
      }

      .audio-list-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .audio-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #333;
        border-radius: 6px;
        border: 1px solid #555;
      }

      .audio-item:hover {
        background: #3a3a3a;
        border-color: #666;
      }

      .audio-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .audio-name {
        color: #fff;
        font-weight: bold;
        font-size: 14px;
      }

      .audio-filename {
        color: #aaa;
        font-size: 12px;
      }

      .add-audio-btn {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .add-audio-btn:hover {
        background: #45a049;
      }

      .no-files-message {
        text-align: center;
        padding: 20px;
        color: #aaa;
      }

      .no-files-message p {
        margin: 5px 0;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  show() {
    this.dom.style.display = "block";
  }

  hide() {
    this.dom.style.display = "none";
  }
}

// 볼륨 컨트롤을 위한 커스텀 UIElement 클래스
class UIVolumeControl extends UIElement {
  constructor() {
    const dom = document.createElement("div");
    super(dom);

    this.dom.className = "volume-control";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = "100";
    slider.className = "volume-slider";

    const value = document.createElement("span");
    value.className = "volume-value";
    value.textContent = "100%";

    this.dom.appendChild(slider);
    this.dom.appendChild(value);

    this.slider = slider;
    this.value = value;
  }

  setValue(value) {
    this.slider.value = value;
    this.value.textContent = `${value}%`;
  }

  getValue() {
    return parseInt(this.slider.value) / 100;
  }

  onChange(callback) {
    this.slider.addEventListener("input", (e) => {
      const value = e.target.value;
      this.value.textContent = `${value}%`;
      callback(parseInt(value) / 100);
    });
  }
}

export class AudioTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.assetSelector = null;
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);

    // 음악 파일 목록을 동적으로 로드하고 asset 선택기 초기화
    this.initAudioTimeline();
  }

  // AudioTimeline 초기화
  async initAudioTimeline() {
    try {
      // 음악 파일 목록 동적 로드
      const loadedFiles = await loadAudioFilesFromFolder();
      AUDIO_FILES = loadedFiles || [];
      console.log("동적으로 로드된 음악 파일:", AUDIO_FILES);

      // asset 선택기 초기화
      this.initAssetSelector();

    } catch (error) {
      console.error("AudioTimeline 초기화 실패:", error);
      // 기본 파일 목록으로 초기화
      AUDIO_FILES = [
        {
          path: "../files/music/SUJESHUN.mp3",
          name: "SUJESHUN",
          displayName: "수제순"
        },
        {
          path: "../files/music/DRAMA.mp3",
          name: "DRAMA",
          displayName: "드라마"
        }
      ];
      this.initAssetSelector();
    }
  }

  // asset 선택기 초기화
  initAssetSelector() {
    this.assetSelector = new UIAudioAssetSelector(AUDIO_FILES, (selectedAudio) => {
      this.addAudioFromAsset(selectedAudio);
    });

    // DOM에 추가하되 숨김 상태로
    this.assetSelector.dom.style.display = "none";
    document.body.appendChild(this.assetSelector.dom);
  }

  // asset에서 오디오 추가
  addAudioFromAsset(audioFile) {
    console.log("선택된 오디오 asset:", audioFile);

    // 이미 같은 오디오가 있는지 확인
    const existingTrack = Array.from(this.tracks.values()).find(
      track => track.name === audioFile.name
    );

    if (existingTrack) {
      console.warn("이미 같은 오디오가 추가되어 있습니다:", audioFile.name);
      return;
    }

    // 오디오 로드 및 트랙 생성
    this.loadAudioFile(audioFile);
  }

  // 오디오 파일 로드
  loadAudioFile(audioFile) {
    console.log("오디오 파일 로드 시작:", audioFile.path);

    fetch(audioFile.path)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - 파일을 찾을 수 없습니다: ${audioFile.path}`);
        }
        console.log(`음악 파일 로드 성공: ${audioFile.name}`);
        return response.blob();
      })
      .then((blob) => {
        // Blob URL 생성
        const audioUrl = URL.createObjectURL(blob);
        const audioElement = new Audio();
        audioElement.src = audioUrl;
        audioElement.preload = "auto";

        audioElement.addEventListener("loadedmetadata", () => {
          console.log("오디오 메타데이터 로드됨:", audioElement.duration);

          // 오디오 트랙 생성
          const MIN_DURATION = 5;
          const MAX_DURATION = 180; // 3분
          const effectiveDuration = Math.min(
            MAX_DURATION,
            Math.max(MIN_DURATION, audioElement.duration)
          );

          const audioObject = new THREE.Object3D();
          audioObject.name = audioFile.name;

          // userData에 오디오 엘리먼트 저장
          audioObject.userData = {
            audioElement: audioElement,
            volume: 1.0,
            mute: false,
            playbackRate: 1.0,
            type: "audio",
            audioUrl: audioUrl,
            audioFile: audioFile, // 원본 파일 정보 저장
            audioStartTime: 0, // 오디오 시작 시간 (편집용) - 처음에는 0
            audioEndTime: audioElement.duration, // 오디오 끝 시간 (편집용) - 처음에는 전체 길이
            startTime: 0, // 클립 시작 시간 (타임라인상 위치)
            duration: effectiveDuration, // 클립 지속 시간 (타임라인상 길이)
          };

          // Scene에 오디오 객체 추가
          this.editor.scene.add(audioObject);
          console.log("오디오 객체 생성됨:", audioObject);

          // addTrack 호출 시 필요한 모든 정보를 전달
          const trackData = {
            name: audioFile.displayName || audioFile.name,
            type: "audio",
            duration: effectiveDuration,
            element: this.createTrackElement(effectiveDuration, audioFile.displayName || audioFile.name, audioFile.path),
            audioElement: audioElement,
          };

          // 트랙 생성
          const track = this.addTrack(audioObject.id, trackData);
          console.log("오디오 트랙 생성됨:", track);

          // 오디오 로드 완료 테스트
          audioElement.addEventListener("canplaythrough", () => {
            console.log("오디오 재생 준비 완료:", audioFile.name);
          });

          // Scene의 userData에도 오디오 정보 저장
          if (!this.editor.scene.userData.audio) {
            this.editor.scene.userData.audio = {};
          }
          this.editor.scene.userData.audio[audioObject.id] = {
            volume: 1.0,
            mute: false,
            playbackRate: 1.0,
            audioFile: audioFile,
          };

          // input 필드 초기화
          this.updateInputFields(0, audioElement.duration);
        });

        audioElement.addEventListener("error", (e) => {
          console.error("오디오 로드 에러:", e);
        });
      })
      .catch((error) => {
        console.error("오디오 파일 로드 실패:", error);

        // 사용자에게 알림
        if (error.message.includes('404')) {
          alert(`음악 파일을 찾을 수 없습니다: ${audioFile.name}\n\n파일이 files/music 폴더에 있는지 확인해주세요.`);
        } else {
          alert(`음악 파일 로드 중 오류가 발생했습니다: ${audioFile.name}\n\n${error.message}`);
        }
      });
  }

  // 타임라인 설정 업데이트
  updateSettings(newSettings) {
    console.log('AudioTimeline 설정 업데이트:', newSettings);

    // 기존 설정 백업
    const oldSettings = { ...this.options };

    // 기존 설정 업데이트
    this.options = { ...this.options, ...newSettings };

    // TimelineData의 frameRate 업데이트
    if (newSettings.framesPerSecond && this.timelineData) {
      this.timelineData.frameRate = newSettings.framesPerSecond;
    }

    // Scene의 timeline 설정 업데이트
    if (this.editor.scene) {
      if (!this.editor.scene.userData.timeline) {
        this.editor.scene.userData.timeline = {};
      }
      this.editor.scene.userData.timeline = { ...this.editor.scene.userData.timeline, ...newSettings };
    }

    // 클립 너비 업데이트 (시간 변경 시)
    if (newSettings.totalSeconds && oldSettings.totalSeconds !== newSettings.totalSeconds) {
      this.updateClipWidths(oldSettings.totalSeconds, newSettings.totalSeconds);
    }

    // UI 업데이트
    this.updateUI();

    console.log('AudioTimeline 설정이 성공적으로 업데이트되었습니다.');
  }

  // 클립 너비 업데이트
  updateClipWidths(oldTotalSeconds, newTotalSeconds) {
    console.log('AudioTimeline 클립 너비 업데이트:', { oldTotalSeconds, newTotalSeconds });

    const sprites = this.container.querySelectorAll('.animation-sprite');
    sprites.forEach(sprite => {
      const duration = parseFloat(sprite.dataset.duration) || 5;
      const currentLeft = parseFloat(sprite.style.left) || 0;

      // 클립의 절대 시작 시간 계산 (현재 위치 기반)
      const clipStartTime = (currentLeft / 100) * oldTotalSeconds;

      // 기존 너비 계산
      const oldWidth = (duration / oldTotalSeconds) * 100;
      // 새로운 너비 계산
      const newWidth = (duration / newTotalSeconds) * 100;

      console.log('AudioTimeline 클립 너비 업데이트:', {
        duration,
        clipStartTime,
        currentLeft: `${currentLeft}%`,
        oldWidth: `${oldWidth}%`,
        newWidth: `${newWidth}%`
      });

      // 너비 업데이트
      sprite.style.width = `${newWidth}%`;

      // 클립의 절대 시작 시간을 보존하여 새로운 위치 계산
      const newLeft = (clipStartTime / newTotalSeconds) * 100;

      // 클립이 타임라인 끝을 벗어나지 않도록 위치 조정
      const maxLeft = 100 - newWidth;
      const clampedLeft = Math.max(0, Math.min(maxLeft, newLeft));

      sprite.style.left = `${clampedLeft}%`;

      console.log('AudioTimeline 클립 위치 업데이트:', {
        originalStartTime: clipStartTime,
        newLeft: `${newLeft}%`,
        clampedLeft: `${clampedLeft}%`,
        maxLeft: `${maxLeft}%`
      });

      // 클립 내의 키프레임 위치 업데이트
      this.updateKeyframesInClipAfterTimeChange(sprite, oldTotalSeconds, newTotalSeconds);
    });
  }

  // 타임라인 시간 변경 후 클립 내 키프레임 위치 업데이트
  updateKeyframesInClipAfterTimeChange(sprite, oldTotalSeconds, newTotalSeconds) {
    console.log('AudioTimeline 클립 내 키프레임 위치 업데이트:', { oldTotalSeconds, newTotalSeconds });

    const keyframes = sprite.querySelectorAll('.keyframe');
    keyframes.forEach(keyframe => {
      // 키프레임의 데이터에서 절대 시간 정보 가져오기
      const keyframeTime = parseFloat(keyframe.dataset.time) || 0;
      const clipLeft = parseFloat(sprite.style.left) || 0;
      const clipDuration = parseFloat(sprite.dataset.duration) || 5;

      // 클립의 시작 시간 계산 (클립의 left 위치 기반)
      const clipStartTime = (clipLeft / 100) * oldTotalSeconds;

      // 키프레임의 절대 시간 (클립 시작 시간 + 키프레임의 상대 시간)
      const absoluteTime = clipStartTime + keyframeTime;

      // 새로운 시간 기준으로 클립의 시작 시간 계산
      const newClipStartTime = (clipLeft / 100) * newTotalSeconds;

      // 새로운 시간 기준으로 키프레임의 상대 시간 계산
      const newRelativeTime = absoluteTime - newClipStartTime;

      // 키프레임의 새로운 위치 계산 (클립 내에서의 상대적 위치)
      const newPosition = (newRelativeTime / clipDuration) * 100;

      console.log('AudioTimeline 키프레임 위치 업데이트:', {
        keyframeTime,
        clipLeft: `${clipLeft}%`,
        clipDuration,
        clipStartTime,
        absoluteTime,
        newClipStartTime,
        newRelativeTime,
        newPosition: `${newPosition}%`
      });

      // 키프레임 위치 업데이트 (클립 범위 내로 제한)
      const clampedPosition = Math.max(0, Math.min(100, newPosition));
      keyframe.style.left = `${clampedPosition}%`;
      keyframe.dataset.time = newRelativeTime.toFixed(3);

      console.log('AudioTimeline 최종 키프레임 위치:', {
        originalTime: keyframeTime,
        newLeft: `${clampedPosition}%`,
        newTime: newRelativeTime.toFixed(3)
      });
    });
  }

  initAudioTracks() {
    console.log("현재 트랙 수:", this.tracks.size);

    for (const track of this.tracks.values()) {
      if (track.type === "audio") {
        console.log("이미 오디오 트랙이 존재합니다:", track);
        return;
      }
    }

    // 기본 오디오 파일 (첫 번째 파일)을 로드
    if (!AUDIO_FILES || AUDIO_FILES.length === 0) {
      console.warn("사용 가능한 오디오 파일이 없습니다");
      return;
    }

    const defaultAudioFile = AUDIO_FILES[0];

    // Fetch를 사용하여 전체 오디오 파일을 한 번에 로드
    fetch(defaultAudioFile.path)
      .then((response) => response.blob())
      .then((blob) => {
        // Blob URL 생성
        const audioUrl = URL.createObjectURL(blob);
        const audioElement = new Audio();
        audioElement.src = audioUrl;
        audioElement.preload = "auto";

        audioElement.addEventListener("loadedmetadata", () => {
          console.log("오디오 메타데이터 로드됨:", audioElement.duration);

          const audioObject = new THREE.Object3D();
          audioObject.name = defaultAudioFile.name;

          // userData에 오디오 엘리먼트 저장
          audioObject.userData = {
            audioElement: audioElement,
            volume: 1.0,
            mute: false,
            playbackRate: 1.0,
            type: "audio",
            audioUrl: audioUrl, // Blob URL 저장
            audioFile: defaultAudioFile, // 원본 파일 정보 저장
          };

          // Scene에 오디오 객체 추가
          this.editor.scene.add(audioObject);
          console.log("오디오 객체 생성됨:", audioObject);

          // 오디오 트랙 생성
          const MIN_DURATION = 5;
          const MAX_DURATION = 180; // 3분
          const effectiveDuration = Math.min(
            MAX_DURATION,
            Math.max(MIN_DURATION, audioElement.duration)
          );

          // addTrack 호출 시 필요한 모든 정보를 전달
          const trackData = {
            name: defaultAudioFile.displayName || defaultAudioFile.name,
            type: "audio",
            duration: effectiveDuration,
            element: this.createTrackElement(effectiveDuration, defaultAudioFile.displayName || defaultAudioFile.name, defaultAudioFile.path),
            audioElement: audioElement,
          };

          // 트랙 생성
          const track = this.addTrack(audioObject.id, trackData);
          console.log("오디오 트랙 생성됨:", track);

          // 오디오 로드 완료 테스트
          audioElement.addEventListener("canplaythrough", () => {
            console.log("오디오 재생 준비 완료");
          });

          // Scene의 userData에도 오디오 정보 저장
          if (!this.editor.scene.userData.audio) {
            this.editor.scene.userData.audio = {};
          }
          this.editor.scene.userData.audio[audioObject.id] = {
            volume: 1.0,
            mute: false,
            playbackRate: 1.0,
            audioFile: defaultAudioFile,
          };
        });

        audioElement.addEventListener("error", (e) => {
          console.error("오디오 로드 에러:", e);
        });
      })
      .catch((error) => {
        console.error("오디오 파일 로드 실패:", error);
      });
  }

  // 트랙 엘리먼트 생성을 위한 별도 메서드
  createTrackElement(duration, trackName = "Audio", audioPath = null) {
    const trackTopArea = document.createElement("div");
    trackTopArea.className = "audio-tracks";

    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";
    trackHeader.innerHTML = `
      <div class="track-info">
        <span class="track-name">${trackName}</span>
      </div>
    `;
    trackTopArea.appendChild(trackHeader);

    const trackContent = document.createElement("div");
    trackContent.className = "track-content";

    const sprite = document.createElement("div");
    sprite.className = "audio-sprite";

    // 스프라이트 크기 설정
    const spriteWidth = (duration / this.options.totalSeconds) * 100;
    sprite.style.width = `${spriteWidth}%`;
    sprite.style.left = "0%";
    sprite.dataset.duration = duration;
    sprite.dataset.startTime = "0"; // 클립 시작 시간 (타임라인상 위치)
    sprite.dataset.audioStartTime = "0"; // 오디오 편집 시작 시간
    sprite.dataset.audioEndTime = duration.toString(); // 오디오 편집 끝 시간
    sprite.dataset.minWidth = (5 / this.options.totalSeconds) * 100;
    sprite.dataset.maxWidth = (180 / this.options.totalSeconds) * 100;

    // 파형을 그릴 캔버스 추가
    const waveformCanvas = document.createElement("canvas");
    waveformCanvas.className = "waveform-canvas";
    waveformCanvas.height = 30; // 클립 높이와 동일하게

    const spriteContent = document.createElement("div");
    spriteContent.className = "sprite-content";
    spriteContent.appendChild(waveformCanvas);

    sprite.innerHTML = `
      <div class="sprite-name">${trackName}</div>
    `;
    sprite.insertBefore(spriteContent, sprite.children[0]);

    trackContent.appendChild(sprite);
    trackTopArea.appendChild(trackContent);

    // 파형 그리기 (audioPath가 제공된 경우에만)
    if (audioPath) {
      this.drawWaveform(sprite.querySelector("canvas"), audioPath);
    }

    // 스프라이트 이벤트 바인딩 (track 객체를 찾아서 전달)
    const trackId = trackTopArea.querySelector('.track-header')?.dataset?.objectId;
    const track = trackId ? this.tracks.get(trackId) : null;
    this.bindSpriteEvents(sprite, track);

    return trackTopArea;
  }

  // 파형 그리기 메서드 추가
  async drawWaveform(canvas, audioPath = null) {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // audioPath가 제공되지 않으면 기본 경로 사용
      const path = audioPath || AUDIO_FILES[0].path;
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const ctx = canvas.getContext("2d");
      const width = (canvas.width = canvas.parentElement.offsetWidth);
      const height = canvas.height;
      const data = audioBuffer.getChannelData(0);
      const step = Math.ceil(data.length / width);
      const amp = height / 2;

      // 배경 지우기
      ctx.clearRect(0, 0, width, height);

      // 파형 그리기 스타일 설정
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; // 더 밝은 색상으로 변경
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"; // 외곽선 추가
      ctx.lineWidth = 1;

      // 중앙선 기준으로 위아래로 파형 그리기
      const middle = height / 2;

      ctx.beginPath();
      ctx.moveTo(0, middle);

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        const y1 = middle + min * amp;
        const y2 = middle + max * amp;

        ctx.fillRect(i, y1, 1, y2 - y1);
      }

      ctx.stroke();
    } catch (error) {
      console.error("파형 그리기 오류:", error);
    }
  }

  // 오디오 파형 표시 등 특수 기능
  showWaveform(audioData) { }

  // BaseTimeline의 추상 메서드 구현
  getPropertyValue(object, propertyType) {
    switch (propertyType) {
      case "volume":
        return object.userData.volume || 1.0;
      case "mute":
        return object.userData.mute || false;
      case "playbackRate":
        return object.userData.playbackRate || 1.0;
      default:
        return null;
    }
  }

  updateFrame(frame) {
    // 재생 중이 아니면 오디오 재생 관련 업데이트를 하지 않음
    const isPlaying = this.editor.scene?.userData?.timeline?.isPlaying;
    if (!isPlaying) {
      console.log("AudioTimeline updateFrame: 재생 중이 아니므로 오디오 재생 업데이트 건너뜀");
      return;
    }

    this.tracks.forEach((track) => {
      const object = this.editor.scene.getObjectById(parseInt(track.objectId));
      if (!object) {
        // 오디오 객체가 없으면 트랙도 삭제
        console.warn("오디오 객체가 없어서 트랙 삭제:", track.objectId);
        this.removeTrack(track.objectId);
        return;
      }

      let hasChanges = false;

      ["volume", "mute", "playbackRate"].forEach((propertyType) => {
        const keyframes = track.keyframes[propertyType];
        if (!keyframes || keyframes.size === 0) return;

        const keyframeArray = Array.from(keyframes.entries()).sort(
          ([a], [b]) => a - b
        );
        let prevKeyframe = null;
        let nextKeyframe = null;

        for (let i = 0; i < keyframeArray.length; i++) {
          if (keyframeArray[i][0] <= frame) {
            prevKeyframe = keyframeArray[i];
          }
          if (keyframeArray[i][0] > frame) {
            nextKeyframe = keyframeArray[i];
            break;
          }
        }

        if (prevKeyframe && nextKeyframe) {
          const [prevFrame, prevData] = prevKeyframe;
          const [nextFrame, nextData] = nextKeyframe;
          const alpha = (frame - prevFrame) / (nextFrame - prevFrame);
          this.interpolateProperty(
            object,
            propertyType,
            prevData.value,
            nextData.value,
            alpha
          );
          hasChanges = true;
        } else if (prevKeyframe) {
          this.setPropertyValue(object, propertyType, prevKeyframe[1].value);
          hasChanges = true;
        }
      });

      // 오디오 요소 업데이트 (클립 시작/끝 시간 반영)
      if (object.userData.audioElement) {
        const audioElement = object.userData.audioElement;

        // 오디오 요소가 유효한지 확인
        if (!audioElement || audioElement.readyState === 0) {
          console.warn("오디오 요소가 유효하지 않아서 트랙 삭제:", track.objectId);
          this.removeTrack(track.objectId);
          return;
        }

        const sprite = track.element.querySelector(".audio-sprite");

        if (sprite) {
          // 클립의 시작 시간과 지속 시간 가져오기
          const clipStartTime = parseFloat(sprite.dataset.startTime) || 0;
          const clipDuration = parseFloat(sprite.dataset.duration) || audioElement.duration;
          const clipEndTime = clipStartTime + clipDuration;

          // 현재 타임라인 시간 (초)
          const currentTimeInSeconds = frame / this.options.framesPerSecond;

          // 클립 범위 내에 있는지 확인
          if (currentTimeInSeconds >= clipStartTime && currentTimeInSeconds <= clipEndTime) {
            // 클립 내에서의 상대적 시간 계산
            const relativeTime = currentTimeInSeconds - clipStartTime;

            // 오디오 편집 시간 적용
            const audioStartTime = object.userData.audioStartTime || 0;
            const audioEndTime = object.userData.audioEndTime || audioElement.duration;
            const effectiveAudioStartTime = Math.max(0, Math.min(audioStartTime, audioElement.duration));
            const effectiveAudioEndTime = Math.max(effectiveAudioStartTime, Math.min(audioEndTime, audioElement.duration));

            // 오디오 요소 업데이트
            audioElement.volume = object.userData.volume || 1.0;
            audioElement.muted = object.userData.mute || false;
            audioElement.playbackRate = object.userData.playbackRate || 1.0;

            // 오디오 재생 위치 계산 (편집 시간 반영)
            const audioPlayTime = effectiveAudioStartTime + (relativeTime % (effectiveAudioEndTime - effectiveAudioStartTime));

            // 오디오 재생 위치는 큰 차이가 있을 때만 업데이트 (버벅임 방지)
            const timeDifference = Math.abs(audioElement.currentTime - audioPlayTime);
            if (timeDifference > 0.1) { // 0.1초 이상 차이가 날 때만 업데이트
              audioElement.currentTime = audioPlayTime;
            }

            // 오디오가 재생 중이 아니면 재생 시작 (한 번만)
            if (audioElement.paused && !audioElement._playRequested) {
              audioElement._playRequested = true;
              audioElement.play().then(() => {
                audioElement._playRequested = false;
              }).catch((error) => {
                console.error("AudioTimeline에서 오디오 재생 실패:", error);
                audioElement._playRequested = false;
              });
            }

            hasChanges = true;
          } else {
            // 클립 범위 밖이면 오디오 정지
            if (!audioElement.paused) {
              audioElement.pause();
              audioElement._playRequested = false;
            }
          }
        } else {
          // 스프라이트가 없으면 기존 방식으로 처리
          audioElement.volume = object.userData.volume || 1.0;
          audioElement.muted = object.userData.mute || false;
          audioElement.playbackRate = object.userData.playbackRate || 1.0;

          // 현재 프레임이 오디오 시작 시간과 일치하면 재생
          if (frame === 0 && audioElement.paused && !audioElement._playRequested) {
            audioElement._playRequested = true;
            audioElement.currentTime = 0;
            audioElement.play().then(() => {
              audioElement._playRequested = false;
            }).catch((error) => {
              console.error("오디오 재생 실패:", error);
              audioElement._playRequested = false;
            });
          }
        }
      }

      if (hasChanges && this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(object);
      }
    });
  }

  isWithinClipRange(track, frame) {
    const sprite = track.element.querySelector(".audio-sprite");
    if (!sprite) return true;

    const clipDuration = parseFloat(sprite.dataset.duration);
    const maxFrame = Math.floor(clipDuration * this.options.framesPerSecond);
    const clipLeft = parseFloat(sprite.style.left);
    const clipWidth = parseFloat(sprite.style.width);

    const framePercent =
      (frame / (this.options.totalSeconds * this.options.framesPerSecond)) *
      100;

    // 허용 범위 추가 (0.5초에 해당하는 퍼센트)
    const tolerancePercent = (0.5 / this.options.totalSeconds) * 100;

    return framePercent >= clipLeft - tolerancePercent && framePercent <= clipLeft + clipWidth + tolerancePercent;
  }

  // 오디오 특화 메서드들
  interpolateProperty(object, propertyType, startValue, endValue, t) {
    switch (propertyType) {
      case "volume":
        object.userData.volume = startValue + (endValue - startValue) * t;
        break;
      case "mute":
        // mute는 보간하지 않고 이전 키프레임 값 사용
        object.userData.mute = startValue;
        break;
      case "playbackRate":
        object.userData.playbackRate = startValue + (endValue - startValue) * t;
        break;
    }
  }

  setPropertyValue(object, propertyType, value) {
    switch (propertyType) {
      case "volume":
        object.userData.volume = value;
        break;
      case "mute":
        object.userData.mute = value;
        break;
      case "playbackRate":
        object.userData.playbackRate = value;
        break;
    }
  }

  // UI 관련 메서드들
  createPropertyPanel() {
    const panel = new UIPanel();
    panel.setClass("property-edit-panel");

    // 음악 추가 버튼
    const addMusicRow = new UIRow();

    const addMusicButton = document.createElement("button");
    addMusicButton.textContent = "음악 선택";
    addMusicButton.className = "add-music-btn";
    addMusicButton.addEventListener("click", () => {
      console.log("음악 추가 버튼 클릭됨");
      if (this.assetSelector) {
        this.assetSelector.show();
      } else {
        console.warn("음악 선택기가 아직 초기화되지 않았습니다");
        addMusicButton.textContent = "로딩 중...";
        addMusicButton.disabled = true;

        // 잠시 후 다시 시도
        setTimeout(() => {
          if (this.assetSelector) {
            addMusicButton.textContent = "음악 선택";
            addMusicButton.disabled = false;
            this.assetSelector.show();
          }
        }, 1000);
      }
    });

    addMusicRow.add(new UIElement(addMusicButton));
    panel.add(addMusicRow);

    // 전체 볼륨 조절 UI
    const volumeRow = new UIRow();
    volumeRow.add(new UIText("volume"));
    volumeRow.addClass("volume-row");

    const volumeControl = new UIVolumeControl();
    volumeControl.onChange((value) => {
      // 모든 오디오 트랙의 볼륨을 한 번에 업데이트
      this.tracks.forEach((track) => {
        const audioObject = this.editor.scene.getObjectById(
          parseInt(track.objectId)
        );
        if (!audioObject || !audioObject.userData.audioElement) return;

        const audio = audioObject.userData.audioElement;
        audio.volume = value;
        audioObject.userData.volume = value;

        // THREE.js Audio 객체가 있는 경우에도 볼륨 업데이트
        if (audioObject.userData.audio) {
          audioObject.userData.audio.setVolume(value);
        }
      });

      // 씬의 전체 볼륨 설정 업데이트
      if (!this.editor.scene.userData.audio) {
        this.editor.scene.userData.audio = {};
      }
      this.editor.scene.userData.audio.masterVolume = value;
    });

    // 초기 볼륨 값 설정
    const masterVolume = this.editor.scene.userData.audio?.masterVolume || 1.0;
    volumeControl.setValue(masterVolume * 100);

    volumeRow.add(volumeControl);
    panel.add(volumeRow);

    // 오디오 편집 UI 추가
    const audioEditRow = new UIRow();
    // audioEditRow.add(new UIText("오디오 편집"));
    panel.add(audioEditRow);

    // 오디오 시작 시간 조절
    const startTimeRow = new UIRow();
    startTimeRow.add(new UIText("시작 시간"));

    const startTimeInput = document.createElement("input");
    startTimeInput.type = "text";
    startTimeInput.className = "time-input";
    startTimeInput.placeholder = "00:00.00";

    startTimeInput.addEventListener("change", (e) => {
      const timeString = e.target.value;
      const startTime = this.parseFrameToSeconds(timeString);
      this.updateAudioStartTime(startTime);
    });

    // input 필드를 클래스 변수로 저장
    this.startTimeInput = startTimeInput;

    startTimeRow.add(new UIElement(startTimeInput));
    panel.add(startTimeRow);

    // 오디오 끝 시간 조절
    const endTimeRow = new UIRow();
    endTimeRow.add(new UIText("끝 시간"));

    const endTimeInput = document.createElement("input");
    endTimeInput.type = "text";
    endTimeInput.className = "time-input";
    endTimeInput.placeholder = "00:00.00";

    endTimeInput.addEventListener("change", (e) => {
      const timeString = e.target.value;
      const endTime = this.parseFrameToSeconds(timeString);
      this.updateAudioEndTime(endTime);
    });

    // input 필드를 클래스 변수로 저장
    this.endTimeInput = endTimeInput;

    endTimeRow.add(new UIElement(endTimeInput));
    panel.add(endTimeRow);

    // 클립 위치 조절 UI 추가
    const clipPositionRow = new UIRow();
    clipPositionRow.add(new UIText("클립 위치"));
    panel.add(clipPositionRow);

    // 클립 시작 위치 조절
    const clipStartRow = new UIRow();
    clipStartRow.add(new UIText("시작 위치"));

    const clipStartInput = document.createElement("input");
    clipStartInput.type = "text";
    clipStartInput.className = "time-input";
    clipStartInput.placeholder = "00:00.00";

    clipStartInput.addEventListener("change", (e) => {
      const timeString = e.target.value;
      const startTime = this.parseFrameToSeconds(timeString);
      this.updateClipStartTime(startTime);
    });

    // input 필드를 클래스 변수로 저장
    this.clipStartInput = clipStartInput;

    clipStartRow.add(new UIElement(clipStartInput));
    panel.add(clipStartRow);

    // 클립 길이 조절 (자동 계산)
    const clipDurationRow = new UIRow();
    clipDurationRow.add(new UIText("클립 길이 (자동)"));

    const clipDurationInput = document.createElement("input");
    clipDurationInput.type = "text";
    clipDurationInput.className = "time-input";
    clipDurationInput.placeholder = "00:00.00";
    clipDurationInput.readOnly = true; // 읽기 전용으로 설정

    // input 필드를 클래스 변수로 저장
    this.clipDurationInput = clipDurationInput;

    clipDurationRow.add(new UIElement(clipDurationInput));
    panel.add(clipDurationRow);

    // 볼륨 컨트롤 스타일 추가
    const style = document.createElement("style");
    style.textContent = `
      .volume-control {
        display: flex;
        align-items: center;
        width: 150px;
      }
      
      .volume-slider {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        background: #ddd;
        border-radius: 2px;
        outline: none;
      }
      
      .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        background: #4CAF50;
        border-radius: 50%;
        cursor: pointer;
      }
      
      .volume-value {
        text-align: right;
        color: #fff;
        width: 30px;
      }

      .add-music-btn {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .add-music-btn:hover {
        background: #45a049;
      }

      .add-music-btn:disabled {
        background: #666;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .add-music-btn:disabled:hover {
        background: #666;
      }

      .time-input {
        background: #333;
        border: 1px solid #555;
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        width: 120px;
        font-size: 12px;
        font-family: 'Courier New', monospace;
        text-align: center;
      }

      .time-input:focus {
        border-color: #4CAF50;
        outline: none;
      }

      .time-input[readonly] {
        background-color: #2a2a2a !important;
        color: #888 !important;
        cursor: not-allowed;
        border-color: #555;
      }

      .time-input[readonly]:focus {
        border-color: #555;
      }

      .audio-edit-section {
        border-top: 1px solid #444;
        padding-top: 10px;
        margin-top: 10px;
      }

      .audio-sprite.selected {
        border: 2px solid #ffd700;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
      }

      .audio-sprite {
        cursor: grab;
        transition: all 0.2s ease;
      }

      .audio-sprite:hover {
        background: rgba(76, 175, 80, 0.4);
      }
    `;
    document.head.appendChild(style);

    return panel;
  }

  // 오디오 시작 시간 업데이트
  updateAudioStartTime(startTime) {
    console.log("오디오 시작 시간 업데이트:", startTime);

    // 선택된 클립 찾기
    const selectedSprite = document.querySelector('.audio-sprite.selected');
    if (!selectedSprite) {
      console.warn("선택된 클립이 없습니다");
      return;
    }

    // 선택된 클립의 트랙 찾기
    let targetTrack = null;
    for (const [trackId, track] of this.tracks.entries()) {
      if (track.element && track.element.contains(selectedSprite)) {
        targetTrack = track;
        break;
      }
    }

    if (!targetTrack) {
      console.error("선택된 클립의 트랙을 찾을 수 없습니다");
      return;
    }

    const audioObject = this.editor.scene.getObjectById(parseInt(targetTrack.objectId));
    if (!audioObject || !audioObject.userData.audioElement) {
      console.error("오디오 객체를 찾을 수 없습니다");
      return;
    }

    const audio = audioObject.userData.audioElement;

    // 시작 시간 제한: 0 ~ (오디오 길이 - 최소 클립 길이)
    const MIN_CLIP_DURATION = 5; // 최소 5초
    const maxStartTime = Math.max(0, audio.duration - MIN_CLIP_DURATION);
    const clampedStartTime = Math.max(0, Math.min(maxStartTime, startTime));

    // 오디오 객체에 시작 시간 저장
    audioObject.userData.audioStartTime = clampedStartTime;

    // 스프라이트 데이터 업데이트
    selectedSprite.dataset.audioStartTime = clampedStartTime.toString();

    // 클립 길이 자동 조정 (오디오 편집 시간에 맞춰)
    const currentAudioEndTime = audioObject.userData.audioEndTime || audio.duration;
    const newClipDuration = currentAudioEndTime - clampedStartTime;

    if (newClipDuration >= MIN_CLIP_DURATION) {
      // 클립 길이 업데이트
      const newWidth = (newClipDuration / this.options.totalSeconds) * 100;
      selectedSprite.style.width = `${newWidth}%`;
      selectedSprite.dataset.duration = newClipDuration.toString();
      audioObject.userData.duration = newClipDuration;

      // 클립 input 필드도 업데이트
      const clipStartTime = parseFloat(selectedSprite.dataset.startTime) || 0;
      this.updateClipInputFields(clipStartTime, newClipDuration);
    }

    console.log("오디오 시작 시간 설정됨:", {
      objectId: audioObject.id,
      startTime: clampedStartTime,
      newClipDuration: newClipDuration,
      audioDuration: audio.duration
    });

    // input 필드 업데이트
    const audioEndTime = audioObject.userData.audioEndTime || audio.duration;
    this.updateInputFields(clampedStartTime, audioEndTime);
  }

  // 오디오 끝 시간 업데이트
  updateAudioEndTime(endTime) {
    console.log("오디오 끝 시간 업데이트:", endTime);

    // 선택된 클립 찾기
    const selectedSprite = document.querySelector('.audio-sprite.selected');
    if (!selectedSprite) {
      console.warn("선택된 클립이 없습니다");
      return;
    }

    // 선택된 클립의 트랙 찾기
    let targetTrack = null;
    for (const [trackId, track] of this.tracks.entries()) {
      if (track.element && track.element.contains(selectedSprite)) {
        targetTrack = track;
        break;
      }
    }

    if (!targetTrack) {
      console.error("선택된 클립의 트랙을 찾을 수 없습니다");
      return;
    }

    const audioObject = this.editor.scene.getObjectById(parseInt(targetTrack.objectId));
    if (!audioObject || !audioObject.userData.audioElement) {
      console.error("오디오 객체를 찾을 수 없습니다");
      return;
    }

    const audio = audioObject.userData.audioElement;

    // 끝 시간 제한: (시작 시간 + 최소 클립 길이) ~ 오디오 길이
    const currentStartTime = audioObject.userData.audioStartTime || 0;
    const MIN_CLIP_DURATION = 5; // 최소 5초
    const minEndTime = currentStartTime + MIN_CLIP_DURATION;
    const clampedEndTime = Math.max(minEndTime, Math.min(audio.duration, endTime));

    // 오디오 객체에 끝 시간 저장
    audioObject.userData.audioEndTime = clampedEndTime;

    // 스프라이트 데이터 업데이트
    selectedSprite.dataset.audioEndTime = clampedEndTime.toString();

    // 클립 길이 자동 조정 (오디오 편집 시간에 맞춰)
    const newClipDuration = clampedEndTime - currentStartTime;

    if (newClipDuration >= MIN_CLIP_DURATION) {
      // 클립 길이 업데이트
      const newWidth = (newClipDuration / this.options.totalSeconds) * 100;
      selectedSprite.style.width = `${newWidth}%`;
      selectedSprite.dataset.duration = newClipDuration.toString();
      audioObject.userData.duration = newClipDuration;

      // 클립 input 필드도 업데이트
      const clipStartTime = parseFloat(selectedSprite.dataset.startTime) || 0;
      this.updateClipInputFields(clipStartTime, newClipDuration);
    }

    console.log("오디오 끝 시간 설정됨:", {
      objectId: audioObject.id,
      endTime: clampedEndTime,
      newClipDuration: newClipDuration,
      audioDuration: audio.duration
    });

    // input 필드 업데이트
    this.updateInputFields(currentStartTime, clampedEndTime);
  }

  // 시간을 분:초.프레임 형식으로 변환하는 유틸리티 함수
  formatTimeToFrame(seconds) {
    console.log("formatTimeToFrame 입력:", seconds);

    const fps = this.options.framesPerSecond || 30;
    const totalFrames = Math.round(seconds * fps);

    const minutes = Math.floor(totalFrames / (fps * 60));
    const secs = Math.floor((totalFrames % (fps * 60)) / fps);
    const frames = totalFrames % fps;

    const result = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;

    console.log("formatTimeToFrame 결과:", {
      seconds,
      fps,
      totalFrames,
      minutes,
      secs,
      frames,
      result
    });

    return result;
  }

  // 분:초.프레임 형식을 초 단위로 변환하는 유틸리티 함수
  parseFrameToSeconds(timeString) {
    console.log("parseFrameToSeconds 입력:", timeString);

    // 빈 문자열이나 null 체크
    if (!timeString || timeString.trim() === '') {
      console.warn("빈 시간 문자열");
      return 0;
    }

    const parts = timeString.split(':');
    console.log("분할된 부분:", parts);

    if (parts.length !== 2) {
      console.warn("잘못된 형식:", timeString, "예상: MM:SS.FF");
      return 0;
    }

    const minutes = parseInt(parts[0]) || 0;
    const secondsAndFrames = parts[1].split('.');
    console.log("초와 프레임 부분:", secondsAndFrames);

    const seconds = parseInt(secondsAndFrames[0]) || 0;
    const frames = parseInt(secondsAndFrames[1]) || 0;

    const fps = this.options.framesPerSecond || 30;
    const result = minutes * 60 + seconds + frames / fps;

    console.log("파싱 결과:", {
      minutes,
      seconds,
      frames,
      fps,
      result
    });

    return result;
  }

  // input 필드 값 업데이트 메서드
  updateInputFields(audioStartTime, audioEndTime) {
    if (this.startTimeInput) {
      this.startTimeInput.value = this.formatTimeToFrame(audioStartTime);
    }
    if (this.endTimeInput) {
      this.endTimeInput.value = this.formatTimeToFrame(audioEndTime);
    }
  }

  // 클립 input 필드 값 업데이트 메서드
  updateClipInputFields(startTime, duration) {
    if (this.clipStartInput) {
      this.clipStartInput.value = this.formatTimeToFrame(startTime);
    }
    if (this.clipDurationInput) {
      this.clipDurationInput.value = this.formatTimeToFrame(duration);
    }
  }

  // 클립 시작 시간 업데이트
  updateClipStartTime(startTime) {
    console.log("클립 시작 시간 업데이트:", startTime);

    const selectedSprite = document.querySelector('.audio-sprite.selected');
    if (!selectedSprite) {
      console.warn("선택된 클립이 없습니다");
      return;
    }

    // 모든 트랙에서 선택된 스프라이트를 찾기
    let targetTrack = null;
    for (const [trackId, track] of this.tracks.entries()) {
      if (track.element && track.element.contains(selectedSprite)) {
        targetTrack = track;
        break;
      }
    }

    if (!targetTrack) {
      console.error("클립에 해당하는 트랙을 찾을 수 없습니다");
      return;
    }

    const audioObject = this.editor.scene.getObjectById(parseInt(targetTrack.objectId));
    if (!audioObject) {
      console.error("오디오 객체를 찾을 수 없습니다");
      return;
    }

    // 제한: 0초 이상, 타임라인 끝을 넘지 않도록
    const maxStartTime = this.options.totalSeconds - parseFloat(selectedSprite.dataset.duration);
    const clampedStartTime = Math.max(0, Math.min(maxStartTime, startTime));

    // 스프라이트 위치 업데이트
    const newLeft = (clampedStartTime / this.options.totalSeconds) * 100;
    selectedSprite.style.left = `${newLeft}%`;
    selectedSprite.dataset.startTime = clampedStartTime.toString();

    // 오디오 객체 업데이트
    audioObject.userData.startTime = clampedStartTime;

    console.log("클립 시작 시간 설정됨:", {
      startTime: clampedStartTime,
      newLeft: `${newLeft}%`
    });
  }

  // 클립 길이 업데이트
  updateClipDuration(duration) {
    console.log("클립 길이 업데이트:", duration);

    const selectedSprite = document.querySelector('.audio-sprite.selected');
    if (!selectedSprite) {
      console.warn("선택된 클립이 없습니다");
      return;
    }

    // 모든 트랙에서 선택된 스프라이트를 찾기
    let targetTrack = null;
    for (const [trackId, track] of this.tracks.entries()) {
      if (track.element && track.element.contains(selectedSprite)) {
        targetTrack = track;
        break;
      }
    }

    if (!targetTrack) {
      console.error("클립에 해당하는 트랙을 찾을 수 없습니다");
      return;
    }

    const audioObject = this.editor.scene.getObjectById(parseInt(targetTrack.objectId));
    if (!audioObject) {
      console.error("오디오 객체를 찾을 수 없습니다");
      return;
    }

    // 제한: 최소 5초, 최대 3분, 타임라인 끝을 넘지 않도록
    const MIN_DURATION = 5;
    const MAX_DURATION = 180;
    const currentStartTime = parseFloat(selectedSprite.dataset.startTime) || 0;
    const maxDuration = this.options.totalSeconds - currentStartTime;

    const clampedDuration = Math.max(
      MIN_DURATION,
      Math.min(MAX_DURATION, maxDuration, duration)
    );

    // 스프라이트 너비 업데이트
    const newWidth = (clampedDuration / this.options.totalSeconds) * 100;
    selectedSprite.style.width = `${newWidth}%`;
    selectedSprite.dataset.duration = clampedDuration.toString();

    // 오디오 객체 업데이트
    audioObject.userData.duration = clampedDuration;

    console.log("클립 길이 설정됨:", {
      duration: clampedDuration,
      newWidth: `${newWidth}%`
    });
  }

  // 트랙 삭제 메서드
  removeTrack(objectId) {
    console.log("AudioTimeline 트랙 삭제:", objectId);

    const track = this.tracks.get(objectId);
    if (!track) {
      console.warn("삭제할 트랙을 찾을 수 없습니다:", objectId);
      return false;
    }

    // 오디오 객체 찾기
    const audioObject = this.editor.scene.getObjectById(parseInt(objectId));
    if (audioObject && audioObject.userData.audioElement) {
      const audioElement = audioObject.userData.audioElement;

      // 오디오 정지
      if (!audioElement.paused) {
        audioElement.pause();
        audioElement._playRequested = false;
        console.log("오디오 정지됨:", audioElement.src);
      }

      // Blob URL 정리
      if (audioObject.userData.audioUrl) {
        URL.revokeObjectURL(audioObject.userData.audioUrl);
        console.log("Blob URL 정리됨:", audioObject.userData.audioUrl);
      }

      // Scene에서 오디오 객체 제거
      this.editor.scene.remove(audioObject);
      console.log("Scene에서 오디오 객체 제거됨:", objectId);
    }

    // 트랙 UI 요소 제거
    if (track.element && track.element.parentNode) {
      track.element.parentNode.removeChild(track.element);
      console.log("트랙 UI 요소 제거됨");
    }

    // 트랙 데이터에서 제거
    this.tracks.delete(objectId);
    console.log("트랙 데이터에서 제거됨");

    // Scene의 userData에서도 제거
    if (this.editor.scene.userData.audio && this.editor.scene.userData.audio[objectId]) {
      delete this.editor.scene.userData.audio[objectId];
      console.log("Scene userData에서 오디오 정보 제거됨");
    }

    // 선택된 클립이 삭제된 클립이면 선택 해제
    const selectedSprite = document.querySelector('.audio-sprite.selected');
    if (selectedSprite && track.element && track.element.contains(selectedSprite)) {
      selectedSprite.classList.remove('selected');
      console.log("선택된 클립 선택 해제됨");
    }

    console.log("AudioTimeline 트랙 삭제 완료:", objectId);
    return true;
  }

  // 모든 트랙 삭제 메서드
  removeAllTracks() {
    console.log("AudioTimeline 모든 트랙 삭제");

    const trackIds = Array.from(this.tracks.keys());
    let removedCount = 0;

    trackIds.forEach(objectId => {
      if (this.removeTrack(objectId)) {
        removedCount++;
      }
    });

    console.log(`AudioTimeline ${removedCount}개 트랙 삭제 완료`);
    return removedCount;
  }

  updatePropertyValue(propertyType, value) {
    if (!this.selectedObject) return;

    const object = this.editor.scene.getObjectById(
      parseInt(this.selectedObject)
    );
    if (!object) return;

    // 현재 프레임에 키프레임이 없으면 생성
    const currentFrame = Math.floor(this.currentFrame);
    const track = this.tracks.get(this.selectedObject);

    if (!track.keyframes[propertyType]) {
      track.keyframes[propertyType] = new Map();
    }

    // 키프레임 데이터 업데이트 또는 생성
    const keyframeData = track.keyframes[propertyType].get(currentFrame) || {
      value: value,
      element: null,
    };
    keyframeData.value = value;
    track.keyframes[propertyType].set(currentFrame, keyframeData);

    // 오디오 요소 실시간 업데이트
    if (object.userData.audioElement) {
      const audioElement = object.userData.audioElement;
      switch (propertyType) {
        case "volume":
          audioElement.volume = value;
          // THREE.js Audio 객체가 있는 경우에도 볼륨 업데이트
          if (object.userData.audio) {
            object.userData.audio.setVolume(value);
          }
          break;
        case "mute":
          audioElement.muted = value;
          break;
        case "playbackRate":
          audioElement.playbackRate = value;
          break;
      }
    }

    // 속성 값 업데이트
    this.setPropertyValue(object, propertyType, value);

    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
  }

  addTrack(objectId, objectName) {
    if (this.tracks.has(objectId)) return;

    const track = {
      element: document.createElement("div"),
      keyframes: {
        volume: new Map(),
        mute: new Map(),
        playbackRate: new Map(),
      },
      objectId: objectId,
      objectName: objectName,
    };

    track.element.className = "timeline-track";
    track.element.dataset.objectId = objectId;

    const trackTopArea = document.createElement("div");
    trackTopArea.className = "audio-tracks";

    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";
    trackHeader.innerHTML = `
      <div class="track-info">
        <span class="track-name">${typeof objectName === "object"
        ? objectName.name || "Audio"
        : objectName
      }</span>
      </div>
      <div class="track-controls">
        <button class="add-keyframe-btn" title="Add Keyframe">+</button>
      </div>
    `;
    trackTopArea.appendChild(trackHeader);

    // 오디오 스프라이트 생성
    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (object && object.userData.audioElement) {
      const audioElement = object.userData.audioElement;
      const duration = audioElement.duration || 0;
      const totalFrames = Math.floor(duration * this.options.framesPerSecond);

      const trackContent = document.createElement("div");
      trackContent.className = "track-content";

      const sprite = document.createElement("div");
      sprite.className = "audio-sprite";
      sprite.dataset.duration = duration;
      sprite.innerHTML = `
        <div class="sprite-handle left"></div>
        <div class="sprite-content">
          <span class="sprite-name">${objectName}</span>
        </div>
        <div class="sprite-handle right"></div>
      `;

      const spriteWidth =
        (totalFrames /
          (this.options.totalSeconds * this.options.framesPerSecond)) *
        100;
      sprite.style.width = `${spriteWidth}%`;
      sprite.style.left = "0%";

      trackContent.appendChild(sprite);
      trackTopArea.appendChild(trackContent);

      this.bindSpriteEvents(sprite, track);
    }

    track.element.appendChild(trackTopArea);

    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);

    this.bindTrackEvents(track);
    return track;
  }

  formatPropertyName(propertyType) {
    const names = {
      volume: "Volume",
      mute: "Mute",
      playbackRate: "Playback Rate",
    };
    return names[propertyType] || propertyType;
  }

  createPropertyTrack(objectId, propertyType) {
    const propertyTrack = document.createElement("div");
    propertyTrack.className = "property-track";
    propertyTrack.dataset.objectId = objectId;
    propertyTrack.dataset.property = propertyType;

    const propertyHeader = document.createElement("div");
    propertyHeader.className = "property-header";
    propertyHeader.innerHTML = `
      <span>${this.formatPropertyName(propertyType)}</span>
      <button class="add-keyframe-btn" title="Add Keyframe">+</button>
    `;

    const keyframesContainer = document.createElement("div");
    keyframesContainer.className = "keyframe-layer";

    propertyTrack.appendChild(propertyHeader);
    propertyTrack.appendChild(keyframesContainer);

    // 키프레임 추가 버튼 이벤트
    const addKeyframeBtn = propertyHeader.querySelector(".add-keyframe-btn");
    addKeyframeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const currentFrame = Math.floor(this.currentFrame);
      const relativePlayheadPosition =
        (currentFrame /
          (this.options.totalSeconds * this.options.framesPerSecond)) *
        100;

      // 키프레임 요소 생성
      const keyframeElement = document.createElement("div");
      keyframeElement.className = "keyframe";
      keyframeElement.style.left = `${relativePlayheadPosition}%`;
      keyframeElement.dataset.frame = currentFrame.toString();

      // 현재 속성 값 가져오기
      const object = this.editor.scene.getObjectById(parseInt(objectId));
      const value = this.getPropertyValue(object, propertyType);

      // 키프레임 데이터 저장
      const track = this.tracks.get(objectId);
      if (!track.keyframes[propertyType]) {
        track.keyframes[propertyType] = new Map();
      }
      track.keyframes[propertyType].set(currentFrame, {
        value: value,
        element: keyframeElement,
      });

      // 키프레임을 레이어에 추가
      // keyframesContainer.appendChild(keyframeElement);

      // 키프레임 드래그 이벤트 설정
      this.makeKeyframeDraggable(keyframeElement, track, currentFrame, object);

      // 키프레임 선택 이벤트 바인딩
      this.bindKeyframeEvents(
        keyframeElement,
        objectId,
        propertyType,
        currentFrame
      );
    });

    return propertyTrack;
  }

  // CSS 스타일도 추가
  addStyle() {
    const style = document.createElement("style");
    style.textContent = `
      .property-track {
        position: relative;
        height: 24px;
        margin-bottom: 4px;
        background-color: rgba(0,0,0,0.1);
        border-radius: 4px;
      }

      .property-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 8px;
        height: 100%;
      }

      .keyframe-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .keyframe {
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: #ffd700;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        top: 50%;
        pointer-events: auto;
        cursor: pointer;
      }

      .keyframe.selected {
        background-color: #ff4444;
        border: 2px solid white;
      }

      .keyframe.delete-preview {
        background-color: #ff0000;
        opacity: 0.5;
      }
    `;
    document.head.appendChild(style);
  }

  // 클래스 소멸자 추가
  dispose() {
    // Blob URL 정리
    this.tracks.forEach((track) => {
      const audioObject = this.editor.scene.getObjectById(parseInt(track.id));
      if (audioObject && audioObject.userData.audioUrl) {
        URL.revokeObjectURL(audioObject.userData.audioUrl);
      }
    });
  }

  bindSpriteEvents(sprite, track = null) {
    // track 객체가 전달되지 않았으면 sprite에서 찾기
    if (!track) {
      const trackElement = sprite.closest('.timeline-track');
      const trackId = trackElement?.dataset?.objectId;
      track = trackId ? this.tracks.get(trackId) : null;

      // track을 찾지 못한 경우 모든 tracks에서 해당 sprite를 포함하는 track 찾기
      if (!track) {
        for (const [trackId, trackData] of this.tracks.entries()) {
          if (trackData.element && trackData.element.contains(sprite)) {
            track = trackData;
            break;
          }
        }
      }
    }

    console.log("bindSpriteEvents - track 찾기 결과:", { track, sprite });
    let isDragging = false;
    let dragStartX = 0;
    let startLeft = 0;
    let startWidth = 0;
    let isMovingSprite = false;

    // 스프라이트 클릭 이벤트 (선택)
    sprite.addEventListener("click", (e) => {
      e.stopPropagation();

      // 다른 스프라이트 선택 해제
      document.querySelectorAll('.audio-sprite').forEach(s => s.classList.remove('selected'));

      // 현재 스프라이트 선택
      sprite.classList.add('selected');

      // 선택된 스프라이트 정보를 input 필드에 표시
      if (track) {
        const audioObject = this.editor.scene.getObjectById(parseInt(track.objectId));
        if (audioObject) {
          const startTime = parseFloat(sprite.dataset.startTime) || 0;
          const duration = parseFloat(sprite.dataset.duration) || 0;
          const audioStartTime = audioObject.userData.audioStartTime || 0;
          const audioEndTime = audioObject.userData.audioEndTime || audioObject.userData.audioElement.duration;

          // input 필드 업데이트
          this.updateInputFields(audioStartTime, audioEndTime);

          // 클립 위치/길이 input 필드도 업데이트 (새로 추가할 예정)
          this.updateClipInputFields(startTime, duration);
        }
      }
    });

    // 스프라이트 전체 드래그 이벤트 (위치 이동만)
    sprite.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      isDragging = true;
      isMovingSprite = true;
      dragStartX = e.clientX;
      startLeft = parseFloat(sprite.style.left) || 0;
      startWidth = parseFloat(sprite.style.width) || 0;

      // 드래그 중인 스프라이트 스타일 변경
      sprite.style.opacity = "0.8";
      sprite.style.cursor = "grabbing";
    });

    // 드래그 중 이벤트
    document.addEventListener("mousemove", (e) => {
      if (!isDragging || !isMovingSprite) return;

      const container = sprite.closest(".timeline-viewport");
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;

      // 드래그 거리 계산 (퍼센트로)
      const dragDelta = ((e.clientX - dragStartX) / containerWidth) * 100;

      // 스프라이트 전체 이동
      const newLeft = Math.max(
        0,
        Math.min(startLeft + dragDelta, 100 - startWidth)
      );
      sprite.style.left = `${newLeft}%`;

      // 시작 시간 업데이트
      const startTime = (newLeft / 100) * this.options.totalSeconds;
      sprite.dataset.startTime = startTime.toString();

      // 오디오 객체 업데이트
      if (track) {
        const audioObject = this.editor.scene.getObjectById(parseInt(track.objectId));
        if (audioObject) {
          audioObject.userData.startTime = startTime;
        }
      }
    });

    // 드래그 종료 이벤트
    document.addEventListener("mouseup", () => {
      if (!isDragging) return;

      isDragging = false;
      isMovingSprite = false;

      // 스타일 복원
      sprite.style.opacity = "";
      sprite.style.cursor = "grab";

      // 변경사항 저장
      if (track) {
        const audioObject = this.editor.scene.getObjectById(parseInt(track.objectId));
        if (audioObject) {
          const startTime = parseFloat(sprite.dataset.startTime) || 0;
          const duration = parseFloat(sprite.dataset.duration) || 0;

          console.log("클립 변경사항 저장:", {
            startTime: startTime,
            duration: duration,
            endTime: startTime + duration
          });

          // 오디오 객체 userData 업데이트
          audioObject.userData.startTime = startTime;
          audioObject.userData.duration = duration;

          // 씬 데이터 업데이트
          if (!this.editor.scene.userData.audio) {
            this.editor.scene.userData.audio = {};
          }
          if (!this.editor.scene.userData.audio[audioObject.id]) {
            this.editor.scene.userData.audio[audioObject.id] = {};
          }

          this.editor.scene.userData.audio[audioObject.id].startTime = startTime;
          this.editor.scene.userData.audio[audioObject.id].duration = duration;
          this.editor.scene.userData.audio[audioObject.id].audioStartTime = audioObject.userData.audioStartTime;
          this.editor.scene.userData.audio[audioObject.id].audioEndTime = audioObject.userData.audioEndTime;

          // input 필드 동기화
          const audioStartTime = audioObject.userData.audioStartTime || 0;
          const audioEndTime = audioObject.userData.audioEndTime || audioObject.userData.audioElement.duration;
          this.updateInputFields(audioStartTime, audioEndTime);
          this.updateClipInputFields(startTime, duration);
        }
      }

      // 타임라인 업데이트 시그널 발생
      if (this.editor.signals?.timelineChanged) {
        this.editor.signals.timelineChanged.dispatch();
      }
    });
  }
}
