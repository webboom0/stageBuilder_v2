// editor/timeline/Timeline.js
import { UIPanel, UIRow, UINumber, UIText, UIButton } from "../libs/ui.js";
import { BaseTimeline } from "./BaseTimeline.js";
import { MotionTimeline } from "./MotionTimeline.js";
import { LightTimeline } from "./LightTimeline.js";
import { AudioTimeline } from "./AudioTimeline.js";
import { VideoTimeline } from "./VideoTimeline.js";
import { KeyboardShortcuts } from "./KeyboardShortcuts.js";
import * as TWEEN from "../../../examples/jsm/libs/tween.module.js";

class Timeline {
  constructor(editor) {
    this.editor = editor;

    // 기본 타임라인 설정을 먼저 초기화
    this.defaultSettings = {
      totalSeconds: 180,
      framesPerSecond: 30, // 60에서 30으로 변경하여 성능 향상
      currentFrame: 0,
    };

    // 타임라인 트랙 컨테이너 DOM 요소 찾기
    const trackContainer = document.querySelector(".timelineWrapper");
    console.log("trackContainer", trackContainer);
    if (trackContainer) {
      // 드래그 오버(드롭 허용)
      trackContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      // 드롭 이벤트(타임라인 트랙 추가)
      trackContainer.addEventListener("drop", (e) => {
        e.preventDefault();
        // const objectUuid = e.dataTransfer.getData("objectUuid");
        // const objectId = e.dataTransfer.getData("objectId");
        // const objectName = e.dataTransfer.getData("objectName");
        this.addTimelineTrack();
      });
    }
    // Scene이 있으면 해당 설정을 사용, 없으면 기본 설정 사용
    this.timelineSettings =
      this.editor.scene?.userData?.timeline || this.defaultSettings;

    // container는 timelineSettings 초기화 후에 생성
    this.container = this.createMainContainer();

    // addTrack 추가가
    this.container
      .querySelector(".timeline-header .controls-container")
      .prepend(this.createAddTimelineButton().dom);

    // 타임라인 상단 눈금 및 플레이헤드 생성
    this.createTimeRuler();
    this.createPlayhead();

    // 각 타임라인 인스턴스 생성 (한 번만)
    if (!this.timelines) {
      this.timelines = {
        motion: new MotionTimeline(editor, this.timelineSettings),
        light: new LightTimeline(editor, this.timelineSettings),
        audio: new AudioTimeline(editor, this.timelineSettings),
      };

      // MotionTimeline 인스턴스를 editor에 저장하여 전역적으로 접근 가능하도록 함
      editor.motionTimeline = this.timelines.motion;
    }

    this.activeTimeline = "motion";
    this.initializeUI();
    this.bindEvents();

    // 초기 상태 설정
    this.isPlaying = false;
    if (this.editor.scene?.userData?.timeline) {
      this.editor.scene.userData.timeline.isPlaying = false;
    } else if (this.editor.scene) {
      this.editor.scene.userData = {
        timeline: {
          isPlaying: false,
          currentFrame: 0,
          currentSeconds: 0
        }
      };
    }

    const controlsContainer = this.container.querySelector(
      ".controls-container"
    );
    const zoomSlider = document.createElement("input");
    zoomSlider.type = "range";
    zoomSlider.min = "0.5";
    zoomSlider.max = "2";
    zoomSlider.step = "0.1";
    zoomSlider.value = "1";
    zoomSlider.style.marginLeft = "10px";
    zoomSlider.style.width = "50px";
    // controlsContainer.appendChild(zoomSlider);  // 타임라인 줌 기능 비활성화

    zoomSlider.addEventListener("input", (e) => {
      const zoomLevel = parseFloat(e.target.value);

      // 타임라인 룰러와 트랙 크기 조정
      const timeRuler = this.container.querySelector(".time-ruler-container");
      const tracks = this.container.querySelectorAll(".timeline-track");

      // 1초 단위의 픽셀 크기 조정
      const basePixelPerSecond = 10; // 기본 1초당 10px
      const newPixelPerSecond = basePixelPerSecond * zoomLevel;

      timeRuler.style.width = `${newPixelPerSecond * this.timelineSettings.totalSeconds
        }px`;
      tracks.forEach((track) => {
        track.style.width = `${newPixelPerSecond * this.timelineSettings.totalSeconds
          }px`;

        // 클립 크기 조정
        const clips = track.querySelectorAll(".animation-sprite");
        clips.forEach((clip) => {
          const duration = parseFloat(clip.dataset.duration) || 0;
          clip.style.width = `${newPixelPerSecond * duration}px`;

          // 키프레임 위치 조정
          const keyframes = clip.querySelectorAll(".keyframe");
          keyframes.forEach((keyframe) => {
            const timeInSeconds = parseFloat(keyframe.dataset.time) || 0;
            const newLeft = newPixelPerSecond * timeInSeconds;
            keyframe.style.left = `${newLeft}px`;
          });
          console.log(`Clip width set to: ${clip.style.width}`);
          // 키프레임 업데이트
          // this.updateKeyframesInClip(track, clip);
        });
      });
    });

    this.container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const track = e.target.closest(".timeline-track");
      if (!track) return;

      const existingMenu = document.querySelector(".context-menu");
      if (existingMenu) {
        existingMenu.remove();
      }

      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.style.position = "absolute";
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.style.zIndex = "1000";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "트랙 삭제";
      deleteBtn.onclick = () => {
        const objectId = parseInt(track.dataset.objectId, 10);
        const objectUuid = track.dataset.uuid;
        console.log("트랙 삭제", { objectId, objectUuid });

        // MotionTimeline의 완전한 트랙 삭제 메서드 호출
        if (this.timelines.motion && objectUuid) {
          const removedCount = this.timelines.motion.removeTrackCompletely(objectUuid);
          console.log(`완전 삭제 완료: ${removedCount}개 트랙 제거됨`);
        } else {
          // 기존 방식으로 삭제 (하위 호환성)
          const wasDeleted = this.timelines.motion.timelineData.removeTrackById(objectId, 'position') ||
                            this.timelines.motion.timelineData.removeTrackById(objectId, 'rotation') ||
                            this.timelines.motion.timelineData.removeTrackById(objectId, 'scale');
          console.log(`기존 방식 삭제 성공 여부: ${wasDeleted}`);
          track.remove();
        }
        
        menu.remove();
        if (
          editor.selected &&
          editor.selected.uuid === track.dataset.objectId
        ) {
          editor.selected = null;
        }
      };

      menu.appendChild(deleteBtn);
      document.body.appendChild(menu);

      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      document.addEventListener("click", closeMenu);
    });
  }

  createMainContainer() {
    const c = document.createElement("div");
    c.id = "main-timeline";
    c.className = "main-timeline-container";
    c.innerHTML = `
    <div class="timeline-top-container">
      <div class="timeline-footer">
        <div class="controls-container">
          <span class="time-display">00:00:00</span>
          <input type="number" class="frame-input" min="0" value="0">
          <span class="frame-total">/ ${this.timelineSettings.totalSeconds *
      this.timelineSettings.framesPerSecond
      }</span>
        </div>
      </div>
      <div class="timeline-header">
        <div class="controls-container">
          <button class="play-button"><i class="fa fa-play"></i></button>
          <button class="stop-button"><i class="fa fa-stop"></i></button></div>
        <div class="time-ruler-container"></div>
      </div>
      
      <div class="tab-buttons">
        <button class="tab-button active" data-timeline="motion">Motion</button>
        <button class="tab-button" data-timeline="light">Light</button>
        <button class="tab-button" data-timeline="audio">Audio</button>
      </div>
      </div>
      <div class="timeline-body">
        <div class="timeline-viewport"></div>
      </div>
    
    `;
    return c;
  }

  initializeUI() {
    const viewport = this.container.querySelector(".timeline-viewport");

    // 이미 타임라인 그룹이 있는지 확인
    const existingGroups = viewport.querySelectorAll(".timeline-group");
    if (existingGroups.length > 0) {
      console.log("타임라인 그룹이 이미 존재합니다.");
      return;
    }

    Object.entries(this.timelines).forEach(([key, timeline]) => {
      // 각 타임라인 타입별로 그룹이 이미 있는지 확인
      const existingGroup = viewport.querySelector(
        `.timeline-group[data-timeline="${key}"]`
      );
      if (!existingGroup) {
        const wrapper = document.createElement("div");
        wrapper.className = "timeline-group";
        wrapper.dataset.timeline = key;
        wrapper.appendChild(timeline.container);
        viewport.appendChild(wrapper);
      }
    });

    // 장면이 있으면 키프레임 로드
    if (this.editor.scene?.userData?.keyframes) {
      this.loadKeyframesFromScene();
    }

    // 초기 액티브 타임라인 설정
    this.switchTimeline(this.activeTimeline);
  }

  // 타임라인 추가 버튼
  createAddTimelineButton = () => {
    console.log("createAddTimelineButton");
    const timeline = this;
    const addTimelineBtn = new UIButton();
    addTimelineBtn.dom.innerHTML = `
    <i class="fas fa-plus"></i>
    <span></span>
  `;
    addTimelineBtn.setClass("add-timeline-btn");

    addTimelineBtn.onClick(() => {
      this.addTimelineTrack();
    });

    return addTimelineBtn;
  };

  addTimelineTrack() {
    console.log("addTimelineTrack");
    const selectedObject = editor.selected;

    if (!selectedObject) {
      alert("Please select an FBX object in the scene first");
      return;
    }

    console.log("트랙 추가 시작 - 선택된 객체:", {
      name: selectedObject.name,
      uuid: selectedObject.uuid,
      id: selectedObject.id,
      type: selectedObject.type,
    });
    // 선택된 FBX 객체의 모션 타임라인 추가
    if (this.timelines.motion) {
      // TimelineData와 UI 모두에서 기존 트랙이 있는지 확인
      const existingTracks = this.timelines.motion.timelineData.getObjectTracks(selectedObject.uuid);
      const existingTrackElement = this.timelines.motion.container.querySelector(`[data-uuid="${selectedObject.uuid}"]`);
      
      console.log("트랙 추가 전 확인:", {
        objectUuid: selectedObject.uuid,
        timelineDataTracks: existingTracks.size,
        uiElementExists: !!existingTrackElement
      });
      
      if (existingTracks.size > 0 || existingTrackElement) {
        console.log("기존 트랙이 발견되었습니다. 완전히 제거합니다.");
        
        // 완전한 트랙 제거
        this.timelines.motion.removeTrackCompletely(selectedObject.uuid);
        
        // 잠시 대기 후 다시 확인
        setTimeout(() => {
          const remainingTracks = this.timelines.motion.timelineData.getObjectTracks(selectedObject.uuid);
          const remainingElement = this.timelines.motion.container.querySelector(`[data-uuid="${selectedObject.uuid}"]`);
          
          if (remainingTracks.size > 0 || remainingElement) {
            console.warn("트랙 제거 후에도 여전히 존재합니다:", {
              remainingTracks: remainingTracks.size,
              remainingElement: !!remainingElement
            });
            alert("트랙 제거 중 오류가 발생했습니다. 다시 시도해주세요.");
            return;
          }
        }, 100);
      }

      const objectUuid = selectedObject.uuid;
      // 새로운 모션 트랙 추가
      const track = this.timelines.motion.addTrack(
        objectUuid,
        selectedObject.id,
        selectedObject.name || `Motion Timeline ${selectedObject.id}`
      );

      console.log("생성된 트랙:", {
        track: track,
        uuid: track.uuid,
        element: track.element,
        dataset: track.element?.dataset,
      });

      // 씬의 타임라인 데이터 업데이트
      this.ensureTimelineData();

      // 씬의 키프레임 데이터 초기화
      if (!editor.scene.userData.keyframes) {
        editor.scene.userData.keyframes = {};
      }
      if (!editor.scene.userData.keyframes[objectUuid]) {
        editor.scene.userData.keyframes[objectUuid] = [];
      }

      // 트랙 추가 후 UI 갱신
      // this.initializeUI();
    }
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

    if (playButton) {
      playButton.addEventListener("click", () => {
        // scene이 없거나 timeline이 초기화되지 않은 경우 처리
        if (!this.editor.scene) {
          this.editor.scene = {
            userData: {
              timeline: {
                isPlaying: false,
                currentFrame: 0,
              },
            },
          };
        } else if (!this.editor.scene.userData) {
          this.editor.scene.userData = {
            timeline: {
              isPlaying: false,
              currentFrame: 0,
            },
          };
        } else if (!this.editor.scene.userData.timeline) {
          this.editor.scene.userData.timeline = {
            isPlaying: false,
            currentFrame: 0,
          };
        }

        const isPlaying = this.editor.scene.userData.timeline.isPlaying;
        if (!isPlaying) {
          this.play();
        } else {
          this.pause();
        }
      });
    }

    if (stopButton) {
      stopButton.addEventListener("click", () => {
        this.stop();
        // 정지 시 처음으로 돌아가기
        this.setCurrentFrame(0);
        this.updatePlayheadPosition(0);

        const frameInput = this.container.querySelector(".frame-input");
        if (frameInput) {
          frameInput.value = "0.0";
        }
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
        console.log("드래그 중");
        const rect = ruler.getBoundingClientRect();
        let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = x / rect.width;
        const totalFrames =
          this.timelineSettings.totalSeconds *
          this.timelineSettings.framesPerSecond;
        const frame = Math.round(percent * totalFrames);
        const currentTime = frame / this.timelineSettings.framesPerSecond;

        // 모든 모션 트랙 업데이트
        if (this.timelines.motion) {
          // MotionTimeline의 updateAnimation 호출
          this.timelines.motion.currentTime = currentTime;
          this.timelines.motion.updateAnimation(currentTime);
        }

        // 현재 프레임 업데이트 (애니메이션은 이미 위에서 처리됨)
        this.setCurrentFrame(frame, false); // 애니메이션 업데이트 건너뛰기
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
        const currentTime = frame / this.timelineSettings.framesPerSecond;
        console.log(frame);

        // MotionTimeline 애니메이션 업데이트
        if (this.timelines.motion) {
          this.timelines.motion.currentTime = currentTime;
          this.timelines.motion.updateAnimation(currentTime);
        }

        // 현재 프레임 업데이트 (애니메이션은 이미 위에서 처리됨)
        this.setCurrentFrame(frame, false);

        // 플레이헤드 위치 업데이트
        this.updatePlayheadPosition(percent * 100);
      });
    }

    // 키보드 단축키 이벤트
    document.addEventListener("keydown", (e) => {
      // 스페이스바로 재생/일시정지 토글
      if (e.code === "Space") {
        e.preventDefault(); // 기본 스크롤 동작 방지

        // scene이 없거나 timeline이 초기화되지 않은 경우 처리
        if (!this.editor.scene) {
          this.editor.scene = {
            userData: {
              timeline: {
                isPlaying: false,
                currentFrame: 0,
              },
            },
          };
        } else if (!this.editor.scene.userData) {
          this.editor.scene.userData = {
            timeline: {
              isPlaying: false,
              currentFrame: 0,
            },
          };
        } else if (!this.editor.scene.userData.timeline) {
          this.editor.scene.userData.timeline = {
            isPlaying: false,
            currentFrame: 0,
          };
        }

        const isPlaying = this.editor.scene.userData.timeline.isPlaying;
        console.log("스페이스바 단축키 - 현재 재생 상태:", isPlaying);

        if (!isPlaying) {
          console.log("재생 시작");
          this.play();
        } else {
          console.log("일시정지");
          this.pause();
        }
      }

      // ESC 키로 정지
      if (e.code === "Escape") {
        e.preventDefault();
        console.log("ESC 키 - 정지");
        this.stop();
        // 정지 시 처음으로 돌아가기
        this.setCurrentFrame(0);
        this.updatePlayheadPosition(0);

        const frameInput = this.container.querySelector(".frame-input");
        if (frameInput) {
          frameInput.value = "0.0";
        }
      }
    });

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
      frameTotal.textContent = `/ ${timelineSettings.totalSeconds * timelineSettings.framesPerSecond
        }`;
    }
  }

  updateTimeDisplay(frame) {
    if (!this.timelineSettings) return;

    const seconds = frame / this.timelineSettings.framesPerSecond;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const timeDisplay = this.container.querySelector(".time-display");
    if (timeDisplay) {
      timeDisplay.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds.toFixed(1).padStart(4, "0")}s`;
    }

    const frameInput = this.container.querySelector(".frame-input");
    if (frameInput) {
      frameInput.value = seconds.toFixed(1);
    }

    // 플레이헤드 위치 업데이트
    const totalFrames =
      this.timelineSettings.totalSeconds *
      this.timelineSettings.framesPerSecond;
    const percent = (frame / totalFrames) * 100;

    // updatePlayheadPosition 메서드가 존재하는 경우에만 호출
    if (this.updatePlayheadPosition) {
      this.updatePlayheadPosition(percent);
    }
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
      `.timeline-group[data-timeline="${type}"]`
    );
    if (activeGroup) {
      activeGroup.classList.add("active");
    }

    this.activeTimeline = type;
  }

  play() {
    // console.log("Timeline- play");
    if (!this.editor.scene) return;

    // console.log("=== 타임라인 재생 시작 ===");
    // console.log("현재 씬:", this.editor.scene);
    // console.log("타임라인 설정:", this.timelineSettings);

    this.isPlaying = true;
    this.editor.scene.userData.timeline.isPlaying = true;

    // 현재 playhead 위치에서 시작하도록 currentFrame 설정
    let currentFrame = 0;
    
    // 1. DOM에서 playhead 위치 가져오기
    const playhead = document.querySelector('.playhead');
    if (playhead) {
      const playheadLeft = parseFloat(playhead.style.left) || 0;
      const playheadPercent = playheadLeft / 100;
      currentFrame = Math.floor(playheadPercent * this.timelineSettings.totalSeconds * this.timelineSettings.framesPerSecond);
      // console.log("DOM에서 playhead 위치로 currentFrame 설정:", {
      //   playheadLeft,
      //   playheadPercent,
      //   currentFrame,
      //   totalFrames: this.timelineSettings.totalSeconds * this.timelineSettings.framesPerSecond
      // });
    }
    
    // 2. Timeline.js의 currentSeconds가 있으면 사용
    if (this.editor.scene?.userData?.timeline?.currentSeconds !== undefined) {
      const currentSeconds = this.editor.scene.userData.timeline.currentSeconds;
      currentFrame = Math.floor(currentSeconds * this.timelineSettings.framesPerSecond);
      // console.log("Timeline.js currentSeconds로 currentFrame 설정:", {
      //   currentSeconds,
      //   currentFrame
      // });
    }
    const totalFrames =
      this.timelineSettings.totalSeconds *
      this.timelineSettings.framesPerSecond;
    // 재생 속도 조절 (1로 설정하여 정상 속도로 재생)
    const playbackSpeed = 1; // 정상 속도로 재생

    // 오디오 재생 처리
    if (this.timelines.audio) {
      const audioTracks = Array.from(this.timelines.audio.tracks.values());
      audioTracks.forEach((track) => {
        const objectId =
          typeof track.objectId === "string"
            ? parseInt(track.objectId)
            : track.objectId;
        const audioObject = this.editor.scene.getObjectById(objectId);

        if (
          audioObject &&
          audioObject.userData &&
          audioObject.userData.audioElement
        ) {
          const audio = audioObject.userData.audioElement;
          audio.currentTime =
            currentFrame / this.timelineSettings.framesPerSecond;
          audio.volume = audioObject.userData.volume || 1.0;
          audio.playbackRate = audioObject.userData.playbackRate || 1.0;
          audio.muted = audioObject.userData.mute || false;

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("오디오 재생 시작됨");
              })
              .catch((error) => {
                console.error("오디오 재생 실패:", error);
              });
          }
        }
      });
    }

    // MotionTimeline의 play() 메서드 호출
    if (this.timelines.motion) {
      console.log("MotionTimeline play() 호출");
      // 현재 playhead 위치를 MotionTimeline에 전달
      const currentTimeInSeconds = currentFrame / this.timelineSettings.framesPerSecond;
      this.timelines.motion.currentTime = currentTimeInSeconds;
      console.log("MotionTimeline currentTime 설정:", currentTimeInSeconds);
      this.timelines.motion.play();
    }

    // 애니메이션 프레임 업데이트 - 실제 시간 기반으로 제어
    let lastTime = performance.now();
    const animate = () => {
      if (!this.isPlaying) return;

      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // 초 단위
      lastTime = currentTime;

      // 실제 시간 기반으로 프레임 계산
      const frameDelta = deltaTime * this.timelineSettings.framesPerSecond * playbackSpeed;
      currentFrame += frameDelta;

      if (currentFrame >= totalFrames) {
        currentFrame = 0;
      }

      // 오디오는 자체적으로 재생되도록 함 - 시간 동기화 제거

      // setCurrentFrame을 사용하여 모션 애니메이션 업데이트 (오디오 제외)
      this.setCurrentFrame(Math.floor(currentFrame), true);

      // 플레이헤드 위치 업데이트
      const percent = (currentFrame / totalFrames) * 100;
      this.updatePlayheadPosition(percent);

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);

    // UI 업데이트
    const playButton = this.container.querySelector(".play-button");
    if (playButton) {
      playButton.innerHTML = '<i class="fa fa-pause"></i>';
    }
  }

  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.editor.scene.userData.timeline.isPlaying = false;

    // MotionTimeline의 pause() 메서드 호출
    if (this.timelines.motion) {
      this.timelines.motion.pause();
    }

    // 오디오 일시정지
    if (this.timelines.audio) {
      const audioTracks = Array.from(this.timelines.audio.tracks.values());
      audioTracks.forEach((track) => {
        const objectId =
          typeof track.objectId === "string"
            ? parseInt(track.objectId)
            : track.objectId;
        const audioObject = this.editor.scene.getObjectById(objectId);

        if (
          audioObject &&
          audioObject.userData &&
          audioObject.userData.audioElement
        ) {
          const audio = audioObject.userData.audioElement;
          audio.pause();
          audio.currentTime = 0;
        }
      });
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // UI 업데이트
    const playButton = this.container.querySelector(".play-button");
    if (playButton) {
      playButton.innerHTML = '<i class="fa fa-play"></i>';
    }
  }

  stop() {
    if (!this.isPlaying && this.editor.scene.userData.timeline.currentFrame === 0) return;

    this.isPlaying = false;
    this.editor.scene.userData.timeline.isPlaying = false;
    this.editor.scene.userData.timeline.currentFrame = 0;
    this.editor.scene.userData.timeline.currentSeconds = 0;

    // MotionTimeline의 stop() 메서드 호출
    if (this.timelines.motion) {
      this.timelines.motion.stop();
    }

    // 오디오 정지
    if (this.timelines.audio) {
      const audioTracks = Array.from(this.timelines.audio.tracks.values());
      audioTracks.forEach((track) => {
        const objectId =
          typeof track.objectId === "string"
            ? parseInt(track.objectId)
            : track.objectId;
        const audioObject = this.editor.scene.getObjectById(objectId);

        if (
          audioObject &&
          audioObject.userData &&
          audioObject.userData.audioElement
        ) {
          const audio = audioObject.userData.audioElement;
          audio.pause();
          audio.currentTime = 0;
        }
      });
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.setCurrentFrame(0);
    this.updatePlayheadPosition(0);

    // UI 업데이트
    const playButton = this.container.querySelector(".play-button");
    if (playButton) {
      playButton.innerHTML = '<i class="fa fa-play"></i>';
    }
  }

  setCurrentFrame(frame, updateAnimation = true) {
    if (!this.editor.scene) return;

    const totalFrames =
      this.timelineSettings.totalSeconds *
      this.timelineSettings.framesPerSecond;
    frame = Math.max(0, Math.min(frame, totalFrames - 1));

    const currentTime = frame / this.timelineSettings.framesPerSecond;
    // console.log("=== setCurrentFrame ===");
    // console.log("현재 시간(초):", currentTime);
    // console.log("현재 프레임:", frame);

    // MotionTimeline의 updateAnimation 호출하여 속성 애니메이션 처리
    if (this.timelines.motion && updateAnimation) {
      // console.log("MotionTimeline updateAnimation 호출");
      this.timelines.motion.currentTime = currentTime;
      this.timelines.motion.updateAnimation(currentTime);
    }

    this.editor.scene.userData.timeline.currentFrame = frame;

    // 시간 표시 업데이트
    this.updateTimeDisplay(frame);

    // 각 타임라인 업데이트
    Object.values(this.timelines).forEach((timeline) => {
      if (timeline.updateFrame) {
        timeline.updateFrame(frame);
      }
    });

    if (this.editor.signals?.frameChanged) {
      this.editor.signals.frameChanged.dispatch(frame);
    }

    // Three.js 렌더링 업데이트 요청
    if (this.editor.signals?.rendererUpdated) {
      this.editor.signals.rendererUpdated.dispatch();
    }
  }

  createTimeRuler() {
    console.log("createTimeRuler");
    const ruler = this.container.querySelector(".time-ruler-container");
    ruler.innerHTML = "";
    const totalFrames =
      this.timelineSettings.totalSeconds *
      this.timelineSettings.framesPerSecond;
    const intervalSec = 30; // 30초 단위로 변경

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
      // MM:SS 형식으로 변경
      const minutes = Math.floor(sec / 60);
      const seconds = sec % 60;
      label.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}s`;
      tick.appendChild(label);

      ruler.appendChild(tick);

      // 중간 눈금 (10초 단위)
      if (sec < this.timelineSettings.totalSeconds) {
        for (let i = 10; i < intervalSec; i += 10) {
          const minorSec = sec + i;
          if (minorSec < this.timelineSettings.totalSeconds) {
            const minorFrame = minorSec * this.timelineSettings.framesPerSecond;
            const minorTick = document.createElement("div");
            minorTick.className = "time-tick minor";
            minorTick.style.left = (minorFrame / totalFrames) * 100 + "%";

            const minorLabel = document.createElement("div");
            minorLabel.className = "time-label minor";
            // 중간 눈금도 MM:SS 형식으로
            const minorMinutes = Math.floor(minorSec / 60);
            const minorSeconds = minorSec % 60;
            minorLabel.textContent = `${minorMinutes
              .toString()
              .padStart(2, "0")}:${minorSeconds.toString().padStart(2, "0")}s`;
            minorTick.appendChild(minorLabel);

            ruler.appendChild(minorTick);
          }
        }
      }
    }
  }

  createPlayhead() {
    // 타임라인 눈금에 플레이헤드 추가
    const ruler = this.container.querySelector(".time-ruler-container");
    const ph = document.createElement("div");
    ph.className = "playhead";
    ph.style.left = "0%";
    ph.style.height = document.querySelector(".timelineWrapper").clientHeight + "px";
    ph.innerHTML = '<span class="time-box"></span>';
    ruler.appendChild(ph);

    // 플레이헤드 위치 업데이트 함수
    const updatePlayheadPosition = (percent) => {
      console.log("Timeline.js updatePlayheadPosition", percent);

      // 룰러의 플레이헤드 위치 업데이트
      ph.style.left = `${percent}%`;

      // 현재 시간을 초 단위로 계산하여 time-box에 업데이트
      const totalFrames =
        this.timelineSettings.totalSeconds *
        this.timelineSettings.framesPerSecond;
      const currentFrame = Math.round((percent / 100) * totalFrames);
      const currentTimeInSeconds = (
        currentFrame / this.timelineSettings.framesPerSecond
      ).toFixed(2);
      ph.querySelector(".time-box").textContent = `${currentTimeInSeconds}s`;

      // MotionTimeline의 playhead도 동기화
      if (this.timelines && this.timelines.motion) {
        console.log("MotionTimeline playhead 동기화:", percent);
        this.timelines.motion.updatePlayheadPosition(percent);
      }
    };

    // 함수 선언 이후에 호출
    updatePlayheadPosition(0);

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

      // 현재 시간을 초 단위로 계산하여 time-box에 업데이트
      const totalFrames =
        this.timelineSettings.totalSeconds *
        this.timelineSettings.framesPerSecond;
      const currentFrame = Math.round((percent / 100) * totalFrames);
      const currentTimeInSeconds = (
        currentFrame / this.timelineSettings.framesPerSecond
      ).toFixed(2);
      ph.querySelector(".time-box").textContent = `${currentTimeInSeconds}s`;

      // 애니메이션 업데이트 - setCurrentFrame 호출하여 MotionTimeline과 AudioTimeline 업데이트
      this.setCurrentFrame(currentFrame, true);
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
    });

    // 플레이헤드 위치 업데이트 메서드 추가
    this.updatePlayheadPosition = updatePlayheadPosition;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}s`;
  }

  ensureTimelineData() {
    if (!this.editor.scene.userData.timeline) {
      this.editor.scene.userData.timeline = {
        totalSeconds: this.timelineSettings.totalSeconds,
        framesPerSecond: this.timelineSettings.framesPerSecond,
        currentFrame: 0,
        currentSeconds: 0,
        isPlaying: false,
      };
    }
  }

  updateKeyframesInClip(track, clip) {
    console.log("updateKeyframesInClip");
    // 클립 내의 키프레임들 가져오기
    const keyframes = Array.from(clip.querySelectorAll(".keyframe"))
      .map((kf) => ({
        time: parseFloat(kf.dataset.time),
        position: JSON.parse(kf.dataset.position || '{"x":0,"y":0,"z":0}'),
      }))
      .sort((a, b) => a.time - b.time);

    // 클립의 시작 시간 가져오기
    const clipStartTime = parseFloat(clip.dataset.startTime || "0");

    // 키프레임 위치 업데이트
    keyframes.forEach((keyframe) => {
      const timeInSeconds = keyframe.time + clipStartTime;
      const newLeft =
        (timeInSeconds / this.timelineSettings.totalSeconds) * 100;
      keyframe.element.style.left = `${newLeft}%`;
    });
  }
}

export { Timeline };
