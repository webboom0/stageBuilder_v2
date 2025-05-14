import * as THREE from "three";
import { UIPanel, UIRow, UIButton, UIText } from "./libs/ui.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import Selector from "./Selector.js";
function VideoEditTimeline(editor) {
  console.log("VideoEditTimeline");
  console.log(editor);
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

  const Children = {
    getChildren: function (uuid) {
      const cobj = editor.scene.children.find((child) => child.uuid === uuid);
      return cobj;
    },
    getName: function (uuid) {
      const cobj = this.getChildren(uuid);
      return cobj.name;
    },
    haschildren: function (uuid) {
      const exists = editor.scene.children.some((child) => child.uuid === uuid);
      return exists;
    },
  };
  // 초기화
  const signals = editor.signals;
  const totalSeconds = 180; // 예시로 180초
  const framesPerSecond = 30;

  let playInterval = null; // 타임라인 플레이 인터벌

  const container = new UIPanel();
  container.setId("videoEditTimeline");
  function createPlane() {
    console.log("createPlane");
    // 그림자를 받을 객체(바닥)
    if (!Children.haschildren("38415372-2e99-4c9a-a1ba-b6d9a1977f92")) {
      console.log("바닥생성");
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0x808080 }),
      );
      plane.receiveShadow = true; // 객체에서 그림자 받기 활성화
      plane.uuid = "38415372-2e99-4c9a-a1ba-b6d9a1977f92"; // 객체에서 그림자 받기 활성화
      plane.rotation.x = -Math.PI / 2;
      editor.scene.add(plane);
    }
  }

  // 트랙추가
  const addTrackBtn = new UIButton("add");
  container.add(addTrackBtn);
  // addTrack 버튼 클릭 시 Selector에서 선택된 객체 가져오기
  addTrackBtn.onClick(function (e) {
    console.log("addTrack clicked");
    console.log(editor.selected);
    if (editor.selected != null) {
      addKeyframe(0, editor.selected.uuid, e.target); ////////////////////////////////////////////////////
    } else {
      alert("씬에서 객체를 선택해주세요.");
    }
  });

  // 트랙제거
  const delTrackBtn = new UIButton("del");
  container.add(delTrackBtn);
  // addTrack 버튼 클릭 시 Selector에서 선택된 객체 가져오기
  delTrackBtn.onClick(function () {
    console.log("delTrack clicked");
    console.log(editor.selected);
    const selected = editor.selected;
    if (selected != null) {
      delTrack(selected.uuid);
    } else {
      alert("삭제할 트랙을 선택해주세요.");
    }
  });

  function delTrack(selectedUuid) {
    console.log("delTrack");
    console.log(editor.selected);
    const keyframes = editor.scene.userData.keyframes;
    delete keyframes[selectedUuid];
    onload();
  }
  const timelineGroup = new UIRow();
  const timelineTop = new UIRow();
  const currentFrameBar = new UIRow();
  function updateCurrentFrameBar(time) {
    console.log("updateCurrentFrameBar");
    console.log(time);
    let newLeft = time * 20;
    console.log(newLeft);
    currentFrameBar.setStyle("left", [`${newLeft}px`]);
  }
  // load 버튼
  const loadButton = new UIButton("load");
  container.add(loadButton);
  loadButton.onClick(function () {
    onload();
  });

  function onload() {
    createPlane();
    console.log("onload");
    console.log(editor);
    console.log(editor.signals);
    // rendererUpdated
    const keyframes = editor.scene.userData.keyframes;
    if (!keyframes) {
      console.log("No keyframes found. Exiting function.");
      return; // 함수 종료
    }
    // 기존의 timelineGroup이 있을 경우 삭제
    const existingTimelineGroup = container.dom.querySelector(".timelineGroup");
    if (existingTimelineGroup) {
      container.dom.removeChild(existingTimelineGroup);
    }

    timelineGroup.setClass("timelineGroup");
    container.add(timelineGroup);

    timelineTop.setClass("top");
    timelineGroup.add(timelineTop);
    for (let i = 0; i < totalSeconds; i++) {
      const topframeButton = new UIButton(i);
      topframeButton.setClass("frameButton");
      timelineTop.add(topframeButton);
    }

    // 현재 프레임을 표시하는 세로바 생성

    currentFrameBar.setClass("currentFrameBar");
    timelineTop.add(currentFrameBar);

    let isDragging = false;

    timelineTop.dom.addEventListener("mousedown", (event) => {
      isDragging = true;
    });
    let time = 0;
    document.addEventListener("mousemove", (event) => {
      if (isDragging) {
        time = event.target.innerText ? event.target.innerText : time;
        console.log(`time : ${time}`);
        updateAnimationToFrame(time);
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    function updateAnimationToFrame(time) {
      // 애니메이션을 현재 프레임으로 업데이트
      console.log("updateAnimationToFrame");
      interpolateAnimation(time);
      signals.transformModeChanged.dispatch("translate");
    }

    Object.keys(keyframes).forEach((character, index) => {
      console.log("Processing character:", character);
      console.log("각 캐릭터별 타임라인 바 생성");
      console.log(character);
      const timelineBar = new UIRow();
      timelineBar.setClass("timelineBar");
      timelineGroup.add(timelineBar);
      // const characterObj = editor.scene.children.find(
      //   (child) => child.uuid === character,
      // );
      const object = new UIButton(Children.getName(character));
      object.setClass("object");
      timelineBar.add(object);
      object.onClick(function (e) {
        console.log("object clicked");
        // 선택된 object를 editor.selected에 저장
        editor.selected = Children.getChildren(character);
        console.log("editor.selected");
        console.log(editor.selected);
        // 선택된 객체를 표시
        editor.signals.objectSelected.dispatch(editor.selected);
        timelineGroup.dom
          .querySelectorAll(".object.active")
          .forEach(async (object) => {
            await object.classList.remove("active");
          });
        e.currentTarget.classList.add("active");
      });
      // object 우측클릭시
      // object.dom.addEventListener("contextmenu", function (e) {
      //   e.preventDefault(); // 기본 컨텍스트 메뉴 방지
      //   console.log("object");
      //   e.currentTarget
      //     .querySelector(".objectControl")
      //     .classList.toggle("open");
      // });
      // 오브젝트 제어 버튼 생성
      const objectControl = new UIRow();
      objectControl.setClass("objectControl");
      object.add(objectControl);

      const objectDelBtn = new UIButton("del");
      objectDelBtn.setClass("objectDelBtn");
      objectControl.add(objectDelBtn);
      objectDelBtn.onClick(function () {
        console.log("objectDelBtn");
      });

      const keyframes = editor.scene.userData.keyframes[character] || [];
      console.log(editor.scene.userData.keyframes[character]);

      for (let i = 0; i < totalSeconds; i++) {
        const keyframeButton = new UIButton();
        keyframeButton.setClass("frameButton");
        keyframeButton.onClick(async (e) => {
          console.log("keyframeButton");
          console.log(i);
          console.log(character);
          addKeyframe(i, character, e.target);
        });
        timelineBar.add(keyframeButton);
        if (
          keyframes.filter((val) => val.frameIndex / framesPerSecond == i)
            .length > 0
        ) {
          console.log(i);
          addPoint(keyframeButton);
          // const keyframePoint = new UIText();
          // keyframePoint.setClass("point");
          // keyframeButton.add(keyframePoint);
        }
      }

      // 키프레임 표시

      // frames.forEach((frame) => {
      //   const keyframeButton = new UIText();
      //   keyframeButton.setClass("point");
      //   keyframeButton.add(keyframeButton);
      // });
      /*
      // 타임라인 클릭 시 키프레임 추가 및 현재 키프레임 변경
      timelineBarFrameButton.onClick(async (event) => {
        const rect = timelineBar.dom.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const totalWidth = rect.width;
        const frameIndex = Math.floor((clickX / totalWidth) * totalSeconds);

        currentKeyframeIndex = frameIndex; // 현재 키프레임 인덱스 업데이트
        // currentFrameText.setValue(`Current Frame: ${frameIndex}`); // 현재 프레임 텍스트 업데이트

        addKeyframe(frameIndex, clickX, timelineBar);
      });
      */
    });

    // 타임라인 클릭 시 키프레임 추가 및 현재 키프레임 변경
  }
  function addPoint(parent) {
    const keyframePoint = new UIText();
    keyframePoint.setClass("point");
    // const ui = new UIButton(parent);
    parent.add(keyframePoint);
    // console.log("parent");
    // console.log(ui);
    // parent.dom.appendChild(keyframePoint.dom);
  }
  function addPointTarget(target) {
    const keyframePoint = new UIText();
    keyframePoint.setClass("point");
    const keyframePointDom = document.createElement("span");
    keyframePointDom.classList.add("point");
    // target.add(keyframePoint);
    target.appendChild(keyframePointDom);
  }
  // 각 캐릭터별 타임라인 바 생성

  /*
  // 타임라인 바 생성
  const timelineBar = new UIPanel();
  timelineBar.setClass("timelineBar");
  // timelineBar.setStyle("position", "relative");
  // timelineBar.setStyle("height", "50px");
  // timelineBar.setStyle("background", "#333");
  // timelineBar.setStyle("border", "1px solid #ccc");
  container.add(timelineBar);

  // const timelineBar = document.createElement("div");
  // timelineBar.setAttribute("id", "timelineBar");
  // timelineBar.style.position = "absolute";
  // timelineBar.style.top = "10px";
  // timelineBar.style.left = "10px";
  // timelineBar.style.color = "white";
  // timelineBar.style.fontFamily = "system-ui";
  // timelineBar.style.fontSize = "12px";
  // timelineBar.style.textShadow = "0 0 2px black";
  // output.document.body.appendChild(timelineBar);
  // container.add(timelineBar);

  // 현재 프레임 텍스트
  const currentFrameText = new UIText("Current Frame: 0");
  // currentFrameText.setStyle("color", "white");
  // currentFrameText.setStyle("position", "absolute");
  // currentFrameText.setStyle("top", "10px");
  // currentFrameText.setStyle("left", "10px");
  timelineBar.add(currentFrameText);
*/
  // renderButton 버튼
  const renderButton = new UIButton("Render");
  container.add(renderButton);
  renderButton.onClick(function () {
    renderPlay(0);
    // action.isRunning() ? action.stop() : action.play();
    // playButton.setTextContent(getButtonText(play));
  });

  // play 버튼
  const playButton = new UIButton("Play");
  container.add(playButton);
  playButton.onClick(function () {
    playTimeline(0);
  });
  // play 버튼
  const stopButton = new UIButton("stop");
  container.add(stopButton);
  stopButton.onClick(function () {
    clearInterval(playInterval); // 애니메이션 종료
  });

  // 키프레임 저장 배열
  const keyframes = [];
  let currentKeyframeIndex = -1;

  // 키프레임 추가 함수
  function addKeyframe(seconds, characterUuid, target) {
    const frameIndex = seconds * framesPerSecond; // 초를 프레임으로 변환

    // 키프레임 배열이 존재하지 않으면 초기화
    if (!editor.scene.userData.keyframes) {
      editor.scene.userData.keyframes = {};
    }

    if (!editor.scene.userData.keyframes[characterUuid]) {
      editor.scene.userData.keyframes[characterUuid] = [];
    }
    const character = Children.getChildren(characterUuid);
    // 새로운 키프레임 추가
    const keyframes = editor.scene.userData.keyframes[characterUuid];
    const existingIndex = keyframes.findIndex(
      (item) => item.frameIndex === frameIndex,
    );

    if (existingIndex !== -1) {
      // 기존 frameIndex가 있으면 삭제
      keyframes.splice(existingIndex, 1);
    }

    // 새로운 키프레임 추가
    keyframes.push({
      frameIndex: frameIndex,
      position: character.position.clone(),
    });
    // 키프레임을 frameIndex 기준으로 정렬
    // editor.scene.userData.keyframes[characterUuid].sort(
    //   (a, b) => a.frameIndex - b.frameIndex,
    // );
    // 키프레임을 frameIndex 기준으로 정렬
    editor.scene.userData.keyframes[characterUuid].sort(
      (a, b) => a.frameIndex - b.frameIndex,
    );
    message(
      "alert",
      `Keyframe added at ${seconds} seconds (${frameIndex} frames) for character ${characterUuid}`,
    );
    console.log(editor.scene.userData);
    // onload();
    addPointTarget(target);
  }

  // 타임라인 플레이 시 애니메이션 적용
  function playTimeline(currentSecond) {
    console.log("playTimeline");

    // editor 객체가 이미 존재하는지 확인
    if (!editor) {
      console.error("Editor is not initialized.");
      return;
    }

    playInterval = setInterval(() => {
      currentSecond++;
      if (currentSecond >= totalSeconds) {
        clearInterval(playInterval); // 애니메이션 종료
        return;
      }

      // 현재 프레임 레이블 업데이트
      // currentSecondText.setValue(`Current Frame: ${currentSecond}`); // 현재 프레임 텍스트 업데이트

      // 키프레임 사이의 보간 애니메이션 실행
      interpolateAnimation(currentSecond);
      console.log(editor.scene.children[0].position.x);
    }, 1000); // 30 FPS로 설정
  }

  function interpolateAnimation(currentSecond) {
    console.log("interpolateAnimation");
    const currrentFrame = currentSecond * framesPerSecond;
    updateCurrentFrameBar(currentSecond);
    const keyframes = editor.scene.userData.keyframes; // 키프레임 가져오기

    // 각 객체에 대해 키프레임 보간 수행
    Object.keys(keyframes).forEach((uuid) => {
      const frames = keyframes[uuid];
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].frameIndex <= currrentFrame) {
          const character = Children.getChildren(uuid);
          const pos = frames[i].position;
          character.position.copy(pos); // 이전 키프레임의 위치로 설정
          signals.transformModeChanged.dispatch("translate");
        }
      }
    });
  }
  /*
  function interpolateAnimation(currentFrame) {
    console.log("interpolateAnimation");

    const keyframes = editor.scene.userData.keyframes; // 키프레임 가져오기

    // 각 객체에 대해 키프레임 보간 수행
    Object.keys(keyframes).forEach((uuid) => {
      const frames = keyframes[uuid];
      let prevFrame = null;
      let nextFrame = null;

      // 현재 프레임에 해당하는 이전 및 다음 키프레임 찾기
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].frameIndex <= currentFrame) {
          prevFrame = frames[i];
        }
        if (frames[i].frameIndex > currentFrame && nextFrame === null) {
          nextFrame = frames[i];
          break;
        }
      }

      const character = editor.scene.children.find(
        (child) => child.uuid === uuid,
      );
      if (character) {
        if (prevFrame && nextFrame) {
          const t =
            (currentFrame - prevFrame.frameIndex) /
            (nextFrame.frameIndex - prevFrame.frameIndex); // 보간 계수

          // 이전 및 다음 키프레임의 위치 가져오기
          const prevPos = prevFrame.position;
          const nextPos = nextFrame.position;

          // 선형 보간
          character.position.x = prevPos.x + (nextPos.x - prevPos.x) * t;
          character.position.y = prevPos.y + (nextPos.y - prevPos.y) * t;
          character.position.z = prevPos.z + (nextPos.z - prevPos.z) * t;
        } else if (prevFrame) {
          // 현재 프레임이 마지막 키프레임 이후인 경우
          const prevPos = prevFrame.position;
          character.position.copy(prevPos); // 이전 키프레임의 위치로 설정
        }
      }
    });
  }
*/
  // 타임라인 플레이 시 애니메이션 적용
  function renderPlay() {
    console.log("renderPlay");
    // data에 키프레임이 있는지 확인
    const keyframes = editor.scene.userData.keyframes;
    if (!keyframes) {
      console.log("No keyframes found. Exiting function.");
      return; // 함수 종료
    }
    // Three.js 기본 설정
    const editorScene = editor.scene; // editor의 씬 사용
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);

    // 캐릭터 크기 조정 및 애니메이션 믹서 설정
    const mixers = [];
    editorScene.children.forEach((character) => {
      // character.scale.set(0.1, 0.1, 0.1); // 캐릭터 크기를 절반으로 줄임

      // 애니메이션 믹서 설정
      const mixer = new THREE.AnimationMixer(character);
      mixers.push(mixer);

      // 모든 애니메이션 클립을 재생
      character.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    });

    // Clock 초기화
    const clock = new THREE.Clock();

    let currentFrame = 0;
    const totalSeconds = 180;
    let isPlaying = true; // 재생 상태 변수

    // renderer 초기화
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(1200, 800);
    renderer.setClearColor(0xf0f0f0, 1); // 배경색을 밝은 회색으로 설정

    // 새 창 열기
    const newWindow = window.open("", "", "width=1200,height=800"); // 높이를 늘려 컨트롤러 공간 확보
    if (newWindow) {
      newWindow.document.body.style.margin = "0";
      newWindow.document.body.appendChild(renderer.domElement);

      // 비디오 컨트롤러 추가
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

      // 버튼 이벤트 설정
      playButton.addEventListener("click", () => {
        isPlaying = true;
        animate();
      });

      pauseButton.addEventListener("click", () => {
        isPlaying = false;
        renderer.dispose();
      });
      // OrbitControls 초기화
      const controls = new OrbitControls(camera, renderer.domElement);
      // 카메라 위치 설정
      camera.position.set(0, 0, 100);
      camera.lookAt(editorScene.position);
      controls.update();
      // 조명 추가
      /*
      // 렌더러 설정
      renderer.shadowMap.enabled = true; // 그림자 맵 활성화
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 그림자 맵 타입 설정

      // 조명 설정
      const spotLight = new THREE.SpotLight(0xffffff);
      spotLight.position.set(10, 10, 10);
      spotLight.castShadow = true; // 조명에서 그림자 활성화

      // 그림자 맵 크기 설정
      spotLight.shadow.mapSize.width = 1024;
      spotLight.shadow.mapSize.height = 1024;

      // 그림자 카메라 설정
      spotLight.shadow.camera.near = 0.5;
      spotLight.shadow.camera.far = 50;

      // 씬에 조명 추가
      scene.add(spotLight);

      // 그림자를 투사할 객체
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
      );
      cube.castShadow = true; // 객체에서 그림자 활성화
      scene.add(cube);
*/
      // const spotLight = new THREE.SpotLight(0xffffff);
      // spotLight.position.set(100, 1000, 100);
      // // spotLight.map = new THREE.TextureLoader().load(url);

      // spotLight.castShadow = true;

      // spotLight.shadow.mapSize.width = 1024;
      // spotLight.shadow.mapSize.height = 1024;

      // spotLight.shadow.camera.near = 500;
      // spotLight.shadow.camera.far = 4000;
      // spotLight.shadow.camera.fov = 30;

      // scene.add(spotLight);
      // const light = new THREE.AmbientLight(0xffffff, 0.5);
      // scene.add(light);

      // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      // directionalLight.position.set(1, 1, 1).normalize();
      // scene.add(directionalLight);

      // 씬에서 이미 추가된 조명을 찾기
      const existingLights = editorScene.children.filter(
        (child) => child.isLight,
      );
      const background = editorScene.children.filter(
        (child) => child.name == "background.obj",
      );

      if (existingLights.length > 0) {
        console.log("Using existing lights:", existingLights);
        // 필요한 경우, 기존 조명을 조정하거나 사용할 수 있습니다.
        existingLights.forEach((light) => {
          // 예: 조명의 강도를 조정
          // light.intensity = 0.5;
        });
      } else {
        console.log("No existing lights found in the scene.");
      }

      // 새 창이 닫힐 때 애니메이션 중단
      newWindow.addEventListener("unload", () => {
        isPlaying = false;
        renderer.dispose(); // 렌더러 정리
      });

      function animate() {
        console.log(isPlaying);
        console.log("currentFrame");
        console.log(currentFrame);
        if (!isPlaying || currentFrame == totalSeconds * framesPerSecond)
          return; // 애니메이션 중단
        requestAnimationFrame(animate);

        if (isPlaying) {
          // 애니메이션 믹서 업데이트
          const delta = clock.getDelta();
          mixers.forEach((mixer) => mixer.update(delta));

          // 각 캐릭터의 위치 업데이트
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
              console.log("prevFrame");
              console.log(prevFrame.position);
              character.position.copy(prevFrame.position);
            }
          });

          // 현재 프레임 레이블 업데이트
          // currentFrameText.setValue(`Current Frame: ${currentFrame}`);

          // 다음 프레임으로 이동
          currentFrame = currentFrame + 1;
        }

        // 씬 렌더링
        renderer.render(editorScene, camera);
      }

      // 애니메이션 시작
      animate();
    }
  }

  return container;
}

export { VideoEditTimeline };
