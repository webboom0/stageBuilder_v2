// editor/timeline/MotionTimeline.js
import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";

export class MotionTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    console.log(this.options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.selectedKeyframe = null;
    this.selectedSprite = null;
    this.initMotionTracks();
    this.bindEvents();
    this.timeline = this.editor.scene.userData.timeline;

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
  /*
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
          positionKeyframe.value.z
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
*/
  // 키프레임 추가
  /*
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
    */

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
  /*
  createFrameMarkers() {
    return `<div class="keyframe-layer"></div>`;
  }
*/
  bindTrackEvents(track) {
    // 키프레임 추가 버튼
    const addBtn = track.element.querySelector(
      ".track-header .add-keyframe-btn"
    );
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentFrame = this.currentFrame;
        this.addKeyframe(track.objectId, currentFrame);
      });
    }

    // 이전/다음 키프레임 버튼 이벤트
    const prevKeyframeBtn = track.element.querySelector(".prev-keyframe-btn");
    const nextKeyframeBtn = track.element.querySelector(".next-keyframe-btn");

    if (prevKeyframeBtn) {
      prevKeyframeBtn.addEventListener("click", (e) => {
        console.log("prev button clicked");
        console.log(track.element);
        e.stopPropagation();
        // track.element를 직접 사용
        this.moveToAdjacentKeyframe(track.element, "prev");
      });
    }

    if (nextKeyframeBtn) {
      nextKeyframeBtn.addEventListener("click", (e) => {
        console.log("next button clicked");
        console.log(track.element);
        e.stopPropagation();
        // track.element를 직접 사용
        this.moveToAdjacentKeyframe(track.element, "next");
      });
    }
  }

  addPropertyTrack(trackElement, propertyType) {
    console.log(trackElement);
    const propertiesContainer = trackElement.querySelector(".property-tracks");

    // 이미 존재하는 속성인지 확인
    if (
      propertiesContainer.querySelector(
        `.property-track[data-property="${propertyType}"]`
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
          frame
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
        frame
      );
    });
  }

  addKeyframe(objectId, propertyType, frame) {
    const track = this.tracks.get(objectId);
    if (!track) {
      console.warn("addKeyframe: track이 undefined입니다.");
      return;
    }

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    // 현재 선택된 클립 확인
    const selectedSprite = track.element.querySelector(
      ".animation-sprite.selected"
    );
    if (!selectedSprite) {
      console.warn("선택된 클립이 없습니다.");
      return;
    }

    // // 현재 선택된 클립 또는 첫 번째 클립 사용
    // const selectedSprite = track.element.querySelector(
    //   ".animation-sprite.selected"
    // );
    const sprite =
      selectedSprite || track.element.querySelector(".animation-sprite");

    // if (!sprite) {
    //   console.warn("클립을 찾을 수 없습니다.");
    //   return;
    // }

    // timeline-tracks와 playhead 요소 가져오기
    const timelineTracks = document.querySelector(".timeline-track");
    const playhead = document.querySelector(".playhead");

    if (!timelineTracks) {
      console.warn("timeline-tracks 또는 playhead를 찾을 수 없습니다.");
      return;
    }

    // playhead의 상대적 위치 계산 (timeline-tracks 기준)
    const timelineRect = timelineTracks.getBoundingClientRect();
    const playheadRect = playhead.getBoundingClientRect();
    const spriteRect = sprite.getBoundingClientRect();

    // playhead가 클립 영역 내에 있는지 체크
    if (
      playheadRect.left < spriteRect.left ||
      playheadRect.left > spriteRect.right
    ) {
      console.warn("클립 영역을 벗어났습니다.");
      return;
    }

    // playhead의 위치를 클립 기준으로 변환
    const relativePlayheadPosition = playheadRect.left - spriteRect.left;

    // 클립 내 시간 계산
    const spriteWidth = spriteRect.width;
    const clipDuration = parseFloat(sprite.dataset.duration) || 0;
    const timeInSeconds =
      (relativePlayheadPosition / spriteWidth) * clipDuration;

    // 클립의 currentFrame을 초 단위로 변환하여 time 값 설정
    const relativeTime =
      parseFloat(this.editor.scene.userData.timeline.currentSeconds) || 0;
    // const relativeTime = currentFrame / this.options.framesPerSecond;
    console.log("timeInSeconds");
    console.log(timeInSeconds);

    // 키프레임 요소 생성
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${relativePlayheadPosition}px`;
    console.log(this.editor.scene.userData.timeline.currentSeconds);
    keyframeElement.dataset.time = timeInSeconds.toString();
    keyframeElement.dataset.pixelPosition = relativePlayheadPosition.toString();

    // 현재 객체의 position 정보 저장
    const position = [
      object.position.x.toFixed(3),
      object.position.y.toFixed(3),
      object.position.z.toFixed(3),
    ];
    keyframeElement.dataset.position = JSON.stringify(position);

    // 위치 설정
    keyframeElement.style.left = `${keyframeElement.dataset.pixelPosition}px`;

    // 클릭 이벤트 추가
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectKeyframe(objectId, frame, keyframeElement);
    });

    // keyframe-layer 찾기 또는 생성
    let keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (!keyframeLayer) {
      keyframeLayer = document.createElement("div");
      keyframeLayer.className = "keyframe-layer";
      sprite.appendChild(keyframeLayer);
    }

    // 키프레임을 keyframe-layer에 추가
    keyframeLayer.appendChild(keyframeElement);

    // 드래그 기능 추가
    this.makeKeyframeDraggable(keyframeElement, track, frame, object);

    // 애니메이션 즉시 업데이트
    this.updateAnimation(objectId);

    // 추가된 키프레임 자동 선택
    this.selectKeyframe(objectId, frame, keyframeElement);

    return keyframeElement;
  }

  makeKeyframeDraggable(keyframeElement, track, frame, object) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;

    keyframeElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseFloat(keyframeElement.style.left) || 0;
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // 부모 요소(클립)의 너비를 기준으로 계산
      const clipElement = keyframeElement.closest(".animation-sprite");
      if (!clipElement) return;

      const clipWidth = clipElement.offsetWidth;
      const clipDuration = parseFloat(clipElement.dataset.duration); // 클립의 총 시간(초)

      // 새로운 위치 계산 (픽셀)
      const newLeft = Math.max(0, Math.min(clipWidth, startLeft + dx));

      // 시간을 초 단위로 정확하게 계산
      const newTimeInSeconds = (newLeft / clipWidth) * clipDuration;

      // 수직 드래그로 삭제 체크
      const deleteThreshold = 50;
      if (dy > deleteThreshold) {
        keyframeElement.remove();
        if (track && track.keyframes) {
          delete track.keyframes[frame];
        }
        isDragging = false;
        return;
      }

      // 키프레임 위치와 시간 업데이트
      keyframeElement.style.left = `${newLeft}px`;
      keyframeElement.dataset.time = newTimeInSeconds.toFixed(2);
      keyframeElement.dataset.pixelPosition = newLeft.toString();

      console.log("키프레임 드래그:", {
        위치_픽셀: newLeft,
        시간_초: newTimeInSeconds,
        클립_길이: clipDuration,
        position: keyframeElement.dataset.position,
      });

      // 트랙 데이터 업데이트
      if (track.keyframes) {
        const keyframeData = track.keyframes[frame];
        if (keyframeData) {
          keyframeData.time = newTimeInSeconds;
        }
      }

      // 에디터에 변경 알림
      if (this.editor.signals?.timelineKeyframeChanged) {
        this.editor.signals.timelineKeyframeChanged.dispatch({
          track,
          frame,
          time: newTimeInSeconds,
        });
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

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

    // 클립의 시작 시간 가져오기
    const clipElement = track.element?.querySelector(".animation-sprite");
    if (!clipElement) return;

    const clipStartTime = parseFloat(clipElement.dataset.startTime || "0");
    const currentRelativeTime = this.currentTime - clipStartTime; // 클립 기준 상대 시간

    // position 키프레임 처리
    if (track.keyframes.position) {
      const keyframes = Array.from(track.keyframes.position.entries()).sort(
        ([a], [b]) => parseFloat(a) - parseFloat(b)
      );

      let prevKeyframe = null;
      let nextKeyframe = null;

      // 현재 상대 시간에 해당하는 키프레임 찾기
      for (let i = 0; i < keyframes.length; i++) {
        const [frame, data] = keyframes[i];
        if (data.time <= currentRelativeTime) {
          prevKeyframe = { frame: parseInt(frame), data };
        } else {
          nextKeyframe = { frame: parseInt(frame), data };
          break;
        }
      }

      // 보간 처리
      if (prevKeyframe && nextKeyframe) {
        const alpha =
          (currentRelativeTime - prevKeyframe.data.time) /
          (nextKeyframe.data.time - prevKeyframe.data.time);

        object.position.set(
          this.lerp(
            prevKeyframe.data.value.x,
            nextKeyframe.data.value.x,
            alpha
          ),
          this.lerp(
            prevKeyframe.data.value.y,
            nextKeyframe.data.value.y,
            alpha
          ),
          this.lerp(prevKeyframe.data.value.z, nextKeyframe.data.value.z, alpha)
        );
      } else if (prevKeyframe) {
        // 마지막 키프레임의 값 유지
        object.position.set(
          prevKeyframe.data.value.x,
          prevKeyframe.data.value.y,
          prevKeyframe.data.value.z
        );
      }
    }

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

    // propertyType이 'position'인 경우의 키프레임 데이터 가져오기
    const keyframeData = track.keyframes["position"]?.get(frame.toString());
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
      trackKeyframes: track.keyframes,
    });

    // 속성 패널 업데이트
    this.updatePropertyPanel();
  }

  // 프레임 업데이트 시 호출되는 메서드
  updateFrame(frame) {
    const currentTime = frame / this.options.framesPerSecond;

    this.tracks.forEach((track, objectId) => {
      const object = this.editor.scene.getObjectById(parseInt(objectId));
      if (!object) return;

      // 기본적으로 객체를 숨김
      object.visible = false;

      const clips = track.element.querySelectorAll(".animation-sprite");
      clips.forEach((clip) => {
        const clipLeft = parseFloat(clip.style.left) || 0;
        const clipWidth = parseFloat(clip.style.width) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const clipEndTime =
          clipStartTime + (clipWidth / 100) * this.options.totalSeconds;

        if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
          object.visible = true;
          let hasChanges = false;

          ["position"].forEach((propertyType) => {
            const keyframes = track.keyframes[propertyType];
            if (!keyframes || keyframes.size === 0) return;

            const keyframeArray = Array.from(keyframes.entries())
              .map(([frame, data]) => ({
                frame: parseInt(frame),
                time: data.time,
                value: data.value,
              }))
              .sort((a, b) => a.time - b.time);

            let prevKeyframe = null;
            let nextKeyframe = null;

            for (let i = 0; i < keyframeArray.length; i++) {
              if (keyframeArray[i].time <= currentTime) {
                prevKeyframe = keyframeArray[i];
              } else {
                nextKeyframe = keyframeArray[i];
                break;
              }
            }

            if (prevKeyframe && nextKeyframe) {
              const alpha =
                (currentTime - prevKeyframe.time) /
                (nextKeyframe.time - prevKeyframe.time);
              this.interpolateProperty(
                object,
                propertyType,
                prevKeyframe,
                nextKeyframe,
                alpha
              );
              hasChanges = true;
            } else if (prevKeyframe) {
              this.setPropertyValue(object, propertyType, prevKeyframe.value);
              hasChanges = true;
            }
          });

          if (hasChanges && this.editor.signals?.objectChanged) {
            this.editor.signals.objectChanged.dispatch(object);
          }
        }
      });
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
        parseInt(this.selectedKeyframe.objectId)
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
        parseInt(this.selectedKeyframe.objectId)
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
        parseInt(this.selectedKeyframe.objectId)
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
      parseInt(this.selectedKeyframe.objectId)
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
    if (!this.selectedKeyframe?.data?.value || !this.propertyPanel) {
      console.warn("No valid position data or property panel", {
        selectedKeyframe: this.selectedKeyframe,
        propertyPanel: this.propertyPanel,
      });
      return;
    }

    const position = this.selectedKeyframe.data.value;
    console.log("Updating property panel with position:", position);

    // DOM 요소 직접 접근
    const xInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="x"]'
    );
    const yInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="y"]'
    );
    const zInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="z"]'
    );

    if (xInput) xInput.value = position.x;
    if (yInput) yInput.value = position.y;
    if (zInput) zInput.value = position.z;
  }

  addTrack(objectUuid, objectId, objectName) {
    console.log("addTrack", objectUuid, objectId, objectName);
    if (this.tracks.has(objectId)) return;

    // 1. 메인 트랙 컨테이너 생성
    const track = {
      element: document.createElement("div"),
      keyframes: new Map(),
      objectId: objectId,
      objectName: objectName,
      objectUuid: objectUuid,
    };
    track.element.className = "timeline-track";
    track.element.dataset.objectId = objectId;

    // 2. 트랙 상단 영역 생성 (헤더 + 컨텐츠)
    const trackTopArea = document.createElement("div");
    trackTopArea.className = "motion-tracks";

    // UUID와 objectId 저장
    trackTopArea.dataset.uuid = objectUuid;
    trackTopArea.dataset.objectId = objectId;
    trackTopArea.dataset.objectName = objectName;

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
        <button class="prev-keyframe-btn" title="Previous Keyframe"><i class="fa fa-step-backward"></i></button>
        <button class="add-keyframe-btn" title="Add Keyframe">+</button>
        <button class="next-keyframe-btn" title="Next Keyframe"><i class="fa fa-step-forward"></i></button>
      </div>
    `;
    trackTopArea.appendChild(trackHeader);

    // 2-2. 애니메이션 스프라이트 생성
    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (object && object.animations) {
      const animationDuration = object.animations[0]?.duration || 0;
      const totalFrames = Math.floor(
        animationDuration * this.options.framesPerSecond
      );

      const trackContent = document.createElement("div");
      trackContent.className = "track-content";

      const sprite = document.createElement("div");
      sprite.className = "animation-sprite selected";
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
          // this.addKeyframe(objectId, "rotation", currentFrame);
        }
      }
      // 이전 키프레임 버튼
      if (
        e.target.classList.contains("prev-keyframe-btn") ||
        e.target.closest(".prev-keyframe-btn")
      ) {
        const track = e.target.closest(".timeline-track");
        if (track) {
          this.moveToAdjacentKeyframe(track, "prev");
        }
      }

      // 다음 키프레임 버튼
      if (
        e.target.classList.contains("next-keyframe-btn") ||
        e.target.closest(".next-keyframe-btn")
      ) {
        const track = e.target.closest(".timeline-track");
        if (track) {
          this.moveToAdjacentKeyframe(track, "next");
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
        let prevKeyframe = null;
        let nextKeyframe = null;

        keyframes.forEach((keyframe, frame) => {
          if (frame <= this.currentFrame) {
            prevKeyframe = keyframe;
          }
          if (
            frame > this.currentFrame &&
            (nextKeyframe === null || frame < nextKeyframe.frame)
          ) {
            nextKeyframe = keyframe;
          }
        });

        // 보간 적용
        if (prevKeyframe && nextKeyframe) {
          const t =
            (this.currentFrame - prevKeyframe.frame) /
            (nextKeyframe.frame - prevKeyframe.frame);
          this.interpolateProperty(
            object,
            propertyType,
            prevKeyframe,
            nextKeyframe,
            t
          );
        } else if (prevKeyframe) {
          this.setPropertyValue(object, propertyType, prevKeyframe.value);
        } else if (nextKeyframe) {
          this.setPropertyValue(object, propertyType, nextKeyframe.value);
        }
      });
    });
  }

  interpolateProperty(object, propertyType, startKeyframe, endKeyframe, t) {
    switch (propertyType) {
      case "position":
        object.position.lerpVectors(startKeyframe.value, endKeyframe.value, t);
        break;
      case "rotation":
        object.rotation.x = this.lerp(
          startKeyframe.value.x,
          endKeyframe.value.x,
          t
        );
        object.rotation.y = this.lerp(
          startKeyframe.value.y,
          endKeyframe.value.y,
          t
        );
        object.rotation.z = this.lerp(
          startKeyframe.value.z,
          endKeyframe.value.z,
          t
        );
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

    // 우클릭 메뉴
    sprite.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 클립 개수 확인
      const clipCount = sprite.parentElement
        ? sprite.parentElement.querySelectorAll(".animation-sprite").length
        : 0;

      // 기존 메뉴 제거
      const existingMenu = document.querySelector(".context-menu");
      if (existingMenu) {
        existingMenu.remove();
      }

      // 메뉴 생성
      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.style.position = "absolute";
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.style.zIndex = "1000";

      // 복제 버튼
      const duplicateBtn = document.createElement("button");
      duplicateBtn.textContent = "클립 복제";
      duplicateBtn.onclick = () => {
        this.duplicateClip(sprite, track);
        menu.remove();
      };

      // 삭제 버튼 (클립이 2개 이상일 때만 표시)
      if (clipCount > 1) {
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "클립 삭제";
        deleteBtn.onclick = () => {
          sprite.remove();
          menu.remove();
        };
        menu.appendChild(deleteBtn);
      }

      menu.appendChild(duplicateBtn);
      document.body.appendChild(menu);

      // 메뉴 외부 클릭시 닫기
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      document.addEventListener("click", closeMenu);
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging && !isResizing) return;

      const dx = e.clientX - startX;
      const parentWidth = sprite.parentElement.offsetWidth;
      const deltaPercent = (dx / parentWidth) * 100;

      if (isResizing) {
        if (resizeHandle.classList.contains("left")) {
          const newLeft = Math.max(
            0,
            Math.min(startLeft + deltaPercent, startLeft + startWidth - 10)
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
            Math.min(startWidth + deltaPercent, 100 - startLeft)
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
          Math.min(100 - startWidth, startLeft + deltaPercent)
        );
        if (!this.checkClipCollision(sprite, newLeft, startWidth)) {
          // 클립 위치 업데이트
          sprite.style.left = `${newLeft}%`;

          // 클립 내의 모든 .keyframe 요소 찾기
          // const keyframeElements = sprite.querySelectorAll(".keyframe");

          // 각 키프레임의 time을 타임라인 기준 위치로 업데이트
          // keyframeElements.forEach((keyframe) => {
          //   const keyframeLeft = parseFloat(keyframe.style.left);
          //   const timelinePosition =
          //     ((newLeft + (keyframeLeft / 100) * startWidth) / 100) *
          //     this.options.totalSeconds;
          //   keyframe.dataset.time = timelinePosition.toFixed(2);
          // });

          // UI 업데이트
          this.updateKeyframesInClip(track, sprite);
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        if (track.objectId) {
          this.updateAnimation(track.objectId);
        }
      }
    });

    // 클립 선택 이벤트만 추가
    sprite.addEventListener("click", (e) => {
      e.stopPropagation();

      // 이전 선택된 클립의 선택 해제
      const previousSelected = this.container.querySelector(
        ".animation-sprite.selected"
      );
      if (previousSelected) {
        previousSelected.classList.remove("selected");
      }

      // 현재 클립 선택
      sprite.classList.add("selected");
      this.selectedSprite = sprite;

      // 연결된 FBX 객체 선택
      const trackElement = sprite.closest(".motion-tracks");
      if (trackElement && trackElement.dataset.uuid) {
        this.editor.scene.traverse((object) => {
          if (object.uuid === trackElement.dataset.uuid) {
            this.editor.select(object);
          }
        });
      }
    });
  }

  // 클립 충돌 체크 메서드 추가
  checkClipCollision(currentSprite, newLeft, newWidth) {
    const clips = Array.from(
      currentSprite.parentElement.querySelectorAll(".animation-sprite")
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
          `키프레임 삭제: position ${pixelPosition}px가 클립 범위(0-${spriteWidth}px)를 벗어남`
        );
        return;
      }

      // 범위 내의 키프레임은 프레임 값 업데이트
      const frame = Math.round(
        (pixelPosition / spriteWidth) *
          this.options.totalSeconds *
          this.options.framesPerSecond
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
      (child) => child.name === "Stage"
    );

    if (!stageGroup) {
      console.log("Stage 그룹 생성");
      stageGroup = new THREE.Group();
      stageGroup.name = "Stage";
      this.editor.scene.add(stageGroup);
    }

    // 기존 배경 제거
    const existingBackground = stageGroup.children.find(
      (child) => child.name === "_VideoBackground"
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

  duplicateClip(sourceClip, track) {
    // 원본 클립의 위치와 크기 가져오기
    // const originalLeft = parseFloat(sourceClip.style.left) || 0;
    // const originalWidth = parseFloat(sourceClip.style.width) || 100;

    // 새로운 클립 생성
    // const newSprite = sprite.cloneNode(true);
    const newClip = document.createElement("div");
    newClip.className = "animation-sprite";
    newClip.dataset.duration = sourceClip.dataset.duration;

    // 원본 클립의 이름을 유지하되, 키프레임 레이어는 비워둠
    const originalName = sourceClip.querySelector(".sprite-name").textContent;
    newClip.innerHTML = `
    <div class="sprite-handle left"></div>
    <div class="sprite-content">
      <span class="sprite-name">${originalName}</span>
      <div class="keyframe-layer"></div>
    </div>
    <div class="sprite-handle right"></div>
  `;

    // 새 클립의 위치를 원본 바로 다음으로 설정
    // const newLeft = Math.min(100 - originalWidth, originalLeft + originalWidth);
    // newClip.style.left = `${newLeft}%`;

    // 위치와 크기 설정
    const sourceLeft = parseFloat(sourceClip.style.left) || 0;
    const sourceWidth = parseFloat(sourceClip.style.width) || 100;
    const newLeft = Math.min(100 - sourceWidth, sourceLeft + sourceWidth);

    newClip.style.left = `${newLeft}%`;
    newClip.style.width = `${sourceWidth}%`;

    // 새 클립의 키프레임들 처리
    // const newKeyframes = newSprite.querySelectorAll(".keyframe");
    // const timeOffset =
    //   ((newLeft - originalLeft) / 100) * this.options.totalSeconds;

    // newKeyframes.forEach((keyframe) => {
    //   // 기존 이벤트 리스너 제거를 위해 새로운 요소로 교체
    //   const newKeyframe = keyframe.cloneNode(true);

    //   // 키프레임의 위치와 시간 조정
    //   const currentLeft = parseFloat(newKeyframe.style.left) || 0;
    //   const currentTime = parseFloat(newKeyframe.dataset.time) || 0;

    //   newKeyframe.style.left = `${currentLeft}%`;
    //   newKeyframe.dataset.time = (currentTime + timeOffset).toFixed(2);

    //   // 클릭 이벤트 추가
    //   newKeyframe.addEventListener("click", (e) => {
    //     e.stopPropagation();
    //     this.selectKeyframe(
    //       track.objectId,
    //       newKeyframe.dataset.time,
    //       newKeyframe
    //     );
    //   });

    //   // 우클릭 메뉴 추가
    //   newKeyframe.addEventListener("contextmenu", (e) => {
    //     e.preventDefault();
    //     e.stopPropagation();

    //     const menu = document.createElement("div");
    //     menu.className = "context-menu";
    //     menu.style.position = "absolute";
    //     menu.style.left = `${e.clientX}px`;
    //     menu.style.top = `${e.clientY}px`;
    //     menu.style.zIndex = "1000";

    //     const deleteBtn = document.createElement("button");
    //     deleteBtn.textContent = "키프레임 삭제";
    //     deleteBtn.onclick = () => {
    //       newKeyframe.remove();
    //       menu.remove();
    //       this.updateAnimation(track.objectId);
    //     };

    //     menu.appendChild(deleteBtn);
    //     document.body.appendChild(menu);

    //     const closeMenu = (e) => {
    //       if (!menu.contains(e.target)) {
    //         menu.remove();
    //         document.removeEventListener("click", closeMenu);
    //       }
    //     };
    //     document.addEventListener("click", closeMenu);
    //   });

    //   // 드래그 기능 추가
    //   this.makeKeyframeDraggable(
    //     newKeyframe,
    //     track,
    //     this.currentTime,
    //     track.objectId
    //   );

    //   keyframe.parentNode.replaceChild(newKeyframe, keyframe);
    // });

    // 새 클립에 이벤트 바인딩
    this.bindSpriteEvents(newClip, track);

    // 새 클립을 트랙에 추가
    sourceClip.parentElement.appendChild(newClip);

    return newClip;
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

  // 인접한 키프레임으로 이동하는 함수 추가
  moveToAdjacentKeyframe(trackElement, direction) {
    // 현재 선택된 키프레임 찾기
    const selectedKeyframe = trackElement.querySelector(".keyframe.selected");
    if (!selectedKeyframe) {
      console.log("No keyframe selected");
      return;
    }

    // 현재 트랙의 모든 키프레임 요소들을 가져옴
    const keyframeElements = Array.from(
      trackElement.querySelectorAll(".keyframe")
    );

    // 프레임 번호를 기준으로 정렬
    const sortedKeyframes = keyframeElements.sort((a, b) => {
      return parseInt(a.dataset.frame) - parseInt(b.dataset.frame);
    });

    // 현재 선택된 키프레임의 인덱스 찾기
    const currentIndex = sortedKeyframes.indexOf(selectedKeyframe);

    if (direction === "prev" && currentIndex > 0) {
      // 이전 키프레임 선택
      const prevKeyframe = sortedKeyframes[currentIndex - 1];
      selectedKeyframe.classList.remove("selected");
      prevKeyframe.classList.add("selected");
      this.selectedKeyframe = prevKeyframe;
    } else if (
      direction === "next" &&
      currentIndex < sortedKeyframes.length - 1
    ) {
      // 다음 키프레임 선택
      const nextKeyframe = sortedKeyframes[currentIndex + 1];
      selectedKeyframe.classList.remove("selected");
      nextKeyframe.classList.add("selected");
      this.selectedKeyframe = nextKeyframe;
    }
  }
}
