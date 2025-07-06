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

        // TimelineData 이벤트 시스템 초기화
        this.setupTimelineDataEvents();

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

            // 키프레임 추가 버튼 이벤트는 bindTrackEvents에서 처리됨
            if (e.target.classList.contains("add-keyframe-btn")) {
                // 이벤트는 bindTrackEvents에서 처리되므로 여기서는 아무것도 하지 않음
                return;
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

        // 키프레임 데이터 추가 (UI는 이벤트 시스템에서 자동 생성)
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

        // TimelineData 업데이트 (UI는 이벤트로 자동 업데이트됨)
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

        // Timeline.js와 동기화
        if (this.editor.scene?.userData?.timeline) {
            this.editor.scene.userData.timeline.currentSeconds = currentTime;
        }

        console.log("=== MotionTimeline updateAnimation ===");
        console.log("현재 시간:", currentTime);
        console.log("TimelineData tracks:", this.timelineData.tracks);
        console.log("TimelineData maxTime:", this.timelineData.maxTime);
        console.log("TimelineData frameRate:", this.timelineData.frameRate);

        // 타임라인 컨테이너에 애니메이션 상태 업데이트
        this.updateTimelineAnimationState(currentTime);

        // 키프레임 강조 상태 업데이트
        this.updateKeyframeStates(currentTime);

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

            // track.element가 null인 경우 안전 검사
            if (!track.element) {
                console.warn(`트랙 요소가 없습니다: ${objectUuid}`);
                return;
            }

            // 클립 범위 확인 및 상대 시간 계산
            const sprites = track.element.querySelectorAll('.animation-sprite');
            let isInActiveClip = false;
            let clipRelativeTime = 0;

            sprites.forEach(sprite => {
                const clipLeft = parseFloat(sprite.style.left) || 0;
                const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                const clipEndTime = clipStartTime + clipDuration;

                // 현재 시간이 클립 범위에 있는지 확인
                if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
                    isInActiveClip = true;
                    // 클립 내에서의 상대 시간 계산 (0 ~ clipDuration)
                    clipRelativeTime = currentTime - clipStartTime;
                }
            });

            // 클립 범위에 있지 않으면 객체를 숨김
            if (!isInActiveClip) {
                object.visible = false;
                return;
            }

            // 클립 범위에 있으면 객체를 보이게 설정
            object.visible = true;

            console.log("객체 데이터 업데이트:", object.name, objectUuid);
            console.log("절대 시간:", currentTime, "클립 상대 시간:", clipRelativeTime);

            // 클립 상대 시간을 사용하여 애니메이션 계산
            objectData.forEach((frames, property) => {
                console.log(`=== ${property} 속성 프레임 정보 ===`);
                console.log(`프레임 배열 길이: ${frames.length / 3} (${frames.length} values)`);

                // 클립 상대 시간을 프레임 인덱스로 변환
                const relativeFrameIndex = Math.floor(clipRelativeTime * this.timelineData.frameRate);
                console.log(`클립 상대 프레임 인덱스: ${relativeFrameIndex}`);

                // 실제 trackData와 비교
                const actualTrackData = this.timelineData.tracks.get(objectUuid)?.get(property);
                if (actualTrackData) {
                    console.log(`=== 실제 trackData 상태 (${property}) ===`);
                    console.log(`키프레임 개수: ${actualTrackData.keyframeCount}`);
                    console.log(`시간 배열: ${Array.from(actualTrackData.times.slice(0, actualTrackData.keyframeCount))}`);
                    console.log(`값 배열: ${Array.from(actualTrackData.values.slice(0, actualTrackData.keyframeCount * 3))}`);
                }

                // 안전한 프레임 인덱스 범위 체크
                if (relativeFrameIndex >= 0 && relativeFrameIndex < frames.length / 3) {
                    const value = new THREE.Vector3(
                        frames[relativeFrameIndex * 3],
                        frames[relativeFrameIndex * 3 + 1],
                        frames[relativeFrameIndex * 3 + 2]
                    );
                    console.log(`${property} 속성 업데이트:`, value);
                    console.log(`상대 프레임 인덱스: ${relativeFrameIndex}, 프레임 배열 길이: ${frames.length / 3}`);
                    this.applyValue(object, property, value);
                } else {
                    console.warn(`상대 프레임 인덱스 ${relativeFrameIndex}가 범위를 벗어남. 프레임 배열 길이: ${frames.length / 3}`);

                    // 범위를 벗어난 경우 가장 가까운 유효한 인덱스 사용
                    let safeIndex = relativeFrameIndex;
                    if (relativeFrameIndex < 0) {
                        safeIndex = 0;
                    } else if (relativeFrameIndex >= frames.length / 3) {
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

        // FBX 애니메이션 업데이트 (클립 범위에 있을 때만)
        if (this.isPlaying) {
            this.mixers.forEach((mixer, uuid) => {
                const object = this.editor.scene.getObjectByProperty('uuid', uuid);
                if (!object) return;

                // 해당 객체의 클립 범위 확인
                const track = this.tracksByUuid.get(uuid);
                if (!track) return;

                // track.element가 null인 경우 안전 검사
                if (!track.element) {
                    console.warn(`트랙 요소가 없습니다: ${uuid}`);
                    return;
                }

                const sprites = track.element.querySelectorAll('.animation-sprite');
                let isInActiveClip = false;
                let clipRelativeTime = 0;

                sprites.forEach(sprite => {
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                    const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                    const clipEndTime = clipStartTime + clipDuration;

                    if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
                        isInActiveClip = true;
                        clipRelativeTime = currentTime - clipStartTime;
                    }
                });

                // 클립 범위에 있을 때만 FBX 애니메이션 업데이트
                if (isInActiveClip && object.animations && object.animations.length > 0) {
                    // FBX 애니메이션도 클립 상대 시간으로 설정
                    mixer.setTime(clipRelativeTime);
                    object.visible = true;
                } else {
                    object.visible = false;
                }
            });
        }
    }

    // 타임라인 애니메이션 상태 업데이트 (data-* 속성 활용)
    updateTimelineAnimationState(currentTime) {
        // 타임라인 컨테이너에 애니메이션 상태 정보 추가
        this.container.dataset.animationTime = currentTime.toFixed(3);
        this.container.dataset.animationFrame = Math.floor(currentTime * this.timelineData.frameRate).toString();
        this.container.dataset.isPlaying = this.isPlaying.toString();
        this.container.dataset.maxTime = this.timelineData.maxTime.toFixed(3);
        this.container.dataset.frameRate = this.timelineData.frameRate.toString();
        this.container.dataset.totalSeconds = this.options.totalSeconds.toString();

        // 현재 재생 중인 클립들 찾아서 상태 업데이트
        this.tracksByUuid.forEach((track, objectUuid) => {
            // track.element가 null인 경우 안전 검사
            if (!track || !track.element) {
                console.warn(`트랙 또는 트랙 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const sprites = track.element.querySelectorAll('.animation-sprite');
            sprites.forEach(sprite => {
                const clipLeft = parseFloat(sprite.style.left) || 0;
                const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                const clipEndTime = clipStartTime + clipDuration;

                // 클립이 현재 시간에 재생 중인지 확인
                const isActive = currentTime >= clipStartTime && currentTime <= clipEndTime;
                sprite.dataset.isActive = isActive.toString();

                if (isActive) {
                    // 클립 내에서의 상대 시간 계산
                    const relativeTime = currentTime - clipStartTime;
                    const relativeProgress = (relativeTime / clipDuration) * 100;
                    sprite.dataset.relativeTime = relativeTime.toFixed(3);
                    sprite.dataset.relativeProgress = relativeProgress.toFixed(1);
                    sprite.dataset.clipStartTime = clipStartTime.toFixed(3);
                    sprite.dataset.clipEndTime = clipEndTime.toFixed(3);
                } else {
                    // 비활성 상태일 때 속성 제거
                    delete sprite.dataset.relativeTime;
                    delete sprite.dataset.relativeProgress;
                    delete sprite.dataset.clipStartTime;
                    delete sprite.dataset.clipEndTime;
                }
            });
        });

        // 키프레임 상태 업데이트
        this.updateKeyframeStates(currentTime);
    }

    // 키프레임 상태 업데이트 (data-* 속성 활용)
    updateKeyframeStates(currentTime) {
        this.tracksByUuid.forEach((track, objectUuid) => {
            // track.element가 null인 경우 안전 검사
            if (!track || !track.element) {
                console.warn(`트랙 또는 트랙 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const keyframes = track.element.querySelectorAll('.keyframe');
            keyframes.forEach(keyframe => {
                const keyframeTime = parseFloat(keyframe.dataset.time) || 0;

                // 클립 기준으로 상대 시간 계산
                const sprite = keyframe.closest('.animation-sprite');
                let timeDiff = Infinity;
                let isCurrent = false;

                if (sprite) {
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                    const clipDuration = parseFloat(sprite.dataset.duration) || 5;

                    // 현재 시간이 클립 범위에 있는지 확인
                    if (currentTime >= clipStartTime && currentTime <= clipStartTime + clipDuration) {
                        // 클립 내에서의 상대 시간 계산
                        const relativeTime = currentTime - clipStartTime;
                        // 키프레임의 상대 시간과 비교 (keyframeTime은 이미 클립 내 상대 시간)
                        timeDiff = Math.abs(keyframeTime - relativeTime);
                        isCurrent = timeDiff < 0.1; // 0.1초 이내면 현재 키프레임으로 간주
                    }
                }

                // 기존 current 클래스 제거
                keyframe.classList.remove('current');

                keyframe.dataset.isCurrent = isCurrent.toString();
                keyframe.dataset.timeDiff = timeDiff.toFixed(3);

                if (isCurrent) {
                    keyframe.classList.add('current');
                    keyframe.dataset.currentTime = currentTime.toFixed(3);
                } else {
                    delete keyframe.dataset.currentTime;
                }
            });
        });
    }

    // data-* 속성을 통한 애니메이션 제어 메서드들
    setAnimationProperty(property, value) {
        this.container.dataset[property] = value.toString();

        // 특정 속성에 따른 추가 처리
        switch (property) {
            case 'isPlaying':
                // 무한 재귀 방지: 현재 상태와 다른 경우에만 처리
                const currentIsPlaying = this.isPlaying;
                const newIsPlaying = value === 'true';

                if (currentIsPlaying !== newIsPlaying) {
                    if (newIsPlaying) {
                        this.play();
                    } else {
                        this.pause();
                    }
                }
                break;
            case 'currentTime':
                this.currentTime = parseFloat(value);
                this.updateAnimation(this.currentTime);
                break;
            case 'frameRate':
                this.timelineData.frameRate = parseInt(value);
                this.timelineData.dirty = true;
                break;
        }
    }

    getAnimationProperty(property) {
        return this.container.dataset[property];
    }

    // 모든 애니메이션 속성 가져오기
    getAllAnimationProperties() {
        const properties = {};
        for (const [key, value] of Object.entries(this.container.dataset)) {
            if (key.startsWith('animation') || key.startsWith('is') || key.startsWith('current') ||
                key.startsWith('max') || key.startsWith('frame') || key.startsWith('total')) {
                properties[key] = value;
            }
        }
        return properties;
    }

    // 클립별 애니메이션 상태 가져오기
    getClipAnimationStates() {
        const states = {};
        this.tracksByUuid.forEach((track, objectUuid) => {
            // track.element가 null인 경우 안전 검사
            if (!track || !track.element) {
                console.warn(`트랙 또는 트랙 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const sprites = track.element.querySelectorAll('.animation-sprite');
            states[objectUuid] = Array.from(sprites).map(sprite => ({
                element: sprite,
                isActive: sprite.dataset.isActive === 'true',
                relativeTime: parseFloat(sprite.dataset.relativeTime) || 0,
                relativeProgress: parseFloat(sprite.dataset.relativeProgress) || 0,
                clipStartTime: parseFloat(sprite.dataset.clipStartTime) || 0,
                clipEndTime: parseFloat(sprite.dataset.clipEndTime) || 0,
                duration: parseFloat(sprite.dataset.duration) || 5
            }));
        });
        return states;
    }

    // 키프레임별 애니메이션 상태 가져오기
    getKeyframeAnimationStates() {
        const states = {};
        this.tracksByUuid.forEach((track, objectUuid) => {
            // track.element가 null인 경우 안전 검사
            if (!track || !track.element) {
                console.warn(`트랙 또는 트랙 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const keyframes = track.element.querySelectorAll('.keyframe');
            states[objectUuid] = Array.from(keyframes).map(keyframe => ({
                element: keyframe,
                isCurrent: keyframe.dataset.isCurrent === 'true',
                timeDiff: parseFloat(keyframe.dataset.timeDiff) || 0,
                currentTime: parseFloat(keyframe.dataset.currentTime) || 0,
                time: parseFloat(keyframe.dataset.time) || 0,
                property: keyframe.dataset.property || 'position'
            }));
        });
        return states;
    }

    play() {
        console.log("=== MotionTimeline play() ===");
        if (this.isPlaying) return;

        // data-* 속성으로 재생 상태 설정 (무한 재귀 방지를 위해 직접 설정)
        this.container.dataset.isPlaying = 'true';
        this.isPlaying = true;

        // 키프레임 변경사항이 있을 수 있으므로 TimelineData 강제 업데이트
        if (this.timelineData.dirty) {
            console.log("TimelineData가 dirty 상태입니다. precomputeAnimationData를 실행합니다.");
            this.timelineData.precomputeAnimationData();
            this.setAnimationProperty('maxTime', this.timelineData.maxTime);
        }

        // 현재 시간이 0이거나 totalSeconds보다 크면 0으로 리셋
        if (this.currentTime === 0 || this.currentTime >= this.options.totalSeconds) {
            this.currentTime = 0;
            this.setAnimationProperty('currentTime', 0);
            this.setAnimationProperty('animationFrame', 0);
            console.log("currentTime을 0으로 리셋합니다.");
        }

        // 현재 시간에 맞춰 애니메이션 상태 업데이트
        this.updateAnimation(this.currentTime);

        // FBX 애니메이션 재생
        this.mixers.forEach((mixer, uuid) => {
            const object = this.editor.scene.getObjectByProperty('uuid', uuid);
            if (object && object.animations && object.animations.length > 0) {
                mixer.timeScale = 1;
                object.animations.forEach(clip => {
                    const action = mixer.clipAction(clip);
                    action.setLoop(THREE.LoopRepeat);
                    action.clampWhenFinished = true;
                    action.enabled = true;
                    action.play();
                });
                object.visible = true;
            }
        });

        console.log("애니메이션 재생 시작:", {
            currentTime: this.currentTime,
            frameRate: this.timelineData.frameRate,
            maxTime: this.timelineData.maxTime,
            timelineIsPlaying: this.editor.scene?.userData?.timeline?.isPlaying
        });

        // Timeline.js에서 호출된 경우에도 자체 animate() 루프를 시작하지 않음
        // Timeline.js의 animate() 루프에서 updateAnimation()을 호출하므로 중복 방지
        // 하지만 Timeline.js가 재생 중이지 않을 때는 자체 루프 시작
        if (!this.editor.scene?.userData?.timeline?.isPlaying) {
            console.log("Timeline.js가 재생 중이 아니므로 자체 animate() 루프를 시작합니다.");
            this.animate();
        } else {
            console.log("Timeline.js가 재생 중이므로 자체 animate() 루프를 시작하지 않습니다.");
        }
    }

    pause() {
        console.log("=== MotionTimeline pause() ===");
        if (!this.isPlaying) return;

        // data-* 속성으로 일시정지 상태 설정 (무한 재귀 방지를 위해 직접 설정)
        this.container.dataset.isPlaying = 'false';
        this.isPlaying = false;

        // FBX 애니메이션 일시정지
        this.mixers.forEach((mixer) => {
            mixer.timeScale = 0;
        });

        console.log("애니메이션 일시정지:", {
            currentTime: this.currentTime,
            frame: Math.floor(this.currentTime * this.timelineData.frameRate)
        });
    }

    stop() {
        console.log("=== MotionTimeline stop() ===");
        if (!this.isPlaying && this.currentTime === 0) return;

        // data-* 속성으로 정지 상태 설정 (무한 재귀 방지를 위해 직접 설정)
        this.container.dataset.isPlaying = 'false';
        this.container.dataset.currentTime = '0';
        this.container.dataset.animationFrame = '0';
        this.isPlaying = false;
        this.currentTime = 0;

        // 루프 상태 해제
        delete this.container.dataset.animationLoop;

        // FBX 애니메이션 정지
        this.mixers.forEach((mixer) => {
            mixer.stopAllAction();
            mixer.time = 0;
        });

        // 애니메이션 상태 초기화
        this.updateAnimation(0);

        console.log("애니메이션 정지 및 초기화 완료");
    }

    animate() {
        if (!this.isPlaying) return;

        // Timeline.js에서 호출된 경우 자체 루프를 시작하지 않음
        if (this.editor.scene?.userData?.timeline?.isPlaying) {
            console.log("Timeline.js에서 호출된 경우 자체 animate() 루프를 시작하지 않습니다.");
            return;
        }

        // data-* 속성을 통한 애니메이션 상태 관리 (무한 재귀 방지를 위해 직접 설정)
        this.container.dataset.isPlaying = 'true';

        console.log("=== animate() 실행 ===");
        console.log("현재 시간:", this.currentTime);
        console.log("프레임 레이트:", this.timelineData.frameRate);

        // TimelineData 상태 확인 및 업데이트
        if (this.timelineData.dirty) {
            console.log("TimelineData가 dirty 상태입니다. precomputeAnimationData를 실행합니다.");
            this.timelineData.precomputeAnimationData();
            this.setAnimationProperty('maxTime', this.timelineData.maxTime);
        }

        // 시간 업데이트
        const deltaTime = 1 / this.timelineData.frameRate;
        this.currentTime += deltaTime;

        // data-* 속성으로 현재 시간 업데이트 (무한 재귀 방지를 위해 직접 설정)
        this.container.dataset.currentTime = this.currentTime.toString();
        this.container.dataset.animationFrame = Math.floor(this.currentTime * this.timelineData.frameRate).toString();

        // 애니메이션 루프 처리
        const maxAllowedTime = Math.max(this.options.totalSeconds, this.timelineData.maxTime * 1.1);
        if (this.currentTime >= maxAllowedTime) {
            console.log("애니메이션 루프: currentTime이 최대 허용 시간에 도달함", {
                currentTime: this.currentTime,
                maxAllowedTime: maxAllowedTime,
                totalSeconds: this.options.totalSeconds,
                maxTime: this.timelineData.maxTime
            });

            this.currentTime = 0;
            this.container.dataset.currentTime = '0';
            this.container.dataset.animationFrame = '0';

            // 루프 상태 표시
            this.container.dataset.animationLoop = 'true';

            // FBX 애니메이션 루프 처리 (필요시)
            this.mixers.forEach((mixer, uuid) => {
                const object = this.editor.scene.getObjectByProperty('uuid', uuid);
                if (object && object.animations && object.animations.length > 0) {
                    mixer.time = 0;
                    object.visible = true;
                }
            });
        } else {
            // 루프 상태 해제
            delete this.container.dataset.animationLoop;
        }

        // FBX 애니메이션 업데이트 (재생 중일 때만)
        this.mixers.forEach((mixer, uuid) => {
            const object = this.editor.scene.getObjectByProperty('uuid', uuid);
            if (object && object.animations && object.animations.length > 0) {
                mixer.update(deltaTime);
                object.visible = true;
            }
        });

        // 키프레임 애니메이션 업데이트 (data-* 속성 활용)
        this.updateAnimation(this.currentTime);

        // 성능 모니터링 (선택적)
        if (this.currentTime % 1 < deltaTime) { // 매 초마다
            console.log("애니메이션 상태:", {
                currentTime: this.currentTime.toFixed(3),
                frame: Math.floor(this.currentTime * this.timelineData.frameRate),
                isPlaying: this.isPlaying,
                activeClips: this.getClipAnimationStates(),
                currentKeyframes: this.getKeyframeAnimationStates()
            });
        }

        // 다음 프레임 요청
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

    addTrack(objectUuid, objectId, objectName, skipInitialKeyframe = false) {
        console.log("addTrack called with:", { objectUuid, objectId, objectName, skipInitialKeyframe });

        // 기존 트랙이 있는지 확인 (objectId와 objectUuid 모두 확인)
        if (this.tracks.has(objectId) || this.tracksByUuid.has(objectUuid)) {
            console.log("기존 트랙이 이미 존재합니다:", { objectId, objectUuid });
            return this.tracks.get(objectId) || this.tracksByUuid.get(objectUuid);
        }

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

            // TimelineData에 기존 키프레임이 있는지 확인
            const existingTrackData = this.timelineData.tracks.get(objectUuid)?.get('position');
            if (existingTrackData && existingTrackData.keyframeCount > 0) {
                console.log(`기존 키프레임 데이터가 있습니다: ${existingTrackData.keyframeCount}개`);
                // 기존 키프레임 데이터가 있으면 UI 업데이트만 수행
                // 약간의 지연을 두어 DOM이 완전히 생성된 후 업데이트
                setTimeout(() => {
                    this.updateTrackUI(track, this.currentTime);
                }, 50);
            } else if (!skipInitialKeyframe) {
                // 초기 키프레임 추가 (시간 0에서 position만) - 이벤트 시스템으로 자동 처리됨
                const position = new THREE.Vector3(
                    object.position.x,
                    object.position.y,
                    object.position.z
                );

                // position 속성에 대한 키프레임만 추가 (UI는 이벤트로 자동 생성됨)
                this.addKeyframe(objectUuid, 'position', 0, position);
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
                sprite.classList.add('dragging'); // 드래그 시작 시 클래스 추가
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
                // 클립 크기 조정이 완료된 후에만 키프레임 업데이트
                if (isResizing) {
                    this.updateKeyframesInClip(track, sprite);
                }

                // dragging 클래스 제거
                sprite.classList.remove('dragging');

                isDragging = false;
                isResizing = false;
                hasMoved = false;
                this.updateAnimation(); // 애니메이션 업데이트만 유지
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

        // 클립을 늘릴 때는 키프레임의 CSS 위치만 업데이트하고 TimelineData는 건드리지 않음
        keyframes.forEach((keyframe) => {
            const pixelPosition = parseFloat(keyframe.dataset.pixelPosition);
            const propertyType = keyframe.dataset.property;

            // 클립을 늘릴 때 키프레임이 사라지지 않도록 수정
            // pixelPosition이 클립 범위를 벗어나도 키프레임을 유지하고 위치만 조정
            let adjustedPixelPosition = pixelPosition;

            // pixelPosition이 클립 범위를 벗어난 경우 클립 경계로 조정
            if (pixelPosition < 0) {
                adjustedPixelPosition = 0;
            } else if (pixelPosition > spriteWidth) {
                adjustedPixelPosition = spriteWidth;
            }

            console.log("키프레임 위치 업데이트:", {
                originalPixelPosition: pixelPosition,
                adjustedPixelPosition,
                spriteWidth,
                propertyType
            });

            // 키프레임의 CSS 위치만 업데이트 (TimelineData는 건드리지 않음)
            const percentPosition = (adjustedPixelPosition / spriteWidth) * 100;
            keyframe.style.left = `${percentPosition}%`;

            // 조정된 pixelPosition도 업데이트
            keyframe.dataset.pixelPosition = adjustedPixelPosition.toString();
        });

        // TimelineData 업데이트는 하지 않음 (키프레임 시간은 재생 시에만 계산)
        console.log("클립 크기 조정 완료 - 키프레임 위치만 업데이트됨");
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

        // 스프라이트의 실제 너비를 정확히 가져오기
        const spriteWidth = sprite.offsetWidth || sprite.getBoundingClientRect().width;

        console.log("updateTrackUI - 클립 정보:", {
            clipLeft,
            clipStartTime,
            clipDuration,
            spriteWidth,
            spriteStyleWidth: sprite.style.width,
            spriteOffsetWidth: sprite.offsetWidth
        });

        for (let i = 0; i < trackData.keyframeCount; i++) {
            const keyframeTime = trackData.times[i];
            const keyframeElement = document.createElement('div');
            keyframeElement.className = 'keyframe';
            keyframeElement.dataset.property = 'position';
            keyframeElement.dataset.time = keyframeTime;
            keyframeElement.dataset.index = i;

            // 클립 기준의 상대적 시간 계산
            console.log("키프레임 위치 계산:", {
                keyframeTime,
                clipStartTime,
                clipDuration,
                spriteWidth
            });

            const relativeTime = keyframeTime - clipStartTime;

            // 클립 내에서의 상대적 위치 계산 (픽셀 단위)
            const relativePosition = (relativeTime / clipDuration) * spriteWidth;
            keyframeElement.style.left = `${relativePosition}px`;
            keyframeElement.dataset.pixelPosition = relativePosition.toString();

            console.log("키프레임 위치 계산 결과:", {
                relativeTime,
                relativePosition,
                finalLeft: keyframeElement.style.left
            });

            // 현재 시간과 일치하는 키프레임 강조 (data-is-current 속성 사용)
            const timeDiff = Math.abs(keyframeTime - time);
            const isCurrent = timeDiff < 0.1; // 0.1초 이내면 현재 키프레임으로 간주

            keyframeElement.dataset.isCurrent = isCurrent.toString();
            keyframeElement.dataset.timeDiff = timeDiff.toFixed(3);

            if (isCurrent) {
                keyframeElement.classList.add('current');
                keyframeElement.dataset.currentTime = time.toFixed(3);
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

    // 키프레임 드래그 가능하게 만들기 (안전한 버전)
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
        let isOutsideClip = false;
        let dragStartIndex = -1;
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
                const trackData = this.timelineData.tracks.get(track.uuid)?.get(property);
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

                    // 시간 계산 및 업데이트 (절대 시간으로 변경)
                    const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;

                    // 클립 내에서의 상대 시간 계산
                    const relativeTimeInClip = (newLeft / spriteRect.width) * clipDuration;

                    // 절대 시간 계산 (클립 시작 시간 + 클립 내 상대 시간)
                    const newTimeInSeconds = clipStartTime + relativeTimeInClip;

                    console.log("드래그 중 - 시간 계산:", {
                        newLeft,
                        spriteRectWidth: spriteRect.width,
                        clipDuration,
                        clipLeft,
                        clipStartTime,
                        relativeTimeInClip,
                        newTimeInSeconds
                    });

                    // TimelineData 업데이트 (안전한 방식)
                    if (track.uuid) {
                        console.log("TimelineData 업데이트");
                        const trackData = this.timelineData.tracks.get(track.uuid)?.get(property);
                        if (trackData) {
                            // 드래그 시작 시점의 인덱스 사용
                            if (dragStartIndex < 0 || dragStartIndex >= trackData.keyframeCount) {
                                console.warn("유효하지 않은 드래그 시작 인덱스:", dragStartIndex);
                                return;
                            }

                            console.log("=== 키프레임 드래그 전 상태 ===");
                            console.log("trackData.keyframeCount:", trackData.keyframeCount);
                            console.log("dragStartIndex:", dragStartIndex);
                            console.log("기존 시간:", trackData.times[dragStartIndex]);
                            console.log("새로운 시간:", newTimeInSeconds);

                            // 안전한 키프레임 시간 업데이트 사용
                            if (trackData.updateKeyframeTime(dragStartIndex, newTimeInSeconds)) {
                                // 새로운 인덱스 찾기 (정렬 후)
                                const newIndex = trackData.findKeyframeIndex(newTimeInSeconds);
                                if (newIndex !== -1) {
                                    keyframeElement.dataset.index = newIndex.toString();
                                    console.log("새 키프레임 인덱스 업데이트:", newIndex);
                                }

                                // TimelineData의 maxTime 업데이트
                                this.timelineData.updateMaxTime(newTimeInSeconds);
                                console.log("maxTime 업데이트 완료:", newTimeInSeconds);

                                // UI의 dataset.time 업데이트
                                keyframeElement.dataset.time = newTimeInSeconds.toString();
                                console.log("키프레임 시간 업데이트 완료:", newTimeInSeconds);

                                // TimelineData 업데이트
                                this.timelineData.dirty = true;
                                this.timelineData.precomputeAnimationData();

                                // 현재 시간에 맞춰 애니메이션 즉시 업데이트
                                this.updateAnimation(this.currentTime);

                                console.log("=== 키프레임 드래그 후 상태 확인 ===");
                                console.log("현재 시간:", this.currentTime);
                                console.log("업데이트된 키프레임 시간:", newTimeInSeconds);
                                console.log("TimelineData dirty 상태:", this.timelineData.dirty);
                                console.log("precomputedData 존재 여부:", !!this.timelineData.precomputedData);

                                // 객체에 즉시 적용되는지 확인
                                const object = this.editor.scene.getObjectByProperty('uuid', track.uuid);
                                if (object) {
                                    console.log("객체 현재 위치:", object.position);
                                }
                            } else {
                                console.warn("키프레임 시간 업데이트 실패");
                            }
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
        let startY = 0;
        let startLeft = 0;
        let isOutsideClip = false;
        let dragStartIndex = -1;
        const REMOVE_THRESHOLD = 50;

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
            startY = e.clientY;
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
                const dy = e.clientY - startY;
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

                    // 시간 계산 및 업데이트 (절대 시간으로 변경)
                    const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;

                    // 클립 내에서의 상대 시간 계산
                    const relativeTimeInClip = (newLeft / spriteRect.width) * clipDuration;

                    // 절대 시간 계산 (클립 시작 시간 + 클립 내 상대 시간)
                    const newTimeInSeconds = clipStartTime + relativeTimeInClip;

                    console.log("속성 키프레임 드래그 중 - 새 시간:", newTimeInSeconds, "시작 인덱스:", dragStartIndex);

                    // TimelineData 업데이트 (안전한 방식)
                    if (track.uuid) {
                        console.log("TimelineData 업데이트");
                        const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
                        if (trackData) {
                            // 드래그 시작 시점의 인덱스 사용
                            if (dragStartIndex < 0 || dragStartIndex >= trackData.keyframeCount) {
                                console.warn("유효하지 않은 드래그 시작 인덱스:", dragStartIndex);
                                return;
                            }

                            console.log("=== 키프레임 드래그 전 상태 ===");
                            console.log("trackData.keyframeCount:", trackData.keyframeCount);
                            console.log("dragStartIndex:", dragStartIndex);
                            console.log("기존 시간:", trackData.times[dragStartIndex]);
                            console.log("새로운 시간:", newTimeInSeconds);

                            // 안전한 키프레임 시간 업데이트 사용
                            if (trackData.updateKeyframeTime(dragStartIndex, newTimeInSeconds)) {
                                // 새로운 인덱스 찾기 (정렬 후)
                                const newIndex = trackData.findKeyframeIndex(newTimeInSeconds);
                                if (newIndex !== -1) {
                                    keyframeElement.dataset.index = newIndex.toString();
                                    console.log("새 키프레임 인덱스 업데이트:", newIndex);
                                }

                                // TimelineData의 maxTime 업데이트
                                this.timelineData.updateMaxTime(newTimeInSeconds);
                                console.log("maxTime 업데이트 완료:", newTimeInSeconds);

                                // UI의 dataset.time 업데이트
                                keyframeElement.dataset.time = newTimeInSeconds.toString();
                                console.log("키프레임 시간 업데이트 완료:", newTimeInSeconds);

                                // TimelineData 업데이트
                                this.timelineData.dirty = true;
                                this.timelineData.precomputeAnimationData();

                                // 현재 시간에 맞춰 애니메이션 즉시 업데이트
                                this.updateAnimation(this.currentTime);

                                console.log("=== 키프레임 드래그 후 상태 확인 ===");
                                console.log("현재 시간:", this.currentTime);
                                console.log("업데이트된 키프레임 시간:", newTimeInSeconds);
                                console.log("TimelineData dirty 상태:", this.timelineData.dirty);
                                console.log("precomputedData 존재 여부:", !!this.timelineData.precomputedData);

                                // 객체에 즉시 적용되는지 확인
                                const object = this.editor.scene.getObjectByProperty('uuid', track.uuid);
                                if (object) {
                                    console.log("객체 현재 위치:", object.position);
                                }
                            } else {
                                console.warn("키프레임 시간 업데이트 실패");
                            }
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

                // .time-ruler-container 기준으로 playhead 위치 계산
                const timeRulerContainer = document.querySelector('.time-ruler-container');
                if (!timeRulerContainer) {
                    console.warn('.time-ruler-container를 찾을 수 없습니다.');
                    return;
                }

                const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                const playheadRect = playhead.getBoundingClientRect();
                const playheadRelativeToTimeRuler = playheadRect.left - timeRulerRect.left;
                const timeRulerWidth = timeRulerRect.width;

                // .time-ruler-container에서의 playhead 시간 계산
                const playheadTimeInSeconds = (playheadRelativeToTimeRuler / timeRulerWidth) * this.options.totalSeconds;

                // 클립 정보 가져오기
                const clipLeft = parseFloat(sprite.style.left) || 0;
                const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                const clipEndTime = clipStartTime + clipDuration;

                // 키프레임이 클립 범위 밖에 있으면 추가하지 않음
                if (playheadTimeInSeconds < clipStartTime || playheadTimeInSeconds > clipEndTime) {
                    console.warn("키프레임 추가 버튼 - 클립 범위 밖:", {
                        playheadTimeInSeconds,
                        clipStartTime,
                        clipEndTime,
                        clipDuration
                    });
                    return;
                }

                console.log("키프레임 추가 - 시간 계산:", {
                    playheadRelativeToTimeline: playheadTimeInSeconds - clipStartTime,
                    timelineWidth: timeRulerWidth,
                    totalSeconds: this.options.totalSeconds,
                    playheadTimeInSeconds,
                    clipLeft,
                    clipStartTime,
                    clipEndTime,
                    // 클립 기준 상대 시간 (키프레임 left 위치 계산용)
                    relativeTimeInClip: playheadTimeInSeconds - clipStartTime
                });

                // position 속성만 추가 (기본적으로 position만 사용)
                const propertyType = 'position';
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

                    this.addKeyframe(track.uuid, propertyType, playheadTimeInSeconds, value);
                }
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

                // .time-ruler-container 기준으로 클릭 위치 계산
                const timeRulerContainer = document.querySelector('.time-ruler-container');
                if (!timeRulerContainer) {
                    console.warn('.time-ruler-container를 찾을 수 없습니다.');
                    return;
                }

                const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                const clickRelativeToTimeRuler = e.clientX - timeRulerRect.left;
                const timeRulerWidth = timeRulerRect.width;

                // .time-ruler-container에서의 클릭 시간 계산
                const clickTimeInSeconds = (clickRelativeToTimeRuler / timeRulerWidth) * this.options.totalSeconds;

                // 클립 정보 가져오기
                const clipLeft = parseFloat(sprite.style.left) || 0;
                const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                const clipEndTime = clipStartTime + clipDuration;

                // 클릭이 클립 범위 밖에 있으면 추가하지 않음
                if (clickTimeInSeconds < clipStartTime || clickTimeInSeconds > clipEndTime) {
                    console.warn("키프레임 레이어 클릭 - 클립 범위 밖:", {
                        clickTimeInSeconds,
                        clipStartTime,
                        clipEndTime,
                        clipDuration
                    });
                    return;
                }

                console.log("키프레임 레이어 클릭 - 시간 계산:", {
                    clickRelativeToTimeline: clickTimeInSeconds - clipStartTime,
                    timelineWidth: timeRulerWidth,
                    totalSeconds: this.options.totalSeconds,
                    clickTimeInSeconds,
                    clipLeft,
                    clipStartTime,
                    clipEndTime,
                    // 클립 기준 상대 시간 (키프레임 left 위치 계산용)
                    relativeTimeInClip: clickTimeInSeconds - clipStartTime
                });

                const value = this.getKeyframeValue(object, propertyType);
                if (!value) {
                    console.warn("키프레임 값을 가져올 수 없습니다:", { objectId, propertyType });
                    return;
                }

                if (track.uuid) {
                    this.addKeyframe(track.uuid, propertyType, clickTimeInSeconds, value);
                }
            });

            // MutationObserver 제거 - 이벤트 시스템에서 자동으로 처리됨
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

    // JSON 로드 후 호출되는 메서드 (Editor.js에서 호출됨)
    onAfterLoad() {
        try {
            console.log("=== MotionTimeline onAfterLoad 시작 ===");

            // scene.userData에서 motionTimeline 데이터 확인
            if (this.editor.scene && this.editor.scene.userData && this.editor.scene.userData.motionTimeline) {
                console.log("scene.userData.motionTimeline:", this.editor.scene.userData.motionTimeline);

                // timelineData가 비어있고 scene.userData에 데이터가 있으면 복원
                if (!this.timelineData || this.timelineData.tracks.size === 0) {
                    console.log("scene.userData에서 timelineData 복원 중...");
                    this.timelineData.fromJSON(this.editor.scene.userData.motionTimeline);
                    console.log("복원된 timelineData:", this.timelineData);
                }
            }

            // timelineData가 여전히 비어있으면 아무것도 하지 않음
            if (!this.timelineData || this.timelineData.tracks.size === 0) {
                console.log("timelineData가 비어있으므로 아무것도 하지 않습니다.");
                return;
            }

            // TimelineData에서 UI 트랙 생성
            console.log("TimelineData에서 UI 트랙 생성 중...");
            this.timelineData.tracks.forEach((objectTracks, objectUuid) => {
                console.log(`객체 ${objectUuid}의 트랙 생성 중:`, objectTracks);

                // 씬에서 해당 객체 찾기
                const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
                if (object) {
                    console.log(`객체를 찾았습니다: ${object.name} (${objectUuid})`);

                    // objectId 생성 (UUID의 일부 사용)
                    const objectId = objectUuid.split('-')[0] || objectUuid;

                    // addTrack 메서드로 UI 트랙 생성 (기존 키프레임 스킵)
                    const track = this.addTrack(objectUuid, objectId, object.name, true);
                    console.log(`UI 트랙 생성 완료:`, track);
                } else {
                    console.warn(`객체를 찾을 수 없습니다: ${objectUuid}`);
                }
            });

            // 애니메이션 상태 복원
            console.log("precomputeAnimationData 실행 중...");
            this.timelineData.precomputeAnimationData();

            // UI가 완전히 로드되었는지 확인 후 애니메이션 업데이트
            setTimeout(() => {
                console.log("updateAnimation 실행 중...");
                this.updateAnimation();

                // 모든 트랙의 UI 업데이트 강제 실행
                this.tracksByUuid.forEach((track, objectUuid) => {
                    if (track && track.element) {
                        console.log(`트랙 UI 업데이트: ${objectUuid}`);
                        this.updateTrackUI(track, this.currentTime);
                    }
                });
            }, 100); // 100ms 지연으로 UI 로드 완료 보장

            console.log("=== MotionTimeline onAfterLoad 완료 ===");
        } catch (error) {
            console.error("타임라인 데이터 로드 중 오류:", error);
        }
    }

    // JSON 저장 전 호출되는 메서드 (Editor.js에서 호출될 수 있음)
    onBeforeSave() {
        try {
            console.log("=== MotionTimeline onBeforeSave 시작 ===");

            // scene.userData에 현재 상태 저장
            if (this.editor.scene && this.timelineData) {
                this.editor.scene.userData.motionTimeline = this.timelineData.toJSON();
                console.log("scene.userData.motionTimeline 저장 완료");
            }

            console.log("=== MotionTimeline onBeforeSave 완료 ===");
        } catch (error) {
            console.error("타임라인 데이터 저장 중 오류:", error);
        }
    }

    // 사용 예제: data-* 속성을 활용한 애니메이션 제어
    exampleUsage() {
        console.log("=== data-* 속성 기반 애니메이션 시스템 사용 예제 ===");

        // 1. 애니메이션 상태 확인
        const animationProps = this.getAllAnimationProperties();
        console.log("현재 애니메이션 속성:", animationProps);

        // 2. 특정 속성 설정
        this.setAnimationProperty('frameRate', 60);
        this.setAnimationProperty('currentTime', 2.5);

        // 3. 클립 상태 확인
        const clipStates = this.getClipAnimationStates();
        console.log("클립 상태:", clipStates);

        // 4. 키프레임 상태 확인
        const keyframeStates = this.getKeyframeAnimationStates();
        console.log("키프레임 상태:", keyframeStates);

        // 5. 애니메이션 제어
        this.play();  // 재생 시작
        setTimeout(() => this.pause(), 2000);  // 2초 후 일시정지
        setTimeout(() => this.play(), 4000);   // 4초 후 재생 재개
        setTimeout(() => this.stop(), 6000);   // 6초 후 정지
    }

    // 애니메이션 상태 모니터링
    startAnimationMonitoring() {
        console.log("애니메이션 모니터링 시작");

        const monitorInterval = setInterval(() => {
            if (!this.isPlaying) {
                clearInterval(monitorInterval);
                console.log("애니메이션 모니터링 종료");
                return;
            }

            const states = {
                time: this.getAnimationProperty('currentTime'),
                frame: this.getAnimationProperty('animationFrame'),
                isPlaying: this.getAnimationProperty('isPlaying'),
                maxTime: this.getAnimationProperty('maxTime'),
                frameRate: this.getAnimationProperty('frameRate'),
                activeClips: Object.keys(this.getClipAnimationStates()).length,
                currentKeyframes: Object.keys(this.getKeyframeAnimationStates()).length
            };

            console.log("애니메이션 상태:", states);
        }, 1000); // 1초마다 상태 출력

        return monitorInterval;
    }

    // 특정 시간으로 점프
    jumpToTime(time) {
        console.log(`시간 ${time}초로 점프`);

        this.currentTime = Math.max(0, Math.min(time, this.timelineData.maxTime));
        this.setAnimationProperty('currentTime', this.currentTime);
        this.setAnimationProperty('animationFrame', Math.floor(this.currentTime * this.timelineData.frameRate));

        this.updateAnimation(this.currentTime);

        console.log("점프 완료:", {
            targetTime: time,
            actualTime: this.currentTime,
            frame: Math.floor(this.currentTime * this.timelineData.frameRate)
        });
    }

    // 애니메이션 속도 조절
    setPlaybackSpeed(speed) {
        console.log(`재생 속도 설정: ${speed}x`);

        // 프레임 레이트 조정으로 속도 변경
        const baseFrameRate = 30;
        const newFrameRate = Math.floor(baseFrameRate * speed);

        this.timelineData.frameRate = newFrameRate;
        this.setAnimationProperty('frameRate', newFrameRate);

        console.log("재생 속도 변경 완료:", {
            speed: speed,
            newFrameRate: newFrameRate
        });
    }

    // 애니메이션 루프 설정
    setLoopMode(enableLoop) {
        console.log(`루프 모드 설정: ${enableLoop ? '활성화' : '비활성화'}`);

        this.container.dataset.loopEnabled = enableLoop.toString();

        if (!enableLoop) {
            // 루프 비활성화 시 최대 시간에 도달하면 정지
            const checkEnd = () => {
                if (this.currentTime >= this.timelineData.maxTime) {
                    this.pause();
                    console.log("애니메이션 종료 (루프 비활성화)");
                }
            };

            // 매 프레임마다 체크
            const originalAnimate = this.animate.bind(this);
            this.animate = function () {
                originalAnimate();
                checkEnd();
            };
        }
    }

    // 애니메이션 상태 저장/복원
    saveAnimationState() {
        const state = {
            currentTime: this.currentTime,
            isPlaying: this.isPlaying,
            frameRate: this.timelineData.frameRate,
            maxTime: this.timelineData.maxTime,
            animationProperties: this.getAllAnimationProperties(),
            clipStates: this.getClipAnimationStates(),
            keyframeStates: this.getKeyframeAnimationStates()
        };

        console.log("애니메이션 상태 저장:", state);
        return state;
    }

    restoreAnimationState(state) {
        console.log("애니메이션 상태 복원:", state);

        this.currentTime = state.currentTime || 0;
        this.timelineData.frameRate = state.frameRate || 30;
        this.timelineData.maxTime = state.maxTime || 0;

        // data-* 속성 복원
        Object.entries(state.animationProperties || {}).forEach(([key, value]) => {
            this.setAnimationProperty(key, value);
        });

        // 애니메이션 상태 업데이트
        this.updateAnimation(this.currentTime);

        console.log("애니메이션 상태 복원 완료");
    }

    // 키프레임 드래그 후 애니메이션 상태 디버깅
    debugKeyframeAnimation(objectUuid, property) {
        console.log("=== 키프레임 애니메이션 디버깅 ===");

        const trackData = this.timelineData.tracks.get(objectUuid)?.get(property);
        if (!trackData) {
            console.warn("트랙 데이터를 찾을 수 없습니다:", { objectUuid, property });
            return;
        }

        console.log("트랙 데이터 상태:", {
            keyframeCount: trackData.keyframeCount,
            times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
            values: Array.from(trackData.values.slice(0, trackData.keyframeCount * 3))
        });

        const precomputedData = this.timelineData.precomputedData;
        if (!precomputedData) {
            console.warn("precomputedData가 없습니다.");
            return;
        }

        const objectData = precomputedData.get(objectUuid);
        if (!objectData) {
            console.warn("객체 데이터를 찾을 수 없습니다:", objectUuid);
            return;
        }

        const frames = objectData.get(property);
        if (!frames) {
            console.warn("프레임 데이터를 찾을 수 없습니다:", property);
            return;
        }

        console.log("프리컴퓨트된 프레임 데이터:", {
            frameCount: frames.length / 3,
            sampleFrames: Array.from(frames.slice(0, 30)) // 처음 10개 프레임 샘플
        });

        // 현재 시간에서의 값 확인
        const currentFrameIndex = Math.floor(this.currentTime * this.timelineData.frameRate);
        if (currentFrameIndex >= 0 && currentFrameIndex < frames.length / 3) {
            const currentValue = new THREE.Vector3(
                frames[currentFrameIndex * 3],
                frames[currentFrameIndex * 3 + 1],
                frames[currentFrameIndex * 3 + 2]
            );
            console.log("현재 시간에서의 값:", {
                currentTime: this.currentTime,
                frameIndex: currentFrameIndex,
                value: currentValue
            });
        }

        // 객체의 실제 위치 확인
        const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
        if (object) {
            console.log("객체 실제 위치:", object.position);
        }
    }

    // 키프레임 드래그 후 즉시 애니메이션 업데이트 강제 실행
    forceUpdateAnimationAfterKeyframeDrag(objectUuid, property, newTime) {
        console.log("=== 키프레임 드래그 후 강제 애니메이션 업데이트 ===");

        // TimelineData 강제 업데이트
        this.timelineData.dirty = true;
        this.timelineData.precomputeAnimationData();

        // 현재 시간에 맞춰 애니메이션 즉시 업데이트
        this.updateAnimation(this.currentTime);

        // 디버깅 정보 출력
        this.debugKeyframeAnimation(objectUuid, property);

        console.log("강제 업데이트 완료");
    }

    // TimelineData 이벤트 리스너 설정
    setupTimelineDataEvents() {
        if (!this.timelineData) return;

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

    // 키프레임 추가 시 UI 업데이트
    onKeyframeAdded(objectUuid, property, index, time, value) {
        const track = this.tracksByUuid.get(objectUuid);
        if (!track) return;

        // UI에 키프레임 요소 추가
        const sprite = track.element.querySelector('.animation-sprite.selected') ||
            track.element.querySelector('.animation-sprite');
        if (!sprite) return;

        // 클립 범위 체크
        const clipLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const clipDuration = parseFloat(sprite.dataset.duration) || 5;
        const clipEndTime = clipStartTime + clipDuration;

        // 키프레임이 클립 범위 밖에 있으면 추가하지 않음
        if (time < clipStartTime || time > clipEndTime) {
            console.warn("키프레임이 클립 범위 밖에 있습니다:", {
                time,
                clipStartTime,
                clipEndTime,
                clipDuration
            });
            return;
        }

        const keyframeElement = this.createKeyframeElement(time, value, property, index, sprite);
        const keyframeLayer = sprite.querySelector('.keyframe-layer');
        if (keyframeLayer) {
            keyframeLayer.appendChild(keyframeElement);
            this.makeKeyframeDraggable(keyframeElement, track, time, property);

            // 새로 추가된 키프레임 자동 선택
            console.log("onKeyframeAdded - 키프레임 자동 선택:", {
                objectUuid,
                time,
                index,
                keyframeElement
            });
            this.selectKeyframe(objectUuid, time, keyframeElement, index);
        }
    }

    // 키프레임 삭제 시 UI 업데이트
    onKeyframeRemoved(objectUuid, property, index, time, value) {
        const track = this.tracksByUuid.get(objectUuid);
        if (!track) return;

        // UI에서 키프레임 요소 제거
        const sprites = track.element.querySelectorAll('.animation-sprite');
        sprites.forEach(sprite => {
            const keyframeLayer = sprite.querySelector('.keyframe-layer');
            if (keyframeLayer) {
                const keyframeElement = keyframeLayer.querySelector(`[data-time="${time}"]`);
                if (keyframeElement) {
                    keyframeElement.remove();
                }
            }
        });
    }

    // 키프레임 업데이트 시 UI 업데이트
    onKeyframeUpdated(objectUuid, property, index, time, oldValue, newValue) {
        const track = this.tracksByUuid.get(objectUuid);
        if (!track) return;

        // UI에서 키프레임 값 업데이트
        const sprites = track.element.querySelectorAll('.animation-sprite');
        sprites.forEach(sprite => {
            const keyframeLayer = sprite.querySelector('.keyframe-layer');
            if (keyframeLayer) {
                const keyframeElement = keyframeLayer.querySelector(`[data-time="${time}"]`);
                if (keyframeElement) {
                    keyframeElement.dataset.x = newValue.x.toString();
                    keyframeElement.dataset.y = newValue.y.toString();
                    keyframeElement.dataset.z = newValue.z.toString();
                    keyframeElement.dataset.value = JSON.stringify([newValue.x, newValue.y, newValue.z]);
                }
            }
        });
    }

    // 키프레임 이동 시 UI 업데이트
    onKeyframeMoved(objectUuid, property, index, oldTime, newTime, value) {
        const track = this.tracksByUuid.get(objectUuid);
        if (!track) return;

        // 클립 드래그 중인지 확인
        const isDraggingClip = track.element.querySelector('.animation-sprite.dragging');
        if (isDraggingClip) {
            console.log('클립 드래그 중이므로 키프레임 이동 이벤트를 무시합니다.');
            return;
        }

        // UI에서 키프레임 위치 업데이트
        const sprites = track.element.querySelectorAll('.animation-sprite');
        sprites.forEach(sprite => {
            const keyframeLayer = sprite.querySelector('.keyframe-layer');
            if (keyframeLayer) {
                const keyframeElement = keyframeLayer.querySelector(`[data-time="${oldTime}"]`);
                if (keyframeElement) {
                    // 새로운 시간으로 업데이트
                    keyframeElement.dataset.time = newTime.toString();
                    keyframeElement.dataset.index = index.toString();

                    // 새로운 위치 계산
                    const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                    const relativeTime = newTime - clipStartTime;
                    const newLeft = (relativeTime / clipDuration) * sprite.offsetWidth;

                    keyframeElement.style.left = `${newLeft}px`;
                    keyframeElement.dataset.pixelPosition = newLeft.toString();
                }
            }
        });
    }

    // 키프레임 요소 생성
    createKeyframeElement(time, value, property, index, sprite = null) {
        const keyframeElement = document.createElement("div");
        keyframeElement.className = "keyframe";
        keyframeElement.dataset.time = time.toString();
        keyframeElement.dataset.property = property;
        keyframeElement.dataset.index = index.toString();
        keyframeElement.dataset.x = value.x.toString();
        keyframeElement.dataset.y = value.y.toString();
        keyframeElement.dataset.z = value.z.toString();
        keyframeElement.dataset.value = JSON.stringify([value.x, value.y, value.z]);

        // 클립 기준으로 위치 계산
        const targetSprite = sprite || keyframeElement.closest('.animation-sprite');
        if (targetSprite) {
            // .time-ruler-container 기준으로 키프레임 시간의 픽셀 위치 계산
            const timeRulerContainer = document.querySelector('.time-ruler-container');
            if (!timeRulerContainer) {
                console.warn('.time-ruler-container를 찾을 수 없습니다.');
                return keyframeElement;
            }

            const timeRulerRect = timeRulerContainer.getBoundingClientRect();
            const timeRulerWidth = timeRulerRect.width;

            // 키프레임 시간에 해당하는 절대 픽셀 위치 (playhead 위치)
            const playheadPixelPosition = (time / this.options.totalSeconds) * timeRulerWidth;
            console.log("@@@@@@@@@@@@@@@@@@@@@@@@@  playheadPixelPosition  @@@@@@@@@@@@@@@@@@@@@@@@@@");
            console.log("playheadPixelPosition", playheadPixelPosition);

            // 클립의 시작 픽셀 위치
            const clipLeft = parseFloat(targetSprite.style.left) || 0;
            const clipStartPixelPosition = (clipLeft / 100) * timeRulerWidth;

            // 키프레임 left = playhead 위치 - 클립 시작 위치
            const keyframeLeft = playheadPixelPosition - clipStartPixelPosition;
            console.log("@@@@@@@@@@@@@@@@@@@@@@@@@  keyframeLeft  @@@@@@@@@@@@@@@@@@@@@@@@@@");
            console.log("keyframeLeft", keyframeLeft);
            keyframeElement.style.left = `${keyframeLeft}px`;
            keyframeElement.dataset.pixelPosition = keyframeLeft.toString();

            console.log("키프레임 위치 계산:", {
                absoluteTime: time,
                totalSeconds: this.options.totalSeconds,
                timeRulerWidth,
                playheadPixelPosition,
                clipLeftPercent: clipLeft,
                clipStartPixelPosition,
                keyframeLeft,
                // 추가 디버깅 정보
                spriteStyleWidth: targetSprite.style.width,
                spriteStyleLeft: targetSprite.style.left
            });
        }

        return keyframeElement;
    }
}

export default MotionTimeline;