import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { UIPanel, UIRow, UIButton } from "./libs/ui.js";

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

    this.playButton = new UIButton("play");
    this.playButton.setClass("playButton");
    this.controlsDiv.add(this.playButton);

    this.pauseButton = new UIButton("pause");
    this.pauseButton.setClass("PauseButton");
    this.controlsDiv.add(this.pauseButton);

    this.stopButton = new UIButton("stop");
    this.stopButton.setClass("stopButton");
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
  }

  initAudio() {
    const musicEditor = this.editor.music;
    if (musicEditor && musicEditor.toJSON) {
      const audioState = musicEditor.toJSON().audioState;
      if (audioState && audioState.audioUrl) {
        this.audioContext = new (window.AudioContext ||
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
        currentAudioTime * this._framesPerSecond
      );

      // 오디오 시간과 프레임을 동기화
      if (Math.abs(this.currentFrame - expectedFrame) > 1) {
        this.currentFrame = expectedFrame;
      }
    }

    const delta = this.clock.getDelta();
    this.mixers.forEach((mixer) => mixer.update(delta));

    this.editorScene.children.forEach((character) => {
      const frames = this.editorScene.userData.keyframes[character.uuid] || [];
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
          t
        );
      } else if (prevFrame) {
        character.position.copy(prevFrame.position);
      }
    });

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

    this.currentFrame += 1;

    if (this.renderer) {
      this.renderer.render(this.editorScene, this.camera);
    }
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
        audioState.markerEndTime
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
  resetAnimation() {
    this.editorScene.children.forEach((character) => {
      const initialPosition =
        this.editorScene.userData.keyframes[character.uuid]?.[0]?.position;
      if (initialPosition) {
        character.position.copy(initialPosition);
      }
    });
    this.timeText.innerText = "00:00:00";
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
