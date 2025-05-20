import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText, UIColor } from "../libs/ui.js";
import * as THREE from "three";
// editor/timeline/LightTimeline.js
export class LightTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);
    // this.initLightTracks();
  }

  initLightTracks() {
    // 조명 관련 트랙 추가
    this.addTrack("intensity", {
      name: "Intensity",
      properties: ["value"],
      interpolation: "linear",
    });

    this.addTrack("color", {
      name: "Color",
      properties: ["r", "g", "b"],
      interpolation: "linear",
    });

    this.addTrack("visibility", {
      name: "Visibility",
      properties: ["visible"],
      interpolation: "step",
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

  addTrack(objectId, objectName) {
    if (this.tracks.has(objectId)) return;

    const track = {
      element: document.createElement("div"),
      keyframes: {
        intensity: new Map(),
        color: new Map(),
        position: new Map(),
      },
      objectId: objectId,
      objectName: objectName,
    };

    track.element.className = "timeline-track";
    track.element.dataset.objectId = objectId;

    const trackTopArea = document.createElement("div");
    trackTopArea.className = "light-tracks";

    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";
    trackHeader.innerHTML = `
      <div class="track-info">
        <span class="track-name">${
          typeof objectName === "object"
            ? objectName.name || "Light"
            : objectName
        }</span>
      </div>
      <div class="track-controls">
        <button class="add-keyframe-btn" title="Add Keyframe">+</button>
      </div>
    `;
    trackTopArea.appendChild(trackHeader);

    track.element.appendChild(trackTopArea);

    const propertyTracksContainer = document.createElement("div");
    propertyTracksContainer.className = "property-tracks";

    ["intensity", "color", "position"].forEach((propertyType) => {
      const propertyTrack = this.createPropertyTrack(objectId, propertyType);
      propertyTracksContainer.appendChild(propertyTrack);
    });

    track.element.appendChild(propertyTracksContainer);

    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);

    this.bindTrackEvents(track);
    return track;
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
