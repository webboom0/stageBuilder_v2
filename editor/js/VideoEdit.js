import { UIPanel, UIInput, UIButton, UIRow } from "./libs/ui.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Timeline } from "./timeline/Timeline.js";

function VideoEdit(editor) {
  console.log("VideoEdit");
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
  const background = {
    init: function () {
      this.stageGroup = editor.scene.children.find(
        (child) => child.name === "Stage",
      );

      if (!this.stageGroup) {
        this.stageGroup = new THREE.Group();
        this.stageGroup.name = "Stage";
        editor.scene.add(this.stageGroup);
      }
    },
    create: function () {
      console.log("background");

      const loader = new FBXLoader();
      loader.load(
        "https://webboom0.github.io/stageBuilder_v2/files/background.fbx",
        (object) => {
          if (!editor.scene || !editor.scene.children) {
            console.log("Scene or children not initialized yet");
            return;
          }

          // 씬의 배경색을 검정색으로 설정
          // editor.scene.background = new THREE.Color(0x000000);

          

          // Background 객체 생성 및 추가
          const existingBackground = this.stageGroup.children.find(
            (child) => child.name === "_Background",
          );
          console.log("existingBackground");
          console.log(existingBackground);
          if (!existingBackground) {
            object.name = "_Background";
            /*  obj 기준
            object.position.set(234.86, -116.269, 619.18);
            object.rotation.set(
              0, // -90도
              Math.PI / 2, // 0도
              0, // 90도
            );
            object.scale.set(0.6, 0.4, 0.6);
            */
            /* fbx 기준*/
            // object.position.set(228.340, -153.989, 764.44);
            object.position.set(228.340, -122.909, 764.44); // object.scale.set(0.6, 0.6, 0.5)일때
            
            object.rotation.set(
              -Math.PI / 2, // -90도
              0, // 0도
              Math.PI / 2, // 90도
            );
            object.scale.set(0.6, 0.6, 0.4);
           

            // object.traverse((child) => {
            //   if (child.isMesh) {
            //     child.material = new THREE.MeshStandardMaterial({
            //       color: 0x808080,
            //       side: THREE.DoubleSide,
            //       transparent: true,
            //       opacity: 1,
            //     });
            //     child.userData.isBackground = true;
            //     child.userData.notSelectable = true;
            //     child.userData.notEditable = true;
            //     child.raycast = () => null;
            //   }
            // });
            // 객체 자체에도 설정
            // object.userData.isBackground = true;
            // object.userData.notSelectable = true;
            // object.userData.notEditable = true;

            this.stageGroup.add(object);
            // editor.scene.add(object);

            // === 카메라 위치 설정 예시 ===
            if (editor.camera) {
              editor.camera.position.set(-22.492, 70, 500); // 원하는 위치로 변경
              editor.camera.lookAt(0, 0, 0); // 원하는 타겟으로 변경
              editor.camera.rotation.set(
                -11 * Math.PI / 180, 
                -3 * Math.PI / 180,
                0
              );
            }
          }

          // 조명 설정
          const existingLight = this.stageGroup.children.find(
            (child) => child.name === "_Light",
          );

          if (!existingLight) {
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
            hemiLight.position.set(0, 1, 0);
            hemiLight.name = "_Light";
            this.stageGroup.add(hemiLight);
          } else {
            console.log("Light already exists");
          }

          // Stage 그룹 전체에 대한 userData 설정
          this.stageGroup.userData.isBackground = true;
          this.stageGroup.userData.notSelectable = true;
          this.stageGroup.userData.notEditable = true;
          this.stageGroup.userData.excludeFromTimeline = true;

          editor.signals.sceneGraphChanged.dispatch();
          editor.scene.userData.hasBackground = true;

          editor.signals.objectSelected.remove(background.onObjectSelected);
          editor.signals.objectSelected.add(background.onObjectSelected);

          console.log("Background and floor loaded successfully");

          // loading 모달 숨김
          const modal = document.getElementById("loading-modal");
          if (modal) modal.style.display = "none";
        },
        undefined,
        (error) => {
          // 에러 시에도 모달 숨기기
          const modal = document.getElementById("loading-modal");
          if (modal) modal.style.display = "none";
          console.error("Error loading background:", error);
        },
      );
    },
    createFloor: function () {
      console.log("createFloor");
       // 바닥 객체 생성
       const existingFloor = this.stageGroup.children.find(
        (child) => child.name === "_Floor",
      );

      if (!existingFloor) {
        const floorGeometry = new THREE.BoxGeometry(147.446, 1, 111.747);
        const floorMaterial = new THREE.MeshStandardMaterial({
          color: 0x808080,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 1,
          envMapIntensity: 1.0,
          roughness: 0.5,
          metalness: 0.0,
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(-2.975, -3.063, 0.0);
        floor.scale.set(1.564, 6.779, 1.0);
        floor.name = "_Floor";
        // floor.userData.isBackground = true;
        // floor.userData.notSelectable = true;
        // floor.userData.notEditable = true;
        floor.raycast = () => null;

        this.stageGroup.add(floor);
        // editor.scene.add(floor);
      } else {
        console.log("Floor already exists");
      }
    },
    onObjectSelected: function (selected) {
      if (
        selected &&
        (selected.name === "Background" || selected.userData.isBackground)
      ) {
        editor.selected = null;
        editor.signals.objectSelected.dispatch(null);
      }
    },
  };
  console.log(editor.scene.userData.hasBackground);
  // 새 파일일 경우에만 Background 생성
  if (!editor.scene.userData.hasBackground) {
    console.log("background호출");
    background.init();
    background.create();
    background.createFloor();
  }
  return container;
}

export { VideoEdit };
