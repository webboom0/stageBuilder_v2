
// editor/timeline/VideoTimeline.js
import { BaseTimeline } from "./BaseTimeline.js";
import * as THREE from "three";

export class VideoTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.createBackground();
  }

  createBackground() {
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

    video.onerror = (e) => {
      console.error("비디오 로드 에러:", e);
    };

    if (this.editor.renderer) {
      this.editor.renderer.preserveDrawingBuffer = true;
      this.editor.renderer.autoClear = false;
    }

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    const material = new THREE.MeshBasicMaterial({ map: videoTexture });
    const geometry = new THREE.PlaneGeometry(16, 9);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -10;
    this.editor.scene.add(mesh);
  }
}
