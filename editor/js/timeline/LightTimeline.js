import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText, UIColor } from "../libs/ui.js";
import * as THREE from "three";
import { TimelineData, TrackData } from "./TimelineCore.js";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// 조명 타입별 속성 정의
const LIGHT_PROPERTIES = {
  SpotLight: {
    intensity: { type: 'number', range: [0, 10], default: 1 },
    color: { type: 'color', default: 0xffffff },
    position: { type: 'vector3', default: new THREE.Vector3() },
    distance: { type: 'number', range: [0, 1000], default: 200 },
    angle: { type: 'number', range: [0, Math.PI / 2], default: Math.PI / 14 },
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
  // 클립 범위 체크용 오차 범위 (초 단위) - 클립 0 위치 근처 키프레임 선택 허용
  static CLIP_RANGE_TOLERANCE = 0.5;
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.selectedLightType = null;
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);
    this.currentTime = 0;

    // tracks 맵 완전 재설정 (문제 해결을 위해)
    this.tracks = new Map();
    console.log(`🔄 LightTimeline 생성자에서 tracks 맵 재설정`);

    // 10개 조명 트랙 자동 생성
    this.lightTracks = [];
    this.createFixedLightTracks();
    this.timelineEl = document.querySelector(".timeline");

    // TimelineData 초기화 (BaseTimeline에서 이미 초기화됨)
    this.setupTimelineDataEvents();

    // 디바운싱을 위한 변수들
    this.updateTimeout = null;
    this.lastUpdateTime = 0;
    this.isDragging = false;

    // 객체 변경 리스너 설정 (키프레임 선택 시 속성 변경 감지)
    this.setupObjectChangeListener();

    // 전역에서 테스트할 수 있도록 window 객체에 추가
    if (typeof window !== 'undefined') {
      window.lightTimeline = this;
    }
  }

  // 타임라인 설정 업데이트
  updateSettings(newSettings) {
    console.log('LightTimeline 설정 업데이트:', newSettings);

    // 기존 설정 백업
    const oldSettings = { ...this.options };

    // 기존 설정 업데이트
    this.options = { ...this.options, ...newSettings };

    // TimelineData의 frameRate 업데이트
    if (newSettings.framesPerSecond && this.timelineData) {
      this.timelineData.frameRate = newSettings.framesPerSecond;
    }

    // Scene의 timeline 설정 업데이트
    if (this.editor.scene) {
      if (!this.editor.scene.userData.timeline) {
        this.editor.scene.userData.timeline = {};
      }
      this.editor.scene.userData.timeline = { ...this.editor.scene.userData.timeline, ...newSettings };
    }

    // 클립 너비 업데이트 (시간 변경 시)
    if (newSettings.totalSeconds && oldSettings.totalSeconds !== newSettings.totalSeconds) {
      this.updateClipWidths(oldSettings.totalSeconds, newSettings.totalSeconds);
    }

    // UI 업데이트
    this.updateUI();

    console.log('LightTimeline 설정이 성공적으로 업데이트되었습니다.');
  }

  // 클립 너비 업데이트
  updateClipWidths(oldTotalSeconds, newTotalSeconds) {
    console.log('LightTimeline 클립 너비 업데이트:', { oldTotalSeconds, newTotalSeconds });

    const sprites = this.container.querySelectorAll('.animation-sprite');
    sprites.forEach(sprite => {
      // 조명 클립은 항상 전체 타임라인 길이만큼 늘어나거나 줄어듦
      const newWidth = 100; // 항상 100% (전체 타임라인)
      const newDuration = newTotalSeconds; // 새로운 총 시간으로 지속시간 업데이트

      console.log('LightTimeline 클립 너비 업데이트:', {
        oldTotalSeconds,
        newTotalSeconds,
        newWidth: `${newWidth}%`,
        newDuration
      });

      // 너비와 지속시간 업데이트
      sprite.style.width = `${newWidth}%`;
      sprite.dataset.duration = newDuration.toString();

      // 클립을 항상 0% 위치에 고정 (전체 타임라인을 커버)
      sprite.style.left = '0%';

      // 클립 내의 키프레임 위치 업데이트
      this.updateKeyframesInClipAfterTimeChange(sprite, oldTotalSeconds, newTotalSeconds);
    });
  }

  // 타임라인 시간 변경 후 클립 내 키프레임 위치 업데이트
  updateKeyframesInClipAfterTimeChange(sprite, oldTotalSeconds, newTotalSeconds) {
    console.log('LightTimeline 클립 내 키프레임 위치 업데이트:', { oldTotalSeconds, newTotalSeconds });

    const keyframes = sprite.querySelectorAll('.keyframe');
    keyframes.forEach(keyframe => {
      // 키프레임의 데이터에서 절대 시간 정보 가져오기
      const keyframeTime = parseFloat(keyframe.dataset.time) || 0;
      const clipLeft = parseFloat(sprite.style.left) || 0;
      const clipDuration = parseFloat(sprite.dataset.duration) || 5;

      // 클립의 시작 시간 계산 (클립의 left 위치 기반)
      const clipStartTime = (clipLeft / 100) * oldTotalSeconds;

      // 키프레임의 절대 시간 (클립 시작 시간 + 키프레임의 상대 시간)
      const absoluteTime = clipStartTime + keyframeTime;

      // 새로운 시간 기준으로 클립의 시작 시간 계산
      const newClipStartTime = (clipLeft / 100) * newTotalSeconds;

      // 새로운 시간 기준으로 키프레임의 상대 시간 계산
      const newRelativeTime = absoluteTime - newClipStartTime;

      // 키프레임의 새로운 위치 계산 (클립 내에서의 상대적 위치)
      const newPosition = (newRelativeTime / clipDuration) * 100;

      console.log('LightTimeline 키프레임 위치 업데이트:', {
        keyframeTime,
        clipLeft: `${clipLeft}%`,
        clipDuration,
        clipStartTime,
        absoluteTime,
        newClipStartTime,
        newRelativeTime,
        newPosition: `${newPosition}%`
      });

      // 키프레임 위치 업데이트 (클립 범위 내로 제한)
      const clampedPosition = Math.max(0, Math.min(100, newPosition));
      keyframe.style.left = `${clampedPosition}%`;
      keyframe.dataset.time = newRelativeTime.toFixed(3);

      console.log('LightTimeline 최종 키프레임 위치:', {
        originalTime: keyframeTime,
        newLeft: `${clampedPosition}%`,
        newTime: newRelativeTime.toFixed(3)
      });
    });
  }

  setupTimelineDataEvents() {
    if (!this.timelineData) return;

    // 트랙 이벤트 리스너 설정
    this.timelineData.addEventListener('track_added', (data) => {
      console.log('트랙 추가됨:', data);
    });

    this.timelineData.addEventListener('track_removed', (data) => {
      console.log('트랙 제거됨:', data);
    });

    // 키프레임 추가 이벤트
    this.timelineData.addEventListener('track_keyframe_added', (data) => {
      console.log('키프레임 추가 이벤트:', data);
      this.onKeyframeAdded(data.objectUuid, data.property, data.index, data.time, data.value);
    });

    // 키프레임 삭제 이벤트
    this.timelineData.addEventListener('track_keyframe_removed', (data) => {
      console.log('키프레임 삭제 이벤트:', data);
      this.onKeyframeRemoved(data.objectUuid, data.property, data.index, data.time, data.value);
    });

    // 키프레임 업데이트 이벤트
    this.timelineData.addEventListener('track_keyframe_updated', (data) => {
      console.log('키프레임 업데이트 이벤트:', data);
      this.onKeyframeUpdated(data.objectUuid, data.property, data.index, data.time, data.oldValue, data.newValue);
    });

    // 키프레임 이동 이벤트
    this.timelineData.addEventListener('track_keyframe_moved', (data) => {
      console.log('키프레임 이동 이벤트:', data);
      this.onKeyframeMoved(data.objectUuid, data.property, data.index, data.oldTime, data.newTime, data.value);
    });
  }

  createFixedLightTracks() {
    console.log(`🔄 createFixedLightTracks 시작: tracks 크기 = ${this.tracks.size}`);

    const numRows = 2;
    const numCols = 5;
    let lightIndex = 0;
    console.log(`🔄 반복문 시작: ${numRows}행 x ${numCols}열 = ${numRows * numCols}개 트랙 생성 예정`);

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        try {
          const lightId = `light_${lightIndex}`;
          const lightName = `Light ${lightIndex + 1}`;
          console.log(`🔄 트랙 생성 시도: ${lightId} (${row}, ${col})`);
          this.addTrack(lightId, lightName, row, col);
          this.placeLightObjOnly(lightId, row, col); // obj만 배치
          lightIndex++;
          console.log(`✅ 트랙 생성 완료: ${lightId}, 현재 tracks 크기 = ${this.tracks.size}`);
        } catch (error) {
          console.error(`❌ 트랙 생성 실패: light_${lightIndex}`, error);
          lightIndex++;
        }
      }
    }

    console.log(`✅ createFixedLightTracks 완료: tracks 크기 = ${this.tracks.size}`);
    console.log(`✅ 생성된 tracks:`, Array.from(this.tracks.keys()));

    // tracks 맵의 모든 키-값 쌍 상세 출력
    console.log(`🔍 tracks 맵 상세 내용:`, {
      size: this.tracks.size,
      entries: Array.from(this.tracks.entries()).map(([key, value]) => ({
        key,
        keyType: typeof key,
        value: value ? { objectId: value.objectId, objectName: value.objectName } : null
      }))
    });
  }

  addTrack(lightId, lightName, row, col, lightType = null) {
    console.log(`🔄 addTrack 호출: ${lightId}`, { hasTrack: this.tracks.has(lightId) });
    if (this.tracks.has(lightId)) {
      console.log(`ℹ️ 이미 존재하는 트랙: ${lightId}`);
      return;
    }

    // 트랙 최상위 div
    const trackElement = document.createElement("div");
    trackElement.className = "timeline-track light-timeline";
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
      properties: {}, // 조명 타입별 속성 정보
      timelineDataInitialized: false // TimelineData 초기화 상태
    };
    console.log(`🔄 tracks.set 호출 전: ${lightId}`, {
      tracksSize: this.tracks.size,
      hasTrack: this.tracks.has(lightId)
    });

    try {
      this.tracks.set(lightId, track);
      this.lightTracks.push(track);
      console.log(`✅ tracks.set 성공: ${lightId}`);
    } catch (error) {
      console.error(`❌ tracks.set 실패: ${lightId}`, error);
    }

    console.log(`✅ addTrack 완료: ${lightId}`, {
      tracksSize: this.tracks.size,
      hasTrack: this.tracks.has(lightId),
      track: this.tracks.get(lightId),
      allKeys: Array.from(this.tracks.keys())
    });

    // === select 이벤트: 조명/클립 생성 ===
    trackNameSelect.addEventListener("change", (e) => {
      console.log("trackNameSelect", e.target.value);
      const newType = e.target.value;

      console.log(`🔄 조명 선택 이벤트: ${lightId} -> ${newType}`);
      console.log(`🔄 tracks 상태 (변경 전):`, {
        tracksSize: this.tracks.size,
        tracksKeys: Array.from(this.tracks.keys()),
        hasTrack: this.tracks.has(lightId)
      });

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

      // TimelineData에 조명 트랙 추가 (한 번만)
      if (!track.timelineDataInitialized) {
        this.addLightToTimelineData(lightId, newType);
        track.timelineDataInitialized = true;
        console.log(`✅ TimelineData 초기화 완료: ${lightId}`);
      } else {
        console.log(`ℹ️ TimelineData 이미 초기화됨: ${lightId}`);
      }

      // 클립 생성 (SpotLight와 DirectionalLight는 조명과 타겟을 별도 클립으로 분리)
      if (newType === "SpotLight" || newType === "DirectionalLight") {
        console.log(`🔄 SpotLight/DirectionalLight 클립 생성:`, lightId);
        this.createLightClip(track, lightName, false); // 조명 클립
        this.createTargetTrack(lightId, lightName); // 타겟 트랙 추가
      } else {
        console.log(`🔄 PointLight 클립 생성:`, lightId);
        this.createLightClip(track, lightName, false); // 조명 클립만
      }

      // 키프레임 추가 버튼 이벤트 바인딩
      this.bindTrackEvents(track);

      // 속성 패널 업데이트
      this.updatePropertyPanelForLightType(newType);

      console.log(`✅ 조명 선택 완료: ${lightId} -> ${newType}`);
      console.log(`✅ tracks 상태 (변경 후):`, {
        tracksSize: this.tracks.size,
        tracksKeys: Array.from(this.tracks.keys()),
        hasTrack: this.tracks.has(lightId),
        track: this.tracks.get(lightId)
      });
    });
  }

  removeExistingLight(lightId) {
    console.log("=== removeExistingLight 시작 ===", { lightId });

    // 1. TimelineData에서 조명과 타겟 트랙 데이터 삭제 (객체 삭제 전에 먼저 실행)
    this.removeLightFromTimelineData(lightId);

    // 2. 조명 객체 삭제
    const oldLight = this.editor.scene.getObjectByName(lightId);
    if (oldLight) {
      // TransformControls에서 선택 해제
      if (this.editor.selected === oldLight) {
        this.editor.select(null);
      }
      this.editor.scene.remove(oldLight);
      console.log("조명 객체 삭제:", lightId);
    }

    // 3. 타겟 객체 삭제
    const oldTarget = this.editor.scene.getObjectByName(`${lightId}_Target`);
    if (oldTarget) {
      // TransformControls에서 선택 해제
      if (this.editor.selected === oldTarget) {
        this.editor.select(null);
      }
      this.editor.scene.remove(oldTarget);
      console.log("타겟 객체 삭제:", `${lightId}_Target`);
    }

    // 4. 조명 obj 삭제
    const oldObj = this.editor.scene.getObjectByName(`${lightId}_LightObjOnly`);
    if (oldObj) {
      this.editor.scene.remove(oldObj);
      console.log("조명 obj 삭제:", `${lightId}_LightObjOnly`);
    }

    // 5. 조명 트랙 UI 삭제
    const track = this.tracks.get(lightId);
    if (track) {
      // 조명 클립 제거
      if (track.sprite) {
        console.log(`🔄 조명 클립 UI 삭제 시작:`, { lightId, sprite: track.sprite });
        track.trackContent.removeChild(track.sprite);
        track.sprite = null;
        console.log(`✅ 조명 클립 UI 삭제 완료:`, lightId);
      } else {
        console.log(`ℹ️ 삭제할 조명 클립이 없음:`, lightId);
      }

      // TimelineData 초기화 상태 리셋
      track.timelineDataInitialized = false;
      console.log("TimelineData 초기화 상태 리셋:", lightId);

      // 조명 트랙을 tracks에서 제거하지 않음 (UI는 유지, sprite만 null로 설정)
      console.log(`ℹ️ 조명 트랙 UI는 유지:`, lightId);
    }

    // 6. 타겟 트랙 UI 삭제
    const targetTrackId = `${lightId}_Target`;
    const targetTrack = this.tracks.get(targetTrackId);
    if (targetTrack) {
      // 타겟 트랙 요소를 DOM에서 제거
      if (targetTrack.element && targetTrack.element.parentNode) {
        targetTrack.element.parentNode.removeChild(targetTrack.element);
        console.log("타겟 트랙 UI 삭제:", targetTrackId);
      }

      // 타겟 트랙을 tracks에서 제거
      this.tracks.delete(targetTrackId);
      console.log("타겟 트랙 데이터 삭제:", targetTrackId);
    }

    this.editor.signals.sceneGraphChanged.dispatch();
    console.log("=== removeExistingLight 완료 ===");
  }

  addLightToTimelineData(lightId, lightType) {
    console.log("=== addLightToTimelineData 시작 ===", { lightId, lightType });

    const properties = LIGHT_PROPERTIES[lightType];

    // 조명 객체의 UUID 가져오기
    const light = this.editor.scene.getObjectByName(lightId);
    if (!light) {
      console.warn("조명 객체를 찾을 수 없습니다:", lightId);
      return;
    }

    console.log("조명 객체 정보:", {
      name: light.name,
      uuid: light.uuid,
      type: light.type
    });

    // 조명 속성에 대해 TimelineData 트랙 생성 (UI 트랙 ID를 고유 식별자로 사용)
    Object.keys(properties).forEach(property => {
      console.log(`조명 속성 트랙 생성: ${lightId} ${property}`);
      // UI 트랙 ID를 고유 식별자로 사용하여 트랙 생성
      const uniqueTrackId = `${lightId}_${property}`;

      // 이미 존재하는 트랙인지 확인
      const existingTrack = this.timelineData.getTrackByUuid(light.uuid, property);
      if (existingTrack) {
        console.log(`트랙이 이미 존재함: ${lightId} ${property}`, existingTrack);
        return; // 이미 존재하면 건너뛰기
      }

      const track = this.timelineData.addTrack(light.uuid, property, uniqueTrackId);
      console.log(`트랙 생성 결과:`, {
        uniqueTrackId,
        property,
        track: track ? "생성됨" : "생성 실패"
      });
    });

    // SpotLight와 DirectionalLight는 타겟 트랙도 생성 (createTargetTrack에서 처리하므로 여기서는 제거)
    if (lightType === "SpotLight" || lightType === "DirectionalLight") {
      console.log(`ℹ️ 타겟 트랙은 createTargetTrack에서 생성됨: ${lightId}_Target`);
    }

    console.log("TimelineData 트랙 생성 완료:", {
      lightId,
      lightType,
      lightUuid: light.uuid,
      properties: Object.keys(properties),
      hasTarget: lightType === "SpotLight" || lightType === "DirectionalLight"
    });

    // 생성된 트랙들의 전체 상태 출력
    console.log("=== 생성된 트랙들의 전체 상태 ===");
    this.logTimelineDataState();

    console.log("=== addLightToTimelineData 완료 ===");

    // 추가 후 TimelineData 상태 확인
    console.log("🔍 addLightToTimelineData 후 TimelineData 상태:");
    console.log("  - tracksCount:", this.timelineData.tracks.size);
    console.log("  - tracksByIdCount:", this.timelineData.tracksById.size);

    // ID 기반 트랙 확인
    const lightTracks = this.timelineData.tracksById.get(lightId);
    if (lightTracks) {
      console.log(`  - ${lightId} 트랙들:`, Array.from(lightTracks.keys()));
    } else {
      console.log(`  - ${lightId} 트랙을 찾을 수 없음`);
    }
  }

  // TimelineData에서 조명과 타겟 트랙 데이터 삭제
  removeLightFromTimelineData(lightId) {
    console.log("=== removeLightFromTimelineData 시작 ===", { lightId });

    // 1. 조명 객체의 UUID 가져오기
    const light = this.editor.scene.getObjectByName(lightId);
    if (light) {
      console.log("조명 객체 UUID:", light.uuid);

      // 2. 조명 속성 트랙들 삭제
      const lightProperties = Object.keys(LIGHT_PROPERTIES.SpotLight); // 모든 조명 타입의 속성
      lightProperties.forEach(property => {
        // UUID 기반 트랙 삭제
        this.timelineData.removeTrack(light.uuid, property);
        console.log(`조명 속성 트랙 삭제: ${light.uuid} ${property}`);
      });
    }

    // 3. 타겟 객체의 UUID 가져오기
    const targetId = `${lightId}_Target`;
    const target = this.editor.scene.getObjectByName(targetId);
    if (target) {
      console.log("타겟 객체 UUID:", target.uuid);

      // 4. 타겟 속성 트랙들 삭제
      const targetProperties = Object.keys(TARGET_PROPERTIES);
      targetProperties.forEach(property => {
        // UUID 기반 트랙 삭제
        this.timelineData.removeTrack(target.uuid, property);
        console.log(`타겟 속성 트랙 삭제: ${target.uuid} ${property}`);
      });
    }

    // 5. ID 기반 트랙들도 삭제 (개별 속성별로, 고유 식별자 사용)
    const lightProperties = Object.keys(LIGHT_PROPERTIES.SpotLight);
    lightProperties.forEach(property => {
      const uniqueTrackId = `${lightId}_${property}`;
      this.timelineData.removeTrackById(uniqueTrackId, property);
      console.log(`ID 기반 조명 트랙 삭제: ${uniqueTrackId} ${property}`);
    });

    const targetProperties = Object.keys(TARGET_PROPERTIES);
    targetProperties.forEach(property => {
      const uniqueTargetTrackId = `${targetId}_${property}`;
      this.timelineData.removeTrackById(uniqueTargetTrackId, property);
      console.log(`ID 기반 타겟 트랙 삭제: ${uniqueTargetTrackId} ${property}`);
    });

    console.log("=== removeLightFromTimelineData 완료 ===");
  }

  createLightClip(track, lightName, hasTarget = false) {
    console.log(`🔄 createLightClip 시작:`, { track: track.objectId, lightName, hasTarget });

    const sprite = document.createElement("div");
    sprite.className = "animation-sprite light-sprite";
    sprite.dataset.duration = this.options.totalSeconds || 180;
    sprite.style.width = "100%";
    sprite.style.left = "0%";

    // 조명 클립은 파란색으로 표시
    sprite.style.background = "#6cf";

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

    console.log(`✅ createLightClip 완료:`, {
      trackId: track.objectId,
      sprite,
      trackContent: track.trackContent,
      spriteSet: !!track.sprite
    });

    sprite.addEventListener("click", () => {
      // 클립 선택 처리 - 공통 메서드 사용
      this.selectClip(sprite);
    });
  }

  // 타겟 트랙 생성 메서드
  createTargetTrack(lightId, lightName) {
    console.log("=== 타겟 트랙 생성 ===", { lightId, lightName });

    // 기존 트랙 요소 찾기
    const existingTrackElement = this.container.querySelector(`[data-object-id="${lightId}"]`);
    if (!existingTrackElement) {
      console.error("기존 트랙을 찾을 수 없습니다:", lightId);
      return;
    }

    // 타겟 트랙 컨테이너 생성
    const targetTrackElement = document.createElement("div");
    targetTrackElement.className = "motion-tracks target-tracks";
    targetTrackElement.dataset.objectId = `${lightId}_Target`;
    targetTrackElement.dataset.objectName = `${lightName}_Target`;

    // 타겟 트랙 헤더
    const targetTrackHeader = document.createElement("div");
    targetTrackHeader.className = "track-header";

    // 타겟 트랙 정보
    const targetTrackInfo = document.createElement("div");
    targetTrackInfo.className = "track-info";
    const targetTrackName = document.createElement("span");
    targetTrackName.textContent = `${lightName}_Target`;
    targetTrackName.style.color = "#f66"; // 타겟은 빨간색으로 표시
    targetTrackInfo.appendChild(targetTrackName);

    // 타겟 트랙 컨트롤
    const targetTrackControls = document.createElement("div");
    targetTrackControls.className = "track-controls";

    // 타겟 키프레임 추가 버튼
    const targetAddBtn = document.createElement("button");
    targetAddBtn.className = "add-keyframe-btn";
    targetAddBtn.title = "Add Target Keyframe";
    targetAddBtn.textContent = "+";
    targetAddBtn.style.backgroundColor = "#f66"; // 타겟 버튼도 빨간색

    // 타겟 이전/다음 키프레임 버튼
    const targetPrevBtn = document.createElement("button");
    targetPrevBtn.className = "prev-keyframe-btn";
    targetPrevBtn.title = "Previous Target Keyframe";
    targetPrevBtn.innerHTML = '<i class="fa fa-step-backward"></i>';

    const targetNextBtn = document.createElement("button");
    targetNextBtn.className = "next-keyframe-btn";
    targetNextBtn.title = "Next Target Keyframe";
    targetNextBtn.innerHTML = '<i class="fa fa-step-forward"></i>';

    targetTrackControls.appendChild(targetPrevBtn);
    targetTrackControls.appendChild(targetAddBtn);
    targetTrackControls.appendChild(targetNextBtn);

    // 타겟 트랙 헤더 조립
    targetTrackHeader.appendChild(targetTrackInfo);
    targetTrackHeader.appendChild(targetTrackControls);

    // 타겟 트랙 콘텐츠
    const targetTrackContent = document.createElement("div");
    targetTrackContent.className = "track-content";

    // 타겟 스프라이트 생성
    const targetSprite = document.createElement("div");
    targetSprite.className = "animation-sprite target-sprite";
    targetSprite.dataset.duration = this.options.totalSeconds || 180;
    targetSprite.style.width = "100%";
    targetSprite.style.left = "0%";
    targetSprite.style.background = "#f66"; // 타겟은 빨간색

    const targetSpriteContent = document.createElement("div");
    targetSpriteContent.className = "sprite-content";
    const targetSpriteName = document.createElement("span");
    targetSpriteName.className = "sprite-name";
    targetSpriteName.textContent = `${lightName}_Target`;
    targetSpriteContent.appendChild(targetSpriteName);
    targetSprite.appendChild(targetSpriteContent);

    targetTrackContent.appendChild(targetSprite);
    targetTrackElement.appendChild(targetTrackHeader);
    targetTrackElement.appendChild(targetTrackContent);

    // 기존 트랙 요소에 타겟 트랙 추가
    existingTrackElement.appendChild(targetTrackElement);

    // 타겟 트랙 객체로 관리
    const targetTrack = {
      element: targetTrackElement,
      keyframes: new Map(),
      objectId: `${lightId}_Target`,
      objectName: `${lightName}_Target`,
      trackContent: targetTrackContent,
      sprite: targetSprite,
      isTarget: true,
      parentLightId: lightId
    };

    // 타겟 트랙을 tracks에 추가
    this.tracks.set(`${lightId}_Target`, targetTrack);

    // 타겟 키프레임 추가 버튼 이벤트
    targetAddBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const currentTime = this.currentTime;
      const targetId = `${lightId}_Target`;
      const targetObject = this.editor.scene.getObjectByName(targetId);

      if (targetObject) {
        console.log("타겟 키프레임 추가:", { targetId, currentTime });

        // 타겟 트랙이 TimelineData에 있는지 확인
        const targetTrackData = this.timelineData.getTrackById(targetId, "position");
        console.log(`🔍 타겟 트랙 확인: ${targetId} position`, {
          found: !!targetTrackData,
          trackData: targetTrackData,
          keyframeCount: targetTrackData ? targetTrackData.getKeyframeCount() : 0
        });

        if (!targetTrackData) {
          console.warn(`❌ 타겟 트랙이 TimelineData에 없음: ${targetId} position`);

          // 직접 트랙을 생성해보기
          console.log(`🔄 직접 트랙 생성 시도: ${targetId} position`);
          if (!this.timelineData.tracksById.has(targetId)) {
            this.timelineData.tracksById.set(targetId, new Map());
          }
          const directTrackData = new TrackData();
          this.timelineData.tracksById.get(targetId).set("position", directTrackData);

          // 직접 생성 후 확인
          const directResult = this.timelineData.getTrackById(targetId, "position");
          console.log(`🔍 직접 트랙 생성 결과: ${targetId} position`, {
            found: !!directResult,
            trackData: directResult
          });

          if (!directResult) {
            console.error(`❌ 직접 트랙 생성도 실패: ${targetId} position`);
            return;
          }
        }

        // 타겟 position 키프레임 추가
        const targetValue = targetObject.position.clone();
        this.addKeyframeForProperty(targetId, "position", currentTime, targetValue);

        // 타겟 키프레임 추가 후 상태 확인
        const updatedTargetTrackData = this.timelineData.getTrackById(targetId, "position");
        if (updatedTargetTrackData) {
          console.log(`✅ 타겟 키프레임 추가 완료:`, {
            targetId,
            keyframeCount: updatedTargetTrackData.getKeyframeCount(),
            times: Array.from(updatedTargetTrackData.times.slice(0, updatedTargetTrackData.keyframeCount)),
            currentTime
          });
        }
      }
    });

    // 타겟 스프라이트 클릭 이벤트
    targetSprite.addEventListener("click", () => {
      // 타겟 클립 선택 처리 - 공통 메서드 사용
      this.selectClip(targetSprite);
    });

    console.log("타겟 트랙 생성 완료:", targetTrack);

    // 타겟 트랙을 TimelineData에 추가
    const targetObject = this.editor.scene.getObjectByName(`${lightId}_Target`);
    if (targetObject) {
      console.log(`🔄 타겟 TimelineData 트랙 추가: ${lightId}_Target position`, {
        targetObject: targetObject,
        targetUuid: targetObject.uuid,
        targetName: targetObject.name,
        targetType: targetObject.type
      });

      const addTrackResult = this.timelineData.addTrack(targetObject.uuid, "position", `${lightId}_Target`);
      console.log(`🔍 createTargetTrack addTrack 결과:`, {
        result: addTrackResult,
        resultType: typeof addTrackResult,
        hasGetKeyframeCount: addTrackResult ? typeof addTrackResult.getKeyframeCount === 'function' : false
      });

      // 추가 후 확인
      const targetTrackData = this.timelineData.getTrackById(`${lightId}_Target`, "position");
      console.log(`🔍 타겟 TimelineData 트랙 추가 확인: ${lightId}_Target position`, {
        found: !!targetTrackData,
        trackData: targetTrackData,
        tracksByIdSize: this.timelineData.tracksById.size,
        tracksByIdKeys: Array.from(this.timelineData.tracksById.keys())
      });
    } else {
      console.warn(`❌ 타겟 객체를 찾을 수 없음: ${lightId}_Target`);
    }
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
    console.log("=== updatePropertyPanelForLightType 시작 ===", {
      lightType,
      hasPropertyPanel: !!this.propertyPanel
    });

    if (!lightType || !this.propertyPanel) {
      console.warn("속성 패널 업데이트 실패:", { lightType, hasPropertyPanel: !!this.propertyPanel });
      return;
    }

    // 기존 UI 제거
    this.propertyPanel.clear();
    this.propertyRows = {};

    const properties = LIGHT_PROPERTIES[lightType];
    if (!properties) {
      console.warn("조명 속성을 찾을 수 없음:", lightType);
      return;
    }

    console.log("조명 속성 패널 생성:", {
      lightType,
      properties: Object.keys(properties)
    });

    // 조명 속성 표시
    const separator = new UIRow();
    separator.add(new UIText("=== 조명 속성 ==="));
    this.propertyPanel.add(separator);

    Object.entries(properties).forEach(([propertyName, propertyConfig]) => {
      console.log("속성 행 생성:", { propertyName, propertyConfig });
      const row = this.createPropertyRow(propertyName, propertyConfig);
      this.propertyPanel.add(row);
      this.propertyRows[propertyName] = row;
    });

    this.propertyPanel.dom.style.display = "";
    console.log("속성 패널 표시 완료");
  }

  // 타겟 전용 속성 패널
  updatePropertyPanelForTarget() {
    if (!this.propertyPanel) return;

    // 기존 UI 제거
    this.propertyPanel.clear();
    this.propertyRows = {};

    // 타겟 속성 표시
    const separator = new UIRow();
    separator.add(new UIText("=== 타겟 속성 ==="));
    this.propertyPanel.add(separator);

    Object.entries(TARGET_PROPERTIES).forEach(([propertyName, propertyConfig]) => {
      const row = this.createTargetPropertyRow(propertyName, propertyConfig);
      this.propertyPanel.add(row);
      this.propertyRows[propertyName] = row;
    });

    this.propertyPanel.dom.style.display = "";
  }

  createPropertyRow(propertyName, config) {
    // console.log("=== createPropertyRow 시작 ===", { propertyName, config });

    const row = new UIRow();
    row.add(new UIText(this.formatPropertyName(propertyName)));

    switch (config.type) {
      case 'number':
        // console.log("숫자 입력 생성:", { propertyName, config });
        const numberInput = new UINumber(config.default).setRange(config.range[0], config.range[1]);

        // 마우스 이벤트 리스너 추가
        this.addMouseEventListeners(numberInput.dom, propertyName, () => numberInput.getValue());

        numberInput.onChange(() => {
          // console.log("숫자 입력 변경:", { propertyName, value: numberInput.getValue() });
          this.updateLightProperty(propertyName, numberInput.getValue());
        });
        row.add(numberInput);
        break;

      case 'color':
        // console.log("색상 입력 생성:", { propertyName, config });
        const colorInput = new UIColor("#ffffff");

        // 마우스 이벤트 리스너 추가
        this.addMouseEventListeners(colorInput.dom, propertyName, () => new THREE.Color(colorInput.getValue()));

        colorInput.onChange(() => {
          const color = new THREE.Color(colorInput.getValue());
          // console.log("색상 입력 변경:", { propertyName, value: color });
          this.updateLightProperty(propertyName, color);
        });
        row.add(colorInput);
        break;

      case 'vector3':
        // console.log("벡터 입력 생성:", { propertyName, config });
        const xInput = new UINumber(0);
        const yInput = new UINumber(0);
        const zInput = new UINumber(0);

        // 각 입력 필드에 마우스 이벤트 리스너 추가
        this.addMouseEventListeners(xInput.dom, propertyName, () => xInput.getValue(), 'x');
        this.addMouseEventListeners(yInput.dom, propertyName, () => yInput.getValue(), 'y');
        this.addMouseEventListeners(zInput.dom, propertyName, () => zInput.getValue(), 'z');

        xInput.onChange(() => this.updateLightProperty(propertyName, 'x', xInput.getValue()));
        yInput.onChange(() => this.updateLightProperty(propertyName, 'y', yInput.getValue()));
        zInput.onChange(() => this.updateLightProperty(propertyName, 'z', zInput.getValue()));

        row.add(xInput);
        row.add(yInput);
        row.add(zInput);
        break;
    }

    // console.log("속성 행 생성 완료:", { propertyName, configType: config.type });
    return row;
  }

  // 마우스 이벤트 리스너 추가 메서드
  addMouseEventListeners(element, propertyName, getValueCallback, axis = null) {
    let isDragging = false;

    const handleMouseDown = (e) => {
      isDragging = true;
      this.isDragging = true;
      console.log("마우스 다운 - 드래그 시작:", { propertyName, axis });
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        // 드래그 중에는 업데이트하지 않음
        console.log("마우스 무브 - 드래그 중:", { propertyName, axis });
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        this.isDragging = false;
        console.log("마우스 업 - 드래그 종료, 업데이트 실행:", { propertyName, axis });

        // 마우스 업 시 즉시 업데이트
        const value = getValueCallback();
        if (axis) {
          this.updateLightProperty(propertyName, axis, value);
        } else {
          this.updateLightProperty(propertyName, value);
        }
      }
    };

    // 이벤트 리스너 추가
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);

    // 전역 마우스 이벤트도 추가 (드래그가 요소 밖에서 끝날 경우)
    document.addEventListener('mouseup', handleMouseUp);
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
    console.log("=== updateLightProperty 시작 ===", {
      propertyName,
      value,
      axis
    });
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
        case 'intensity': // 강도 속성
          light.intensity = value;
          break;
        case 'color': // 색상 속성
          light.color.copy(value);
          break;
        case 'distance': // 거리 속성
          light.distance = value;
          break;
        case 'angle': // 각도 속성
          light.angle = value;
          break;
        case 'penumbra': // 펜유브라 속성
          light.penumbra = value;
          break;
        case 'decay': // 감쇠 속성
          light.decay = value;
          break;
        case 'position': // 위치 속성
          light.position.copy(value);
          break;
        case 'target':
          if (light.target) {
            light.target.position.copy(value);
          }
          break;
      }
    }

    // 선택된 키프레임이 있으면 해당 키프레임 값 업데이트 (scene.userData에서 확인)
    const selectedKeyframeData = this.editor.scene.userData?.lightTimeline?.selectedKeyframe;

    // 선택된 키프레임이 있는지 확인
    let isSelectedKeyframe = false;
    if (selectedKeyframeData) {
      if (selectedKeyframeData.lightId.includes('_Target')) {
        // 타겟 키프레임인 경우 - 원래 선택된 객체의 이름과 비교
        isSelectedKeyframe = (selectedKeyframeData.lightId === this.selectedObject.name);
      } else {
        // 일반 조명 키프레임인 경우 - base light ID로 매칭
        const selectedBaseLightId = selectedKeyframeData.lightId.split('_').slice(0, 2).join('_'); // 'light_0_intensity' -> 'light_0'
        isSelectedKeyframe = (selectedBaseLightId === lightId);
      }
    }

    if (isSelectedKeyframe) {
      console.log("선택된 키프레임이 있음 - 속성 업데이트:", {
        lightId,
        propertyName,
        value,
        selectedKeyframe: selectedKeyframeData,
        isTarget: this.selectedObject.name.includes('_Target')
      });

      if (this.selectedObject.name.includes('_Target')) {
        // 타겟 키프레임인 경우 - position 속성만 업데이트
        const targetId = this.selectedObject.name;
        const trackData = this.timelineData.getTrackById(targetId, 'position');

        if (trackData) {
          const vectorValue = this.selectedObject.position.clone();
          const selectedKeyframeIndex = selectedKeyframeData.index;

          if (selectedKeyframeIndex !== undefined) {
            const success = trackData.updateKeyframeValue(selectedKeyframeIndex, vectorValue);
            if (success) {
              console.log(`✅ 타겟 키프레임 업데이트 성공: ${targetId} position at index ${selectedKeyframeIndex}`);
              this.timelineData.dirty = true;
            } else {
              console.warn(`❌ 타겟 키프레임 업데이트 실패: ${targetId} position at index ${selectedKeyframeIndex}`);
            }
          }
        } else {
          console.warn(`타겟 트랙을 찾을 수 없습니다: ${targetId}`);
        }
      } else {
        // 일반 조명 키프레임인 경우 - 선택된 키프레임의 모든 속성을 업데이트
        console.log("일반 조명 키프레임 - 모든 속성 업데이트:", { lightId, propertyName, value });

        // 조명의 모든 속성을 업데이트
        const properties = ['intensity', 'color', 'distance', 'angle', 'penumbra', 'decay'];

        properties.forEach(prop => {
          const uniqueTrackId = `${lightId}_${prop}`;
          let trackData = this.timelineData.getTrackById(uniqueTrackId, prop);
          if (!trackData) {
            trackData = this.timelineData.getTrackByUuid(light.uuid, prop);
          }

          if (trackData) {
            // 현재 조명 객체에서 속성 값 가져오기
            let propValue;
            switch (prop) {
              case 'intensity':
                propValue = new THREE.Vector3(light.intensity, 0, 0);
                break;
              case 'color':
                propValue = new THREE.Vector3(light.color.r, light.color.g, light.color.b);
                break;
              case 'distance':
                propValue = new THREE.Vector3(light.distance, 0, 0);
                break;
              case 'angle':
                propValue = new THREE.Vector3(light.angle, 0, 0);
                break;
              case 'penumbra':
                propValue = new THREE.Vector3(light.penumbra, 0, 0);
                break;
              case 'decay':
                propValue = new THREE.Vector3(light.decay, 0, 0);
                break;
              default:
                propValue = new THREE.Vector3(0, 0, 0);
            }

            // 선택된 키프레임의 인덱스 찾기
            const selectedKeyframeIndex = selectedKeyframeData.index;
            if (selectedKeyframeIndex !== undefined) {
              // 선택된 키프레임의 값 업데이트
              const success = trackData.updateKeyframeValue(selectedKeyframeIndex, propValue);
              if (success) {
                console.log(`✅ 키프레임 업데이트 성공: ${lightId} ${prop} at index ${selectedKeyframeIndex}`);
              } else {
                console.warn(`❌ 키프레임 업데이트 실패: ${lightId} ${prop} at index ${selectedKeyframeIndex}`);
              }
            }
          } else {
            console.warn(`트랙을 찾을 수 없습니다: ${lightId} ${prop}`);
          }
        });

        this.timelineData.dirty = true;
      }

      // TimelineData 상태 업데이트 (성능 최적화 - 필요할 때만 호출)
      if (this.timelineData.dirty) {
        this.timelineData.precomputeAnimationData();
        this.timelineData.dirty = false;
        // UI 업데이트는 필요할 때만
        this.updateUI();
      }

    } else {
      // 선택된 키프레임이 없으면 새 키프레임 추가
      this.addKeyframeForProperty(lightId, propertyName, this.currentTime, this.getPropertyValue(light, propertyName));
    }

    // objectChanged 시그널은 제거 - 무한 루프 방지
    // if (this.editor.signals?.objectChanged) {
    //   this.editor.signals.objectChanged.dispatch(light);
    // }
  }

  // 디바운싱된 키프레임 업데이트 메서드
  debouncedUpdateKeyframe(propertyName, newValue) {
    // 기존 타임아웃이 있으면 취소
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // 새로운 타임아웃 설정 (300ms 후에 업데이트)
    this.updateTimeout = setTimeout(() => {
      console.log("디바운싱된 키프레임 업데이트 실행:", { propertyName, newValue });
      this.updateLightProperty(propertyName, newValue);
      this.updateTimeout = null;
    }, 300);
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

      // 선택된 키프레임이 있으면 해당 키프레임 값 업데이트 (scene.userData에서 확인)
      const selectedKeyframeData = this.editor.scene.userData?.lightTimeline?.selectedKeyframe;
      if (selectedKeyframeData && selectedKeyframeData.property === propertyName && selectedKeyframeData.lightId === light.name) {
        console.log("선택된 타겟 키프레임 값 업데이트:", {
          targetId: light.name,
          propertyName,
          value,
          selectedKeyframe: selectedKeyframeData
        });
        this.updateSelectedKeyframeValue(light.name, propertyName, light.position.clone());
      } else {
        // 키프레임 추가 (UI는 이벤트 시스템에서 자동으로 생성됨)
        this.addKeyframeForProperty(light.name, propertyName, this.currentTime, light.position.clone());
      }
    } else {
      // 조명이 선택된 경우 target을 찾아서 업데이트
      if (!light.target) {
        console.warn("조명에 타겟이 없습니다:", light.name);
        return;
      }

      if (axis) {
        light.target.position[axis] = value;
      }

      // 선택된 키프레임이 있으면 해당 키프레임 값 업데이트 (scene.userData에서 확인)
      const selectedKeyframeData = this.editor.scene.userData?.lightTimeline?.selectedKeyframe;
      if (selectedKeyframeData && selectedKeyframeData.property === propertyName && selectedKeyframeData.lightId === targetId) {
        console.log("선택된 타겟 키프레임 값 업데이트:", {
          targetId,
          propertyName,
          value,
          selectedKeyframe: selectedKeyframeData
        });
        this.updateSelectedKeyframeValue(targetId, propertyName, light.target.position.clone());
      } else {
        // 키프레임 추가 (UI는 이벤트 시스템에서 자동으로 생성됨)
        this.addKeyframeForProperty(targetId, propertyName, this.currentTime, light.target.position.clone());
      }
    }

    // objectChanged 시그널은 제거 - 무한 루프 방지
    // if (this.editor.signals?.objectChanged) {
    //   this.editor.signals.objectChanged.dispatch(light);
    // }
  }

  // 모든 속성을 포함하는 키프레임 추가 메서드
  addKeyframeForAllProperties(lightId, time, allProperties) {
    console.log("=== addKeyframeForAllProperties 시작 ===", {
      lightId,
      time,
      allProperties
    });

    // 조명 객체 존재 확인
    const object = this.editor.scene.getObjectByName(lightId);
    if (!object) {
      console.log(`❌ 조명 객체를 찾을 수 없음: ${lightId}`);
      return;
    }

    let hasAddedKeyframe = false;

    // 각 속성에 대해 키프레임 추가
    Object.entries(allProperties).forEach(([propertyName, value]) => {
      // UI 트랙 ID를 고유 식별자로 사용하여 트랙 찾기
      const uniqueTrackId = `${lightId}_${propertyName}`;
      console.log(`🔍 트랙 찾기: ${uniqueTrackId} ${propertyName}`);

      let trackData = this.timelineData.getTrackById(uniqueTrackId, propertyName);
      console.log(`  ID 기반 트랙 찾기 결과:`, trackData ? "찾음" : "없음");

      // ID로 찾지 못한 경우 UUID로도 시도
      if (!trackData) {
        trackData = this.timelineData.getTrackByUuid(object.uuid, propertyName);
        console.log(`  UUID 기반 트랙 찾기 결과:`, trackData ? "찾음" : "없음");

        if (trackData) {
          console.log(`  🔄 UUID 기반 트랙을 ID 기반으로 복사: ${uniqueTrackId}`);

          // 기존 UUID 기반 트랙을 복사하여 새 트랙 생성
          const existingTrackData = trackData;
          const newTrackData = new TrackData();

          // 기존 키프레임들을 새 트랙으로 복사
          for (let i = 0; i < existingTrackData.keyframeCount; i++) {
            const time = existingTrackData.times[i];
            const value = new THREE.Vector3(
              existingTrackData.values[i * 3],
              existingTrackData.values[i * 3 + 1],
              existingTrackData.values[i * 3 + 2]
            );
            const interpolation = existingTrackData.interpolations[i];
            newTrackData.addKeyframe(time, value, interpolation);
          }

          // 새 트랙을 ID 기반 맵에 직접 추가
          if (!this.timelineData.tracksById.has(uniqueTrackId)) {
            this.timelineData.tracksById.set(uniqueTrackId, new Map());
          }
          this.timelineData.tracksById.get(uniqueTrackId).set(propertyName, newTrackData);

          trackData = newTrackData;
          console.log(`  새로 생성된 트랙을 직접 사용:`, newTrackData);
        }
      }

      if (trackData) {
        // 값 타입에 따라 Vector3로 변환
        let vectorValue;
        if (typeof value === 'number') {
          vectorValue = new THREE.Vector3(value, 0, 0);
        } else if (value instanceof THREE.Color) {
          vectorValue = new THREE.Vector3(value.r, value.g, value.b);
        } else if (value instanceof THREE.Vector3) {
          vectorValue = value.clone();
        } else {
          console.warn('지원하지 않는 값 타입:', typeof value, value);
          return;
        }

        // TimelineData의 addKeyframe을 사용
        const success = trackData.addKeyframe(time, vectorValue);
        if (success) {
          hasAddedKeyframe = true;
          console.log(`✅ 키프레임 추가 성공: ${lightId} ${propertyName} at ${time}`);

          // TimelineData의 dirty 플래그만 설정하고 precomputeAnimationData는 호출하지 않음
          this.timelineData.dirty = true;
          console.log(`🔧 TimelineData dirty 플래그 설정: ${lightId} ${propertyName}`);
        } else {
          console.warn(`❌ 키프레임 추가 실패: ${lightId} ${propertyName} at ${time}`);
        }
      } else {
        console.warn(`트랙을 찾을 수 없습니다: ${lightId} ${propertyName}`);
      }
    });

    // 하나의 키프레임 UI만 추가 (첫 번째 속성 기준)
    if (hasAddedKeyframe) {
      const firstProperty = Object.keys(allProperties)[0];
      console.log(`✅ 키프레임 UI 추가 시도: ${lightId} ${firstProperty} at ${time}`);
      this.addKeyframeUI(lightId, firstProperty, time);
    } else {
      console.warn(`❌ 키프레임 추가 실패로 UI 생성 안함: ${lightId}`);
    }

    console.log("=== addKeyframeForAllProperties 완료 ===");

    // 키프레임 추가 후 TimelineData 상태 확인
    console.log(`🔍 키프레임 추가 후 TimelineData 상태:`, {
      lightId,
      tracksCount: this.timelineData.tracks.size,
      tracksByIdCount: this.timelineData.tracksById.size,
      lightTracks: this.timelineData.tracksById.get(lightId) ?
        Array.from(this.timelineData.tracksById.get(lightId).keys()) : []
    });
  }

  addKeyframeForProperty(lightId, propertyName, time, value) {
    console.log("=== addKeyframeForProperty 시작 ===", {
      lightId,
      propertyName,
      time,
      value,
      valueType: typeof value
    });

    // TimelineData 전체 상태 확인
    console.log("🔍 TimelineData 현재 상태:", {
      tracksCount: this.timelineData.tracks.size,
      tracksByIdCount: this.timelineData.tracksById.size,
      maxTime: this.timelineData.maxTime
    });

    // 조명 객체 존재 확인
    const object = this.editor.scene.getObjectByName(lightId);
    console.log(`🔍 조명 객체 확인: ${lightId}`, {
      exists: !!object,
      uuid: object?.uuid,
      type: object?.type
    });

    // ID 기반으로 트랙 찾기
    let trackData = this.timelineData.getTrackById(lightId, propertyName);
    console.log(`🔍 ID 기반 트랙 찾기 결과: ${lightId} ${propertyName}`, {
      found: !!trackData,
      trackData: trackData,
      keyframeCount: trackData ? trackData.getKeyframeCount() : 0
    });

    // ID로 찾지 못한 경우 UUID로도 시도
    if (!trackData) {
      const object = this.editor.scene.getObjectByName(lightId);
      if (object) {
        trackData = this.timelineData.getTrackByUuid(object.uuid, propertyName);
        console.log(`🔍 UUID 기반 트랙 찾기 시도: ${object.uuid} ${propertyName}`, {
          found: !!trackData,
          trackData: trackData,
          keyframeCount: trackData ? trackData.getKeyframeCount() : 0
        });

        // UUID로 찾은 경우, ID 기반 트랙도 생성해주기
        if (trackData) {
          console.log(`🔄 UUID 기반 트랙을 ID 기반으로도 생성: ${lightId} ${propertyName}`);
          this.timelineData.addTrack(object.uuid, propertyName, lightId);

          // 생성 후 다시 확인
          trackData = this.timelineData.getTrackById(lightId, propertyName);
          console.log(`🔍 ID 기반 트랙 생성 후 확인: ${lightId} ${propertyName}`, {
            found: !!trackData,
            trackData: trackData
          });
        }
      } else {
        console.log(`❌ 조명 객체를 찾을 수 없음: ${lightId}`);
      }
    }

    if (trackData) {
      console.log("트랙 데이터 찾음:", {
        trackData,
        keyframeCount: trackData.getKeyframeCount(),
        times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
        values: Array.from(trackData.values.slice(0, trackData.keyframeCount * 3))
      });

      // 값 타입에 따라 Vector3로 변환
      let vectorValue;
      if (typeof value === 'number') {
        // intensity, distance, angle, penumbra, decay 등의 숫자 값
        vectorValue = new THREE.Vector3(value, 0, 0);
        console.log("숫자 값을 Vector3로 변환:", { original: value, converted: vectorValue });
      } else if (value instanceof THREE.Color) {
        // color 값
        vectorValue = new THREE.Vector3(value.r, value.g, value.b);
        console.log("Color 값을 Vector3로 변환:", { original: value, converted: vectorValue });
      } else if (value instanceof THREE.Vector3) {
        // position, target 등의 Vector3 값
        vectorValue = value.clone();
        console.log("Vector3 값 복사:", { original: value, converted: vectorValue });
      } else {
        console.warn('지원하지 않는 값 타입:', typeof value, value);
        return;
      }

      // TimelineData의 addKeyframe을 사용하여 이벤트 시스템 활용
      const success = trackData.addKeyframe(time, vectorValue);
      if (success) {
        console.log(`✅ 키프레임 추가 성공: ${lightId} ${propertyName} at ${time}`);

        // TimelineData의 dirty 플래그만 설정하고 precomputeAnimationData는 호출하지 않음
        this.timelineData.dirty = true;
        console.log(`🔧 TimelineData dirty 플래그 설정: ${lightId} ${propertyName}`);

        // 키프레임 UI 생성
        console.log(`🎨 키프레임 UI 생성 시도: ${lightId} ${propertyName} at ${time}`);
        this.addKeyframeUI(lightId, propertyName, time);

        // 추가된 후 트랙 데이터 상태 출력
        console.log("📊 키프레임 추가 후 트랙 상태:", {
          lightId,
          propertyName,
          keyframeCount: trackData.getKeyframeCount(),
          times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
          values: Array.from(trackData.values.slice(0, trackData.keyframeCount * 3)),
          interpolations: Array.from(trackData.interpolations.slice(0, trackData.keyframeCount))
        });

        // TimelineData 전체 상태 업데이트 확인
        console.log("📊 TimelineData 업데이트 후 상태:", {
          tracksCount: this.timelineData.tracks.size,
          tracksByIdCount: this.timelineData.tracksById.size,
          maxTime: this.timelineData.maxTime
        });

        // ID 기반 트랙 재확인
        const updatedTrackData = this.timelineData.getTrackById(lightId, propertyName);
        console.log(`🔍 키프레임 추가 후 ID 기반 트랙 재확인: ${lightId} ${propertyName}`, {
          found: !!updatedTrackData,
          keyframeCount: updatedTrackData ? updatedTrackData.getKeyframeCount() : 0
        });

        // 전체 TimelineData 상태 출력
        this.logTimelineDataState();
      } else {
        console.warn(`❌ 키프레임 추가 실패: ${lightId} ${propertyName} at ${time}`);
      }
    } else {
      console.warn(`트랙을 찾을 수 없습니다: ${lightId} ${propertyName}`);
      console.log("사용 가능한 트랙들:", this.timelineData.getAllTracksById());
    }

    console.log("=== addKeyframeForProperty 완료 ===");
  }

  addKeyframeUI(lightId, propertyName, time) {
    console.log(`🔍 addKeyframeUI 시작: ${lightId} ${propertyName} at ${time}`);
    const actualKeys = Array.from(this.tracks.keys()).map(key => ({ key, type: typeof key }));
    console.log(`🔍 tracks 맵 상태:`, {
      tracksSize: this.tracks.size,
      tracksKeys: Array.from(this.tracks.keys()),
      lightId,
      hasTrack: this.tracks.has(lightId),
      actualKeys,
      tracksEntries: Array.from(this.tracks.entries()).map(([key, value]) => ({
        key,
        objectId: value.objectId,
        lightType: value.lightType,
        hasSprite: !!value.sprite
      }))
    });

    // 실제 키와 lightId 비교
    console.log(`🔍 키 비교:`, {
      lightId,
      lightIdType: typeof lightId,
      actualKeys: actualKeys.map(k => k.key),
      actualKeysDetail: actualKeys,
      matches: actualKeys.some(k => k.key === lightId)
    });

    // tracks 맵의 모든 키-값 쌍 출력
    const entries = Array.from(this.tracks.entries()).map(([key, value]) => ({
      key,
      keyType: typeof key,
      value: value ? { objectId: value.objectId, objectName: value.objectName } : null
    }));
    console.log(`🔍 tracks 맵 전체 내용:`, {
      size: this.tracks.size,
      entries
    });

    // 첫 번째 키 상세 출력
    if (entries.length > 0) {
      console.log(`🔍 첫 번째 키 상세:`, {
        key: entries[0].key,
        keyType: entries[0].keyType,
        keyStringified: JSON.stringify(entries[0].key),
        lightIdStringified: JSON.stringify(lightId),
        strictEqual: entries[0].key === lightId,
        looseEqual: entries[0].key == lightId
      });
    }

    const track = this.tracks.get(lightId);
    if (!track) {
      console.warn(`❌ 트랙을 찾을 수 없음: ${lightId}`);
      console.error(`🔍 tracks 맵 전체 상태:`, {
        size: this.tracks.size,
        keys: Array.from(this.tracks.keys()),
        lightId,
        hasTrack: this.tracks.has(lightId)
      });
      return;
    }
    console.log(`✅ 트랙 찾음:`, track);

    // 타겟인 경우 타겟 스프라이트, 조명인 경우 조명 스프라이트 사용
    let targetSprite = null;
    if (lightId.includes('_Target')) {
      // 타겟 키프레임인 경우 - 타겟 트랙의 스프라이트에 표시
      const targetTrack = this.tracks.get(lightId);
      if (targetTrack && targetTrack.sprite) {
        targetSprite = targetTrack.sprite;
        console.log(`🎯 타겟 스프라이트:`, targetSprite);
      } else {
        console.warn(`❌ 타겟 트랙을 찾을 수 없음: ${lightId}`);
        return;
      }
    } else {
      // 조명 키프레임인 경우 - 조명 스프라이트에 표시
      targetSprite = track.sprite;
      console.log(`💡 조명 스프라이트:`, targetSprite);
    }

    if (!targetSprite) {
      console.warn(`❌ 스프라이트를 찾을 수 없음: ${lightId}`);
      console.log(`트랙 객체:`, track);

      // 스프라이트가 없으면 동적으로 생성
      console.log(`🔄 스프라이트 동적 생성 시도: ${lightId}`);
      this.createLightClip(track, track.objectName, false);
      targetSprite = track.sprite;

      if (!targetSprite) {
        console.error(`❌ 스프라이트 생성 실패: ${lightId}`);
        return;
      }
      console.log(`✅ 스프라이트 동적 생성 성공:`, targetSprite);
    }

    // 이미 존재하는 키프레임인지 확인
    const existingKeyframe = targetSprite.querySelector(`[data-time="${time.toFixed(2)}"][data-property="${propertyName}"]`);
    if (existingKeyframe) {
      console.log("이미 존재하는 키프레임입니다:", { lightId, propertyName, time });
      return;
    }

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
    keyframe.setAttribute('data-light-id', lightId); // updateKeyframeUI에서 사용

    // 키프레임을 스프라이트에 추가
    console.log(`🔄 키프레임을 스프라이트에 추가 시도:`, {
      lightId,
      propertyName,
      time,
      targetSprite,
      keyframe
    });

    targetSprite.appendChild(keyframe);
    console.log(`✅ 키프레임 UI 생성 완료: ${lightId} ${propertyName} at ${time}`, keyframe);

    // 키프레임 클릭 이벤트 추가
    keyframe.addEventListener("click", (e) => {
      e.stopPropagation();

      // 타겟 키프레임과 조명 키프레임 구분하여 lightId 생성
      let timelineDataLightId;
      if (lightId.includes('_Target')) {
        // 타겟 키프레임인 경우 이미 올바른 형태 (light_0_Target)
        timelineDataLightId = lightId;
        console.log(`타겟 키프레임 클릭: ${lightId} ${propertyName} at ${time}`, {
          originalLightId: lightId,
          timelineDataLightId: timelineDataLightId
        });
      } else {
        // 조명 키프레임인 경우 propertyName 추가 (light_0_intensity)
        timelineDataLightId = `${lightId}_${propertyName}`;
        console.log(`조명 키프레임 클릭: ${lightId} ${propertyName} at ${time}`, {
          originalLightId: lightId,
          timelineDataLightId: timelineDataLightId
        });
      }

      this.selectKeyframe(timelineDataLightId, time, keyframe, propertyName);
    });

    // 키프레임 드래그 기능 추가
    this.makeKeyframeDraggable(keyframe, track, time, propertyName);

    // 실제 DOM에 추가되었는지 확인
    const addedKeyframe = targetSprite.querySelector(`[data-time="${time.toFixed(2)}"][data-property="${propertyName}"]`);
    if (addedKeyframe) {
      console.log(`✅ DOM에 키프레임 실제 추가 확인:`, addedKeyframe);
    } else {
      console.error(`❌ DOM에 키프레임 추가 실패 확인`);
    }
  }



  // BaseTimeline의 play 메서드 오버라이드
  play() {
    // console.log("=== LightTimeline play 시작 ===");
    if (this.isPlaying) {
      console.log("이미 재생 중입니다.");
      return;
    }

    this.isPlaying = true;
    console.log("애니메이션 데이터 프리컴파일 시작");
    this.timelineData.precomputeAnimationData(); // 애니메이션 데이터 프리컴파일

    console.log("애니메이션 루프 시작");
    this.animate();
  }

  // BaseTimeline의 animate 메서드 오버라이드
  animate() {
    this.showAllLightKeyframes()
    if (!this.isPlaying) {
      console.log("⏸️ LightTimeline animate: 재생 중이 아님");
      return;
    }

    const deltaTime = 1 / this.timelineData.frameRate;
    this.currentTime += deltaTime;

    if (this.currentTime >= this.timelineData.maxTime) {
      this.currentTime = 0;
    }

    console.log("🎬 === LightTimeline animate 호출 ===", {
      currentTime: this.currentTime,
      maxTime: this.timelineData.maxTime,
      frameRate: this.timelineData.frameRate,
      isPlaying: this.isPlaying,
      deltaTime: deltaTime
    });

    // LightTimeline의 updateFrame 메서드 호출
    const frame = Math.floor(this.currentTime * this.options.framesPerSecond);
    // console.log(`🎬 updateFrame 호출: frame=${frame}, currentTime=${this.currentTime}`);
    this.updateFrame(frame);

    this.updateUI();
    requestAnimationFrame(() => this.animate());
  }

  // BaseTimeline의 pause 메서드 오버라이드
  pause() {
    console.log("=== LightTimeline pause ===");
    this.isPlaying = false;
  }

  // BaseTimeline의 stop 메서드 오버라이드
  stop() {
    console.log("=== LightTimeline stop ===");
    this.isPlaying = false;
    this.currentTime = 0;
  }

  // MotionTimeline과 동일한 방식으로 updateAnimation 메서드 추가
  updateAnimation(time = null) {
    const currentTime = time !== null ? time : this.currentTime;

    // console.log("🎬 === LightTimeline updateAnimation 호출 ===", {
    //   time,
    //   currentTime,
    //   isPlaying: this.isPlaying,
    //   timelineDataExists: !!this.timelineData,
    //   tracksCount: this.tracks.size
    // });

    // 프레임으로 변환하여 updateFrame 호출
    const frame = Math.floor(currentTime * this.options.framesPerSecond);
    // console.log(`🎬 updateFrame 호출: frame=${frame}, currentTime=${currentTime}`);
    this.updateFrame(frame);

    // 애니메이션 업데이트 후 렌더링 강제 업데이트
    this.forceRenderUpdate();

    // 추가: Three.js 렌더러 직접 호출
    if (this.editor.renderer && this.editor.scene && this.editor.camera) {
      console.log("🔄 Three.js 렌더러 직접 호출");
      this.editor.renderer.render(this.editor.scene, this.editor.camera);
    }
  }

  // 강제 렌더링 업데이트 메서드
  forceRenderUpdate() {
    console.log("🔄 강제 렌더링 업데이트 실행");

    // 모든 가능한 렌더링 시그널 발생
    if (this.editor.signals?.rendererUpdated) {
      this.editor.signals.rendererUpdated.dispatch();
    }

    if (this.editor.signals?.sceneGraphChanged) {
      this.editor.signals.sceneGraphChanged.dispatch();
    }

    if (this.editor.signals?.objectChanged) {
      // 모든 조명 객체에 대해 objectChanged 시그널 발생 (fromAnimation 플래그로 무한 루프 방지)
      this.tracks.forEach((track) => {
        const object = this.editor.scene.getObjectByName(track.objectId);
        if (object && track.lightType) {
          this.editor.signals.objectChanged.dispatch(object, { fromAnimation: true });
        }
      });
    }

    // Three.js 렌더러 직접 업데이트 시도
    if (this.editor.renderer && this.editor.renderer.render) {
      this.editor.renderer.render(this.editor.scene, this.editor.camera);
    }
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

  // BaseTimeline의 updateUI 메서드 구현
  updateUI() {
    // 현재 시간에 맞춰 playhead 위치 업데이트
    const totalDuration = this.options.totalSeconds || 180;
    const timePercent = (this.currentTime / totalDuration) * 100;

    // playhead 요소 찾기 및 위치 업데이트
    const playhead = document.querySelector('.playhead');
    if (playhead) {
      playhead.style.left = `${timePercent}% `;
    }

    console.log("=== LightTimeline updateUI ===", {
      currentTime: this.currentTime,
      timePercent,
      playheadExists: !!playhead
    });
  }

  updateFrame(frame) {
    this.currentTime = frame / this.options.framesPerSecond;

    // 성능 최적화: 로그 출력 최소화 (재생 중이 아닐 때만)
    if (!this.isPlaying) {
      console.log("🎬 === LightTimeline updateFrame 시작 ===", {
        frame,
        currentTime: this.currentTime,
        tracksCount: this.tracks.size,
        timelineDataExists: !!this.timelineData
      });
    }

    let totalUpdates = 0;
    let totalTracks = 0;

    this.tracks.forEach((track) => {
      totalTracks++;

      // 성능 최적화: 로그 출력 최소화
      if (!this.isPlaying) {
        console.log(`🔍 트랙 처리 중: ${track.objectId} (${track.lightType || 'Target'})`);
      }

      // 타겟 트랙인 경우 별도 처리
      if (track.isTarget) {
        this.updateTargetTrack(track);
        return;
      }

      const object = this.editor.scene.getObjectByName(track.objectId);
      if (!object) {
        if (!this.isPlaying) {
          console.log(`❌ 조명 객체를 찾을 수 없음: ${track.objectId}`);
        }
        // 객체가 없어도 트랙은 유지 (UI 트랙이므로)
        // this.tracks.delete(track.objectId); // 트랙 삭제 제거
        console.log(`⚠️ 조명 객체 없음, 트랙은 유지: ${track.objectId}`);
        return;
      }

      if (!track.lightType) {
        if (!this.isPlaying) {
          console.log(`❌ 조명 타입이 설정되지 않음: ${track.objectId}`);
        }
        return;
      }

      const properties = LIGHT_PROPERTIES[track.lightType];
      let hasChanges = false;

      // 조명 속성 애니메이션
      Object.keys(properties).forEach((propertyType) => {
        // 성능 최적화: 로그 출력 최소화
        if (!this.isPlaying) {
          console.log(`  💡 속성 체크: ${propertyType}`);
        }

        // UI 트랙 ID를 고유 식별자로 사용하여 트랙 찾기
        const uniqueTrackId = `${track.objectId}_${propertyType}`;
        let trackData = this.timelineData.getTrackById(uniqueTrackId, propertyType);

        // ID로 찾지 못하면 UUID 기반으로 시도
        if (!trackData) {
          const object = this.editor.scene.getObjectByName(track.objectId);
          if (object) {
            trackData = this.timelineData.getTrackByUuid(object.uuid, propertyType);
            if (!this.isPlaying) {
              console.log(`    🔄 UUID 기반 트랙 찾기 시도: ${object.uuid} ${propertyType} `, trackData ? "찾음" : "없음");
            }
            // UUID 기반 트랙을 ID 기반으로 복사
            if (trackData) {
              // 기존 UUID 기반 트랙을 복사하여 새 트랙 생성
              const existingTrackData = trackData;
              const newTrackData = new TrackData();

              // 기존 키프레임들을 새 트랙으로 복사
              for (let i = 0; i < existingTrackData.keyframeCount; i++) {
                const time = existingTrackData.times[i];
                const value = new THREE.Vector3(
                  existingTrackData.values[i * 3],
                  existingTrackData.values[i * 3 + 1],
                  existingTrackData.values[i * 3 + 2]
                );
                const interpolation = existingTrackData.interpolations[i];
                newTrackData.addKeyframe(time, value, interpolation);
              }

              // 새 트랙을 ID 기반 맵에 직접 추가
              if (!this.timelineData.tracksById.has(uniqueTrackId)) {
                this.timelineData.tracksById.set(uniqueTrackId, new Map());
              }
              this.timelineData.tracksById.get(uniqueTrackId).set(propertyType, newTrackData);

              trackData = newTrackData;
            }
          }
        }

        if (!trackData) {
          if (!this.isPlaying) {
            console.log(`    ❌ 트랙 데이터 없음: ${track.objectId} ${propertyType}`);
          }
          return;
        }

        if (trackData.getKeyframeCount() === 0) {
          if (!this.isPlaying) {
            console.log(`    ⚠️ 키프레임 없음: ${track.objectId} ${propertyType}`);
          }
          return;
        }

        if (!this.isPlaying) {
          console.log(`    ✅ 트랙 데이터 찾음: ${track.objectId} ${propertyType}`, {
            keyframeCount: trackData.getKeyframeCount(),
            times: Array.from(trackData.times.slice(0, trackData.keyframeCount))
          });
        }

        const value = trackData.getValueAtTime(this.currentTime);

        if (value !== null) {
          const beforeValue = this.getPropertyValue(object, propertyType);
          this.setPropertyValue(object, propertyType, value);
          hasChanges = true;
          totalUpdates++;

          if (!this.isPlaying) {
            console.log(`    ✅ 조명 속성 업데이트 성공: ${track.objectId} ${propertyType}`, {
              before: beforeValue,
              after: value,
              time: this.currentTime
            });
          }
        } else {
          if (!this.isPlaying) {
            console.log(`    ❌ 보간된 값이 null: ${track.objectId} ${propertyType}`);
          }
        }
      });

      // 타겟 애니메이션은 별도 트랙에서 처리하므로 여기서는 제거

      if (hasChanges) {
        if (!this.isPlaying) {
          console.log(`    🔄 객체 변경 시그널 발생: ${track.objectId}`);
        }

        // 성능 최적화: 시그널 발생 최소화 (fromAnimation 플래그로 무한 루프 방지)
        if (this.editor.signals?.objectChanged) {
          this.editor.signals.objectChanged.dispatch(object, { fromAnimation: true });
        }
      } else {
        if (!this.isPlaying) {
          console.log(`    ⚠️ 변경사항 없음: ${track.objectId}`);
        }
      }
    });

    console.log(`🎬 === LightTimeline updateFrame 완료 ===`, {
      totalTracks,
      totalUpdates,
      currentTime: this.currentTime,
      tracksKeys: Array.from(this.tracks.keys())
    });

    // UI 업데이트
    this.updateUI();

    // 성능 최적화: 변경사항이 있을 때만 렌더링 업데이트
    if (totalUpdates > 0) {
      // 재생 중일 때는 최소한의 렌더링 업데이트만
      if (this.isPlaying) {
        if (this.editor.signals?.rendererUpdated) {
          this.editor.signals.rendererUpdated.dispatch();
        }
      } else {
        this.forceRenderUpdate();
      }
    }
  }



  // 타겟 트랙 업데이트 메서드
  updateTargetTrack(track) {
    console.log(`🎯 타겟 트랙 업데이트: ${track.objectId} `);

    const targetObject = this.editor.scene.getObjectByName(track.objectId);
    if (!targetObject) {
      console.log(`❌ 타겟 객체를 찾을 수 없음: ${track.objectId} `);
      // 타겟 객체가 없어도 트랙은 유지 (UI 트랙이므로)
      // this.tracks.delete(track.objectId); // 트랙 삭제 제거
      console.log(`⚠️ 타겟 객체 없음, 트랙은 유지: ${track.objectId} `);
      return;
    }

    // 타겟 position 트랙 찾기 (타겟 ID를 직접 사용)
    let trackData = this.timelineData.getTrackById(track.objectId, "position");
    if (!trackData) {
      trackData = this.timelineData.getTrackByUuid(targetObject.uuid, "position");
      // UUID 기반 트랙을 ID 기반으로 복사
      if (trackData) {
        // 기존 UUID 기반 트랙을 복사하여 새 트랙 생성
        const existingTrackData = trackData;
        const newTrackData = new TrackData();

        // 기존 키프레임들을 새 트랙으로 복사
        for (let i = 0; i < existingTrackData.keyframeCount; i++) {
          const time = existingTrackData.times[i];
          const value = new THREE.Vector3(
            existingTrackData.values[i * 3],
            existingTrackData.values[i * 3 + 1],
            existingTrackData.values[i * 3 + 2]
          );
          const interpolation = existingTrackData.interpolations[i];
          newTrackData.addKeyframe(time, value, interpolation);
        }

        // 새 트랙을 ID 기반 맵에 직접 추가
        if (!this.timelineData.tracksById.has(track.objectId)) {
          this.timelineData.tracksById.set(track.objectId, new Map());
        }
        this.timelineData.tracksById.get(track.objectId).set("position", newTrackData);

        trackData = newTrackData;
      }
    }

    if (!trackData) {
      console.log(`❌ 타겟 트랙 데이터 없음: ${track.objectId} position`);
      return;
    }

    if (trackData.getKeyframeCount() === 0) {
      console.log(`⚠️ 타겟 키프레임 없음: ${track.objectId} `, {
        trackData,
        trackId: track.objectId,
        hasTrackData: !!trackData
      });
      return;
    }

    console.log(`✅ 타겟 트랙 데이터 찾음: ${track.objectId} `, {
      keyframeCount: trackData.getKeyframeCount(),
      times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
      currentTime: this.currentTime
    });

    // 현재 시간에서 타겟 위치 값 가져오기
    const targetValue = trackData.getValueAtTime(this.currentTime);
    console.log(`🎯 타겟 보간 시도: ${track.objectId} `, {
      currentTime: this.currentTime,
      keyframeCount: trackData.getKeyframeCount(),
      times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
      targetValue: targetValue
    });

    if (targetValue !== null) {
      const beforeValue = targetObject.position.clone();
      targetObject.position.copy(targetValue);

      console.log(`✅ 타겟 위치 업데이트 성공: ${track.objectId} `, {
        before: beforeValue,
        after: targetValue,
        time: this.currentTime,
        changed: !beforeValue.equals(targetValue)
      });

      // 객체 변경 시그널 발생 (fromAnimation 플래그로 무한 루프 방지)
      if (this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(targetObject, { fromAnimation: true });
      }
    } else {
      console.log(`❌ 타겟 보간된 값이 null: ${track.objectId} `);
    }
  }

  setPropertyValue(object, propertyType, value) {
    // 성능 최적화: 로그 출력 최소화
    if (!this.isPlaying) {
      console.log(`    🔧 setPropertyValue 호출: ${object.name} ${propertyType} =`, value);
    }

    switch (propertyType) {
      case "intensity":
        const oldIntensity = object.intensity;
        object.intensity = value.x;
        if (!this.isPlaying) {
          console.log(`      💡 intensity 변경: ${oldIntensity} → ${object.intensity} `);
        }
        break;
      case "color":
        const oldColor = object.color.clone();
        object.color.setRGB(value.x, value.y, value.z);
        if (!this.isPlaying) {
          console.log(`      🎨 color 변경: ${oldColor} → ${object.color} `);
        }
        break;
      case "position":
        const oldPosition = object.position.clone();
        object.position.copy(value);
        if (!this.isPlaying) {
          console.log(`      📍 position 변경: ${oldPosition} → ${object.position} `);
        }
        break;
      case "distance":
        const oldDistance = object.distance;
        object.distance = value.x;
        if (!this.isPlaying) {
          console.log(`      📏 distance 변경: ${oldDistance} → ${object.distance} `);
        }
        break;
      case "angle":
        const oldAngle = object.angle;
        object.angle = value.x;
        if (!this.isPlaying) {
          console.log(`      📐 angle 변경: ${oldAngle} → ${object.angle} `);
        }
        break;
      case "penumbra":
        const oldPenumbra = object.penumbra;
        object.penumbra = value.x;
        if (!this.isPlaying) {
          console.log(`      🌓 penumbra 변경: ${oldPenumbra} → ${object.penumbra} `);
        }
        break;
      case "decay":
        const oldDecay = object.decay;
        object.decay = value.x;
        if (!this.isPlaying) {
          console.log(`      📉 decay 변경: ${oldDecay} → ${object.decay} `);
        }
        break;
      default:
        if (!this.isPlaying) {
          console.log(`      ⚠️ 알 수 없는 속성 타입: ${propertyType} `);
        }
    }

    // 성능 최적화: 재생 중에는 렌더링 업데이트 최소화
    if (!this.isPlaying && this.editor.signals?.rendererUpdated) {
      this.editor.signals.rendererUpdated.dispatch();
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

      // 저장된 선택된 키프레임 정보 복원
      const savedSelectedKeyframe = this.editor.scene.userData.lightTimeline.selectedKeyframe;
      if (savedSelectedKeyframe) {
        console.log("저장된 선택된 키프레임 복원:", savedSelectedKeyframe);
        this.selectedKeyframe = {
          lightId: savedSelectedKeyframe.lightId,
          index: savedSelectedKeyframe.index,
          time: savedSelectedKeyframe.time,
          property: savedSelectedKeyframe.property,
          value: savedSelectedKeyframe.value,
          element: null // UI 요소는 복원 시점에 없으므로 null
        };

        // 선택된 키프레임 UI 하이라이트 복원
        this.restoreSelectedKeyframeUI();
      }
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
        const targetId = `${track.objectId} _Target`;
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

  // 선택된 키프레임 UI 하이라이트 복원
  restoreSelectedKeyframeUI() {
    if (!this.selectedKeyframe) return;

    // 선택된 키프레임의 UI 요소 찾기
    const keyframeElement = this.container.querySelector(
      `[data - time= "${this.selectedKeyframe.time.toFixed(2)}"][data - property="${this.selectedKeyframe.property}"][data - light - id= "${this.selectedKeyframe.lightId}"]`
    );

    if (keyframeElement) {
      // 선택된 키프레임 하이라이트
      keyframeElement.style.backgroundColor = "#ff0";
      this.selectedKeyframe.element = keyframeElement;
      console.log("선택된 키프레임 UI 하이라이트 복원 완료");
    } else {
      console.warn("선택된 키프레임의 UI 요소를 찾을 수 없습니다:", this.selectedKeyframe);
    }
  }

  // TimelineData 상태를 콘솔에 출력하는 메서드
  logTimelineDataState() {
    console.log("=== TimelineData 전체 상태 ===");

    // UUID 기반 트랙들
    console.log("UUID 기반 트랙들:");
    this.timelineData.tracks.forEach((objectTracks, objectUuid) => {
      console.log(`  객체 UUID: ${objectUuid} `);
      objectTracks.forEach((trackData, property) => {
        console.log(`    속성: ${property} `);
        console.log(`      키프레임 개수: ${trackData.getKeyframeCount()} `);
        console.log(`      시간들: [${Array.from(trackData.times.slice(0, trackData.keyframeCount)).join(', ')}]`);
        console.log(`      값들: [${Array.from(trackData.values.slice(0, trackData.keyframeCount * 3)).join(', ')}]`);
        console.log(`      보간 방식들: [${Array.from(trackData.interpolations.slice(0, trackData.keyframeCount)).join(', ')}]`);
      });
    });

    // ID 기반 트랙들
    console.log("ID 기반 트랙들:");
    this.timelineData.tracksById.forEach((objectTracks, objectId) => {
      console.log(`  객체 ID: ${objectId} `);
      objectTracks.forEach((trackData, property) => {
        console.log(`    속성: ${property} `);
        console.log(`      키프레임 개수: ${trackData.getKeyframeCount()} `);
        console.log(`      시간들: [${Array.from(trackData.times.slice(0, trackData.keyframeCount)).join(', ')}]`);
        console.log(`      값들: [${Array.from(trackData.values.slice(0, trackData.keyframeCount * 3)).join(', ')}]`);
        console.log(`      보간 방식들: [${Array.from(trackData.interpolations.slice(0, trackData.keyframeCount)).join(', ')}]`);
      });
    });

    console.log("=== TimelineData 상태 출력 완료 ===");
  }

  // 테스트용 메서드: 현재 시간에서 모든 조명의 상태 출력
  logCurrentLightStates() {
    console.log("=== 현재 조명 상태 ===");
    this.tracks.forEach((track) => {
      const object = this.editor.scene.getObjectByName(track.objectId);
      if (!object || !track.lightType) return;

      console.log(`조명 ${track.objectId} (${track.lightType}): `);
      const properties = LIGHT_PROPERTIES[track.lightType];
      Object.keys(properties).forEach((propertyType) => {
        const value = this.getPropertyValue(object, propertyType);
        console.log(`  ${propertyType}: `, value);
      });

      if (object.target) {
        console.log(`  target position: `, object.target.position);
      }
    });
    console.log("=== 조명 상태 출력 완료 ===");
  }

  // 테스트용 메서드: 특정 조명의 키프레임 데이터 확인
  testLightKeyframes(lightId) {
    console.log(`=== ${lightId} 키프레임 테스트 === `);

    const object = this.editor.scene.getObjectByName(lightId);
    if (!object) {
      console.log("조명 객체를 찾을 수 없습니다:", lightId);
      return;
    }

    const track = this.tracks.get(lightId);
    if (!track || !track.lightType) {
      console.log("트랙 또는 조명 타입을 찾을 수 없습니다:", lightId);
      return;
    }

    const properties = LIGHT_PROPERTIES[track.lightType];
    Object.keys(properties).forEach((propertyType) => {
      console.log(`\n속성: ${propertyType} `);

      const trackData = this.timelineData.getTrackById(lightId, propertyType);
      if (!trackData) {
        console.log("  - 트랙 데이터 없음");
        return;
      }

      console.log(`  - 키프레임 개수: ${trackData.getKeyframeCount()} `);
      if (trackData.getKeyframeCount() > 0) {
        console.log(`  - 시간들: [${Array.from(trackData.times.slice(0, trackData.keyframeCount)).join(', ')}]`);
        console.log(`  - 값들: [${Array.from(trackData.values.slice(0, trackData.keyframeCount * 3)).join(', ')}]`);

        // 현재 시간에서의 보간된 값 테스트
        const interpolatedValue = trackData.getValueAtTime(this.currentTime);
        console.log(`  - 현재 시간(${this.currentTime})에서 보간된 값: `, interpolatedValue);
      }
    });
  }

  // 모든 조명의 모든 속성 키프레임 상태를 한 번에 확인하는 메서드
  showAllLightKeyframes() {
    console.log("=== 모든 조명의 키프레임 상태 ===");

    this.tracks.forEach((track, lightId) => {
      if (!track.lightType) return;

      console.log(`\n🔍 조명: ${lightId} (${track.lightType})`);

      // 조명 객체 가져오기
      const light = this.editor.scene.getObjectByName(lightId);
      if (!light) {
        console.log(`  ❌ 조명 객체를 찾을 수 없음: ${lightId} `);
        return;
      }

      const properties = LIGHT_PROPERTIES[track.lightType];
      Object.keys(properties).forEach((propertyType) => {
        // ID 기반으로 먼저 시도
        let trackData = this.timelineData.getTrackById(lightId, propertyType);

        // ID로 찾지 못하면 UUID 기반으로 시도
        if (!trackData) {
          trackData = this.timelineData.getTrackByUuid(light.uuid, propertyType);
        }

        if (trackData && trackData.getKeyframeCount() > 0) {
          console.log(`  ✅ ${propertyType}: ${trackData.getKeyframeCount()}개 키프레임`);
          console.log(`     시간: [${Array.from(trackData.times.slice(0, trackData.keyframeCount)).join(', ')}]`);

          // 키프레임 값들도 출력
          const values = [];
          for (let i = 0; i < trackData.getKeyframeCount(); i++) {
            const value = {
              x: trackData.values[i * 3],
              y: trackData.values[i * 3 + 1],
              z: trackData.values[i * 3 + 2]
            };
            values.push(value);
          }
          console.log(`     값들: [${values.map(v => `{x:${v.x.toFixed(2)}, y:${v.y.toFixed(2)}, z:${v.z.toFixed(2)}}`).join(', ')}]`);
        } else {
          console.log(`  ❌ ${propertyType}: 키프레임 없음`);
        }
      });

      // 타겟 키프레임도 확인
      if (track.hasTarget) {
        const targetId = `${lightId} _Target`;
        const target = this.editor.scene.getObjectByName(targetId);

        let targetTrackData = this.timelineData.getTrackById(targetId, "position");
        if (!targetTrackData && target) {
          targetTrackData = this.timelineData.getTrackByUuid(target.uuid, "position");
        }

        if (targetTrackData && targetTrackData.getKeyframeCount() > 0) {
          console.log(`  ✅ target_position: ${targetTrackData.getKeyframeCount()}개 키프레임`);
        } else {
          console.log(`  ❌ target_position: 키프레임 없음`);
        }
      }
    });

    console.log("=== 키프레임 상태 확인 완료 ===");
  }

  // 키프레임 추가 시 UI 업데이트
  onKeyframeAdded(objectUuid, property, index, time, value) {
    console.log("=== LightTimeline onKeyframeAdded 시작 ===", {
      objectUuid,
      property,
      index,
      time,
      value
    });

    // UUID로 객체 찾기
    const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
    if (!object) {
      console.warn("UUID로 객체를 찾을 수 없습니다:", objectUuid);
      return;
    }

    // 조명 ID 추출 및 타겟 여부 확인
    let lightId = object.name;
    let isTarget = false;

    if (object.name.includes('_Target')) {
      lightId = object.name.replace('_Target', '');
      isTarget = true;
    }

    // 타겟인 경우 타겟 트랙, 조명인 경우 조명 트랙 찾기
    let track;
    if (isTarget) {
      track = this.tracks.get(object.name); // 타겟 트랙 (object.name = lightId_Target)
    } else {
      track = this.tracks.get(lightId); // 조명 트랙
    }

    if (!track || !track.sprite) {
      console.warn("트랙 또는 스프라이트를 찾을 수 없습니다:", isTarget ? object.name : lightId);
      return;
    }

    // UI에 키프레임 요소 추가 (타겟은 타겟 스프라이트, 조명은 조명 스프라이트)
    const sprite = track.sprite;

    // 클립 범위 체크 제거 - 키프레임은 어느 시간에든 추가 가능
    console.log("🔍 키프레임 UI 추가 시도:", {
      time,
      property,
      sprite: !!sprite,
      trackId: isTarget ? object.name : lightId
    });

    // 이미 같은 시간에 키프레임이 있는지 확인
    const existingKeyframe = sprite.querySelector(`[data - time= "${time.toFixed(2)}"]`);
    if (existingKeyframe) {
      console.log("이미 같은 시간에 키프레임이 존재합니다:", time);
      return;
    }

    console.log("키프레임 요소 생성 중...");
    this.addKeyframeUI(object.name, property, time);
    console.log("키프레임 요소 추가 완료");

    // 이벤트 발생 후 TimelineData 상태 출력
    console.log("=== onKeyframeAdded 이벤트 후 TimelineData 상태 ===");
    this.logTimelineDataState();
  }

  // 키프레임 삭제 시 UI 업데이트
  onKeyframeRemoved(objectUuid, property, index, time, value) {
    console.log("=== LightTimeline onKeyframeRemoved ===", {
      objectUuid,
      property,
      index,
      time,
      value
    });

    // UUID로 객체 찾기
    const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
    if (!object) {
      console.warn("UUID로 객체를 찾을 수 없습니다:", objectUuid);
      return;
    }

    // 조명 ID 추출
    let lightId = object.name;
    if (object.name.includes('_Target')) {
      lightId = object.name.replace('_Target', '');
    }

    const track = this.tracks.get(lightId);
    if (!track || !track.sprite) return;

    // UI에서 키프레임 요소 제거
    const keyframeElement = track.sprite.querySelector(`[data - time= "${time.toFixed(2)}"][data - property="${property}"]`);
    if (keyframeElement) {
      keyframeElement.remove();
    }
  }

  // 키프레임 업데이트 시 UI 업데이트
  onKeyframeUpdated(objectUuid, property, index, time, oldValue, newValue) {
    console.log("=== LightTimeline onKeyframeUpdated ===", {
      objectUuid,
      property,
      index,
      time,
      oldValue,
      newValue
    });

    // UUID로 객체 찾기
    const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
    if (!object) {
      console.warn("UUID로 객체를 찾을 수 없습니다:", objectUuid);
      return;
    }

    // 조명 ID 추출
    let lightId = object.name;
    if (object.name.includes('_Target')) {
      lightId = object.name.replace('_Target', '');
    }

    const track = this.tracks.get(lightId);
    if (!track || !track.sprite) return;

    // UI에서 키프레임 값 업데이트
    const keyframeElement = track.sprite.querySelector(`[data - time= "${time}"][data - property="${property}"]`);
    if (keyframeElement) {
      keyframeElement.dataset.value = JSON.stringify([newValue.x, newValue.y, newValue.z]);
    }
  }

  // 키프레임 이동 시 UI 업데이트
  onKeyframeMoved(objectUuid, property, index, oldTime, newTime, value) {
    console.log("=== LightTimeline onKeyframeMoved ===", {
      objectUuid,
      property,
      index,
      oldTime,
      newTime,
      value
    });

    // UUID로 객체 찾기
    const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
    if (!object) {
      console.warn("UUID로 객체를 찾을 수 없습니다:", objectUuid);
      return;
    }

    // 조명 ID 추출
    let lightId = object.name;
    if (object.name.includes('_Target')) {
      lightId = object.name.replace('_Target', '');
    }

    const track = this.tracks.get(lightId);
    if (!track || !track.sprite) return;

    // UI에서 키프레임 위치 업데이트
    const keyframeElement = track.sprite.querySelector(`[data - time= "${oldTime}"][data - property="${property}"]`);
    if (keyframeElement) {
      // 새로운 시간으로 업데이트
      keyframeElement.dataset.time = newTime.toFixed(2);
      keyframeElement.dataset.index = index.toString();

      // 새로운 위치 계산
      const totalDuration = this.options.totalSeconds || 180;
      const timePercent = (newTime / totalDuration) * 100;
      keyframeElement.style.left = `${timePercent}% `;
    }
  }

  bindTrackEvents(track) {
    console.log("🔧 bindTrackEvents 시작:", {
      trackId: track?.objectId,
      lightType: track?.lightType,
      hasSprite: !!track?.sprite
    });

    if (!track || !track.objectId) {
      console.warn("트랙 또는 objectId가 없습니다:", track);
      return;
    }

    const light = this.editor.scene.getObjectByName(track.objectId);
    if (!light) {
      console.warn(`조명을 찾을 수 없습니다: ${track.objectId} `);
      return;
    }

    console.log(`🔧 조명 객체 확인: ${track.objectId} `, {
      exists: !!light,
      uuid: light.uuid,
      type: light.type
    });

    // 키프레임 추가 버튼 이벤트 바인딩
    const addKeyframeBtn = track.element.querySelector(".add-keyframe-btn");
    if (addKeyframeBtn) {
      console.log(`🔧 키프레임 추가 버튼 찾음: ${track.objectId} `);

      addKeyframeBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        // 현재 시간 가져오기 (playhead 위치와 동기화)
        let currentTime = this.currentTime;

        // playhead 위치에서 시간 계산 시도
        const playheadElement = document.querySelector('.timeline-scrubber');
        if (playheadElement) {
          const playheadLeft = parseFloat(playheadElement.style.left) || 0;
          const calculatedTime = (playheadLeft / 100) * (this.options.totalSeconds || 180);
          if (calculatedTime >= 0) {
            currentTime = calculatedTime;
            console.log(`🔧 playhead 위치에서 시간 계산: ${calculatedTime} s`);
          }
        } else {
          // 대안: 시간 표시에서 시간 추출
          const timeDisplay = document.querySelector('.timeline-header .time-display');
          if (timeDisplay) {
            const timeText = timeDisplay.textContent;
            const timeMatch = timeText.match(/(\d+\.?\d*)s/);
            if (timeMatch) {
              const extractedTime = parseFloat(timeMatch[1]);
              currentTime = extractedTime;
              console.log(`🔧 시간 표시에서 시간 추출: ${extractedTime} s`);
            }
          }
        }

        console.log(`🔧 최종 사용 시간: ${currentTime} s(원래: ${this.currentTime}s)`);

        console.log("🎯 키프레임 추가 버튼 클릭:", {
          lightId: track.objectId,
          currentTime: currentTime,
          lightType: track.lightType,
          buttonElement: addKeyframeBtn
        });

        // 조명의 모든 속성을 하나의 키프레임으로 추가
        const properties = LIGHT_PROPERTIES[track.lightType];
        const allProperties = {};

        Object.keys(properties).forEach((propertyName) => {
          const value = this.getPropertyValue(light, propertyName);
          if (value !== null) {
            allProperties[propertyName] = value;
          }
        });

        // 현재 TimelineData 상태 확인
        console.log(`🔍 키프레임 추가 전 TimelineData 상태: `, {
          lightId: track.objectId,
          tracksCount: this.timelineData.tracks.size,
          tracksByIdCount: this.timelineData.tracksById.size,
          lightTracks: this.timelineData.tracksById.get(track.objectId) ?
            Array.from(this.timelineData.tracksById.get(track.objectId).keys()) : []
        });

        // 하나의 키프레임으로 모든 속성 추가
        this.addKeyframeForAllProperties(track.objectId, currentTime, allProperties);

        // SpotLight와 DirectionalLight는 타겟 키프레임도 추가
        if (track.hasTarget) {
          const targetId = `${track.objectId} _Target`;
          const targetObject = this.editor.scene.getObjectByName(targetId);
          console.log(`🎯 타겟 키프레임 추가 시도: `, {
            targetId,
            hasTarget: track.hasTarget,
            targetObject: !!targetObject,
            targetPosition: targetObject ? targetObject.position : null
          });

          if (targetObject) {
            const targetValue = targetObject.position.clone();
            console.log(`🎯 타겟 키프레임 추가: ${targetId} position = `, targetValue);

            // 타겟 키프레임 추가 전 TimelineData 상태 확인
            console.log(`🔍 타겟 키프레임 추가 전 TimelineData 상태: `, {
              targetId,
              tracksCount: this.timelineData.tracks.size,
              tracksByIdCount: this.timelineData.tracksById.size,
              targetTracks: this.timelineData.tracksById.get(targetId) ?
                Array.from(this.timelineData.tracksById.get(targetId).keys()) : []
            });

            // 타겟 트랙이 TimelineData에 있는지 확인
            const targetTrackData = this.timelineData.getTrackById(targetId, "position");
            console.log(`🔍 타겟 트랙 확인: ${targetId} position`, {
              found: !!targetTrackData,
              trackData: targetTrackData,
              keyframeCount: targetTrackData ? targetTrackData.getKeyframeCount() : 0
            });

            if (!targetTrackData) {
              console.warn(`❌ 타겟 트랙이 TimelineData에 없음: ${targetId} position`);
              console.log(`🔍 사용 가능한 타겟 트랙들: `, this.timelineData.getAllTracksById());

              // 타겟 트랙을 즉시 생성해보기
              console.log(`🔄 타겟 트랙 즉시 생성 시도: ${targetId} position`);
              this.timelineData.addTrack(targetObject.uuid, "position", targetId);

              // 생성 후 다시 확인
              const newTargetTrackData = this.timelineData.getTrackById(targetId, "position");
              console.log(`🔍 타겟 트랙 생성 후 확인: ${targetId} position`, {
                found: !!newTargetTrackData,
                trackData: newTargetTrackData
              });

              if (!newTargetTrackData) {
                console.error(`❌ 타겟 트랙 생성 실패: ${targetId} position`);
                return;
              }
            }

            this.addKeyframeForProperty(targetId, "position", currentTime, targetValue);

            // 타겟 키프레임 추가 후 TimelineData 상태 확인
            console.log(`🔍 타겟 키프레임 추가 후 TimelineData 상태: `, {
              targetId,
              tracksCount: this.timelineData.tracks.size,
              tracksByIdCount: this.timelineData.tracksById.size,
              targetTracks: this.timelineData.tracksById.get(targetId) ?
                Array.from(this.timelineData.tracksById.get(targetId).keys()) : []
            });

            // 타겟 키프레임이 제대로 추가되었는지 확인
            const updatedTargetTrackData = this.timelineData.getTrackById(targetId, "position");
            if (updatedTargetTrackData) {
              console.log(`✅ 타겟 키프레임 추가 확인: `, {
                keyframeCount: updatedTargetTrackData.getKeyframeCount(),
                times: Array.from(updatedTargetTrackData.times.slice(0, updatedTargetTrackData.keyframeCount)),
                values: updatedTargetTrackData.values.slice(0, updatedTargetTrackData.keyframeCount * 3)
              });
            }
          } else {
            console.warn(`❌ 타겟 객체를 찾을 수 없음: ${targetId} `);
          }
        } else {
          console.log(`ℹ️ 타겟이 없는 조명: ${track.objectId} `);
        }

        console.log("모든 속성에 키프레임 추가 완료");
      });
    }
  }

  // 키프레임 선택 처리
  selectKeyframe(lightId, time, keyframeElement, propertyName) {
    console.log("=== LightTimeline selectKeyframe ===", {
      lightId,
      time,
      propertyName,
      keyframeElement
    });

    // 클립 범위 체크 - 클립 밖의 키프레임은 선택하지 않음 (허용 범위 추가)
    if (keyframeElement) {
      const sprite = keyframeElement.closest('.light-sprite');
      if (sprite) {
        const spriteLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
        const clipDuration = parseFloat(sprite.dataset.duration) || 5;
        const clipEndTime = clipStartTime + clipDuration;

        // 허용 범위 추가
        const tolerance = LightTimeline.CLIP_RANGE_TOLERANCE;
        if (time !== 0 && (time < clipStartTime - tolerance || time > clipEndTime + tolerance)) {
          console.log("클립 범위 밖의 키프레임이므로 선택하지 않습니다:", {
            time,
            clipStartTime,
            clipEndTime,
            tolerance
          });
          return;
        }
      }
    }

    // 이전에 선택된 모든 키프레임 선택 해제
    this.container.querySelectorAll('.keyframe').forEach(el => {
      if (el.dataset.lightId.includes('_Target')) {
        el.style.backgroundColor = "#f66"; // 타겟 키프레임은 빨간색
      } else {
        el.style.backgroundColor = "#f90"; // 조명 키프레임은 주황색
      }
    });

    // 이전 선택된 키프레임 정보 초기화
    this.selectedKeyframe = null;
    if (this.editor.scene.userData?.lightTimeline) {
      this.editor.scene.userData.lightTimeline.selectedKeyframe = null;
    }

    // 새로운 키프레임 선택
    if (keyframeElement) {
      keyframeElement.style.backgroundColor = "#ff0";
    }

    // TimelineData에서 키프레임 데이터 가져오기
    let trackData = this.timelineData.getTrackById(lightId, propertyName);
    if (!trackData) {
      const object = this.editor.scene.getObjectByName(lightId);
      if (object) {
        trackData = this.timelineData.getTrackByUuid(object.uuid, propertyName);
      }
    }

    if (!trackData) {
      console.warn("트랙 데이터를 찾을 수 없습니다:", { lightId, propertyName });
      return;
    }

    // 키프레임 인덱스 찾기
    const keyframeIndex = trackData.findKeyframeIndex(time);
    if (keyframeIndex === -1) {
      console.warn("키프레임을 찾을 수 없습니다:", { time, lightId, propertyName });
      return;
    }

    // 키프레임 값 가져오기
    const value = {
      x: trackData.values[keyframeIndex * 3],
      y: trackData.values[keyframeIndex * 3 + 1],
      z: trackData.values[keyframeIndex * 3 + 2]
    };

    // 선택된 키프레임 정보 저장 (메모리)
    this.selectedKeyframe = {
      lightId,
      index: keyframeIndex,
      time,
      property: propertyName,
      value,
      element: keyframeElement
    };

    // 선택된 키프레임 정보를 scene.userData에 저장 (MotionTimeline과 동일한 방식)
    if (!this.editor.scene.userData) {
      this.editor.scene.userData = {};
    }
    this.editor.scene.userData.lightTimeline = this.editor.scene.userData.lightTimeline || {};
    this.editor.scene.userData.lightTimeline.selectedKeyframe = {
      lightId,
      index: keyframeIndex,
      time,
      property: propertyName,
      value: {
        x: value.x,
        y: value.y,
        z: value.z
      }
    };

    console.log("선택된 키프레임 데이터 (메모리):", this.selectedKeyframe);
    console.log("선택된 키프레임 데이터 (scene.userData):", this.editor.scene.userData.lightTimeline.selectedKeyframe);

    // 키프레임 선택 시 부모 클립도 함께 선택
    if (keyframeElement) {
      // 키프레임이 속한 클립(스프라이트) 찾기 - 타겟과 조명 구분
      let sprite = null;
      if (lightId.includes('_Target')) {
        // 타겟 키프레임인 경우 타겟 스프라이트 찾기
        // lightId가 'light_0_Target' 형태이므로 직접 타겟 스프라이트 찾기
        const targetSprite = document.querySelector(`[data-object-id="${lightId}"] .target-sprite`);
        if (targetSprite) {
          sprite = targetSprite;
          console.log("키프레임 선택 - 타겟 스프라이트 찾음:", sprite);
        } else {
          // fallback: closest로 찾기
          sprite = keyframeElement.closest('.target-sprite');
          console.log("키프레임 선택 - fallback으로 타겟 스프라이트 찾기:", sprite);
        }
      } else {
        // 조명 키프레임인 경우 조명 스프라이트 찾기
        // lightId가 'light_0_intensity' 형태이므로 base light ID 추출
        const baseLightId = lightId.split('_').slice(0, 2).join('_'); // 'light_0_intensity' -> 'light_0'
        console.log("키프레임 선택 - 조명 스프라이트 찾기 시도:", {
          originalLightId: lightId,
          baseLightId: baseLightId
        });

        // base light ID로 조명 스프라이트 찾기
        const lightSprite = document.querySelector(`[data-object-id="${baseLightId}"] .light-sprite`);
        if (lightSprite) {
          sprite = lightSprite;
          console.log("키프레임 선택 - 조명 스프라이트 찾음:", sprite);
        } else {
          // fallback: closest로 찾기
          sprite = keyframeElement.closest('.light-sprite');
          console.log("키프레임 선택 - fallback으로 조명 스프라이트 찾기:", sprite);
        }
      }

      if (sprite) {
        console.log("키프레임 선택 - 부모 클립 찾음:", sprite);
        // 공통 selectClip 메서드 사용
        const selectResult = this.selectClip(sprite);
        console.log("키프레임 선택 - selectClip 결과:", selectResult);
      } else {
        console.warn("키프레임 선택 - 부모 클립을 찾을 수 없음:", {
          keyframeElement: keyframeElement,
          keyframeClasses: keyframeElement.className,
          lightId: lightId,
          isTarget: lightId.includes('_Target')
        });
      }
    }

    // playhead를 키프레임 시간 위치로 이동
    this.movePlayheadToTime(time);

    // 키프레임 값으로 객체 속성 업데이트
    // selectClip에서 선택된 객체를 사용
    if (this.selectedObject) {
      this.setPropertyValueFromKeyframe(this.selectedObject, propertyName, value);
    } else {
      console.warn("키프레임 선택 시 객체가 선택되지 않음:", {
        lightId,
        propertyName,
        selectedObject: this.selectedObject
      });
    }
  }

  // 키프레임 값으로 객체 속성 업데이트
  setPropertyValueFromKeyframe(object, propertyName, value) {
    if (!object || !value) return;

    if (object.name.includes('_Target')) {
      // 타겟 객체인 경우 position만 업데이트
      if (propertyName === 'position') {
        object.position.set(value.x, value.y, value.z);
      }
    } else {
      // 조명 객체인 경우 해당 속성 업데이트
      switch (propertyName) {
        case 'intensity':
          object.intensity = value.x;
          break;
        case 'color':
          object.color.setRGB(value.x, value.y, value.z);
          break;
        case 'position':
          object.position.set(value.x, value.y, value.z);
          break;
        case 'distance':
          object.distance = value.x;
          break;
        case 'angle':
          object.angle = value.x;
          break;
        case 'penumbra':
          object.penumbra = value.x;
          break;
        case 'decay':
          object.decay = value.x;
          break;
      }
    }

    // 객체 변경 시그널 발생 (fromTimeline 플래그로 무한 루프 방지)
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object, { fromTimeline: true, fromAnimation: true });
    }
  }

  // 선택된 키프레임 값 업데이트
  updateSelectedKeyframeValue(lightId, propertyName, newValue) {
    // console.log("=== updateSelectedKeyframeValue 시작 ===", {
    //   lightId,
    //   propertyName,
    //   newValue,
    //   selectedKeyframe: this.selectedKeyframe
    // });

    if (!this.selectedKeyframe) {
      // console.warn("선택된 키프레임이 없음");
      return;
    }

    // 선택된 키프레임의 lightId와 업데이트하려는 lightId가 일치하는지 확인
    const selectedLightId = this.selectedKeyframe.lightId;
    const expectedLightId = lightId.includes('_Target') ? lightId : `${lightId.split('_').slice(0, 2).join('_')}_${propertyName}`;

    if (selectedLightId !== expectedLightId) {
      console.warn("선택된 키프레임과 lightId 불일치:", {
        selectedLightId,
        expectedLightId,
        propertyName
      });
      return;
    }

    // console.log("=== 선택된 키프레임 값 업데이트 시작 ===", {
    //   lightId,
    //   propertyName,
    //   newValue,
    //   selectedKeyframe: this.selectedKeyframe
    // });

    // TimelineData에서 트랙 찾기
    // console.log("트랙 찾기 시도:", { lightId, propertyName });
    let trackData = this.timelineData.getTrackById(lightId, propertyName);
    if (!trackData) {
      // console.log("ID 기반으로 트랙을 찾지 못함, fallback 시도");
      // fallback: base light ID로 찾기 시도
      const baseLightId = lightId.split('_').slice(0, 2).join('_'); // 'light_0_intensity' -> 'light_0'
      const object = this.editor.scene.getObjectByName(baseLightId);
      if (object) {
        trackData = this.timelineData.getTrackByUuid(object.uuid, propertyName);
        // console.log("UUID 기반으로 트랙 찾기 시도:", { baseLightId, objectUuid: object.uuid, found: !!trackData });
      }
    } else {
      // console.log("ID 기반으로 트랙 찾음:", { lightId, propertyName });
    }

    if (!trackData) {
      // console.warn("트랙을 찾을 수 없습니다:", { lightId, propertyName });
      return;
    }

    // 값 타입에 따라 Vector3로 변환
    let vectorValue;
    if (typeof newValue === 'number') {
      vectorValue = new THREE.Vector3(newValue, 0, 0);
      console.log("숫자 값을 Vector3로 변환:", { original: newValue, converted: vectorValue });
    } else if (newValue instanceof THREE.Color) {
      vectorValue = new THREE.Vector3(newValue.r, newValue.g, newValue.b);
      console.log("Color 값을 Vector3로 변환:", { original: newValue, converted: vectorValue });
    } else if (newValue instanceof THREE.Vector3) {
      vectorValue = newValue.clone();
      console.log("Vector3 값 복사:", { original: newValue, converted: vectorValue });
    } else if (newValue && typeof newValue === 'object' && 'x' in newValue && 'y' in newValue && 'z' in newValue) {
      // {x, y, z} 형태의 객체를 Vector3로 변환
      vectorValue = new THREE.Vector3(newValue.x, newValue.y, newValue.z);
      console.log("객체 값을 Vector3로 변환:", { original: newValue, converted: vectorValue });
    } else {
      console.warn('지원하지 않는 값 타입:', typeof newValue, newValue);
      return;
    }

    // 선택된 키프레임의 값 업데이트
    // console.log("키프레임 값 업데이트 시도:", {
    //   index: this.selectedKeyframe.index,
    //   vectorValue,
    //   trackDataExists: !!trackData
    // });

    const success = trackData.updateKeyframeValue(this.selectedKeyframe.index, vectorValue);
    if (success) {
      // console.log(`키프레임 값 업데이트 성공: ${lightId} ${propertyName} at index ${this.selectedKeyframe.index}`);

      // TimelineData 상태 업데이트 (성능 최적화)
      this.timelineData.dirty = true;
      // precomputeAnimationData와 updateUI는 필요할 때만 호출
      this.updateKeyframeUI(lightId, propertyName);
    } else {
      console.warn(`키프레임 값 업데이트 실패: ${lightId} ${propertyName} at index ${this.selectedKeyframe.index}`);
    }

    // console.log("=== 선택된 키프레임 값 업데이트 완료 ===");
  }

  // 클립 선택 메서드 - 클립 클릭과 키프레임 선택에서 공통으로 사용
  selectClip(sprite) {
    console.log("=== selectClip 메서드 시작 ===", { sprite });

    if (!sprite) {
      console.warn("selectClip: sprite가 null입니다.");
      return false;
    }

    // 1. 모든 스프라이트 선택 해제
    const allSprites = document.querySelectorAll(".animation-sprite");
    allSprites.forEach(s => s.classList.remove("selected"));

    // 2. 현재 스프라이트 선택
    sprite.classList.add("selected");

    // 3. 클립이 속한 트랙 찾기
    const trackElement = sprite.closest('.motion-tracks');
    if (!trackElement) {
      console.warn("selectClip: 트랙 요소를 찾을 수 없습니다.", { sprite });
      return false;
    }

    const trackObjectId = trackElement.dataset.objectId;
    const trackObjectName = trackElement.dataset.objectName;

    console.log("selectClip: 트랙 정보 찾기:", {
      trackObjectId,
      trackObjectName,
      sprite: sprite
    });

    // 4. 객체 선택
    let objectToSelect = null;
    let lightType = null;

    if (trackObjectId.includes('_Target')) {
      // 타겟 클립인 경우
      objectToSelect = this.editor.scene.getObjectByName(trackObjectId);
      lightType = "Target";
      console.log("selectClip: 타겟 객체 선택 시도:", trackObjectId, objectToSelect);
    } else {
      // 조명 클립인 경우
      objectToSelect = this.editor.scene.getObjectByName(trackObjectId);
      // 트랙에서 lightType 가져오기
      const track = this.tracks.get(trackObjectId);
      lightType = track?.lightType;
      console.log("selectClip: 조명 객체 선택 시도:", {
        trackObjectId,
        foundObject: objectToSelect,
        lightType: lightType,
        track: track
      });
    }

    if (objectToSelect && this.editor.select) {
      this.editor.select(objectToSelect);
      this.selectedObject = objectToSelect;
      this.selectedLightType = lightType;

      // 속성 패널 업데이트
      if (lightType === "Target") {
        this.updatePropertyPanelForTarget();
      } else {
        this.updatePropertyPanelForLightType(lightType);
      }

      console.log("selectClip: 객체 선택 완료:", {
        objectName: objectToSelect.name,
        lightType: this.selectedLightType
      });

      return true;
    } else {
      console.warn("selectClip: 객체 선택 실패:", {
        objectToSelect: objectToSelect,
        hasEditorSelect: !!this.editor.select,
        trackObjectId: trackObjectId
      });
      return false;
    }
  }

  // playhead를 특정 시간으로 이동하는 메서드
  movePlayheadToTime(time) {
    console.log("=== LightTimeline movePlayheadToTime 시작 ===", { time });

    // 시간 범위 제한
    const clampedTime = Math.max(0, Math.min(time, this.options.totalSeconds));

    // 현재 시간 업데이트
    this.currentTime = clampedTime;

    // playhead 위치 계산 (퍼센트)
    const playheadPercent = (clampedTime / this.options.totalSeconds) * 100;

    // Timeline.js의 updatePlayheadPosition 메서드 호출 (time-box 업데이트 포함)
    if (this.editor.scene?.userData?.timeline?.updatePlayheadPosition) {
      console.log("Timeline.js updatePlayheadPosition 호출:", playheadPercent);
      this.editor.scene.userData.timeline.updatePlayheadPosition(playheadPercent);
    } else {
      // Timeline.js의 updatePlayheadPosition이 없으면 직접 업데이트
      const playhead = document.querySelector(".playhead");
      if (playhead) {
        playhead.style.left = `${playheadPercent}%`;

        // time-box 직접 업데이트
        const timeBox = playhead.querySelector(".time-box");
        if (timeBox) {
          timeBox.textContent = `${clampedTime.toFixed(2)}s`;
          console.log("time-box 직접 업데이트:", timeBox.textContent);
        }

        console.log("playhead 위치 직접 업데이트:", {
          time: clampedTime,
          percent: playheadPercent,
          left: playhead.style.left
        });
      } else {
        console.warn("playhead 요소를 찾을 수 없습니다.");
      }
    }

    // Timeline.js와 동기화
    if (this.editor.scene?.userData?.timeline) {
      this.editor.scene.userData.timeline.currentSeconds = clampedTime;
    }

    // currentTimeChanged 시그널 발생 (다른 타임라인들과 동기화)
    const frame = Math.floor(clampedTime * this.options.framesPerSecond);
    if (this.editor.signals?.currentTimeChanged) {
      this.editor.signals.currentTimeChanged.dispatch(frame);
    }

    console.log("=== LightTimeline movePlayheadToTime 완료 ===", {
      originalTime: time,
      clampedTime,
      playheadPercent,
      frame
    });
  }

  // 키프레임 UI 업데이트 메서드
  updateKeyframeUI(lightId, propertyName) {
    console.log("키프레임 UI 업데이트:", { lightId, propertyName });

    // 해당 키프레임 요소 찾기
    const keyframeElement = document.querySelector(`[data-light-id="${lightId}"][data-property="${propertyName}"]`);
    if (keyframeElement) {
      console.log("키프레임 UI 요소 찾음:", keyframeElement);
      // 키프레임 UI가 업데이트되었음을 시각적으로 표시
      keyframeElement.style.transform = "translate(-50%, -50%) scale(1.2)";
      setTimeout(() => {
        keyframeElement.style.transform = "translate(-50%, -50%) scale(1)";
      }, 200);
    } else {
      console.warn("키프레임 UI 요소를 찾을 수 없음:", { lightId, propertyName });
    }
  }

  // 테스트용 메서드: 키프레임 수동 추가
  testAddKeyframe(lightId, propertyName, time, value) {
    console.log("=== 테스트 키프레임 추가 ===", {
      lightId,
      propertyName,
      time,
      value
    });

    // TimelineData에서 트랙 찾기
    const trackData = this.timelineData.getTrackById(lightId, propertyName);
    if (!trackData) {
      console.warn("트랙을 찾을 수 없습니다:", { lightId, propertyName });
      return false;
    }

    // 키프레임 추가
    const success = trackData.addKeyframe(time, value);
    console.log("키프레임 추가 결과:", success);

    if (success) {
      // UI에 키프레임 추가
      this.addKeyframeUI(lightId, propertyName, time);
      console.log("UI 키프레임 추가 완료");
    }

    return success;
  }

  // 브라우저 콘솔에서 테스트할 수 있는 전역 메서드
  testLightAnimation() {
    console.log("=== 조명 애니메이션 테스트 시작 ===");

    // 1. 조명 객체 확인
    const light = this.editor.scene.getObjectByName('light_0');
    if (!light) {
      console.error("light_0 조명을 찾을 수 없습니다!");
      return;
    }

    console.log("조명 객체:", light);

    // 2. UUID 기반 트랙 확인
    const uuidTrackData = this.timelineData.getTrackByUuid(light.uuid, 'intensity');
    console.log("UUID 기반 intensity 트랙:", uuidTrackData);

    // 3. 기존 키프레임 모두 삭제
    if (uuidTrackData) {
      uuidTrackData.clearAllKeyframes();
      console.log("기존 키프레임 모두 삭제");
    }

    // 4. 다양한 값의 키프레임 추가
    if (uuidTrackData) {
      // 0초: intensity = 1
      uuidTrackData.addKeyframe(0, new THREE.Vector3(1, 0, 0));

      // 5초: intensity = 3
      uuidTrackData.addKeyframe(5, new THREE.Vector3(3, 0, 0));

      // 10초: intensity = 0.5
      uuidTrackData.addKeyframe(10, new THREE.Vector3(0.5, 0, 0));

      // 15초: intensity = 2
      uuidTrackData.addKeyframe(15, new THREE.Vector3(2, 0, 0));

      console.log("✅ 다양한 키프레임 추가 완료!");

      // 5. UI 업데이트
      this.addKeyframeUI('light_0', 'intensity', 0);
      this.addKeyframeUI('light_0', 'intensity', 5);
      this.addKeyframeUI('light_0', 'intensity', 10);
      this.addKeyframeUI('light_0', 'intensity', 15);

      // 6. 애니메이션 테스트
      console.log("애니메이션 테스트 시작...");
      this.currentTime = 0;
      this.updateAnimation(0);

      // 7. 2초마다 애니메이션 테스트
      setTimeout(() => {
        console.log("2초 후 애니메이션 테스트...");
        this.currentTime = 2;
        this.updateAnimation(2);
      }, 2000);

      setTimeout(() => {
        console.log("5초 후 애니메이션 테스트...");
        this.currentTime = 5;
        this.updateAnimation(5);
      }, 5000);

      setTimeout(() => {
        console.log("8초 후 애니메이션 테스트...");
        this.currentTime = 8;
        this.updateAnimation(8);
      }, 8000);
    } else {
      console.error("❌ UUID 기반 트랙을 찾을 수 없습니다!");
    }
  }

  // 키프레임 모두 삭제 메서드 (TrackData에 추가 필요)
  clearAllKeyframes() {
    console.log("=== 모든 키프레임 삭제 ===");

    this.tracks.forEach((track, lightId) => {
      if (!track.lightType) return;

      const light = this.editor.scene.getObjectByName(lightId);
      if (!light) return;

      const properties = LIGHT_PROPERTIES[track.lightType];
      Object.keys(properties).forEach((propertyType) => {
        const trackData = this.timelineData.getTrackByUuid(light.uuid, propertyType);
        if (trackData) {
          // 모든 키프레임 삭제
          for (let i = trackData.getKeyframeCount() - 1; i >= 0; i--) {
            trackData.removeKeyframeByIndex(i);
          }
          console.log(`✅ ${lightId} ${propertyType} 키프레임 모두 삭제`);
        }
      });
    });

    // UI에서도 키프레임 제거
    this.container.querySelectorAll('.keyframe').forEach(keyframe => {
      keyframe.remove();
    });

    console.log("=== 키프레임 삭제 완료 ===");
  }

  // 키프레임을 드래그 가능하게 만드는 메서드 (MotionTimeline과 동일한 기능)
  makeKeyframeDraggable(keyframeElement, track, time, property) {
    let isDragging = false;
    let isOutsideClip = false;
    let startX = 0;
    let startY = 0;
    const REMOVE_THRESHOLD = 50; // 삭제를 위한 드래그 거리 임계값

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const dy = e.clientY - startY;
      const dx = e.clientX - startX;

      // 드래그 거리 계산
      const dragDistance = Math.sqrt(dx * dx + dy * dy);

      // 클립 정보 가져오기
      const sprite = keyframeElement.closest('.light-sprite');
      let isOutsideClipRange = false;

      if (sprite) {
        const spriteLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
        const clipDuration = parseFloat(sprite.dataset.duration) || 5;
        const clipEndTime = clipStartTime + clipDuration;

        // 허용 범위 추가
        const tolerance = 0.5; // 0.5초 허용 범위
        isOutsideClipRange = time < clipStartTime - tolerance || time > clipEndTime + tolerance;
      }

      // 아래로 충분히 드래그되면 삭제 모드로 전환
      if (dy > REMOVE_THRESHOLD) {
        console.log("아래로 충분히 드래그됨 - 삭제 조건 충족");
        if (!isOutsideClip) {
          isOutsideClip = true;
          console.log("isOutsideClip을 true로 변경");
          keyframeElement.classList.add("delete-preview");
          keyframeElement.style.opacity = "0.5";
        }
      } else {
        if (isOutsideClip) {
          isOutsideClip = false;
          console.log("isOutsideClip을 false로 변경 - 클립 안으로 돌아옴");
          keyframeElement.style.opacity = "1";
          keyframeElement.style.background = "#f90";
          keyframeElement.classList.remove("delete-preview");
        }
      }

      // 키프레임 위치 업데이트 (수평 이동만)
      const timeRulerContainer = document.querySelector('.time-ruler-container');
      if (timeRulerContainer) {
        const timeRulerRect = timeRulerContainer.getBoundingClientRect();
        const newLeft = Math.max(0, Math.min(timeRulerRect.width, e.clientX - timeRulerRect.left));
        const newTime = (newLeft / timeRulerRect.width) * this.options.totalSeconds;

        // 클립 범위 내에서만 이동 허용
        if (!isOutsideClipRange) {
          keyframeElement.style.left = `${newLeft}px`;
          keyframeElement.dataset.time = newTime.toFixed(2);
        }
      }
    };

    const handleMouseUp = (e) => {
      console.log("=== handleMouseUp 호출됨 ===");
      console.log("isDragging:", isDragging);
      console.log("isOutsideClip:", isOutsideClip);

      if (isDragging) {
        isDragging = false;
        keyframeElement.classList.remove("dragging");
        console.log("드래그 종료 - isOutsideClip:", isOutsideClip);

        if (isOutsideClip) {
          console.log("=== 키프레임 삭제 분기 진입! ===");

          // 모든 속성의 키프레임 삭제
          const properties = ['position', 'intensity', 'color', 'distance', 'angle', 'penumbra', 'decay'];
          let allDeleted = true;

          properties.forEach(prop => {
            const trackData = this.timelineData.tracks.get(track.lightId)?.get(prop);
            if (trackData) {
              console.log(`${prop} 삭제할 키프레임 시간:`, time);
              if (trackData.removeKeyframe(time)) {
                console.log(`${prop} 키프레임 삭제 완료!`);
              } else {
                console.warn(`${prop} 키프레임 삭제 실패!`);
                allDeleted = false;
              }
            }
          });

          if (allDeleted) {
            console.log("모든 속성의 키프레임 삭제 완료!");
          } else {
            console.error("일부 속성의 키프레임 삭제에 실패했습니다!");
          }

          keyframeElement.remove();
          console.log("UI에서 키프레임 요소 제거됨");
          this.timelineData.dirty = true;
          this.timelineData.precomputeAnimationData();
          this.updateAnimation();
          console.log("=== 키프레임 삭제 완료 ===");
        } else {
          console.log("키프레임 이동 분기 - 삭제하지 않음");
          this.timelineData.dirty = true;
          this.timelineData.precomputeAnimationData();
          this.updateAnimation();
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        console.log("이벤트 리스너 제거 완료");
      } else {
        console.log("isDragging이 false - 드래그가 아닌 상태");
      }
    };

    keyframeElement.addEventListener("mousedown", (e) => {
      console.log("=== 키프레임 mousedown 시작 ===");
      e.stopPropagation();
      isDragging = true;
      keyframeElement.classList.add("dragging");

      startX = e.clientX;
      startY = e.clientY;
      const startLeft = parseFloat(keyframeElement.style.left) || 0;
      const dragStartTime = parseFloat(keyframeElement.dataset.time);

      console.log("드래그 시작 정보:", {
        startX,
        startY,
        startLeft,
        dragStartTime,
        lightId: track.lightId,
        property
      });

      if (track.lightId) {
        // 키프레임 인덱스 찾기
        const trackData = this.timelineData.tracks.get(track.lightId)?.get(property);
        let dragStartIndex = -1;

        if (trackData) {
          dragStartIndex = trackData.findKeyframeIndex(dragStartTime);
          console.log("dragStartIndex:", dragStartIndex);
        } else {
          console.warn("트랙 데이터를 찾을 수 없음:", track.lightId);
        }
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      console.log("이벤트 리스너 등록 완료");
    });
  }

  // 키프레임 선택 시 속성 변경 감지 및 저장
  setupObjectChangeListener() {
    if (this._objectChangeListenerSetup) return;
    this._objectChangeListenerSetup = true;

    // 객체 변경 시그널 감지
    this.editor.signals.objectChanged.add((object, options = {}) => {
      this.onObjectChanged(object, options);
    });

    // Transform Controls 변경 시그널 감지
    if (this.editor.signals.transformChanged) {
      this.editor.signals.transformChanged.add((object) => {
        this.onObjectChanged(object, { fromTransform: true });
      });
    }

    // 속성 패널 변경 시그널 감지
    if (this.editor.signals.propertyChanged) {
      this.editor.signals.propertyChanged.add((object, property, value) => {
        this.onObjectChanged(object, { fromProperty: true, property, value });
      });
    }
  }

  // 객체 변경 처리 메서드
  onObjectChanged(object, options = {}) {
    // console.log("=== onObjectChanged 호출됨 ===", {
    //   objectName: object?.name,
    //   selectedKeyframe: this.selectedKeyframe,
    //   options
    // });

    // fromTimeline 플래그가 있으면 무시 (타임라인에서 발생한 변경)
    if (options.fromTimeline || options.fromAnimation) {
      // console.log("타임라인/애니메이션에서 발생한 변경으로 무시됨:", options);
      return;
    }

    if (!this.selectedKeyframe) {
      // console.log("선택된 키프레임이 없음");
      return;
    }

    const selectedLightId = this.selectedKeyframe.lightId;
    const selectedProperty = this.selectedKeyframe.property;
    const selectedKeyframeElement = this.selectedKeyframe.element;

    // 선택된 키프레임과 관련된 객체인지 확인
    let isRelatedObject = false;
    let trackObjectId = null;

    // 클립을 통해 트랙 정보 찾기
    if (selectedKeyframeElement) {
      let sprite = null;
      if (selectedLightId.includes('_Target')) {
        // 타겟 키프레임인 경우 타겟 스프라이트 찾기
        sprite = selectedKeyframeElement.closest('.target-sprite');
        console.log("onObjectChanged - 타겟 스프라이트 찾기:", sprite);
      } else {
        // 조명 키프레임인 경우 조명 스프라이트 찾기
        // selectedLightId가 'light_0_intensity' 형태이므로 base light ID 추출
        const baseLightId = selectedLightId.split('_').slice(0, 2).join('_'); // 'light_0_intensity' -> 'light_0'
        console.log("onObjectChanged - 조명 스프라이트 찾기:", {
          selectedLightId,
          baseLightId
        });

        // base light ID로 조명 스프라이트 찾기
        const lightSprite = document.querySelector(`[data-object-id="${baseLightId}"] .light-sprite`);
        if (lightSprite) {
          sprite = lightSprite;
          console.log("onObjectChanged - 조명 스프라이트 찾음:", sprite);
        } else {
          // fallback: closest로 찾기
          sprite = selectedKeyframeElement.closest('.light-sprite');
          console.log("onObjectChanged - fallback으로 조명 스프라이트 찾기:", sprite);
        }
      }

      if (sprite) {
        const trackElement = sprite.closest('.motion-tracks');
        if (trackElement) {
          trackObjectId = trackElement.dataset.objectId;
          console.log("클립을 통해 트랙 정보 찾기:", {
            trackObjectId,
            objectName: object.name,
            selectedLightId,
            isTarget: selectedLightId.includes('_Target')
          });
        }
      }
    }

    // 트랙 정보를 통해 객체 매칭
    if (trackObjectId) {
      if (trackObjectId.includes('_Target')) {
        // 타겟 키프레임인 경우
        isRelatedObject = (object.name === trackObjectId);
      } else {
        // 조명 키프레임인 경우 - trackObjectId는 base light ID (light_0)
        isRelatedObject = (object.name === trackObjectId);
      }
    } else {
      // 클립을 통해 찾지 못한 경우 기존 방식으로 시도
      if (selectedLightId.includes('_Target')) {
        isRelatedObject = (object.name === selectedLightId);
      } else {
        const baseLightId = selectedLightId.split('_').slice(0, 2).join('_');
        isRelatedObject = (object.name === baseLightId);
      }
    }

    console.log("객체 매칭 결과:", {
      objectName: object.name,
      selectedLightId,
      trackObjectId,
      isRelatedObject,
      isTarget: selectedLightId.includes('_Target')
    });

    if (isRelatedObject) {
      // console.log("선택된 키프레임과 관련된 객체가 변경됨:", object.name, selectedProperty, options);

      // 객체의 현재 속성 값 가져오기
      let newValue = null;
      switch (selectedProperty) {
        case 'position':
          newValue = new THREE.Vector3(
            object.position.x,
            object.position.y,
            object.position.z
          );
          break;
        case 'intensity':
          if (object.intensity !== undefined) {
            newValue = object.intensity; // 단일 숫자 값
          }
          break;
        case 'color':
          if (object.color) {
            newValue = new THREE.Color(
              object.color.r,
              object.color.g,
              object.color.b
            );
          }
          break;
        case 'distance':
          if (object.distance !== undefined) {
            newValue = object.distance; // 단일 숫자 값
          }
          break;
        case 'angle':
          if (object.angle !== undefined) {
            newValue = object.angle; // 단일 숫자 값
          }
          break;
        case 'penumbra':
          if (object.penumbra !== undefined) {
            newValue = object.penumbra; // 단일 숫자 값
          }
          break;
        case 'decay':
          if (object.decay !== undefined) {
            newValue = object.decay; // 단일 숫자 값
          }
          break;
      }

      if (newValue) {
        // 드래그 중이 아닐 때만 즉시 업데이트, 드래그 중이면 마우스 업 후에 업데이트
        if (!this.isDragging) {
          console.log("즉시 키프레임 업데이트:", { selectedProperty, newValue });
          this.updateLightProperty(selectedProperty, newValue);
        } else {
          console.log("드래그 중 - 업데이트 지연:", { selectedProperty, newValue });
          // 드래그 중이면 디바운싱 적용
          this.debouncedUpdateKeyframe(selectedProperty, newValue);
        }
      } else {
        console.warn("속성 값이 null이거나 undefined:", {
          selectedProperty,
          objectName: object.name,
          hasIntensity: object.intensity !== undefined,
          hasColor: !!object.color,
          hasDistance: object.distance !== undefined,
          hasAngle: object.angle !== undefined,
          hasPenumbra: object.penumbra !== undefined,
          hasDecay: object.decay !== undefined
        });
      }
    }
  }
}

export default LightTimeline;