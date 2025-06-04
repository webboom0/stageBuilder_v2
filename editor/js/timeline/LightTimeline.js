import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText, UIColor } from "../libs/ui.js";
import * as THREE from "three";
import TimelineCore from "./TimelineCore.js";
// editor/timeline/LightTimeline.js
export class LightTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);
    // this.options.totalSeconds = options.totalSeconds || 180;
    // this.options.framesPerSecond = options.framesPerSecond || 30;
    this.currentTime = 0;
    // 10개 조명 트랙 자동 생성
    this.lightTracks = [];
    this.createFixedLightTracks();
  }

  createFixedLightTracks() {
    // 2줄 5칸 = 10개
    const numRows = 2;
    const numCols = 5;
    let lightIndex = 0;

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const lightId = `light_${lightIndex}`;
        const lightName = `Light ${lightIndex + 1}`;
        // 트랙 생성
        this.addTrack(lightId, lightName, row, col);
        // 3D 씬에 조명 생성 및 배치
        this.createAndPlaceLight(lightId, row, col);
        lightIndex++;
      }
    }
  }

  addTrack(lightId, lightName, row, col) {
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
    const trackName = document.createElement("span");
    trackName.className = "track-name";
    trackName.textContent = lightName;
    trackInfo.appendChild(trackName);

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

    // === [여기서 animation-sprite(조명 클립) 추가] ===
    const sprite = document.createElement("div");
    sprite.className = "animation-sprite";
    sprite.dataset.duration = this.options.totalSeconds || 180;
    sprite.style.width = "100%";
    sprite.style.left = "0%";

    // 핸들 및 내용
    const leftHandle = document.createElement("div");
    leftHandle.className = "sprite-handle left";
    const rightHandle = document.createElement("div");
    rightHandle.className = "sprite-handle right";
    const spriteContent = document.createElement("div");
    spriteContent.className = "sprite-content";
    const spriteName = document.createElement("span");
    spriteName.className = "sprite-name";
    spriteName.textContent = lightName;

    spriteContent.appendChild(spriteName);
    sprite.appendChild(leftHandle);
    sprite.appendChild(spriteContent);
    sprite.appendChild(rightHandle);

    // track-content에 sprite 추가
    trackContent.appendChild(sprite);

    // === [클립 클릭 시 선택 처리] ===
    sprite.addEventListener("click", (e) => {
      // 모든 클립의 .selected 제거
      this.container
        .querySelectorAll(".animation-sprite.selected")
        .forEach((el) => {
          el.classList.remove("selected");
        });
      // 현재 클릭한 클립에 .selected 추가
      sprite.classList.add("selected");

      // === 장면 패널(3D 씬)에서도 해당 조명 선택 ===
      const object = this.editor.scene.getObjectByName(lightId);
      if (object) {
        if (this.editor.select) {
          this.editor.select(object); // select 메서드가 있으면 사용
        } else {
          this.editor.selected = object; // 없으면 직접 할당
          if (this.editor.signals?.objectSelected) {
            this.editor.signals.objectSelected.dispatch(object);
          }
        }
      }
    });

    // motion-tracks에 header, content 추가
    motionTracks.appendChild(trackHeader);
    motionTracks.appendChild(trackContent);

    // timeline-track에 motion-tracks 추가
    trackElement.appendChild(motionTracks);

    // 타임라인 컨테이너에 추가
    this.container.appendChild(trackElement);

    // === [여기서 3D 씬에 조명 추가] ===
    this.createAndPlaceLight(lightId, row, col);

    // 트랙 객체로 관리
    const track = {
      element: trackElement,
      keyframes: {
        intensity: new Map(),
        color: new Map(),
        position: new Map(),
      },
      objectId: lightId,
      objectName: lightName,
      row,
      col,
      trackContent, // 클립 추가 시 사용
      sprite, // 조명 클립 참조
    };
    this.tracks.set(lightId, track);
    this.lightTracks.push(track);
  }

  createAndPlaceLight(lightId, row, col) {
    // 3D 씬에 조명 생성 및 배치
    const scene = this.editor.scene;
    // 이미 있으면 중복 생성 방지
    if (scene.getObjectByName(lightId)) return;

    // SpotLight로 변경
    const color = 0xffffff;
    const intensity = 1;
    const distance = 100;
    const angle = Math.PI / 6; // 30도
    const penumbra = 0.2;
    const decay = 0.5;

    const light = new THREE.SpotLight(
      color,
      intensity,
      distance,
      angle,
      penumbra,
      decay
    );
    light.name = lightId;

    // 2줄 5칸 그리드 배치
    const x = -10 + col * 5;
    const y = 50; // 높이 고정
    const z = -5 + row * 10;
    light.position.set(x, y, z);

    // 스포트라이트의 타겟을 아래로 향하게 설정
    const target = new THREE.Object3D();
    target.position.set(x, 0, z); // y=0(아래)로 타겟
    scene.add(target);
    light.target = target;

    scene.add(light);
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
      default:
        return null;
    }
  }

  updateFrame(frame) {
    this.tracks.forEach((track) => {
      const object = this.editor.scene.getObjectById(parseInt(track.objectId));
      if (!object) return;

      let hasChanges = false; // 변경사항 추적을 위한 플래그

      ["intensity", "color", "position"].forEach((propertyType) => {
        const keyframes = track.keyframes[propertyType];
        if (!keyframes || keyframes.size === 0) return;

        const keyframeArray = Array.from(keyframes.entries()).sort(
          ([a], [b]) => a - b
        );
        let prevKeyframe = null;
        let nextKeyframe = null;

        for (let i = 0; i < keyframeArray.length; i++) {
          if (keyframeArray[i][0] <= frame) {
            prevKeyframe = keyframeArray[i];
          }
          if (keyframeArray[i][0] > frame) {
            nextKeyframe = keyframeArray[i];
            break;
          }
        }

        if (prevKeyframe && nextKeyframe) {
          const [prevFrame, prevData] = prevKeyframe;
          const [nextFrame, nextData] = nextKeyframe;
          const alpha = (frame - prevFrame) / (nextFrame - prevFrame);
          this.interpolateProperty(
            object,
            propertyType,
            prevData.value,
            nextData.value,
            alpha
          );
          hasChanges = true;
        } else if (prevKeyframe) {
          this.setPropertyValue(object, propertyType, prevKeyframe[1].value);
          hasChanges = true;
        }
      });

      // 변경사항이 있을 때만 시그널 디스패치
      if (hasChanges && this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(object);
      }
    });
  }

  isWithinClipRange(track, frame) {
    const sprite = track.element.querySelector(".animation-sprite");
    if (!sprite) return true;

    const clipDuration = parseFloat(sprite.dataset.duration);
    const maxFrame = Math.floor(clipDuration * this.options.framesPerSecond);
    const clipLeft = parseFloat(sprite.style.left);
    const clipWidth = parseFloat(sprite.style.width);

    const framePercent =
      (frame / (this.options.totalSeconds * this.options.framesPerSecond)) *
      100;
    return framePercent >= clipLeft && framePercent <= clipLeft + clipWidth;
  }

  // 조명 특화 메서드들
  interpolateProperty(object, propertyType, startValue, endValue, t) {
    switch (propertyType) {
      case "intensity":
        object.intensity = startValue + (endValue - startValue) * t;
        break;
      case "color":
        object.color.lerpColors(startValue, endValue, t);
        break;
      case "position":
        object.position.lerpVectors(startValue, endValue, t);
        break;
    }
  }

  setPropertyValue(object, propertyType, value) {
    switch (propertyType) {
      case "intensity":
        object.intensity = value;
        break;
      case "color":
        object.color.copy(value);
        break;
      case "position":
        object.position.copy(value);
        break;
    }
  }

  // UI 관련 메서드들
  createPropertyPanel() {
    const panel = new UIPanel();
    panel.setClass("property-edit-panel");

    // 강도 조절 UI
    const intensityRow = new UIRow();
    intensityRow.add(new UIText("Intensity"));
    const intensityNumber = new UINumber(1).setRange(0, 10);
    intensityNumber.onChange(() =>
      this.updatePropertyValue("intensity", intensityNumber.getValue())
    );
    intensityRow.add(intensityNumber);

    // 색상 선택 UI
    const colorRow = new UIRow();
    colorRow.add(new UIText("Color"));
    const colorPicker = new UIColor("#ffffff");
    colorPicker.onChange(() => {
      const color = new THREE.Color(colorPicker.getValue());
      this.updatePropertyValue("color", color);
    });
    colorRow.add(colorPicker);

    // 위치 조절 UI
    const createVectorUI = (label, vector, onChange) => {
      const row = new UIRow();
      row.add(new UIText(label));

      const xNumber = new UINumber(vector.x);
      const yNumber = new UINumber(vector.y);
      const zNumber = new UINumber(vector.z);

      xNumber.onChange(() => onChange("x", xNumber.getValue()));
      yNumber.onChange(() => onChange("y", yNumber.getValue()));
      zNumber.onChange(() => onChange("z", zNumber.getValue()));

      row.add(xNumber);
      row.add(yNumber);
      row.add(zNumber);

      return row;
    };

    this.vectorRows = {
      position: createVectorUI(
        "Position",
        new THREE.Vector3(),
        this.updatePropertyValue.bind(this)
      ),
    };

    panel.add(intensityRow);
    panel.add(colorRow);
    Object.values(this.vectorRows).forEach((row) => {
      panel.add(row);
      row.dom.style.display = "none";
    });

    return panel;
  }

  updatePropertyValue(axis, value) {
    if (!this.selectedKeyframe) return;

    const { objectId, propertyType, frame } = this.selectedKeyframe;
    const track = this.tracks.get(objectId);
    const keyframeData = track.keyframes[propertyType].get(frame);
    const object = this.editor.scene.getObjectById(parseInt(objectId));

    if (keyframeData && object) {
      if (propertyType === "intensity") {
        keyframeData.value = value;
        object.intensity = value;
      } else if (propertyType === "color") {
        keyframeData.value = new THREE.Color(value);
        object.color.copy(value);
      } else if (propertyType === "position") {
        keyframeData.value[axis] = value;
        object.position[axis] = value;
      }

      if (this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(object);
      }
    }
  }

  updatePropertyPanel() {
    if (!this.selectedKeyframe || !this.vectorRows) return;

    const { objectId, propertyType } = this.selectedKeyframe;
    const track = this.tracks.get(objectId);
    const object = this.editor.scene.getObjectById(parseInt(objectId));

    if (!track || !object) return;

    // 모든 속성 행 숨기기
    Object.values(this.vectorRows).forEach((row) => {
      row.dom.style.display = "none";
    });

    // 선택된 속성 행 표시
    const row = this.vectorRows[propertyType];
    if (row) {
      row.dom.style.display = "";
      const inputs = row.dom.querySelectorAll("input");
      inputs[0].value = object[propertyType].x;
      inputs[1].value = object[propertyType].y;
      inputs[2].value = object[propertyType].z;
    }

    // 패널 표시
    this.propertyPanel.dom.style.display = "";
  }

  formatPropertyName(propertyType) {
    const names = {
      intensity: "Intensity",
      color: "Color",
      position: "Position",
    };
    return names[propertyType] || propertyType;
  }
}

export default LightTimeline;
