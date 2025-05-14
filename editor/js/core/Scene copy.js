// editor/core/Scene.js
import * as THREE from "three";

class Scene extends THREE.Scene {
  constructor(id, name = `Scene ${id}`) {
    super();
    this.id = id;
    this.name = name;
    this.initializeUserData();
    this.initializeDefaultObjects();
  }

  initializeUserData() {
    this.userData = {
      // 씬 메타데이터
      meta: {
        id: this.id,
        name: this.name,
        created: Date.now(),
        modified: Date.now(),
      },

      // 애니메이션 데이터
      animation: {
        keyframes: {},
        duration: 180, // 기본 3분
        fps: 30, // 초당 프레임
        currentFrame: 0,
        totalFrames: 180 * 30, // duration * fps
      },

      // 음악 데이터
      music: {
        name: null,
        path: null,
        audioUrl: null,
        startTime: 0,
        endTime: 0,
        volume: 0.5,
        fileInfo: null,
      },

      // 렌더링 설정
      render: {
        width: 1600,
        height: 900,
        backgroundColor: 0xf0f0f0,
        camera: {
          position: { x: 0, y: 10, z: 110 },
          target: { x: 0, y: 0, z: 0 },
        },
      },
    };
  }

  initializeDefaultObjects() {
    // Stage 그룹 생성
    const stageGroup = new THREE.Group();
    stageGroup.name = "Stage";
    this.add(stageGroup);

    // 기본 조명 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    ambientLight.name = "Ambient Light";
    this.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 200, 100);
    directionalLight.name = "Directional Light";
    this.add(directionalLight);
  }

  // 키프레임 관리
  addKeyframe(objectId, frameData) {
    if (!this.userData.animation.keyframes[objectId]) {
      this.userData.animation.keyframes[objectId] = [];
    }

    const frames = this.userData.animation.keyframes[objectId];
    const frameIndex = frameData.frameIndex;

    // 같은 프레임이 있으면 업데이트, 없으면 추가
    const existingFrameIndex = frames.findIndex(
      (f) => f.frameIndex === frameIndex
    );
    if (existingFrameIndex !== -1) {
      frames[existingFrameIndex] = {
        ...frames[existingFrameIndex],
        ...frameData,
      };
    } else {
      frames.push(frameData);
      frames.sort((a, b) => a.frameIndex - b.frameIndex);
    }

    this.userData.meta.modified = Date.now();
  }

  getKeyframesAtFrame(frame) {
    const result = {};
    Object.entries(this.userData.animation.keyframes).forEach(
      ([objectId, frames]) => {
        const prevFrame = frames.filter((f) => f.frameIndex <= frame).pop();
        const nextFrame = frames.find((f) => f.frameIndex > frame);
        if (prevFrame || nextFrame) {
          result[objectId] = { prevFrame, nextFrame };
        }
      }
    );
    return result;
  }

  // 음악 관리
  setMusic(musicData) {
    this.userData.music = {
      ...this.userData.music,
      ...musicData,
    };
    this.userData.meta.modified = Date.now();
  }

  // 씬 데이터 관리
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      objects: super.toJSON(),
      userData: this.userData,
    };
  }

  fromJSON(json) {
    this.id = json.id;
    this.name = json.name;
    this.userData = json.userData;
    super.fromJSON(json.objects);
  }

  // 씬 복제
  clone(newId) {
    const newScene = new Scene(newId, `${this.name} Copy`);
    newScene.copy(this);
    newScene.userData = JSON.parse(JSON.stringify(this.userData));
    newScene.userData.meta.id = newId;
    newScene.userData.meta.created = Date.now();
    newScene.userData.meta.modified = Date.now();
    return newScene;
  }

  // 씬 초기화
  clear() {
    // 기본 객체 제외한 모든 객체 제거
    const objectsToRemove = this.children.filter(
      (child) =>
        child.name !== "Stage" &&
        child.name !== "Ambient Light" &&
        child.name !== "Directional Light"
    );
    objectsToRemove.forEach((obj) => this.remove(obj));

    // 애니메이션 데이터 초기화
    this.userData.animation.keyframes = {};
    this.userData.animation.currentFrame = 0;

    // 음악 데이터 초기화
    this.userData.music = {
      name: null,
      path: null,
      audioUrl: null,
      startTime: 0,
      endTime: 0,
      volume: 0.5,
      fileInfo: null,
    };

    this.userData.meta.modified = Date.now();
  }
}

export { Scene };
