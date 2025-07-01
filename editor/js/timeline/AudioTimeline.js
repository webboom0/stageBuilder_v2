import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText, UIElement } from "../libs/ui.js";
import * as THREE from "three";
// editor/timeline/AudioTimeline.js
const AUDIO_FILE = {
  path: "https://webboom0.github.io/stageBuilder_v2/files/music/SUJESHUN.mp3",
  name: "DRAMA",
};

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
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);

    // Timeline.js에서 이미 한 번 초기화되므로, 여기서는 한 번만 실행
    if (!this.tracks.size) {
      this.initAudioTracks();
    }
  }

  initAudioTracks() {
    console.log("현재 트랙 수:", this.tracks.size);

    for (const track of this.tracks.values()) {
      if (track.type === "audio") {
        console.log("이미 오디오 트랙이 존재합니다:", track);
        return;
      }
    }

    // Fetch를 사용하여 전체 오디오 파일을 한 번에 로드
    fetch(AUDIO_FILE.path)
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
          audioObject.name = AUDIO_FILE.name;

          // userData에 오디오 엘리먼트 저장
          audioObject.userData = {
            audioElement: audioElement,
            volume: 1.0,
            mute: false,
            playbackRate: 1.0,
            type: "audio",
            audioUrl: audioUrl, // Blob URL 저장
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
            name: AUDIO_FILE.name,
            type: "audio",
            duration: effectiveDuration,
            element: this.createTrackElement(effectiveDuration),
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
  createTrackElement(duration) {
    const trackTopArea = document.createElement("div");
    trackTopArea.className = "audio-tracks";

    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";
    trackHeader.innerHTML = `
      <div class="track-info">
        <span class="track-name">${AUDIO_FILE.name}</span>
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
      <div class="sprite-handle left"></div>
      <div class="sprite-name">${AUDIO_FILE.name}</div>
      <div class="sprite-handle right"></div>
    `;
    sprite.insertBefore(spriteContent, sprite.children[1]);

    trackContent.appendChild(sprite);
    trackTopArea.appendChild(trackContent);

    // 파형 그리기
    this.drawWaveform(sprite.querySelector("canvas"));

    // 스프라이트 이벤트 바인딩
    this.bindSpriteEvents(sprite);

    return trackTopArea;
  }

  // 파형 그리기 메서드 추가
  async drawWaveform(canvas) {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const response = await fetch(AUDIO_FILE.path);
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
    this.tracks.forEach((track) => {
      const object = this.editor.scene.getObjectById(parseInt(track.objectId));
      if (!object) return;

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

      // 오디오 요소 업데이트
      if (hasChanges && object.userData.audioElement) {
        const audioElement = object.userData.audioElement;
        audioElement.volume = object.userData.volume || 1.0;
        audioElement.muted = object.userData.mute || false;
        audioElement.playbackRate = object.userData.playbackRate || 1.0;

        // 현재 프레임이 오디오 시작 시간과 일치하면 재생
        if (frame === 0 && !audioElement.playing) {
          audioElement.currentTime = 0;
          audioElement.play().catch(console.error);
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
    return framePercent >= clipLeft && framePercent <= clipLeft + clipWidth;
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

    // 전체 볼륨 조절 UI
    const volumeRow = new UIRow();
    volumeRow.add(new UIText("전체 볼륨"));

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

    // 볼륨 컨트롤 스타일 추가
    const style = document.createElement("style");
    style.textContent = `
      .volume-control {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 200px;
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
        min-width: 45px;
        text-align: right;
        color: #fff;
      }
    `;
    document.head.appendChild(style);

    return panel;
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

  bindSpriteEvents(sprite, track) {
    let isDragging = false;
    let dragStartX = 0;
    let startLeft = 0;
    let startWidth = 0;
    let dragHandle = null;
    let isMovingSprite = false;
    const MIN_WIDTH = 5; // 최소 5초
    const MAX_WIDTH = 180; // 최대 3분

    // 스프라이트 전체 드래그 이벤트
    sprite.addEventListener("mousedown", (e) => {
      // 핸들을 클릭한 경우는 무시
      if (e.target.classList.contains("sprite-handle")) return;

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

    // 왼쪽/오른쪽 핸들 드래그 이벤트
    const handles = sprite.querySelectorAll(".sprite-handle");
    handles.forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        isDragging = true;
        isMovingSprite = false;
        dragHandle = handle;
        dragStartX = e.clientX;
        startLeft = parseFloat(sprite.style.left) || 0;
        startWidth = parseFloat(sprite.style.width) || 0;

        // 드래그 중인 핸들 스타일 변경
        handle.style.backgroundColor = "#4CAF50";
      });
    });

    // 드래그 중 이벤트
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const container = sprite.closest(".timeline-viewport");
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;

      // 드래그 거리 계산 (퍼센트로)
      const dragDelta = ((e.clientX - dragStartX) / containerWidth) * 100;

      if (isMovingSprite) {
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
        if (track && track.audioObject) {
          track.audioObject.userData.startTime = startTime;
        }
      } else if (dragHandle) {
        if (dragHandle.classList.contains("left")) {
          // 왼쪽 핸들 드래그: 시작 위치와 길이 변경
          const newLeft = Math.max(
            0,
            Math.min(
              startLeft + dragDelta,
              startLeft +
              startWidth -
              (MIN_WIDTH / this.options.totalSeconds) * 100
            )
          );
          const newWidth = startWidth - (newLeft - startLeft);

          if (newWidth >= (MIN_WIDTH / this.options.totalSeconds) * 100) {
            sprite.style.left = `${newLeft}%`;
            sprite.style.width = `${newWidth}%`;

            // 시작 시간 업데이트
            const startTime = (newLeft / 100) * this.options.totalSeconds;
            sprite.dataset.startTime = startTime.toString();

            // 오디오 객체 업데이트
            if (track && track.audioObject) {
              track.audioObject.userData.startTime = startTime;
            }
          }
        } else if (dragHandle.classList.contains("right")) {
          // 오른쪽 핸들 드래그: 길이만 변경
          const newWidth = Math.max(
            (MIN_WIDTH / this.options.totalSeconds) * 100,
            Math.min(
              startWidth + dragDelta,
              (MAX_WIDTH / this.options.totalSeconds) * 100
            )
          );

          sprite.style.width = `${newWidth}%`;

          // 지속 시간 업데이트
          const duration = (newWidth / 100) * this.options.totalSeconds;
          sprite.dataset.duration = duration.toString();

          // 오디오 객체 업데이트
          if (track && track.audioObject) {
            track.audioObject.userData.duration = duration;
          }
        }
      }

      // 파형 다시 그리기
      const canvas = sprite.querySelector(".waveform-canvas");
      if (canvas) {
        this.drawWaveform(canvas);
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

      if (dragHandle) {
        dragHandle.style.backgroundColor = "";
        dragHandle = null;
      }

      // 변경사항 저장
      if (track && track.audioObject) {
        const audioObject = track.audioObject;
        const startTime = parseFloat(sprite.dataset.startTime) || 0;
        const duration = parseFloat(sprite.dataset.duration) || 0;

        // 오디오 요소 업데이트
        if (audioObject.userData.audioElement) {
          const audio = audioObject.userData.audioElement;
          audio.currentTime = startTime;
        }

        // 씬 데이터 업데이트
        if (!this.editor.scene.userData.audio) {
          this.editor.scene.userData.audio = {};
        }
        if (!this.editor.scene.userData.audio[audioObject.id]) {
          this.editor.scene.userData.audio[audioObject.id] = {};
        }

        this.editor.scene.userData.audio[audioObject.id].startTime = startTime;
        this.editor.scene.userData.audio[audioObject.id].duration = duration;
      }

      // 타임라인 업데이트 시그널 발생
      if (this.editor.signals?.timelineChanged) {
        this.editor.signals.timelineChanged.dispatch();
      }
    });

    // 스프라이트 스타일 업데이트
    // const style = document.createElement("style");
    // style.textContent = `
    //   .audio-sprite {
    //     position: relative;
    //     height: 30px;
    //     background: rgba(76, 175, 80, 0.3);
    //     border: 1px solid #4CAF50;
    //     border-radius: 4px;
    //     cursor: grab;
    //     user-select: none;
    //     transition: opacity 0.2s;
    //   }

    //   .audio-sprite:hover {
    //     background: rgba(76, 175, 80, 0.4);
    //   }

    //   .sprite-handle {
    //     position: absolute;
    //     top: 0;
    //     width: 8px;
    //     height: 100%;
    //     background: #4CAF50;
    //     cursor: ew-resize;
    //     opacity: 0.5;
    //     transition: opacity 0.2s;
    //     z-index: 1;
    //   }

    //   .sprite-handle:hover {
    //     opacity: 1;
    //   }

    //   .sprite-handle.left {
    //     left: 0;
    //     border-radius: 4px 0 0 4px;
    //   }

    //   .sprite-handle.right {
    //     right: 0;
    //     border-radius: 0 4px 4px 0;
    //   }

    //   .sprite-content {
    //     position: absolute;
    //     top: 0;
    //     left: 8px;
    //     right: 8px;
    //     height: 100%;
    //     display: flex;
    //     align-items: center;
    //     justify-content: center;
    //     pointer-events: none;
    //   }

    //   .waveform-canvas {
    //     width: 100%;
    //     height: 100%;
    //     pointer-events: none;
    //   }
    // `;
    // document.head.appendChild(style);
  }
}
