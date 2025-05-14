import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
// editor/timeline/AudioTimeline.js
export class AudioTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);
    this.initAudioTracks();
  }

  initAudioTracks() {
    // 오디오 관련 트랙 추가
    this.addTrack("audio", {
      name: "Audio Track",
      properties: ["volume"],
      interpolation: "linear",
      waveform: true,
    });
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
          ([a], [b]) => a - b,
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
            alpha,
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
      this.updatePropertyValue("volume", volumeNumber.getValue()),
    );
    volumeRow.add(volumeNumber);

    // 재생 속도 UI
    const playbackRateRow = new UIRow();
    playbackRateRow.add(new UIText("Playback Rate"));
    const playbackRateNumber = new UINumber(1).setRange(0.1, 2).setStep(0.1);
    playbackRateNumber.onChange(() =>
      this.updatePropertyValue("playbackRate", playbackRateNumber.getValue()),
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

    const propertyTracksContainer = document.createElement("div");
    propertyTracksContainer.className = "property-tracks";

    ["volume", "mute", "playbackRate"].forEach((propertyType) => {
      const propertyTrack = this.createPropertyTrack(objectId, propertyType);
      propertyTracksContainer.appendChild(propertyTrack);
    });

    track.element.appendChild(propertyTracksContainer);

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
}
