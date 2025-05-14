// editor/timeline/Timeline.js
import { BaseTimeline } from "./BaseTimeline.js";
import { MotionTimeline } from "./MotionTimeline.js";
import { LightTimeline } from "./LightTimeline.js";
import { AudioTimeline } from "./AudioTimeline.js";

class Timeline {
  constructor(editor) {
    this.editor = editor;

    // 기본 타임라인 설정을 먼저 초기화
    this.defaultSettings = {
      totalSeconds: 180,
      framesPerSecond: 30,
      currentFrame: 0,
    };

    // Scene이 있으면 해당 설정을 사용, 없으면 기본 설정 사용
    this.timelineSettings =
      this.editor.scene?.userData?.timeline || this.defaultSettings;

    // container는 timelineSettings 초기화 후에 생성
    this.container = this.createMainContainer();

    // 타임라인 상단 눈금 및 플레이헤드 생성
    this.createTimeRuler();
    this.createPlayhead();

    // 각 타임라인 인스턴스 생성
    this.timelines = {
      motion: new MotionTimeline(editor, this.timelineSettings),
      light: new LightTimeline(editor, this.timelineSettings),
      audio: new AudioTimeline(editor, this.timelineSettings),
    };

    this.activeTimeline = "motion";
    this.initializeUI();
    this.bindEvents();
  }

  createMainContainer() {
    const c = document.createElement("div");
    c.id = "main-timeline";
    c.className = "main-timeline-container";
    c.innerHTML = `
      <div class="timeline-header">
        <div class="controls-container"></div>
        <div class="time-ruler-container"></div>
      </div>
      <div class="tab-buttons">
        <button class="tab-button active" data-timeline="motion">Motion</button>
        <button class="tab-button" data-timeline="light">Light</button>
        <button class="tab-button" data-timeline="audio">Audio</button>
      </div>
      <div class="timeline-body">
        <div class="timeline-viewport"></div>
      </div>
      <div class="timeline-footer">
        <div class="controls-container">
          <button class="play-button">▶</button>
          <button class="stop-button">■</button>
          <span class="time-display">00:00:00</span>
          <input type="number" class="frame-input" min="0" value="0">
          <span class="frame-total">/ ${
            this.timelineSettings.totalSeconds *
            this.timelineSettings.framesPerSecond
          }</span>
        </div>
      </div>
    `;
    return c;
  }

  initializeUI() {
    const viewport = this.container.querySelector(".timeline-viewport");
    // 이미 그룹이 있으면 추가하지 않음
    if (viewport.querySelector('.timeline-group[data-timeline="motion"]'))
      return;

    Object.entries(this.timelines).forEach(([key, timeline]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "timeline-group";
      wrapper.dataset.timeline = key;
      wrapper.appendChild(timeline.container);
      viewport.appendChild(wrapper);
    });

    // 장면이 있으면 키프레임 로드
    if (this.editor.scene?.userData?.keyframes) {
      this.loadKeyframesFromScene();
    }

    // 초기 액티브 타임라인 설정
    this.switchTimeline(this.activeTimeline);
  }

  loadKeyframesFromScene() {
    const scene = this.editor.scene;
    if (!scene?.userData?.keyframes) return;

    const keyframes = scene.userData.keyframes;

    // 모션 키프레임 로드
    Object.entries(keyframes).forEach(([objectId, frames]) => {
      frames.forEach((frame) => {
        if (frame.position || frame.rotation || frame.scale) {
          this.timelines.motion.addKeyframe(objectId, frame);
        }
        if (frame.intensity || frame.color) {
          this.timelines.light.addKeyframe(objectId, frame);
        }
      });
    });

    // 오디오 데이터 로드
    if (scene.userData.music) {
      this.timelines.audio.loadAudioData(scene.userData.music);
    }
  }

  bindEvents() {
    // 탭 전환 이벤트 개선
    this.container.querySelectorAll(".tab-button").forEach((tab) => {
      tab.addEventListener("click", () => {
        // 먼저 모든 탭 버튼에서 active 클래스 제거
        this.container.querySelectorAll(".tab-button").forEach((btn) => {
          btn.classList.remove("active");
        });
        // 클릭된 탭에만 active 클래스 추가
        tab.classList.add("active");
        this.switchTimeline(tab.dataset.timeline);
      });
    });

    // 재생 컨트롤 이벤트
    const playButton = this.container.querySelector(".play-button");
    const stopButton = this.container.querySelector(".stop-button");
    const frameInput = this.container.querySelector(".frame-input");

    if (playButton) {
      playButton.addEventListener("click", () => this.play());
    }
    if (stopButton) {
      stopButton.addEventListener("click", () => this.stop());
    }
    if (frameInput) {
      frameInput.addEventListener("change", (e) => {
        this.setCurrentFrame(parseInt(e.target.value));
      });
    }

    // 플레이헤드 드래그 & 눈금 클릭 처리
    const ruler = this.container.querySelector(".time-ruler-container");
    const playhead = this.container.querySelector(".playhead");
    if (ruler && playhead) {
      let dragging = false;

      playhead.addEventListener("mousedown", (e) => {
        e.preventDefault();
        dragging = true;
      });

      document.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const rect = ruler.getBoundingClientRect();
        let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;
        const totalFrames =
          this.timelineSettings.totalSeconds *
          this.timelineSettings.framesPerSecond;
        const frame = Math.round(percent * totalFrames);

        // 현재 프레임 업데이트
        this.setCurrentFrame(frame);

        // 플레이헤드 위치 업데이트
        this.updatePlayheadPosition(percent * 100);
      });

      document.addEventListener("mouseup", () => {
        dragging = false;
      });

      ruler.addEventListener("click", (e) => {
        if (e.target === playhead) return;
        const rect = ruler.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(x, rect.width)) / rect.width;
        const totalFrames =
          this.timelineSettings.totalSeconds *
          this.timelineSettings.framesPerSecond;
        const frame = Math.round(percent * totalFrames);

        // 현재 프레임 업데이트
        this.setCurrentFrame(frame);

        // 플레이헤드 위치 업데이트
        this.updatePlayheadPosition(percent * 100);
      });
    }

    // Editor 시그널이 존재하는 경우에만 바인딩
    if (this.editor.signals) {
      // 씬 변경 감지
      if (this.editor.signals.sceneChanged) {
        this.editor.signals.sceneChanged.add(() => {
          this.onSceneChanged();
        });
      }

      // 프레임 변경 감지
      if (this.editor.signals.frameChanged) {
        this.editor.signals.frameChanged.add((frame) => {
          this.updateTimeDisplay(frame);
          this.updateAllTimelines(frame);
        });
      }
    }
  }

  onSceneChanged() {
    const scene = this.editor.scene;
    if (!scene) return;

    // 타임라인 설정 업데이트
    const timelineSettings = scene.userData.timeline;
    Object.values(this.timelines).forEach((timeline) => {
      timeline.updateSettings({
        totalSeconds: timelineSettings.totalSeconds,
        framesPerSecond: timelineSettings.framesPerSecond,
      });
    });

    // 키프레임 데이터 리로드
    this.loadKeyframesFromScene();

    // 프레임 정보 표시 업데이트
    const frameTotal = this.container.querySelector(".frame-total");
    if (frameTotal) {
      frameTotal.textContent = `/ ${
        timelineSettings.totalSeconds * timelineSettings.framesPerSecond
      }`;
    }
  }

  updateTimeDisplay(frame) {
    const scene = this.editor.currentScene;
    const fps = scene.userData.timeline.framesPerSecond;
    const seconds = Math.floor(frame / fps);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const timeDisplay = this.container.querySelector(".time-display");
    timeDisplay.textContent = `${hours.toString().padStart(2, "0")}:${(
      minutes % 60
    )
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

    const frameInput = this.container.querySelector(".frame-input");
    frameInput.value = frame;

    // 플레이헤드 위치 업데이트
    const totalFrames =
      this.timelineSettings.totalSeconds *
      this.timelineSettings.framesPerSecond;
    const percent = (frame / totalFrames) * 100;
    this.updatePlayheadPosition(percent);
  }

  updateAllTimelines(frame) {
    Object.values(this.timelines).forEach((timeline) => {
      timeline.updateFrame(frame);
    });
  }

  switchTimeline(type) {
    // 모든 타임라인 그룹 숨기기
    this.container.querySelectorAll(".timeline-group").forEach((group) => {
      group.classList.remove("active");
    });

    // 선택된 타임라인만 표시
    const activeGroup = this.container.querySelector(
      `.timeline-group[data-timeline="${type}"]`,
    );
    if (activeGroup) {
      activeGroup.classList.add("active");
    }

    this.activeTimeline = type;
  }

  play() {
    if (!this.editor.scene) return;

    this.editor.scene.userData.timeline.isPlaying = true;
    Object.values(this.timelines).forEach((timeline) => timeline.play());
    if (this.editor.signals?.timelineChanged) {
      this.editor.signals.timelineChanged.dispatch();
    }
  }

  pause() {
    if (!this.editor.scene) return;

    this.editor.scene.userData.timeline.isPlaying = false;
    Object.values(this.timelines).forEach((timeline) => timeline.pause());
    if (this.editor.signals?.timelineChanged) {
      this.editor.signals.timelineChanged.dispatch();
    }
  }

  stop() {
    if (!this.editor.scene) return;

    this.editor.scene.userData.timeline.isPlaying = false;
    this.editor.scene.userData.timeline.currentFrame = 0;
    Object.values(this.timelines).forEach((timeline) => timeline.stop());
    if (this.editor.signals?.timelineChanged) {
      this.editor.signals.timelineChanged.dispatch();
    }
  }

  setCurrentFrame(frame) {
    if (!this.editor.scene) return;

    // scene.userData.timeline이 없으면 초기화
    if (!this.editor.scene.userData.timeline) {
      this.editor.scene.userData.timeline = {
        ...this.timelineSettings,
        currentFrame: 0,
        isPlaying: false,
      };
    }

    this.editor.scene.userData.timeline.currentFrame = frame;
    console.log(this.editor.scene.userData.timeline);
    this.updateAllTimelines(frame);
    if (this.editor.signals?.frameChanged) {
      this.editor.signals.frameChanged.dispatch(frame);
    }
  }

  createTimeRuler() {
    const ruler = this.container.querySelector(".time-ruler-container");
    ruler.innerHTML = "";
    const totalFrames =
      this.timelineSettings.totalSeconds *
      this.timelineSettings.framesPerSecond;
    const intervalSec = 5;
    for (
      let sec = 0;
      sec <= this.timelineSettings.totalSeconds;
      sec += intervalSec
    ) {
      const frame = sec * this.timelineSettings.framesPerSecond;
      const tick = document.createElement("div");
      tick.className = "time-tick major";
      tick.style.left = (frame / totalFrames) * 100 + "%";

      const label = document.createElement("div");
      label.className = "time-label";
      label.textContent = this.formatTime(sec);
      tick.appendChild(label);

      ruler.appendChild(tick);
    }
  }

  createPlayhead() {
    // 타임라인 눈금에 플레이헤드 추가
    const ruler = this.container.querySelector(".time-ruler-container");
    const ph = document.createElement("div");
    ph.className = "playhead";
    ph.style.left = "0%";
    ruler.appendChild(ph);

    // 타임라인 뷰포트에도 플레이헤드 추가
    const viewport = this.container.querySelector(".timeline-viewport");
    const viewportPh = document.createElement("div");
    viewportPh.className = "playhead";
    viewportPh.style.left = "0%";
    viewport.appendChild(viewportPh);

    // 플레이헤드 위치 업데이트 함수
    const updatePlayheadPosition = (percent) => {
      const rulerRect = ruler.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();

      // 룰러의 플레이헤드 위치 업데이트
      ph.style.left = `${percent}%`;

      // 뷰포트의 플레이헤드 위치 계산
      const rulerLeft = rulerRect.left;
      const viewportLeft = viewportRect.left;
      const offset = rulerLeft - viewportLeft;
      const viewportPercent =
        (((rulerRect.width * percent) / 100 + offset) / viewportRect.width) *
        100;
      viewportPh.style.left = `${viewportPercent}%`;
    };

    // 플레이헤드 드래그 이벤트
    let dragging = false;
    ph.addEventListener("mousedown", (e) => {
      e.preventDefault();
      dragging = true;
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const rect = ruler.getBoundingClientRect();
      let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      updatePlayheadPosition(percent);
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
    });

    // 플레이헤드 위치 업데이트 메서드 추가
    this.updatePlayheadPosition = updatePlayheadPosition;
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600),
      m = Math.floor((seconds % 3600) / 60),
      s = Math.floor(seconds % 60);
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  }
}

export { Timeline };
