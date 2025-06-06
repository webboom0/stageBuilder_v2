import * as THREE from "three";
import { UIPanel, UIRow, UIButton, UIText } from "./libs/ui.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Render } from "./VideoEdit.Render.js";

function VideoEditTimeline(
  editor,
  _totalSeconds,
  _framesPerSecond,
  _newWindow,
) {
  console.log("VideoEditTimeline");
  function setMeshesNonSelectable(scene) {
    console.log("setMeshesNonSelectable");
    scene.traverse((object) => {
      if (object.isGroup) {
        object.traverse((child) => {
          if (child.isMesh) {
            child.userData.isBackground = true;
            child.userData.notSelectable = true;
            child.userData.notEditable = true;
            child.userData.excludeFromTimeline = true;
            child.userData.hideInScenePanel = true; // scene 패널에서 숨기기 위한 플래그
            child.raycast = () => null;
          }
        });
      }
    });
  }

  const viewer = document.getElementById("viewport");
  if (viewer) {
    viewer.addEventListener("contextmenu", function (e) {
      console.log("viewport 우클릭");
      // event.preventDefault();
      // event.stopPropagation();
      console.log(_selectedKeyframeCharacter);
      // 현재 선택된 객체 유지
      if (_selectedKeyframeCharacter) {
        const selector = Children.getChildren(_selectedKeyframeCharacter);
        editor.signals.objectSelected.dispatch(selector);
        showKeyframeMenu(e.target, e);
      }
    });
  }

  // editor.clear() 함수 내에서 userData 초기화
  // editor.clear = function () {
  //   // 기존 씬의 모든 객체 제거
  //   while (editor.scene.children.length > 0) {
  //     editor.scene.remove(editor.scene.children[0]);
  //   }
  //   // userData 초기화
  //   editor.scene.userData = {};
  //   editor.signals.sceneGraphChanged.dispatch();

  //   // 새 프로젝트 시작 시 필요한 객체 추가
  //   background.create();
  // };

  const background = {
    create: function () {
      console.log("background");

      const loader = new OBJLoader();
      loader.load(
        "/files/background.obj",
        (object) => {
          if (!editor.scene || !editor.scene.children) {
            console.log("Scene or children not initialized yet");
            return;
          }

          // 씬의 배경색을 검정색으로 설정
          editor.scene.background = new THREE.Color(0x000000);

          // Stage 그룹 생성 또는 찾기
          let stageGroup = editor.scene.children.find(
            (child) => child.name === "Stage",
          );

          if (!stageGroup) {
            stageGroup = new THREE.Group();
            stageGroup.name = "Stage";
            editor.scene.add(stageGroup);
          }

          // Background 객체 생성 및 추가
          const existingBackground = stageGroup.children.find(
            (child) => child.name === "_Background",
          );
          console.log("existingBackground");
          console.log(existingBackground);
          if (!existingBackground) {
            object.name = "_Background";
            object.position.set(-97.17106296034069, -10, 50.12830519275826);
            object.scale.set(6.18, 10, 9.88);

            object.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0x808080,
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 1,
                });
                child.userData.isBackground = true;
                child.userData.notSelectable = true;
                child.userData.notEditable = true;
                child.raycast = () => null;
              }
            });
            // 객체 자체에도 설정
            object.userData.isBackground = true;
            object.userData.notSelectable = true;
            object.userData.notEditable = true;

            stageGroup.add(object);
          }

          // 바닥 객체 생성
          const existingFloor = stageGroup.children.find(
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
            floor.position.set(-2.975, -0.305, 0.0);
            floor.name = "_Floor";
            floor.userData.isBackground = true;
            floor.userData.notSelectable = true;
            floor.userData.notEditable = true;
            floor.raycast = () => null;

            stageGroup.add(floor);
          } else {
            console.log("Floor already exists");
          }

          // 뒷벽 생성
          const existingWallBack = stageGroup.children.find(
            (child) => child.name === "_WallBack",
          );

          if (!existingWallBack) {
            const wallBackGeometry = new THREE.BoxGeometry(
              153.102,
              64.088,
              1.0,
            );
            const wallBackMaterial = new THREE.MeshStandardMaterial({
              color: 0xcccccc, // 더 밝은 회색
              side: THREE.DoubleSide,
              transparent: false, // 투명도 제거
              opacity: 1,
              envMapIntensity: 0.5, // 환경맵 강도 감소
              roughness: 0.8, // 거칠기 증가
              metalness: 0.1, // 금속성 감소
            });

            const wallBack = new THREE.Mesh(wallBackGeometry, wallBackMaterial);
            wallBack.position.set(-1.064, 25.427, -56.129);
            wallBack.name = "_WallBack";
            wallBack.userData.isBackground = true;
            wallBack.userData.notSelectable = true;
            wallBack.userData.notEditable = true;
            wallBack.raycast = () => null;

            stageGroup.add(wallBack);
          } else {
            console.log("wallBack already exists");
          }

          // 왼쪽벽 생성
          const existingWallLeft = stageGroup.children.find(
            (child) => child.name === "_WallLeft",
          );

          if (!existingWallLeft) {
            const wallLeftGeometry = new THREE.BoxGeometry(
              110.902,
              64.088,
              1.0,
            );
            const wallLeftMaterial = new THREE.MeshStandardMaterial({
              color: 0xcccccc, // 더 밝은 회색
              side: THREE.DoubleSide,
              transparent: false, // 투명도 제거
              opacity: 1,
              envMapIntensity: 0.5, // 환경맵 강도 감소
              roughness: 0.8, // 거칠기 증가
              metalness: 0.1, // 금속성 감소
            });

            const wallLeft = new THREE.Mesh(wallLeftGeometry, wallLeftMaterial);
            wallLeft.position.set(-76.641, 25.427, -0.681);
            wallLeft.rotation.set(0.0, 89.51, 0.0);
            wallLeft.name = "_WallLeft";
            wallLeft.userData.isBackground = true;
            wallLeft.userData.notSelectable = true;
            wallLeft.userData.notEditable = true;
            wallLeft.raycast = () => null;

            stageGroup.add(wallLeft);
          } else {
            console.log("wallLeft already exists");
          }

          // 오른쪽벽 생성
          const existingWallRight = stageGroup.children.find(
            (child) => child.name === "_WallRight",
          );

          if (!existingWallRight) {
            const wallRightGeometry = new THREE.BoxGeometry(
              110.902,
              64.088,
              1.0,
            );
            const wallRightMaterial = new THREE.MeshStandardMaterial({
              color: 0xcccccc, // 더 밝은 회색
              side: THREE.DoubleSide,
              transparent: false, // 투명도 제거
              opacity: 1,
              envMapIntensity: 0.5, // 환경맵 강도 감소
              roughness: 0.8, // 거칠기 증가
              metalness: 0.1, // 금속성 감소
            });

            const wallRight = new THREE.Mesh(
              wallRightGeometry,
              wallRightMaterial,
            );
            wallRight.position.set(74.538, 25.427, -0.681);
            wallRight.rotation.set(0.0, 89.51, 0.0);
            wallRight.name = "_WallRight";
            wallRight.userData.isBackground = true;
            wallRight.userData.notSelectable = true;
            wallRight.userData.notEditable = true;
            wallRight.raycast = () => null;

            stageGroup.add(wallRight);
          } else {
            console.log("wallRight already exists");
          }

          // 조명 설정
          const existingLight = stageGroup.children.find(
            (child) => child.name === "_Light",
          );

          if (!existingLight) {
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
            hemiLight.position.set(0, 1, 0);
            hemiLight.name = "_Light";
            stageGroup.add(hemiLight);
          } else {
            console.log("Light already exists");
          }

          // Stage 그룹 전체에 대한 userData 설정
          stageGroup.userData.isBackground = true;
          stageGroup.userData.notSelectable = true;
          stageGroup.userData.notEditable = true;
          stageGroup.userData.excludeFromTimeline = true;

          editor.signals.sceneGraphChanged.dispatch();
          editor.scene.userData.hasBackground = true;

          editor.signals.objectSelected.remove(background.onObjectSelected);
          editor.signals.objectSelected.add(background.onObjectSelected);

          console.log("Background and floor loaded successfully");
        },
        undefined,
        (error) => {
          console.error("Error loading background:", error);
        },
      );
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
  let editorSceneChildrenCall = false;
  console.log("editor");
  console.log(editor.scene.children.length);
  // 객체가 scene에 추가될 때마다 호출
  editor.signals.objectAdded.add((object) => {
    if (object.isGroup) {
      setMeshesNonSelectable(object);
    }
  });
  // 새 파일일 경우에만 Background 생성
  if (
    editor.scene.children.length === 0 &&
    !editor.scene.userData.hasBackground
  ) {
    console.log("background호출");
    background.create();
  }
  let editorSceneChildrenCallIntervalTime = 0;
  const editorSceneChildrenCallInterval = setInterval(() => {
    console.log("editorSceneChildrenCallInterval");
    console.log(editor.scene.children.length);
    if (Object.keys(editor.scene.userData).length > 0) {
      editorSceneChildrenCall = true;
      // background.create(); // 바닥 생성
      onload(); // 타임라인 생성
    }
    editorSceneChildrenCallIntervalTime++;
    if (editorSceneChildrenCallIntervalTime > 30) {
      clearInterval(editorSceneChildrenCallInterval);
    }

    if (editorSceneChildrenCall) {
      clearInterval(editorSceneChildrenCallInterval);
    }
  }, 100);

  const _signals = editor.signals; // 시그널
  // const _totalSeconds = 180; // 예시로 180초
  // const _framesPerSecond = 30; // 초당 프레임
  let _playInterval = null; // 타임라인 플레이 인터벌
  let _selectedKeyframe = null; // 선택된 키프레임
  let _selectedKeyframeCharacter = null; // 선택된 키프레임 캐릭터

  // editor.scene.children 출력
  const Children = {
    getChildren: function (uuid) {
      console.log("getChildren");
      console.log(uuid);
      console.log(editor.scene.children);
      const cobj = editor.scene.children.find((child) => child.uuid === uuid);
      return cobj;
    },
    getName: function (uuid) {
      console.log("getName");
      console.log(uuid);
      const cobj = this.getChildren(uuid);
      return cobj.name;
    },
    haschildren: function (uuid) {
      console.log("exists");
      console.log(uuid);
      console.log(editor.scene.children);
      const exists = editor.scene.children.some((child) => child.uuid === uuid);
      console.log(exists);
      return exists;
    },
  };

  // 메시지
  function message(type, message) {
    console.log("message");
    switch (type) {
      case "alert":
        alert(message);
        break;
      case "console":
        console.log(message);
        break;
    }
  }

  // 선택된 객체 설정
  function selectedObject(character) {
    editor.selected = Children.getChildren(character);
    editor.signals.objectSelected.dispatch(editor.selected);
  }
  // 타임라인 객체 활성화
  function timelineObjectActive(uuid) {
    console.log("timelineObjectActive");
    console.log(document.querySelector(`.object[uuid="${uuid}"]`));
    document.querySelectorAll(".object.active").forEach((object) => {
      object.classList.remove("active");
    });
    document.querySelector(`.object[uuid="${uuid}"]`).classList.add("active");
  }
  const container = new UIPanel();
  container.setId("videoEditTimeline");

  // 키프레임 메뉴
  const _keyframeMenu = new UIRow();
  _keyframeMenu.setId("keyframeMenu");
  container.add(_keyframeMenu);

  // 키프레임 메뉴 버튼 - 키프레임 추가
  const _keyframeMenuBtn = new UIButton("add keyframe");
  _keyframeMenu.add(_keyframeMenuBtn);
  _keyframeMenuBtn.onClick(function (e) {
    console.log("keyframeMenuBtn");
    // addKeyframe(0, editor.selected.uuid, e.target);
    if (_selectedKeyframe != null) {
      if (_selectedKeyframeCharacter != null) {
        addKeyframe(_selectedKeyframe, _selectedKeyframeCharacter, e.target);
      } else {
        alert("캐릭터를 선택해주세요.");
      }
    } else {
      alert("키프레임을 선택해주세요.");
    }
  });

  // 키프레임 메뉴 버튼 - 키프레임 삭제
  const _keyframeMenuBtnDel = new UIButton("del keyframe");
  _keyframeMenu.add(_keyframeMenuBtnDel);
  _keyframeMenuBtnDel.onClick(function (e) {
    console.log("keyframeMenuBtnDel");
    if (_selectedKeyframe != null) {
      delKeyframe(_selectedKeyframe, editor.selected.uuid);
    } else {
      alert("키프레임을 선택해주세요.");
    }
  });

  // 트랙 그룹 - 왼쪽쪽
  const leftGroup = new UIRow();
  leftGroup.setClass("leftGroup");
  container.add(leftGroup);
  // 트랙 그룹 - 왼쪽 상단
  const leftGroupTop = new UIRow();
  leftGroupTop.setClass("leftGroupTop");
  leftGroup.add(leftGroupTop);
  // 트랙 추가 버튼
  const addTrackBtn = new UIButton();
  addTrackBtn.dom.innerHTML = `
    <i class="fas fa-plus"></i>
    <span>트랙추가</span>
  `;
  leftGroupTop.add(addTrackBtn);
  addTrackBtn.onClick(function (e) {
    console.log("addTrack clicked");
    if (editor.selected != null) {
      // addKeyframe(0, editor.selected.uuid, e.target);
      console.log("editor.scene.userData@@@@@@@@@@@@@@@@@@@@@@");
      console.log(editor.scene.userData);
      // console.log(
      //   !Object.keys(editor.scene.userData.keyframes).includes(
      //     editor.selected.uuid,
      //   ),
      // );
      // if (
      //   !Object.keys(editor.scene.userData.keyframes).includes(
      //     editor.selected.uuid,
      //   )
      // ) {
      // 키프레임 데이터 초기화
      if (!editor.scene.userData.keyframes) {
        editor.scene.userData.keyframes = {};
      }

      if (!editor.scene.userData.keyframes[editor.selected.uuid]) {
        editor.scene.userData.keyframes[editor.selected.uuid] = [];
      }

      // const keyframes = editor.scene.userData.keyframes[editor.selected.uuid];
      // keyframes.push({
      //   frameIndex: null,
      //   position: null,
      // });
      // } else {
      //   message(`${editor.selected.uuid} 트랙이 이미 존재합니다.`);
      //   return;
      // }

      addPointTarget(e.target);
      onload();
      selectedObject(editor.selected.uuid); // 선택된 객체 설정
      // timelineObjectActive(editor.selected.uuid); // 타임라인 객체 활성화
    } else {
      alert("씬에서 객체를 선택해주세요.");
    }
  });

  // 트랙 제거 버튼
  const delTrackBtn = new UIButton();
  delTrackBtn.dom.innerHTML = `
    <i class="fas fa-minus"></i>
    <span>트랙삭삭제</span>
  `;
  leftGroupTop.add(delTrackBtn);
  delTrackBtn.onClick(function () {
    console.log("delTrack clicked");
    const selected = editor.selected;
    if (selected != null) {
      delTrack(selected.uuid);
    } else {
      alert("삭제할 트랙을 선택해주세요.");
    }
  });
  // 트랙 제거
  function delTrack(selectedUuid) {
    console.log("delTrack");
    const keyframes = editor.scene.userData.keyframes;
    delete keyframes[selectedUuid];
    onload();
  }

  const currentFrameBar = new UIRow(); // 현재 프레임 바

  // 현재 프레임 바 업데이트
  function updateCurrentFrameBar(time) {
    console.log("updateCurrentFrameBar");
    let newLeft = time * 20;
    currentFrameBar.setStyle("left", [`${newLeft}px`]);
  }
  let renderInstance = null;
  // Render(editor, _totalSeconds, _framesPerSecond, _newWindow);

  // const existingTimelineGroup = container.dom.querySelector(".timelineGroup");
  // if (existingTimelineGroup) {
  //   container.dom.removeChild(existingTimelineGroup);
  // }
  const timelineGroup = new UIRow(); // 타임라인 그룹
  timelineGroup.setClass("timelineGroup");
  container.add(timelineGroup);
  const timelineTop = new UIRow(); // 타임라인 상단
  timelineTop.setClass("timelineTop");
  timelineGroup.add(timelineTop);
  for (let i = 0; i < _totalSeconds; i++) {
    const topframeButton = new UIButton(i); // 타임라인 상단 프레임 버튼
    topframeButton.setClass("frameButton");
    timelineTop.add(topframeButton);
  }

  function onload() {
    if (document.querySelectorAll(".timelineBar").length > 0) {
      document.querySelectorAll(".timelineBar").forEach((element) => {
        console.log("onload timelineGroup 삭제");
        console.log(element);
        element.remove();
      });

      document
        .querySelectorAll(".leftGroupTrack .object")
        .forEach((element) => {
          console.log("onload leftGroupTrack 삭제");
          console.log(element);
          // element.innerHTML = "";
          element.remove();
        });
    }
    console.log("onload");

    // Background 객체 체크 및 정리
    const backgrounds = editor.scene.children.filter(
      (child) => child.name === "Background" || child.userData.isBackground,
    );

    // 여러 개의 Background가 있다면 첫 번째만 남기고 나머지 제거
    // if (backgrounds.length > 1) {
    //   console.log("Removing duplicate backgrounds");
    //   backgrounds.slice(1).forEach((bg) => {
    //     editor.scene.remove(bg);
    //   });
    // }

    // // 남은 Background의 속성 재설정
    // if (backgrounds.length > 0) {
    //   const background = backgrounds[0];
    //   background.traverse((child) => {
    //     if (child.isMesh) {
    //       child.userData.isBackground = true;
    //       child.userData.notSelectable = true;
    //       child.userData.notEditable = true;
    //       child.userData.excludeFromTimeline = true;
    //       child.raycast = () => null;
    //     }
    //   });

    //   background.userData.isBackground = true;
    //   background.userData.notSelectable = true;
    //   background.userData.notEditable = true;
    //   background.userData.excludeFromTimeline = true;
    // }

    const keyframes = editor.scene.userData.keyframes;
    if (!keyframes) {
      console.log("No keyframes found. Exiting function.");
      return;
    }

    currentFrameBar.setClass("currentFrameBar");
    timelineTop.add(currentFrameBar);

    let isDragging = false;
    let time = 0;

    // 현재 프레임 이동(노란색 바)
    document.addEventListener("mousemove", currentFrameMove);

    function currentFrameMove(event) {
      if (isDragging) {
        time = event.target.innerText ? event.target.innerText : time;
        console.log(`time : ${time}`);
        updateAnimationToFrame(time);
      }
    }

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    function updateAnimationToFrame(time) {
      console.log("updateAnimationToFrame");
      interpolateAnimation(time);
      _signals.transformModeChanged.dispatch("translate");
    }

    const leftGroupTrack = new UIRow();
    leftGroupTrack.setClass("leftGroupTrack");
    leftGroup.add(leftGroupTrack);

    Object.keys(keyframes).forEach((character) => {
      console.log("Processing character:", character);
      // editor.scene.children 에 해당 character 가 없으면 트랙 삭제
      if (!editor.scene.children.find((child) => child.uuid == character)) {
        console.log("character 존재하지 않음");
        delTrack(character);
      }

      const object = new UIButton(Children.getName(character)); // 객체 버튼

      const timelineBar = new UIRow(); // 타임라인 바
      timelineBar.setClass("timelineBar");
      timelineBar.dom.setAttribute("uuid", character);
      timelineGroup.add(timelineBar);
      timelineBar.dom.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      });
      object.setClass("object");
      object.dom.setAttribute("uuid", character);
      leftGroupTrack.add(object);

      // 객체 클릭 이벤트
      object.onClick(function (e) {
        console.log("object clicked");
        selectedObject(character); // 선택된 객체 설정
        timelineObjectActive(e.currentTarget.getAttribute("uuid")); // 타임라인 객체 활성화
      });

      const objectControl = new UIRow(); // 객체 컨트롤
      objectControl.setClass("objectControl");
      object.add(objectControl);

      // const objectDelBtn = new UIButton("del"); // 객체 삭제 버튼
      // objectDelBtn.setClass("objectDelBtn");
      // objectControl.add(objectDelBtn);
      // objectDelBtn.onClick(function () {
      //   console.log("objectDelBtn");
      // });

      const keyframes = editor.scene.userData.keyframes[character] || [];
      console.log(editor.scene.userData.keyframes[character]);

      for (let i = 0; i < _totalSeconds; i++) {
        const keyframeButton = new UIButton(); // 키프레임 버튼
        keyframeButton.setClass("frameButton");
        keyframeButton.onClick(async (e) => {
          console.log("keyframeButton");
          selectKeyframe(i, character, e.target);
          // addKeyframe(i, character, e.target);
        });
        /*
        keyframeButton.dom.addEventListener("contextmenu", (event) => {
          event.preventDefault(); // 기본 컨텍스트 메뉴 표시 방지
          // 선택된 키프레임의 위치 가져오기
          const rect = event.currentTarget.getBoundingClientRect();
          console.log(rect);
          // 메뉴 위치 설정
          keyframeMenu.setStyle("left", [`${rect.left}px`]);
          // keyframeMenu.setStyle("top", [`${rect.top}px`]);

          // 메뉴 표시
          keyframeMenu.setClass("active");
        });
*/
        timelineBar.add(keyframeButton);
        if (
          keyframes.filter((val) => val.frameIndex / _framesPerSecond == i)
            .length > 0
        ) {
          addPoint(keyframeButton);
        }
      }
    });
  }

  // 키프레임 메뉴 이벤트
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded");
    const keyframeButton = document.querySelectorAll(".frameButton");
    const keyframeMenu = document.getElementById("keyframeMenu");

    // 메뉴 외부 클릭 시 메뉴 숨기기
    document.addEventListener("click", (event) => {
      console.log("메뉴 외부 클릭 시 메뉴 숨기기");
      console.log(event.target.closest(".timelineGroup"));
      if (event.target.closest(".timelineGroup") == null) {
        console.log("메뉴 외부 클릭 시 메뉴 숨기기@@@@@@@@@@@@");
        // keyframeMenu.classList.remove("show");
        // hideKeyframeMenu();
        // _selectedKeyframe = null;
        // _selectedKeyframeCharacter = null;
      }
    });
  });

  // 키프레임 포인트 추가
  function addPoint(parent) {
    const keyframePoint = new UIText(); // 키프레임 포인트
    keyframePoint.setClass("point");
    parent.add(keyframePoint);
  }

  // 키프레임 타겟 추가
  function addPointTarget(target) {
    const keyframePointDom = document.createElement("span"); // 키프레임 포인트 돔
    keyframePointDom.classList.add("point");
    target.appendChild(keyframePointDom);
  }

  // 키프레임 타겟 삭제
  function delPointTarget(target) {
    console.log("delPointTarget");
    console.log(target);
    target.removeChild(target.querySelector(".point"));
  }

  // 키프레임 선택
  function selectKeyframe(keyNumber, characterUuid, target) {
    console.log("selectKeyframe");
    console.log(keyNumber);
    console.log(characterUuid);
    console.log(target);

    const character2 = Children.getChildren(characterUuid);
    console.log("!!!!!!!!!!!!!!!!!!!!!");
    console.log(character2.position);

    hideKeyframeMenu(); // 키프레임 메뉴 숨김
    if (document.querySelector(".frameButton.active")) {
      document.querySelector(".frameButton.active").classList.remove("active");
    }
    _selectedKeyframe = keyNumber; // 선택된 키프레임 번호
    _selectedKeyframeCharacter = characterUuid; // 선택된 키프레임 캐릭터
    selectedObject(characterUuid); // 선택된 객체 설정

    editor.selected = Children.getChildren(characterUuid);
    console.log("select");
    console.log(editor.selected);

    const trackUuid = target.parentElement.getAttribute("uuid");
    timelineObjectActive(trackUuid); // 타임라인 객체 활성화
    target.classList.add("active"); // 키프레임 버튼 활성화
    // 키프레임 우측클릭시 메뉴 표시
    target.addEventListener("contextmenu", function (e) {
      e.preventDefault(); // 기본 우클릭 메뉴를 방지합니다.
      showKeyframeMenu(target, e); // 키프레임 메뉴 표시
    });
    // updateCurrentFrameBar(keyNumber); // 현재 프레임 바 업데이트
    interpolateAnimation(keyNumber); // 현재 키프레임바 업데이트
    // keyframeMenu.setClass("active");
    // addKeyframe(keyNumber, character, target);
  }

  function showKeyframeMenu(target, event) {
    console.log("showKeyframeMenu");
    console.log(target);
    const keyframeMenu = document.getElementById("keyframeMenu");
    // 선택된 키프레임의 위치 가져오기
    const rect = target.getBoundingClientRect();
    console.log(rect);
    // 메뉴 위치 설정
    // viewer인 경우 마우스 위치 사용, 아닌 경우 target의 위치 사용
    console.log("target");
    console.log(target.tagName);
    if (target.tagName === "CANVAS") {
      keyframeMenu.style.left = `${event.clientX}px`;
      keyframeMenu.style.top = `${event.clientY}px`;
    } else {
      const rect = target.getBoundingClientRect();
      keyframeMenu.style.left = `${rect.left}px`;
      keyframeMenu.style.top = `${rect.top}px`;
    }
    // keyframeMenu.style.left = `${rect.left}px`;
    // keyframeMenu.style.top = `${rect.top}px`;
    // keyframeMenu.setStyle("left", [`${rect.left}px`]);
    // keyframeMenu.setStyle("top", [`${rect.top}px`]);

    // 메뉴 표시
    // keyframeMenu.setClass("active");
    keyframeMenu.classList.add("show");
  }

  function hideKeyframeMenu() {
    console.log("hideKeyframeMenu");
    const keyframeMenu = document.getElementById("keyframeMenu");
    if (document.querySelector("#videoEditTimeline .object.active")) {
      document
        .querySelector("#videoEditTimeline .object.active")
        .classList.remove("active");
    }
    if (document.querySelector("#videoEditTimeline .frameButton.active")) {
      document
        .querySelector("#videoEditTimeline .frameButton.active")
        .classList.remove("active");
    }
    keyframeMenu.classList.remove("show");
  }

  // 키프레임 추가 함수
  function addKeyframe(keyNumber, characterUuid, target) {
    const frameIndex = keyNumber * _framesPerSecond;
    // 키프레임 데이터 초기화
    if (!editor.scene.userData.keyframes) {
      editor.scene.userData.keyframes = {};
    }
    // 키프레임 데이터 초기화
    if (!editor.scene.userData.keyframes[characterUuid]) {
      editor.scene.userData.keyframes[characterUuid] = [];
    }

    const character = Children.getChildren(characterUuid);
    const keyframes = editor.scene.userData.keyframes[characterUuid];
    const existingIndex = keyframes.findIndex(
      (item) => item.frameIndex === frameIndex,
    );

    if (existingIndex !== -1) {
      keyframes.splice(existingIndex, 1);
    }

    // 조명 객체인 경우 visibility 정보도 저장
    const frameData = {
      frameIndex: frameIndex,
      position: character.position.clone(),
    };

    if (character.isLight) {
      frameData.visible = character.visible;
    }

    keyframes.push(frameData);

    // keyframes.push({
    //   frameIndex: frameIndex,
    //   position: character.position.clone(),
    // });

    editor.scene.userData.keyframes[characterUuid].sort(
      (a, b) => a.frameIndex - b.frameIndex,
    );

    // message("alert", ` ${characterUuid} ${frameIndex} 키 프레임 추가`);
    addPointTarget(target);
    onload();
    selectedObject(characterUuid); // 선택된 객체 설정
    timelineObjectActive(characterUuid); // 타임라인 객체 활성화
    hideKeyframeMenu();
  }

  // 키프레임 삭제
  function delKeyframe(keyNumber, characterUuid) {
    console.log("delKeyframe");
    console.log(characterUuid);
    console.log(keyNumber);
    const frameIndex = keyNumber * _framesPerSecond;
    const keyframes = editor.scene.userData.keyframes[characterUuid];
    const existingIndex = keyframes.findIndex(
      (item) => item.frameIndex === frameIndex,
    );
    console.log(`existingIndex : ${existingIndex}`);
    if (existingIndex !== -1) {
      keyframes.splice(existingIndex, 1);
    }
    console.log(keyframes);
    message("alert", ` ${characterUuid} ${frameIndex} 키 프레임 삭제`);
    onload();
    hideKeyframeMenu();
  }

  // render 버튼 클릭 이벤트
  let currentRender = null;
  const renderButton = new UIButton();
  renderButton.dom.innerHTML = `
    <i class="fas fa-play"></i>
    <span>렌더링</span>
  `;
  leftGroupTop.add(renderButton);
  renderButton.onClick(function () {
    if (currentRender) {
      currentRender.renderClose();
      currentRender = null;
    }
    // 새로운 렌더 인스턴스 생성
    currentRender = new Render(editor, _totalSeconds, _framesPerSecond, false);
    currentRender.resetAnimation();
  });

  document.body.addEventListener("mousedown", (event) => {
    console.log("timeline-mousedown");
    // preventObjectDeselection();

    if (!event.target.closest("#renderViewContainer")) {
      if (currentRender) {
        currentRender.renderClose();
        currentRender = null;
      }
    }

    if (event.target.closest("canvas")) {
      console.log("CANVAST 들어옴");
      hideKeyframeMenu();
    }
  });
  // 옵션 버튼
  const optionBtn = new UIButton();
  optionBtn.setClass("optionBtn Button");
  optionBtn.dom.innerHTML = `
    <i class="fas fa-cog"></i>
    <span>트랙시간설정(초)</span>
  `;
  leftGroupTop.add(optionBtn);
  optionBtn.onClick(function (e) {
    console.log("optionBtn");
    e.currentTarget.classList.toggle("active");
    const optionGroup = document.querySelector(
      "#videoEditTimeline .optionGroup",
    );
    optionGroup.classList.toggle("active");
  });
  // play 버튼
  // const playButton = new UIButton("Play");
  // container.add(playButton);
  // playButton.onClick(function () {
  //   playTimeline(0);
  // });

  // stop 버튼
  // const stopButton = new UIButton("stop");
  // container.add(stopButton);
  // stopButton.onClick(function () {
  //   clearInterval(_playInterval); // 애니메이션 종료
  // });

  // 타임라인 플레이 시 애니메이션 적용
  function playTimeline(currentSecond) {
    console.log("playTimeline");

    if (!editor) {
      console.error("Editor is not initialized.");
      return;
    }

    _playInterval = setInterval(() => {
      currentSecond++;
      if (currentSecond >= _totalSeconds) {
        clearInterval(_playInterval);
        return;
      }

      interpolateAnimation(currentSecond);
    }, 1000);
  }

  // 애니메이션 보간
  function interpolateAnimation(currentSecond) {
    console.log("interpolateAnimation");
    const currrentFrame = currentSecond * _framesPerSecond;
    updateCurrentFrameBar(currentSecond);
    const keyframes = editor.scene.userData.keyframes;

    Object.keys(keyframes).forEach((uuid) => {
      const frames = keyframes[uuid];
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].frameIndex <= currrentFrame) {
          const character = Children.getChildren(uuid);
          const pos = frames[i].position;
          character.position.copy(pos);

          // 조명 객체인 경우 visibility 적용
          if (character.isLight && frames[i].hasOwnProperty("visible")) {
            character.visible = frames[i].visible;
          }

          // 트랜스폼 모드 변경
          _signals.transformModeChanged.dispatch("translate");
        }
      }
    });
  }
  /*
  // 타임라인 플레이 시 애니메이션 적용
  function renderPlay() {
    console.log("renderPlay");
    const keyframes = editor.scene.userData.keyframes;
    if (!keyframes) {
      console.log("No keyframes found. Exiting function.");
      return;
    }

    const editorScene = editor.scene;
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    const mixers = [];
    editorScene.children.forEach((character) => {
      const mixer = new THREE.AnimationMixer(character);
      mixers.push(mixer);
      character.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    });

    const clock = new THREE.Clock();
    let currentFrame = 0;
    const totalSeconds = 180;
    let isPlaying = true;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(1200, 800);
    renderer.setClearColor(0xf0f0f0, 1);

    const newWindow = window.open("", "", "width=1200,height=800");
    if (newWindow) {
      newWindow.document.body.style.margin = "0";
      newWindow.document.body.appendChild(renderer.domElement);

      const controlsDiv = newWindow.document.createElement("div");
      controlsDiv.style.position = "absolute";
      controlsDiv.style.bottom = "0";
      controlsDiv.style.width = "100%";
      controlsDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      controlsDiv.style.color = "white";
      controlsDiv.style.textAlign = "center";
      controlsDiv.style.padding = "10px";

      const playButton = newWindow.document.createElement("button");
      playButton.innerText = "Play";
      controlsDiv.appendChild(playButton);

      const pauseButton = newWindow.document.createElement("button");
      pauseButton.innerText = "Pause";
      controlsDiv.appendChild(pauseButton);

      newWindow.document.body.appendChild(controlsDiv);

      playButton.addEventListener("click", () => {
        isPlaying = true;
        animate();
      });

      pauseButton.addEventListener("click", () => {
        isPlaying = false;
        renderer.dispose();
      });

      const controls = new OrbitControls(camera, renderer.domElement);
      camera.position.set(0, 0, 100);
      camera.lookAt(editorScene.position);
      controls.update();

      const existingLights = editorScene.children.filter(
        (child) => child.isLight,
      );

      if (existingLights.length > 0) {
        console.log("Using existing lights:", existingLights);
      } else {
        console.log("No existing lights found in the scene.");
      }

      newWindow.addEventListener("unload", () => {
        isPlaying = false;
        renderer.dispose();
      });

      function animate() {
        if (!isPlaying || currentFrame == _totalSeconds * _framesPerSecond)
          return;
        requestAnimationFrame(animate);

        if (isPlaying) {
          const delta = clock.getDelta();
          mixers.forEach((mixer) => mixer.update(delta));

          editorScene.children.forEach((character) => {
            const frames = editorScene.userData.keyframes[character.uuid] || [];
            let prevFrame = null;
            let nextFrame = null;

            for (let i = 0; i < frames.length; i++) {
              if (frames[i].frameIndex <= currentFrame) {
                prevFrame = frames[i];
              }
              if (frames[i].frameIndex > currentFrame && nextFrame === null) {
                nextFrame = frames[i];
                break;
              }
            }

            if (prevFrame && nextFrame) {
              const t =
                (currentFrame - prevFrame.frameIndex) /
                (nextFrame.frameIndex - prevFrame.frameIndex);
              character.position.lerpVectors(
                prevFrame.position,
                nextFrame.position,
                t,
              );
            } else if (prevFrame) {
              character.position.copy(prevFrame.position);
            }
          });

          currentFrame = currentFrame + 1;
        }

        renderer.render(editorScene, camera);
      }

      animate();
    }
  }
*/

  return container;
}

export { VideoEditTimeline };
