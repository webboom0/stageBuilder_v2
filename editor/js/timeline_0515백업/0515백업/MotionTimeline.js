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
    document
      .querySelector("#keyframe-property-panel")
      .appendChild(this.propertyPanel.dom);
    // document.querySelector(".timeline-header").appendChild(this.propertyPanel.dom)

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

  bindTrackEvents(track) {
    // 키프레임 추가 버튼
    const addBtn = track.element.querySelector(
      ".track-header .add-keyframe-btn",
    );
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentFrame = this.currentFrame;
        this.addKeyframe(track.objectId, currentFrame);
      });
    }
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
            <button class="add-keyframe-btn" title="Add Keyframe">+</button>
        </div>
        <div class="property-keyframes">
            ${this.createFrameMarkers()}
        </div>
    `;

    propertiesContainer.appendChild(propertyTrack);

    // 동적 속성 트랙에도 키 추가 버튼 이벤트 연결
    const addBtnDyn = propertyTrack.querySelector(".add-keyframe-btn");
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

  addKeyframe(objectId, frame) {
    const track = this.tracks.get(objectId);
    if (!track) {
      console.warn("Track not found:", objectId);
      return;
    }

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) {
      console.warn("Object not found:", objectId);
      return;
    }

    // 현재 선택된 클립 또는 첫 번째 클립 사용
    const selectedSprite = track.element.querySelector(
      ".animation-sprite.selected",
    );
    const sprite =
      selectedSprite || track.element.querySelector(".animation-sprite");

    if (!sprite) {
      console.warn("클립을 찾을 수 없습니다.");
      return;
    }

    // 클립과 playhead의 위치를 픽셀 단위로 정확하게 계산
    const spriteRect = sprite.getBoundingClientRect();
    const playheadElement = document.querySelector(".playhead");
    const playheadRect = playheadElement.getBoundingClientRect();

    // playhead의 상대적 위치 계산 (클립 기준)
    const relativePlayheadPosition = playheadRect.left - spriteRect.left;

    // playhead가 클립 영역 내에 있는지 확인
    const isPlayheadInClip =
      relativePlayheadPosition >= 0 &&
      relativePlayheadPosition <= spriteRect.width;

    if (!isPlayheadInClip) {
      console.warn("키프레임은 클립 범위 내에만 추가할 수 있습니다.");
      return;
    }

    // 현재 프레임 계산
    const currentFrame = Math.floor(
      this.currentTime * this.options.framesPerSecond,
    );

    // 키프레임 요소 생성
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${relativePlayheadPosition}px`;
    keyframeElement.dataset.pixelPosition = relativePlayheadPosition.toString();
    keyframeElement.dataset.frame = currentFrame.toString();

    // 여기에 makeKeyframeDraggable 호출 추가
    this.makeKeyframeDraggable(keyframeElement, track, currentFrame, object);

    // 현재 객체의 position 값을 정확하게 저장
    const keyframeData = {
      position: {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z,
      },
      time: this.currentTime,
      frame: currentFrame,
    };

    // track.keyframes 초기화 확인
    if (!track.keyframes) {
      track.keyframes = {};
    }

    // 키프레임 데이터를 track.keyframes에 저장
    track.keyframes[currentFrame] = {
      element: keyframeElement,
      data: keyframeData,
    };

    console.log("Keyframe data saved:", {
      frame: currentFrame,
      keyframeData: track.keyframes[currentFrame],
      allKeyframes: track.keyframes,
    });

    // 키프레임 레이어에 추가
    let keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (!keyframeLayer) {
      keyframeLayer = document.createElement("div");
      keyframeLayer.className = "keyframe-layer";
      keyframeLayer.style.position = "absolute";
      keyframeLayer.style.width = "100%";
      keyframeLayer.style.height = "100%";
      keyframeLayer.style.top = "0";
      keyframeLayer.style.left = "0";
      sprite.appendChild(keyframeLayer);
    }

    keyframeLayer.appendChild(keyframeElement);

    // 키프레임 이벤트 설정
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectKeyframe(objectId, currentFrame, keyframeElement);
    });

    // 새로 추가된 키프레임 선택
    this.selectKeyframe(objectId, currentFrame, keyframeElement);

    return keyframeElement;
  }

  // BaseTimeline의 makeKeyframeDraggable 메서드를 오버라이드
  // makeKeyframeDraggable(keyframeElement, track, frame, object) {
  //   let isDragging = false;
  //   let startX;
  //   let startPixelPosition;

  //   keyframeElement.addEventListener("mousedown", (e) => {
  //     isDragging = true;
  //     startX = e.clientX;
  //     startPixelPosition = parseFloat(keyframeElement.dataset.pixelPosition);

  //     // 드래그 시작할 때 키프레임 선택
  //     this.selectKeyframe(track.objectId, frame, keyframeElement);

  //     e.stopPropagation();
  //   });

  //   document.addEventListener("mousemove", (e) => {
  //     if (!isDragging) return;

  //     const sprite = keyframeElement.closest(".animation-sprite");
  //     if (!sprite) return;

  //     const spriteRect = sprite.getBoundingClientRect();
  //     const dx = e.clientX - startX;
  //     const newPixelPosition = Math.max(
  //       0,
  //       Math.min(spriteRect.width, startPixelPosition + dx)
  //     );

  //     // 픽셀 단위로 위치 설정
  //     keyframeElement.style.left = `${newPixelPosition}px`;
  //     keyframeElement.dataset.pixelPosition = newPixelPosition.toString();

  //     // 프레임 위치 업데이트
  //     const newFrame = Math.round(
  //       (newPixelPosition / spriteRect.width) *
  //         this.options.totalSeconds *
  //         this.options.framesPerSecond
  //     );
  //     keyframeElement.dataset.frame = newFrame.toString();

  //     // 키프레임 데이터 업데이트
  //     this.updateKeyframePosition(
  //       track,
  //       frame,
  //       newFrame,
  //       object,
  //       newPixelPosition
  //     );
  //   });

  //   document.addEventListener("mouseup", () => {
  //     isDragging = false;
  //   });
  // }

  // updateKeyframePosition 메서드 오버라이드
  updateKeyframePosition(track, oldFrame, newFrame, object, newPixelPosition) {
    const keyframeData = track.keyframes[oldFrame];
    if (!keyframeData) return;

    // 키프레임 데이터 업데이트
    delete track.keyframes[oldFrame];
    track.keyframes[newFrame] = {
      ...keyframeData,
      data: {
        ...keyframeData.data,
        time: newFrame / this.options.framesPerSecond,
        pixelPosition: newPixelPosition, // 픽셀 위치 저장
      },
    };

    // 선택된 키프레임이 이동한 경우 선택 상태 업데이트
    if (
      this.selectedKeyframe &&
      this.selectedKeyframe.objectId === track.objectId &&
      this.selectedKeyframe.frame === oldFrame
    ) {
      this.selectedKeyframe.frame = newFrame;
    }

    // 씬 업데이트
    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
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
  selectKeyframe(objectId, frame, keyframeElement) {
    // 이전 선택 해제
    const previousSelected = document.querySelector(".keyframe.selected");
    if (previousSelected) {
      previousSelected.classList.remove("selected");
    }

    // 새로운 선택
    keyframeElement.classList.add("selected");

    const track = this.tracks.get(objectId);
    if (!track || !track.keyframes) {
      console.warn("Track or keyframes not found:", { objectId, track });
      return;
    }

    const keyframeData = track.keyframes[frame];
    if (!keyframeData) {
      console.warn("Keyframe data not found:", {
        frame,
        trackKeyframes: track.keyframes,
      });
      return;
    }

    // 선택 상태 저장
    this.selectedKeyframe = {
      objectId,
      frame,
      element: keyframeElement,
      data: keyframeData,
    };

    console.log("Keyframe selected:", {
      frame,
      data: keyframeData,
      selectedKeyframe: this.selectedKeyframe,
    });

    // 속성 패널 업데이트
    this.updatePropertyPanel();
  }

  // 프레임 업데이트 시 호출되는 메서드
  updateFrame(frame) {
    this.tracks.forEach((track, objectId) => {
      const object = this.editor.scene.getObjectById(objectId);
      if (!object) return;

      let hasChanges = false;

      ["position", "rotation"].forEach((propertyType) => {
        const keyframes = track.keyframes[propertyType];
        if (!keyframes || keyframes.size === 0) return;

        const keyframeArray = Array.from(keyframes.entries()).sort(
          ([a], [b]) => a - b,
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
            alpha,
          );
          hasChanges = true;
        } else if (prevKeyframe) {
          this.setPropertyValue(object, propertyType, prevKeyframe[1].value);
          hasChanges = true;
        }
      });

      if (hasChanges && this.editor.signals?.objectChanged) {
        this.editor.signals.objectChanged.dispatch(object);
      }
    });
  }

  createPropertyPanel() {
    const panel = new UIPanel();
    panel.setClass("property-panel");

    const positionRow = new UIRow();
    positionRow.setClass("position-row");
    positionRow.add(new UIText("Position"));

    const posX = new UINumber().setPrecision(3).setWidth("50px");
    const posY = new UINumber().setPrecision(3).setWidth("50px");
    const posZ = new UINumber().setPrecision(3).setWidth("50px");

    // 각 입력 필드에 식별자 추가
    posX.dom.setAttribute("data-axis", "x");
    posY.dom.setAttribute("data-axis", "y");
    posZ.dom.setAttribute("data-axis", "z");

    // X position
    posX.onChange((value) => {
      if (!this.selectedKeyframe?.data?.data?.position) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      this.selectedKeyframe.data.data.position.x = numValue;

      const object = this.editor.scene.getObjectById(
        parseInt(this.selectedKeyframe.objectId),
      );
      if (object) {
        object.position.x = numValue;
        this.editor.signals?.objectChanged.dispatch(object);
      }

      console.log("Position X updated:", {
        newValue: numValue,
        keyframeData: this.selectedKeyframe.data.data,
      });
    });

    // Y position
    posY.onChange((value) => {
      if (!this.selectedKeyframe?.data?.data?.position) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      this.selectedKeyframe.data.data.position.y = numValue;

      const object = this.editor.scene.getObjectById(
        parseInt(this.selectedKeyframe.objectId),
      );
      if (object) {
        object.position.y = numValue;
        this.editor.signals?.objectChanged.dispatch(object);
      }
    });

    // Z position
    posZ.onChange((value) => {
      if (!this.selectedKeyframe?.data?.data?.position) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      this.selectedKeyframe.data.data.position.z = numValue;

      const object = this.editor.scene.getObjectById(
        parseInt(this.selectedKeyframe.objectId),
      );
      if (object) {
        object.position.z = numValue;
        this.editor.signals?.objectChanged.dispatch(object);
      }
    });

    positionRow.add(posX);
    positionRow.add(posY);
    positionRow.add(posZ);
    panel.add(positionRow);

    // 스타일 추가
    panel.dom.style.padding = "10px";
    panel.dom.style.backgroundColor = "#2c2c2c";
    panel.dom.style.borderTop = "1px solid #1a1a1a";

    return panel;
  }

  updateObject() {
    if (!this.selectedKeyframe) return;

    const object = this.editor.scene.getObjectById(
      parseInt(this.selectedKeyframe.objectId),
    );
    if (!object) return;

    const data = this.selectedKeyframe.data.data;
    if (data.position) {
      object.position.copy(data.position);
    }
    if (data.rotation) {
      object.rotation.copy(data.rotation);
    }

    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
  }

  updatePropertyPanel() {
    if (!this.selectedKeyframe?.data?.data?.position || !this.propertyPanel) {
      console.warn("No valid position data or property panel", {
        selectedKeyframe: this.selectedKeyframe,
        propertyPanel: this.propertyPanel,
      });
      return;
    }

    const position = this.selectedKeyframe.data.data.position;
    console.log("Updating property panel with position:", position);

    // DOM 요소 직접 접근
    const xInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="x"]',
    );
    const yInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="y"]',
    );
    const zInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="z"]',
    );

    if (xInput) xInput.value = position.x;
    if (yInput) yInput.value = position.y;
    if (zInput) zInput.value = position.z;
  }

  addTrack(objectId, objectName) {
    if (this.tracks.has(objectId)) return;

    // 1. 메인 트랙 컨테이너 생성
    const track = {
      element: document.createElement("div"),
      keyframes: new Map(),
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

      // 스프라이트 이벤트 바인딩 (키프레임 드래그 이벤트 포함)
      this.bindSpriteEvents(sprite, track);

      // 기존 키프레임들에 대해 드래그 이벤트 재바인딩
      const keyframes = sprite.querySelectorAll(".keyframe");
      keyframes.forEach((keyframe) => {
        const frame = parseInt(keyframe.dataset.frame);
        this.makeKeyframeDraggable(keyframe, track, frame, object);
      });
    }

    track.element.appendChild(trackTopArea);

    // 3. 트랙 저장 및 DOM에 추가
    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);

    // 4. 이벤트 바인딩
    this.bindTrackEvents(track);

    return track;
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
          this.addKeyframe(objectId, currentFrame);
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

  showPropertyPanel(objectId) {
    const object = this.editor.scene.getObjectByProperty("uuid", objectId);
    if (!object) return;

    const panel = new UIPanel();
    panel.setId("property-panel");
    panel.setPosition("absolute");
    panel.setRight("0px");
    panel.setTop("0px");
    panel.setWidth("300px");
    panel.setHeight("100%");
    panel.setBackgroundColor("#2a2a2a");
    panel.setColor("#ffffff");

    // 위치 속성
    const positionRow = new UIRow();
    positionRow.add(new UIText("Position").setWidth("90px"));

    const xPosition = new UINumber(object.position.x).setWidth("50px");
    const yPosition = new UINumber(object.position.y).setWidth("50px");
    const zPosition = new UINumber(object.position.z).setWidth("50px");

    xPosition.onChange(() => {
      object.position.x = xPosition.getValue();
      this.updateKeyframes(objectId, "position");
    });
    yPosition.onChange(() => {
      object.position.y = yPosition.getValue();
      this.updateKeyframes(objectId, "position");
    });
    zPosition.onChange(() => {
      object.position.z = zPosition.getValue();
      this.updateKeyframes(objectId, "position");
    });

    positionRow.add(xPosition, yPosition, zPosition);
    panel.add(positionRow);

    // 회전 속성
    const rotationRow = new UIRow();
    rotationRow.add(new UIText("Rotation").setWidth("90px"));

    const xRotation = new UINumber(object.rotation.x).setWidth("50px");
    const yRotation = new UINumber(object.rotation.y).setWidth("50px");
    const zRotation = new UINumber(object.rotation.z).setWidth("50px");

    xRotation.onChange(() => {
      object.rotation.x = xRotation.getValue();
      this.updateKeyframes(objectId, "rotation");
    });
    yRotation.onChange(() => {
      object.rotation.y = yRotation.getValue();
      this.updateKeyframes(objectId, "rotation");
    });
    zRotation.onChange(() => {
      object.rotation.z = zRotation.getValue();
      this.updateKeyframes(objectId, "rotation");
    });

    rotationRow.add(xRotation, yRotation, zRotation);
    panel.add(rotationRow);

    // 기존 패널 제거
    const existingPanel = document.getElementById("property-panel");
    if (existingPanel) {
      existingPanel.remove();
    }

    // 새 패널 추가
    document.body.appendChild(panel.dom);
  }

  updateKeyframes(objectId, propertyType) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const keyframes = track.keyframes[propertyType];
    if (!keyframes) return;

    // 현재 프레임의 키프레임 업데이트
    const currentFrame = this.currentFrame;
    const keyframe = keyframes.find((k) => k.frame === currentFrame);
    if (keyframe) {
      const object = this.editor.scene.getObjectByProperty("uuid", objectId);
      if (object) {
        keyframe.value = this.getPropertyValue(object, propertyType);
      }
    }
  }

  bindSpriteEvents(sprite, track) {
    let isDragging = false;
    let isResizing = false;
    let startX;
    let startLeft;
    let startWidth;
    let resizeHandle;

    // 드래그 시작
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
      e.stopPropagation();
    });

    // 드래그 중
    document.addEventListener("mousemove", (e) => {
      if (!isDragging && !isResizing) return;

      const dx = e.clientX - startX;
      const parentWidth = sprite.parentElement.offsetWidth;
      const deltaPercent = (dx / parentWidth) * 100;

      if (isResizing) {
        if (resizeHandle.classList.contains("left")) {
          const newLeft = Math.max(
            0,
            Math.min(startLeft + deltaPercent, startLeft + startWidth - 10),
          );
          const newWidth = startWidth - (newLeft - startLeft);

          if (
            newWidth >= 10 &&
            !this.checkClipCollision(sprite, newLeft, newWidth)
          ) {
            sprite.style.left = `${newLeft}%`;
            sprite.style.width = `${newWidth}%`;
            // 크기 변경 후 키프레임 업데이트 및 범위 체크
            this.updateKeyframesInClip(track, sprite);
          }
        } else {
          const newWidth = Math.max(
            10,
            Math.min(startWidth + deltaPercent, 100 - startLeft),
          );
          if (!this.checkClipCollision(sprite, startLeft, newWidth)) {
            sprite.style.width = `${newWidth}%`;
            // 크기 변경 후 키프레임 업데이트 및 범위 체크
            this.updateKeyframesInClip(track, sprite);
          }
        }
      } else {
        const newLeft = Math.max(
          0,
          Math.min(100 - startWidth, startLeft + deltaPercent),
        );
        if (!this.checkClipCollision(sprite, newLeft, startWidth)) {
          sprite.style.left = `${newLeft}%`;
          // 위치 변경 후 키프레임 업데이트
          this.updateKeyframesInClip(track, sprite);
        }
      }
    });

    // 드래그 종료
    document.addEventListener("mouseup", () => {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
      }
    });

    // 클립 선택
    sprite.addEventListener("click", (e) => {
      e.stopPropagation();
      const previousSelected = document.querySelector(
        ".animation-sprite.selected",
      );
      if (previousSelected) {
        previousSelected.classList.remove("selected");
      }
      sprite.classList.add("selected");
    });

    // 우클릭 메뉴 이벤트 추가
    sprite.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 기존 메뉴 제거
      const existingMenu = document.querySelector(".context-menu");
      if (existingMenu) {
        existingMenu.remove();
      }

      // 클립 개수 확인
      const clipCount =
        track.element.querySelectorAll(".animation-sprite").length;

      // 컨텍스트 메뉴 생성
      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.style.position = "fixed";
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.style.backgroundColor = "#2c2c2c";
      menu.style.border = "1px solid #444";
      menu.style.padding = "5px 0";
      menu.style.borderRadius = "3px";
      menu.style.zIndex = "1000";

      // 복제 메뉴 아이템
      const duplicateItem = document.createElement("div");
      duplicateItem.textContent = "클립복제";
      duplicateItem.style.padding = "5px 15px";
      duplicateItem.style.cursor = "pointer";
      duplicateItem.style.color = "#fff";
      duplicateItem.style.fontSize = "12px";

      // 복제 클릭 이벤트
      duplicateItem.addEventListener("click", () => {
        this.duplicateSprite(sprite, track);
        menu.remove();
      });

      // 호버 효과
      duplicateItem.addEventListener("mouseover", () => {
        duplicateItem.style.backgroundColor = "#3c3c3c";
      });
      duplicateItem.addEventListener("mouseout", () => {
        duplicateItem.style.backgroundColor = "transparent";
      });

      menu.appendChild(duplicateItem);

      // 클립이 2개 이상일 때만 삭제 버튼 추가
      if (clipCount > 1) {
        const deleteItem = document.createElement("div");
        deleteItem.textContent = "클립삭제";
        deleteItem.style.padding = "5px 15px";
        deleteItem.style.cursor = "pointer";
        deleteItem.style.color = "#ff4444";
        deleteItem.style.fontSize = "12px";

        // 호버 효과
        deleteItem.addEventListener("mouseover", () => {
          deleteItem.style.backgroundColor = "#3c3c3c";
        });
        deleteItem.addEventListener("mouseout", () => {
          deleteItem.style.backgroundColor = "transparent";
        });

        // 삭제 클릭 이벤트
        deleteItem.addEventListener("click", () => {
          this.deleteSprite(sprite, track);
          menu.remove();
        });

        menu.appendChild(deleteItem);
      }

      document.body.appendChild(menu);

      // 메뉴 외부 클릭 시 닫기
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      document.addEventListener("click", closeMenu);
    });
  }

  // 클립 충돌 체크 메서드 추가
  checkClipCollision(currentSprite, newLeft, newWidth) {
    const clips = Array.from(
      currentSprite.parentElement.querySelectorAll(".animation-sprite"),
    );
    const currentRight = newLeft + newWidth;

    // 현재 클립을 제외한 다른 클립들과의 충돌 체크
    return clips.some((clip) => {
      if (clip === currentSprite) return false;

      const clipLeft = parseFloat(clip.style.left) || 0;
      const clipWidth = parseFloat(clip.style.width) || 100;
      const clipRight = clipLeft + clipWidth;

      // 충돌 조건: 두 클립의 범위가 겹치는 경우
      const hasCollision = !(currentRight <= clipLeft || newLeft >= clipRight);

      // 디버깅을 위한 로그
      if (hasCollision) {
        console.log("Clip collision detected:", {
          current: { left: newLeft, right: currentRight },
          other: { left: clipLeft, right: clipRight },
        });
      }

      return hasCollision;
    });
  }

  // 클립 크기 변경 시 키프레임 위치 업데이트
  updateKeyframesInClip(track, sprite) {
    const keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (!keyframeLayer) return;

    const keyframes = Array.from(keyframeLayer.querySelectorAll(".keyframe"));
    const spriteWidth = sprite.offsetWidth;

    keyframes.forEach((keyframe) => {
      const pixelPosition = parseFloat(keyframe.dataset.pixelPosition);

      // 키프레임이 클립 범위를 벗어났는지 확인
      if (pixelPosition < 0 || pixelPosition > spriteWidth) {
        // 키프레임 요소 제거
        keyframe.remove();

        // 키프레임 데이터에서도 제거
        const frame = parseInt(keyframe.dataset.frame);
        if (track.keyframes && track.keyframes[frame]) {
          delete track.keyframes[frame];
        }

        console.log(
          `키프레임 삭제: position ${pixelPosition}px가 클립 범위(0-${spriteWidth}px)를 벗어남`,
        );
        return;
      }

      // 범위 내의 키프레임은 프레임 값 업데이트
      const frame = Math.round(
        (pixelPosition / spriteWidth) *
          this.options.totalSeconds *
          this.options.framesPerSecond,
      );
      keyframe.dataset.frame = frame.toString();

      if (track.keyframes && track.keyframes[frame]) {
        track.keyframes[frame].time = frame / this.options.framesPerSecond;
      }
    });
  }

  createBackground() {
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

    // 기존 배경 제거
    const existingBackground = stageGroup.children.find(
      (child) => child.name === "_VideoBackground",
    );
    if (existingBackground) {
      console.log("기존 배경 제거");
      stageGroup.remove(existingBackground);
    }

    // Stage 객체의 크기 계산
    const stageSize = new THREE.Vector3(200, 112.5, 1); // 기본 Stage 크기
    const stageGeometry = new THREE.PlaneGeometry(stageSize.x, stageSize.y);

    // Cloudinary 비디오 URL 설정
    const cloudName = "djqiaktcg"; // 실제 Cloudinary cloud name으로 변경
    const videoId = "omhwppxby9e7yw4tmydz"; // 업로드한 비디오의 public_id로 변경
    const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${videoId}.mp4`;
    // 비디오 요소 생성
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("x5-video-player-type", "h5");
    video.setAttribute("x5-video-player-fullscreen", "true");

    // Cloudinary 비디오 소스 설정
    const source = document.createElement("source");
    source.src = videoUrl;
    source.type = "video/mp4";
    video.appendChild(source);

    // 비디오 텍스처 생성
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    // Stage 평면 생성
    const stageMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const stagePlane = new THREE.Mesh(stageGeometry, stageMaterial);
    stagePlane.position.set(0, 0, -50);
    stagePlane.name = "_VideoBackground";
    stageGroup.add(stagePlane);

    // 비디오 로드 및 재생 시도
    const loadVideo = async () => {
      try {
        console.log("비디오 로드 시작");
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

        // 자동 재생 시도
        try {
          console.log("자동 재생 시도");
          await video.play();
          console.log("자동 재생 성공");

          // 비디오 재생 중 텍스처 업데이트
          const updateTexture = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              videoTexture.needsUpdate = true;
              stageMaterial.needsUpdate = true;
              stagePlane.material.needsUpdate = true;
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

          // 클릭 시 메시지 제거 및 재생 시도
          const playVideo = async () => {
            try {
              await video.play();
              message.remove();
              document.removeEventListener("click", playVideo);
            } catch (error) {
              console.error("비디오 재생 실패:", error);
            }
          };
          document.addEventListener("click", playVideo);
        }
      } catch (error) {
        console.error("비디오 로드 실패:", error);
      }
    };

    loadVideo();

    // Stage 객체에 비디오 정보 저장
    stageGroup.userData.video = {
      type: "cloudinary",
      videoId: videoId,
      videoElement: video,
      texture: videoTexture,
      url: videoUrl,
    };

    // 씬 업데이트
    if (this.editor.signals?.sceneGraphChanged) {
      this.editor.signals.sceneGraphChanged.dispatch();
    }

    return stagePlane;
  }

  handleKeyDown(event) {
    if (event.key === "Delete" && this.selectedKeyframe) {
      this.deleteSelectedKeyframe();
    }
  }

  // 선택된 키프레임 삭제
  deleteSelectedKeyframe() {
    if (!this.selectedKeyframe) return;

    const { objectId, frame, element } = this.selectedKeyframe;
    const track = this.tracks.get(objectId);

    if (!track || !track.keyframes) return;

    // 키프레임 데이터 삭제
    track.keyframes.delete(frame);

    // DOM에서 키프레임 요소 제거
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }

    // 선택된 키프레임 초기화
    this.selectedKeyframe = null;

    // 속성 패널 업데이트
    this.updatePropertyPanel();

    // 씬 업데이트
    if (this.editor.signals?.sceneGraphChanged) {
      this.editor.signals.sceneGraphChanged.dispatch();
    }
  }

  // BaseTimeline의 추상 메서드 구현
  getPropertyValue(object, propertyType) {
    switch (propertyType) {
      case "position":
        return object.position.clone();
      case "rotation":
        return object.rotation.clone();
      default:
        return null;
    }
  }

  formatPropertyName(propertyType) {
    const names = {
      position: "Position",
      rotation: "Rotation",
    };
    return names[propertyType] || propertyType;
  }

  duplicateSprite(sourceSprite, track) {
    // 새로운 스프라이트 생성
    const newSprite = document.createElement("div");
    newSprite.className = "animation-sprite";
    newSprite.dataset.duration = sourceSprite.dataset.duration;

    // 원본 클립의 이름을 유지
    const originalName = sourceSprite.querySelector(".sprite-name").textContent;
    newSprite.innerHTML = `
      <div class="sprite-handle left"></div>
      <div class="sprite-content">
        <span class="sprite-name">${originalName}</span>
      </div>
      <div class="sprite-handle right"></div>
    `;

    // 위치와 크기 설정 (원본 클립 바로 다음에 위치)
    const sourceLeft = parseFloat(sourceSprite.style.left) || 0;
    const sourceWidth = parseFloat(sourceSprite.style.width) || 100;
    const newLeft = Math.min(100 - sourceWidth, sourceLeft + sourceWidth);

    newSprite.style.left = `${newLeft}%`;
    newSprite.style.width = `${sourceWidth}%`;

    // 키프레임 레이어 복제
    const sourceKeyframeLayer = sourceSprite.querySelector(".keyframe-layer");
    if (sourceKeyframeLayer) {
      const newKeyframeLayer = document.createElement("div");
      newKeyframeLayer.className = "keyframe-layer";
      newKeyframeLayer.style.position = "absolute";
      newKeyframeLayer.style.width = "100%";
      newKeyframeLayer.style.height = "100%";
      newKeyframeLayer.style.top = "0";
      newKeyframeLayer.style.left = "0";
      newKeyframeLayer.style.pointerEvents = "auto";
      newSprite.appendChild(newKeyframeLayer);

      // 키프레임 복제
      sourceKeyframeLayer
        .querySelectorAll(".keyframe")
        .forEach((sourceKeyframe) => {
          const newKeyframe = sourceKeyframe.cloneNode(true);

          // 복제된 키프레임의 선택 상태 제거
          newKeyframe.classList.remove("selected");

          newKeyframeLayer.appendChild(newKeyframe);

          // 키프레임 이벤트 다시 바인딩
          this.makeKeyframeDraggable(
            newKeyframe,
            track,
            parseInt(newKeyframe.dataset.frame),
            this.editor.scene.getObjectById(parseInt(track.objectId)),
          );

          newKeyframe.addEventListener("click", (e) => {
            e.stopPropagation();
            this.selectKeyframe(
              track.objectId,
              parseInt(newKeyframe.dataset.frame),
              newKeyframe,
            );
          });

          // 우클릭 메뉴 이벤트 바인딩
          newKeyframe.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showKeyframeContextMenu(
              e,
              track,
              parseInt(newKeyframe.dataset.frame),
              newKeyframe,
            );
          });
        });
    }

    // 트랙에 새 스프라이트 추가
    sourceSprite.parentElement.appendChild(newSprite);

    // 새 스프라이트에 이벤트 바인딩
    this.bindSpriteEvents(newSprite, track);

    // 키프레임 데이터 구조 복제
    if (track.keyframes) {
      const newKeyframes = { ...track.keyframes };
      Object.keys(newKeyframes).forEach((frame) => {
        if (newKeyframes[frame].element) {
          const newElement = newSprite.querySelector(
            `.keyframe[data-frame="${frame}"]`,
          );
          if (newElement) {
            newKeyframes[frame] = {
              ...newKeyframes[frame],
              element: newElement,
            };
          }
        }
      });
      track.keyframes = newKeyframes;
    }

    return newSprite;
  }

  // 클립 삭제 메서드 추가
  deleteSprite(sprite, track) {
    // 클립 내의 모든 키프레임 데이터 삭제
    const keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (keyframeLayer) {
      const keyframes = keyframeLayer.querySelectorAll(".keyframe");
      keyframes.forEach((keyframe) => {
        const frame = parseInt(keyframe.dataset.frame);
        if (track.keyframes && track.keyframes[frame]) {
          delete track.keyframes[frame];
        }
      });
    }

    // 선택된 클립이었다면 선택 해제
    if (sprite.classList.contains("selected")) {
      this.selectedSprite = null;
    }

    // DOM에서 클립 제거
    sprite.remove();

    // 씬 업데이트
    const object = this.editor.scene.getObjectById(parseInt(track.objectId));
    if (object && this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
  }
}
