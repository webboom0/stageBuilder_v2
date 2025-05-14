import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function VideoEditVideo(editor, _totalSeconds, _framesPerSecond) {
  // 타임라인 플레이 시 애니메이션 적용
  //   function renderPlay() {
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
      (child) => child.isLight
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
              t
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
  //   }
}

export { VideoEditVideo };
