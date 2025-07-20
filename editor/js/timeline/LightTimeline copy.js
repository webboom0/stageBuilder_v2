import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText, UIColor } from "../libs/ui.js";
import * as THREE from "three";
import { TimelineData } from "./TimelineCore.js";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// 조명 타입별 속성 정의
const LIGHT_PROPERTIES = {
  SpotLight: {
    intensity: { type: 'number', range: [0, 10], default: 1 },
    color: { type: 'color', default: 0xffffff },
    position: { type: 'vector3', default: new THREE.Vector3() },
    distance: { type: 'number', range: [0, 1000], default: 200 },
    angle: { type: 'number', range: [0, Math.PI/2], default: Math.PI/14 },
    penumbra: { type: 'number', range: [0, 1], default: 0.2 },
    decay: { type: 'number', range: [0, 10], default: 0 }
  },
  PointLight: {
    intensity: { type: 'number', range: [0, 10], default: 1 },
    color: { type: 'color', default: 0xffffff },
    position: { type: 'vector3', default: new THREE.Vector3() },
    distance: { type: 'number', range: [0, 1000], default: 200 },
    decay: { type: 'number', range: [0, 10], default: 0 }
  },
  DirectionalLight: {
    intensity: { type: 'number', range: [0, 10], default: 1 },
    color: { type: 'color', default: 0xffffff },
    position: { type: 'vector3', default: new THREE.Vector3() }
  }
};

// 타겟 속성 정의 (SpotLight, DirectionalLight용)
const TARGET_PROPERTIES = {
  position: { type: 'vector3', default: new THREE.Vector3() }
};

// editor/timeline/LightTimeline.js
export class LightTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.selectedLightType = null;
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);
    this.currentTime = 0;
    
    // 10개 조명 트랙 자동 생성
    this.lightTracks = [];
    this.createFixedLightTracks();
    this.timelineEl = document.querySelector(".timeline");
    
    // TimelineData 초기화
    this.timelineData = new TimelineData();
    this.setupTimelineDataEvents();
  }

  setupTimelineDataEvents() {
    // 트랙 이벤트 리스너 설정
    this.timelineData.addEventListener('track_added', (data) => {
      console.log('트랙 추가됨:', data);
    });
    
    this.timelineData.addEventListener('track_removed', (data) => {
      console.log('트랙 제거됨:', data);
    });
  }

  createFixedLightTracks() {
    const numRows = 2;
    const numCols = 5;
    let lightIndex = 0;
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const lightId = `light_${lightIndex}`;
        const lightName = `Light ${lightIndex + 1}`;
        this.addTrack(lightId, lightName, row, col);
        this.placeLightObjOnly(lightId, row, col); // obj만 배치
        lightIndex++;
      }
    }
  }

  addTrack(lightId, lightName, row, col, lightType = null) {
    if (this.tracks.has(lightId)) return;

    // 트랙 최상위 div
    const trackElement = document.createElement("div");
    trackElement.className = "timeline-track";
    trackElement.dataset.objectId = lightId;

    // motion-tracks div
    const motionTracks = document.createElement("div");
    motionTracks.className = "motion-tracks";
    motionTracks.dataset.objectId = lightId;
    motionTracks.dataset.objectName = lightName;

    // 트랙 헤더
    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";

    // track-info (이름)
    const trackInfo = document.createElement("div");
    trackInfo.className = "track-info";

    // === select로 변경 ===
    const trackNameSelect = document.createElement("select");
    trackNameSelect.innerHTML = `
      <option value="">조명 선택</option>
      <option value="SpotLight">SpotLight</option>
      <option value="PointLight">PointLight</option>
      <option value="DirectionalLight">DirectionalLight</option>
    `;
    trackInfo.appendChild(trackNameSelect);

    // track-controls (이전/추가/다음 키프레임 버튼)
    const trackControls = document.createElement("div");
    trackControls.className = "track-controls";

    // 이전 키프레임 버튼
    const prevBtn = document.createElement("button");
    prevBtn.className = "prev-keyframe-btn";
    prevBtn.title = "Previous Keyframe";
    prevBtn.innerHTML = '<i class="fa fa-step-backward"></i>';

    // 추가 키프레임 버튼
    const addBtn = document.createElement("button");
    addBtn.className = "add-keyframe-btn";
    addBtn.title = "Add Keyframe";
    addBtn.textContent = "+";

    // 다음 키프레임 버튼
    const nextBtn = document.createElement("button");
    nextBtn.className = "next-keyframe-btn";
    nextBtn.title = "Next Keyframe";
    nextBtn.innerHTML = '<i class="fa fa-step-forward"></i>';

    // 버튼들 track-controls에 추가
    trackControls.appendChild(prevBtn);
    trackControls.appendChild(addBtn);
    trackControls.appendChild(nextBtn);

    // track-header에 info, controls 추가
    trackHeader.appendChild(trackInfo);
    trackHeader.appendChild(trackControls);

    // track-content (클립/스프라이트 영역)
    const trackContent = document.createElement("div");
    trackContent.className = "track-content";

    // motion-tracks에 header, content 추가
    motionTracks.appendChild(trackHeader);
    motionTracks.appendChild(trackContent);

    // timeline-track에 motion-tracks 추가
    trackElement.appendChild(motionTracks);

    // 타임라인 컨테이너에 추가
    this.container.appendChild(trackElement);

    // 트랙 객체로 관리
    const track = {
      element: trackElement,
      keyframes: new Map(), // 동적으로 속성별 키프레임 관리
      objectId: lightId,
      objectName: lightName,
      row,
      col,
      trackContent,
      sprite: null,
      lightType: null,
      properties: {} // 조명 타입별 속성 정보
    };
    this.tracks.set(lightId, track);
    this.lightTracks.push(track);

    // === select 이벤트: 조명/클립 생성 ===
    trackNameSelect.addEventListener("change", (e) => {
      console.log("trackNameSelect", e.target.value);
      const newType = e.target.value;
      
      // 기존 조명/타겟/obj/클립 삭제
      this.removeExistingLight(lightId);
      
      if (!newType) {
        this.placeLightObjOnly(lightId, row, col);
        this.editor.signals.sceneGraphChanged.dispatch();
        return;
      }

      // 조명 타입 설정
      track.lightType = newType;
      track.properties = LIGHT_PROPERTIES[newType];

      // === 여기서 조명 객체가 Scene에 추가됨 ===
      this.createAndPlaceLight(lightId, row, col, newType);

      // TimelineData에 조명 트랙 추가
      this.addLightToTimelineData(lightId, newType);

      // 클립 생성 (SpotLight와 DirectionalLight는 조명과 타겟을 하나의 클립으로 통합)
      if (newType === "SpotLight" || newType === "DirectionalLight") {
        this.createLightClip(track, lightName, true); // hasTarget = true
      } else {
        this.createLightClip(track, lightName, false); // hasTarget = false
      }

      // 키프레임 추가 버튼 이벤트 바인딩
      this.bindTrackEvents(track);

      // 속성 패널 업데이트
      this.updatePropertyPanelForLightType(newType);
    });
  }

  removeExistingLight(lightId) {
    const oldLight = this.editor.scene.getObjectByName(lightId);
    if (oldLight) this.editor.scene.remove(oldLight);
    
    const oldTarget = this.editor.scene.getObjectByName(`${lightId}_Target`);
    if (oldTarget) this.editor.scene.remove(oldTarget);
    
    const oldObj = this.editor.scene.getObjectByName(`${lightId}_LightObjOnly`);
    if (oldObj) this.editor.scene.remove(oldObj);
    
    const track = this.tracks.get(lightId);
    if (track) {
      // 조명 클립 제거
      if (track.sprite) {
        track.trackContent.removeChild(track.sprite);
        track.sprite = null;
      }
    }
    
    this.editor.signals.sceneGraphChanged.dispatch();
  }

  addLightToTimelineData(lightId, lightType) {
    const properties = LIGHT_PROPERTIES[lightType];
    
    // 조명 속성에 대해 TimelineData 트랙 생성
    Object.keys(properties).forEach(property => {
      this.timelineData.addTrack(lightId, property, lightId);
    });
    
    // SpotLight와 DirectionalLight는 타겟 트랙도 생성
    if (lightType === "SpotLight" || lightType === "DirectionalLight") {
      const targetId = `${lightId}_Target`;
      Object.keys(TARGET_PROPERTIES).forEach(property => {
        this.timelineData.addTrack(targetId, property, targetId);
      });
    }
  }

  createLightClip(track, lightName, hasTarget = false) {
    const sprite = document.createElement("div");
    sprite.className = "animation-sprite light-sprite";
    sprite.dataset.duration = this.options.totalSeconds || 180;
    sprite.style.width = "100%";
    sprite.style.left = "0%";
    
    // 타겟이 있는 조명은 다른 색상으로 표시
    if (hasTarget) {
      sprite.style.background = "#9c6"; // SpotLight/DirectionalLight는 초록색
      sprite.dataset.hasTarget = "true";
    } else {
      sprite.style.background = "#6cf"; // PointLight는 파란색
    }
    
    const spriteContent = document.createElement("div");
    spriteContent.className = "sprite-content";
    const spriteName = document.createElement("span");
    spriteName.className = "sprite-name";
    spriteName.textContent = lightName;
    spriteContent.appendChild(spriteName);
    sprite.appendChild(spriteContent);
    
    track.trackContent.appendChild(sprite);
    track.sprite = sprite;
    track.hasTarget = hasTarget;

    sprite.addEventListener("click", () => {
      // 클립 선택 처리
      const allSprites = document.querySelectorAll(".animation-sprite");
      allSprites.forEach(s => s.classList.remove("selected"));
      sprite.classList.add("selected");

      // 타겟이 있는 조명은 타겟 객체를 선택, 없으면 조명 객체를 선택
      let objectToSelect = null;
      if (hasTarget) {
        // 타겟 객체 선택
        const targetObject = this.editor.scene.getObjectByName(`${track.objectId}_Target`);
        if (targetObject) {
          objectToSelect = targetObject;
          console.log("타겟 객체 선택:", targetObject.name);
        } else {
          // 타겟이 없으면 조명 객체 선택
          objectToSelect = this.editor.scene.getObjectByName(track.objectId);
          console.log("타겟이 없어서 조명 객체 선택:", objectToSelect?.name);
        }
      } else {
        // 조명 객체 선택
        objectToSelect = this.editor.scene.getObjectByName(track.objectId);
        console.log("조명 객체 선택:", objectToSelect?.name);
      }

      if (objectToSelect) {
        this.editor.select(objectToSelect);
        this.selectedObject = objectToSelect;
        this.selectedLightType = track.lightType;
        this.updatePropertyPanelForLightType(track.lightType);
      }
    });
  }



  createAndPlaceLight(lightId, row, col, lightType = "SpotLight") {
    const scene = this.editor.scene;
    if (scene.getObjectByName(lightId)) return;

    const properties = LIGHT_PROPERTIES[lightType];
    let light;
    
    switch (lightType) {
      case "PointLight":
        light = new THREE.PointLight(
          properties.color.default,
          properties.intensity.default,
          properties.distance.default,
          properties.decay.default
        );
        break;
      case "DirectionalLight":
        light = new THREE.DirectionalLight(
          properties.color.default,
          properties.intensity.default
        );
        break;
      case "SpotLight":
      default:
        light = new THREE.SpotLight(
          properties.color.default,
          properties.intensity.default,
          properties.distance.default,
          properties.angle.default,
          properties.penumbra.default,
          properties.decay.default
        );
        break;
    }
    
    light.name = lightId;
    light.userData.isBackground = false;
    light.userData.sceneHide = false;

    const x = -100 + col * 50;
    const y = 130.435;
    const z = -30 + row * 50;
    light.position.set(x, y, z);

    // SpotLight와 DirectionalLight는 타겟 필요
    if (lightType === "SpotLight" || lightType === "DirectionalLight") {
      const target = new THREE.Object3D();
      target.position.set(x, 0, z);
      target.name = `${lightId}_Target`;
      target.isLight = true;
      target.userData.isBackground = false;
      scene.add(target);
      light.target = target;
    }
    
    scene.add(light);
    this.editor.signals.sceneGraphChanged.dispatch();
  }

  placeLightObjOnly(lightId, row, col) {
    const scene = this.editor.scene;

    const x = -100 + col * 50;
    const y = 137.319;
    const z = -30 + row * 50;
    const loader = new OBJLoader();
    loader.load(
      'https://webboom0.github.io/stageBuilder_v2/files/light.obj',
      (obj) => {
        obj.position.set(x, y, z);
        obj.rotation.set(172.75, 0, 0);
        obj.name = `${lightId}_LightObjOnly`;
        obj.userData.isBackground = false;
        obj.userData.sceneHide = true;
        scene.add(obj);
      },
      undefined,
      (error) => {
        console.error('light.obj 로드 실패:', error);
      }
    );
  }

  // 동적 속성 패널 생성
  createPropertyPanel() {
    const panel = new UIPanel();
    panel.setClass("property-edit-panel");
    panel.dom.style.display = "none";
    
    this.propertyRows = {};
    this.propertyPanel = panel;
    
    return panel;
  }

  updatePropertyPanelForLightType(lightType) {
    if (!lightType || !this.propertyPanel) return;
    
    // 기존 UI 제거
    this.propertyPanel.clear();
    this.propertyRows = {};
    
    const properties = LIGHT_PROPERTIES[lightType];
    if (!properties) return;
    
    // 조명 속성 표시
    const separator = new UIRow();
    separator.add(new UIText("=== 조명 속성 ==="));
    this.propertyPanel.add(separator);
    
    Object.entries(properties).forEach(([propertyName, propertyConfig]) => {
      const row = this.createPropertyRow(propertyName, propertyConfig);
      this.propertyPanel.add(row);
      this.propertyRows[propertyName] = row;
    });
    
    // SpotLight와 DirectionalLight는 타겟 속성도 추가
    if (lightType === "SpotLight" || lightType === "DirectionalLight") {
      const targetSeparator = new UIRow();
      targetSeparator.add(new UIText("=== 타겟 속성 ==="));
      this.propertyPanel.add(targetSeparator);
      
      Object.entries(TARGET_PROPERTIES).forEach(([propertyName, propertyConfig]) => {
        const row = this.createTargetPropertyRow(propertyName, propertyConfig);
        this.propertyPanel.add(row);
        this.propertyRows[`target_${propertyName}`] = row;
      });
    }
    
    this.propertyPanel.dom.style.display = "";
  }

  createPropertyRow(propertyName, config) {
    const row = new UIRow();
    row.add(new UIText(this.formatPropertyName(propertyName)));
    
    switch (config.type) {
      case 'number':
        const numberInput = new UINumber(config.default).setRange(config.range[0], config.range[1]);
        numberInput.onChange(() => {
          this.updateLightProperty(propertyName, numberInput.getValue());
        });
        row.add(numberInput);
        break;
        
      case 'color':
        const colorInput = new UIColor("#ffffff");
        colorInput.onChange(() => {
          const color = new THREE.Color(colorInput.getValue());
          this.updateLightProperty(propertyName, color);
        });
        row.add(colorInput);
        break;
        
      case 'vector3':
        const xInput = new UINumber(0);
        const yInput = new UINumber(0);
        const zInput = new UINumber(0);
        
        xInput.onChange(() => this.updateLightProperty(propertyName, 'x', xInput.getValue()));
        yInput.onChange(() => this.updateLightProperty(propertyName, 'y', yInput.getValue()));
        zInput.onChange(() => this.updateLightProperty(propertyName, 'z', zInput.getValue()));
        
        row.add(xInput);
        row.add(yInput);
        row.add(zInput);
        break;
    }
    
    return row;
  }

  createTargetPropertyRow(propertyName, config) {
    const row = new UIRow();
    row.add(new UIText(this.formatPropertyName(`target_${propertyName}`)));
    
    switch (config.type) {
      case 'vector3':
        const xInput = new UINumber(0);
        const yInput = new UINumber(0);
        const zInput = new UINumber(0);
        
        xInput.onChange(() => this.updateTargetProperty(propertyName, 'x', xInput.getValue()));
        yInput.onChange(() => this.updateTargetProperty(propertyName, 'y', yInput.getValue()));
        zInput.onChange(() => this.updateTargetProperty(propertyName, 'z', zInput.getValue()));
        
        row.add(xInput);
        row.add(yInput);
        row.add(zInput);
        break;
    }
    
    return row;
  }

  updateLightProperty(propertyName, value, axis = null) {
    if (!this.selectedObject) return;
    
    // 선택된 객체가 타겟인 경우 조명 객체를 찾아서 업데이트
    let light = this.selectedObject;
    let lightId = light.name;
    
    if (light.name.includes('_Target')) {
      // 타겟이 선택된 경우, 해당하는 조명 객체를 찾음
      const baseLightId = light.name.replace('_Target', '');
      const baseLight = this.editor.scene.getObjectByName(baseLightId);
      if (baseLight) {
        light = baseLight;
        lightId = baseLightId;
      } else {
        console.warn("타겟에 해당하는 조명을 찾을 수 없습니다:", baseLightId);
        return;
      }
    }
    
    if (axis) {
      // vector3 속성의 개별 축 업데이트
      if (propertyName === 'position') {
        light.position[axis] = value;
      } else if (propertyName === 'target' && light.target) {
        light.target.position[axis] = value;
      }
    } else {
      // 일반 속성 업데이트
      switch (propertyName) {
        case 'intensity':
          light.intensity = value;
          break;
        case 'color':
          light.color.copy(value);
          break;
        case 'distance':
          light.distance = value;
          break;
        case 'angle':
          light.angle = value;
          break;
        case 'penumbra':
          light.penumbra = value;
          break;
        case 'decay':
          light.decay = value;
          break;
        case 'position':
          light.position.copy(value);
          break;
        case 'target':
          if (light.target) {
            light.target.position.copy(value);
          }
          break;
      }
    }
    
    // 키프레임 추가
    this.addKeyframeForProperty(lightId, propertyName, this.currentTime, this.getPropertyValue(light, propertyName));
    
    // 키프레임 UI 추가
    this.addKeyframeUI(lightId, propertyName, this.currentTime);
    
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(light);
    }
  }

  updateTargetProperty(propertyName, axis, value) {
    if (!this.selectedObject) return;
    
    // 선택된 객체가 타겟인 경우 직접 업데이트, 조명인 경우 target을 찾아서 업데이트
    let light = this.selectedObject;
    let lightId = light.name;
    let targetId = `${lightId}_Target`;
    
    if (light.name.includes('_Target')) {
      // 타겟이 선택된 경우 직접 업데이트
      if (axis) {
        light.position[axis] = value;
      }
      
      // 키프레임 추가
      this.addKeyframeForProperty(light.name, propertyName, this.currentTime, light.position.clone());
      
      // 키프레임 UI 추가
      this.addKeyframeUI(light.name, propertyName, this.currentTime);
    } else {
      // 조명이 선택된 경우 target을 찾아서 업데이트
      if (!light.target) {
        console.warn("조명에 타겟이 없습니다:", light.name);
        return;
      }
      
      if (axis) {
        light.target.position[axis] = value;
      }
      
      // 키프레임 추가
      this.addKeyframeForProperty(targetId, propertyName, this.currentTime, light.target.position.clone());
      
      // 키프레임 UI 추가
      this.addKeyframeUI(targetId, propertyName, this.currentTime);
    }
    
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(light);
    }
  }

  addKeyframeForProperty(lightId, propertyName, time, value) {
    const trackData = this.timelineData.getTrackById(lightId, propertyName);
    if (trackData) {
      // 값 타입에 따라 Vector3로 변환
      let vectorValue;
      if (typeof value === 'number') {
        // intensity, distance, angle, penumbra, decay 등의 숫자 값
        vectorValue = new THREE.Vector3(value, 0, 0);
      } else if (value instanceof THREE.Color) {
        // color 값
        vectorValue = new THREE.Vector3(value.r, value.g, value.b);
      } else if (value instanceof THREE.Vector3) {
        // position, target 등의 Vector3 값
        vectorValue = value.clone();
      } else {
        console.warn('지원하지 않는 값 타입:', typeof value, value);
        return;
      }
      
      trackData.addKeyframe(time, vectorValue);
    }
  }

  addKeyframeUI(lightId, propertyName, time) {
    const track = this.tracks.get(lightId);
    if (!track) return;

    // 조명 클립에 키프레임 추가 (타겟 키프레임도 조명 클립에 표시)
    let targetSprite = null;
    if (lightId.includes('_Target')) {
      // 타겟 키프레임인 경우 - 기본 조명 클립에 표시
      const baseLightId = lightId.replace('_Target', '');
      const baseTrack = this.tracks.get(baseLightId);
      if (baseTrack && baseTrack.sprite) {
        targetSprite = baseTrack.sprite;
      }
    } else {
      // 조명 키프레임인 경우
      if (track.sprite) {
        targetSprite = track.sprite;
      }
    }

    if (!targetSprite) return;

    // 현재 시간을 퍼센트로 변환
    const totalDuration = this.options.totalSeconds || 180;
    const timePercent = (time / totalDuration) * 100;
    
    // 키프레임 요소 생성
    const keyframe = document.createElement("div");
    keyframe.className = "keyframe";
    keyframe.style.position = "absolute";
    keyframe.style.left = `${timePercent}%`;
    keyframe.style.top = "50%";
    keyframe.style.transform = "translate(-50%, -50%)";
    keyframe.style.width = "8px";
    keyframe.style.height = "8px";
    
    // 타겟 키프레임은 다른 색상으로 표시
    if (lightId.includes('_Target')) {
      keyframe.style.backgroundColor = "#f66"; // 타겟 키프레임은 빨간색
      keyframe.style.border = "1px solid #c33";
    } else {
      keyframe.style.backgroundColor = "#f90"; // 조명 키프레임은 주황색
      keyframe.style.border = "1px solid #c60";
    }
    
    keyframe.style.borderRadius = "50%";
    keyframe.style.cursor = "pointer";
    keyframe.style.zIndex = "10";
    keyframe.dataset.time = time.toFixed(2);
    keyframe.dataset.property = propertyName;
    keyframe.dataset.lightId = lightId;
    
    // 키프레임을 스프라이트에 추가
    targetSprite.appendChild(keyframe);
    
    // 키프레임 클릭 이벤트
    keyframe.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // 모든 키프레임에서 선택 상태 제거
      const allKeyframes = document.querySelectorAll(".keyframe");
      allKeyframes.forEach(k => {
        if (k.dataset.lightId.includes('_Target')) {
          k.style.backgroundColor = "#f66";
        } else {
          k.style.backgroundColor = "#f90";
        }
      });
      
      // 현재 키프레임 선택
      keyframe.style.backgroundColor = "#ff0";
      
      // 해당 시간으로 타임라인 이동
      const frame = Math.floor(time * this.options.framesPerSecond);
      if (this.editor.signals?.currentTimeChanged) {
        this.editor.signals.currentTimeChanged.dispatch(frame);
      }
    });
    
    // 키프레임 삭제 (우클릭)
    keyframe.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // TimelineData에서 키프레임 제거
      const trackData = this.timelineData.getTrackById(lightId, propertyName);
      if (trackData) {
        trackData.removeKeyframe(time);
      }
      
      // UI에서 키프레임 제거
      keyframe.remove();
    });
  }

  // BaseTimeline의 추상 메서드 구현
  getPropertyValue(object, propertyType) {
    switch (propertyType) {
      case "intensity":
        return object.intensity;
      case "color":
        return object.color.clone();
      case "position":
        return object.position.clone();
      case "distance":
        return object.distance;
      case "angle":
        return object.angle;
      case "penumbra":
        return object.penumbra;
      case "decay":
        return object.decay;
      case "target":
        return object.target ? object.target.position.clone() : new THREE.Vector3();
      default:
        return null;
    }
  }

  updateFrame(frame) {
    this.currentTime = frame / this.options.framesPerSecond;
    
    this.tracks.forEach((track) => {
      const object = this.editor.scene.getObjectByName(track.objectId);
      if (!object || !track.lightType) return;

      const properties = LIGHT_PROPERTIES[track.lightType];
      let hasChanges = false;

      // 조명 속성 애니메이션
      Object.keys(properties).forEach((propertyType) => {
        const trackData = this.timelineData.getTrackById(track.objectId, propertyType);
        if (!trackData || trackData.getKeyframeCount() === 0) return;

        const value = trackData.getValueAtTime(this.currentTime);
        if (value !== null) {
          this.setPropertyValue(object, propertyType, value);
          hasChanges = true;
        }
      });

      // 타겟 애니메이션 (SpotLight, DirectionalLight)
      if ((track.lightType === "SpotLight" || track.lightType === "DirectionalLight") && object.target) {
        const targetId = `${track.objectId}_Target`;
        const targetTrackData = this.timelineData.getTrackById(targetId, "position");
        if (targetTrackData && targetTrackData.getKeyframeCount() > 0) {
          const targetValue = targetTrackData.getValueAtTime(this.currentTime);
          if (targetValue !== null) {
            object.target.position.copy(targetValue);
            hasChanges = true;
          }
        }
      }

      if (hasChanges && this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(object);
      }
    });
  }



  setPropertyValue(object, propertyType, value) {
    switch (propertyType) {
      case "intensity":
        object.intensity = value.x;
        break;
      case "color":
        object.color.setRGB(value.x, value.y, value.z);
        break;
      case "position":
        object.position.copy(value);
        break;
      case "distance":
        object.distance = value.x;
        break;
      case "angle":
        object.angle = value.x;
        break;
      case "penumbra":
        object.penumbra = value.x;
        break;
      case "decay":
        object.decay = value.x;
        break;
    }
  }



  formatPropertyName(propertyType) {
    const names = {
      intensity: "강도",
      color: "색상",
      position: "위치",
      distance: "거리",
      angle: "각도",
      penumbra: "반음영",
      decay: "감쇠",
      target_position: "타겟 위치"
    };
    return names[propertyType] || propertyType;
  }

  // 저장/로드 메서드
  onBeforeSave() {
    // TimelineData를 scene.userData에 저장
    if (!this.editor.scene.userData) {
      this.editor.scene.userData = {};
    }
    this.editor.scene.userData.lightTimeline = this.timelineData.toJSON();
  }

  onAfterLoad() {
    // scene.userData에서 TimelineData 복원
    if (this.editor.scene.userData?.lightTimeline) {
      this.timelineData.fromJSON(this.editor.scene.userData.lightTimeline);
      
      // 저장된 키프레임 UI 복원
      this.restoreKeyframeUI();
    }
  }

  restoreKeyframeUI() {
    // 모든 트랙의 키프레임 UI 복원
    this.tracks.forEach((track) => {
      if (!track.lightType) return;
      
      const properties = LIGHT_PROPERTIES[track.lightType];
      Object.keys(properties).forEach((propertyName) => {
        const trackData = this.timelineData.getTrackById(track.objectId, propertyName);
        if (trackData) {
          for (let i = 0; i < trackData.getKeyframeCount(); i++) {
            const keyframe = trackData.getKeyframeByIndex(i);
            if (keyframe) {
              this.addKeyframeUI(track.objectId, propertyName, keyframe.time);
            }
          }
        }
      });
      
      // 타겟 키프레임 UI 복원 (SpotLight, DirectionalLight)
      if (track.hasTarget) {
        const targetId = `${track.objectId}_Target`;
        const targetTrackData = this.timelineData.getTrackById(targetId, "position");
        if (targetTrackData) {
          for (let i = 0; i < targetTrackData.getKeyframeCount(); i++) {
            const keyframe = targetTrackData.getKeyframeByIndex(i);
            if (keyframe) {
              this.addKeyframeUI(targetId, "position", keyframe.time);
            }
          }
        }
      }
    });
  }

  bindTrackEvents(track) {
    if (!track || !track.objectId) {
      console.warn("트랙 또는 objectId가 없습니다:", track);
      return;
    }

    const light = this.editor.scene.getObjectByName(track.objectId);
    if (!light) {
      console.warn(`조명을 찾을 수 없습니다: ${track.objectId}`);
      return;
    }

    // 키프레임 추가 버튼 이벤트 바인딩
    const addKeyframeBtn = track.element.querySelector(".add-keyframe-btn");
    if (addKeyframeBtn) {
      addKeyframeBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        // 현재 시간 가져오기
        const currentTime = this.currentTime;
        
        console.log("키프레임 추가 버튼 클릭:", {
          lightId: track.objectId,
          currentTime: currentTime,
          lightType: track.lightType
        });

        // 조명의 모든 속성에 대해 키프레임 추가
        const properties = LIGHT_PROPERTIES[track.lightType];
        Object.keys(properties).forEach((propertyName) => {
          const value = this.getPropertyValue(light, propertyName);
          if (value !== null) {
            this.addKeyframeForProperty(track.objectId, propertyName, currentTime, value);
            this.addKeyframeUI(track.objectId, propertyName, currentTime);
          }
        });

        // SpotLight와 DirectionalLight는 타겟 키프레임도 추가
        if (track.hasTarget) {
          const targetId = `${track.objectId}_Target`;
          const targetObject = this.editor.scene.getObjectByName(targetId);
          if (targetObject) {
            const targetValue = targetObject.position.clone();
            this.addKeyframeForProperty(targetId, "position", currentTime, targetValue);
            this.addKeyframeUI(targetId, "position", currentTime);
          }
        }

        console.log("모든 속성에 키프레임 추가 완료");
      });
    }
  }
}

export default LightTimeline;