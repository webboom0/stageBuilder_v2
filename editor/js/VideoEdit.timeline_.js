import * as THREE from "three";
import { UIPanel, UIRow, UIButton, UIText } from "./libs/ui.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
function VideoEditTimeline(editor) {
  const container = new UIPanel();
  container.setId("videoEditTimeline");

  const totalFrames = 180; // 예시로 180프레임 설정

  // Raycaster와 마우스 벡터 초기화
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  /*
  // 마우스 클릭 이벤트 리스너 추가
  window.addEventListener("click", onMouseClick, false);

  function onMouseClick(event) {
    console.log("onMouseClick");
    console.log(event);
    // 마우스 위치를 정규화된 장치 좌표로 변환
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycaster 설정
    raycaster.setFromCamera(mouse, camera);

    // Raycaster로 교차하는 객체 감지
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      selectedObject.material.color.set(0xff0000); // 선택된 상태를 빨간색으로 표시
    }
  }
*/

  // // Raycaster와 마우스 벡터 초기화
  // const raycaster = new THREE.Raycaster();
  // const mouse = new THREE.Vector2();
  // const selectedObjects = [];

  // // 마우스 클릭 이벤트 리스너 추가
  // window.addEventListener("click", onMouseClick, false);

  // function onMouseClick(event) {
  //   // 마우스 위치를 정규화된 장치 좌표로 변환
  //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //   // Raycaster 설정
  //   raycaster.setFromCamera(mouse, editor.camera); // editor.camera가 올바르게 설정되어 있어야 함

  //   // Raycaster로 교차하는 객체 감지
  //   const intersects = raycaster.intersectObjects(editor.scene.children);

  //   if (intersects.length > 0) {
  //     const selectedObject = intersects[0].object;

  //     // Ctrl 키가 눌린 상태인지 확인
  //     if (event.ctrlKey) {
  //       // 선택된 객체가 이미 선택된 상태인지 확인
  //       const index = selectedObjects.indexOf(selectedObject);
  //       if (index === -1) {
  //         // 선택되지 않은 경우 배열에 추가하고 색상 변경
  //         selectedObjects.push(selectedObject);
  //         selectedObject.material.color.set(0x808080); // 선택된 상태를 회색으로 표시
  //       } else {
  //         // 이미 선택된 경우 배열에서 제거하고 색상 복원
  //         selectedObjects.splice(index, 1);
  //         selectedObject.material.color.set(0x00ff00); // 기본 색상으로 복원
  //       }
  //     } else {
  //       // Ctrl 키가 눌리지 않은 경우, 단일 선택으로 전환
  //       selectedObjects.forEach((obj) => obj.material.color.set(0x00ff00)); // 모든 선택된 객체 색상 복원
  //       selectedObjects.length = 0; // 배열 초기화
  //       selectedObjects.push(selectedObject);
  //       selectedObject.material.color.set(0x808080); // 선택된 상태를 회색으로 표시
  //     }
  //   }
  // }

  // load 버튼
  const loadButton = new UIButton("load");
  container.add(loadButton);
  loadButton.onClick(function () {
    onload();
  });
  function onload() {
    const keyframes = editor.scene.userData.keyframes;
    console.log("Number of children in scene:", Object.keys(keyframes).length);
    console.log(keyframes);
    // 기존의 timelineGroup이 있을 경우 삭제
    const existingTimelineGroup = container.dom.querySelector(".timelineGroup");
    if (existingTimelineGroup) {
      container.dom.removeChild(existingTimelineGroup);
    }

    const timelineGroup = new UIRow();
    timelineGroup.setClass("timelineGroup");
    container.add(timelineGroup);
    const timelineTop = new UIRow();
    timelineTop.setClass("top");
    timelineGroup.add(timelineTop);
    for (let i = 0; i < totalFrames; i++) {
      const topframeButton = new UIButton(i);
      topframeButton.setClass("frameButton");
      timelineTop.add(topframeButton);
    }

    Object.keys(keyframes).forEach((character, index) => {
      console.log("Processing character:", character);
      console.log("각 캐릭터별 타임라인 바 생성");
      console.log(character);
      const timelineBar = new UIRow();
      timelineBar.setClass("timelineBar");
      timelineBar.setStyle("position", "relative");
      timelineBar.setStyle("height", "10px");
      timelineBar.setStyle("background", "#333");
      timelineBar.setStyle("margin-bottom", "5px");
      timelineGroup.add(timelineBar);
      const characterObj = editor.scene.children.find(
        (child) => child.uuid === character,
      );
      const object = new UIButton(characterObj.name);
      object.setClass("object");
      timelineBar.add(object);

      const keyframes = editor.scene.userData.keyframes[character] || [];
      console.log(editor.scene.userData.keyframes[character]);

      for (let i = 0; i < totalFrames; i++) {
        const keyframeButton = new UIButton();
        keyframeButton.setClass("frameButton");
        keyframeButton.onClick(async () => {
          console.log("keyframeButton");
          console.log(i);
          console.log(character);
          addKeyframe(i, character);
        });
        timelineBar.add(keyframeButton);
        if (keyframes.filter((val) => val.frameIndex == i).length > 0) {
          console.log(i);
          const keyframePoint = new UIText();
          keyframePoint.setClass("point");
          keyframeButton.add(keyframePoint);
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
        const frameIndex = Math.floor((clickX / totalWidth) * totalFrames);

        currentKeyframeIndex = frameIndex; // 현재 키프레임 인덱스 업데이트
        // currentFrameText.setValue(`Current Frame: ${frameIndex}`); // 현재 프레임 텍스트 업데이트

        addKeyframe(frameIndex, clickX, timelineBar);
      });
      */
    });

    // 타임라인 클릭 시 키프레임 추가 및 현재 키프레임 변경
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
    playTimeline(0);
    // action.isRunning() ? action.stop() : action.play();
    // playButton.setTextContent(getButtonText(play));
  });

  // 키프레임 저장 배열
  const keyframes = [];
  let currentKeyframeIndex = -1;

  // 키프레임 추가 함수
  function addKeyframe(frameIndex, characterUuid) {
    // const keyframeButton = new UIButton();
    // keyframeButton.setClass("point");
    // 현재 3D 객체의 위치를 가져와서 키프레임에 추가
    const objectInfo = editor.scene.children.map((object) => object.clone());
    const objectArr = [];
    // editor.scene.children.forEach((obj) => {
    //   objectArr.push({ childrenid: obj.uuid, position: obj.position.clone() });
    // });

    // editor.scene.children.forEach((obj) => {
    // const characterUuid = obj.uuid;

    // 키프레임 배열이 존재하지 않으면 초기화
    if (!editor.scene.userData.keyframes) {
      editor.scene.userData.keyframes = {};
    }

    if (!editor.scene.userData.keyframes[characterUuid]) {
      editor.scene.userData.keyframes[characterUuid] = [];
    }
    const character = editor.scene.children.find(
      (child) => child.uuid === characterUuid,
    );
    // 새로운 키프레임 추가
    editor.scene.userData.keyframes[characterUuid].push({
      frameIndex: frameIndex,
      position: character.position.clone(),
    });
    // 키프레임을 frameIndex 기준으로 정렬
    editor.scene.userData.keyframes[characterUuid].sort(
      (a, b) => a.frameIndex - b.frameIndex,
    );
    onload();
    // });

    // const objectUuid = editor.scene.children.map((object) => object.uuid);

    // 키프레임에 위치 정보 저장
    // keyframes.push({
    //   // button: keyframeButton,
    //   frameIndex: frameIndex,
    //   objectInfo: objectArr, // 위치 정보를 저장
    // });
    // editor.scene = { ...editor.scene, keyframes: keyframes }; // 객체 배열에 추가 (예시)
    // editor.scene.userData = { keyframes: keyframes };
    // console.log("editor.scene.userData1111111111111");
    // console.log(editor.scene);
    // timelineBar.add(keyframeButton);

    // 씬의 모든 객체를 JSON으로 저장하는 함수
    // function saveScene() {
    //   const json = editor.scene.toJSON();
    //   localStorage.setItem("sceneData", JSON.stringify(json)); // 로컬 스토리지에 저장
    // }

    // keyframeButton.onClick(async () => {
    //   currentKeyframeIndex = keyframes.length; // 현재 키프레임 인덱스 업데이트
    //   currentFrameText.setValue(`Current Frame: ${frameIndex}`); // 현재 프레임 텍스트 업데이트
    //   console.log(
    //     `Keyframe ${currentKeyframeIndex + 1} added at frame: ${frameIndex}`,
    //   );
    // });
    // keyframes.push({ button: keyframeButton, frameIndex: frameIndex });
    // timelineBar.add(keyframeButton);

    console.log(keyframes);
  }

  // 타임라인 플레이 시 애니메이션 적용
  function playTimeline() {
    console.log("playTimeline");

    // Three.js 기본 설정
    const scene = editor.scene; // editor의 씬 사용
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);

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
      camera.lookAt(scene.position);
      controls.update();
      // 조명 추가
      const light = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(light);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1).normalize();
      scene.add(directionalLight);

      // 캐릭터 크기 조정 및 애니메이션 믹서 설정
      const mixers = [];
      scene.children.forEach((character) => {
        character.scale.set(0.1, 0.1, 0.1); // 캐릭터 크기를 절반으로 줄임

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
      const totalFrames = 180;
      let isPlaying = true; // 재생 상태 변수

      // 새 창이 닫힐 때 애니메이션 중단
      newWindow.addEventListener("unload", () => {
        isPlaying = false;
        renderer.dispose(); // 렌더러 정리
      });

      function animate() {
        console.log(isPlaying);
        if (!isPlaying) return; // 애니메이션 중단
        requestAnimationFrame(animate);

        if (isPlaying) {
          // 애니메이션 믹서 업데이트
          const delta = clock.getDelta();
          mixers.forEach((mixer) => mixer.update(delta));

          // 각 캐릭터의 위치 업데이트
          scene.children.forEach((character) => {
            const frames = scene.userData.keyframes[character.uuid] || [];
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

          // 현재 프레임 레이블 업데이트
          // currentFrameText.setValue(`Current Frame: ${currentFrame}`);

          // 다음 프레임으로 이동
          currentFrame = (currentFrame + 1) % totalFrames;
        }

        // 씬 렌더링
        renderer.render(scene, camera);
      }

      // 애니메이션 시작
      animate();
    }
  }

  return container;
}

export { VideoEditTimeline };
