// editor/core/Editor.js
import * as THREE from "three";
import { Scene } from "./Scene.js";
import { Signal } from "../libs/signals.js";

class Editor {
  constructor() {
    // 씬 관리
    this.scenes = new Map();
    this.currentScene = null;
    this.currentSceneId = null;

    // 시그널 초기화
    this.signals = {
      // 씬 관련 시그널
      sceneAdded: new Signal(),
      sceneRemoved: new Signal(),
      sceneChanged: new Signal(),

      // 객체 관련 시그널
      objectAdded: new Signal(),
      objectRemoved: new Signal(),
      objectSelected: new Signal(),
      objectChanged: new Signal(),

      // 히스토리 관련 시그널
      historyChanged: new Signal(),

      // 타임라인 관련 시그널
      timelineChanged: new Signal(),
      frameChanged: new Signal(),

      // 음악 관련 시그널
      musicChanged: new Signal(),

      // 렌더링 관련 시그널
      renderStarted: new Signal(),
      renderFinished: new Signal(),

      // 에디터 상태 관련 시그널
      editorCleared: new Signal(),
      savingStarted: new Signal(),
      savingFinished: new Signal(),
    };

    // 선택된 객체 관리
    this.selected = null;
  }

  // 씬 관리 메서드
  createScene(name) {
    const sceneId = this.scenes.size + 1;
    const scene = new Scene(sceneId, name || `Scene ${sceneId}`);
    this.scenes.set(sceneId, scene);

    if (!this.currentScene) {
      this.setCurrentScene(sceneId);
    }

    this.signals.sceneAdded.dispatch(scene);
    return scene;
  }

  setCurrentScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (scene) {
      this.currentScene = scene;
      this.currentSceneId = sceneId;
      this.signals.sceneChanged.dispatch(scene);
    }
  }

  removeScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (scene) {
      this.scenes.delete(sceneId);
      this.signals.sceneRemoved.dispatch(scene);

      // 현재 씬이 삭제된 경우 다른 씬으로 전환
      if (this.currentSceneId === sceneId) {
        const nextScene = this.scenes.values().next().value;
        if (nextScene) {
          this.setCurrentScene(nextScene.id);
        } else {
          this.currentScene = null;
          this.currentSceneId = null;
        }
      }
    }
  }

  // 객체 관리 메서드
  addObject(object, parent = this.currentScene) {
    if (!this.currentScene) return;

    if (parent !== undefined) {
      parent.add(object);
    } else {
      this.currentScene.add(object);
    }

    this.signals.objectAdded.dispatch(object);
  }

  removeObject(object) {
    if (!this.currentScene) return;

    object.parent.remove(object);
    this.signals.objectRemoved.dispatch(object);

    if (this.selected === object) {
      this.selected = null;
      this.signals.objectSelected.dispatch(null);
    }
  }

  select(object) {
    if (this.selected === object) return;

    this.selected = object;
    this.signals.objectSelected.dispatch(object);
  }

  deselect() {
    this.select(null);
  }

  // 타임라인 관리 메서드
  setFrame(frameNumber) {
    if (!this.currentScene) return;

    this.currentScene.userData.animation.currentFrame = frameNumber;
    this.signals.frameChanged.dispatch(frameNumber);
  }

  // 음악 관리 메서드
  setMusic(musicData) {
    if (!this.currentScene) return;

    this.currentScene.setMusic(musicData);
    this.signals.musicChanged.dispatch(musicData);
  }

  // 프로젝트 저장/불러오기
  toJSON() {
    const json = {
      metadata: {
        version: 1.0,
        type: "Editor",
        generator: "Editor.toJSON",
      },
      scenes: {},
      currentSceneId: this.currentSceneId,
    };

    this.scenes.forEach((scene, id) => {
      json.scenes[id] = scene.toJSON();
    });

    return json;
  }

  fromJSON(json) {
    this.clear();

    // 씬 복원
    Object.entries(json.scenes).forEach(([id, sceneData]) => {
      const scene = new Scene(parseInt(id));
      scene.fromJSON(sceneData);
      this.scenes.set(parseInt(id), scene);
    });

    // 현재 씬 설정
    if (json.currentSceneId) {
      this.setCurrentScene(json.currentSceneId);
    }

    this.signals.editorCleared.dispatch();
  }

  // 초기화
  clear() {
    this.scenes.clear();
    this.currentScene = null;
    this.currentSceneId = null;
    this.selected = null;

    this.signals.editorCleared.dispatch();
  }

  // 유틸리티 메서드
  execute(cmd) {
    cmd.execute();
    this.signals.historyChanged.dispatch(cmd);
  }
}

export { Editor };
