// editor/timeline/MotionTimeline.js
import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";

export class MotionTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.selectedKeyframe = null;
    this.selectedSprite = null;
    this.initMotionTracks();
    this.bindEvents();

    // 속성 편집 패널 생성
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);

    // 비디오 배경 생성
    this.createBackground();
  }

  initMotionTracks() {
    // 위치, 회전, 스케일 트랙 추가
    // this.addTrack("position", {
    //   name: "Position",
    //   properties: ["x", "y", "z"],
    //   interpolation: "linear",
    // });
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

    // if (rotationTrack) {
    //   const rotationKeyframe = rotationTrack.getKeyframeAtFrame(frame);
    //   if (rotationKeyframe) {
    //     object.rotation.set(
    //       rotationKeyframe.value.x,
    //       rotationKeyframe.value.y,
    //       rotationKeyframe.value.z,
    //     );
    //   }
    // }

    // if (scaleTrack) {
    //   const scaleKeyframe = scaleTrack.getKeyframeAtFrame(frame);
    //   if (scaleKeyframe) {
    //     object.scale.set(
    //       scaleKeyframe.value.x,
    //       scaleKeyframe.value.y,
    //       scaleKeyframe.value.z,
    //     );
    //   }
    // }
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

    // if (rotationTrack) {
    //   rotationTrack.addKeyframe(frame, {
    //     x: object.rotation.x,
    //     y: object.rotation.y,
    //     z: object.rotation.z,
    //   });
    // }

    // if (scaleTrack) {
    //   scaleTrack.addKeyframe(frame, {
    //     x: object.scale.x,
    //     y: object.scale.y,
    //     z: object.scale.z,
    //   });
    // }
  }

  // UI 커스터마이징
  // createTrackElement(options) {
  //   const trackElement = document.createElement("div");
  //   trackElement.className = "timeline-track fbx-track";
  //   trackElement.setAttribute("data-track-id", options.objectId);

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
    const objectId = trackElement.getAttribute("data-track-id");

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
    console.log(trackElement);
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
          trackElement.getAttribute("data-track-id"),
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
        trackElement.getAttribute("data-track-id"),
        propertyType,
        frame,
      );
    });
  }

  addKeyframe(objectId, propertyType, frame) {
    console.log("addKeyframe");
    console.log(objectId);
    console.log(propertyType);
    console.log(frame);

    // 현재 프레임 위치 가져오기
    const currentFrame = this.editor.scene.userData.timeline.currentFrame;

    const track = this.tracks.get(objectId);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    // 키프레임 요소 생성
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${
      (currentFrame /
        (this.options.totalSeconds * this.options.framesPerSecond)) *
      100
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
    }

    // 키프레임 데이터 초기화
    if (!track.keyframes[propertyType]) {
      track.keyframes[propertyType] = new Map();
    }

    // 키프레임 데이터 저장
    track.keyframes[propertyType].set(currentFrame, {
      element: keyframeElement,
      value: value,
      time: currentFrame / this.options.framesPerSecond,
    });

    // 키프레임을 해당 속성 트랙에 추가
    let container = track.element.querySelector(
      `[data-property="${propertyType}"] .property-keyframes`,
    );
    if (!container) {
      container = track.element.querySelector(
        `[data-property="${propertyType}"] .keyframe-layer`,
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
      currentFrame,
      object,
    );

    // 키프레임 클릭 이벤트
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();

      // 이전에 선택된 키프레임의 selected 클래스 제거
      const previousSelected = container.querySelector(".keyframe.selected");
      if (previousSelected) {
        previousSelected.classList.remove("selected");
      }

      // 새로 선택된 키프레임에 selected 클래스 추가
      keyframeElement.classList.add("selected");

      this.selectKeyframe(
        objectId,
        propertyType,
        currentFrame,
        keyframeElement,
      );
    });

    // 새로 생성된 키프레임 자동 선택
    const previousSelected = container.querySelector(".keyframe.selected");
    if (previousSelected) {
      previousSelected.classList.remove("selected");
    }
    keyframeElement.classList.add("selected");
    this.selectKeyframe(objectId, propertyType, currentFrame, keyframeElement);

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
    ["position", "rotation"].forEach((propertyType) => {
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
            object.position.lerpVectors(prevData.value, nextData.value, alpha);
            break;
          case "rotation":
            object.rotation.x =
              prevData.value.x + (nextData.value.x - prevData.value.x) * alpha;
            object.rotation.y =
              prevData.value.y + (nextData.value.y - prevData.value.y) * alpha;
            object.rotation.z =
              prevData.value.z + (nextData.value.z - prevData.value.z) * alpha;
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

      // 각 속성별로 키프레임 처리
      ["position", "rotation"].forEach((propertyType) => {
        if (
          !track.keyframes[propertyType] ||
          track.keyframes[propertyType].size === 0
        )
          return;

        const keyframes = Array.from(
          track.keyframes[propertyType].entries(),
        ).sort(([a], [b]) => a - b);

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

        // 보간 처리
        if (prevKeyframe && nextKeyframe) {
          const [prevFrame, prevData] = prevKeyframe;
          const [nextFrame, nextData] = nextKeyframe;
          const alpha = (frame - prevFrame) / (nextFrame - prevFrame);

          switch (propertyType) {
            case "position":
              object.position.lerpVectors(
                prevData.value,
                nextData.value,
                alpha,
              );
              break;
            case "rotation":
              object.rotation.x =
                prevData.value.x +
                (nextData.value.x - prevData.value.x) * alpha;
              object.rotation.y =
                prevData.value.y +
                (nextData.value.y - prevData.value.y) * alpha;
              object.rotation.z =
                prevData.value.z +
                (nextData.value.z - prevData.value.z) * alpha;
              break;
          }
        } else if (prevKeyframe) {
          switch (propertyType) {
            case "position":
              object.position.copy(prevKeyframe[1].value);
              break;
            case "rotation":
              object.rotation.copy(prevKeyframe[1].value);
              break;
          }
        }
      });
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

      // UI 값 업데이트
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

    // 1. 메인 트랙 컨테이너 생성
    const track = {
      element: document.createElement("div"),
      keyframes: {
        position: new Map(),
        rotation: new Map(),
      },
      objectId: objectId,
      objectName: objectName,
    };
    track.element.className = "timeline-track";
    track.element.dataset.objectId = objectId;

    // 2. 트랙 상단 영역 생성 (헤더 + 컨텐츠)
    const trackTopArea = document.createElement("div");
    trackTopArea.className = "motion-tracks";

    // 2-1. 트랙 헤더 생성 (레이어 이름 + 키프레임 추가 버튼)
    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";
    trackHeader.innerHTML = `
      <div class="track-info">
        <span class="track-name">${
          typeof objectName === "object"
            ? objectName.name || "Object"
            : objectName
        }</span>
      </div>
      <div class="track-controls">
        <button class="add-keyframe-btn" title="Add Keyframe">+</button>
      </div>
    `;
    trackTopArea.appendChild(trackHeader);

    // 2-2. 애니메이션 스프라이트 생성
    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (object && object.animations) {
      const animationDuration = object.animations[0]?.duration || 0;
      const totalFrames = Math.floor(
        animationDuration * this.options.framesPerSecond,
      );

      const trackContent = document.createElement("div");
      trackContent.className = "track-content";

      const sprite = document.createElement("div");
      sprite.className = "animation-sprite";
      sprite.dataset.duration = animationDuration;
      sprite.innerHTML = `
        <div class="sprite-handle left"></div>
        <div class="sprite-content">
          <span class="sprite-name">${
            object.animations[0]?.name || "Animation"
          }</span>
        </div>
        <div class="sprite-handle right"></div>
      `;

      // 스프라이트 크기와 위치 설정
      const spriteWidth =
        (totalFrames /
          (this.options.totalSeconds * this.options.framesPerSecond)) *
        100;
      sprite.style.width = `${spriteWidth}%`;
      sprite.style.left = "0%";

      trackContent.appendChild(sprite);
      trackTopArea.appendChild(trackContent);

      // 스프라이트 이벤트 바인딩
      this.bindSpriteEvents(sprite, track);
    }

    track.element.appendChild(trackTopArea);

    // 3. 속성 트랙 컨테이너 생성
    const propertyTracksContainer = document.createElement("div");
    propertyTracksContainer.className = "property-tracks";

    // 4. 각 속성(position, rotation)에 대한 트랙 생성
    ["position", "rotation"].forEach((propertyType) => {
      const propertyTrack = this.createPropertyTrack(objectId, propertyType);
      propertyTracksContainer.appendChild(propertyTrack);
    });

    track.element.appendChild(propertyTracksContainer);

    // 5. 트랙 저장 및 DOM에 추가
    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);

    // 6. 이벤트 바인딩
    this.bindTrackEvents(track);

    return track;
  }

  createPropertyTrack(objectId, propertyType) {
    const propertyTrack = document.createElement("div");
    propertyTrack.className = "property-track";
    propertyTrack.dataset.objectId = objectId;
    propertyTrack.dataset.property = propertyType;

    // 1. 속성 헤더 (속성 이름 + 키프레임 추가 버튼)
    const propertyHeader = document.createElement("div");
    propertyHeader.className = "property-header";
    propertyHeader.innerHTML = `
      <span>${this.formatPropertyName(propertyType)}</span>
      <button class="add-keyframe-btn" title="Add Keyframe">+</button>
    `;
    propertyTrack.appendChild(propertyHeader);

    // 2. 키프레임 영역
    const keyframesContainer = document.createElement("div");
    keyframesContainer.className = "property-keyframes-scroll";

    const keyframesArea = document.createElement("div");
    keyframesArea.className = "property-keyframes";

    const keyframeLayer = document.createElement("div");
    keyframeLayer.className = "keyframe-layer";

    keyframesArea.appendChild(keyframeLayer);
    keyframesContainer.appendChild(keyframesArea);
    propertyTrack.appendChild(keyframesContainer);

    return propertyTrack;
  }

  bindTrackEvents(track) {
    // 1. 메인 트랙의 키프레임 추가 버튼
    const mainAddBtn = track.element.querySelector(
      ".track-header .add-keyframe-btn",
    );
    if (mainAddBtn) {
      mainAddBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentFrame = this.currentFrame;
        ["position", "rotation"].forEach((propertyType) => {
          this.addKeyframe(track.objectId, propertyType, currentFrame);
        });
      });
    }

    // 2. 각 속성 트랙의 키프레임 추가 버튼
    track.element
      .querySelectorAll(".property-track .add-keyframe-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const propertyTrack = e.target.closest(".property-track");
          const propertyType = propertyTrack.dataset.property;
          const currentFrame = this.currentFrame;
          this.addKeyframe(track.objectId, propertyType, currentFrame);
        });
      });

    // 3. 키프레임 레이어 클릭 이벤트
    track.element.querySelectorAll(".keyframe-layer").forEach((layer) => {
      layer.addEventListener("click", (e) => {
        const propertyTrack = e.target.closest(".property-track");
        const propertyType = propertyTrack.dataset.property;
        const rect = layer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const frame = Math.round(
          percent * this.options.totalSeconds * this.options.framesPerSecond,
        );
        this.addKeyframe(track.objectId, propertyType, frame);
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

  bindEvents() {
    this.container.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-keyframe-btn")) {
        const track = e.target.closest(".timeline-track");
        if (track) {
          const objectId = track.dataset.objectId;
          const currentFrame = this.currentFrame;
          this.addKeyframe(objectId, "position", currentFrame);
          this.addKeyframe(objectId, "rotation", currentFrame);
        }
      }
    });
  }

  updateKeyframes() {
    this.tracks.forEach((track) => {
      const object = this.editor.scene.getObjectById(parseInt(track.objectId));
      if (!object) return;

      ["position", "rotation"].forEach((propertyType) => {
        const keyframes = track.keyframes[propertyType];
        if (!keyframes) return;

        // 현재 프레임에 가장 가까운 두 키프레임 찾기
        let prevFrame = -1;
        let nextFrame = -1;
        let prevKeyframe = null;
        let nextKeyframe = null;

        keyframes.forEach((keyframe, frame) => {
          if (frame <= this.currentFrame && frame > prevFrame) {
            prevFrame = frame;
            prevKeyframe = keyframe;
          }
          if (
            frame > this.currentFrame &&
            (nextFrame === -1 || frame < nextFrame)
          ) {
            nextFrame = frame;
            nextKeyframe = keyframe;
          }
        });

        // 보간 적용
        if (prevKeyframe && nextKeyframe) {
          const t = (this.currentFrame - prevFrame) / (nextFrame - prevFrame);
          this.interpolateProperty(
            object,
            propertyType,
            prevKeyframe.value,
            nextKeyframe.value,
            t,
          );
        } else if (prevKeyframe) {
          this.setPropertyValue(object, propertyType, prevKeyframe.value);
        } else if (nextKeyframe) {
          this.setPropertyValue(object, propertyType, nextKeyframe.value);
        }
      });
    });
  }

  interpolateProperty(object, propertyType, startValue, endValue, t) {
    switch (propertyType) {
      case "position":
        object.position.lerpVectors(startValue, endValue, t);
        break;
      case "rotation":
        object.rotation.x = startValue.x + (endValue.x - startValue.x) * t;
        object.rotation.y = startValue.y + (endValue.y - startValue.y) * t;
        object.rotation.z = startValue.z + (endValue.z - startValue.z) * t;
        break;
    }
  }

  setPropertyValue(object, propertyType, value) {
    switch (propertyType) {
      case "position":
        object.position.copy(value);
        break;
      case "rotation":
        object.rotation.copy(value);
        break;
    }
  }

  bindSpriteEvents(sprite, track) {
    let isDragging = false;
    let isResizing = false;
    let startX = 0;
    let startLeft = 0;
    let startWidth = 0;
    let resizeHandle = null;

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
