export class BaseTimeline {
  constructor(editor, options) {
    this.editor = editor;
    this.options = options;
    this.tracks = new Map();
    this.container = this.createContainer();
    this.selectedKeyframe = null;
    this.selectedTrack = null;
    this.selectedSprite = null;
    this.isPlaying = false;
    this.currentFrame = 0;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.frameDuration = 1000 / options.framesPerSecond;
    this.keyframeOffsets = new Map();
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
        <span class="track-name">${
          typeof objectName === "object"
            ? objectName.name || "Object"
            : objectName
        }</span>
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
    propertyHeader.innerHTML = `
      <span>${this.formatPropertyName(propertyType)}</span>
      <button class="add-keyframe-btn" title="Add Keyframe">+</button>
    `;

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
    track.element.dataset.objectId = objectId;

    const trackTopArea = document.createElement("div");
    trackTopArea.className = "timeline-tracks";
    trackTopArea.appendChild(this.createTrackHeader(objectId, objectName));

    const trackContent = document.createElement("div");
    trackContent.className = "track-content";
    trackTopArea.appendChild(trackContent);

    track.element.appendChild(trackTopArea);

    const propertyTracksContainer = document.createElement("div");
    propertyTracksContainer.className = "property-tracks";
    track.element.appendChild(propertyTracksContainer);

    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);

    this.bindTrackEvents(track);
    return track;
  }

  addKeyframe(objectId, propertyType, frame) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    if (!this.isWithinClipRange(track, frame)) {
      console.warn("키프레임은 클립 범위 내에만 추가할 수 있습니다.");
      return;
    }

    const keyframeElement = this.createKeyframeElement(frame);
    const value = this.getPropertyValue(object, propertyType);

    if (!track.keyframes[propertyType]) {
      track.keyframes[propertyType] = new Map();
    }

    track.keyframes[propertyType].set(frame, {
      element: keyframeElement,
      value: value,
      time: frame / this.options.framesPerSecond,
    });

    this.addKeyframeToTrack(track, propertyType, keyframeElement);
    this.makeKeyframeDraggable(
      keyframeElement,
      track,
      propertyType,
      frame,
      object
    );
    this.bindKeyframeEvents(keyframeElement, objectId, propertyType, frame);
  }

  createKeyframeElement(frame) {
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${
      (frame / (this.options.totalSeconds * this.options.framesPerSecond)) * 100
    }%`;
    return keyframeElement;
  }

  addKeyframeToTrack(track, propertyType, keyframeElement) {
    const container = track.element.querySelector(
      `[data-property="${propertyType}"] .keyframe-layer`
    );
    if (container) {
      container.appendChild(keyframeElement);
    }
  }

  bindTrackEvents(track) {
    const addBtn = track.element.querySelector(".add-keyframe-btn");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentFrame = this.currentFrame;
        this.addKeyframe(track.objectId, "default", currentFrame);
      });
    }

    track.element.querySelectorAll(".keyframe-layer").forEach((layer) => {
      layer.addEventListener("click", (e) => {
        const propertyTrack = e.target.closest(".property-track");
        const propertyType = propertyTrack.dataset.property;
        const rect = layer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const frame = Math.round(
          (x / rect.width) *
            this.options.totalSeconds *
            this.options.framesPerSecond
        );
        this.addKeyframe(track.objectId, propertyType, frame);
      });
    });
  }

  bindKeyframeEvents(keyframeElement, objectId, propertyType, frame) {
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectKeyframe(objectId, propertyType, frame, keyframeElement);
    });

    keyframeElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showKeyframeContextMenu(
        e,
        objectId,
        propertyType,
        frame,
        keyframeElement
      );
    });
  }

  bindSpriteEvents(sprite, track) {
    let isDragging = false;
    let isResizing = false;
    let startX = 0;
    let startLeft = 0;
    let startWidth = 0;
    let resizeHandle = null;

    sprite.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("sprite-handle")) {
        isResizing = true;
        resizeHandle = e.target;
      } else {
        isDragging = true;
        this.saveKeyframeOffsets(track, sprite);
      }
      startX = e.clientX;
      startLeft = parseFloat(sprite.style.left) || 0;
      startWidth = parseFloat(sprite.style.width) || 100;
      this.selectSprite(sprite, track);
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging && !isResizing) return;

      const dx = e.clientX - startX;
      const trackWidth = sprite.parentElement.offsetWidth;
      const pxToPercent = (px) => (px / trackWidth) * 100;

      if (isResizing) {
        this.handleSpriteResize(
          e,
          sprite,
          track,
          resizeHandle,
          startLeft,
          startWidth,
          pxToPercent
        );
      } else if (isDragging) {
        this.handleSpriteDrag(
          e,
          sprite,
          track,
          startLeft,
          startWidth,
          pxToPercent
        );
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      isResizing = false;
      this.keyframeOffsets.clear();
      this.updateKeyframeLimits(track, sprite);
    });
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

  getPropertyValue(object, propertyType) {
    throw new Error("getPropertyValue must be implemented by child class");
  }

  updateFrame(frame) {
    throw new Error("updateFrame must be implemented by child class");
  }

  isWithinClipRange(track, frame) {
    throw new Error("isWithinClipRange must be implemented by child class");
  }

  saveKeyframeOffsets(track, sprite) {
    this.keyframeOffsets.clear();
    Object.keys(track.keyframes).forEach((propertyType) => {
      const keyframes = track.keyframes[propertyType];
      if (!keyframes) return;

      const keyframeElements = track.element.querySelectorAll(
        `[data-property="${propertyType}"] .keyframe`
      );

      keyframeElements.forEach((element) => {
        const left = parseFloat(element.style.left);
        const clipLeft = parseFloat(sprite.style.left);
        const offset = left - clipLeft;
        this.keyframeOffsets.set(element, offset);
      });
    });
  }

  handleSpriteResize(
    e,
    sprite,
    track,
    resizeHandle,
    startLeft,
    startWidth,
    pxToPercent
  ) {
    const dx = e.clientX - startX;
    if (resizeHandle.classList.contains("left")) {
      const newLeft = Math.max(0, Math.min(100, startLeft + pxToPercent(dx)));
      const newWidth = startWidth - (newLeft - startLeft);
      sprite.style.left = `${newLeft}%`;
      sprite.style.width = `${newWidth}%`;
    } else {
      const newWidth = Math.max(10, startWidth + pxToPercent(dx));
      sprite.style.width = `${newWidth}%`;
    }
    this.updateKeyframeLimits(track, sprite);
  }

  handleSpriteDrag(e, sprite, track, startLeft, startWidth, pxToPercent) {
    const dx = e.clientX - startX;
    const newLeft = Math.max(
      0,
      Math.min(100 - startWidth, startLeft + pxToPercent(dx))
    );
    sprite.style.left = `${newLeft}%`;
    this.moveKeyframesWithSprite(track, newLeft, sprite);
  }

  moveKeyframesWithSprite(track, newLeft, sprite) {
    Object.keys(track.keyframes).forEach((propertyType) => {
      const keyframes = track.keyframes[propertyType];
      if (!keyframes) return;

      const keyframeElements = track.element.querySelectorAll(
        `[data-property="${propertyType}"] .keyframe`
      );

      keyframeElements.forEach((element) => {
        const offset = this.keyframeOffsets.get(element);
        if (offset !== undefined) {
          const newKeyframeLeft = newLeft + offset;
          if (
            newKeyframeLeft >= newLeft &&
            newKeyframeLeft <= newLeft + parseFloat(sprite.style.width)
          ) {
            this.updateKeyframePosition(
              track,
              propertyType,
              element,
              newKeyframeLeft,
              sprite
            );
          }
        }
      });
    });
  }

  updateKeyframePosition(track, propertyType, element, newLeft, sprite) {
    const oldFrame = Math.round(
      (parseFloat(element.dataset.left || "0") / 100) *
        this.options.totalSeconds *
        this.options.framesPerSecond
    );
    const newFrame = Math.round(
      (newLeft / 100) * this.options.totalSeconds * this.options.framesPerSecond
    );

    if (oldFrame !== newFrame) {
      const keyframeData = track.keyframes[propertyType].get(oldFrame);
      if (keyframeData) {
        track.keyframes[propertyType].delete(oldFrame);
        track.keyframes[propertyType].set(newFrame, {
          ...keyframeData,
          time: newFrame / this.options.framesPerSecond,
        });
        element.dataset.left = newLeft.toString();
      }
    }

    // 클립 범위 체크
    if (sprite) {
      const clipDuration = parseFloat(sprite.dataset.duration);
      const maxFrame = Math.floor(clipDuration * this.options.framesPerSecond);
      const maxLeft =
        (maxFrame /
          (this.options.totalSeconds * this.options.framesPerSecond)) *
        100;
      const clipLeft = parseFloat(sprite.style.left);
      const clipWidth = parseFloat(sprite.style.width);

      // 클립 범위를 벗어나면 드래그 중지
      if (newLeft < clipLeft || newLeft > clipLeft + clipWidth) {
        return;
      }
    }

    // 선택된 키프레임이 이동한 경우 선택 상태 업데이트
    if (
      this.selectedKeyframe &&
      this.selectedKeyframe.objectId === track.objectId &&
      this.selectedKeyframe.propertyType === propertyType &&
      this.selectedKeyframe.frame === oldFrame
    ) {
      this.selectedKeyframe.frame = newFrame;
    }

    // 씬 업데이트
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(sprite);
    }
  }

  updateKeyframeLimits(track, sprite) {
    const clipLeft = parseFloat(sprite.style.left);
    const clipWidth = parseFloat(sprite.style.width);

    Object.keys(track.keyframes).forEach((propertyType) => {
      const keyframes = track.keyframes[propertyType];
      if (!keyframes) return;

      const keyframeElements = track.element.querySelectorAll(
        `[data-property="${propertyType}"] .keyframe`
      );

      keyframeElements.forEach((element) => {
        const left = parseFloat(element.style.left);
        if (left < clipLeft || left > clipLeft + clipWidth) {
          const frame = Math.round(
            (left / 100) *
              this.options.totalSeconds *
              this.options.framesPerSecond
          );
          keyframes.delete(frame);
          element.remove();
        } else {
          element.dataset.left = left.toString();
        }
      });
    });

    if (this.editor.signals?.sceneGraphChanged) {
      this.editor.signals.sceneGraphChanged.dispatch();
    }
  }

  // makeKeyframeDraggable(keyframeElement, track, propertyType, frame, object) {
  //   let isDragging = false;
  //   let startX;
  //   let startLeft;

  //   keyframeElement.addEventListener("mousedown", (e) => {
  //     isDragging = true;
  //     startX = e.clientX;
  //     startLeft = parseFloat(keyframeElement.style.left);
  //     e.stopPropagation();
  //   });

  //   document.addEventListener("mousemove", (e) => {
  //     if (!isDragging) return;

  //     const dx = e.clientX - startX;
  //     const totalWidth = keyframeElement.parentElement.offsetWidth;
  //     const newLeft = Math.max(
  //       0,
  //       Math.min(100, startLeft + (dx / totalWidth) * 100)
  //     );

  //     // 클립 범위 체크
  //     const sprite = track.element.querySelector(
  //       ".animation-sprite, .audio-sprite"
  //     );
  //     if (sprite) {
  //       const clipDuration = parseFloat(sprite.dataset.duration);
  //       const maxFrame = Math.floor(
  //         clipDuration * this.options.framesPerSecond
  //       );
  //       const maxLeft =
  //         (maxFrame /
  //           (this.options.totalSeconds * this.options.framesPerSecond)) *
  //         100;
  //       const clipLeft = parseFloat(sprite.style.left);
  //       const clipWidth = parseFloat(sprite.style.width);

  //       // 클립 범위를 벗어나면 드래그 중지
  //       if (newLeft < clipLeft || newLeft > clipLeft + clipWidth) {
  //         return;
  //       }
  //     }

  //     keyframeElement.style.left = `${newLeft}%`;

  //     // 프레임 위치 업데이트
  //     const newFrame = Math.round(
  //       (newLeft / 100) *
  //         this.options.totalSeconds *
  //         this.options.framesPerSecond
  //     );
  //     this.updateKeyframePosition(track, propertyType, frame, newFrame, object);
  //   });

  //   document.addEventListener("mouseup", () => {
  //     isDragging = false;
  //   });
  // }

  makeKeyframeDraggable(keyframeElement, track, frame, object) {
    let isDragging = false;
    let startX;
    let startPixelPosition;

    keyframeElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startPixelPosition = parseFloat(keyframeElement.dataset.pixelPosition);

      // 드래그 시작할 때 키프레임 선택
      this.selectKeyframe(track.objectId, frame, keyframeElement);

      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const sprite = keyframeElement.closest(".animation-sprite");
      if (!sprite) return;

      const spriteRect = sprite.getBoundingClientRect();
      const dx = e.clientX - startX;
      const newPixelPosition = Math.max(
        0,
        Math.min(spriteRect.width, startPixelPosition + dx)
      );

      // 픽셀 단위로 위치 설정
      keyframeElement.style.left = `${newPixelPosition}px`;
      keyframeElement.dataset.pixelPosition = newPixelPosition.toString();

      // 프레임 위치 업데이트
      const newFrame = Math.round(
        (newPixelPosition / spriteRect.width) *
          this.options.totalSeconds *
          this.options.framesPerSecond
      );
      keyframeElement.dataset.frame = newFrame.toString();

      // 키프레임 데이터 업데이트
      this.updateKeyframePosition(
        track,
        frame,
        newFrame,
        object,
        newPixelPosition
      );
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
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
        parseInt(keyframe.dataset.frame) === frame
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
