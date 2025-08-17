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

  // 타임라인 총 길이 안전 조회
  getTotalSeconds() {
    const fallback = 300; // 기본 5분
    const optVal = Number(this?.options?.totalSeconds);
    // const sceneVal = Number(this?.editor?.scene?.userData?.timeline?.totalSeconds);
    const sceneVal = Number(this?.editor?.timeline?.defaultSettings?.totalSeconds);
    if (Number.isFinite(optVal) && optVal > 0) return optVal;
    if (Number.isFinite(sceneVal) && sceneVal > 0) return sceneVal;
    return fallback;
  }

  // 타임라인 길이가 준비되면(left/width) 재계산을 트리거
  scheduleRecalcForTimelineReady() {
    const tryRecalc = (attempt = 0) => {
      const sceneVal = Number(this?.editor?.scene?.userData?.timeline?.totalSeconds);
      const optVal = Number(this?.options?.totalSeconds);
      const isReady = (Number.isFinite(sceneVal) && sceneVal > 0) || (Number.isFinite(optVal) && optVal > 0);

      if (isReady) {
        this.updateUI();
        return;
      }

      if (attempt < 5) {
        setTimeout(() => tryRecalc(attempt + 1), 50 * (attempt + 1));
      } else {
        this.updateUI();
      }
    };

    tryRecalc(0);
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
      return Promise.resolve(existingTrack);
    }

    // 오디오 로드 및 트랙 생성 (Promise 반환)
    return this.loadAudioFile(audioFile);
  }

  // 오디오 파일 로드
  loadAudioFile(audioFile) {
    console.log("오디오 파일 로드 시작:", audioFile.path);

    return new Promise((resolve, reject) => {
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
            const originalData = audioFile.originalTrackData || {};
            audioObject.userData = {
              audioElement: audioElement,
              volume: originalData.volume !== undefined ? originalData.volume : 1.0,
              mute: originalData.mute !== undefined ? originalData.mute : false,
              playbackRate: originalData.playbackRate !== undefined ? originalData.playbackRate : 1.0,
              type: "audio",
              audioUrl: audioUrl,
              audioFile: audioFile, // 원본 파일 정보 저장
              audioPath: audioFile.path, // 경로 정보 추가
              audioName: audioFile.name, // 이름 정보 추가
              audioStartTime: originalData.audioStartTime || 0, // 오디오 시작 시간 (편집용)
              audioEndTime: originalData.audioEndTime || audioElement.duration, // 오디오 끝 시간 (편집용)
              startTime: originalData.startTime || 0, // 클립 시작 시간 (타임라인상 위치)
              duration: originalData.duration || effectiveDuration, // 클립 지속 시간 (타임라인상 길이)
            };

            // Scene에 오디오 객체 추가
            this.editor.scene.add(audioObject);
            console.log("오디오 객체 생성됨:", audioObject);

            // addTrack 호출 시 필요한 모든 정보를 전달
            // originalTrackData가 있으면 그것을 우선 사용, 없으면 기본값 사용
            const originalTrackData = audioFile.originalTrackData || {};
            const trackData = {
              name: audioFile.displayName || audioFile.name,
              type: "audio",
              duration: originalTrackData.duration || effectiveDuration,
              startTime: originalTrackData.startTime || 0,
              volume: originalTrackData.volume !== undefined ? originalTrackData.volume : 1.0,
              mute: originalTrackData.mute !== undefined ? originalTrackData.mute : false,
              playbackRate: originalTrackData.playbackRate !== undefined ? originalTrackData.playbackRate : 1.0,
              audioStartTime: originalTrackData.audioStartTime || 0,
              audioEndTime: originalTrackData.audioEndTime || audioElement.duration,
              element: this.createTrackElement(effectiveDuration, audioFile.displayName || audioFile.name, audioFile.path),
              audioElement: audioElement,
            };

            console.log(`🎵 trackData 구성 완료:`, trackData);

            // 트랙 생성
            const track = this.addTrack(audioObject.id, trackData);
            console.log("오디오 트랙 생성됨:", track);

            // 오디오 로드 완료 테스트
            audioElement.addEventListener("canplaythrough", () => {
              console.log("오디오 재생 준비 완료:", audioFile.name);
            });

            // Scene의 userData.audioTimeline에 오디오 정보 저장
            if (!this.editor.scene.userData.audioTimeline) {
              this.editor.scene.userData.audioTimeline = { audioObjects: {} };
            }
            if (!this.editor.scene.userData.audioTimeline.audioObjects) {
              this.editor.scene.userData.audioTimeline.audioObjects = {};
            }
            this.editor.scene.userData.audioTimeline.audioObjects[audioObject.id] = {
              volume: 1.0,
              mute: false,
              playbackRate: 1.0,
              audioFile: audioFile,
            };

            // input 필드 초기화
            this.updateInputFields(0, audioElement.duration);

            // Promise resolve로 트랙 반환
            resolve(track);
          });

          audioElement.addEventListener("error", (e) => {
            console.error("오디오 로드 에러:", e);
            reject(new Error(`오디오 로드 에러: ${e.message}`));
          });
        })
        .catch((error) => {
          console.error("오디오 파일 로드 실패:", error);

          // 사용자에게 알림
          if (error.message.includes('404')) {
            alert(`음악 파일을 찾을 수 없습니다: ${audioFile.name}\n\n파일이 files/music 폴더에 있는지 확인해주세요.`);
          } else {
            alert(`오디오 파일 로드 중 오류가 발생했습니다: ${audioFile.name}\n\n${error.message}`);
          }

          reject(error);
        });
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

          // Scene의 userData.audioTimeline에 오디오 정보 저장
          if (!this.editor.scene.userData.audioTimeline) {
            this.editor.scene.userData.audioTimeline = { audioObjects: {} };
          }
          if (!this.editor.scene.userData.audioTimeline.audioObjects) {
            this.editor.scene.userData.audioTimeline.audioObjects = {};
          }
          this.editor.scene.userData.audioTimeline.audioObjects[audioObject.id] = {
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
    const spriteWidth = (duration / this.getTotalSeconds()) * 100;
    sprite.style.width = `${spriteWidth}%`;
    sprite.style.left = "0%";
    sprite.dataset.duration = duration;
    sprite.dataset.startTime = "0"; // 클립 시작 시간 (타임라인상 위치)
    sprite.dataset.audioStartTime = "0"; // 오디오 편집 시작 시간
    sprite.dataset.audioEndTime = duration.toString(); // 오디오 편집 끝 시간
    sprite.dataset.minWidth = (5 / this.getTotalSeconds()) * 100;
    sprite.dataset.maxWidth = (180 / this.getTotalSeconds()) * 100;

    // audioPath 설정 (트랙 복원 시 필요)
    if (audioPath) {
      sprite.dataset.audioPath = audioPath;
      sprite.dataset.audioName = trackName;
    }

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
      if (!this.editor.scene.userData.audioTimeline) {
        this.editor.scene.userData.audioTimeline = { audioObjects: {} };
      }
      if (!this.editor.scene.userData.audioTimeline.audioObjects) {
        this.editor.scene.userData.audioTimeline.audioObjects = {};
      }
      this.editor.scene.userData.audioTimeline.audioObjects.masterVolume = value;
    });

    // 초기 볼륨 값 설정
    const masterVolume = this.editor.scene.userData.audioTimeline?.audioObjects?.masterVolume || 1.0;
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
      const newWidth = (newClipDuration / this.getTotalSeconds()) * 100;
      selectedSprite.style.width = `${newWidth}%`;
      selectedSprite.dataset.duration = newClipDuration.toString();
      audioObject.userData.duration = newClipDuration;

      // 클립 input 필드도 업데이트
      const clipStartTime = parseFloat(selectedSprite.dataset.startTime) || 0;
      this.updateClipInputFields(clipStartTime, newClipDuration);

      // audioObjects 동기화
      this.updateAudioObjectsEntry(audioObject.id, {
        audioStartTime: clampedStartTime,
        duration: newClipDuration,
        startTime: clipStartTime,
      });
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
      const newWidth = (newClipDuration / this.getTotalSeconds()) * 100;
      selectedSprite.style.width = `${newWidth}%`;
      selectedSprite.dataset.duration = newClipDuration.toString();
      audioObject.userData.duration = newClipDuration;

      // 클립 input 필드도 업데이트
      const clipStartTime = parseFloat(selectedSprite.dataset.startTime) || 0;
      this.updateClipInputFields(clipStartTime, newClipDuration);

      // audioObjects 동기화
      this.updateAudioObjectsEntry(audioObject.id, {
        audioEndTime: clampedEndTime,
        duration: newClipDuration,
      });
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
    console.log("#############################")
    console.log("getTotalSeconds", this.getTotalSeconds());
   
    const maxStartTime = this.getTotalSeconds() - parseFloat(selectedSprite.dataset.duration);
    const clampedStartTime = Math.max(0, Math.min(maxStartTime, startTime));

    // 스프라이트 위치 업데이트
    const newLeft = (clampedStartTime / this.getTotalSeconds()) * 100;
    selectedSprite.style.left = `${newLeft}%`;
    selectedSprite.dataset.startTime = clampedStartTime.toString();

    // 오디오 객체 업데이트
    audioObject.userData.startTime = clampedStartTime;

    // audioObjects 동기화
    this.updateAudioObjectsEntry(audioObject.id, {
      startTime: clampedStartTime,
    });

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
    const maxDuration = this.getTotalSeconds() - currentStartTime;

    const clampedDuration = Math.max(
      MIN_DURATION,
      Math.min(MAX_DURATION, maxDuration, duration)
    );

    // 스프라이트 너비 업데이트
    console.log("#############################")
    const newWidth = (clampedDuration / this.getTotalSeconds()) * 100;
    selectedSprite.style.width = `${newWidth}%`;
    selectedSprite.dataset.duration = clampedDuration.toString();

    // 오디오 객체 업데이트
    audioObject.userData.duration = clampedDuration;

    // audioObjects 동기화
    this.updateAudioObjectsEntry(audioObject.id, {
      duration: clampedDuration,
    });

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

    // Scene의 userData.audioTimeline에서도 제거
    if (this.editor.scene.userData.audioTimeline &&
      this.editor.scene.userData.audioTimeline.audioObjects &&
      this.editor.scene.userData.audioTimeline.audioObjects[objectId]) {
      delete this.editor.scene.userData.audioTimeline.audioObjects[objectId];
      console.log("Scene userData.audioTimeline에서 오디오 정보 제거됨");
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

  addTrack(objectId, trackData) {
    if (this.tracks.has(objectId)) return;

    // trackData.element가 있으면 그것을 timeline-track으로 감싸기, 없으면 새로 생성
    let trackElement;
    let trackContent;

    if (trackData.element) {
      // 기존 요소가 있으면 완전히 새로운 요소를 생성하되 기존 데이터를 복사
      console.log(`기존 trackData.element 사용하여 새로 생성:`, trackData.element);
      trackElement = document.createElement("div");
      trackElement.className = "timeline-track";
      trackElement.dataset.objectId = objectId;

      // 기존 audio-tracks 요소의 내용을 기반으로 새로운 요소 생성
      const existingElement = trackData.element;
      trackContent = document.createElement("div");
      trackContent.className = "audio-tracks";

      // track-header 복사
      const existingHeader = existingElement.querySelector('.track-header');
      if (existingHeader) {
        const newHeader = existingHeader.cloneNode(true);

        // 삭제 버튼 추가
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-track-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete Track';
        deleteBtn.style.cssText = 'background: #ff4444; color: white; border: none; border-radius: 3px; padding: 2px 6px; margin-left: 5px; cursor: pointer;';

        const controlsDiv = newHeader.querySelector('.track-controls');
        if (controlsDiv) {
          controlsDiv.appendChild(deleteBtn);
        }

        trackContent.appendChild(newHeader);
      }

      // track-content와 audio-sprite 복사
      const existingContent = existingElement.querySelector('.track-content');
      if (existingContent) {
        const newContent = existingContent.cloneNode(true);
        trackContent.appendChild(newContent);

        // audio-sprite에 이벤트 바인딩을 위한 데이터 설정
        const sprite = newContent.querySelector('.audio-sprite');
        if (sprite) {
          // 기존 데이터 속성들을 복사
          const originalSprite = existingContent.querySelector('.audio-sprite');
          if (originalSprite) {
            sprite.dataset.duration = originalSprite.dataset.duration || '';
            sprite.dataset.audioPath = originalSprite.dataset.audioPath || '';
            sprite.dataset.audioName = originalSprite.dataset.audioName || '';
          }
        }
      }

      trackElement.appendChild(trackContent);
    } else {
      // 새로운 트랙 생성
      console.log(`새로운 트랙 생성:`, objectId);
      trackElement = document.createElement("div");
      trackElement.className = "timeline-track";
      trackElement.dataset.objectId = objectId;

      trackContent = document.createElement("div");
      trackContent.className = "audio-tracks";

      const trackHeader = document.createElement("div");
      trackHeader.className = "track-header";
      trackHeader.innerHTML = `
        <div class="track-info">
          <span class="track-name">${typeof trackData.name === "object"
          ? trackData.name.name || "Audio"
          : trackData.name
        }</span>
        </div>
        <div class="track-controls">
          <button class="add-keyframe-btn" title="Add Keyframe" style="display: none;">+</button>
          <button class="delete-track-btn" title="Delete Track" style="background: #ff4444; color: white; border: none; border-radius: 3px; padding: 2px 6px; margin-left: 5px; cursor: pointer;">×</button>
        </div>
      `;
      trackContent.appendChild(trackHeader);

      // 오디오 스프라이트 생성
      const object = this.editor.scene.getObjectById(parseInt(objectId));
      if (object && object.userData.audioElement) {
        const audioElement = object.userData.audioElement;
        const duration = audioElement.duration || 0;
        const totalFrames = Math.floor(duration * this.options.framesPerSecond);

        const trackContentArea = document.createElement("div");
        trackContentArea.className = "track-content";

        const sprite = document.createElement("div");
        sprite.className = "audio-sprite";
        sprite.dataset.duration = duration;
        sprite.innerHTML = `
          <div class="sprite-handle left"></div>
          <div class="sprite-content">
            <span class="sprite-name">${typeof trackData.name === "object" ? trackData.name.name : trackData.name}</span>
          </div>
          <div class="sprite-handle right"></div>
        `;

        // trackData의 속성값을 사용해서 클립 위치와 크기 설정
        const startTime = trackData.startTime || 0;
        const clipDuration = trackData.duration || duration;
        const totalSeconds = this.options.totalSeconds || 300; // 기본값 5분

        const spriteWidth = (clipDuration / totalSeconds) * 100;
        const spriteLeft = (startTime / totalSeconds) * 100;

        sprite.style.width = `${spriteWidth}%`;
        sprite.style.left = `${spriteLeft}%`;

        console.log(`🎯 클립 위치/크기 설정:`, {
          startTime,
          clipDuration,
          totalSeconds,
          spriteWidth: `${spriteWidth}%`,
          spriteLeft: `${spriteLeft}%`
        });

        trackContentArea.appendChild(sprite);
        trackContent.appendChild(trackContentArea);

        // sprite에 필요한 데이터 속성 설정
        sprite.dataset.startTime = startTime.toString();
        sprite.dataset.duration = clipDuration.toString();
        sprite.dataset.audioPath = object.userData.audioPath || '';
        sprite.dataset.audioName = typeof trackData.name === "object" ? trackData.name.name : trackData.name;

        // 오디오 객체에 기본 속성 설정
        if (object.userData) {
          object.userData.startTime = startTime;
          object.userData.duration = clipDuration;
          object.userData.volume = trackData.volume !== undefined ? trackData.volume : 1.0;
          object.userData.mute = trackData.mute !== undefined ? trackData.mute : false;
          object.userData.playbackRate = trackData.playbackRate !== undefined ? trackData.playbackRate : 1.0;
        }

        // 파장을 그릴 캔버스 추가
        const waveformCanvas = document.createElement("canvas");
        waveformCanvas.className = "waveform-canvas";
        waveformCanvas.height = 30;

        // sprite-content에 파장 캔버스 추가
        const spriteContent = sprite.querySelector('.sprite-content');
        if (spriteContent) {
          spriteContent.appendChild(waveformCanvas);
        }

        // 파형 그리기
        if (object.userData.audioPath) {
          this.drawWaveform(waveformCanvas, object.userData.audioPath);
        }
      }

      trackElement.appendChild(trackContent);
    }

    // track 객체 생성
    const track = {
      element: trackElement,
      keyframes: {
        volume: new Map(),
        mute: new Map(),
        playbackRate: new Map(),
      },
      objectId: objectId,
      objectName: trackData.name || trackData,
    };

    // 이제 track 객체가 완성되었으므로 sprite에 이벤트 바인딩
    if (!trackData.element) {
      // 새로운 트랙의 경우
      const sprite = trackContent.querySelector('.audio-sprite');
      if (sprite) {
        this.bindSpriteEvents(sprite, track);
      }
    } else {
      // 기존 요소에서 복사한 경우
      const sprite = trackContent.querySelector('.audio-sprite');
      if (sprite) {
        this.bindSpriteEvents(sprite, track);
      }
    }

    this.tracks.set(objectId, track);
    console.log(`트랙 ${objectId}를 tracks에 추가했습니다.`);
    console.log(`현재 tracks 크기:`, this.tracks.size);

    console.log(`트랙 ${objectId}를 container에 추가 중...`);
    console.log(`container:`, this.container);
    console.log(`container 클래스:`, this.container?.className);
    console.log(`container 부모:`, this.container?.parentElement);
    console.log(`track.element:`, track.element);

    document.querySelector('*[data-timeline=audio] .timeline-container').appendChild(track.element);
    console.log(`트랙 ${objectId}가 container에 추가되었습니다.`);
    console.log(`container 자식 요소 수:`, this.container.children.length);

    console.log(`트랙 ${objectId}에 이벤트 바인딩 시작...`);
    this.bindTrackEvents(track);
    console.log(`트랙 ${objectId} 이벤트 바인딩 완료`);

    // 트랙 삭제 버튼 이벤트 확인
    const deleteBtn = track.element.querySelector('.delete-track-btn');
    if (deleteBtn) {
      console.log(`트랙 ${objectId} 삭제 버튼 발견:`, deleteBtn);
    } else {
      console.log(`트랙 ${objectId} 삭제 버튼 없음`);
    }

    return track;
  }

  // 오디오 트랙 전용 이벤트 바인딩
  bindTrackEvents(track) {
    if (!track || !track.objectId) {
      console.warn("트랙 또는 트랙의 objectId가 없습니다:", track);
      return;
    }

    // 삭제 버튼 이벤트
    const deleteBtn = track.element.querySelector(".delete-track-btn");
    if (deleteBtn) {
      console.log(`트랙 ${track.objectId} 삭제 버튼 이벤트 바인딩`);
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log(`트랙 ${track.objectId} 삭제 버튼 클릭됨`);

        if (confirm(`트랙 "${track.objectName}"을 삭제하시겠습니까?`)) {
          this.deleteTrack(track.objectId);
        }
      });
    }

    // 키프레임 추가 버튼 이벤트
    const addBtn = track.element.querySelector(".add-keyframe-btn");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentFrame = this.currentFrame;
        console.log(`트랙 ${track.objectId} 키프레임 추가 버튼 클릭됨, 현재 프레임: ${currentFrame}`);
      });
    }

    // 트랙 클릭 이벤트 (속성 패널 표시용)
    track.element.addEventListener("click", (e) => {
      if (e.target.closest('.delete-track-btn') || e.target.closest('.add-keyframe-btn')) {
        return; // 버튼 클릭은 무시
      }

      console.log(`트랙 ${track.objectId} 클릭됨`);
      this.selectTrack(track.objectId);
    });
  }

  // 트랙 삭제 메서드
  deleteTrack(objectId) {
    console.log(`트랙 ${objectId} 삭제 시작`);

    const track = this.tracks.get(objectId);
    if (!track) {
      console.warn(`트랙 ${objectId}를 찾을 수 없습니다`);
      return;
    }

    // DOM에서 제거
    if (track.element && track.element.parentNode) {
      track.element.parentNode.removeChild(track.element);
    }

    // tracks Map에서 제거
    this.tracks.delete(objectId);

    // 씬에서 오디오 객체도 제거
    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (object) {
      this.editor.scene.remove(object);
    }

    console.log(`트랙 ${objectId} 삭제 완료`);
  }

  // 트랙 선택 메서드 (속성 패널 표시용)
  selectTrack(objectId) {
    console.log(`트랙 ${objectId} 선택됨`);

    // 모든 트랙의 선택 상태 해제
    this.tracks.forEach((track, id) => {
      if (track.element) {
        track.element.classList.remove('selected');
      }
    });

    // 현재 트랙 선택
    const track = this.tracks.get(objectId);
    if (track && track.element) {
      track.element.classList.add('selected');

      // 속성 패널에 트랙 정보 표시
      this.showTrackProperties(objectId);
    }
  }

  // 트랙 속성 표시 메서드
  showTrackProperties(objectId) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    console.log(`트랙 ${objectId} 속성 표시:`, {
      name: track.objectName,
      volume: object.userData.volume || 1,
      mute: object.userData.mute || false,
      playbackRate: object.userData.playbackRate || 1
    });

    // 여기서 속성 패널을 업데이트하는 로직을 추가할 수 있습니다
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

  // 프로젝트 저장 시 오디오 데이터 저장
  onBeforeSave() {
    try {
      console.log("=== AudioTimeline onBeforeSave 시작 ===");

      // scene.userData에 현재 상태 저장
      if (this.editor.scene) {
        const audioTimelineData = {
          tracks: {},
          currentTime: this.currentTime || 0,
          frameRate: this.frameRate || 30,
          audioObjects: {}, // 개별 오디오 객체들의 메타데이터
          masterVolume: 1.0 // 마스터 볼륨
        };

        console.log("현재 this.tracks 상태:", this.tracks);
        console.log("this.tracks 크기:", this.tracks.size);
        console.log("this.tracks 키들:", Array.from(this.tracks.keys()));

        // 각 오디오 트랙의 데이터 수집 (동기적으로)
        this.tracks.forEach((track, trackId) => {
          console.log(`트랙 ${trackId} 처리 중:`, track);

          if (track.element) {
            const audioSprite = track.element.querySelector('.audio-sprite');
            if (audioSprite) {
              // 오디오 파일 경로 및 메타데이터 저장
              const audioPath = audioSprite.dataset.audioPath;
              const audioName = audioSprite.dataset.audioName;
              const startTime = parseFloat(audioSprite.dataset.startTime || 0);
              const duration = parseFloat(audioSprite.dataset.duration || 0);
              const volume = parseFloat(audioSprite.dataset.volume || 1.0);

              console.log(`트랙 ${trackId} 데이터 수집:`, {
                audioPath,
                audioName,
                startTime,
                duration,
                volume
              });

              // 오디오 객체 찾기
              const object = this.editor.scene.getObjectById(parseInt(trackId));
              const objectUserData = object && object.userData ? {
                startTime: object.userData.startTime || 0,
                duration: object.userData.duration || duration,
                volume: object.userData.volume || 1.0,
                mute: object.userData.mute || false,
                playbackRate: object.userData.playbackRate || 1.0
              } : {
                startTime: 0,
                duration: duration,
                volume: 1.0,
                mute: false,
                playbackRate: 1.0
              };

              // 즉시 tracks 데이터에 추가 (Base64 인코딩 없이)
              audioTimelineData.tracks[trackId] = {
                audioPath: audioPath,
                audioName: audioName,
                startTime: startTime,
                duration: duration,
                volume: volume,
                audioData: null, // Base64 인코딩은 나중에 처리
                left: parseFloat(audioSprite.style.left) || 0,
                width: parseFloat(audioSprite.style.width) || 100,
                // 오디오 객체의 userData도 저장
                objectUserData: objectUserData
              };

              console.log(`✅ 오디오 트랙 ${trackId} 저장 완료:`, audioTimelineData.tracks[trackId]);

              // 저장된 데이터 상세 확인
              console.log(`🔍 저장된 데이터 상세:`, {
                trackId,
                audioPath,
                audioName,
                startTime,
                duration,
                volume,
                left: parseFloat(audioSprite.style.left) || 0,
                width: parseFloat(audioSprite.style.width) || 100,
                objectUserData: objectUserData
              });
            }
          }
        });

        // this.tracks가 비어있다면 tracks 데이터는 생성하지 않음
        if (this.tracks.size === 0) {
          console.log("🔍 this.tracks가 비어있습니다. tracks 데이터를 생성하지 않습니다.");
        }

        // audioObjects를 완전히 새로 생성 (기존 데이터 복사하지 않음)
        audioTimelineData.audioObjects = {
          masterVolume: 1.0
        };

        // 현재 트랙에서 사용 중인 오디오 파일 정보만 audioObjects에 추가
        const usedAudioFiles = new Set();
        this.tracks.forEach((track, trackId) => {
          if (track.element) {
            const audioSprite = track.element.querySelector('.audio-sprite');
            if (audioSprite && audioSprite.dataset.audioPath) {
              const audioPath = audioSprite.dataset.audioPath;
              if (!usedAudioFiles.has(audioPath)) {
                usedAudioFiles.add(audioPath);

                // 오디오 파일 정보를 audioObjects에 추가
                const audioName = audioSprite.dataset.audioName || 'Unknown';
                const displayName = audioSprite.dataset.audioName || audioName;

                audioTimelineData.audioObjects[trackId] = {
                  audioFile: {
                    path: audioPath,
                    name: audioName,
                    displayName: displayName
                  },
                  startTime: parseFloat(audioSprite.dataset.startTime || 0),
                  duration: parseFloat(audioSprite.dataset.duration || 0),
                  volume: parseFloat(audioSprite.dataset.volume || 1.0),
                  mute: false,
                  playbackRate: 1.0
                };

                console.log(`✅ audioObjects에 오디오 파일 추가: ${trackId}`, audioTimelineData.audioObjects[trackId]);
              }
            }
          }
        });

        console.log(`🔍 새로 생성된 audioObjects:`, audioTimelineData.audioObjects);
        console.log(`🔍 기존 audioTimeline.audioObjects:`, this.editor.scene.userData.audioTimeline?.audioObjects);

        console.log(`🔍 audioObjects에 추가된 오디오 파일 개수: ${Object.keys(audioTimelineData.audioObjects).length - 1}`); // masterVolume 제외

        // 즉시 데이터 저장 (동기적으로)
        // 데이터 크기 확인 및 제한
        const dataString = JSON.stringify(audioTimelineData);
        const maxDataSize = 10 * 1024 * 1024; // 10MB 제한

        if (dataString.length > maxDataSize) {
          console.warn(`⚠️ audioTimeline 데이터가 너무 큽니다: ${(dataString.length / 1024 / 1024).toFixed(2)}MB > 10MB`);
          console.warn(`Base64 데이터를 제거하고 경로만 저장합니다.`);
        }

        // audioTimeline에 통합된 데이터 저장
        this.editor.scene.userData.audioTimeline = audioTimelineData;

        // 기존 audio 키는 제거 (통합 완료)
        if (this.editor.scene.userData.audio) {
          delete this.editor.scene.userData.audio;
          console.log("기존 audio 키를 제거했습니다 (audioTimeline으로 통합 완료).");
        }

        console.log("=== 최종 저장 데이터 ===");
        console.log("audioTracks 개수:", Object.keys(audioTimelineData.tracks).length);
        console.log("audioTracks 키들:", Object.keys(audioTimelineData.tracks));
        console.log("audioTracks 상세 데이터:", audioTimelineData.tracks);
        console.log("audioObjects 개수:", Object.keys(audioTimelineData.audioObjects || {}).length);
        console.log("audioObjects 상세 데이터:", audioTimelineData.audioObjects);
        console.log("데이터 크기:", (JSON.stringify(audioTimelineData).length / 1024 / 1024).toFixed(2), "MB");
        console.log("scene.userData.audioTimeline 설정 완료");

        // 저장된 데이터가 실제로 scene.userData에 설정되었는지 확인
        console.log("🔍 scene.userData.audioTimeline 확인:", this.editor.scene.userData.audioTimeline);
        console.log("🔍 scene.userData.audioTimeline.tracks 확인:", this.editor.scene.userData.audioTimeline?.tracks);

        console.log("=== AudioTimeline onBeforeSave 완료 ===");
      }
    } catch (error) {
      console.error("AudioTimeline onBeforeSave 실행 중 오류:", error);
    }
  }

  // 오디오 파일을 Base64로 인코딩
  async encodeAudioToBase64(audioPath) {
    try {
      if (!audioPath) return null;

      // 상대 경로를 절대 경로로 변환
      const absolutePath = new URL(audioPath, window.location.href).href;

      // 오디오 파일을 Blob으로 가져오기
      const response = await fetch(absolutePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();

      // 파일 크기 제한 (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (audioBlob.size > maxSize) {
        console.warn(`⚠️ 오디오 파일이 너무 큽니다: ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB > 5MB`);
        console.warn(`경로만 저장하고 Base64 데이터는 저장하지 않습니다.`);
        return null;
      }

      // FileReader를 사용하여 Base64로 변환
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(audioBlob);
      });
    } catch (error) {
      console.error(`오디오 파일 인코딩 실패: ${audioPath}`, error);
      return null;
    }
  }

  // 프로젝트 로드 시 오디오 데이터 복원
  onAfterLoad() {
    console.log("=== AudioTimeline onAfterLoad 시작 ===");

    try {
      // scene.userData에서 audioTimeline 데이터 확인
      if (this.editor.scene && this.editor.scene.userData && this.editor.scene.userData.audioTimeline) {
        console.log("scene.userData.audioTimeline 데이터 발견:", this.editor.scene.userData.audioTimeline);

        const timelineData = this.editor.scene.userData.audioTimeline;

        // 저장된 오디오 트랙 복원
        if (timelineData.tracks && Object.keys(timelineData.tracks).length > 0) {
          console.log("저장된 오디오 트랙 개수:", Object.keys(timelineData.tracks).length);
          console.log("저장된 tracks 데이터:", timelineData.tracks);

          Object.entries(timelineData.tracks).forEach(([trackId, trackData]) => {
            console.log(`🔍 오디오 트랙 복원 중: ${trackId}`, trackData);
            console.log(`🔍 trackData 상세:`, {
              audioPath: trackData.audioPath,
              startTime: trackData.startTime,
              duration: trackData.duration,
              left: trackData.left,
              width: trackData.width,
              objectUserData: trackData.objectUserData
            });

            // Base64 데이터가 있으면 Blob으로 변환하여 오디오 파일 생성
            if (trackData.audioData) {
              this.restoreAudioFromBase64(trackId, trackData);
            } else if (trackData.audioPath) {
              // Base64 데이터가 없으면 경로로 복원 (기존 방식)
              this.restoreAudioFromPath(trackId, trackData);
            }
          });
        } else {
          console.log("저장된 tracks 데이터가 없습니다. audioObjects에서 트랙을 복원합니다.");

          // audioObjects에서 오디오 파일 정보를 찾아서 트랙 복원
          if (timelineData.audioObjects) {
            console.log(`🔍 audioObjects에서 트랙 복원 시작, 총 ${Object.keys(timelineData.audioObjects).length}개`);

            // 모든 audioObjects를 순회하며 트랙 복원
            Object.entries(timelineData.audioObjects).forEach(([objectId, audioData]) => {
              console.log(`🔍 audioObject 처리 중: ${objectId}`, audioData);

              // 기본적인 오디오 데이터가 있는지 확인
              if (audioData.audioFile && audioData.audioFile.path) {
                console.log(`🔍 ${objectId} 객체로 트랙 복원 시작`);

                // 1. 저장된 오디오 데이터로 loadAudioFile 직접 호출
                const audioFile = {
                  path: audioData.audioFile.path,
                  name: audioData.audioFile.name,
                  displayName: audioData.audioFile.displayName,
                  // 저장된 트랙 데이터를 originalTrackData로 전달
                  originalTrackData: {
                    startTime: audioData.startTime !== undefined ? audioData.startTime : 0,
                    duration: audioData.duration !== undefined ? audioData.duration : 100,
                    volume: audioData.volume !== undefined ? audioData.volume : 1.0,
                    mute: audioData.mute !== undefined ? audioData.mute : false,
                    playbackRate: audioData.playbackRate !== undefined ? audioData.playbackRate : 1.0,
                    audioStartTime: audioData.audioStartTime !== undefined ? audioData.audioStartTime : 0,
                    audioEndTime: audioData.audioEndTime !== undefined ? audioData.audioEndTime : (audioData.duration || 100)
                  }
                };

                console.log(`🔍 구성된 audioFile:`, audioFile);

                // 2. loadAudioFile 직접 호출 (addAudioFromAsset 건너뛰기)
                this.loadAudioFile(audioFile).then((track) => {
                  console.log(`✅ loadAudioFile 완료, 생성된 트랙:`, track);
                  
                  // 3. addTrack은 loadAudioFile 내부에서 자동 호출됨
                  
          // 4. 저장된 속성들을 바로 복원 (UI 업데이트 메서드들)
                  if (track && track.element) {
                    const audioSprite = track.element.querySelector('.audio-sprite');
                    if (audioSprite) {
                      console.log(`🔍 오디오 스프라이트 발견, 속성 복원 시작`);
                      
                      // 위치/크기 복원
                      const safeTotalSeconds = Number(this?.options?.totalSeconds) || Number(this?.editor?.scene?.userData?.timeline?.totalSeconds) || 300;
                      if (audioData.startTime !== undefined) {
                        const left = (audioData.startTime / safeTotalSeconds) * 100;
                        audioSprite.style.left = `${left}%`;
                        audioSprite.dataset.startTime = audioData.startTime.toString();
                        console.log(`📍 startTime 복원: ${audioData.startTime} -> left: ${left}%`);
                      }
                      
                      if (audioData.duration !== undefined) {
                        const width = (audioData.duration / safeTotalSeconds) * 100;
                        audioSprite.style.width = `${width}%`;
                        audioSprite.dataset.duration = audioData.duration.toString();
                        console.log(`📏 duration 복원: ${audioData.duration} -> width: ${width}%`);
                      }
                      
                      // 볼륨 등 기타 속성 복원
                      if (audioData.volume !== undefined) {
                        audioSprite.dataset.volume = audioData.volume.toString();
                        console.log(`🔊 volume 복원: ${audioData.volume}`);
                      }
                      
                      if (audioData.mute !== undefined) {
                        audioSprite.dataset.mute = audioData.mute.toString();
                        console.log(`🔇 mute 복원: ${audioData.mute}`);
                      }
                      
                      if (audioData.playbackRate !== undefined) {
                        audioSprite.dataset.playbackRate = audioData.playbackRate.toString();
                        console.log(`⏩ playbackRate 복원: ${audioData.playbackRate}`);
                      }
                      
                      if (audioData.audioStartTime !== undefined) {
                        audioSprite.dataset.audioStartTime = audioData.audioStartTime.toString();
                        console.log(`🎵 audioStartTime 복원: ${audioData.audioStartTime}`);
                      }
                      
                      if (audioData.audioEndTime !== undefined) {
                        audioSprite.dataset.audioEndTime = audioData.audioEndTime.toString();
                        console.log(`🎵 audioEndTime 복원: ${audioData.audioEndTime}`);
                      }
                      
                      // 오디오 객체의 userData도 복원
                      const object = this.editor.scene.getObjectById(parseInt(track.objectId || track.id));
                      if (object && object.userData) {
                        if (audioData.startTime !== undefined) {
                          object.userData.startTime = audioData.startTime;
                        }
                        if (audioData.duration !== undefined) {
                          object.userData.duration = audioData.duration;
                        }
                        if (audioData.volume !== undefined) {
                          object.userData.volume = audioData.volume;
                        }
                        if (audioData.mute !== undefined) {
                          object.userData.mute = audioData.mute;
                        }
                        if (audioData.playbackRate !== undefined) {
                          object.userData.playbackRate = audioData.playbackRate;
                        }
                        if (audioData.audioStartTime !== undefined) {
                          object.userData.audioStartTime = audioData.audioStartTime;
                        }
                        if (audioData.audioEndTime !== undefined) {
                          object.userData.audioEndTime = audioData.audioEndTime;
                        }
                        
                        console.log(`🎵 오디오 객체 userData 복원 완료:`, {
                          startTime: object.userData.startTime,
                          duration: object.userData.duration,
                          volume: object.userData.volume,
                          mute: object.userData.mute,
                          playbackRate: object.userData.playbackRate,
                          audioStartTime: object.userData.audioStartTime,
                          audioEndTime: object.userData.audioEndTime
                        });
                      }
                      
                      console.log(`✅ 트랙 ${track.objectId || track.id} 속성 복원 완료`);

              // 동일 UX 보장을 위해: 복원 직후 선택/입력필드 업데이트(직접 추가 케이스와 동일 동작)
              if (typeof audioSprite.applySelectionAndUpdateInputs === 'function') {
                audioSprite.applySelectionAndUpdateInputs();
              } else {
                // 바인딩이 늦을 수 있으므로 한 번 더 시도
                setTimeout(() => {
                  const retrySprite = track.element?.querySelector('.audio-sprite');
                  if (retrySprite && typeof retrySprite.applySelectionAndUpdateInputs === 'function') {
                    retrySprite.applySelectionAndUpdateInputs();
                  }
                }, 0);
              }
                    }
                  }

                   // 5. 선택 기반 속성 메서드들로 최종 정합성 보정
                   // (updateAudioStartTime / updateAudioEndTime / updateClipStartTime / updateClipDuration)
                   try {
                    this.applySavedPropertiesForTrack(track.objectId || track.id, audioData);
                    // 타임라인 설정 적용 후 한 번 더 보정 (비동기 로드 타이밍 대비)
                    setTimeout(() => {
                      this.applySavedPropertiesForTrack(track.objectId || track.id, audioData);
                    }, 50);
                   } catch (e) {
                     console.warn('선택 기반 속성 보정 중 경고:', e);
                   }

                  // 6. audioObjects의 오래된 ID를 새로운 track.id로 마이그레이션
                  try {
                    if (objectId !== String(track.objectId || track.id)) {
                      const audioTL = this.editor.scene.userData.audioTimeline || { audioObjects: {} };
                      const prev = audioTL.audioObjects?.[objectId];
                      if (prev) {
                        // 새 ID에 복사
                        this.updateAudioObjectsEntry(track.objectId || track.id, {
                          ...prev,
                          audioFile: prev.audioFile || audioFile,
                          startTime: audioData.startTime !== undefined ? audioData.startTime : prev.startTime,
                          duration: audioData.duration !== undefined ? audioData.duration : prev.duration,
                          volume: audioData.volume !== undefined ? audioData.volume : prev.volume,
                          mute: audioData.mute !== undefined ? audioData.mute : prev.mute,
                          playbackRate: audioData.playbackRate !== undefined ? audioData.playbackRate : prev.playbackRate,
                          audioStartTime: audioData.audioStartTime !== undefined ? audioData.audioStartTime : prev.audioStartTime,
                          audioEndTime: audioData.audioEndTime !== undefined ? audioData.audioEndTime : prev.audioEndTime,
                        });
                        // 오래된 항목 삭제
                        delete this.editor.scene.userData.audioTimeline.audioObjects[objectId];
                        console.log(`🧹 audioObjects에서 오래된 ID ${objectId}를 제거하고 새 ID ${track.objectId || track.id}로 마이그레이션했습니다.`);
                      }
                    }
                  } catch (migrateErr) {
                    console.warn('audioObjects ID 마이그레이션 중 경고:', migrateErr);
                  }
                }).catch((error) => {
                  console.error(`❌ loadAudioFile 실패: ${objectId}`, error);
                });
              } else {
                console.log(`⚠️ ${objectId} 객체에 유효한 오디오 데이터가 없습니다.`);
              }
            });
          } else {
            console.log("⚠️ audioObjects 데이터가 없습니다.");
          }
        }

        // 저장된 현재 시간 복원
        if (timelineData.currentTime !== undefined) {
          this.currentTime = timelineData.currentTime;
          console.log(`저장된 현재 시간 복원: ${this.currentTime}s`);
        }

        // 마스터 볼륨 복원
        if (timelineData.audioObjects?.masterVolume) {
          console.log(`마스터 볼륨 복원: ${timelineData.audioObjects.masterVolume}`);
        }

        // 타임라인 길이가 준비되면 퍼센트 재계산을 한 번 더 수행
        this.scheduleRecalcForTimelineReady();

        console.log("✅ AudioTimeline onAfterLoad 완료");
      } else {
        console.log("⚠️ scene.userData.audioTimeline 데이터가 없습니다.");
      }
    } catch (error) {
      console.error("❌ AudioTimeline onAfterLoad 오류:", error);
    }
  }

  // 트랙 속성 복원 (직접 트랙 객체 사용)
  restoreTrackPropertiesDirect(track, audioData) {
    try {
      console.log(`트랙 속성 직접 복원:`, track, audioData);

      if (!track || !track.element) {
        console.warn(`트랙 또는 트랙 요소가 없습니다:`, track);
        return;
      }

      const audioSprite = track.element.querySelector('.audio-sprite');
      if (audioSprite) {
        // 트랙 객체의 속성 복원
        if (audioData.startTime !== undefined) {
          track.startTime = audioData.startTime;
          audioSprite.dataset.startTime = audioData.startTime.toString();
          console.log(`⏰ startTime 복원: ${audioData.startTime}`);
        }

        if (audioData.duration !== undefined) {
          track.duration = audioData.duration;
          audioSprite.dataset.duration = audioData.duration.toString();
          console.log(`⏱️ duration 복원: ${audioData.duration}`);
        }

        if (audioData.volume !== undefined) {
          track.volume = audioData.volume;
          audioSprite.dataset.volume = audioData.volume.toString();
          console.log(`🔊 volume 복원: ${audioData.volume}`);
        }

        if (audioData.mute !== undefined) {
          track.mute = audioData.mute;
          audioSprite.dataset.mute = audioData.mute.toString();
          console.log(`🔇 mute 복원: ${audioData.mute}`);
        }

        if (audioData.playbackRate !== undefined) {
          track.playbackRate = audioData.playbackRate;
          audioSprite.dataset.playbackRate = audioData.playbackRate.toString();
          console.log(`⏩ playbackRate 복원: ${audioData.playbackRate}`);
        }

        if (audioData.audioStartTime !== undefined) {
          track.audioStartTime = audioData.audioStartTime;
          audioSprite.dataset.audioStartTime = audioData.audioStartTime.toString();
          console.log(`🎵 audioStartTime 복원: ${audioData.audioStartTime}`);
        }

        if (audioData.audioEndTime !== undefined) {
          track.audioEndTime = audioData.audioEndTime;
          audioSprite.dataset.audioEndTime = audioData.audioEndTime.toString();
          console.log(`🎵 audioEndTime 복원: ${audioData.audioEndTime}`);
        }

        // 위치와 크기 복원 (퍼센트 단위)
        if (audioData.left !== undefined) {
          audioSprite.style.left = `${audioData.left}%`;
          console.log(`📍 left 복원: ${audioData.left}%`);
        } else if (audioData.startTime !== undefined) {
          // startTime이 있으면 left 계산
          const left = (audioData.startTime / this.getTotalSeconds()) * 100;
          audioSprite.style.left = `${left}%`;
          console.log(`📍 left 계산 및 복원: ${left}%`);
        }

        if (audioData.width !== undefined) {
          audioSprite.style.width = `${audioData.width}%`;
          console.log(`📏 width 복원: ${audioData.width}%`);
        } else if (audioData.duration !== undefined) {
          // duration이 있으면 width 계산
          const width = (audioData.duration / this.getTotalSeconds()) * 100;
          audioSprite.style.width = `${width}%`;
          console.log(`📏 width 계산 및 복원: ${width}%`);
        }

        // 오디오 객체의 userData도 복원
        if (audioData.objectUserData) {
          const object = this.editor.scene.getObjectById(parseInt(track.objectId || track.id));
          if (object && object.userData) {
            if (audioData.objectUserData.startTime !== undefined) {
              object.userData.startTime = audioData.objectUserData.startTime;
            }
            if (audioData.objectUserData.duration !== undefined) {
              object.userData.duration = audioData.objectUserData.duration;
            }
            if (audioData.objectUserData.volume !== undefined) {
              object.userData.volume = audioData.objectUserData.volume;
            }
            if (audioData.objectUserData.mute !== undefined) {
              object.userData.mute = audioData.objectUserData.mute;
            }
            if (audioData.objectUserData.playbackRate !== undefined) {
              object.userData.playbackRate = audioData.objectUserData.playbackRate;
            }
            if (audioData.objectUserData.audioStartTime !== undefined) {
              object.userData.audioStartTime = audioData.objectUserData.audioStartTime;
            }
            if (audioData.objectUserData.audioEndTime !== undefined) {
              object.userData.audioEndTime = audioData.objectUserData.audioEndTime;
            }

            console.log(`🎵 오디오 객체 userData 복원 완료:`, {
              startTime: object.userData.startTime,
              duration: object.userData.duration,
              volume: object.userData.volume,
              mute: object.userData.mute,
              playbackRate: object.userData.playbackRate,
              audioStartTime: object.userData.audioStartTime,
              audioEndTime: object.userData.audioEndTime
            });
          }
        }

        console.log(`✅ 트랙 ${track.objectId || track.id} 속성 직접 복원 완료`);
      }
    } catch (error) {
      console.error(`트랙 속성 직접 복원 중 오류:`, error);
    }
  }

  // 저장된 속성 값을 선택 기반 업데이트 메서드들로 적용 (로드 시 최종 보정)
  applySavedPropertiesForTrack(objectId, audioData) {
    try {
      const track = this.tracks.get(objectId);
      if (!track || !track.element) return;
      const sprite = track.element.querySelector('.audio-sprite');
      if (!sprite) return;

      // 선택 상태로 만들기 (선택 기반 메서드들이 선택된 스프라이트를 사용함)
      document.querySelectorAll('.audio-sprite').forEach(s => s.classList.remove('selected'));
      sprite.classList.add('selected');

      // 클립 위치 및 길이 보정
      if (audioData.startTime !== undefined) {
        this.updateClipStartTime(parseFloat(audioData.startTime));
      }
      if (audioData.duration !== undefined) {
        this.updateClipDuration(parseFloat(audioData.duration));
      }

      // 오디오 편집 구간 보정 (원본 파일 내 구간)
      if (audioData.audioStartTime !== undefined) {
        this.updateAudioStartTime(parseFloat(audioData.audioStartTime));
      }
      if (audioData.audioEndTime !== undefined) {
        this.updateAudioEndTime(parseFloat(audioData.audioEndTime));
      }

      // UI 동기화
      this.updateUI();
    } catch (e) {
      console.warn('applySavedPropertiesForTrack 처리 중 경고:', e);
    }
  }

  // 트랙 속성 복원 (audioObjects에서 복원된 트랙용)
  restoreTrackProperties(objectId, audioData) {
    try {
      console.log(`트랙 속성 복원: ${objectId}`, audioData);

      // audioFile.path로 트랙 찾기 (objectId는 새로 생성될 수 있음)
      let track = null;
      if (audioData.audioFile && audioData.audioFile.path) {
        track = Array.from(this.tracks.values()).find(t => {
          if (t.element) {
            const audioSprite = t.element.querySelector('.audio-sprite');
            return audioSprite && audioSprite.dataset.audioPath === audioData.audioFile.path;
          }
          return false;
        });
      }

      // 경로로 찾지 못했다면 objectId로 시도
      if (!track) {
        track = Array.from(this.tracks.values()).find(t => t.objectId === objectId);
      }

      if (!track) {
        console.warn(`트랙을 찾을 수 없습니다: objectId=${objectId}, path=${audioData.audioFile?.path}`);
        console.log("현재 tracks 상태:", Array.from(this.tracks.entries()));
        return;
      }

      console.log(`트랙 찾음:`, track);

      // 트랙 요소 찾기
      if (track.element) {
        const audioSprite = track.element.querySelector('.audio-sprite');
        if (audioSprite) {
          // 저장된 속성 복원
          if (audioData.startTime !== undefined) {
            audioSprite.dataset.startTime = audioData.startTime.toString();
            audioSprite.style.left = `${(audioData.startTime / this.getTotalSeconds()) * 100}%`;
          }

          if (audioData.duration !== undefined) {
            audioSprite.dataset.duration = audioData.duration.toString();
            audioSprite.style.width = `${(audioData.duration / this.getTotalSeconds()) * 100}%`;
          }

          if (audioData.volume !== undefined) {
            audioSprite.dataset.volume = audioData.volume.toString();
          }

          // left, width 속성도 복원
          if (audioData.left !== undefined) {
            audioSprite.style.left = `${audioData.left}%`;
          }

          if (audioData.width !== undefined) {
            audioSprite.style.width = `${audioData.width}%`;
          }

          // 오디오 객체의 userData도 복원
          if (audioData.objectUserData) {
            const object = this.editor.scene.getObjectById(parseInt(track.objectId));
            if (object && object.userData) {
              object.userData.startTime = audioData.objectUserData.startTime || 0;
              object.userData.duration = audioData.objectUserData.duration || audioData.duration || 0;
              object.userData.volume = audioData.objectUserData.volume || 1.0;
              object.userData.mute = audioData.objectUserData.mute || false;
              object.userData.playbackRate = audioData.objectUserData.playbackRate || 1.0;
            }
          }

          console.log(`✅ 트랙 ${track.objectId} 속성 복원 완료`);
        }
      }
    } catch (error) {
      console.error(`트랙 속성 복원 중 오류: ${objectId}`, error);
    }
  }

  // Base64 데이터에서 오디오 복원
  async restoreAudioFromBase64(trackId, trackData) {
    try {
      console.log(`🔄 Base64에서 오디오 복원: ${trackId}`);
      console.log(`트랙 데이터:`, trackData);

      // Base64 데이터를 Blob으로 변환
      const response = await fetch(trackData.audioData);
      const audioBlob = await response.blob();

      // Blob URL 생성
      const blobUrl = URL.createObjectURL(audioBlob);

      // 오디오 파일 객체 생성
      const audioFile = {
        path: blobUrl,
        name: trackData.audioName || trackId,
        displayName: trackData.audioName || trackId,
        blob: audioBlob
      };

      console.log(`생성된 오디오 파일 객체:`, audioFile);
      console.log(`현재 tracks 상태:`, this.tracks);

      // 트랙에 오디오 추가
      console.log(`addAudioFromAsset 호출 시작: ${trackId}`);
      const result = this.addAudioFromAsset(audioFile);
      console.log(`addAudioFromAsset 결과:`, result);

      // 트랙이 생성되었는지 확인
      setTimeout(() => {
        console.log(`복원 후 tracks 상태:`, this.tracks);
        console.log(`트랙 ${trackId} 존재 여부:`, this.tracks.has(trackId));

        // 저장된 위치와 크기 복원
        this.restoreTrackPosition(trackId, trackData);
      }, 200);

      console.log(`✅ Base64에서 오디오 복원 완료: ${trackId}`);
    } catch (error) {
      console.error(`❌ Base64에서 오디오 복원 실패: ${trackId}`, error);
      // 실패 시 경로로 복원 시도
      this.restoreAudioFromPath(trackId, trackData);
    }
  }

  // 경로에서 오디오 복원 (기존 방식)
  restoreAudioFromPath(trackId, trackData) {
    try {
      console.log(`🔄 경로에서 오디오 복원: ${trackId}`);
      console.log(`트랙 데이터:`, trackData);

      // 기존 트랙이 있는지 확인
      if (this.tracks.has(trackId)) {
        console.log(`✅ 기존 트랙 ${trackId}가 이미 존재합니다. 속성만 복원합니다.`);

        // 기존 트랙의 속성만 복원
        setTimeout(() => {
          this.restoreTrackPosition(trackId, trackData);
        }, 100);
      } else {
        console.log(`⚠️ 기존 트랙 ${trackId}가 없습니다. 새 트랙을 생성합니다.`);

        // 오디오 파일 정보
        const audioFile = {
          path: trackData.audioPath,
          name: trackData.audioName || trackId,
          displayName: trackData.audioName || trackId
        };

        // 오디오 로더로 파일 로드
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(audioFile.path, (buffer) => {
          console.log(`🎵 오디오 파일 로드 성공: ${trackId}`, audioFile.path);

          // 트랙 객체 생성 (기존 trackId 사용)
          const track = {
            id: trackId,
            objectId: trackId, // objectId도 설정
            audioFile: audioFile,
            audioStartTime: trackData.audioStartTime || 0,
            audioEndTime: trackData.audioEndTime || trackData.duration || 0,
            startTime: trackData.startTime || 0,
            duration: trackData.duration || 0,
            volume: trackData.volume !== undefined ? trackData.volume : 1,
            mute: trackData.mute !== undefined ? trackData.mute : false,
            playbackRate: trackData.playbackRate !== undefined ? trackData.playbackRate : 1,
            buffer: buffer,
            element: null
          };

          // UI 요소 생성
          this.createAudioTrackUI(track, trackData);

          // tracks에 추가 (원본 trackId 사용)
          this.tracks.set(trackId, track);
          console.log(`✅ 트랙 ${trackId} 생성 완료:`, track);

          // 속성 복원
          setTimeout(() => {
            console.log(`🔍 restoreTrackPosition 호출: trackId=${trackId}, trackData=`, trackData);
            console.log(`🔍 현재 tracks 상태:`, Array.from(this.tracks.entries()));
            console.log(`🔍 trackId ${trackId} 존재 여부:`, this.tracks.has(trackId));

            if (this.tracks.has(trackId)) {
              this.restoreTrackPosition(trackId, trackData);
              
              // 오디오 객체의 userData도 복원
              if (trackData.objectUserData) {
                const object = this.editor.scene.getObjectById(parseInt(trackId));
                if (object && object.userData) {
                  object.userData.startTime = trackData.objectUserData.startTime || 0;
                  object.userData.duration = trackData.objectUserData.duration || trackData.duration || 0;
                  object.userData.volume = trackData.objectUserData.volume || 1.0;
                  object.userData.mute = trackData.objectUserData.mute || false;
                  object.userData.playbackRate = trackData.objectUserData.playbackRate || 1.0;
                  object.userData.audioStartTime = trackData.objectUserData.audioStartTime || 0;
                  object.userData.audioEndTime = trackData.objectUserData.audioEndTime || trackData.duration || 0;

                  console.log(`🎵 오디오 객체 userData 복원 완료:`, {
                    startTime: object.userData.startTime,
                    duration: object.userData.duration,
                    volume: object.userData.volume,
                    mute: object.userData.mute,
                    playbackRate: object.userData.playbackRate,
                    audioStartTime: object.userData.audioStartTime,
                    audioEndTime: object.userData.audioEndTime
                  });
                }
              }
            } else {
              console.error(`❌ trackId ${trackId}가 tracks에 존재하지 않습니다!`);
            }
          }, 100);

        }, (progress) => {
          console.log(`📊 오디오 로딩 진행률: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        }, (error) => {
          console.error(`❌ 오디오 파일 로드 실패: ${trackId}`, error);
        });
      }

      console.log(`✅ 경로에서 오디오 복원 완료: ${trackId}`);
    } catch (error) {
      console.error(`❌ 경로에서 오디오 복원 실패: ${trackId}`, error);
    }
  }

  // 트랙 위치와 크기 복원
  restoreTrackPosition(trackId, trackData) {
    try {
      console.log(`🔍 restoreTrackPosition 시작: ${trackId}`, trackData);

      const track = this.tracks.get(trackId);
      if (track && track.element) {
        const audioSprite = track.element.querySelector('.audio-sprite');
        if (audioSprite) {
          // 위치와 크기 복원 (퍼센트 단위로 저장되었으므로 퍼센트로 복원)
          if (trackData.left !== undefined) {
            audioSprite.style.left = `${trackData.left}%`;
            console.log(`📍 left 복원: ${trackData.left}%`);
          }
          if (trackData.width !== undefined) {
            audioSprite.style.width = `${trackData.width}%`;
            console.log(`📏 width 복원: ${trackData.width}%`);
          }

          // 오디오 속성 복원 - 트랙 객체와 DOM 요소 모두 동기화
          if (trackData.startTime !== undefined) {
            track.startTime = trackData.startTime;
            audioSprite.dataset.startTime = trackData.startTime.toString();
            console.log(`⏰ startTime 복원: ${trackData.startTime}`);
          }
          if (trackData.duration !== undefined) {
            track.duration = trackData.duration;
            audioSprite.dataset.duration = trackData.duration.toString();
            console.log(`⏱️ duration 복원: ${trackData.duration}`);
          }
          if (trackData.volume !== undefined) {
            track.volume = trackData.volume;
            audioSprite.dataset.volume = trackData.volume.toString();
            console.log(`🔊 volume 복원: ${trackData.volume}`);
          }
          if (trackData.mute !== undefined) {
            track.mute = trackData.mute;
            audioSprite.dataset.mute = trackData.mute.toString();
            console.log(`🔇 mute 복원: ${trackData.mute}`);
          }
          if (trackData.playbackRate !== undefined) {
            track.playbackRate = trackData.playbackRate;
            audioSprite.dataset.playbackRate = trackData.playbackRate.toString();
            console.log(`⏩ playbackRate 복원: ${trackData.playbackRate}`);
          }

          // 오디오 시작/종료 시간 복원
          if (trackData.audioStartTime !== undefined) {
            track.audioStartTime = trackData.audioStartTime;
            audioSprite.dataset.audioStartTime = trackData.audioStartTime.toString();
            console.log(`🎵 audioStartTime 복원: ${trackData.audioStartTime}`);
          }
          if (trackData.audioEndTime !== undefined) {
            track.audioEndTime = trackData.audioEndTime;
            audioSprite.dataset.audioEndTime = trackData.audioEndTime.toString();
            console.log(`🎵 audioEndTime 복원: ${trackData.audioEndTime}`);
          }

          // 오디오 객체의 userData도 복원
          if (trackData.objectUserData) {
            const object = this.editor.scene.getObjectById(parseInt(trackId));
            if (object && object.userData) {
              // 기본 속성 복원
              if (trackData.objectUserData.startTime !== undefined) {
                object.userData.startTime = trackData.objectUserData.startTime;
              }
              if (trackData.objectUserData.duration !== undefined) {
                object.userData.duration = trackData.objectUserData.duration;
              }
              if (trackData.objectUserData.volume !== undefined) {
                object.userData.volume = trackData.objectUserData.volume;
              }
              if (trackData.objectUserData.mute !== undefined) {
                object.userData.mute = trackData.objectUserData.mute;
              }
              if (trackData.objectUserData.playbackRate !== undefined) {
                object.userData.playbackRate = trackData.objectUserData.playbackRate;
              }
              
              // 오디오 관련 속성 복원
              if (trackData.objectUserData.audioStartTime !== undefined) {
                object.userData.audioStartTime = trackData.objectUserData.audioStartTime;
              }
              if (trackData.objectUserData.audioEndTime !== undefined) {
                object.userData.audioEndTime = trackData.objectUserData.audioEndTime;
              }

              console.log(`🎵 오디오 객체 userData 복원 완료:`, {
                startTime: object.userData.startTime,
                duration: object.userData.duration,
                volume: object.userData.volume,
                mute: object.userData.mute,
                playbackRate: object.userData.playbackRate,
                audioStartTime: object.userData.audioStartTime,
                audioEndTime: object.userData.audioEndTime
              });
            }
          }

          // 트랙 객체의 모든 속성도 동기화
          if (trackData.audioStartTime !== undefined) {
            track.audioStartTime = trackData.audioStartTime;
          }
          if (trackData.audioEndTime !== undefined) {
            track.audioEndTime = trackData.audioEndTime;
          }

          console.log(`✅ 트랙 위치 복원 완료: ${trackId}`);
          
          // UI 강제 업데이트
          this.updateUI();
        } else {
          console.warn(`❌ audio-sprite를 찾을 수 없음: ${trackId}`);
        }
      } else {
        console.warn(`❌ 트랙을 찾을 수 없음: ${trackId}`);
      }
    } catch (error) {
      console.error(`❌ 트랙 위치 복원 실패: ${trackId}`, error);
    }
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

    // 선택 공통 처리 함수
    const applySelectionAndUpdateInputs = (targetSprite, targetTrack) => {
      // 다른 스프라이트 선택 해제
      document.querySelectorAll('.audio-sprite').forEach(s => s.classList.remove('selected'));
      // 현재 스프라이트 선택
      targetSprite.classList.add('selected');

      if (targetTrack) {
        const audioObject = this.editor.scene.getObjectById(parseInt(targetTrack.objectId));
        if (audioObject) {
          const startTime = parseFloat(targetSprite.dataset.startTime) || 0;
          const duration = parseFloat(targetSprite.dataset.duration) || 0;
          const audioStartTime = audioObject.userData.audioStartTime || 0;
          const audioEndTime = audioObject.userData.audioEndTime || (audioObject.userData.audioElement ? audioObject.userData.audioElement.duration : audioStartTime + duration);

          // 동일한 포맷팅 경로 사용
          this.updateInputFields(audioStartTime, audioEndTime);
          this.updateClipInputFields(startTime, duration);
        }
      }
    };

    // 스프라이트 클릭 이벤트 (선택)
    sprite.addEventListener("click", (e) => {
      e.stopPropagation();
      applySelectionAndUpdateInputs(sprite, track);
    });

    // 스프라이트 더블클릭 이벤트 (재생/정지)
    sprite.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      console.log("오디오 스프라이트 더블클릭 - 재생/정지");

      if (track) {
        const audioObject = this.editor.scene.getObjectById(parseInt(track.objectId));
        if (audioObject && audioObject.userData.audioElement) {
          const audioElement = audioObject.userData.audioElement;

          if (audioElement.paused) {
            // 재생 시작
            console.log(`오디오 ${track.objectId} 재생 시작`);
            audioElement.play().catch(error => {
              console.error("오디오 재생 실패:", error);
            });
          } else {
            // 재생 정지
            console.log(`오디오 ${track.objectId} 재생 정지`);
            audioElement.pause();
          }
        }
      }
    });

    // 로드 후 자동 선택 보정: 새로 생성된 스프라이트에 동일 로직 적용되도록 호출 지점에서 재사용 가능
    sprite.applySelectionAndUpdateInputs = () => applySelectionAndUpdateInputs(sprite, track);

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

      // 씬 데이터 업데이트 (헬퍼 사용)
      this.updateAudioObjectsEntry(audioObject.id, {
        startTime: startTime,
        duration: duration,
        audioStartTime: audioObject.userData.audioStartTime,
        audioEndTime: audioObject.userData.audioEndTime,
      });

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

  // 오디오 트랙 UI 생성 메서드
  createAudioTrackUI(track, trackData) {
    try {
      console.log(`🎨 createAudioTrackUI 시작: ${track.id}`, trackData);

      // 트랙 컨테이너 생성
      const trackElement = document.createElement("div");
      trackElement.className = "timeline-track";
      trackElement.dataset.objectId = track.id;

      // 오디오 트랙 컨텐츠 생성
      const trackContent = document.createElement("div");
      trackContent.className = "audio-tracks";

      // 트랙 헤더 생성
      const trackHeader = document.createElement("div");
      trackHeader.className = "track-header";
      trackHeader.innerHTML = `
        <div class="track-info">
          <span class="track-name">${track.audioFile.displayName || track.audioFile.name || "Audio"}</span>
        </div>
        <div class="track-controls">
          <button class="add-keyframe-btn" title="Add Keyframe">+</button>
          <button class="delete-track-btn" title="Delete Track" style="background: #ff4444; color: white; border: none; border-radius: 3px; padding: 2px 6px; margin-left: 5px; cursor: pointer;">×</button>
        </div>
      `;
      trackContent.appendChild(trackHeader);

      // 트랙 컨텐츠 영역 생성
      const trackContentArea = document.createElement("div");
      trackContentArea.className = "track-content";

      // 오디오 스프라이트 생성
      const audioSprite = document.createElement("div");
      audioSprite.className = "audio-sprite";
      audioSprite.dataset.objectId = track.id;
      audioSprite.dataset.startTime = track.startTime.toString();
      audioSprite.dataset.duration = track.duration.toString();
      audioSprite.dataset.volume = track.volume.toString();
      audioSprite.dataset.mute = track.mute.toString();
      audioSprite.dataset.playbackRate = track.playbackRate.toString();
      audioSprite.dataset.audioStartTime = track.audioStartTime.toString();
      audioSprite.dataset.audioEndTime = track.audioEndTime.toString();
      audioSprite.dataset.audioPath = track.audioFile.path;
      audioSprite.dataset.audioName = track.audioFile.name;

      // 스프라이트 스타일 설정
      const totalSeconds = this.options.totalSeconds || 300; // 기본값 5분
      const leftPercent = (track.startTime / this.getTotalSeconds()) * 100;
      const widthPercent = (track.duration / this.getTotalSeconds()) * 100;

      audioSprite.style.cssText = `
        position: absolute;
        left: ${leftPercent}%;
        width: ${widthPercent}%;
        height: 100%;
        background: linear-gradient(45deg, #4CAF50, #45a049);
        border: 1px solid #2E7D32;
        border-radius: 4px;
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        user-select: none;
        z-index: 10;
      `;

      // 스프라이트 텍스트 설정
      audioSprite.textContent = track.audioFile.displayName || track.audioFile.name;

      // 스프라이트를 트랙 컨텐츠에 추가
      trackContentArea.appendChild(audioSprite);
      trackContent.appendChild(trackContentArea);
      trackElement.appendChild(trackContent);

      // 트랙 요소를 트랙 객체에 저장
      track.element = trackElement;

      // 이벤트 바인딩
      this.bindSpriteEvents(audioSprite, track);
      // 바인딩 직후 한 번 보정: 데이터셋 기준으로 left/width 재계산
      const totalAfterBind = this.getTotalSeconds();
      const st = parseFloat(audioSprite.dataset.startTime || '0');
      const du = parseFloat(audioSprite.dataset.duration || '0');
      audioSprite.style.left = `${(st / totalAfterBind) * 100}%`;
      audioSprite.style.width = `${(du / totalAfterBind) * 100}%`;

      // 컨테이너에 트랙 추가
      // this.container.appendChild(trackElement);
      console.log("컨테이너에 트랙 추가 his.container", this.container);
      document.querySelector('.timeline-group[data-timeline=audio] .timeline-container').appendChild(trackElement);

      console.log(`✅ createAudioTrackUI 완료: ${track.id}`, {
        element: trackElement,
        sprite: audioSprite,
        left: leftPercent,
        width: widthPercent
      });

    } catch (error) {
      console.error(`❌ createAudioTrackUI 실패: ${track.id}`, error);
    }
  }

  // UI 강제 업데이트
  updateUI() {
    try {
      console.log("🔄 AudioTimeline UI 업데이트 시작");
      
      // 모든 트랙의 UI 요소들을 강제로 업데이트
      this.tracks.forEach((track, trackId) => {
        if (track.element) {
          const audioSprite = track.element.querySelector('.audio-sprite');
          if (audioSprite) {
            // 데이터셋 속성들을 트랙 객체와 동기화
            if (track.startTime !== undefined) {
              audioSprite.dataset.startTime = track.startTime.toString();
            }
            if (track.duration !== undefined) {
              audioSprite.dataset.duration = track.duration.toString();
            }
            if (track.volume !== undefined) {
              audioSprite.dataset.volume = track.volume.toString();
            }
            if (track.mute !== undefined) {
              audioSprite.dataset.mute = track.mute.toString();
            }
            if (track.playbackRate !== undefined) {
              audioSprite.dataset.playbackRate = track.playbackRate.toString();
            }
            if (track.audioStartTime !== undefined) {
              audioSprite.dataset.audioStartTime = track.audioStartTime.toString();
            }
            if (track.audioEndTime !== undefined) {
              audioSprite.dataset.audioEndTime = track.audioEndTime.toString();
            }
            // 스타일 재계산을 항상 수행하여 분모가 바뀐 경우도 즉시 반영
            const total = this.getTotalSeconds();
            const startTime = parseFloat(audioSprite.dataset.startTime || '0');
            const duration = parseFloat(audioSprite.dataset.duration || '0');
            audioSprite.style.left = `${(startTime / total) * 100}%`;
            audioSprite.style.width = `${(duration / total) * 100}%`;
          }
        }
      });
      
      console.log("✅ AudioTimeline UI 업데이트 완료");
    } catch (error) {
      console.error("❌ AudioTimeline UI 업데이트 오류:", error);
    }
  }

  // scene.userData.audioTimeline.audioObjects 동기화 헬퍼
  updateAudioObjectsEntry(objectId, patch) {
    try {
      if (objectId === undefined || objectId === null || objectId === '' || isNaN(Number(objectId))) {
        console.warn('updateAudioObjectsEntry: 잘못된 objectId, 업데이트를 건너뜁니다.', objectId, patch);
        return;
      }
      if (!this.editor.scene) return;
      if (!this.editor.scene.userData) this.editor.scene.userData = {};
      if (!this.editor.scene.userData.audioTimeline) {
        this.editor.scene.userData.audioTimeline = { audioObjects: {} };
      }
      if (!this.editor.scene.userData.audioTimeline.audioObjects) {
        this.editor.scene.userData.audioTimeline.audioObjects = {};
      }
      const current = this.editor.scene.userData.audioTimeline.audioObjects[objectId] || {};
      this.editor.scene.userData.audioTimeline.audioObjects[objectId] = {
        ...current,
        ...patch,
      };
    } catch (e) {
      console.warn('audioObjects 동기화 실패:', e);
    }
  }
}
