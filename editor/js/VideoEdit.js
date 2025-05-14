import { UIPanel, UIInput, UIButton, UIRow } from "./libs/ui.js";
import { Timeline } from "./timeline/Timeline.js";

function VideoEdit(editor) {
  const signals = editor.signals;
  const container = new UIPanel();
  container.setId("videoEdit");

  // 타임라인 컨테이너 생성
  const timelinePanel = new UIPanel();
  timelinePanel.setId("timelinePanel");

  // Timeline 인스턴스 생성
  const timeline = new Timeline(editor);

  // Timeline의 container를 UIPanel로 래핑
  const timelineWrapper = new UIPanel();
  timelineWrapper.dom.appendChild(timeline.container);
  timelinePanel.add(timelineWrapper);

  // 시간 설정 UI
  const setSeconds = () => {
    const optionGroup = new UIRow();
    optionGroup.setClass("optionGroup");

    const inputSeconds = new UIInput();
    inputSeconds.setId("seconds");
    inputSeconds.setClass("totalSeconds");
    inputSeconds.dom.type = "number";
    inputSeconds.dom.min = 30;
    inputSeconds.dom.max = 180;
    inputSeconds.dom.value = timeline.timelineSettings.totalSeconds;
    inputSeconds.dom.step = 1;
    inputSeconds.dom.placeholder = "Seconds";

    // 시간 변경 이벤트
    inputSeconds.onChange(() => {
      const newSeconds = parseInt(inputSeconds.getValue());
      if (newSeconds >= 30 && newSeconds <= 180) {
        if (editor.scene) {
          editor.scene.userData.timeline.totalSeconds = newSeconds;
          timeline.onSceneChanged();
        }
      }
    });

    const setSecondsBtn = new UIButton("트랙시간설정(초) 변경하기");
    setSecondsBtn.setId("setSeconds");
    setSecondsBtn.setClass("setSecondsBtn Button");

    optionGroup.add(inputSeconds);
    optionGroup.add(setSecondsBtn);

    return optionGroup;
  };

  // // 타임라인 추가 버튼
  const createAddTimelineButton = () => {
    const row = new UIRow();
    row.setClass("timeline-controls");

    const addTimelineBtn = new UIButton("Add Track");
    addTimelineBtn.setClass("add-timeline-btn");

    addTimelineBtn.onClick(() => {
      const selectedObject = editor.selected;

      if (!selectedObject) {
        alert("Please select an FBX object in the scene first");
        return;
      }

      // 선택된 FBX 객체의 모션 타임라인 추가
      if (timeline.timelines.motion) {
        // 이미 존재하는 트랙인지 확인
        const existingTrack = timeline.timelines.motion.tracks.get(
          selectedObject.id,
        );
        if (existingTrack) {
          alert("This object already has a timeline");
          return;
        }

        // 새로운 모션 트랙 추가
        timeline.timelines.motion.addTrack(selectedObject.id, {
          name: selectedObject.name || `Motion Timeline ${selectedObject.id}`,
          object: selectedObject,
        });

        // 씬의 타임라인 데이터 업데이트
        if (!editor.scene.userData.timeline) {
          editor.scene.userData.timeline = {
            totalSeconds: timeline.timelineSettings.totalSeconds,
            framesPerSecond: timeline.timelineSettings.framesPerSecond,
            currentFrame: 0,
            isPlaying: false,
          };
        }

        // 씬의 키프레임 데이터 초기화
        if (!editor.scene.userData.keyframes) {
          editor.scene.userData.keyframes = {};
        }
        if (!editor.scene.userData.keyframes[selectedObject.id]) {
          editor.scene.userData.keyframes[selectedObject.id] = [];
        }

        // 트랙 추가 후 UI 갱신
        timeline.initializeUI();
      }
    });

    row.add(addTimelineBtn);
    return row;
  };

  // UI 구성
  // container.add(setSeconds());
  // container.add(createAddTimelineButton());
  container.add(timelinePanel);

  // 씬 변경 시그널 처리
  if (signals?.sceneChanged) {
    signals.sceneChanged.add(() => {
      if (editor.scene) {
        const sceneTimeline = editor.scene.userData.timeline;
        const inputSeconds = document.querySelector("#seconds");
        if (inputSeconds) {
          inputSeconds.value = sceneTimeline.totalSeconds;
        }
      }
    });
  }

  return container;
}

export { VideoEdit };
