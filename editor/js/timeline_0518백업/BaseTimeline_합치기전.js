export class BaseTimeline {
  constructor(editor, options) {
    this.editor = editor;
    this.options = options;
    this.tracks = new Map();
    this.container = this.createContainer();
    this.selectedKeyframe = null;
    this.selectedTrack = null;
    this.isPlaying = false;
    this.currentFrame = 0;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.frameDuration = 1000 / options.framesPerSecond;
  }

  createContainer() {
    const container = document.createElement("div");
    container.className = "timeline-container";
    return container;
  }

  createTrackHeader(objectId, objectName) {
    const header = document.createElement("div");
    header.className = "track-header";
    header.innerHTML = `
      <div class="track-info">
        <span class="track-name">${objectName}</span>
      </div>
      <div class="track-controls">
        <button class="add-keyframe-btn" title="Add Keyframe">+</button>
      </div>
    `;
    return header;
  }

  createPropertyTrack(objectId, propertyType) {
    const propertyTrack = document.createElement("div");
    propertyTrack.className = "property-track";
    propertyTrack.dataset.objectId = objectId;
    propertyTrack.dataset.property = propertyType;

    const propertyHeader = document.createElement("div");
    propertyHeader.className = "property-header";
    propertyHeader.textContent = this.formatPropertyName(propertyType);

    const keyframesContainer = document.createElement("div");
    keyframesContainer.className = "property-keyframes-scroll";

    const keyframesArea = document.createElement("div");
    keyframesArea.className = "property-keyframes";

    const keyframeLayer = document.createElement("div");
    keyframeLayer.className = "keyframe-layer";

    keyframesArea.appendChild(keyframeLayer);
    keyframesContainer.appendChild(keyframesArea);

    propertyTrack.appendChild(propertyHeader);
    propertyTrack.appendChild(keyframesContainer);

    return propertyTrack;
  }

  formatPropertyName(propertyType) {
    return propertyType.charAt(0).toUpperCase() + propertyType.slice(1);
  }

  addTrack(objectId, objectName) {
    if (this.tracks.has(objectId)) return;

    const track = {
      element: document.createElement("div"),
      keyframes: {},
      objectId: objectId,
      objectName: objectName,
    };

    track.element.className = "timeline-track";
    track.element.appendChild(this.createTrackHeader(objectId, objectName));

    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);
  }

  addKeyframe(objectId, propertyType, frame) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${
      (frame / (this.options.totalSeconds * this.options.framesPerSecond)) * 100
    }%`;

    let value = this.getPropertyValue(object, propertyType);
    if (!value) return;

    if (!track.keyframes[propertyType]) {
      track.keyframes[propertyType] = new Map();
    }

    track.keyframes[propertyType].set(frame, {
      element: keyframeElement,
      value: value,
      time: frame / this.options.framesPerSecond,
    });

    const container = track.element.querySelector(
      `[data-property="${propertyType}"] .keyframe-layer`,
    );
    if (container) {
      container.appendChild(keyframeElement);
    }

    this.makeKeyframeDraggable(
      keyframeElement,
      track,
      propertyType,
      frame,
      object,
    );
    this.bindKeyframeEvents(keyframeElement, objectId, propertyType, frame);
  }

  getPropertyValue(object, propertyType) {
    switch (propertyType) {
      case "position":
        return object.position.clone();
      case "rotation":
        return object.rotation.clone();
      case "scale":
        return object.scale.clone();
      default:
        return null;
    }
  }

  makeKeyframeDraggable(keyframeElement, track, propertyType, frame, object) {
    let startX = 0;
    let startFrame = 0;
    let isDragging = false;

    keyframeElement.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      isDragging = true;
      startX = e.clientX;
      startFrame = frame;
      keyframeElement.style.zIndex = "1000";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const container = track.element.querySelector(
        `[data-property="${propertyType}"] .property-keyframes-scroll`,
      );
      const containerRect = container.getBoundingClientRect();
      const percent = deltaX / containerRect.width;
      const frameDelta = Math.round(
        percent * this.options.totalSeconds * this.options.framesPerSecond,
      );
      const newFrame = Math.max(
        0,
        Math.min(
          startFrame + frameDelta,
          this.options.totalSeconds * this.options.framesPerSecond,
        ),
      );

      keyframeElement.style.left = `${
        (newFrame /
          (this.options.totalSeconds * this.options.framesPerSecond)) *
        100
      }%`;
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      keyframeElement.style.zIndex = "";

      const container = track.element.querySelector(
        `[data-property="${propertyType}"] .property-keyframes-scroll`,
      );
      const containerRect = container.getBoundingClientRect();
      const keyframeRect = keyframeElement.getBoundingClientRect();
      const percent =
        (keyframeRect.left - containerRect.left) / containerRect.width;
      const newFrame = Math.round(
        percent * this.options.totalSeconds * this.options.framesPerSecond,
      );

      if (newFrame !== frame) {
        this.moveKeyframe(track, propertyType, frame, newFrame);
      }
    });
  }

  moveKeyframe(track, propertyType, oldFrame, newFrame) {
    const keyframes = track.keyframes[propertyType];
    if (!keyframes) return;

    const keyframe = keyframes.get(oldFrame);
    if (!keyframe) return;

    keyframes.delete(oldFrame);
    keyframes.set(newFrame, keyframe);
    keyframe.element.style.left = `${
      (newFrame / (this.options.totalSeconds * this.options.framesPerSecond)) *
      100
    }%`;
  }

  bindKeyframeEvents(keyframeElement, objectId, propertyType, frame) {
    console.log(
      "bindKeyframeEvents",
      keyframeElement,
      objectId,
      propertyType,
      frame,
    );
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectKeyframe(objectId, propertyType, frame, keyframeElement);
    });
  }

  selectKeyframe(objectId, propertyType, frame, element) {
    if (this.selectedKeyframe) {
      this.selectedKeyframe.element.classList.remove("selected");
    }
    this.selectedKeyframe = { objectId, propertyType, frame, element };
    element.classList.add("selected");
  }

  updateFrame(frame) {
    this.currentFrame = frame;
    this.updatePlayhead();
    this.updateKeyframes();
  }

  updatePlayhead() {
    const playhead = this.container.querySelector(".playhead");
    if (playhead) {
      playhead.style.left = `${
        (this.currentFrame /
          (this.options.totalSeconds * this.options.framesPerSecond)) *
        100
      }%`;
    }
  }

  updateKeyframes() {
    // 자식 클래스에서 구현
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  stop() {
    this.pause();
    this.currentFrame = 0;
    this.updateFrame(0);
  }

  animate() {
    if (!this.isPlaying) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= this.frameDuration) {
      const frameDelta = Math.floor(deltaTime / this.frameDuration);
      this.currentFrame =
        (this.currentFrame + frameDelta) %
        (this.options.totalSeconds * this.options.framesPerSecond);
      this.updateFrame(this.currentFrame);
      this.lastFrameTime = currentTime;
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  updateSettings(newSettings) {
    this.options = { ...this.options, ...newSettings };
    this.frameDuration = 1000 / this.options.framesPerSecond;
  }
}

// 공통으로 사용할 Track 클래스
class Track {
  constructor(options) {
    this.options = options;
    this.keyframes = new Map();
    this.element = this.createTrackElement();
  }

  createTrackElement() {
    const track = document.createElement("div");
    track.className = "timeline-track";

    // 트랙 헤더
    const header = document.createElement("div");
    header.className = "track-header";
    header.innerHTML = `
            <div class="track-name">${this.options.name}</div>
            <div class="track-controls">
                <button class="track-toggle">▼</button>
                <button class="track-lock">🔒</button>
            </div>
        `;

    // 키프레임 영역
    const keyframeArea = document.createElement("div");
    keyframeArea.className = "track-keyframes";

    track.appendChild(header);
    track.appendChild(keyframeArea);

    return track;
  }

  addKeyframe(frame, value) {
    const keyframe = {
      frame,
      value,
      element: this.createKeyframeElement(frame),
    };
    this.keyframes.set(frame, keyframe);
    return keyframe;
  }

  createKeyframeElement(frame) {
    const element = document.createElement("div");
    element.className = "keyframe";
    element.style.left = `${frame * this.options.frameWidth}px`;
    return element;
  }

  updateFrame(frame) {
    // 현재 프레임에 따른 트랙 업데이트
    this.element.querySelectorAll(".keyframe").forEach((keyframe) => {
      keyframe.classList.toggle(
        "current",
        parseInt(keyframe.dataset.frame) === frame,
      );
    });
  }

  updateSettings(options) {
    this.options = {
      ...this.options,
      ...options,
    };
    // 트랙 설정 업데이트에 따른 UI 갱신
    this.updateUI();
  }

  updateUI() {
    // 트랙 UI 업데이트 로직
    this.keyframes.forEach((keyframe, frame) => {
      keyframe.element.style.left = `${frame * this.options.frameWidth}px`;
    });
  }
}
