// editor/timeline/MotionTimeline.js
import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";

class MotionTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.selectedKeyframe = null;
    this.selectedSprite = null;
    this.initMotionTracks();

    // 속성 편집 패널 생성
    // this.propertyPanel = this.createPropertyPanel();
    // this.container.appendChild(this.propertyPanel.dom);
  }

  initMotionTracks() {
    // 위치, 회전, 스케일 트랙 추가
    this.addTrack("position", {
      name: "Position",
      properties: ["x", "y", "z"],
      interpolation: "linear",
    });

    // this.addTrack("rotation", {
    //   name: "Rotation",
    //   properties: ["x", "y", "z"],
    //   interpolation: "euler",
    // });

    // this.addTrack("scale", {
    //   name: "Scale",
    //   properties: ["x", "y", "z"],
    //   interpolation: "linear",
    // });
  }

  // 모션 특화 메서드
  updateObjectTransform(object, frame) {
    const positionTrack = this.tracks.get("position");
    const rotationTrack = this.tracks.get("rotation");
    const scaleTrack = this.tracks.get("scale");

    if (positionTrack) {
      const positionKeyframe = positionTrack.getKeyframeAtFrame(frame);
      if (positionKeyframe) {
        object.position.set(
          positionKeyframe.value.x,
          positionKeyframe.value.y,
          positionKeyframe.value.z,
        );
      }
    }

    if (rotationTrack) {
      const rotationKeyframe = rotationTrack.getKeyframeAtFrame(frame);
      if (rotationKeyframe) {
        object.rotation.set(
          rotationKeyframe.value.x,
          rotationKeyframe.value.y,
          rotationKeyframe.value.z,
        );
      }
    }

    if (scaleTrack) {
      const scaleKeyframe = scaleTrack.getKeyframeAtFrame(frame);
      if (scaleKeyframe) {
        object.scale.set(
          scaleKeyframe.value.x,
          scaleKeyframe.value.y,
          scaleKeyframe.value.z,
        );
      }
    }
  }

  // 키프레임 추가
  addTransformKeyframe(object, frame) {
    const positionTrack = this.tracks.get("position");
    const rotationTrack = this.tracks.get("rotation");
    const scaleTrack = this.tracks.get("scale");

    if (positionTrack) {
      positionTrack.addKeyframe(frame, {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
      });
    }

    if (rotationTrack) {
      rotationTrack.addKeyframe(frame, {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z,
      });
    }

    if (scaleTrack) {
      scaleTrack.addKeyframe(frame, {
        x: object.scale.x,
        y: object.scale.y,
        z: object.scale.z,
      });
    }
  }

  // UI 커스터마이징
  // createTrackElement(options) {
  //   const trackElement = document.createElement("div");
  //   trackElement.className = "timeline-track fbx-track";
  //   trackElement.setAttribute("data-object-id", options.objectId);

  //   trackElement.innerHTML = `
  //       <div class="track-header">
  //           <div class="track-info">
  //               <button class="toggle-properties">▶</button>
  //               <span class="track-name">${
  //                 options.name || `Object ${options.objectId}`
  //               }</span>
  //           </div>
  //       </div>
  //       <div class="properties-container" style="display: none;">
  //           <div class="property-track" data-property="position">
  //               <div class="property-header">
  //                   <img src="path/to/position-icon.png" alt="Position" class="property-icon" />
  //                   <button class="add-key-btn" title="Add Keyframe">+</button>
  //               </div>
  //               <div class="property-keyframes-scroll">
  //                   <div class="property-keyframes">
  //                       ${this.createFrameMarkers()}
  //                   </div>
  //               </div>
  //           </div>
  //           <div class="property-track" data-property="rotation">
  //               <div class="property-header">
  //                   <span>Rotation</span>
  //                   <button class="add-key-btn" title="Add Keyframe">+</button>
  //               </div>
  //               <div class="property-keyframes-scroll">
  //                   <div class="property-keyframes">
  //                       ${this.createFrameMarkers()}
  //                   </div>
  //               </div>
  //           </div>
  //           <div class="property-track" data-property="scale">
  //               <div class="property-header">
  //                   <span>Scale</span>
  //                   <button class="add-key-btn" title="Add Keyframe">+</button>
  //               </div>
  //               <div class="property-keyframes-scroll">
  //                   <div class="property-keyframes">
  //                       ${this.createFrameMarkers()}
  //                   </div>
  //               </div>
  //           </div>
  //       </div>
  //   `;

  //   this.bindTrackEvents(trackElement);
  //   return trackElement;
  // }

  // frame-markers 없이 keyframe-layer만 반환
  createFrameMarkers() {
    return `<div class="keyframe-layer"></div>`;
  }

  bindTrackEvents(trackElement) {
    const toggleBtn = trackElement.querySelector(".toggle-properties");
    const propertiesContainer = trackElement.querySelector(
      ".properties-container",
    );
    const objectId = trackElement.getAttribute("data-object-id");

    // 속성 목록 토글
    toggleBtn.addEventListener("click", () => {
      const isExpanded = propertiesContainer.style.display !== "none";
      toggleBtn.textContent = isExpanded ? "▶" : "▼";
      propertiesContainer.style.display = isExpanded ? "none" : "block";
    });

    // 각 속성 트랙의 키프레임 영역에 이벤트 추가
    trackElement
      .querySelectorAll(".property-track")
      .forEach((propertyTrack) => {
        const propertyType = propertyTrack.dataset.property;
        const keyframeLayer = propertyTrack.querySelector(".keyframe-layer");
        const addBtn = propertyTrack.querySelector(".add-key-btn");
        if (addBtn) {
          addBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const frame = this.editor.scene.userData.timeline.currentFrame;
            this.addKeyframe(objectId, propertyType, frame);
          });
        }

        // 프레임 마커 클릭 이벤트
        propertyTrack.querySelectorAll(".frame-marker").forEach((marker) => {
          marker.addEventListener("click", () => {
            const frame = parseInt(marker.dataset.frame);
            this.addKeyframe(objectId, propertyType, frame);
          });
        });
        // 빈 영역 클릭 시에도 키프레임 추가 처리
        const keyframesContainer = propertyTrack.querySelector(
          ".property-keyframes",
        );
        keyframesContainer.addEventListener("click", (e) => {
          e.stopPropagation();
          const rect = keyframesContainer.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const totalFrames =
            this.options.totalSeconds * this.options.framesPerSecond;
          const frame = Math.round((x / rect.width) * totalFrames);
          this.addKeyframe(objectId, propertyType, frame);
        });
      });
  }

  addPropertyTrack(trackElement, propertyType) {
    const propertiesContainer = trackElement.querySelector(".property-tracks");

    // 이미 존재하는 속성인지 확인
    if (
      propertiesContainer.querySelector(
        `.property-track[data-property="${propertyType}"]`,
      )
    ) {
      return;
    }

    const propertyTrack = document.createElement("div");
    propertyTrack.className = "property-track";
    propertyTrack.dataset.property = propertyType;
    propertyTrack.innerHTML = `
        <div class="property-header">
            <span>${propertyType}</span>
            <button class="add-key-btn" title="Add Keyframe">+</button>
        </div>
        <div class="property-keyframes">
            ${this.createFrameMarkers()}
        </div>
    `;

    propertiesContainer.appendChild(propertyTrack);

    // 동적 속성 트랙에도 키 추가 버튼 이벤트 연결
    const addBtnDyn = propertyTrack.querySelector(".add-key-btn");
    if (addBtnDyn) {
      addBtnDyn.addEventListener("click", (e) => {
        e.stopPropagation();
        const frame = this.editor.scene.userData.timeline.currentFrame;
        this.addKeyframe(
          trackElement.getAttribute("data-object-id"),
          propertyType,
          frame,
        );
      });
    }

    // 키프레임 영역 클릭 이벤트
    const keyframeLayer = propertyTrack.querySelector(".keyframe-layer");
    keyframeLayer.addEventListener("click", (e) => {
      const rect = keyframeLayer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const totalWidth = rect.width;

      const totalFrames =
        this.options.totalSeconds * this.options.framesPerSecond;
      const frame = Math.round((x / totalWidth) * totalFrames);

      this.addKeyframe(
        trackElement.getAttribute("data-object-id"),
        propertyType,
        frame,
      );
    });
  }

  addKeyframe(objectId, propertyType, frame) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    // 키프레임 요소 생성
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${
      (frame / (this.options.totalSeconds * this.options.framesPerSecond)) * 100
    }%`;

    // 현재 속성 값 저장
    let value;
    switch (propertyType) {
      case "position":
        value = object.position.clone();
        break;
      case "rotation":
        value = object.rotation.clone();
        break;
      case "scale":
        value = object.scale.clone();
        break;
    }

    // 키프레임 데이터 초기화
    if (!track.keyframes[propertyType]) {
      track.keyframes[propertyType] = new Map();
    }

    // 키프레임 데이터 저장
    track.keyframes[propertyType].set(frame, {
      element: keyframeElement,
      value: value,
      time: frame / this.options.framesPerSecond,
    });

    // 키프레임을 해당 속성 트랙에 추가 (property-keyframes 또는 keyframe-area)
    let container = track.element.querySelector(
      `[data-property="${propertyType}"] .property-keyframes`,
    );
    if (!container) {
      container = track.element.querySelector(
        `[data-property="${propertyType}"] .keyframe-area`,
      );
    }
    if (container) {
      container.appendChild(keyframeElement);
    } else {
      console.warn(
        `Keyframe container not found for property: ${propertyType}`,
      );
    }

    // 키프레임 드래그 이벤트 추가
    this.makeKeyframeDraggable(
      keyframeElement,
      track,
      propertyType,
      frame,
      object,
    );

    // 키프레임 클릭 이벤트
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectKeyframe(objectId, propertyType, frame, keyframeElement);
    });

    // 씬 업데이트
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
  }

  makeKeyframeDraggable(keyframeElement, track, propertyType, frame, object) {
    let isDragging = false;
    let startX;
    let startLeft;

    keyframeElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startLeft = parseFloat(keyframeElement.style.left);
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const totalWidth = keyframeElement.parentElement.offsetWidth;
      const newLeft = Math.max(
        0,
        Math.min(100, startLeft + (dx / totalWidth) * 100),
      );

      keyframeElement.style.left = `${newLeft}%`;

      // 프레임 위치 업데이트
      const newFrame = Math.round(
        (newLeft / 100) *
          this.options.totalSeconds *
          this.options.framesPerSecond,
      );
      this.updateKeyframePosition(track, propertyType, frame, newFrame, object);
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  updateKeyframePosition(track, propertyType, oldFrame, newFrame, object) {
    const keyframeData = track.keyframes[propertyType].get(oldFrame);
    if (!keyframeData) return;

    // 키프레임 데이터 업데이트
    track.keyframes[propertyType].delete(oldFrame);
    track.keyframes[propertyType].set(newFrame, {
      ...keyframeData,
      time: newFrame / this.options.framesPerSecond,
    });

    // 애니메이션 업데이트
    this.updateAnimation(track.objectId);
  }

  updateAnimation(objectId) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    const currentFrame = Math.floor(
      this.currentTime * this.options.framesPerSecond,
    );

    // 각 속성별로 보간 처리
    ["position", "rotation", "scale"].forEach((propertyType) => {
      if (!track.keyframes[propertyType]) return;

      const keyframes = Array.from(
        track.keyframes[propertyType].entries(),
      ).sort(([a], [b]) => a - b);

      let prevKeyframe = null;
      let nextKeyframe = null;

      // 현재 프레임에 해당하는 키프레임 찾기
      for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i][0] <= currentFrame) {
          prevKeyframe = keyframes[i];
        }
        if (keyframes[i][0] > currentFrame) {
          nextKeyframe = keyframes[i];
          break;
        }
      }

      // 보간 처리
      if (prevKeyframe && nextKeyframe) {
        const [prevFrame, prevData] = prevKeyframe;
        const [nextFrame, nextData] = nextKeyframe;
        const alpha = (currentFrame - prevFrame) / (nextFrame - prevFrame);

        switch (propertyType) {
          case "position":
          case "scale":
            object[propertyType].lerpVectors(
              prevData.value,
              nextData.value,
              alpha,
            );
            break;
          case "rotation":
            object[propertyType]
              .copy(prevData.value)
              .slerp(nextData.value, alpha);
            break;
        }
      } else if (prevKeyframe) {
        object[propertyType].copy(prevKeyframe[1].value);
      }
    });

    // 씬 업데이트
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
  }

  play() {
    this.isPlaying = true;
    this.animate();
  }

  pause() {
    this.isPlaying = false;
  }

  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.updateAnimation();
  }

  animate() {
    if (!this.isPlaying) return;

    this.currentTime += 1 / 60; // 60fps
    if (this.currentTime >= this.options.totalSeconds) {
      this.currentTime = 0;
    }

    this.tracks.forEach((track, objectId) => {
      this.updateAnimation(objectId);
    });

    requestAnimationFrame(() => this.animate());
  }

  // 보간 처리
  interpolateTransform(startKeyframe, endKeyframe, progress) {
    return {
      x: this.lerp(startKeyframe.value.x, endKeyframe.value.x, progress),
      y: this.lerp(startKeyframe.value.y, endKeyframe.value.y, progress),
      z: this.lerp(startKeyframe.value.z, endKeyframe.value.z, progress),
    };
  }

  lerp(start, end, alpha) {
    return start + (end - start) * alpha;
  }

  // FBX 객체의 현재 Transform 값을 가져옴
  getCurrentValue(objectId) {
    const object = this.editor.scene.getObjectById(objectId);
    if (!object) return null;

    return {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
    };
  }

  // 키프레임 선택 시 호출되는 메서드
  selectKeyframe(objectId, propertyType, frame, element) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const keyframe = track.keyframes[propertyType]?.get(frame);
    if (!keyframe) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    // 이전 선택 해제
    if (this.selectedKeyframe) {
      const prevElement = this.selectedKeyframe.element;
      if (prevElement) prevElement.classList.remove("selected");
    }

    // 새로운 키프레임 선택
    this.selectedKeyframe = { objectId, propertyType, frame, element };
    element.classList.add("selected");

    // 속성 패널 업데이트
    this.updatePropertyPanel();

    // 선택된 키프레임의 값을 객체에 적용
    object[propertyType].copy(keyframe.value);

    // 씬 업데이트
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
  }

  // 프레임 업데이트 시 호출되는 메서드
  updateFrame(frame) {
    this.tracks.forEach((track, objectId) => {
      const object = this.editor.scene.getObjectById(objectId);
      if (!object) return;

      const keyframes = Array.from(track.keyframes.position.entries()).sort(
        ([a], [b]) => a - b,
      );

      let prevKeyframe = null;
      let nextKeyframe = null;

      for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i][0] <= frame) {
          prevKeyframe = keyframes[i];
        }
        if (keyframes[i][0] > frame) {
          nextKeyframe = keyframes[i];
          break;
        }
      }

      // position 보간 처리
      if (prevKeyframe && nextKeyframe) {
        const [prevFrame, prevData] = prevKeyframe;
        const [nextFrame, nextData] = nextKeyframe;
        const alpha = (frame - prevFrame) / (nextFrame - prevFrame);

        object.position.lerpVectors(prevData.value, nextData.value, alpha);
      } else if (prevKeyframe) {
        object.position.copy(prevKeyframe[1].value);
      }
    });
  }

  createPropertyPanel() {
    const panel = new UIPanel();
    panel.setClass("property-edit-panel");
    // panel.dom.style.display = "none";

    // Vector3 편집을 위한 UI 생성
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
        this.updatePropertyValue.bind(this),
      ),
      rotation: createVectorUI(
        "Rotation",
        new THREE.Vector3(),
        this.updatePropertyValue.bind(this),
      ),
      scale: createVectorUI(
        "Scale",
        new THREE.Vector3(1, 1, 1),
        this.updatePropertyValue.bind(this),
      ),
    };

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
      // 값 업데이트
      keyframeData.value[axis] = value;
      object[propertyType][axis] = value;

      // 씬 업데이트
      if (this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(object);
      }
    }
  }

  updatePropertyPanel() {
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

      // UI 값 업데이트
      const inputs = row.dom.querySelectorAll("input");
      inputs[0].value = object[propertyType].x;
      inputs[1].value = object[propertyType].y;
      inputs[2].value = object[propertyType].z;
    }

    // 패널 표시
    this.propertyPanel.dom.style.display = "";
  }

  addTrack(objectId, options) {
    const track = super.addTrack(objectId, options);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object || !object.animations) return;

    // FBX 애니메이션 길이 계산
    const animationDuration = object.animations[0]?.duration || 0;
    const totalFrames = Math.floor(
      animationDuration * this.options.framesPerSecond,
    );

    // 기본 트랙 구조만 생성
    track.element.innerHTML = `
      <div class="motion-tracks">
          <div class="track-header">
              <div class="track-info">
                  <span class="track-name">${
                    options.name || `Object ${objectId}`
                  }</span>
              </div>
          </div>
          <div class="track-content">
              <div class="animation-sprite" data-duration="${animationDuration}">
                  <div class="sprite-handle left"></div>
                  <div class="sprite-content">
                      <span class="sprite-name">${
                        object.animations[0]?.name || "Animation"
                      }</span>
                  </div>
                  <div class="sprite-handle right"></div>
              </div>
          </div>
        </div>
        <div class="property-tracks">
        </div>
    `;

    // 각 속성 트랙을 동적으로 추가
    this.addPropertyTrack(track.element, "position");
    this.addPropertyTrack(track.element, "rotation");
    this.addPropertyTrack(track.element, "scale");

    // 스프라이트 초기 위치와 길이 설정
    const sprite = track.element.querySelector(".animation-sprite");
    const spriteWidth =
      (totalFrames /
        (this.options.totalSeconds * this.options.framesPerSecond)) *
      100;
    sprite.style.width = `${spriteWidth}%`;
    sprite.style.left = "0%";

    this.bindSpriteEvents(sprite, track);
    this.bindPropertyEvents(track);

    return track;
  }

  bindSpriteEvents(sprite, track) {
    let isDragging = false;
    let isResizing = false;
    let startX = 0;
    let startLeft = 0;
    let startWidth = 0;
    let resizeHandle = null;

    // 스프라이트 드래그
    sprite.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("sprite-handle")) {
        isResizing = true;
        resizeHandle = e.target;
      } else {
        isDragging = true;
      }
      startX = e.clientX;
      startLeft = parseFloat(sprite.style.left) || 0;
      startWidth = parseFloat(sprite.style.width) || 100;
      this.selectSprite(sprite, track);
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging && !isResizing) return;

      const dx = e.clientX - startX;
      const trackWidth = sprite.parentElement.offsetWidth;
      const pxToPercent = (px) => (px / trackWidth) * 100;

      if (isResizing) {
        if (resizeHandle.classList.contains("left")) {
          const newLeft = Math.max(
            0,
            Math.min(100, startLeft + pxToPercent(dx)),
          );
          const newWidth = startWidth - (newLeft - startLeft);
          sprite.style.left = `${newLeft}%`;
          sprite.style.width = `${newWidth}%`;
        } else {
          const newWidth = Math.max(10, startWidth + pxToPercent(dx));
          sprite.style.width = `${newWidth}%`;
        }
      } else {
        const newLeft = Math.max(
          0,
          Math.min(100 - startWidth, startLeft + pxToPercent(dx)),
        );
        sprite.style.left = `${newLeft}%`;
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      isResizing = false;
    });
  }

  bindPropertyEvents(track) {
    const propertyTracks = track.element.querySelectorAll(".property-track");

    propertyTracks.forEach((propertyTrack) => {
      const keyframeArea = propertyTrack.querySelector(".keyframe-area");
      const property = propertyTrack.dataset.property;
      // 키 추가 버튼 클릭 이벤트
      const addBtn = propertyTrack.querySelector(".add-key-btn");
      if (addBtn) {
        addBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const frame = this.editor.scene.userData.timeline.currentFrame;
          this.addKeyframe(track.objectId, property, frame);
        });
      }
      keyframeArea.addEventListener("click", (e) => {
        const rect = keyframeArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = (x / rect.width) * 100;

        this.addKeyframe(track.objectId, property, percent);
      });
    });
  }

  selectSprite(sprite, track) {
    if (this.selectedSprite) {
      this.selectedSprite.classList.remove("selected");
    }
    sprite.classList.add("selected");
    this.selectedSprite = sprite;

    // 속성 패널 표시
    this.showPropertyPanel(track);
  }
}

export { MotionTimeline };
