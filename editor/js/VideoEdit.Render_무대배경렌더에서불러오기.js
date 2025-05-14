import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { UIPanel, UIRow, UIButton } from "./libs/ui.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

class Render {
  constructor(editor, _totalSeconds, _framesPerSecond, _newWindow = true) {
    this.editor = editor;
    this._totalSeconds = _totalSeconds;
    this._framesPerSecond = _framesPerSecond;
    this._newWindow = _newWindow;

    this.editorScene = editor.scene;
    this.camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    this.mixers = [];
    this.clock = new THREE.Clock();
    this.currentFrame = 0;
    this.isPlaying = true;
    this.renderer = new THREE.WebGLRenderer();
    this.scene = null;
    this.audioContext = null;
    this.source = null;
    this.gainNode = null;
    this.pausedAt = 0; // 오디오가 멈춘 시간 저장
    this.state = null; // 상태 저장

    // 렌더러 설정
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const existingContainer = document.getElementById("renderViewContainer");
    if (existingContainer) {
      existingContainer.remove();
    }

    if (!this.editor) {
      console.log("Editor not found");
      return;
    }

    this.renderer.setClearColor(0xf0f0f0, 1);

    this.renderContainer = new UIPanel();
    this.renderContainer.setId("renderViewContainer");

    this.renderView = new UIRow();
    this.renderView.setId("renderView");
    this.renderView.setStyle("background-color", ["#000"]);
    this.renderContainer.add(this.renderView);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderView.dom.appendChild(this.renderer.domElement);

    this.timeText = document.createElement("div");
    this.timeText.classList.add("timeText");
    this.timeText.innerText = "00:00:00";

    this.controlsDiv = new UIRow();
    this.controlsDiv.setClass("controlsDiv");
    this.renderView.add(this.controlsDiv);

    this.playButton = new UIButton();
    this.playButton.setClass("playButton button-3d");
    this.playButton.dom.innerHTML = `<i class="fas fa-play"></i> <span class="blind">재생</span>`;
    this.controlsDiv.add(this.playButton);

    this.pauseButton = new UIButton();
    this.pauseButton.setClass("PauseButton button-3d");
    this.pauseButton.dom.innerHTML = `<i class="fas fa-pause"></i> <span class="blind">일시정지</span>`;
    this.controlsDiv.add(this.pauseButton);

    this.stopButton = new UIButton();
    this.stopButton.setClass("stopButton button-3d");
    this.stopButton.dom.innerHTML = `<i class="fas fa-stop"></i> <span class="blind">정지</span>`;
    this.controlsDiv.add(this.stopButton);

    this.controlsDiv.dom.appendChild(this.timeText);

    this.playButton.dom.addEventListener("click", this.renderPlay.bind(this));
    this.pauseButton.dom.addEventListener("click", this.renderPause.bind(this));
    this.stopButton.dom.addEventListener("click", this.renderStop.bind(this));

    document.body.addEventListener("mousedown", (event) => {
      if (
        !event.target.closest("#renderViewContainer") &&
        document.getElementById("renderViewContainer") != null
      ) {
        this.renderClose();
        document.getElementById("renderViewContainer").remove();
      }
    });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(0, 10, 100);
    this.camera.lookAt(this.editorScene.position);
    this.controls.update();

    document.body.appendChild(this.renderContainer.dom);

    this.animate = this.animate.bind(this);
    this.animate();

    // 오디오 초기화 및 재생
    this.initAudio();
    this.initMixers();
    // ***************** 배경 추가부분 시가
    this.scene = new THREE.Scene();
    this.scene.copy(this.editorScene);
    this.isBackgroundLoaded = false;

    // 조명 설정
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(1, 1, 1);

    this.scene.add(this.ambientLight);
    this.scene.add(this.directionalLight);

    // 배경 객체 로드
    const loader = new OBJLoader();
    loader.load("/files/background.obj", (object) => {
      console.log("Background loading started");

      object.name = "Background";
      object.position.set(-50, 100, 100);
      object.rotation.set(0, 0, 90);
      object.scale.set(-0.14, -0.14, -0.14);

      object.traverse((child) => {
        if (child.isMesh) {
          console.log("Setting up mesh material");
          child.material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0, // 불투명도 증가
            shininess: 100,
            specular: 0x444444,
            side: THREE.DoubleSide,
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.backgroundObject = object;
      this.scene.add(this.backgroundObject);
      console.log("Background added to scene");
      console.log("Scene children count:", this.scene.children.length);

      this.isBackgroundLoaded = true;

      // 카메라 위치 조정
      this.camera.position.set(0, 10, 100);
      this.camera.lookAt(object.position);
      this.controls.update();

      // 즉시 한 번 렌더링
      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }

      // 애니메이션 시작
      this.animate = this.animate.bind(this);
      this.animate();

      console.log("Background loaded successfully");
    });
    // this.render = function () {
    //   console.log("Render Start");

    //   // scene이 없으면 에디터 씬을 복사
    //   if (!this.scene) {
    //     this.scene = new THREE.Scene();
    //     this.scene.copy(this.editorScene);
    //   }

    //   // 배경 추가
    //   if (backgroundObject) {
    //     this.scene.add(backgroundObject);
    //   }

    //   // 렌더러 설정
    //   this.renderer.setSize(window.innerWidth, window.innerHeight);
    //   this.renderer.setPixelRatio(window.devicePixelRatio);

    //   // 조명 설정
    //   const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    //   this.scene.add(ambientLight);

    //   const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    //   directionalLight.position.set(1, 1, 1);
    //   this.scene.add(directionalLight);

    //   // 카메라 설정
    //   this.camera.aspect = window.innerWidth / window.innerHeight;
    //   this.camera.updateProjectionMatrix();

    //   // 렌더링 실행
    //   this.renderer.clear();
    //   this.renderer.render(this.scene, this.camera);

    //   // 배경 제거
    //   if (backgroundObject) {
    //     this.scene.remove(backgroundObject);
    //   }

    //   // 조명 제거
    //   this.scene.remove(ambientLight);
    //   this.scene.remove(directionalLight);

    //   console.log("Render Complete");
    // };
  } //constructor

  initAudio() {
    const musicEditor = this.editor.music;
    if (musicEditor && musicEditor.toJSON) {
      const audioState = musicEditor.toJSON().audioState;
      if (audioState && audioState.audioUrl) {
        this.audioContext = new(window.AudioContext ||
          window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = audioState.volume || 0.5;
        this.gainNode.connect(this.audioContext.destination);

        fetch(audioState.audioUrl)
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => {
            this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
              this.source = this.audioContext.createBufferSource();
              this.source.buffer = buffer;
              this.source.connect(this.gainNode);

              const startTime = audioState.markerStartTime || 0;
              const endTime = audioState.markerEndTime;
              const duration = endTime - startTime;

              this.source.start(0, startTime, duration);
              this.source.onended = () => {
                console.log("Audio playback ended");
              };
            });
          })
          .catch((error) => {
            console.error("Error loading audio:", error);
          });
      }
    }
  }

  loadAudio(url, startTime = 0, endTime) {
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
          this.source = this.audioContext.createBufferSource();
          this.source.buffer = buffer;
          this.source.connect(this.gainNode);

          const duration = endTime ? endTime - startTime : buffer.duration;
          this.source.start(0, startTime, duration);
          this.source.onended = () => {
            console.log("Audio playback ended");
          };
        });
      })
      .catch((error) => {
        console.error("Error loading audio:", error);
      });
  }

  initMixers() {
    this.mixers = [];
    this.editorScene.children.forEach((character) => {
      const mixer = new THREE.AnimationMixer(character);
      this.mixers.push(mixer);
      character.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    });
  }

  animate() {
    if (!this.isBackgroundLoaded) {
      console.log("Waiting for background to load...");
      return;
    }
    console.log("animate");
    console.log(this.currentFrame);
    if (
      !this.isPlaying ||
      this.currentFrame >= this._totalSeconds * this._framesPerSecond
    ) {
      return;
    }

    requestAnimationFrame(this.animate);

    // 오디오 컨텍스트의 현재 시간을 기준으로 프레임 계산
    if (this.audioContext && this.source) {
      const currentAudioTime = this.audioContext.currentTime;
      const expectedFrame = Math.floor(
        currentAudioTime * this._framesPerSecond,
      );

      // 오디오 시간과 프레임을 동기화
      if (Math.abs(this.currentFrame - expectedFrame) > 1) {
        this.currentFrame = expectedFrame;
      }
    }

    const delta = this.clock.getDelta();
    this.mixers.forEach((mixer) => mixer.update(delta));
    if (this.editorScene.userData.keyframes) {
      this.editorScene.children.forEach((character) => {
        const frames =
          this.editorScene.userData.keyframes[character.uuid] || [];
        let prevFrame = null;
        let nextFrame = null;

        for (let i = 0; i < frames.length; i++) {
          if (frames[i].frameIndex <= this.currentFrame) {
            prevFrame = frames[i];
          }
          if (frames[i].frameIndex > this.currentFrame && nextFrame === null) {
            nextFrame = frames[i];
            break;
          }
        }

        if (prevFrame && nextFrame) {
          const t =
            (this.currentFrame - prevFrame.frameIndex) /
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
    }

    // 시간 표시 업데이트
    const seconds = Math.floor(this.currentFrame / this._framesPerSecond);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const displaySeconds = seconds % 60;
    const displayMinutes = minutes % 60;
    const displayHours = hours;

    this.timeText.innerHTML = `${displayHours
      .toString()
      .padStart(2, "0")}:${displayMinutes
      .toString()
      .padStart(2, "0")}:${displaySeconds.toString().padStart(2, "0")}`;

    // 프레임마다 배경 체크 및 추가
    if (this.renderer && this.backgroundObject) {
      // 배경이 씬에 없으면 추가
      if (!this.scene.children.includes(this.backgroundObject)) {
        console.log("Re-adding background to scene");
        this.scene.add(this.backgroundObject);
      }

      // 조명이 씬에 있는지 확인
      if (!this.scene.children.includes(this.ambientLight)) {
        this.scene.add(this.ambientLight);
      }
      if (!this.scene.children.includes(this.directionalLight)) {
        this.scene.add(this.directionalLight);
      }

      // 렌더링
      this.renderer.render(this.scene, this.camera);
    }
    this.currentFrame += 1;
  }

  renderPlay() {
    this.isPlaying = true;
    if (!this.lastTime) this.lastTime = performance.now();

    // 오디오 재생 시작 시간 설정
    if (this.state === "pause") {
      console.log("오디오 재생");
      const musicEditor = this.editor.music;
      const audioState = musicEditor.toJSON().audioState;
      this.loadAudio(
        audioState.audioUrl,
        this.pausedAt,
        audioState.markerEndTime,
      );
      // 현재 프레임을 오디오 시간과 동기화
      this.currentFrame = Math.floor(this.pausedAt * this._framesPerSecond);
    } else {
      console.log("오디오 초기화");
      this.initAudio();
      this.currentFrame = 0;
    }

    // 애니메이션 믹서 초기화
    if (this.mixers.length === 0) {
      this.initMixers();
    } else {
      this.mixers.forEach((mixer) => {
        mixer.timeScale = 1;
        mixer.update(0);
      });
    }

    this.animate();
    this.state = "play";
  }

  renderPause() {
    this.isPlaying = false;
    if (this.source) {
      try {
        this.source.stop();
        // 현재 재생 위치 저장
        this.pausedAt = this.audioContext.currentTime;
      } catch (e) {
        console.log("Audio source already stopped");
      }
      // this.source = null; // 오디오 소스를 null로 설정하여 재생 시 새로 설정되도록 함
    }
    this.state = "pause";
  }

  renderStop() {
    this.isPlaying = false;
    this.currentFrame = 0;
    if (this.lastTime) this.lastTime = null;

    // 오디오 정지
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        console.log("Audio source already stopped");
      }
      this.source = null; // 오디오 소스를 null로 설정하여 재생 시 새로 설정되도록 함
    }

    // 믹서 액션 정지
    if (this.mixers) {
      this.mixers.forEach((mixer) => {
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
        this.initMixers();
      });
    }

    // 캐릭터 초기 위치로 설정
    this.resetAnimation();

    // 처음 프레임 렌더링
    // if (this.renderer && this.scene && this.camera) {
    //   this.editorScene.children.forEach((character) => {
    //     const frames =
    //       this.editorScene.userData.keyframes[character.uuid] || [];
    //     if (frames.length > 0) {
    //       character.position.copy(frames[0].position); // 첫 번째 프레임의 위치로 설정
    //     }
    //   });
    //   this.renderer.render(this.scene, this.camera);
    // }

    // 마지막 프레임 렌더링
    // if (this.renderer && this.scene && this.camera) {
    //   this.renderer.render(this.scene, this.camera);
    // }
    this.state = "stop";
  }
  // resetAnimation() {
  //   this.editorScene.children.forEach((character) => {
  //     const initialPosition =
  //       this.editorScene.userData.keyframes[character.uuid]?.[0]?.position;
  //     if (initialPosition) {
  //       character.position.copy(initialPosition);
  //     }
  //   });
  //   this.timeText.innerText = "00:00:00";
  // }
  resetAnimation() {
    // keyframes가 존재하는지 확인
    if (!this.editorScene ? .userData ? .keyframes) {
      console.warn("No keyframes data available");
      return;
    }

    this.editorScene.children.forEach((character) => {
      try {
        const keyframesForCharacter =
          this.editorScene.userData.keyframes[character.uuid];
        if (keyframesForCharacter && keyframesForCharacter[0] ? .position) {
          character.position.copy(keyframesForCharacter[0].position);
        }
      } catch (error) {
        console.warn(
          `Error resetting animation for character ${character.uuid}:`,
          error,
        );
      }
    });

    // 타임 텍스트 초기화
    if (this.timeText) {
      this.timeText.innerText = "00:00:00";
    }
  }
  renderClose() {
    this.isPlaying = false;
    console.log("renderClose");
    console.log(this.source);
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.mixers) {
      this.mixers.forEach((mixer) => {
        mixer.stopAllAction();
        mixer.uncacheRoot(mixer.getRoot());
      });
      this.mixers = [];
    }
    this.isPlaying = false;

    if (this.backgroundObject) {
      this.scene.remove(this.backgroundObject);
      this.backgroundObject.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      this.backgroundObject = null;
    }
    const canvas = document.querySelector("#renderViewContainer canvas");
    if (canvas) canvas.remove();
    this.camera = null;
    this.editorScene = null;
    this.scene = null;
    this.clock = null;
    this.state = "stop";
  }
}

export { Render };