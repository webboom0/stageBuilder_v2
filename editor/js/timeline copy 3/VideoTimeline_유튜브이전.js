// editor/timeline/MotionTimeline.js
import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";

class VideoTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    // this.createBackground();
  }

  createBackground() {
    // 비디오 요소 생성
    const video = document.createElement("video");
    video.src = "/files/video2.mp4";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("x5-video-player-type", "h5");
    video.setAttribute("x5-video-player-fullscreen", "true");

    // 비디오 로드 에러 처리
    video.onerror = (e) => {
      console.error("비디오 로드 에러:", e);
    };

    // WebGL 렌더러 설정 수정
    if (this.editor.renderer) {
      this.editor.renderer.preserveDrawingBuffer = true;
      this.editor.renderer.autoClear = false;
    }

    // 비디오 텍스처 생성
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    // 배경 평면 생성
    const geometry = new THREE.PlaneGeometry(200, 112.5);
    const material = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const background = new THREE.Mesh(geometry, material);
    background.position.set(0, 0, -50);
    background.name = "_VideoBackground";
    background.userData.isBackground = true;
    background.userData.notSelectable = true;
    background.userData.notEditable = true;
    background.userData.excludeFromTimeline = true;

    // Stage 그룹 생성 또는 찾기
    let stageGroup = this.editor.scene.children.find(
      (child) => child.name === "Stage",
    );

    if (!stageGroup) {
      console.log("Stage 그룹 생성");
      stageGroup = new THREE.Group();
      stageGroup.name = "Stage";
      this.editor.scene.add(stageGroup);
    }

    console.log("Stage 그룹 찾음");
    const existingBackground = stageGroup.children.find(
      (child) => child.name === "_VideoBackground",
    );
    if (existingBackground) {
      console.log("기존 배경 제거");
      stageGroup.remove(existingBackground);
    }
    console.log("새 배경 추가");
    stageGroup.add(background);

    // 씬 업데이트
    if (this.editor.signals?.sceneGraphChanged) {
      this.editor.signals.sceneGraphChanged.dispatch();
    }

    // 비디오 로드 및 재생 시작
    const loadVideo = async () => {
      try {
        console.log("비디오 로드 시작");
        // 비디오 로드
        await video.load();
        console.log("비디오 로드 완료");

        // 메타데이터 로드 대기
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            console.log("비디오 메타데이터 로드 완료");
            resolve();
          };
          video.onerror = (error) => {
            console.error("비디오 메타데이터 로드 실패:", error);
            reject(error);
          };
        });

        // 사용자 상호작용 후 재생 시도
        const playVideo = async () => {
          try {
            console.log("비디오 재생 시도");
            video.muted = true; // 음소거 설정
            video.playsInline = true; // 인라인 재생 설정
            await video.play();
            console.log("비디오 재생 성공");

            // 비디오 재생 중 텍스처 업데이트
            const updateTexture = () => {
              if (video.readyState === video.HAVE_ENOUGH_DATA) {
                videoTexture.needsUpdate = true;
                material.needsUpdate = true;
                background.material.needsUpdate = true;

                // 렌더러 강제 업데이트
                if (this.editor.renderer) {
                  this.editor.renderer.render(
                    this.editor.scene,
                    this.editor.camera,
                  );
                }
              }
              requestAnimationFrame(updateTexture);
            };
            updateTexture();
          } catch (error) {
            console.error("비디오 재생 실패:", error);
          }
        };

        // Canvas에 이벤트 리스너 추가
        const canvas = document.querySelector("canvas");
        if (canvas) {
          canvas.addEventListener("click", playVideo);
          canvas.addEventListener("touchstart", playVideo);
        }

        // 자동 재생 시도
        try {
          console.log("자동 재생 시도");
          video.muted = true; // 음소거 설정
          video.playsInline = true; // 인라인 재생 설정
          await video.play();
          console.log("자동 재생 성공");

          // 비디오 재생 중 텍스처 업데이트
          const updateTexture = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              videoTexture.needsUpdate = true;
              material.needsUpdate = true;
              background.material.needsUpdate = true;

              // 렌더러 강제 업데이트
              if (this.editor.renderer) {
                this.editor.renderer.render(
                  this.editor.scene,
                  this.editor.camera,
                );
              }
            }
            requestAnimationFrame(updateTexture);
          };
          updateTexture();
        } catch (error) {
          console.log("자동 재생 실패, 사용자 상호작용 대기 중...");
          // 자동 재생 실패 시 사용자에게 안내 메시지 표시
          const message = document.createElement("div");
          message.style.position = "fixed";
          message.style.top = "50%";
          message.style.left = "50%";
          message.style.transform = "translate(-50%, -50%)";
          message.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
          message.style.color = "white";
          message.style.padding = "20px";
          message.style.borderRadius = "5px";
          message.style.zIndex = "1000";
          message.textContent = "Canvas를 클릭하여 비디오를 재생하세요";
          document.body.appendChild(message);

          // 클릭 시 메시지 제거
          const removeMessage = () => {
            message.remove();
            document.removeEventListener("click", removeMessage);
          };
          document.addEventListener("click", removeMessage);
        }
      } catch (error) {
        console.error("비디오 로드 실패:", error);
      }
    };

    loadVideo();

    return background;
  }
}

export { VideoTimeline };
