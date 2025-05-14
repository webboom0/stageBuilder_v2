// editor/timeline/MotionTimeline.js
import { UIPanel, UIRow } from "../libs/ui.js";

class MotionTimeline {
  constructor(editor) {
    this.editor = editor;
    this.container = new UIPanel();
    this.container.setId("motion-timeline");

    this.settings = {
      duration: 180,
      fps: 30,
      pixelsPerSecond: 100, // 타임라인 스케일
      trackHeight: 30,
    };

    this.state = {
      currentFrame: 0,
      isPlaying: false,
      selectedKeyframes: new Set(),
      selectedTrack: null,
    };

    this.initializeUI();
  }

  initializeUI() {
    // 타임라인 메인 레이아웃
    this.layout = {
      header: this.createHeader(),
      sidebar: this.createSidebar(),
      timelineArea: this.createTimelineArea(),
      controls: this.createPlaybackControls(),
    };

    // 레이아웃 조립
    this.container.add(this.layout.header);

    const mainArea = new UIPanel();
    mainArea.setClass("timeline-main-area");
    mainArea.add(this.layout.sidebar);
    mainArea.add(this.layout.timelineArea);

    this.container.add(mainArea);
    this.container.add(this.layout.controls);
  }

  createHeader() {
    const header = new UIPanel();
    header.setClass("timeline-header");

    // 시간 표시 눈금
    const timeRuler = this.createTimeRuler();
    header.add(timeRuler);

    return header;
  }

  createSidebar() {
    const sidebar = new UIPanel();
    sidebar.setClass("timeline-sidebar");

    // 트랙 이름과 속성 컨트롤
    const trackControls = new UIPanel();
    trackControls.setClass("track-controls");

    // 트랙 접기/펼치기 토글
    const toggleButton = document.createElement("button");
    toggleButton.innerHTML = "▶";
    trackControls.dom.appendChild(toggleButton);

    // 트랙 이름
    const trackName = document.createElement("span");
    trackName.textContent = "Position";
    trackControls.dom.appendChild(trackName);

    sidebar.add(trackControls);

    return sidebar;
  }

  createTimelineArea() {
    const timelineArea = new UIPanel();
    timelineArea.setClass("timeline-area");

    // 키프레임 영역
    this.keyframeArea = new UIPanel();
    this.keyframeArea.setClass("keyframe-area");

    // 키프레임 그리드
    this.createKeyframeGrid();

    // 플레이헤드
    this.playhead = document.createElement("div");
    this.playhead.className = "playhead";
    this.keyframeArea.dom.appendChild(this.playhead);

    timelineArea.add(this.keyframeArea);

    return timelineArea;
  }

  createPlaybackControls() {
    const controls = new UIPanel();
    controls.setClass("playback-controls");

    // 재생 컨트롤 버튼들
    const buttons = [
      {
        icon: "◀◀",
        action: () => this.jumpToStart(),
        tooltip: "Jump to Start",
      },
      { icon: "▶", action: () => this.play(), tooltip: "Play" },
      { icon: "■", action: () => this.stop(), tooltip: "Stop" },
      { icon: "●", action: () => this.addKeyframe(), tooltip: "Add Keyframe" },
    ];

    buttons.forEach((btn) => {
      const button = document.createElement("button");
      button.innerHTML = btn.icon;
      button.title = btn.tooltip;
      button.addEventListener("click", btn.action.bind(this));
      controls.dom.appendChild(button);
    });

    // 현재 시간/프레임 표시
    this.timeDisplay = document.createElement("div");
    this.timeDisplay.className = "time-display";
    controls.dom.appendChild(this.timeDisplay);

    return controls;
  }

  // 키프레임 관리
  addKeyframe(object, time = this.state.currentFrame) {
    const position = object.position.clone();
    const rotation = object.rotation.clone();
    const scale = object.scale.clone();

    const keyframe = {
      time: time,
      position: position,
      rotation: rotation,
      scale: scale,
    };

    // 키프레임 UI 요소 생성
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe-marker";
    keyframeElement.style.left = `${this.timeToPixels(time)}px`;

    // 드래그 기능 추가
    this.makeKeyframeDraggable(keyframeElement, keyframe);

    this.keyframeArea.dom.appendChild(keyframeElement);
  }

  // 유틸리티 메서드
  timeToPixels(time) {
    return time * this.settings.pixelsPerSecond;
  }

  pixelsToTime(pixels) {
    return pixels / this.settings.pixelsPerSecond;
  }

  makeKeyframeDraggable(element, keyframe) {
    element.addEventListener("mousedown", (e) => {
      const startX = e.clientX;
      const originalLeft = parseInt(element.style.left);

      const onMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newLeft = originalLeft + deltaX;
        element.style.left = `${newLeft}px`;

        // 키프레임 시간 업데이트
        keyframe.time = this.pixelsToTime(newLeft);
        this.updateAnimation();
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }
}
