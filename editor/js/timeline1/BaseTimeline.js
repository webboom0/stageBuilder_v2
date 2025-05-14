class BaseTimeline {
  constructor(editor, options = {}) {
    this.editor = editor;
    this.options = {
      totalSeconds: 180,
      framesPerSecond: 30,
      trackHeight: 30,
      ...options,
    };

    this.container = this.createContainer();
    this.tracks = new Map();
    this.currentFrame = 0;
  }

  createContainer() {
    const container = document.createElement("div");
    container.className = "timeline-container";

    container.innerHTML = `
            <div class="timeline-content">
                <div class="timeline-tracks"></div>
            </div>
        `;

    return container;
  }

  addTrack(objectId, options = {}) {
    if (this.tracks.has(objectId)) {
      console.warn("Track already exists for this object");
      return null;
    }

    const trackData = {
      objectId: objectId,
      element: this.createTrackElement(options),
      keyframes: {},
      options: options,
    };

    this.tracks.set(objectId, trackData);
    this.container
      .querySelector(".timeline-tracks")
      .appendChild(trackData.element);

    return trackData;
  }

  createTrackElement(options) {
    const trackElement = document.createElement("div");
    trackElement.className = "timeline-track";
    trackElement.dataset.trackId = options.objectId || options.name || "";

    // 1) 트랙 헤더
    const header = document.createElement("div");
    header.className = "track-header";
    header.innerHTML = `
      <div class="track-name">${options.name || options.objectId}</div>
      <div class="track-controls">
        <button class="track-toggle">▼</button>
        <button class="track-lock">🔒</button>
      </div>`;
    trackElement.appendChild(header);

    // 2) 프로퍼티 컨테이너 (속성별 헤더 + 키프레임 스크롤)
    const propsContainer = document.createElement("div");
    propsContainer.className = "properties-container";
    propsContainer.style.display = "none";
    if (Array.isArray(options.properties)) {
      options.properties.forEach((prop) => {
        const propHeader = document.createElement("div");
        propHeader.className = "property-header";
        propHeader.textContent = prop;
        propsContainer.appendChild(propHeader);
      });
    }
    trackElement.appendChild(propsContainer);

    // 3) 키프레임 레이어
    const keyArea = document.createElement("div");
    keyArea.className = "track-keyframes";
    trackElement.appendChild(keyArea);

    // --- edit: 토글 버튼에 실제 열림/닫힘 이벤트 바인딩 ---
    const toggleBtn = trackElement.querySelector(".track-toggle");
    toggleBtn.addEventListener("click", () => {
      const isOpen =
        propsContainer.style.display === "" ||
        propsContainer.style.display === "block";
      // props, keyframes 영역 숨김 처리
      propsContainer.style.display = isOpen ? "none" : "block";
      keyArea.style.display = isOpen ? "none" : "block";
      // 버튼 텍스트 토글
      toggleBtn.textContent = isOpen ? "▲" : "▼";
    });
    // --- end edit ---

    return trackElement;
  }

  bindTrackEvents(objectId) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const keyframeArea = track.element.querySelector(".track-keyframes");

    // 키프레임 영역 클릭 이벤트
    keyframeArea.addEventListener("click", (e) => {
      const rect = keyframeArea.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const totalWidth = rect.width;

      // 클릭 위치를 프레임으로 변환
      const totalFrames =
        this.options.totalSeconds * this.options.framesPerSecond;
      const frame = Math.round((x / totalWidth) * totalFrames);

      this.addKeyframe(objectId, frame);
    });
  }

  addKeyframe(objectId, frame) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    // 키프레임 요소 생성
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${
      (frame / (this.options.totalSeconds * this.options.framesPerSecond)) * 100
    }%`;

    // 키프레임을 트랙에 추가
    track.element
      .querySelector(".track-keyframes")
      .appendChild(keyframeElement);

    // 키프레임 데이터 저장
    track.keyframes.set(frame, {
      element: keyframeElement,
      value: this.getCurrentValue(objectId),
    });
  }

  getCurrentValue(objectId) {
    // 하위 클래스에서 구현
    return null;
  }

  removeTrack(trackId) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.element.remove();
      this.tracks.delete(trackId);
    }
  }

  updateFrame(frame) {
    this.currentFrame = frame;
    this.tracks.forEach((track) => track.updateFrame(frame));
  }

  play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  stop() {
    this.isPlaying = false;
    this.currentFrame = 0;
    this.updateFrame(0);
  }

  updateSettings(settings) {
    this.options = {
      ...this.options,
      ...settings,
    };
    this.tracks.forEach((track) => track.updateSettings(this.options));
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

export { BaseTimeline, Track };
