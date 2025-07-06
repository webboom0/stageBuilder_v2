import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";
import { INTERPOLATION } from './TimelineCore.js';
import { TimelineData, TrackData } from './TimelineCore.js';

export class MotionTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.selectedKeyframe = null;
    this.selectedSprite = null;
    this.mixers = new Map(); // FBX 애니메이션 mixer 저장
    this.timelineData = new TimelineData();
    this.tracks = new Map();  // Map<objectId, Track>
    this.tracksByUuid = new Map();  // Map<uuid, Track>
    this.initMotionTracks();
    this.bindEvents();
    this.timeline = this.editor.scene.userData.timeline || {};
    // 속성 편집 패널 생성
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);
    document
      .querySelector("#keyframe-property-panel")
      .appendChild(this.propertyPanel.dom);

    // Stage 그룹 설정
    let stageGroup = this.editor.scene.children.find(
      (child) => child.name === "Stage"
    );

    if (!stageGroup) {
      stageGroup = new THREE.Group();
      stageGroup.name = "Stage";
      this.editor.scene.add(stageGroup);
    }

    // this.createVideoBackground(stageGroup);
    this.initMixers();
  }

  initMotionTracks() {
    // 기존 tracks 데이터를 새로운 구조로 변환
    if (this.tracks) {
      this.tracks.forEach((track, objectId) => {
        if (track.keyframes) {
          Object.entries(track.keyframes).forEach(([property, keyframes]) => {
            keyframes.forEach((keyframe, frame) => {
              const time = frame / this.options.framesPerSecond;
              this.timelineData.addTrack(objectId, property).addKeyframe(
                time,
                keyframe.value,
                INTERPOLATION.LINEAR
              );
            });
          });
        }
      });
    }
  }

  initMixers() {
    this.editor.scene.traverse((object) => {
      if (object.animations && object.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(object);
        this.mixers.set(object.uuid, mixer);
        // 순환 참조 방지를 위해 userData에 저장하지 않음
        // object.userData.mixer = mixer;
      }
    });
  }

  bindEvents() {
    this.container.addEventListener("click", (e) => {
      const track = e.target.closest(".timeline-track");
      if (!track) return;

      const objectId = track.dataset.objectId;
      const objectUuid = track.dataset.uuid;

      if (e.target.classList.contains("add-keyframe-btn")) {
        const sprite = track.querySelector('.animation-sprite.selected');
        if (!sprite) {
          console.warn("선택된 스프라이트가 없습니다.");
          return;
        }

        // playhead 위치 찾기
        const playhead = document.querySelector(".playhead");
        if (!playhead) {
          console.warn("플레이헤드를 찾을 수 없습니다.");
          return;
        }

        const playheadRect = playhead.getBoundingClientRect();
        const spriteRect = sprite.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();

        // playhead가 클립 범위 내에 있는지 확인
        if (playheadRect.left < spriteRect.left || playheadRect.left > spriteRect.right) {
          console.warn("Playhead가 클립 범위 밖에 있습니다.");
          return;
        }

        // 클립 내에서의 상대적 위치 계산
        const relativePlayheadPosition = playheadRect.left - spriteRect.left;
        const spriteWidth = spriteRect.width;
        const clipDuration = parseFloat(sprite.dataset.duration) || 0;
        const relativeTimeInSeconds = (relativePlayheadPosition / spriteWidth) * clipDuration;

        // 클립 시작 시간을 포함한 절대 시간 계산
        const clipLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const timeInSeconds = clipStartTime + relativeTimeInSeconds;

        // 현재 선택된 객체 가져오기
        const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
        if (!object) {
          console.warn("객체를 찾을 수 없습니다:", objectUuid);
          return;
        }

        // 현재 객체의 position 값 가져오기
        const position = new THREE.Vector3(
          object.position.x,
          object.position.y,
          object.position.z
        );

        console.log("키프레임 추가 시도:", {
          objectUuid,
          timeInSeconds,
          position,
          playheadPosition: {
            relative: relativePlayheadPosition,
            spriteWidth,
            clipDuration
          }
        });

        // TimelineData에 키프레임 추가
        if (!this.timelineData) {
          console.error("TimelineData가 초기화되지 않았습니다.");
          return;
        }

        const trackData = this.timelineData.addTrack(objectUuid, 'position');
        if (!trackData) {
          console.error("트랙을 생성할 수 없습니다:", objectUuid);
          return;
        }

        // 키프레임 추가
        if (!trackData.addKeyframe(timeInSeconds, position)) {
          console.error("키프레임 추가 실패:", {
            objectUuid,
            timeInSeconds,
            position
          });
          return;
        }

        // 최대 시간 업데이트 (여유분 추가)
        const safetyMargin = 1.2; // 20% 여유분
        const adjustedTime = timeInSeconds * safetyMargin;
        this.timelineData.updateMaxTime(adjustedTime);

        console.log("키프레임 추가 후 시간 정보:", {
          originalTime: timeInSeconds,
          adjustedTime: adjustedTime,
          currentMaxTime: this.timelineData.maxTime
        });

        // 키프레임 요소 생성
        const keyframeElement = document.createElement("div");
        keyframeElement.className = "keyframe";
        keyframeElement.dataset.time = timeInSeconds.toString();
        keyframeElement.dataset.position = JSON.stringify(position);

        // 키프레임 위치 계산 (스프라이트 내에서의 상대적 위치)
        const keyframeLeft = (relativePlayheadPosition / spriteWidth) * 100;
        keyframeElement.style.left = `${keyframeLeft}%`;

        // 키프레임 레이어 찾기 또는 생성
        let keyframeLayer = sprite.querySelector(".keyframe-layer");
        if (!keyframeLayer) {
          keyframeLayer = document.createElement("div");
          keyframeLayer.className = "keyframe-layer";
          sprite.appendChild(keyframeLayer);
        }

        // 키프레임 추가
        keyframeLayer.appendChild(keyframeElement);

        // 키프레임 데이터 저장
        const trackInfo = this.tracksByUuid.get(objectUuid);  // UUID로 트랙 검색
        if (!trackInfo) {
          console.warn("트랙 정보를 찾을 수 없습니다:", objectUuid);
          return;
        }

        // position 키프레임 Map이 없으면 초기화
        if (!trackInfo.keyframes.has('position')) {
          trackInfo.keyframes.set('position', new Map());
        }

        const keyframeData = {
          time: timeInSeconds,
          value: position,
          left: keyframeLeft // 키프레임의 상대적 위치 저장
        };

        const positionMap = trackInfo.keyframes.get('position');
        positionMap.set(timeInSeconds.toString(), keyframeData);

        // 키프레임 드래그 가능하게 만들기
        this.makeKeyframeDraggable(keyframeElement, trackInfo, timeInSeconds, 'position');

        // 키프레임 선택
        console.log("selectKeyframe3333", {
          objectId,
          timeInSeconds,
          keyframeElement
        });
        this.selectKeyframe(objectId, timeInSeconds, keyframeElement);

        // 애니메이션 업데이트
        this.timelineData.dirty = true;
        this.timelineData.precomputeAnimationData();
        this.updateAnimation();

        console.log("키프레임이 추가되었습니다:", {
          trackInfo,
          timeInSeconds,
          position,
          keyframeLeft,
          keyframes: trackInfo.keyframes
        });
      } else if (
        e.target.classList.contains("prev-keyframe-btn") ||
        e.target.closest(".prev-keyframe-btn")
      ) {
        this.moveToAdjacentKeyframe(track, "prev");
      } else if (
        e.target.classList.contains("next-keyframe-btn") ||
        e.target.closest(".next-keyframe-btn")
      ) {
        this.moveToAdjacentKeyframe(track, "next");
      }
    });
  }

  addKeyframe(trackUuid, propertyType, timeInSeconds, value) {
    // TimelineData를 통해 키프레임 추가
    console.log("addKeyframe");
    console.log(trackUuid);
    console.log(propertyType);
    console.log(timeInSeconds);
    console.log(value);
    console.log(this.timelineData.tracks);

    // 트랙이 없으면 키프레임 추가 실패
    let track = this.timelineData.tracks.get(trackUuid)?.get(propertyType);
    if (!track) {
      console.warn("트랙이 존재하지 않습니다:", { trackUuid, propertyType });
      return false;
    }

    // 키프레임 데이터 추가
    if (!track.addKeyframe(timeInSeconds, value)) {
      console.warn("키프레임 추가 실패:", { timeInSeconds, value });
      return false;
    }

    // 최대 시간 업데이트 (여유분 추가)
    const safetyMargin = 1.2; // 20% 여유분
    const adjustedTime = timeInSeconds * safetyMargin;
    this.timelineData.updateMaxTime(adjustedTime);

    console.log("키프레임 추가 후 시간 정보:", {
      originalTime: timeInSeconds,
      adjustedTime: adjustedTime,
      currentMaxTime: this.timelineData.maxTime
    });

    // UI 업데이트 - UUID로 트랙 검색
    const trackElement = this.tracksByUuid.get(trackUuid);
    if (!trackElement) {
      console.warn("트랙 엘리먼트를 찾을 수 없습니다:", trackUuid);
      return false;
    }

    // 선택된 스프라이트 찾기 - 더 안전한 방법으로 수정
    let sprite = trackElement.element.querySelector(".animation-sprite.selected");
    if (!sprite) {
      // 선택된 스프라이트가 없으면 첫 번째 스프라이트를 선택
      sprite = trackElement.element.querySelector(".animation-sprite");
      if (sprite) {
        // 기존 선택 해제
        const existingSelected = trackElement.element.querySelectorAll(".animation-sprite.selected");
        existingSelected.forEach(clip => clip.classList.remove("selected"));

        // 첫 번째 스프라이트 선택
        sprite.classList.add("selected");
        console.log("선택된 스프라이트가 없어서 첫 번째 스프라이트를 선택했습니다.");
      } else {
        console.warn("스프라이트를 찾을 수 없습니다");
        return false;
      }
    }

    const keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (!keyframeLayer) {
      console.warn("키프레임 레이어를 찾을 수 없습니다");
      return false;
    }

    // 기존 키프레임 UI 요소 제거
    const existingKeyframe = keyframeLayer.querySelector(`[data-time="${timeInSeconds}"]`);
    if (existingKeyframe) {
      existingKeyframe.remove();
    }

    // 새로운 키프레임 UI 요소 생성
    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.dataset.time = timeInSeconds.toString();
    keyframeElement.dataset.property = propertyType;
    keyframeElement.dataset.x = value.x.toString();
    keyframeElement.dataset.y = value.y.toString();
    keyframeElement.dataset.z = value.z.toString();
    keyframeElement.dataset.position = JSON.stringify([value.x, value.y, value.z]);

    // 키프레임 인덱스 설정
    const keyframeIndex = track.findKeyframeIndex(timeInSeconds);
    if (keyframeIndex !== -1) {
      keyframeElement.dataset.index = keyframeIndex.toString();
    }

    // 키프레임 위치 계산
    const clipDuration = parseFloat(sprite.dataset.duration) || 5;
    const clipLeft = parseFloat(sprite.style.left) || 0;
    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
    const relativeTime = timeInSeconds - clipStartTime;

    console.log("addKeyframe - 시간 계산:", {
      timeInSeconds,
      clipDuration,
      clipLeft,
      clipStartTime,
      relativeTime,
      spriteWidth: sprite.offsetWidth
    });

    // 클립 내에서의 상대적 위치를 픽셀로 계산
    const left = (relativeTime / clipDuration) * sprite.offsetWidth;

    console.log("키프레임 UI 위치:", left);

    keyframeElement.style.left = `${left}px`;
    keyframeElement.dataset.pixelPosition = left.toString();
    keyframeElement.dataset.value = JSON.stringify([value.x, value.y, value.z]);

    // 키프레임 레이어에 추가
    keyframeLayer.appendChild(keyframeElement);

    // 이벤트 바인딩 - 속성 키프레임용 드래그 이벤트 사용
    this.makePropertyKeyframeDraggable(keyframeElement, trackElement, propertyType);

    // 새로 추가된 키프레임 자동 선택
    console.log("selectKeyframe4444", {
      trackUuid,
      timeInSeconds,
      keyframeElement
    });
    this.selectKeyframe(trackUuid, timeInSeconds, keyframeElement);
    // this.selectKeyframe(track.uuid, dragStartTime, keyframeElement, dragStartIndex);

    // 애니메이션 업데이트
    this.timelineData.dirty = true;
    this.timelineData.precomputeAnimationData();
    this.updateAnimation();

    return true;
  }

  removeKeyframe(objectId, property, time) {
    const track = this.timelineData.tracks.get(objectId)?.get(property);
    if (track && track.removeKeyframe(time)) {
      this.updateUI();
      return true;
    }
    return false;
  }

  getKeyframeValue(object, propertyType) {
    if (!object) return null;

    switch (propertyType) {
      case "position":
        return new THREE.Vector3(object.position.x, object.position.y, object.position.z);
      case "rotation":
        return new THREE.Vector3(object.rotation.x, object.rotation.y, object.rotation.z);
      case "scale":
        return new THREE.Vector3(object.scale.x, object.scale.y, object.scale.z);
      default:
        return null;
    }
  }

  updateAnimation(time = null) {
    // 외부에서 시간이 전달되면 사용, 아니면 현재 시간 사용
    const currentTime = time !== null ? time : this.currentTime;

    console.log("=== MotionTimeline updateAnimation ===");
    console.log("현재 시간:", currentTime);
    console.log("TimelineData tracks:", this.timelineData.tracks);
    console.log("TimelineData maxTime:", this.timelineData.maxTime);
    console.log("TimelineData frameRate:", this.timelineData.frameRate);

    const precomputedData = this.timelineData.precomputedData;
    if (!precomputedData) {
      console.log("precomputedData가 없어서 생성합니다.");
      // 기존 트랙 데이터가 있는 경우에만 프리컴퓨트
      if (this.timelineData.tracks.size > 0) {
        this.timelineData.precomputeAnimationData();
      } else {
        console.log("트랙 데이터가 없어서 프리컴퓨트를 건너뜁니다.");
        return;
      }
    }

    // 키프레임 애니메이션 업데이트
    precomputedData.forEach((objectData, objectUuid) => {
      const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
      if (!object) {
        console.log("객체를 찾을 수 없습니다:", objectUuid);
        return;
      }

      // 해당 객체의 트랙 찾기
      const track = this.tracksByUuid.get(objectUuid);
      if (!track) {
        console.log("트랙을 찾을 수 없습니다:", objectUuid);
        return;
      }

      // 현재 시간에 해당하는 클립 찾기
      const sprites = track.element.querySelectorAll('.animation-sprite');
      let sprite = null;
      let isInAnyClip = false;

      for (const clip of sprites) {
        const clipLeft = parseFloat(clip.style.left) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const clipDuration = parseFloat(clip.dataset.duration) || 5;
        const clipEndTime = clipStartTime + clipDuration;

        if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
          sprite = clip;
          isInAnyClip = true;
          break;
        }
      }

      // 클립 범위에 따라 객체 가시성 제어
      if (!isInAnyClip) {
        // 현재 시간이 어떤 클립 범위에도 없으면 객체 숨김
        object.visible = false;
        console.log("객체 숨김:", object.name, objectUuid, "시간:", currentTime);
        return;
      } else {
        // 클립 범위 안에 있으면 객체 보임
        object.visible = true;
        console.log("객체 보임:", object.name, objectUuid, "시간:", currentTime);
      }

      if (!sprite) {
        console.log("현재 시간에 해당하는 클립을 찾을 수 없습니다:", objectUuid, "시간:", currentTime);
        return;
      }

      // 클립 요소 찾기
      // const sprite = track.element.querySelector('.animation-sprite');
      // if (!sprite) {
      //   console.log("클립을 찾을 수 없습니다:", objectUuid);
      //   return;
      // }

      // 클립의 시작 시간 계산
      const clipLeft = parseFloat(sprite.style.left) || 0;
      const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
      const clipDuration = parseFloat(sprite.dataset.duration) || 5;
      const clipEndTime = clipStartTime + clipDuration;

      // 현재 시간이 클립 범위 안에 있는지 확인
      if (currentTime < clipStartTime || currentTime > clipEndTime) {
        console.log("현재 시간이 클립 범위 밖입니다:", currentTime, "클립:", clipStartTime, "-", clipEndTime);
        return;
      }

      // 클립 기준의 상대 시간 계산
      const relativeTime = currentTime - clipStartTime;
      const frameIndex = Math.floor(relativeTime * this.timelineData.frameRate);

      console.log("객체 데이터 업데이트:", object.name, objectUuid);
      console.log("절대 시간:", currentTime, "프레임 인덱스:", frameIndex);
      console.log("클립 시작 시간:", clipStartTime, "(상대 시간 계산은 사용하지 않음)");

      objectData.forEach((frames, property) => {
        console.log(`=== ${property} 속성 프레임 정보 ===`);
        console.log(`프레임 배열 길이: ${frames.length / 3} (${frames.length} values)`);
        console.log(`계산된 프레임 인덱스: ${frameIndex}`);
        console.log(`maxTime 기준 최대 프레임: ${Math.floor(this.timelineData.maxTime * this.timelineData.frameRate)}`);

        // 안전한 프레임 인덱스 범위 체크
        if (frameIndex >= 0 && frameIndex < frames.length / 3) {
          const value = new THREE.Vector3(
            frames[frameIndex * 3],
            frames[frameIndex * 3 + 1],
            frames[frameIndex * 3 + 2]
          );
          console.log(`${property} 속성 업데이트:`, value);
          console.log(`프레임 인덱스: ${frameIndex}, 프레임 배열 길이: ${frames.length / 3}`);
          this.applyValue(object, property, value);
        } else {
          console.warn(`프레임 인덱스 ${frameIndex}가 범위를 벗어남. 프레임 배열 길이: ${frames.length / 3}`);

          // 범위를 벗어난 경우 가장 가까운 유효한 인덱스 사용
          let safeIndex = frameIndex;
          if (frameIndex < 0) {
            safeIndex = 0;
          } else if (frameIndex >= frames.length / 3) {
            safeIndex = Math.floor(frames.length / 3) - 1;
          }

          if (safeIndex >= 0 && safeIndex < frames.length / 3) {
            const fallbackValue = new THREE.Vector3(
              frames[safeIndex * 3],
              frames[safeIndex * 3 + 1],
              frames[safeIndex * 3 + 2]
            );
            console.log(`${property} 속성 폴백 업데이트 (인덱스 ${safeIndex}):`, fallbackValue);
            this.applyValue(object, property, fallbackValue);
          }
        }
      });
    });

    // FBX 애니메이션 업데이트 (재생 중일 때만)
    if (this.isPlaying) {
      this.mixers.forEach(mixer => {
        mixer.update(1 / this.timelineData.frameRate);
      });
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // 키프레임 변경사항이 있을 수 있으므로 TimelineData 강제 업데이트
    if (this.timelineData.dirty) {
      console.log("TimelineData가 dirty 상태입니다. precomputeAnimationData를 실행합니다.");
      this.timelineData.precomputeAnimationData();
    }

    // 현재 시간이 0이거나 totalSeconds보다 크면 0으로 리셋
    if (this.currentTime === 0 || this.currentTime >= this.options.totalSeconds) {
      this.currentTime = 0;
      console.log("currentTime을 0으로 리셋합니다.");
    }

    // 현재 시간에 맞춰 애니메이션 상태 업데이트
    this.updateAnimation(this.currentTime);

    // FBX 애니메이션 재생
    // this.mixers.forEach((mixer, uuid) => {
    //   const object = this.editor.scene.getObjectByProperty('uuid', uuid);
    //   if (!object || !object.animations || !object.animations.length) return;

    //   mixer.timeScale = 1;
    //   object.animations.forEach(clip => {
    //     const action = mixer.clipAction(clip);
    //     action.setLoop(THREE.LoopRepeat);
    //     action.clampWhenFinished = true;
    //     action.enabled = true;
    //     action.play();
    //   });
    //   object.visible = true;
    // });

    this.animate();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // FBX 애니메이션 일시정지
    this.mixers.forEach((mixer) => {
      mixer.timeScale = 0;
    });
  }

  stop() {
    if (!this.isPlaying && this.currentTime === 0) return;
    this.isPlaying = false;
    this.currentTime = 0;

    // FBX 애니메이션 정지
    this.mixers.forEach((mixer) => {
      mixer.stopAllAction();
      mixer.time = 0;
    });

    this.updateAnimation();
  }

  animate() {
    if (!this.isPlaying) return;
    console.log("animate");

    // Duration 디버깅 정보 추가
    console.log("=== Duration 정보 ===");
    console.log("totalSeconds (전체 duration):", this.options.totalSeconds);
    console.log("maxTime (키프레임 최대 시간):", this.timelineData.maxTime);
    console.log("currentTime (현재 시간):", this.currentTime);
    console.log("frameRate:", this.timelineData.frameRate);

    // 매 프레임마다 TimelineData의 dirty 상태 확인
    console.log("TimelineData dirty:", this.timelineData.dirty);
    if (this.timelineData.dirty) {
      console.log("animate()에서 TimelineData가 dirty 상태입니다. 업데이트합니다.");
      this.timelineData.precomputeAnimationData();
    }

    const deltaTime = 1 / this.timelineData.frameRate;
    this.currentTime += deltaTime;

    // 애니메이션 루프 처리 - 더 안전한 범위 체크
    const maxAllowedTime = Math.max(this.options.totalSeconds, this.timelineData.maxTime * 1.1);
    if (this.currentTime >= maxAllowedTime) {
      console.log("애니메이션 루프: currentTime이 최대 허용 시간에 도달함", {
        currentTime: this.currentTime,
        maxAllowedTime: maxAllowedTime,
        totalSeconds: this.options.totalSeconds,
        maxTime: this.timelineData.maxTime
      });
      this.currentTime = 0;

      // FBX 애니메이션 루프 처리
      // this.mixers.forEach((mixer, uuid) => {
      //   const object = this.editor.scene.getObjectByProperty('uuid', uuid);
      //   if (!object || !object.animations || !object.animations.length) return;

      //   // 모든 액션의 시간을 0으로 리셋
      //   mixer.clipActions.forEach(action => {
      //     if (action.isRunning()) {
      //       action.time = 0;
      //       action.enabled = true;
      //     }
      //   });
      //   mixer.time = 0;
      //   object.visible = true;
      // });
    }

    // // FBX 애니메이션 업데이트
    // this.mixers.forEach((mixer, uuid) => {
    //   const object = this.editor.scene.getObjectByProperty('uuid', uuid);
    //   if (!object || !object.animations || !object.animations.length) return;

    //   // 현재 시간에 맞춰 mixer 업데이트
    //   mixer.update(deltaTime);

    //   // 액션 상태 확인 및 업데이트
    //   mixer.clipActions.forEach(action => {
    //     if (action.isRunning()) {
    //       action.enabled = true;
    //       // 액션이 끝났는지 확인하고 필요시 재시작
    //       if (action.time >= action.getClip().duration) {
    //         action.time = 0;
    //       }
    //     }
    //   });
    //   object.visible = true;
    // });

    // 키프레임 애니메이션 업데이트
    this.tracksByUuid.forEach((track, uuid) => {
      if (track && track.uuid) {
        // updateAnimation(track.objectId); // 잘못된 호출 제거
      }
    });

    this.updateAnimation(); // 올바른 호출로 수정
    // this.updateUI(); // 애니메이션 재생 중에는 UI 업데이트 제거
    requestAnimationFrame(() => this.animate());
  }

  lerp(start, end, alpha) {
    return start + (end - start) * alpha;
  }

  selectKeyframe(objectId, time, keyframeElement, index = null) {
    console.log("selectKeyframe");
    console.log(objectId);
    console.log(time);
    console.log(keyframeElement);
    console.log("전달된 인덱스:", index);

    // 이전에 선택된 키프레임 제거
    const prevSelected = this.container.querySelector(".keyframe.selected");
    if (prevSelected) {
      prevSelected.classList.remove("selected");
    }

    // 새로운 키프레임 선택
    if (keyframeElement) {
      keyframeElement.classList.add("selected");
    }

    // 트랙과 속성 정보 가져오기 - objectId는 실제로 objectUuid
    const track = this.tracksByUuid.get(objectId);
    if (!track) {
      console.warn("트랙을 찾을 수 없습니다:", objectId);
      return;
    }

    const property = keyframeElement?.dataset.property;
    console.log("property");
    console.log(property);
    if (!property) {
      console.warn("속성 정보를 찾을 수 없습니다");
      return;
    }

    // 키프레임 데이터 가져오기
    const trackData = this.timelineData.tracks.get(objectId)?.get(property);
    console.log("trackData");
    console.log(trackData);
    if (!trackData) {
      console.warn("트랙 데이터를 찾을 수 없습니다:", { objectId, property });
      return;
    }

    // 인덱스 기반으로 키프레임 찾기
    let keyframeIndex = -1;
    if (index !== null && index >= 0 && index < trackData.keyframeCount) {
      // 전달된 인덱스 사용 (드래그 중)
      keyframeIndex = index;
    } else if (keyframeElement && keyframeElement.dataset.index) {
      // dataset.index 사용
      keyframeIndex = parseInt(keyframeElement.dataset.index);
    } else {
      // time으로 찾기 (하위 호환성)
      keyframeIndex = trackData.times.indexOf(time);
    }

    console.log("최종 인덱스:", keyframeIndex);
    if (keyframeIndex === -1 || keyframeIndex >= trackData.keyframeCount) {
      console.warn("키프레임을 찾을 수 없습니다:", { time, objectId, property, keyframeIndex });
      return;
    }

    // 키프레임 값 가져오기
    const value = {
      x: trackData.values[keyframeIndex * 3],
      y: trackData.values[keyframeIndex * 3 + 1],
      z: trackData.values[keyframeIndex * 3 + 2]
    };

    // 보간 방식 가져오기
    const interpolation = trackData.interpolations[keyframeIndex] || INTERPOLATION.LINEAR;

    // 선택된 키프레임 정보 저장
    this.selectedKeyframe = {
      objectId,
      index: keyframeIndex, // 인덱스 정보 추가
      time,
      property,
      value,
      interpolation,
      element: keyframeElement
    };

    // 속성 패널 업데이트
    this.updatePropertyPanel();
  }

  updateFrame(frame) {
    console.log("updateFrame");
    const currentTime = frame / this.options.framesPerSecond;

    // currentTime 업데이트
    this.currentTime = currentTime;

    // TimelineData를 사용하여 애니메이션 업데이트
    this.updateAnimation(currentTime);

    // 기존 로직도 유지 (하위 호환성)
    this.tracks.forEach((track, objectId) => {
      console.log("track");
      console.log(track);
      console.log("objectId");
      console.log(objectId);

      const object = this.editor.scene.getObjectById(parseInt(objectId));
      if (!object) {
        console.warn('객체를 찾을 수 없습니다:', objectId);
        return;
      }

      // 기본적으로 객체를 숨김
      object.visible = false;

      const clips = track.element.querySelectorAll(".animation-sprite");
      if (!clips || clips.length === 0) {
        console.warn('클립을 찾을 수 없습니다:', track);
        return;
      }

      clips.forEach((clip) => {
        const clipLeft = parseFloat(clip.style.left) || 0;
        const clipWidth = parseFloat(clip.style.width) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const clipEndTime = clipStartTime + (clipWidth / 100) * this.options.totalSeconds;

        if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
          object.visible = true;
          let hasChanges = false;

          ["position"].forEach((propertyType) => {
            if (!track.keyframes || !track.keyframes.has(propertyType)) {
              return;
            }

            const keyframes = track.keyframes.get(propertyType);
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

              if (prevKeyframe.value && nextKeyframe.value) {
                this.interpolateProperty(
                  object,
                  propertyType,
                  prevKeyframe,
                  nextKeyframe,
                  alpha
                );
                hasChanges = true;
              }
            } else if (prevKeyframe && prevKeyframe.value) {
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

  interpolateProperty(object, propertyType, prevKeyframe, nextKeyframe, alpha) {
    if (!object || !prevKeyframe?.value || !nextKeyframe?.value) return;

    switch (propertyType) {
      case "position":
        object.position.set(
          this.lerp(prevKeyframe.value.x, nextKeyframe.value.x, alpha),
          this.lerp(prevKeyframe.value.y, nextKeyframe.value.y, alpha),
          this.lerp(prevKeyframe.value.z, nextKeyframe.value.z, alpha)
        );
        break;
      case "rotation":
        object.rotation.set(
          this.lerp(prevKeyframe.value.x, nextKeyframe.value.x, alpha),
          this.lerp(prevKeyframe.value.y, nextKeyframe.value.y, alpha),
          this.lerp(prevKeyframe.value.z, nextKeyframe.value.z, alpha)
        );
        break;
      case "scale":
        object.scale.set(
          this.lerp(prevKeyframe.value.x, nextKeyframe.value.x, alpha),
          this.lerp(prevKeyframe.value.y, nextKeyframe.value.y, alpha),
          this.lerp(prevKeyframe.value.z, nextKeyframe.value.z, alpha)
        );
        break;
    }
  }

  setPropertyValue(object, propertyType, value) {
    if (!object || !value) return;

    switch (propertyType) {
      case "position":
        object.position.set(value.x, value.y, value.z);
        break;
      case "rotation":
        object.rotation.set(value.x, value.y, value.z);
        break;
      case "scale":
        object.scale.set(value.x, value.y, value.z);
        break;
    }
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

    posX.dom.setAttribute("data-axis", "x");
    posY.dom.setAttribute("data-axis", "y");
    posZ.dom.setAttribute("data-axis", "z");

    posX.onChange((value) => {
      if (!this.selectedKeyframe?.value) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      // index 기반으로 키프레임 값 업데이트
      if (this.selectedKeyframe.objectId && this.selectedKeyframe.index !== undefined) {
        const trackData = this.timelineData.tracks.get(this.selectedKeyframe.objectId)?.get('position');
        if (trackData) {
          const currentValue = new THREE.Vector3(
            trackData.values[this.selectedKeyframe.index * 3],
            trackData.values[this.selectedKeyframe.index * 3 + 1],
            trackData.values[this.selectedKeyframe.index * 3 + 2]
          );
          currentValue.x = numValue;

          // index 기반으로 키프레임 업데이트
          this.setKeyframeByIndex(
            this.selectedKeyframe.objectId,
            'position',
            this.selectedKeyframe.index,
            this.selectedKeyframe.time,
            currentValue,
            this.selectedKeyframe.interpolation
          );
        }
      }

      const object = this.editor.scene.getObjectByProperty('uuid', this.selectedKeyframe.objectId);
      if (object) {
        object.position.x = numValue;
        if (this.editor.signals?.objectChanged) this.editor.signals.objectChanged.dispatch(object);
      }
    });

    posY.onChange((value) => {
      if (!this.selectedKeyframe?.value) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      // index 기반으로 키프레임 값 업데이트
      if (this.selectedKeyframe.objectId && this.selectedKeyframe.index !== undefined) {
        const trackData = this.timelineData.tracks.get(this.selectedKeyframe.objectId)?.get('position');
        if (trackData) {
          const currentValue = new THREE.Vector3(
            trackData.values[this.selectedKeyframe.index * 3],
            trackData.values[this.selectedKeyframe.index * 3 + 1],
            trackData.values[this.selectedKeyframe.index * 3 + 2]
          );
          currentValue.y = numValue;

          // index 기반으로 키프레임 업데이트
          this.setKeyframeByIndex(
            this.selectedKeyframe.objectId,
            'position',
            this.selectedKeyframe.index,
            this.selectedKeyframe.time,
            currentValue,
            this.selectedKeyframe.interpolation
          );
        }
      }

      const object = this.editor.scene.getObjectByProperty('uuid', this.selectedKeyframe.objectId);
      if (object) {
        object.position.y = numValue;
        if (this.editor.signals?.objectChanged) this.editor.signals.objectChanged.dispatch(object);
      }
    });

    posZ.onChange((value) => {
      if (!this.selectedKeyframe?.value) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      // index 기반으로 키프레임 값 업데이트
      if (this.selectedKeyframe.objectId && this.selectedKeyframe.index !== undefined) {
        const trackData = this.timelineData.tracks.get(this.selectedKeyframe.objectId)?.get('position');
        if (trackData) {
          const currentValue = new THREE.Vector3(
            trackData.values[this.selectedKeyframe.index * 3],
            trackData.values[this.selectedKeyframe.index * 3 + 1],
            trackData.values[this.selectedKeyframe.index * 3 + 2]
          );
          currentValue.z = numValue;

          // index 기반으로 키프레임 업데이트
          this.setKeyframeByIndex(
            this.selectedKeyframe.objectId,
            'position',
            this.selectedKeyframe.index,
            this.selectedKeyframe.time,
            currentValue,
            this.selectedKeyframe.interpolation
          );
        }
      }

      const object = this.editor.scene.getObjectByProperty('uuid', this.selectedKeyframe.objectId);
      if (object) {
        object.position.z = numValue;
        if (this.editor.signals?.objectChanged) this.editor.signals.objectChanged.dispatch(object);
      }
    });

    positionRow.add(posX);
    positionRow.add(posY);
    positionRow.add(posZ);
    panel.add(positionRow);

    panel.dom.style.padding = "10px";
    panel.dom.style.backgroundColor = "#2c2c2c";
    panel.dom.style.borderTop = "1px solid #1a1a1a";

    return panel;
  }

  updatePropertyPanel() {
    console.log("updatePropertyPanel");

    if (!this.selectedKeyframe?.value || !this.propertyPanel) return;

    // index 기반으로 키프레임 값 가져오기
    const position = this.selectedKeyframe.value;

    const xInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="x"]'
    );
    const yInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="y"]'
    );
    const zInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="z"]'
    );

    if (xInput) xInput.value = position.x.toString();
    if (yInput) yInput.value = position.y.toString();
    if (zInput) zInput.value = position.z.toString();
  }

  addTrack(objectUuid, objectId, objectName) {
    console.log("addTrack called with:", { objectUuid, objectId, objectName });
    if (this.tracks.has(objectId)) return;

    // objectName이 객체인 경우 name 속성을 사용하거나 기본값 사용
    const displayName = typeof objectName === "object" ? (objectName.name || "Object") : (objectName || "Object");

    const track = {
      element: document.createElement("div"),
      keyframes: new Map(),
      objectId: objectId,
      objectName: displayName, // 문자열로 저장
      uuid: objectUuid,  // uuid 속성 추가
    };

    track.element.className = "timeline-track";
    track.element.dataset.objectId = objectId;
    track.element.dataset.uuid = objectUuid;  // dataset에도 uuid 추가

    const trackTopArea = document.createElement("div");
    trackTopArea.className = "motion-tracks";
    trackTopArea.dataset.uuid = objectUuid;
    trackTopArea.dataset.objectId = objectId;
    trackTopArea.dataset.objectName = objectName;

    // 트랙 헤더 생성
    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";
    trackHeader.innerHTML = `
      <div class="track-info">
        <span class="track-name">${displayName}</span>
      </div>
      <div class="track-controls">
        <button class="prev-keyframe-btn" title="Previous Keyframe">◀</button>
        <button class="add-keyframe-btn" title="Add Keyframe">+</button>
        <button class="next-keyframe-btn" title="Next Keyframe">▶</button>
      </div>
    `;

    // 트랙 컨텐츠 영역 생성
    const trackContent = document.createElement("div");
    trackContent.className = "track-content";

    // motion-tracks에 헤더와 컨텐츠 추가
    trackTopArea.appendChild(trackHeader);
    trackTopArea.appendChild(trackContent);

    // 트랙 요소에 motion-tracks 추가
    track.element.appendChild(trackTopArea);

    // 트랙 객체 생성
    const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
    if (object && object.animations && object.animations.length > 0) {
      // FBX 애니메이션 mixer 초기화
      if (!this.mixers.has(objectUuid)) {
        const mixer = new THREE.AnimationMixer(object);
        this.mixers.set(objectUuid, mixer);
        // 순환 참조 방지를 위해 userData에 저장하지 않음
        // object.userData.mixer = mixer;

        // 초기 액션 설정
        object.animations.forEach(clip => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat);
          action.clampWhenFinished = true;
          action.enabled = true;
        });
      }

      const animationDuration = object.animations[0]?.duration || 5;
      const totalFrames = Math.floor(animationDuration * this.options.framesPerSecond);

      const sprite = document.createElement("div");
      sprite.className = "animation-sprite selected";
      sprite.dataset.duration = animationDuration;
      sprite.innerHTML = `
        <div class="sprite-handle left"></div>
        <div class="sprite-content">
          <span class="sprite-name">${object.animations?.[0]?.name || "Animation"}</span>
          <div class="keyframe-layer"></div>
        </div>
        <div class="sprite-handle right"></div>
      `;

      const spriteWidth = (totalFrames / (this.options.totalSeconds * this.options.framesPerSecond)) * 100;
      sprite.style.width = `${spriteWidth}%`;
      sprite.style.left = "0%";
      sprite.dataset.initialLeft = "0"; // 초기 위치 저장

      trackContent.appendChild(sprite);
      this.bindSpriteEvents(sprite, track);

      // 초기 키프레임 추가 (시간 0에서 position만)
      const position = new THREE.Vector3(
        object.position.x,
        object.position.y,
        object.position.z
      );

      // position 속성에 대한 키프레임만 추가
      if (this.addKeyframe(objectUuid, 'position', 0, position)) {
        // 키프레임 UI 업데이트
        const keyframeElement = document.createElement('div');
        keyframeElement.className = 'keyframe';
        keyframeElement.dataset.property = 'position';
        keyframeElement.dataset.time = '0';
        keyframeElement.style.left = '0%';

        const keyframeLayer = sprite.querySelector('.keyframe-layer');
        if (keyframeLayer) {
          keyframeLayer.appendChild(keyframeElement);
          this.makeKeyframeDraggable(keyframeElement, track, 0, 'position');
        }
      }
    }

    // 두 Map에 모두 저장
    this.tracks.set(objectId, track);
    this.tracksByUuid.set(objectUuid, track);
    this.container.appendChild(track.element);

    this.bindTrackEvents(track);
    return track;
  }

  bindSpriteEvents(sprite, track) {
    let isDragging = false;
    let startX;
    let startLeft;
    let startWidth;
    let isResizing = false;
    let resizeHandle;
    let initialLeft; // 초기 위치 저장
    let hasMoved = false; // 클립이 이동했는지 추적

    // 스프라이트 클릭 이벤트
    sprite.addEventListener("mousedown", (e) => {
      // 키프레임을 클릭한 경우 스프라이트 드래그를 방지
      if (e.target.classList.contains("keyframe") || e.target.closest(".keyframe")) {
        e.stopPropagation();
        return;
      }

      console.log("mousedown");
      if (e.target.classList.contains("sprite-handle")) {
        isResizing = true;
        resizeHandle = e.target;
      } else {
        isDragging = true;
      }
      startX = e.clientX;
      startLeft = parseFloat(sprite.style.left) || 0;
      startWidth = parseFloat(sprite.style.width) || 100;
      initialLeft = startLeft; // 초기 위치 저장
      hasMoved = false; // 이동 상태 초기화
      e.stopPropagation();
    });

    // 마우스 이동 이벤트
    document.addEventListener("mousemove", (e) => {
      if (!isDragging && !isResizing) return;

      // 키프레임 드래그 중이면 스프라이트 드래그 방지
      if (document.querySelector(".keyframe.dragging")) {
        isDragging = false;
        isResizing = false;
        return;
      }

      console.log("mousemove");
      console.log(isResizing);
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

            // 클립 길이 변경 시 duration 업데이트
            const newDuration = (newWidth / 100) * this.options.totalSeconds;
            sprite.dataset.duration = newDuration.toString();

            this.updateKeyframesInClip(track, sprite);
          }
        } else {
          const newWidth = Math.max(
            10,
            Math.min(startWidth + deltaPercent, 100 - startLeft)
          );
          if (!this.checkClipCollision(sprite, startLeft, newWidth)) {
            sprite.style.width = `${newWidth}%`;

            // 클립 길이 변경 시 duration 업데이트
            const newDuration = (newWidth / 100) * this.options.totalSeconds;
            sprite.dataset.duration = newDuration.toString();

            this.updateKeyframesInClip(track, sprite);
          }
        }
      } else {
        const newLeft = Math.max(
          0,
          Math.min(100 - startWidth, startLeft + deltaPercent)
        );
        if (!this.checkClipCollision(sprite, newLeft, startWidth)) {
          sprite.style.left = `${newLeft}%`;
          hasMoved = true; // 클립이 이동했음을 표시
        }
      }
    });

    // 마우스 업 이벤트
    document.addEventListener("mouseup", () => {
      if (isDragging || isResizing) {
        // 클립이 이동했고 드래그가 끝났을 때만 키프레임 시간 업데이트
        if (hasMoved && isDragging) {
          console.log("클립 드래그 완료 - 키프레임 시간 업데이트");
          this.updateKeyframeTimesForClipMove(track, sprite);
        }

        isDragging = false;
        isResizing = false;
        hasMoved = false;
        this.updateAnimation(); // 올바른 호출로 수정
      }
    });

    // 기존의 contextmenu 이벤트 핸들러 유지
    sprite.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const clipCount = sprite.parentElement
        ? sprite.parentElement.querySelectorAll(".animation-sprite").length
        : 0;

      const existingMenu = document.querySelector(".context-menu");
      if (existingMenu) {
        existingMenu.remove();
      }

      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.style.position = "absolute";
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.style.zIndex = "1000";

      const duplicateBtn = document.createElement("button");
      duplicateBtn.textContent = "클립 복제";
      duplicateBtn.onclick = () => {
        this.duplicateClip(sprite, track);
        menu.remove();
      };

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

      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      document.addEventListener("click", closeMenu);
    });

    // 스프라이트 클릭 이벤트 (선택)
    sprite.addEventListener("click", (e) => {
      // 키프레임을 클릭한 경우 스프라이트 선택을 방지
      if (e.target.classList.contains("keyframe") || e.target.closest(".keyframe")) {
        e.stopPropagation();
        return;
      }

      e.stopPropagation();

      const previousSelected = this.container.querySelector(
        ".animation-sprite.selected"
      );
      if (previousSelected) {
        previousSelected.classList.remove("selected");
      }

      sprite.classList.add("selected");
      this.selectedSprite = sprite;

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

  checkClipCollision(currentSprite, newLeft, newWidth) {
    const clips = Array.from(
      currentSprite.parentElement.querySelectorAll(".animation-sprite")
    );
    const currentRight = newLeft + newWidth;

    return clips.some((clip) => {
      if (clip === currentSprite) return false;

      const clipLeft = parseFloat(clip.style.left) || 0;
      const clipWidth = parseFloat(clip.style.width) || 100;
      const clipRight = clipLeft + clipWidth;

      const hasCollision = !(currentRight <= clipLeft || newLeft >= clipRight);

      return hasCollision;
    });
  }

  updateKeyframesInClip(track, sprite) {
    const keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (!keyframeLayer) return;

    const keyframes = Array.from(keyframeLayer.querySelectorAll(".keyframe"));
    const spriteWidth = sprite.offsetWidth;
    const spriteLeft = parseFloat(sprite.style.left) || 0;
    const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
    const clipDuration = parseFloat(sprite.dataset.duration) || 5;

    console.log("updateKeyframesInClip - 클립 정보:", {
      spriteWidth,
      spriteLeft,
      clipStartTime,
      clipDuration
    });

    // TimelineData에서 해당 객체의 트랙들을 가져옴
    const objectUuid = track.uuid;
    if (!this.timelineData.tracks.has(objectUuid)) return;

    const objectTracks = this.timelineData.tracks.get(objectUuid);

    keyframes.forEach((keyframe) => {
      const pixelPosition = parseFloat(keyframe.dataset.pixelPosition);
      const propertyType = keyframe.dataset.property;

      if (pixelPosition < 0 || pixelPosition > spriteWidth) {
        keyframe.remove();

        const frame = parseInt(keyframe.dataset.frame);
        if (track.keyframes && track.keyframes[frame]) {
          delete track.keyframes[frame];
        }

        // TimelineData에서도 키프레임 제거
        if (propertyType && objectTracks.has(propertyType)) {
          const trackData = objectTracks.get(propertyType);
          const oldTime = parseFloat(keyframe.dataset.time) || 0;
          trackData.removeKeyframe(oldTime);
        }

        return;
      }

      // 클립 기준 상대 시간 계산 (수정된 로직)
      const relativeTime = (pixelPosition / spriteWidth) * clipDuration;
      const absoluteTime = clipStartTime + relativeTime;

      console.log("키프레임 시간 업데이트:", {
        pixelPosition,
        spriteWidth,
        relativeTime,
        absoluteTime,
        propertyType
      });

      if (track.keyframes) {
        const frame = Math.round(absoluteTime * this.options.framesPerSecond);
        track.keyframes[frame] = {
          time: absoluteTime,
          property: propertyType
        };
      }

      // TimelineData의 TrackData에서 키프레임 시간 업데이트
      if (propertyType && objectTracks.has(propertyType)) {
        const trackData = objectTracks.get(propertyType);
        const oldTime = parseFloat(keyframe.dataset.time) || 0;

        // 기존 키프레임 제거
        trackData.removeKeyframe(oldTime);

        // 새로운 시간으로 키프레임 추가
        const value = new THREE.Vector3(
          parseFloat(keyframe.dataset.x) || 0,
          parseFloat(keyframe.dataset.y) || 0,
          parseFloat(keyframe.dataset.z) || 0
        );
        trackData.addKeyframe(absoluteTime, value);

        // 키프레임 데이터셋 업데이트
        keyframe.dataset.time = absoluteTime.toString();
        keyframe.dataset.position = JSON.stringify([value.x, value.y, value.z]);
      }
    });

    // TimelineData의 최대 시간 업데이트
    this.timelineData.updateMaxTime(this.options.totalSeconds);
    this.timelineData.dirty = true;
    this.timelineData.precomputeAnimationData();
  }

  // 클립 이동 시 속성 키프레임들의 시간을 업데이트하는 새로운 메서드
  updateKeyframeTimesForClipMove(track, sprite) {
    const keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (!keyframeLayer) return;

    const keyframes = Array.from(keyframeLayer.querySelectorAll(".keyframe"));

    // TimelineData에서 해당 객체의 트랙들을 가져옴
    const objectUuid = track.uuid;
    if (!this.timelineData.tracks.has(objectUuid)) return;

    const objectTracks = this.timelineData.tracks.get(objectUuid);

    // 클립의 현재 위치와 초기 위치의 차이를 계산
    const currentLeft = parseFloat(sprite.style.left) || 0;
    const initialLeft = parseFloat(sprite.dataset.initialLeft) || currentLeft;

    // 초기 위치가 저장되지 않았다면 현재 위치를 저장하고 종료
    if (!sprite.dataset.initialLeft) {
      sprite.dataset.initialLeft = currentLeft.toString();
      return; // 첫 번째 호출에서는 아무것도 하지 않음
    }

    console.log('클립 이동 완료');
    console.log('클립 위치:', initialLeft, '% ->', currentLeft, '%');

    // 모든 키프레임을 클립 기준의 상대 시간으로 다시 저장
    keyframes.forEach((keyframe) => {
      const propertyType = keyframe.dataset.property;
      if (!propertyType || !objectTracks.has(propertyType)) return;

      const trackData = objectTracks.get(propertyType);

      // 키프레임의 픽셀 위치를 기반으로 상대 시간 계산
      const pixelPosition = parseFloat(keyframe.dataset.pixelPosition) || 0;
      const spriteWidth = sprite.offsetWidth;
      const clipDuration = parseFloat(sprite.dataset.duration) || 5;

      // 클립 기준의 상대 시간 계산
      const relativeTime = (pixelPosition / spriteWidth) * clipDuration;

      console.log(`키프레임 상대 시간 계산: ${propertyType} - 픽셀: ${pixelPosition}, 상대시간: ${relativeTime}s`);

      // 기존 키프레임 제거 (현재 시간으로)
      const currentTime = parseFloat(keyframe.dataset.time) || 0;
      trackData.removeKeyframe(currentTime);

      // 새로운 상대 시간으로 키프레임 추가
      const value = new THREE.Vector3(
        parseFloat(keyframe.dataset.x) || 0,
        parseFloat(keyframe.dataset.y) || 0,
        parseFloat(keyframe.dataset.z) || 0
      );
      trackData.addKeyframe(relativeTime, value);

      // 키프레임 데이터셋 업데이트 (상대 시간으로)
      keyframe.dataset.time = relativeTime.toString();
      keyframe.dataset.position = JSON.stringify([value.x, value.y, value.z]);
    });

    // TimelineData 즉시 업데이트
    this.timelineData.dirty = true;
    this.timelineData.precomputeAnimationData();

    // 현재 시간에 맞춰 애니메이션 업데이트
    this.updateAnimation(this.currentTime);
  }

  createVideoBackground(stageGroup) {
    const existingBackground = stageGroup.children.find(
      (child) => child.name === "_VideoBackground"
    );
    if (existingBackground) {
      stageGroup.remove(existingBackground);
    }

    const stageSize = new THREE.Vector3(400, 250);
    const stageGeometry = new THREE.PlaneGeometry(stageSize.x, stageSize.y);

    const cloudName = "djqiaktcg";
    const videoId = "omhwppxby9e7yw4tmydz";
    const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${videoId}.mp4`;
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

    const source = document.createElement("source");
    source.src = videoUrl;
    source.type = "video/mp4";
    video.appendChild(source);

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    const stageMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const stagePlane = new THREE.Mesh(stageGeometry, stageMaterial);
    // stagePlane.position.set(0, 79.100, -74.039);
    // stagePlane.scale.set(1, 0.639, 1);
    stagePlane.position.set(8.243, 65.273, -74.039);
    stagePlane.scale.set(0.937, 0.508, 1);
    stagePlane.name = "_VideoBackground";
    stageGroup.add(stagePlane);
    // editor.scene.add(stagePlane);
    const loadVideo = async () => {
      try {
        await video.load();

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            resolve();
          };
          video.onerror = (error) => {
            reject(error);
          };
        });

        try {
          await video.play();

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

          const playVideo = async () => {
            try {
              await video.play();
              message.remove();
              document.removeEventListener("click", playVideo);
            } catch (error) { }
          };
          document.addEventListener("click", playVideo);
        }
      } catch (error) { }
    };

    loadVideo();

    stageGroup.userData.video = {
      type: "cloudinary",
      videoId: videoId,
      videoElement: video,
      texture: videoTexture,
      url: videoUrl,
    };

    if (this.editor.signals?.sceneGraphChanged) {
      this.editor.signals.sceneGraphChanged.dispatch();
    }

    return stagePlane;
  }

  deleteSelectedKeyframe() {
    if (!this.selectedKeyframe) return;

    const { objectId, time, element } = this.selectedKeyframe;
    const track = this.tracks.get(objectId);

    if (!track || !track.keyframes) return;

    track.keyframes.delete(time);

    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }

    this.selectedKeyframe = null;

    this.updatePropertyPanel();

    if (this.editor.signals?.sceneGraphChanged) {
      this.editor.signals.sceneGraphChanged.dispatch();
    }
  }

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

  duplicateClip(sourceClip, track) {
    // 기존 선택된 클립들의 선택 해제
    const existingSelectedClips = track.element.querySelectorAll(".animation-sprite.selected");
    existingSelectedClips.forEach(clip => {
      clip.classList.remove("selected");
    });

    const newClip = document.createElement("div");
    newClip.className = "animation-sprite";
    newClip.dataset.duration = sourceClip.dataset.duration;

    const originalName = sourceClip.querySelector(".sprite-name").textContent;
    newClip.innerHTML = `
    <div class="sprite-handle left"></div>
    <div class="sprite-content">
      <span class="sprite-name">${originalName}</span>
      <div class="keyframe-layer"></div>
    </div>
    <div class="sprite-handle right"></div>
  `;

    const sourceLeft = parseFloat(sourceClip.style.left) || 0;
    const sourceWidth = parseFloat(sourceClip.style.width) || 100;
    const newLeft = Math.min(100 - sourceWidth, sourceLeft + sourceWidth);

    newClip.style.left = `${newLeft}%`;
    newClip.style.width = `${sourceWidth}%`;

    // 새로 복제된 클립을 선택 상태로 설정
    newClip.classList.add("selected");

    // 복제된 클립은 빈 상태로 시작 (키프레임 데이터 삭제 로직 제거)
    console.log("복제된 클립 생성 완료 - 빈 상태로 시작");

    this.bindSpriteEvents(newClip, track);

    sourceClip.parentElement.appendChild(newClip);

    return newClip;
  }

  moveToAdjacentKeyframe(trackElement, direction) {
    const selectedKeyframe = trackElement.querySelector(".keyframe.selected");
    if (!selectedKeyframe) return;

    const keyframeElements = Array.from(
      trackElement.querySelectorAll(".keyframe")
    );

    // index 기반으로 정렬
    const sortedKeyframes = keyframeElements.sort((a, b) => {
      return parseInt(a.dataset.index || 0) - parseInt(b.dataset.index || 0);
    });

    const currentIndex = sortedKeyframes.indexOf(selectedKeyframe);

    if (direction === "prev" && currentIndex > 0) {
      const prevKeyframe = sortedKeyframes[currentIndex - 1];
      selectedKeyframe.classList.remove("selected");
      prevKeyframe.classList.add("selected");

      // index 기반으로 selectedKeyframe 업데이트
      const objectId = trackElement.dataset.uuid;
      const time = parseFloat(prevKeyframe.dataset.time);
      const index = parseInt(prevKeyframe.dataset.index);
      console.log("moveToAdjacentKeyframe", {
        objectId,
        time,
        index
      });
      this.selectKeyframe(objectId, time, prevKeyframe, index);
    } else if (
      direction === "next" &&
      currentIndex < sortedKeyframes.length - 1
    ) {
      const nextKeyframe = sortedKeyframes[currentIndex + 1];
      selectedKeyframe.classList.remove("selected");
      nextKeyframe.classList.add("selected");

      // index 기반으로 selectedKeyframe 업데이트
      const objectId = trackElement.dataset.uuid;
      const time = parseFloat(nextKeyframe.dataset.time);
      const index = parseInt(nextKeyframe.dataset.index);
      console.log("moveToAdjacentKeyframe2222", {
        objectId,
        time,
        index
      });
      this.selectKeyframe(objectId, time, nextKeyframe, index);
    }
  }

  applyValue(object, property, value) {
    switch (property) {
      case 'position':
        object.position.copy(value);
        break;
      case 'rotation':
        object.rotation.set(value.x, value.y, value.z);
        break;
      case 'scale':
        object.scale.copy(value);
        break;
    }
  }

  updateUI() {
    this.tracks.forEach((track) => {
      if (track && track.element) {
        this.updateTrackUI(track, this.currentTime);
      }
    });
  }

  updateTrackUI(track, time) {
    if (!track || !track.element) {
      console.warn("Invalid track in updateTrackUI:", track);
      return;
    }

    const motionTracks = track.element.querySelector('.motion-tracks');
    if (!motionTracks) {
      console.warn("No motion-tracks element found in track:", track);
      return;
    }

    const trackContent = motionTracks.querySelector('.track-content');
    if (!trackContent) {
      console.warn("No track-content element found in motion-tracks:", motionTracks);
      return;
    }

    const sprite = trackContent.querySelector('.animation-sprite');
    if (!sprite) {
      console.warn("No animation sprite found in track content:", trackContent);
      return;
    }

    const keyframeLayer = sprite.querySelector('.keyframe-layer');
    if (!keyframeLayer) {
      console.warn("No keyframe layer found in sprite:", sprite);
      return;
    }

    // 기존 키프레임 요소들 제거
    const existingKeyframes = keyframeLayer.querySelectorAll('.keyframe');
    existingKeyframes.forEach(kf => kf.remove());

    const objectUuid = track.uuid;
    if (!objectUuid) {
      console.warn("No UUID found in track:", track);
      return;
    }

    // position 속성의 키프레임만 렌더링
    const trackData = this.timelineData.tracks.get(objectUuid)?.get('position');
    if (!trackData) return;

    // 클립 정보 가져오기
    const clipLeft = parseFloat(sprite.style.left) || 0;
    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
    const clipDuration = parseFloat(sprite.dataset.duration) || 5;

    for (let i = 0; i < trackData.keyframeCount; i++) {
      const keyframeTime = trackData.times[i];
      const keyframeElement = document.createElement('div');
      keyframeElement.className = 'keyframe';
      keyframeElement.dataset.property = 'position';
      keyframeElement.dataset.time = keyframeTime;
      keyframeElement.dataset.index = i;

      // 클립 기준의 상대적 시간 계산
      const relativeTime = keyframeTime - clipStartTime;

      // 클립 내에서의 상대적 위치 계산 (픽셀 단위)
      const relativePosition = (relativeTime / clipDuration) * sprite.offsetWidth;
      keyframeElement.style.left = `${relativePosition}px`;
      keyframeElement.dataset.pixelPosition = relativePosition.toString();

      // 현재 시간과 일치하는 키프레임 강조
      if (Math.abs(keyframeTime - time) < 0.001) {
        keyframeElement.classList.add('current');
      }

      // 키프레임 데이터 저장
      const value = new THREE.Vector3(
        trackData.values[i * 3],
        trackData.values[i * 3 + 1],
        trackData.values[i * 3 + 2]
      );
      keyframeElement.dataset.value = JSON.stringify([value.x, value.y, value.z]);

      keyframeLayer.appendChild(keyframeElement);
      this.makeKeyframeDraggable(keyframeElement, track, keyframeTime, 'position');
    }
  }

  // 키프레임 드래그 가능하게 만들기
  makeKeyframeDraggable(keyframeElement, track, time, property) {
    console.log("makeKeyframeDraggable", {
      keyframeElement,
      track,
      time,
      property
    });
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let isOutsideClip = false; // 클립 밖으로 나갔는지 추적
    let dragStartIndex = -1; // 드래그 시작 시점의 인덱스 저장
    const REMOVE_THRESHOLD = 50;

    // 이전 이벤트 리스너 제거
    const oldMouseDown = keyframeElement.onmousedown;
    if (oldMouseDown) {
      keyframeElement.removeEventListener("mousedown", oldMouseDown);
    }

    // 키프레임 클릭 이벤트 추가 (선택 기능)
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("속성 키프레임 클릭 - 선택");

      // 키프레임 인덱스 가져오기
      let keyframeIndex = -1;
      if (keyframeElement.dataset.index) {
        keyframeIndex = parseInt(keyframeElement.dataset.index);
      } else if (track.uuid) {
        const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
        if (trackData) {
          const time = parseFloat(keyframeElement.dataset.time);
          keyframeIndex = trackData.findKeyframeIndex(time);
        }
      }

      // 키프레임 선택
      if (track.uuid) {
        const time = parseFloat(keyframeElement.dataset.time);
        console.log("selectKeyframe5555", {
          time,
          keyframeElement,
          keyframeIndex
        });
        this.selectKeyframe(track.uuid, time, keyframeElement, keyframeIndex);
      }
    });

    // 새로운 이벤트 리스너 추가
    keyframeElement.addEventListener("mousedown", (e) => {
      console.log("mousedown 키프레임 드래그");
      e.stopPropagation();
      isDragging = true;
      isOutsideClip = false;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseFloat(keyframeElement.style.left) || 0;
      keyframeElement.classList.add("dragging");

      // 드래그 시작 시점의 인덱스와 시간을 저장
      const dragStartTime = parseFloat(keyframeElement.dataset.time);

      // 키프레임 인덱스 가져오기 (TimelineData에서)
      if (track.uuid) {
        const trackData = this.timelineData.tracks.get(track.uuid)?.get(property);
        if (trackData) {
          dragStartIndex = trackData.findKeyframeIndex(dragStartTime);
          console.log("trackData 인덱스", trackData);
          console.log("trackData 시간", dragStartTime);
          console.log("드래그 시작 - 인덱스:", dragStartIndex, "시간:", dragStartTime);
        }
      }

      // 키프레임 선택
      if (track.uuid) {
        this.selectKeyframe(track.uuid, dragStartTime, keyframeElement, dragStartIndex);
      }

      const handleMouseMove = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY; // Y 이동량 계산
        const sprite = keyframeElement.closest(".animation-sprite");
        if (!sprite) return;

        const spriteRect = sprite.getBoundingClientRect();
        const relativeX = e.clientX - spriteRect.left;

        if (dy > REMOVE_THRESHOLD) {
          // 아래로 드래그해서 삭제하는 기능만 유지
          if (!isOutsideClip) {
            isOutsideClip = true;
            keyframeElement.classList.add("delete-preview");
            keyframeElement.style.opacity = "0.5";
            keyframeElement.style.background = "#ff4444";
            console.log("키프레임이 아래로 드래그되었습니다 - 삭제 준비", {
              dy,
              REMOVE_THRESHOLD
            });
          }
        } else {
          if (isOutsideClip) {
            isOutsideClip = false;
            keyframeElement.style.opacity = "1";
            keyframeElement.style.background = "#f90";
            keyframeElement.classList.remove("delete-preview");
            console.log("키프레임이 클립 안으로 돌아왔습니다", {
              relativeX,
              spriteRectWidth: spriteRect.width,
              dy
            });
          }

          // 클립 범위 내에서만 위치 업데이트 (좌우 제한 없음)
          const newLeft = Math.max(0, Math.min(spriteRect.width, relativeX));

          // 키프레임 위치 업데이트
          keyframeElement.style.left = `${newLeft}px`;
          keyframeElement.dataset.pixelPosition = newLeft.toString();

          // 시간 계산 및 업데이트
          const clipDuration = parseFloat(sprite.dataset.duration) || 5;
          const clipLeft = parseFloat(sprite.style.left) || 0;
          const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
          const newTimeInSeconds = clipStartTime + (newLeft / spriteRect.width) * clipDuration;

          console.log("드래그 중 - 새 시간:", newTimeInSeconds, "시작 인덱스:", dragStartIndex);

          // TimelineData 업데이트
          if (track.uuid) {
            console.log("TimelineData 업데이트");
            const trackData = this.timelineData.tracks.get(track.uuid)?.get(property);
            if (trackData) {
              // 드래그 시작 시점의 인덱스 사용
              if (dragStartIndex < 0 || dragStartIndex >= trackData.keyframeCount) {
                console.warn("유효하지 않은 드래그 시작 인덱스:", dragStartIndex);
                return;
              }

              // 기존 키프레임의 값과 보간 타입 저장
              const originalValue = new THREE.Vector3(
                trackData.values[dragStartIndex * 3],
                trackData.values[dragStartIndex * 3 + 1],
                trackData.values[dragStartIndex * 3 + 2]
              );
              const originalInterpolation = trackData.interpolations[dragStartIndex];

              // 기존 키프레임 제거 (인덱스 기반)
              const removed = trackData.removeKeyframeByIndex(dragStartIndex);
              if (!removed) {
                console.warn("기존 키프레임 제거 실패 (인덱스):", dragStartIndex);
                return;
              }

              // 새 위치에 키프레임 추가 (원래 값과 보간 타입 사용)
              const added = trackData.addKeyframe(newTimeInSeconds, originalValue, originalInterpolation);
              if (!added) {
                console.warn("새 키프레임 추가 실패:", newTimeInSeconds);
                return;
              }

              // 새로운 인덱스 가져오기
              const newIndex = trackData.findKeyframeIndex(newTimeInSeconds);
              if (newIndex !== -1) {
                keyframeElement.dataset.index = newIndex.toString();
                console.log("새 키프레임 인덱스 업데이트:", newIndex);
              }

              // TimelineData의 maxTime 업데이트 (duration 변화 반영)
              this.timelineData.updateMaxTime(newTimeInSeconds);
              console.log("maxTime 업데이트 완료:", newTimeInSeconds);

              // tracks.keyframes도 함께 업데이트 (UI 데이터 동기화)
              if (track.keyframes && track.keyframes.has(property)) {
                const keyframeData = track.keyframes.get(property).get(dragStartTime.toString());
                if (keyframeData) {
                  track.keyframes.get(property).delete(dragStartTime.toString());
                  track.keyframes.get(property).set(newTimeInSeconds.toString(), {
                    ...keyframeData,
                    time: newTimeInSeconds
                  });
                  console.log("tracks.keyframes 업데이트 완료:", { dragStartTime, newTimeInSeconds });
                }
              }

              // UI의 dataset.time 업데이트
              keyframeElement.dataset.time = newTimeInSeconds.toString();
              console.log("키프레임 시간 업데이트 완료:", newTimeInSeconds);

              // TimelineData 업데이트
              this.timelineData.dirty = true;
              this.timelineData.precomputeAnimationData();
              this.updateAnimation();
            }
          }
        }
      };

      const handleMouseUp = (e) => {
        if (isDragging) {
          isDragging = false;
          keyframeElement.classList.remove("dragging");

          console.log("마우스 업 - isOutsideClip:", isOutsideClip);

          // 클립 밖에서 마우스를 놓았으면 키프레임 삭제
          if (isOutsideClip) {
            console.log("키프레임 삭제 실행");

            // TimelineData에서 키프레임 제거
            if (track.uuid) {
              const trackData = this.timelineData.tracks.get(track.uuid)?.get(property);
              if (trackData) {
                // index 기반으로 키프레임 삭제
                console.log("삭제할 키프레임 인덱스:", dragStartIndex, "속성:", property);

                if (dragStartIndex >= 0 && dragStartIndex < trackData.keyframeCount) {
                  trackData.removeKeyframeByIndex(dragStartIndex);
                  console.log(`${property} 속성 키프레임 삭제됨 (인덱스):`, dragStartIndex);
                } else {
                  console.warn("유효하지 않은 키프레임 인덱스:", dragStartIndex);
                }
              } else {
                console.warn("trackData를 찾을 수 없습니다:", track.uuid, property);
              }
            } else {
              console.warn("track.uuid가 없습니다");
            }

            // UI에서 키프레임 제거
            keyframeElement.remove();
            console.log("UI에서 키프레임 제거됨");

            // TimelineData 업데이트
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();
            this.updateAnimation();
          } else {
            // 클립 안에서 놓았으면 드래그 중에 이미 업데이트되었으므로 추가 업데이트 불필요
            console.log("클립 안에서 놓음 - 드래그 중에 이미 업데이트됨");

            // 현재 시간에 맞춰 애니메이션만 업데이트
            this.updateAnimation(this.currentTime);
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  }

  makePropertyKeyframeDraggable(keyframeElement, track, propertyType) {
    let isDragging = false;
    let startX = 0;
    let startY = 0; // Y 좌표 추가
    let startLeft = 0;
    let isOutsideClip = false; // 클립 밖으로 나갔는지 추적
    let dragStartIndex = -1; // 드래그 시작 시점의 인덱스 저장
    const REMOVE_THRESHOLD = 50; // 아래로 드래그 삭제 임계값

    // 키프레임 클릭 이벤트 추가 (선택 기능)
    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("속성 키프레임 클릭 - 선택");

      // 키프레임 선택
      if (track.uuid) {
        const time = parseFloat(keyframeElement.dataset.time);
        this.selectKeyframe(track.uuid, time, keyframeElement);
      }
    });

    // 드래그 이벤트
    keyframeElement.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      isDragging = true;
      isOutsideClip = false;
      startX = e.clientX;
      startY = e.clientY; // Y 좌표 저장
      startLeft = parseFloat(keyframeElement.style.left) || 0;
      keyframeElement.classList.add("dragging");

      // 드래그 시작 시점의 time과 인덱스를 저장
      const dragStartTime = parseFloat(keyframeElement.dataset.time);

      // 키프레임 인덱스 가져오기
      if (track.uuid) {
        const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
        if (trackData) {
          dragStartIndex = trackData.findKeyframeIndex(dragStartTime);
          console.log("드래그 시작 - 인덱스:", dragStartIndex, "시간:", dragStartTime);
        }
      }

      // 키프레임 선택
      console.log("track.uuid", track.uuid);
      if (track.uuid) {
        console.log("selectKeyframe2222", {
          dragStartTime,
          keyframeElement,
          dragStartIndex
        });
        this.selectKeyframe(track.uuid, dragStartTime, keyframeElement, dragStartIndex);
      }

      const handleMouseMove = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY; // Y 이동량 계산
        const sprite = keyframeElement.closest(".animation-sprite");
        if (!sprite) return;

        const spriteRect = sprite.getBoundingClientRect();
        const relativeX = e.clientX - spriteRect.left;

        if (dy > REMOVE_THRESHOLD) {
          // 아래로 드래그해서 삭제하는 기능만 유지
          if (!isOutsideClip) {
            isOutsideClip = true;
            keyframeElement.classList.add("delete-preview");
            keyframeElement.style.opacity = "0.5";
            keyframeElement.style.background = "#ff4444";
            console.log("키프레임이 아래로 드래그되었습니다 - 삭제 준비", {
              dy,
              REMOVE_THRESHOLD
            });
          }
        } else {
          if (isOutsideClip) {
            isOutsideClip = false;
            keyframeElement.style.opacity = "1";
            keyframeElement.style.background = "#f90";
            keyframeElement.classList.remove("delete-preview");
            console.log("키프레임이 클립 안으로 돌아왔습니다", {
              relativeX,
              spriteRectWidth: spriteRect.width,
              dy
            });
          }

          // 클립 범위 내에서만 위치 업데이트 (좌우 제한 없음)
          const newLeft = Math.max(0, Math.min(spriteRect.width, relativeX));

          // 키프레임 위치 업데이트
          keyframeElement.style.left = `${newLeft}px`;
          keyframeElement.dataset.pixelPosition = newLeft.toString();

          // 시간 계산 및 업데이트
          const clipDuration = parseFloat(sprite.dataset.duration) || 5;
          const clipLeft = parseFloat(sprite.style.left) || 0;
          const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
          const newTimeInSeconds = clipStartTime + (newLeft / spriteRect.width) * clipDuration;

          console.log("속성 키프레임 드래그 중 - 새 시간:", newTimeInSeconds, "시작 인덱스:", dragStartIndex);

          // TimelineData 업데이트
          if (track.uuid) {
            console.log("TimelineData 업데이트");
            const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
            if (trackData) {
              // 드래그 시작 시점의 인덱스 사용
              if (dragStartIndex < 0 || dragStartIndex >= trackData.keyframeCount) {
                console.warn("유효하지 않은 드래그 시작 인덱스:", dragStartIndex);
                return;
              }

              // 기존 키프레임의 값과 보간 타입 저장
              const originalValue = new THREE.Vector3(
                trackData.values[dragStartIndex * 3],
                trackData.values[dragStartIndex * 3 + 1],
                trackData.values[dragStartIndex * 3 + 2]
              );
              const originalInterpolation = trackData.interpolations[dragStartIndex];

              // 기존 키프레임 제거 (인덱스 기반)
              const removed = trackData.removeKeyframeByIndex(dragStartIndex);
              if (!removed) {
                console.warn("기존 키프레임 제거 실패 (인덱스):", dragStartIndex);
                return;
              }

              // 새 위치에 키프레임 추가 (원래 값과 보간 타입 사용)
              const added = trackData.addKeyframe(newTimeInSeconds, originalValue, originalInterpolation);
              if (!added) {
                console.warn("새 키프레임 추가 실패:", newTimeInSeconds);
                return;
              }

              // 새로운 인덱스 가져오기
              const newIndex = trackData.findKeyframeIndex(newTimeInSeconds);
              if (newIndex !== -1) {
                keyframeElement.dataset.index = newIndex.toString();
                console.log("새 키프레임 인덱스 업데이트:", newIndex);
              }

              // TimelineData의 maxTime 업데이트 (duration 변화 반영)
              this.timelineData.updateMaxTime(newTimeInSeconds);
              console.log("maxTime 업데이트 완료:", newTimeInSeconds);

              // tracks.keyframes도 함께 업데이트 (UI 데이터 동기화)
              if (track.keyframes && track.keyframes.has(propertyType)) {
                const keyframeData = track.keyframes.get(propertyType).get(dragStartTime.toString());
                if (keyframeData) {
                  track.keyframes.get(propertyType).delete(dragStartTime.toString());
                  track.keyframes.get(propertyType).set(newTimeInSeconds.toString(), {
                    ...keyframeData,
                    time: newTimeInSeconds
                  });
                  console.log("tracks.keyframes 업데이트 완료:", { dragStartTime, newTimeInSeconds });
                }
              }

              // UI의 dataset.time 업데이트
              keyframeElement.dataset.time = newTimeInSeconds.toString();
              console.log("키프레임 시간 업데이트 완료:", newTimeInSeconds);

              // TimelineData 업데이트
              this.timelineData.dirty = true;
              this.timelineData.precomputeAnimationData();
              this.updateAnimation();
            }
          }
        }
      };

      const handleMouseUp = (e) => {
        if (isDragging) {
          isDragging = false;
          keyframeElement.classList.remove("dragging");

          console.log("마우스 업 - isOutsideClip:", isOutsideClip);

          // 클립 밖에서 마우스를 놓았으면 키프레임 삭제
          if (isOutsideClip) {
            console.log("키프레임 삭제 실행");

            // TimelineData에서 키프레임 제거
            if (track.uuid) {
              const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
              if (trackData) {
                // index 기반으로 키프레임 삭제
                console.log("삭제할 키프레임 인덱스:", dragStartIndex, "속성:", propertyType);

                if (dragStartIndex >= 0 && dragStartIndex < trackData.keyframeCount) {
                  trackData.removeKeyframeByIndex(dragStartIndex);
                  console.log(`${propertyType} 속성 키프레임 삭제됨 (인덱스):`, dragStartIndex);
                } else {
                  console.warn("유효하지 않은 키프레임 인덱스:", dragStartIndex);
                }
              } else {
                console.warn("trackData를 찾을 수 없습니다:", track.uuid, propertyType);
              }
            } else {
              console.warn("track.uuid가 없습니다");
            }

            // UI에서 키프레임 제거
            keyframeElement.remove();
            console.log("UI에서 키프레임 제거됨");

            // TimelineData 업데이트
            this.timelineData.dirty = true;
            console.log("TimelineData 업데이트 timelineData.dirty", this.timelineData.dirty);
            this.timelineData.precomputeAnimationData();
            this.updateAnimation();
          } else {
            // 클립 안에서 놓았으면 정상적으로 업데이트
            console.log("클립 안에서 놓음 - 정상 업데이트");
            this.updateAnimation();
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  }

  createPropertyTrack(objectId, propertyType) {
    const propertyTrack = document.createElement("div");
    propertyTrack.className = "property-track";
    propertyTrack.dataset.objectId = objectId;
    propertyTrack.dataset.property = propertyType;
    propertyTrack.dataset.propertyTrack = propertyType;

    const propertyHeader = document.createElement("div");
    propertyHeader.className = "property-header";
    propertyHeader.innerHTML = `
      <span>${this.formatPropertyName(propertyType)}</span>
      <button class="add-keyframe-btn" title="Add Keyframe">+</button>
    `;

    const keyframesContainer = document.createElement("div");
    keyframesContainer.className = "property-keyframes-scroll";

    const keyframesArea = document.createElement("div");
    keyframesArea.className = "property-keyframes";

    const keyframeLayer = document.createElement("div");
    keyframeLayer.className = "keyframe-layer";
    keyframeLayer.dataset.propertyTrack = propertyType;
    keyframeLayer.dataset.propertyType = propertyType;

    keyframesArea.appendChild(keyframeLayer);
    keyframesContainer.appendChild(keyframesArea);
    propertyTrack.appendChild(propertyHeader);
    propertyTrack.appendChild(keyframesContainer);

    return propertyTrack;
  }

  formatPropertyName(propertyType) {
    switch (propertyType) {
      case "position":
        return "Position";
      case "rotation":
        return "Rotation";
      case "scale":
        return "Scale";
      default:
        return propertyType;
    }
  }

  updatePlayheadPosition(percent) {
    const playhead = this.container.querySelector(".playhead");
    if (!playhead) return;

    playhead.style.left = `${percent}%`;
    const currentTime = (percent / 100) * this.options.totalSeconds;
    this.currentTime = currentTime;

    // FBX 애니메이션 업데이트
    this.mixers.forEach((mixer, uuid) => {
      const object = this.editor.scene.getObjectByProperty('uuid', uuid);
      if (!object || !object.animations || !object.animations.length) return;

      // mixer 시간 설정
      mixer.setTime(currentTime);

      // 모든 액션 업데이트
      mixer.clipActions.forEach(action => {
        if (action.isRunning()) {
          action.time = currentTime;
          action.enabled = true;
        }
      });

      // 객체 가시성 유지
      object.visible = true;
    });

    // 키프레임 애니메이션 업데이트
    this.tracksByUuid.forEach((track, uuid) => {
      if (track && track.uuid) {
        this.updateAnimation(track.objectId);
      }
    });

    this.updateUI();

    if (this.editor.signals?.timelineChanged) {
      this.editor.signals.timelineChanged.dispatch();
    }
  }

  bindTrackEvents(track) {
    if (!track || !track.objectId) {
      console.warn("트랙 또는 objectId가 없습니다:", track);
      return;
    }

    const objectId = typeof track.objectId === "string" ? parseInt(track.objectId) : track.objectId;
    if (isNaN(objectId)) {
      console.warn("유효하지 않은 objectId:", track.objectId);
      return;
    }

    const object = this.editor.scene.getObjectById(objectId);
    if (!object) {
      console.warn(`객체를 찾을 수 없습니다: ${objectId}`);
      return;
    }

    // 키프레임 추가 버튼 이벤트 바인딩
    const addKeyframeBtn = track.element.querySelector(".add-keyframe-btn");
    if (addKeyframeBtn) {
      addKeyframeBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        // 선택된 스프라이트 찾기 - 더 안전한 방법으로 수정
        let sprite = track.element.querySelector('.animation-sprite.selected');
        if (!sprite) {
          // 선택된 스프라이트가 없으면 첫 번째 스프라이트를 선택
          sprite = track.element.querySelector('.animation-sprite');
          if (sprite) {
            // 기존 선택 해제
            const existingSelected = track.element.querySelectorAll('.animation-sprite.selected');
            existingSelected.forEach(clip => clip.classList.remove('selected'));

            // 첫 번째 스프라이트 선택
            sprite.classList.add('selected');
            console.log("선택된 스프라이트가 없어서 첫 번째 스프라이트를 선택했습니다.");
          } else {
            console.warn("스프라이트를 찾을 수 없습니다.");
            return;
          }
        }

        // playhead 위치 찾기
        const playhead = document.querySelector(".playhead");
        if (!playhead) {
          console.warn("플레이헤드를 찾을 수 없습니다.");
          return;
        }

        const playheadRect = playhead.getBoundingClientRect();
        const spriteRect = sprite.getBoundingClientRect();

        // playhead가 클립 범위 내에 있는지 확인
        if (playheadRect.left < spriteRect.left || playheadRect.left > spriteRect.right) {
          console.warn("Playhead가 클립 범위 밖에 있습니다.");
          return;
        }

        // 클립 내에서의 상대적 위치 계산
        const relativePlayheadPosition = playheadRect.left - spriteRect.left;
        const spriteWidth = spriteRect.width;
        const clipDuration = parseFloat(sprite.dataset.duration) || 0;
        const relativeTimeInSeconds = (relativePlayheadPosition / spriteWidth) * clipDuration;

        // 클립 시작 시간을 포함한 절대 시간 계산
        const clipLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const timeInSeconds = clipStartTime + relativeTimeInSeconds;

        // position, rotation, scale 모두 추가
        const properties = ['position', 'rotation', 'scale'];
        properties.forEach(propertyType => {
          const value = this.getKeyframeValue(object, propertyType);
          if (value && track.uuid) {
            // 트랙이 없으면 자동으로 생성
            let trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
            if (!trackData) {
              console.log("키프레임 추가 시 트랙을 생성합니다:", { trackUuid: track.uuid, propertyType });
              trackData = this.timelineData.addTrack(track.uuid, propertyType);
              if (!trackData) {
                console.error("트랙 생성 실패:", { trackUuid: track.uuid, propertyType });
                return;
              }
            }

            this.addKeyframe(track.uuid, propertyType, timeInSeconds, value);
          }
        });
      });
    }

    // 키프레임 레이어 클릭 이벤트
    const keyframeLayers = track.element.querySelectorAll(".keyframe-layer");
    keyframeLayers.forEach((layer) => {
      const propertyType = layer.dataset.propertyType;
      if (!propertyType) {
        console.warn("속성 타입이 정의되지 않았습니다:", layer);
        return;
      }

      // 키프레임 레이어 클릭 이벤트
      layer.addEventListener("click", (e) => {
        // 키프레임을 클릭한 경우 무시
        if (e.target.classList.contains("keyframe") || e.target.closest(".keyframe")) {
          e.stopPropagation();
          return;
        }

        const sprite = layer.closest(".animation-sprite");
        if (!sprite) return;

        const spriteRect = sprite.getBoundingClientRect();
        const relativeX = e.clientX - spriteRect.left;
        const clipDuration = parseFloat(sprite.dataset.duration) || 5;
        const clipLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const timeInSeconds = clipStartTime + (relativeX / spriteRect.width) * clipDuration;

        const value = this.getKeyframeValue(object, propertyType);
        if (!value) {
          console.warn("키프레임 값을 가져올 수 없습니다:", { objectId, propertyType });
          return;
        }

        if (track.uuid) {
          this.addKeyframe(track.uuid, propertyType, timeInSeconds, value);
        }
      });

      // MutationObserver를 사용하여 새로 추가되는 키프레임에 이벤트 바인딩
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.classList && node.classList.contains('keyframe')) {
                const time = parseFloat(node.dataset.time);
                if (isNaN(time)) {
                  console.warn("유효하지 않은 키프레임 시간:", node.dataset.time);
                  return;
                }

                // 키프레임 드래그 이벤트 설정
                let isDragging = false;
                let startX = 0;
                let startY = 0;
                let startLeft = 0;

                node.addEventListener("mousedown", (e) => {
                  isDragging = true;
                  startX = e.clientX;
                  startY = e.clientY;
                  startLeft = parseFloat(node.style.left) || 0;
                  e.stopPropagation();
                });

                document.addEventListener("mousemove", (e) => {
                  if (!isDragging) return;

                  const dx = e.clientX - startX;
                  const dy = e.clientY - startY;

                  const clipElement = node.closest(".animation-sprite");
                  if (!clipElement) return;

                  const clipWidth = clipElement.offsetWidth;
                  const clipDuration = parseFloat(clipElement.dataset.duration) || 5;

                  const newLeft = Math.max(0, Math.min(clipWidth, startLeft + dx));
                  const newTimeInSeconds = (newLeft / clipWidth) * clipDuration;

                  // 삭제 임계값 체크
                  const deleteThreshold = 50;
                  if (dy > deleteThreshold) {
                    // index 기반으로 키프레임 삭제
                    const index = parseInt(node.dataset.index);
                    if (!isNaN(index) && track.uuid) {
                      this.removeKeyframeByIndex(track.uuid, propertyType, index);
                    }
                    node.remove();
                    isDragging = false;
                    return;
                  }

                  // 키프레임 위치 업데이트
                  node.style.left = `${newLeft}px`;
                  node.dataset.time = newTimeInSeconds.toString();
                  node.dataset.pixelPosition = newLeft.toString();

                  // TimelineData 업데이트 (index 기반)
                  if (track.uuid) {
                    const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
                    if (trackData) {
                      const oldTime = time;
                      const index = parseInt(node.dataset.index);

                      if (!isNaN(index)) {
                        // 기존 키프레임의 값과 보간 타입 저장
                        const oldIndex = trackData.findKeyframeIndex(oldTime);
                        if (oldIndex !== -1) {
                          const originalValue = new THREE.Vector3(
                            trackData.values[oldIndex * 3],
                            trackData.values[oldIndex * 3 + 1],
                            trackData.values[oldIndex * 3 + 2]
                          );
                          const originalInterpolation = trackData.interpolations[oldIndex];

                          // 기존 키프레임 제거
                          trackData.removeKeyframe(oldTime);

                          // 새 위치에 키프레임 추가
                          trackData.addKeyframe(newTimeInSeconds, originalValue, originalInterpolation);
                        }
                      }
                    }
                  }

                  // 애니메이션 업데이트
                  this.timelineData.dirty = true;
                  this.timelineData.precomputeAnimationData();
                  this.updateAnimation();
                });

                document.addEventListener("mouseup", () => {
                  if (isDragging) {
                    isDragging = false;
                    this.updateAnimation();
                  }
                });

                // 키프레임 클릭 이벤트 설정
                node.addEventListener("click", (e) => {
                  console.log("click", {
                    time,
                    node
                  });
                  e.stopPropagation();
                  if (track.uuid) {
                    const index = parseInt(node.dataset.index);
                    if (!isNaN(index)) {
                      this.selectKeyframe(track.uuid, time, node);
                    }
                  }
                });
              }
            });
          }
        });
      });

      // observer 설정
      observer.observe(layer, {
        childList: true,
        subtree: true
      });
    });
  }

  // 키프레임 삭제 (인덱스 기반)
  removeKeyframeByIndex(objectId, property, index) {
    const track = this.timelineData.tracks.get(objectId)?.get(property);
    if (track && track.removeKeyframeByIndex(index)) {
      this.updateUI();
      return true;
    }
    return false;
  }

  // 키프레임 삭제 (시간 기반 - 하위 호환성)
  removeKeyframe(objectId, property, time) {
    const track = this.timelineData.tracks.get(objectId)?.get(property);
    if (track && track.removeKeyframe(time)) {
      this.updateUI();
      return true;
    }
    return false;
  }

  // 키프레임 가져오기 (인덱스 기반)
  getKeyframeByIndex(objectId, property, index) {
    const track = this.timelineData.tracks.get(objectId)?.get(property);
    if (track) {
      return track.getKeyframeByIndex(index);
    }
    return null;
  }

  // 키프레임 설정 (인덱스 기반)
  setKeyframeByIndex(objectId, property, index, time, value, interpolation = INTERPOLATION.LINEAR) {
    const track = this.timelineData.tracks.get(objectId)?.get(property);
    if (track && track.setKeyframeByIndex(index, time, value, interpolation)) {
      this.timelineData.updateMaxTime(time);
      this.updateUI();
      return true;
    }
    return false;
  }

  // 키프레임 개수 가져오기
  getKeyframeCount(objectId, property) {
    const track = this.timelineData.tracks.get(objectId)?.get(property);
    if (track) {
      return track.getKeyframeCount();
    }
    return 0;
  }

  // 모든 키프레임 가져오기
  getAllKeyframes(objectId, property) {
    const track = this.timelineData.tracks.get(objectId)?.get(property);
    if (track) {
      return track.getAllKeyframes();
    }
    return [];
  }

  // 선택된 키프레임 삭제 (인덱스 기반)
  deleteSelectedKeyframeByIndex() {
    if (!this.selectedKeyframe) return;

    const { objectId, index, element } = this.selectedKeyframe;

    // 인덱스 기반으로 키프레임 삭제
    if (this.removeKeyframeByIndex(objectId, 'position', index)) {
      // UI 요소 제거
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }

      this.selectedKeyframe = null;
      this.updatePropertyPanel();

      if (this.editor.signals?.sceneGraphChanged) {
        this.editor.signals.sceneGraphChanged.dispatch();
      }
    }
  }
}

export default MotionTimeline;

