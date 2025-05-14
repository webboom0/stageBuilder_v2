import * as THREE from "three";
import { UIPanel, UIRow, UIButton, UIText } from "./libs/ui.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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

  const signals = editor.signals;
  const totalSeconds = 180; // 예시로 180초
  const framesPerSecond = 30;
  let playInterval = null; // 타임라인 플레이 인터벌

  const container = new UIPanel();
  container.setId("videoEditTimeline");

  function createPlane() {
    console.log("createPlane");
    if (!Children.haschildren("38415372-2e99-4c9a-a1ba-b6d9a1977f92")) {
      console.log("바닥생성");
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0x808080 }),
      );
      plane.receiveShadow = true;
      plane.uuid = "38415372-2e99-4c9a-a1ba-b6d9a1977f92";
      plane.rotation.x = -Math.PI / 2;
      editor.scene.add(plane);
    }
  }

  // 트랙 추가 버튼
  const addTrackBtn = new UIButton("add");
  container.add(addTrackBtn);
  addTrackBtn.onClick(function (e) {
    console.log("addTrack clicked");
    if (editor.selected != null) {
      addKeyframe(0, editor.selected.uuid, e.target);
    } else {
      alert("씬에서 객체를 선택해주세요.");
    }
  });

  // 트랙 제거 버튼
  const delTrackBtn = new UIButton("del");
  container.add(delTrackBtn);
  delTrackBtn.onClick(function () {
    console.log("delTrack clicked");
    const selected = editor.selected;
    if (selected != null) {
      delTrack(selected.uuid);
    } else {
      alert("삭제할 트랙을 선택해주세요.");
    }
  });

  function delTrack(selectedUuid) {
    console.log("delTrack");
    const keyframes = editor.scene.userData.keyframes;
    delete keyframes[selectedUuid];
    onload();
  }

  const timelineGroup = new UIRow();
  const timelineTop = new UIRow();
  const currentFrameBar = new UIRow();

  function updateCurrentFrameBar(time) {
    console.log("updateCurrentFrameBar");
    let newLeft = time * 20;
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
    const keyframes = editor.scene.userData.keyframes;
    if (!keyframes) {
      console.log("No keyframes found. Exiting function.");
      return;
    }

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
      console.log("updateAnimationToFrame");
      interpolateAnimation(time);
      signals.transformModeChanged.dispatch("translate");
    }

    Object.keys(keyframes).forEach((character) => {
      console.log("Processing character:", character);
      const timelineBar = new UIRow();
      timelineBar.setClass("timelineBar");
      timelineGroup.add(timelineBar);

      const object = new UIButton(Children.getName(character));
      object.setClass("object");
      timelineBar.add(object);
      object.onClick(function (e) {
        console.log("object clicked");
        editor.selected = Children.getChildren(character);
        editor.signals.objectSelected.dispatch(editor.selected);
        timelineGroup.dom
          .querySelectorAll(".object.active")
          .forEach(async (object) => {
            await object.classList.remove("active");
          });
        e.currentTarget.classList.add("active");
      });

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
          addKeyframe(i, character, e.target);
        });
        timelineBar.add(keyframeButton);
        if (
          keyframes.filter((val) => val.frameIndex / framesPerSecond == i)
            .length > 0
        ) {
          addPoint(keyframeButton);
        }
      }
    });
  }

  function addPoint(parent) {
    const keyframePoint = new UIText();
    keyframePoint.setClass("point");
    parent.add(keyframePoint);
  }

  function addPointTarget(target) {
    const keyframePointDom = document.createElement("span");
    keyframePointDom.classList.add("point");
    target.appendChild(keyframePointDom);
  }

  // 키프레임 추가 함수
  function addKeyframe(seconds, characterUuid, target) {
    const frameIndex = seconds * framesPerSecond;

    if (!editor.scene.userData.keyframes) {
      editor.scene.userData.keyframes = {};
    }

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

    keyframes.push({
      frameIndex: frameIndex,
      position: character.position.clone(),
    });

    editor.scene.userData.keyframes[characterUuid].sort(
      (a, b) => a.frameIndex - b.frameIndex,
    );

    message(
      "alert",
      `Keyframe added at ${seconds} seconds (${frameIndex} frames) for character ${characterUuid}`,
    );
    addPointTarget(target);
  }

  // renderButton 버튼
  const renderButton = new UIButton("Render");
  container.add(renderButton);
  renderButton.onClick(function () {
    renderPlay(0);
  });

  // play 버튼
  const playButton = new UIButton("Play");
  container.add(playButton);
  playButton.onClick(function () {
    playTimeline(0);
  });
  // stop 버튼
  const stopButton = new UIButton("stop");
  container.add(stopButton);
  stopButton.onClick(function () {
    clearInterval(playInterval); // 애니메이션 종료
  });

  // 타임라인 플레이 시 애니메이션 적용
  function playTimeline(currentSecond) {
    console.log("playTimeline");

    if (!editor) {
      console.error("Editor is not initialized.");
      return;
    }

    playInterval = setInterval(() => {
      currentSecond++;
      if (currentSecond >= totalSeconds) {
        clearInterval(playInterval);
        return;
      }

      interpolateAnimation(currentSecond);
    }, 1000);
  }

  function interpolateAnimation(currentSecond) {
    console.log("interpolateAnimation");
    const currrentFrame = currentSecond * framesPerSecond;
    updateCurrentFrameBar(currentSecond);
    const keyframes = editor.scene.userData.keyframes;

    Object.keys(keyframes).forEach((uuid) => {
      const frames = keyframes[uuid];
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].frameIndex <= currrentFrame) {
          const character = Children.getChildren(uuid);
          const pos = frames[i].position;
          character.position.copy(pos);
          signals.transformModeChanged.dispatch("translate");
        }
      }
    });
  }

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
        if (!isPlaying || currentFrame == totalSeconds * framesPerSecond)
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

  return container;
}

export { VideoEditTimeline };
