import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";
// editor/timeline/AudioTimeline.js
const AUDIO_FILE = {
  path: "../files/music/DRAMA.mp3",
  name: "DRAMA",
};

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
  showWaveform(audioData) {}

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

    // 볼륨 조절 UI
    const volumeRow = new UIRow();
    volumeRow.add(new UIText("Volume"));
    const volumeNumber = new UINumber(1).setRange(0, 1).setStep(0.1);
    volumeNumber.onChange(() =>
      this.updatePropertyValue("volume", volumeNumber.getValue())
    );
    volumeRow.add(volumeNumber);

    // 재생 속도 UI
    const playbackRateRow = new UIRow();
    playbackRateRow.add(new UIText("Playback Rate"));
    const playbackRateNumber = new UINumber(1).setRange(0.1, 2).setStep(0.1);
    playbackRateNumber.onChange(() =>
      this.updatePropertyValue("playbackRate", playbackRateNumber.getValue())
    );
    playbackRateRow.add(playbackRateNumber);

    panel.add(volumeRow);
    panel.add(playbackRateRow);

    return panel;
  }

  updatePropertyValue(propertyType, value) {
    if (!this.selectedKeyframe) return;

    const { objectId, frame } = this.selectedKeyframe;
    const track = this.tracks.get(objectId);
    const keyframeData = track.keyframes[propertyType].get(frame);
    const object = this.editor.scene.getObjectById(parseInt(objectId));

    if (keyframeData && object) {
      keyframeData.value = value;
      this.setPropertyValue(object, propertyType, value);

      // 오디오 요소 업데이트
      if (object.userData.audioElement) {
        const audioElement = object.userData.audioElement;
        switch (propertyType) {
          case "volume":
            audioElement.volume = value;
            break;
          case "mute":
            audioElement.muted = value;
            break;
          case "playbackRate":
            audioElement.playbackRate = value;
            break;
        }
      }

      if (this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(object);
      }
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
        <span class="track-name">${
          typeof objectName === "object"
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
}
