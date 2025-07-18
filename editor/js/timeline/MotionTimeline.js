import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";
import { INTERPOLATION } from './TimelineCore.js';
import { TimelineData, TrackData } from './TimelineCore.js';
import { KeyboardShortcuts } from './KeyboardShortcuts.js';

export class MotionTimeline extends BaseTimeline {
    // 클립 범위 체크용 오차 범위 (초 단위)
    static CLIP_RANGE_TOLERANCE = 0.1;
    
    constructor(editor, options) {
        super(editor, options);
        this.selectedObject = null;
        this.selectedProperty = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.selectedKeyframe = null;
        this.selectedSprite = null;
        this.mixers = new Map(); // FBX 애니메이션 mixer 저장
        this.isDragging = false; // 드래그 상태 추적
        this.pendingKeyframeUpdate = false; // 키프레임 업데이트 대기 상태
        this.isPlayheadDragging = false; // playhead 드래그 상태 추적
        this.timelineData = new TimelineData();
        
        // Timeline.js의 framesPerSecond와 동기화
        if (options && options.framesPerSecond) {
            this.timelineData.frameRate = options.framesPerSecond;
            // console.log(`MotionTimeline frameRate를 Timeline.js와 동기화: ${this.timelineData.frameRate}fps`);
        }
        
        // 중복된 tracks 관리를 제거하고 TimelineData를 단일 소스로 사용
        this.timeline = this.editor.scene.userData.timeline || {};
        this.initMotionTracks();
        this.bindEvents();

        // TimelineData 이벤트 시스템 초기화
        this.setupTimelineDataEvents();

        // 객체 변경 시그널 감지하여 선택된 키프레임 업데이트
        this.setupObjectChangeListener();

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
        // TimelineData가 단일 소스이므로 기존 변환 로직은 제거
        console.log('MotionTimeline 초기화 완료 - TimelineData 기반');
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

        // 키보드 단축키 초기화
        this.keyboardShortcuts = new KeyboardShortcuts(this);
    }

    addKeyframe(trackUuid, propertyType, timeInSeconds, value) {
        // TimelineData를 통해 키프레임 추가 (모든 속성 함께 저장)
        console.log("addKeyframe - 모든 속성 함께 저장");
        console.log(trackUuid);
        console.log(propertyType);
        console.log(timeInSeconds);
        console.log(value);
        console.log(this.timelineData.tracks);

        // 객체에서 모든 속성의 현재 값 가져오기
        const object = this.editor.scene.getObjectByProperty('uuid', trackUuid);
        if (!object) {
            console.warn("객체를 찾을 수 없습니다:", trackUuid);
            return false;
        }

        const position = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
        const rotation = new THREE.Vector3(object.rotation.x, object.rotation.y, object.rotation.z);
        const scale = new THREE.Vector3(object.scale.x, object.scale.y, object.scale.z);

        console.log("현재 객체 속성:", { position, rotation, scale });

        // 모든 속성에 대해 키프레임 추가
        const properties = [
            { type: 'position', value: position },
            { type: 'rotation', value: rotation },
            { type: 'scale', value: scale }
        ];

        let success = true;
        properties.forEach(({ type, value }) => {
            let track = this.timelineData.tracks.get(trackUuid)?.get(type);
            if (!track) {
                console.log(`${type} 트랙을 생성합니다:`, trackUuid);
                track = this.timelineData.addTrack(trackUuid, type);
            }

            if (track) {
                // 기존 키프레임이 있는지 확인
                const existingIndex = track.findKeyframeIndex(timeInSeconds);
                if (existingIndex !== -1) {
                    // 기존 키프레임이 있으면 값만 업데이트
                    track.updateKeyframeValue(existingIndex, value);
                    console.log(`${type} 기존 키프레임 업데이트:`, { time: timeInSeconds, value });
                } else {
                    // 새 키프레임 추가 (position만 이벤트 발생, 나머지는 내부 데이터만 저장)
                    if (type === 'position') {
                        // position은 정상적으로 addKeyframe 호출 (이벤트 발생)
                        if (!track.addKeyframe(timeInSeconds, value)) {
                            console.warn(`${type} 키프레임 추가 실패:`, { timeInSeconds, value });
                            success = false;
                        } else {
                            console.log(`${type} 새 키프레임 추가 (이벤트 발생):`, { time: timeInSeconds, value });
                        }
                    } else {
                        // rotation, scale은 내부 데이터만 저장 (이벤트 발생 안함)
                        const index = track.keyframeCount;
                        track.times[index] = timeInSeconds;
                        track.values[index * 3] = value.x;
                        track.values[index * 3 + 1] = value.y;
                        track.values[index * 3 + 2] = value.z;
                        track.interpolations[index] = track.interpolations[0] || 0;
                        track.keyframeCount++;
                        track.dirty = true;
                        track.sortKeyframes();
                        console.log(`${type} 새 키프레임 추가 (내부 데이터만):`, { time: timeInSeconds, value });
                    }
                }
            } else {
                console.warn(`${type} 트랙 생성 실패:`, trackUuid);
                success = false;
            }
        });

        if (!success) {
            console.warn("일부 속성의 키프레임 추가에 실패했습니다.");
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



        // 타임라인 컨테이너에 애니메이션 상태 업데이트
        this.updateTimelineAnimationState(currentTime);

        // 키프레임 강조 상태 업데이트
        this.updateKeyframeStates(currentTime);

        const precomputedData = this.timelineData.precomputedData;
        if (!precomputedData) {
            // 기존 트랙 데이터가 있는 경우에만 프리컴퓨트
            if (this.timelineData.tracks.size > 0) {
                this.timelineData.precomputeAnimationData();
            } else {
                return;
            }
        }

        // 키프레임 애니메이션 업데이트 - 직접 TrackData 사용
        this.timelineData.getAllTracksByUuid().forEach((trackInfo, trackKey) => {
            // trackKey는 "objectUuid_property" 형태이므로 objectUuid 추출
            const objectUuid = trackKey.split('_')[0];
            const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
            if (!object) {
                console.log("객체를 찾을 수 없습니다:", objectUuid);
                return;
            }
            
            // 플레이 중일 때만 상세 로그 출력 (너무 많은 로그 방지)
            if (this.isPlaying) {
                console.log(`[updateAnimation - PLAYING] 객체 찾음: ${objectUuid}`, {
                    name: object.name,
                    type: object.type,
                    isInScene: this.editor.scene.children.includes(object) || this.editor.scene.getObjectByProperty('uuid', objectUuid) !== null,
                    sceneChildrenCount: this.editor.scene.children.length
                });
            }

            // TimelineData 기반으로 트랙 확인
            const trackData = this.timelineData.getObjectTracks(objectUuid);
            if (!trackData || trackData.size === 0) {
                console.log("트랙 데이터를 찾을 수 없습니다:", objectUuid);
                return;
            }

            // UI 트랙 요소 찾기
            const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
            if (!trackElement) {
                console.warn(`트랙 UI 요소가 없습니다: ${objectUuid}`);
                return;
            }

            // 클립 범위 확인
            const sprites = trackElement.querySelectorAll('.animation-sprite');
            let isInActiveClip = false;

            // 플레이 중일 때만 상세 로그 출력
            if (this.isPlaying) {
                console.log(`[updateAnimation - PLAYING] ${objectUuid} 클립 범위 체크:`, {
                    spritesCount: sprites.length,
                    currentTime: currentTime,
                    totalSeconds: this.options.totalSeconds
                });
            }

            if (sprites.length > 0) {
                sprites.forEach(sprite => {
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                    const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                    const clipEndTime = clipStartTime + clipDuration;

                    // 플레이 중일 때만 상세 로그 출력
                    if (this.isPlaying) {
                        console.log(`[updateAnimation - PLAYING] 스프라이트 정보:`, {
                            clipLeft: clipLeft,
                            clipStartTime: clipStartTime,
                            clipDuration: clipDuration,
                            clipEndTime: clipEndTime,
                            isInRange: currentTime >= clipStartTime && currentTime <= clipEndTime
                        });
                    }

                    // 현재 시간이 클립 범위에 있는지 확인
                    if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
                        isInActiveClip = true;
                    }
                });

                // 클립 범위에 있지 않으면 객체를 숨김 (임시로 비활성화)
                if (!isInActiveClip) {
                    console.log(`[updateAnimation - PLAYING] ${objectUuid} 클립 범위 밖이지만 임시로 보이게 설정`);
                    // object.visible = false; // 임시로 주석 처리
                    // return; // 임시로 주석 처리
                } else {
                    console.log(`[updateAnimation - PLAYING] ${objectUuid} 클립 범위 안 - 객체 보임`);
                }
            } else {
                // 스프라이트가 없는 경우 (예: 속성 트랙) 항상 보이게 설정
                console.log(`[updateAnimation] 스프라이트가 없는 트랙: ${objectUuid}, 항상 보이게 설정`);
            }

            // 클립 범위에 있으면 객체를 보이게 설정
            object.visible = true;
            
            // 부모 객체들도 보이게 설정
            let parent = object.parent;
            while (parent && parent !== this.editor.scene) {
                parent.visible = true;
                parent = parent.parent;
            }
            
            // 플레이 중일 때만 상세 로그 출력
            if (this.isPlaying) {
                console.log(`[updateAnimation - PLAYING] ${objectUuid} 객체 가시성 설정:`, {
                    objectVisible: object.visible,
                    objectName: object.name,
                    objectPosition: object.position,
                    objectScale: object.scale,
                    parentVisible: object.parent?.visible,
                    parentName: object.parent?.name
                });
            }

            // 각 속성에 대해 직접 TrackData에서 값 계산
            trackData.forEach((trackData, property) => {
                // TrackData의 getValueAtTime을 사용하여 직접 값 계산
                const value = trackData.getValueAtTime(currentTime);
                // console.log(`[updateAnimation] ${objectUuid} ${property}:`, {
                //     currentTime,
                //     hasValue: !!value,
                //     value: value,
                //     keyframeCount: trackData.keyframeCount,
                //     times: Array.from(trackData.times.slice(0, trackData.keyframeCount))
                // });
                if (value) {
                    this.applyValue(object, property, value);
                }
            });

            // 애니메이션 업데이트 후 objectChanged 시그널 발생 (fromTimeline 옵션 포함)
            // 단, 선택된 키프레임이 있는 객체는 제외하여 키프레임 값 덮어쓰기 방지
            if (this.editor.signals?.objectChanged && 
                (!this.selectedKeyframe || this.selectedKeyframe.objectId !== objectUuid)) {
                this.editor.signals.objectChanged.dispatch(object, { fromTimeline: true });
            }
        });

        // FBX 애니메이션 업데이트 (클립 범위에 있을 때만)
        if (this.isPlaying) {
            this.mixers.forEach((mixer, uuid) => {
                const object = this.editor.scene.getObjectByProperty('uuid', uuid);
                if (!object) return;

                // 해당 객체의 클립 범위 확인
                const trackElement = this.container.querySelector(`[data-uuid="${uuid}"]`);
                if (!trackElement) {
                    console.warn(`트랙 UI 요소가 없습니다: ${uuid}`);
                    return;
                }

                const sprites = trackElement.querySelectorAll('.animation-sprite');
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
        this.timelineData.getAllTracksByUuid().forEach((trackInfo, key) => {
            const { uuid: objectUuid } = trackInfo;
            
            // UI 트랙 요소 찾기
            const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
            if (!trackElement) {
                console.warn(`트랙 UI 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const sprites = trackElement.querySelectorAll('.animation-sprite');
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
        console.log("updateKeyframeStates 호출:", currentTime);
        
        this.timelineData.getAllTracksByUuid().forEach((trackInfo, key) => {
            const { uuid: objectUuid } = trackInfo;
            
            // UI 트랙 요소 찾기
            const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
            if (!trackElement) {
                console.warn(`트랙 UI 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const keyframes = trackElement.querySelectorAll('.keyframe');
            console.log(`트랙 ${objectUuid}에서 ${keyframes.length}개의 키프레임 발견`);
            
            if (keyframes.length === 0) {
                console.warn(`트랙 ${objectUuid}에서 키프레임 요소를 찾을 수 없습니다!`);
                return;
            }
            
            keyframes.forEach(keyframe => {
                const keyframeTime = parseFloat(keyframe.dataset.time) || 0;
                console.log(`키프레임 처리 중: ${keyframeTime}s`);

                // 클립 기준으로 상대 시간 계산
                const sprite = keyframe.closest('.animation-sprite');
                let timeDiff = Infinity;
                let isCurrent = false;

                if (sprite) {
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                    const clipDuration = parseFloat(sprite.dataset.duration) || 5;

                    console.log(`클립 정보:`, {
                        clipLeft,
                        clipStartTime,
                        clipDuration,
                        currentTime,
                        isInClip: currentTime >= clipStartTime && currentTime <= clipStartTime + clipDuration
                    });

                    // 현재 시간이 클립 범위에 있는지 확인
                    if (currentTime >= clipStartTime && currentTime <= clipStartTime + clipDuration) {
                        // 클립 내에서의 상대 시간 계산
                        const relativeTime = currentTime - clipStartTime;
                        // 키프레임의 상대 시간과 비교 (keyframeTime은 이미 클립 내 상대 시간)
                        timeDiff = Math.abs(keyframeTime - relativeTime);
                        isCurrent = timeDiff < 0.1; // 0.1초 이내면 현재 키프레임으로 간주
                        
                        console.log(`클립 내 계산:`, {
                            relativeTime,
                            keyframeTime,
                            timeDiff,
                            isCurrent
                        });
                    } else {
                        console.log(`클립 범위 밖: currentTime=${currentTime}, clipStart=${clipStartTime}, clipEnd=${clipStartTime + clipDuration}`);
                    }
                } else {
                    console.warn(`키프레임 ${keyframeTime}s에서 sprite를 찾을 수 없습니다!`);
                }

                // 기존 current 클래스 제거
                keyframe.classList.remove('current');

                // data-is-current 속성 주석처리
                // keyframe.dataset.isCurrent = isCurrent.toString();
                // keyframe.dataset.timeDiff = timeDiff.toFixed(3);

                // if (isCurrent) {
                //     keyframe.classList.add('current');
                //     keyframe.dataset.currentTime = currentTime.toFixed(3);
                //     console.log(`키프레임이 현재 상태로 설정됨: ${keyframeTime}s (${timeDiff.toFixed(3)}s 차이)`);
                // } else {
                //     delete keyframe.dataset.currentTime;
                //     console.log(`키프레임이 현재 상태가 아님: ${keyframeTime}s (${timeDiff.toFixed(3)}s 차이)`);
                // }
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
        this.timelineData.getAllTracksByUuid().forEach((trackInfo, key) => {
            const { uuid: objectUuid } = trackInfo;
            
            // UI 트랙 요소 찾기
            const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
            if (!trackElement) {
                console.warn(`트랙 UI 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const sprites = trackElement.querySelectorAll('.animation-sprite');
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
        this.timelineData.getAllTracksByUuid().forEach((trackInfo, key) => {
            const { uuid: objectUuid } = trackInfo;
            
            // UI 트랙 요소 찾기
            const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
            if (!trackElement) {
                console.warn(`트랙 UI 요소가 없습니다: ${objectUuid}`);
                return;
            }

            const keyframes = trackElement.querySelectorAll('.keyframe');
            states[objectUuid] = Array.from(keyframes).map(keyframe => ({
                element: keyframe,
                // isCurrent: keyframe.dataset.isCurrent === 'true', // 주석처리
                // timeDiff: parseFloat(keyframe.dataset.timeDiff) || 0, // 주석처리
                // currentTime: parseFloat(keyframe.dataset.currentTime) || 0, // 주석처리
                time: parseFloat(keyframe.dataset.time) || 0,
                property: keyframe.dataset.property || 'position'
            }));
        });
        return states;
    }

    play() {
        console.log("=== MotionTimeline play() ===");
        if (this.isPlaying) return;

        // 재생 시작 시 선택된 키프레임 해제
        this.clearSelectedKeyframe();

        // data-* 속성으로 재생 상태 설정 (무한 재귀 방지를 위해 직접 설정)
        this.container.dataset.isPlaying = 'true';
        this.isPlaying = true;

        // 키프레임 변경사항이 있을 수 있으므로 TimelineData 강제 업데이트
        if (this.timelineData.dirty) {
            console.log("TimelineData가 dirty 상태입니다. precomputeAnimationData를 실행합니다.");
            this.timelineData.precomputeAnimationData();
            this.setAnimationProperty('maxTime', this.timelineData.maxTime);
        }

        // play 버튼 클릭 시 현재 playhead 위치를 시작점으로 사용
        let playheadTime = null;
        
        // 1. Timeline.js에서 현재 playhead 위치 가져오기
        if (this.editor.scene?.userData?.timeline?.currentSeconds !== undefined) {
            playheadTime = this.editor.scene.userData.timeline.currentSeconds;
            console.log("Timeline.js에서 playhead 위치 가져옴:", playheadTime);
        }
        
        // 2. Timeline.js 정보가 없으면 DOM에서 직접 계산
        if (playheadTime === null || playheadTime === undefined) {
            const playhead = document.querySelector('.playhead');
            if (playhead) {
                const playheadLeft = parseFloat(playhead.style.left) || 0;
                playheadTime = (playheadLeft / 100) * this.options.totalSeconds;
                console.log("DOM에서 playhead 위치 계산:", playheadTime);
            }
        }
        
        // 3. playhead 위치가 유효하면 해당 위치에서 시작, 아니면 현재 시간 유지
        if (playheadTime !== null && playheadTime !== undefined && 
            playheadTime >= 0 && playheadTime < this.options.totalSeconds) {
            this.currentTime = playheadTime;
            this.setAnimationProperty('currentTime', playheadTime);
            this.setAnimationProperty('animationFrame', Math.floor(playheadTime * this.timelineData.frameRate));
            console.log("playhead 위치에서 재생 시작:", playheadTime);
        } else {
            console.log("playhead 위치가 유효하지 않아 현재 시간 유지:", this.currentTime);
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

        // console.log("애니메이션 재생 시작:", {
        //     currentTime: this.currentTime,
        //     frameRate: this.timelineData.frameRate,
        //     maxTime: this.timelineData.maxTime,
        //     timelineIsPlaying: this.editor.scene?.userData?.timeline?.isPlaying,
        //     timelineFrameRate: this.options?.framesPerSecond || 'unknown'
        // });

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
            // console.log("Timeline.js에서 호출된 경우 자체 animate() 루프를 시작하지 않습니다.");
            return;
        }

        // Timeline.js가 주도적으로 애니메이션을 제어하므로 자체 루프는 비활성화
        // console.log("MotionTimeline 자체 animate() 루프는 비활성화됨 - Timeline.js가 제어함");
        return;

        // data-* 속성을 통한 애니메이션 상태 관리 (무한 재귀 방지를 위해 직접 설정)
        this.container.dataset.isPlaying = 'true';

        // console.log("=== animate() 실행 ===");
        // console.log("현재 시간:", this.currentTime);
        // console.log("프레임 레이트:", this.timelineData.frameRate);

        // TimelineData 상태 확인 및 업데이트
        if (this.timelineData.dirty) {
            // console.log("TimelineData가 dirty 상태입니다. precomputeAnimationData를 실행합니다.");
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

        // 성능 모니터링 (비활성화 - 로그가 성능에 영향을 줄 수 있음)
        // if (this.currentTime % 1 < deltaTime) { // 매 초마다
        //     console.log("애니메이션 상태:", {
        //         currentTime: this.currentTime.toFixed(3),
        //         frame: Math.floor(this.currentTime * this.timelineData.frameRate),
        //         isPlaying: this.isPlaying,
        //         activeClips: this.getClipAnimationStates(),
        //         currentKeyframes: this.getKeyframeAnimationStates()
        //     });
        // }

        // 다음 프레임 요청
        requestAnimationFrame(() => this.animate());
    }

    lerp(start, end, alpha) {
        return start + (end - start) * alpha;
    }

    selectKeyframe(objectId, time, keyframeElement, index = null, options = {}) {
        console.log("selectKeyframe");
        console.log(objectId);
        console.log(time);
        console.log(keyframeElement);
        console.log("전달된 인덱스:", index);

        // 클립 범위 체크 - 클립 밖의 키프레임은 선택하지 않음
        if (keyframeElement) {
            const sprite = keyframeElement.closest('.animation-sprite');
            if (sprite) {
                const spriteLeft = parseFloat(sprite.style.left) || 0;
                const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
                const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                const clipEndTime = clipStartTime + clipDuration;

                // 클립 범위 밖의 키프레임은 선택하지 않음 (초기 키프레임 제외)
                if (time !== 0 && (time < clipStartTime || time > clipEndTime)) {
                    console.log("클립 범위 밖의 키프레임이므로 선택하지 않습니다:", {
                        time,
                        clipStartTime,
                        clipEndTime
                    });
                    return;
                }
            }
        }

        // 이전에 선택된 모든 키프레임 선택 해제
        this.container.querySelectorAll('.keyframe.selected').forEach(el => el.classList.remove('selected'));

        // 새로운 키프레임 선택
        if (keyframeElement) {
            keyframeElement.classList.add('selected');
        }

        // TimelineData 기반으로 트랙 확인 - objectId는 실제로 objectUuid
        const objectTracks = this.timelineData.getObjectTracks(objectId);
        if (!objectTracks || objectTracks.size === 0) {
            console.warn("트랙 데이터를 찾을 수 없습니다:", objectId);
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

        // Editor의 userData에도 저장하여 다른 타임라인에서 접근 가능하도록 함
        if (this.editor.scene.userData.timeline) {
            this.editor.scene.userData.timeline.selectedKeyframe = {
                objectId,
                index: keyframeIndex,
                time,
                property,
                value: { x: value.x, y: value.y, z: value.z }, // 순환 참조 방지를 위해 값만 복사
                interpolation
            };
        }
        // 현재 선택된 키프레임 정보 출력
        console.log("선택된 키프레임 데이터 저장 selectedKeyframe");
        console.log(this.selectedKeyframe);

        // 객체 선택 (에디터에서)
        const object = this.editor.scene.getObjectByProperty('uuid', objectId);
        if (object && this.editor.select) {
            this.editor.select(object);
            console.log("키프레임 선택으로 인한 객체 선택:", object.name);
        }

        // playhead를 키프레임 시간 위치로 이동 (옵션으로 제어 가능)
        if (!options.skipPlayheadMove) {
            this.movePlayheadToTime(time);
            console.log("키프레임 선택으로 인한 playhead 이동:", time);
        } else {
            console.log("playhead 이동 건너뜀 (옵션에 의해)");
        }

        // 키프레임 선택 시 항상 캔버스 뷰 업데이트 (재생 중이든 아니든)
        console.log("키프레임 선택으로 인한 캔버스 뷰 업데이트:", { property, value });
        this.setPropertyValue(object, property, value);
        
        // 객체 변경 시그널 발생하여 캔버스 뷰 즉시 반영
        if (this.editor.signals?.objectChanged) {
            this.editor.signals.objectChanged.dispatch(object, { fromTimeline: true });
        }

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
        
        // 객체 변경 시그널 발생하여 캔버스 뷰 즉시 반영
        if (this.editor.signals?.objectChanged) {
            this.editor.signals.objectChanged.dispatch(object, { fromTimeline: true });
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

        // TimelineData와 UI 모두에서 기존 트랙이 있는지 확인
        const existingTracks = this.timelineData.getObjectTracks(objectUuid);
        const existingTrackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
        
        if (existingTracks.size > 0 || existingTrackElement) {
            console.log("기존 트랙이 이미 존재합니다:", { 
                objectId, 
                objectUuid, 
                timelineDataTracks: existingTracks.size,
                uiElementExists: !!existingTrackElement
            });
            
            // TimelineData에서 트랙이 있지만 UI가 없는 경우, TimelineData에서 완전히 제거
            if (existingTracks.size > 0 && !existingTrackElement) {
                console.log("TimelineData에는 있지만 UI가 없습니다. TimelineData에서 완전히 제거합니다.");
                // 모든 속성의 트랙 제거
                const properties = ['position', 'rotation', 'scale'];
                properties.forEach(property => {
                    this.timelineData.removeTrackByUuid(objectUuid, property);
                });
                // TimelineData 정리
                this.timelineData.cleanupTracks();
            } else if (existingTrackElement) {
                // UI 요소가 있으면 기존 요소 반환
                console.log("UI 요소가 존재하므로 기존 요소를 반환합니다.");
                return { element: existingTrackElement };
            }
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
        
        // FBX 애니메이션이 있는 경우 mixer 초기화
        if (object && object.animations && object.animations.length > 0) {
            if (!this.mixers.has(objectUuid)) {
                const mixer = new THREE.AnimationMixer(object);
                this.mixers.set(objectUuid, mixer);

                // 초기 액션 설정
                object.animations.forEach(clip => {
                    const action = mixer.clipAction(clip);
                    action.setLoop(THREE.LoopRepeat);
                    action.clampWhenFinished = true;
                    action.enabled = true;
                });
            }
        }

        // 모든 트랙에 대해 스프라이트 생성 (FBX 애니메이션 유무와 관계없이)
        let sprite;
        
        // 저장된 클립 정보가 있는지 확인
        const savedClipData = this.editor.scene.userData.motionTimeline?.clips?.[objectUuid];
        
        if (savedClipData) {
            console.log(`[addTrack] 저장된 클립 정보로 스프라이트 생성: ${objectUuid}`, savedClipData);
            
            // 저장된 클립 정보로 스프라이트 생성
            sprite = document.createElement("div");
            sprite.className = "animation-sprite selected";
            sprite.dataset.duration = savedClipData.duration;
            sprite.style.left = `${savedClipData.left}%`;
            sprite.style.width = `${savedClipData.width}%`;
            sprite.dataset.initialLeft = savedClipData.initialLeft.toString();
            
            const spriteName = object?.animations?.[0]?.name || displayName || "Animation";
            sprite.innerHTML = `
                <div class="sprite-handle left"></div>
                <div class="sprite-content">
                    <span class="sprite-name">${spriteName}</span>
                    <div class="keyframe-layer"></div>
                </div>
                <div class="sprite-handle right"></div>
            `;
            
            console.log(`[addTrack] 생성된 스프라이트 정보:`, {
                left: sprite.style.left,
                width: sprite.style.width,
                duration: sprite.dataset.duration,
                initialLeft: sprite.dataset.initialLeft
            });
        } else if (object && object.animations && object.animations.length > 0) {
            // FBX 애니메이션이 있는 경우 기본 스프라이트 생성
            const animationDuration = object.animations[0]?.duration || 5;
            const totalFrames = Math.floor(animationDuration * this.options.framesPerSecond);

            sprite = document.createElement("div");
            sprite.className = "animation-sprite selected";
            sprite.dataset.duration = animationDuration;
            sprite.innerHTML = `
                <div class="sprite-handle left"></div>
                <div class="sprite-content">
                    <span class="sprite-name">${object.animations[0]?.name || "Animation"}</span>
                    <div class="keyframe-layer"></div>
                </div>
                <div class="sprite-handle right"></div>
            `;

            const spriteWidth = (totalFrames / (this.options.totalSeconds * this.options.framesPerSecond)) * 100;
            sprite.style.width = `${spriteWidth}%`;
            sprite.style.left = "0%";
            sprite.dataset.initialLeft = "0";
        } else {
            // FBX 애니메이션이 없는 경우 기본 스프라이트 생성
            sprite = document.createElement("div");
            sprite.className = "animation-sprite selected";
            sprite.dataset.duration = "5"; // 기본 5초
            sprite.style.width = "20%"; // 기본 20% 너비
            sprite.style.left = "0%";
            sprite.dataset.initialLeft = "0";
            sprite.innerHTML = `
                <div class="sprite-handle left"></div>
                <div class="sprite-content">
                    <span class="sprite-name">${displayName}</span>
                    <div class="keyframe-layer"></div>
                </div>
                <div class="sprite-handle right"></div>
            `;
        }

        // 스프라이트를 트랙에 추가
        if (sprite) {
            // 클립이 처음 생성될 때 previousDuration 초기화
            sprite.dataset.previousDuration = sprite.dataset.duration;
            
            trackContent.appendChild(sprite);
            this.bindSpriteEvents(sprite, track);
            
            // keyframe-layer에 속성 타입 추가
            const keyframeLayer = sprite.querySelector('.keyframe-layer');
            if (keyframeLayer) {
                keyframeLayer.dataset.propertyType = 'position';
            }
        }

        // TimelineData에 모든 속성 트랙 생성
        const properties = ['position', 'rotation', 'scale'];
        properties.forEach(property => {
            let trackData = this.timelineData.tracks.get(objectUuid)?.get(property);
            if (!trackData) {
                console.log(`TimelineData에 ${property} 트랙을 생성합니다:`, objectUuid);
                trackData = this.timelineData.addTrack(objectUuid, property);
            }
        });
        
        // position 트랙 참조 (기존 코드 호환성)
        let trackData = this.timelineData.tracks.get(objectUuid)?.get('position');

        // TimelineData 기반으로 관리하므로 Map 저장 제거
        this.container.appendChild(track.element);

        this.bindTrackEvents(track);

        // 기존 키프레임이 있는지 확인
        if (trackData && trackData.keyframeCount > 0) {
            console.log(`기존 키프레임 데이터가 있습니다: ${trackData.keyframeCount}개`);
            // 기존 키프레임 데이터가 있으면 UI 업데이트만 수행
            setTimeout(() => {
                this.updateTrackUI(track.element, this.currentTime);
            }, 50);
        } else if (trackData) {
            // 초기 키프레임 추가 (시간 0에서 position만)
            const position = new THREE.Vector3(
                object.position.x,
                object.position.y,
                object.position.z
            );
            console.log("초기 키프레임을 추가합니다:", { objectUuid, position });
            this.addKeyframe(objectUuid, 'position', 0, position);
            
            // 초기 키프레임 추가 후 UI 업데이트 강제 실행
            setTimeout(() => {
                this.updateTrackUI(track.element, this.currentTime);
            }, 50);
        }

        return track;
    }

    // 트랙 완전 삭제 메서드
    removeTrackCompletely(objectUuid) {
        console.log("removeTrackCompletely called with:", objectUuid);
        
        let totalRemoved = 0;
        
        // 1. UI에서 트랙 요소 제거 (모든 관련 요소)
        const trackElements = this.container.querySelectorAll(`[data-uuid="${objectUuid}"]`);
        trackElements.forEach(element => {
            element.remove();
            console.log("UI 트랙 요소 제거됨:", element.className);
        });
        
        // 2. TimelineData에서 모든 속성의 트랙 제거
        const existingTracks = this.timelineData.getObjectTracks(objectUuid);
        let dataRemoved = 0;
        
        // 모든 속성에 대해 트랙 제거
        const properties = ['position', 'rotation', 'scale'];
        properties.forEach(property => {
            if (this.timelineData.removeTrackByUuid(objectUuid, property)) {
                dataRemoved++;
                console.log(`TimelineData에서 ${property} 트랙 제거됨`);
            }
        });
        
        // 기존 트랙이 있으면 추가로 제거
        for (const [property, trackData] of existingTracks) {
            if (this.timelineData.removeTrackByUuid(objectUuid, property)) {
                dataRemoved++;
                console.log(`TimelineData에서 추가 ${property} 트랙 제거됨`);
            }
        }
        
        totalRemoved += dataRemoved;
        
        // 3. Mixer에서 제거
        if (this.mixers.has(objectUuid)) {
            this.mixers.delete(objectUuid);
            console.log("Mixer에서 제거됨");
        }
        
        // 4. 씬의 userData에서 클립 정보 제거
        if (this.editor.scene.userData.motionTimeline?.clips?.[objectUuid]) {
            delete this.editor.scene.userData.motionTimeline.clips[objectUuid];
            console.log("씬 userData에서 클립 정보 제거됨");
        }
        
        // 5. 키프레임 정보도 제거
        if (this.editor.scene.userData.keyframes?.[objectUuid]) {
            delete this.editor.scene.userData.keyframes[objectUuid];
            console.log("씬 userData에서 키프레임 정보 제거됨");
        }
        
        // 6. TimelineData 정리
        this.timelineData.cleanupTracks();
        
        console.log(`트랙 완전 삭제 완료: ${totalRemoved}개 트랙 제거됨`);
        return totalRemoved;
    }

    bindSpriteEvents(sprite, track) {
        let isDragging = false;
        let startX;
        let startLeft;
        let startWidth;
        let isResizing = false;
        let resizeHandle;
        let initialLeft; // 초기 위치 저장
        let initialWidth; // 초기 크기 저장
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
            initialWidth = startWidth; // 초기 크기 저장
            sprite.dataset.initialLeft = startLeft.toString(); // dataset에 초기 위치 저장
            sprite.dataset.initialWidth = startWidth.toString(); // dataset에 초기 크기 저장
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
                // 5초를 퍼센트로 변환
                const minDurationSeconds = 5;
                const minWidthPercent = (minDurationSeconds / this.options.totalSeconds) * 100;
                
                console.log("클립 크기 조정 중:", {
                    resizeHandle: resizeHandle.classList.contains("left") ? "left" : "right",
                    startLeft,
                    startWidth,
                    deltaPercent,
                    currentLeft: parseFloat(sprite.style.left) || 0,
                    currentWidth: parseFloat(sprite.style.width) || 100,
                    minWidthPercent: minWidthPercent.toFixed(2) + "%",
                    minDurationSeconds: minDurationSeconds + "초"
                });
                
                if (resizeHandle.classList.contains("left")) {
                    const newLeft = Math.max(
                        0,
                        Math.min(startLeft + deltaPercent, startLeft + startWidth - minWidthPercent)
                    );
                    const newWidth = startWidth - (newLeft - startLeft);

                    if (
                        newWidth >= minWidthPercent &&
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
                        minWidthPercent,
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
                
                // 클립 이동이 완료된 후 키프레임 시간 업데이트
                if (hasMoved) {
                    this.updateKeyframeTimesAfterClipMove(track, sprite);
                }

                // dragging 클래스 제거
                sprite.classList.remove('dragging');

                isDragging = false;
                isResizing = false;
                hasMoved = false;
                
                // 클립 이동 또는 크기 조정 후 키프레임 상태 업데이트
                // updateKeyframeTimesAfterClipMove 이후에 호출하여 dataset.time이 업데이트된 후 체크
                if (hasMoved || isResizing) {
                    // 현재 시간에 맞춰 키프레임 상태 업데이트
                    this.updateKeyframeStates(this.currentTime);
                }
                
                this.updateAnimation(); // 애니메이션 업데이트
            }
        });

        // 기존의 contextmenu 이벤트 핸들러 유지
        /*
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
        */

        // 오른쪽 핸들 더블클릭 이벤트 - 클립 길이 토글
        const rightHandle = sprite.querySelector(".sprite-handle.right");
        if (rightHandle) {
            rightHandle.addEventListener("dblclick", (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // 현재 클립 정보
                const currentLeft = parseFloat(sprite.style.left) || 0;
                const currentWidth = parseFloat(sprite.style.width) || 100;
                const currentDuration = parseFloat(sprite.dataset.duration) || 5;
                
                // 이전 크기 정보 확인 (dataset에 저장된 값)
                const originalWidth = sprite.dataset.originalWidth ? parseFloat(sprite.dataset.originalWidth) : null;
                const originalDuration = sprite.dataset.originalDuration ? parseFloat(sprite.dataset.originalDuration) : null;
                
                // 현재 클립이 타임라인 끝까지 확장되어 있는지 확인
                const maxWidth = 100 - currentLeft;
                const isExtended = Math.abs(currentWidth - maxWidth) < 0.1; // 0.1% 오차 허용
                
                if (isExtended && originalWidth !== null) {
                    // 확장된 상태에서 원래 크기로 복원
                    console.log("클립을 원래 크기로 복원:", {
                        currentWidth: currentWidth.toFixed(2) + "%",
                        originalWidth: originalWidth.toFixed(2) + "%",
                        currentDuration: currentDuration + "초",
                        originalDuration: originalDuration + "초"
                    });
                    
                    sprite.style.width = `${originalWidth}%`;
                    sprite.dataset.duration = originalDuration.toString();
                    
                    // 원래 크기 정보 제거
                    delete sprite.dataset.originalWidth;
                    delete sprite.dataset.originalDuration;
                } else {
                    // 현재 크기를 원래 크기로 저장하고 타임라인 끝까지 확장
                    console.log("클립을 타임라인 끝까지 확장:", {
                        currentWidth: currentWidth.toFixed(2) + "%",
                        maxWidth: maxWidth.toFixed(2) + "%",
                        currentDuration: currentDuration + "초",
                        maxDuration: (maxWidth / 100 * this.options.totalSeconds).toFixed(2) + "초"
                    });
                    
                    // 현재 크기를 원래 크기로 저장
                    sprite.dataset.originalWidth = currentWidth.toString();
                    sprite.dataset.originalDuration = currentDuration.toString();
                    
                    // 타임라인 끝까지 확장
                    sprite.style.width = `${maxWidth}%`;
                    const maxDuration = (maxWidth / 100) * this.options.totalSeconds;
                    sprite.dataset.duration = maxDuration.toString();
                }
                
                // 키프레임 업데이트
                this.updateKeyframesInClip(track, sprite);
                
                // 애니메이션 업데이트
                this.updateAnimation();
            });
        }

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

    extendTimeline(newTotalSeconds) {
        console.log(`타임라인 길이를 ${this.options.totalSeconds}초에서 ${newTotalSeconds}초로 확장`);
        
        // 기존 타임라인 길이 저장
        const oldTotalSeconds = this.options.totalSeconds;
        
        // 새로운 타임라인 길이 설정
        this.options.totalSeconds = newTotalSeconds;
        
        // 타임라인 컨테이너의 너비 업데이트
        const timelineContainer = this.container.querySelector('.timeline-container');
        if (timelineContainer) {
            timelineContainer.style.width = `${newTotalSeconds * 10}px`; // 10px per second
        }
        
        // 모든 클립의 duration과 width 재계산
        const allSprites = this.container.querySelectorAll('.animation-sprite');
        allSprites.forEach(sprite => {
            const currentWidth = parseFloat(sprite.style.width) || 100;
            const currentDuration = parseFloat(sprite.dataset.duration) || 5;
            
            // 새로운 퍼센트 계산 (기존 duration 유지)
            const newWidthPercent = (currentDuration / newTotalSeconds) * 100;
            
            // 클립이 100%를 넘지 않도록 조정
            const currentLeft = parseFloat(sprite.style.left) || 0;
            const maxWidth = 100 - currentLeft;
            const adjustedWidth = Math.min(newWidthPercent, maxWidth);
            
            sprite.style.width = `${adjustedWidth}%`;
            
            console.log(`클립 업데이트: ${currentDuration}초 -> ${adjustedWidth.toFixed(2)}%`);
        });
        
        // 플레이헤드 위치 조정 (필요한 경우)
        if (this.currentTime > newTotalSeconds) {
            this.currentTime = newTotalSeconds;
            this.updatePlayheadPosition((this.currentTime / newTotalSeconds) * 100);
        }
        
        // 애니메이션 업데이트
        this.updateAnimation();
        
        console.log(`타임라인 확장 완료: ${oldTotalSeconds}초 -> ${newTotalSeconds}초`);
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
        const clipEndTime = clipStartTime + clipDuration;

        // 이전 클립 크기 정보 가져오기
        const previousClipDuration = parseFloat(sprite.dataset.previousDuration) || clipDuration;
        const previousClipEndTime = clipStartTime + previousClipDuration;

        console.log("updateKeyframesInClip - 클립 정보:", {
            spriteWidth,
            spriteLeft,
            clipStartTime,
            clipDuration,
            clipEndTime,
            previousClipDuration,
            previousClipEndTime,
            isExpanding: clipDuration > previousClipDuration
        });

        // 클립 밖으로 나간 키프레임들을 추적 (클립이 줄어들 때만)
        const keyframesToRemove = [];

        // 클립 크기 변경 시 키프레임 위치를 절대 시간 기준으로 다시 계산
        keyframes.forEach((keyframe) => {
            const absoluteTime = parseFloat(keyframe.dataset.time);
            const propertyType = keyframe.dataset.property;

            // 절대 시간이 유효한지 확인
            if (isNaN(absoluteTime)) {
                console.warn("키프레임의 절대 시간이 유효하지 않습니다:", keyframe.dataset);
                return;
            }

                    // 클립이 줄어들 때만 범위 밖 키프레임 체크
        // previousDuration이 있으면 실제 비교, 없으면 첫 번째 조정이므로 체크하지 않음
        const isClipShrinking = previousClipDuration ? clipDuration < previousClipDuration : false;
        if (isClipShrinking && absoluteTime !== 0 && (absoluteTime < clipStartTime - MotionTimeline.CLIP_RANGE_TOLERANCE || absoluteTime > clipEndTime + MotionTimeline.CLIP_RANGE_TOLERANCE)) {
                console.warn("클립이 줄어들어서 키프레임이 클립 범위 밖으로 나갔습니다:", {
                    absoluteTime,
                    clipStartTime,
                    clipEndTime,
                    previousClipEndTime,
                    propertyType
                });
                
                // 클립 밖으로 나간 키프레임을 제거 목록에 추가
                keyframesToRemove.push({
                    keyframe,
                    absoluteTime,
                    propertyType
                });
            }

            // 절대 시간을 기준으로 새로운 위치 계산 (createKeyframeElement와 동일한 방식)
            const timeRulerContainer = document.querySelector('.time-ruler-container');
            if (timeRulerContainer) {
                const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                const timeRulerWidth = timeRulerRect.width;
                
                // 키프레임 시간에 해당하는 절대 픽셀 위치
                const absolutePixelPosition = (absoluteTime / this.options.totalSeconds) * timeRulerWidth;
                
                // 클립 시작 픽셀 위치
                const clipStartPixelPosition = (spriteLeft / 100) * timeRulerWidth;
                
                // 클립 내에서의 상대 픽셀 위치
                const relativePixelPosition = absolutePixelPosition - clipStartPixelPosition;
                
                console.log("클립 크기 변경 시 키프레임 위치 재계산:", {
                    absoluteTime,
                    absolutePixelPosition,
                    clipStartPixelPosition,
                    relativePixelPosition,
                    spriteWidth
                });

                // 키프레임의 CSS 위치만 업데이트 (TimelineData는 건드리지 않음)
                keyframe.style.left = `${relativePixelPosition}px`;
                keyframe.dataset.pixelPosition = relativePixelPosition.toString();
            }
        });

        // 클립이 줄어들어서 밖으로 나간 키프레임들만 처리
        if (keyframesToRemove.length > 0) {
            console.log("클립이 줄어들어서 밖으로 나간 키프레임들 발견:", keyframesToRemove.length);
            
            // 클립 밖 키프레임들을 일단 숨김 처리하고 다이얼로그 표시
            keyframesToRemove.forEach(({ keyframe }) => {
                keyframe.style.opacity = '0.3';
                keyframe.style.background = '#ff6b6b';
                keyframe.title = '클립 범위 밖의 키프레임 (숨김)';
                keyframe.dataset.outsideClip = 'true';
            });
            
            // 다이얼로그 표시
            this.showKeyframeOutsideClipDialog(keyframesToRemove, track, sprite);
        }

        // 현재 클립 크기를 이전 크기로 저장
        sprite.dataset.previousDuration = clipDuration.toString();

        console.log("클립 크기 조정 완료 - 키프레임 위치 업데이트 및 범위 밖 키프레임 처리됨");
    }

    // 클립 밖으로 나간 키프레임 처리 옵션
    handleKeyframesOutsideClip(track, sprite, options = {}) {
        const {
            autoRemove = true,        // 자동 제거 (기본값)
            showWarning = true,       // 경고 표시
            preserveData = false      // 데이터 보존 (삭제하지 않고 숨김만)
        } = options;

        const keyframeLayer = sprite.querySelector(".keyframe-layer");
        if (!keyframeLayer) return;

        const keyframes = Array.from(keyframeLayer.querySelectorAll(".keyframe"));
        const spriteLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
        const clipDuration = parseFloat(sprite.dataset.duration) || 5;
        const clipEndTime = clipStartTime + clipDuration;

        const outsideKeyframes = [];

        // 클립 밖의 키프레임 찾기
        keyframes.forEach(keyframe => {
            const absoluteTime = parseFloat(keyframe.dataset.time);
            const propertyType = keyframe.dataset.property;

            if (isNaN(absoluteTime)) return;

            // 초기 키프레임(시간 0)은 제외
            if (absoluteTime !== 0 && (absoluteTime < clipStartTime - MotionTimeline.CLIP_RANGE_TOLERANCE || absoluteTime > clipEndTime + MotionTimeline.CLIP_RANGE_TOLERANCE)) {
                outsideKeyframes.push({
                    keyframe,
                    absoluteTime,
                    propertyType
                });
            }
        });

        if (outsideKeyframes.length === 0) return;

        // 경고 표시
        if (showWarning) {
            console.warn(`${outsideKeyframes.length}개의 키프레임이 클립 범위 밖에 있습니다:`, {
                clipStartTime,
                clipEndTime,
                outsideKeyframes: outsideKeyframes.map(kf => ({
                    time: kf.absoluteTime,
                    property: kf.propertyType
                }))
            });
        }

        // 처리 방식에 따른 분기
        if (autoRemove) {
            // 자동 제거
            outsideKeyframes.forEach(({ keyframe, absoluteTime, propertyType }) => {
                // TimelineData에서 제거
                if (track.uuid) {
                    const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
                    if (trackData) {
                        const keyframeIndex = trackData.findKeyframeIndex(absoluteTime);
                        if (keyframeIndex !== -1) {
                            trackData.removeKeyframeByIndex(keyframeIndex);
                        }
                    }
                }
                
                // UI에서 제거
                keyframe.remove();
            });

            // TimelineData 업데이트
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();
            
            console.log(`${outsideKeyframes.length}개의 키프레임이 자동으로 제거되었습니다.`);
            
        } else if (preserveData) {
            // 데이터 보존 (숨김만)
            outsideKeyframes.forEach(({ keyframe }) => {
                keyframe.style.opacity = '0.3';
                keyframe.style.background = '#ff6b6b';
                keyframe.title = '클립 범위 밖의 키프레임 (숨김)';
                keyframe.dataset.outsideClip = 'true';
            });
            
            console.log(`${outsideKeyframes.length}개의 키프레임이 숨김 처리되었습니다.`);
        }

        return outsideKeyframes;
    }

    // 클립 범위 경고 표시
    showClipRangeWarning(message) {
        // 기존 경고가 있으면 제거
        const existingWarning = document.querySelector('.clip-range-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        const warning = document.createElement('div');
        warning.className = 'clip-range-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;

        warning.textContent = message;

        // CSS 애니메이션 추가
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(warning);

        // 3초 후 자동 제거
        setTimeout(() => {
            if (warning.parentNode) {
                warning.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (warning.parentNode) {
                        warning.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    // 클립 밖 키프레임 처리 다이얼로그 표시
    showKeyframeOutsideClipDialog(outsideKeyframes, track, sprite) {
        // 기존 다이얼로그가 있으면 제거
        const existingDialog = document.querySelector('.keyframe-outside-clip-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialog = document.createElement('div');
        dialog.className = 'keyframe-outside-clip-dialog';
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #ff6b6b;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            font-family: Arial, sans-serif;
        `;

        const title = document.createElement('h3');
        title.textContent = '클립 범위 밖 키프레임 발견';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #ff6b6b;
            font-size: 16px;
        `;

        const message = document.createElement('p');
        message.textContent = `${outsideKeyframes.length}개의 키프레임이 클립 범위 밖에 있습니다. 키프레임을 제거하거나 클립 크기를 되돌릴 수 있습니다.`;
        message.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
            font-size: 14px;
            line-height: 1.4;
        `;

        const keyframeList = document.createElement('div');
        keyframeList.style.cssText = `
            margin: 0 0 20px 0;
            max-height: 100px;
            overflow-y: auto;
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
        `;

        outsideKeyframes.forEach(({ absoluteTime, propertyType }) => {
            const item = document.createElement('div');
            item.textContent = `${propertyType}: ${absoluteTime.toFixed(2)}s`;
            item.style.cssText = `
                margin: 2px 0;
                color: #666;
            `;
            keyframeList.appendChild(item);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        `;

        const removeButton = document.createElement('button');
        removeButton.textContent = '제거';
        removeButton.style.cssText = `
            padding: 8px 16px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        removeButton.onclick = () => {
            console.log("=== 다이얼로그에서 키프레임 제거 시작 ===");
            
            // 모든 키프레임의 시간을 수집 (중복 제거)
            const uniqueTimes = [...new Set(outsideKeyframes.map(kf => kf.absoluteTime))];
            console.log("제거할 키프레임 시간들:", uniqueTimes);
            
            // 각 시간에 대해 모든 속성(position, rotation, scale) 삭제
            uniqueTimes.forEach(time => {
                if (track.uuid) {
                    const properties = ['position', 'rotation', 'scale'];
                    let allDeleted = true;

                    properties.forEach(prop => {
                        const trackData = this.timelineData.tracks.get(track.uuid)?.get(prop);
                        if (trackData) {
                            console.log(`${prop} 트랙 키프레임 정보:`, {
                                keyframeCount: trackData.keyframeCount,
                                times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
                                searchTime: time
                            });
                            
                            const keyframeIndex = trackData.findKeyframeIndex(time);
                            console.log(`${prop} 키프레임 인덱스 검색 결과:`, { time, keyframeIndex });
                            
                            if (keyframeIndex !== -1) {
                                if (trackData.removeKeyframeByIndex(keyframeIndex)) {
                                    console.log(`${prop} 키프레임 삭제 완료:`, { time, index: keyframeIndex });
                                } else {
                                    console.warn(`${prop} 키프레임 삭제 실패:`, { time, index: keyframeIndex });
                                    allDeleted = false;
                                }
                            } else {
                                console.warn(`${prop} 키프레임 인덱스를 찾을 수 없음:`, { time });
                                allDeleted = false;
                            }
                        } else {
                            console.warn(`${prop} trackData를 찾을 수 없음:`, track.uuid);
                            allDeleted = false;
                        }
                    });

                    if (allDeleted) {
                        console.log(`시간 ${time}s의 모든 속성 키프레임 삭제 완료`);
                    } else {
                        console.error(`시간 ${time}s의 일부 속성 키프레임 삭제에 실패했습니다`);
                    }
                }
            });
            
            // UI에서 모든 키프레임 요소 제거
            outsideKeyframes.forEach(({ keyframe }) => {
                keyframe.remove();
            });

            // TimelineData 업데이트
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();
            
            dialog.remove();
            document.removeEventListener('keydown', handleEscape);
            console.log('=== 다이얼로그에서 키프레임 제거 완료 ===');
        };



        const cancelButton = document.createElement('button');
        cancelButton.textContent = '취소';
        cancelButton.style.cssText = `
            padding: 8px 16px;
            background: #ccc;
            color: #333;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelButton.onclick = () => {
            // 클립 크기를 이전 상태로 되돌리기
            const initialLeft = parseFloat(sprite.dataset.initialLeft) || 0;
            const initialWidth = parseFloat(sprite.dataset.initialWidth) || 100;
            const initialDuration = (initialWidth / 100) * this.options.totalSeconds;
            
            sprite.style.left = `${initialLeft}%`;
            sprite.style.width = `${initialWidth}%`;
            sprite.dataset.duration = initialDuration.toString();
            
            // 키프레임 숨김 해제 (정상 상태로 복원)
            outsideKeyframes.forEach(({ keyframe }) => {
                keyframe.style.opacity = '1';
                keyframe.style.background = '#f90';
                keyframe.title = '';
                delete keyframe.dataset.outsideClip;
            });
            
            // 키프레임 위치 재계산
            this.updateKeyframesInClip(track, sprite);
            
            dialog.remove();
            document.removeEventListener('keydown', handleEscape);
            console.log('사용자가 취소를 선택했습니다. 클립 크기가 이전 상태로 되돌아갔습니다.');
        };

        buttonContainer.appendChild(removeButton);
        buttonContainer.appendChild(cancelButton);

        dialog.appendChild(title);
        dialog.appendChild(message);
        dialog.appendChild(keyframeList);
        dialog.appendChild(buttonContainer);

        document.body.appendChild(dialog);

        // ESC 키로 다이얼로그 닫기
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                dialog.remove();
                document.removeEventListener('keydown', handleEscape);
                console.log('ESC 키로 다이얼로그가 닫혔습니다.');
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 다이얼로그 외부 클릭 시 닫기 방지 (사용자가 명시적으로 선택하도록)
        dialog.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 자동 타임아웃 제거 - 사용자가 명시적으로 선택할 때까지 다이얼로그 유지
        // setTimeout(() => {
        //     if (document.body.contains(dialog)) {
        //         dialog.remove();
        //         console.log('다이얼로그가 자동으로 닫혔습니다.');
        //     }
        // }, 5000);
    }

    // 객체 애니메이션 즉시 업데이트
    updateObjectAnimationImmediately(objectUuid, propertyType, newTime) {
        console.log("=== 객체 애니메이션 즉시 업데이트 ===");
        console.log("objectUuid:", objectUuid, "propertyType:", propertyType, "newTime:", newTime);
        
        const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
        if (!object) {
            console.warn("객체를 찾을 수 없습니다:", objectUuid);
            return;
        }

        const trackData = this.timelineData.tracks.get(objectUuid)?.get(propertyType);
        if (!trackData) {
            console.warn("트랙 데이터를 찾을 수 없습니다:", objectUuid, propertyType);
            return;
        }

        console.log("트랙 데이터 상태:", {
            keyframeCount: trackData.keyframeCount,
            times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
            values: Array.from(trackData.values.slice(0, trackData.keyframeCount * 3))
        });

        // 새로운 시간에서의 값을 직접 계산
        const value = trackData.getValueAtTime(newTime);
        console.log("getValueAtTime 결과:", value);
        
        if (value) {
            console.log("즉시 업데이트 - 새로운 값:", value);
            console.log("업데이트 전 객체 상태:", {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone()
            });
            
            this.applyValue(object, propertyType, value);
            
            console.log("업데이트 후 객체 상태:", {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone()
            });
        } else {
            console.warn("새로운 시간에서 값을 계산할 수 없습니다:", newTime);
        }
    }

    // 클립 이동 후 키프레임 시간 업데이트 (간단한 방식)
    updateKeyframeTimesAfterClipMove(track, sprite) {
        console.log("=== 클립 이동 후 키프레임 시간 업데이트 시작 ===");
        
        const keyframeLayer = sprite.querySelector(".keyframe-layer");
        if (!keyframeLayer) return;

        const keyframes = Array.from(keyframeLayer.querySelectorAll(".keyframe"));
        if (keyframes.length === 0) return;

        // 클립의 이전 위치와 새로운 위치 정보
        const oldClipLeft = parseFloat(sprite.dataset.initialLeft || sprite.style.left) || 0;
        const newClipLeft = parseFloat(sprite.style.left) || 0;
        
        // 클립 이동 거리 계산 (시간 단위)
        const oldClipStartTime = (oldClipLeft / 100) * this.options.totalSeconds;
        const newClipStartTime = (newClipLeft / 100) * this.options.totalSeconds;
        const timeOffset = newClipStartTime - oldClipStartTime;

        console.log("클립 이동 정보:", {
            oldClipLeft,
            newClipLeft,
            oldClipStartTime,
            newClipStartTime,
            timeOffset,
            keyframeCount: keyframes.length
        });

        // TimelineData에서 모든 속성의 키프레임 시간 업데이트
        if (track.uuid) {
            const objectTracks = this.timelineData.tracks.get(track.uuid);
            if (objectTracks) {
                // 모든 속성(position, rotation, scale)에 대해 키프레임 시간 업데이트
                const properties = ['position', 'rotation', 'scale'];
                
                properties.forEach(propertyType => {
                    const trackData = objectTracks.get(propertyType);
                    if (trackData && trackData.keyframeCount > 0) {
                        console.log(`${propertyType} 트랙 키프레임 시간 업데이트:`, {
                            keyframeCount: trackData.keyframeCount,
                            times: Array.from(trackData.times.slice(0, trackData.keyframeCount))
                        });
                        
                        // 키프레임 데이터 백업 (시간, 값, 보간 방식)
                        const backupData = [];
                        for (let i = 0; i < trackData.keyframeCount; i++) {
                            backupData.push({
                                time: trackData.times[i],
                                value: new THREE.Vector3(
                                    trackData.values[i * 3],
                                    trackData.values[i * 3 + 1],
                                    trackData.values[i * 3 + 2]
                                ),
                                interpolation: trackData.interpolations[i]
                            });
                        }
                        
                        // 백업된 데이터로 새로운 시간 계산하여 업데이트
                        backupData.forEach((data, i) => {
                            const newTime = data.time + timeOffset;
                            const clampedNewTime = Math.max(0, newTime);
                            
                            // 시간 업데이트
                            trackData.times[i] = clampedNewTime;
                            
                            // 값 업데이트 (동일한 값 유지)
                            trackData.values[i * 3] = data.value.x;
                            trackData.values[i * 3 + 1] = data.value.y;
                            trackData.values[i * 3 + 2] = data.value.z;
                            
                            // 보간 방식 유지
                            trackData.interpolations[i] = data.interpolation;
                            
                            console.log(`${propertyType} 키프레임 ${i} 시간 업데이트: ${data.time} -> ${clampedNewTime} (값 유지)`);
                        });
                        
                        // 정렬 수행
                        trackData.sortKeyframes();
                        trackData.dirty = true;
                    }
                });
            }
        }

        // UI 키프레임 시간 업데이트 (position만 표시되므로)
        keyframes.forEach((keyframe) => {
            const oldTime = parseFloat(keyframe.dataset.time);
            if (!isNaN(oldTime)) {
                const newTime = oldTime + timeOffset;
                const clampedNewTime = Math.max(0, newTime);
                
                keyframe.dataset.time = clampedNewTime.toString();
                
                // 새로운 인덱스 찾기
                if (track.uuid) {
                    const trackData = this.timelineData.tracks.get(track.uuid)?.get('position');
                    if (trackData) {
                        const newIndex = trackData.findKeyframeIndex(clampedNewTime);
                        if (newIndex !== -1) {
                            keyframe.dataset.index = newIndex.toString();
                        }
                    }
                }
            }
        });

        // 클립의 새로운 위치를 초기 위치로 저장
        sprite.dataset.initialLeft = newClipLeft.toString();

        // TimelineData 업데이트
        this.timelineData.dirty = true;
        this.timelineData.precomputeAnimationData();
        
        // UI 강제 업데이트 (클립 이동 후 키프레임 위치 재계산)
        setTimeout(() => {
            const trackElement = this.container.querySelector(`[data-uuid="${track.uuid}"]`);
            if (trackElement) {
                console.log("클립 이동 후 UI 강제 업데이트 실행");
                this.updateTrackUI(trackElement, this.currentTime);
            }
        }, 50);
        
        console.log("=== 클립 이동 후 키프레임 시간 업데이트 완료 ===");
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

        // Editor의 userData에서도 제거
        if (this.editor.scene.userData.timeline) {
            this.editor.scene.userData.timeline.selectedKeyframe = null;
        }

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
        newClip.dataset.previousDuration = sourceClip.dataset.duration; // 복제 시에도 previousDuration 초기화

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

    // 특정 시간으로 playhead 이동
    movePlayheadToTime(time) {
        console.log("=== movePlayheadToTime 시작 ===", { time });

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

        // data-* 속성 업데이트
        this.setAnimationProperty('currentTime', clampedTime);
        this.setAnimationProperty('animationFrame', Math.floor(clampedTime * this.timelineData.frameRate));

        // 애니메이션 업데이트
        this.updateAnimation(clampedTime);

        // Timeline.js와 동기화
        if (this.editor.scene?.userData?.timeline) {
            this.editor.scene.userData.timeline.currentSeconds = clampedTime;
        }

        console.log("=== movePlayheadToTime 완료 ===", {
            originalTime: time,
            clampedTime,
            playheadPercent
        });
    }

    moveToAdjacentKeyframe(trackElement, direction) {
        console.log("=== moveToAdjacentKeyframe 시작 ===", { direction, trackElement });

        // 선택된 키프레임 찾기
        let selectedKeyframe = trackElement.querySelector(".keyframe.selected");

        // 선택된 키프레임이 없으면 첫 번째 키프레임을 선택
        if (!selectedKeyframe) {
            const keyframeElements = Array.from(trackElement.querySelectorAll(".keyframe"));
            if (keyframeElements.length === 0) {
                console.warn("키프레임이 없습니다.");
                return;
            }

            // index 기반으로 정렬
            const sortedKeyframes = keyframeElements.sort((a, b) => {
                return parseInt(a.dataset.index || 0) - parseInt(b.dataset.index || 0);
            });

            if (direction === "prev") {
                selectedKeyframe = sortedKeyframes[sortedKeyframes.length - 1]; // 마지막 키프레임
            } else {
                selectedKeyframe = sortedKeyframes[0]; // 첫 번째 키프레임
            }
        }

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
            console.log("이전 키프레임으로 이동:", {
                objectId,
                time,
                index
            });

            // 키프레임 선택
            this.selectKeyframe(objectId, time, prevKeyframe, index, {});

            // playhead 이동
            this.movePlayheadToTime(time);

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
            console.log("다음 키프레임으로 이동:", {
                objectId,
                time,
                index
            });

            // 키프레임 선택
            this.selectKeyframe(objectId, time, nextKeyframe, index, {});

            // playhead 이동
            this.movePlayheadToTime(time);
        } else {
            console.log("더 이상 이동할 키프레임이 없습니다:", { direction, currentIndex, totalKeyframes: sortedKeyframes.length });
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
        // TimelineData 기반으로 UI 업데이트
        this.timelineData.getAllTracksByUuid().forEach((trackInfo, key) => {
            const { uuid: objectUuid } = trackInfo;
            const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
            if (trackElement) {
                this.updateTrackUI(trackElement, this.currentTime);
            }
        });
    }

    updateTrackUI(trackElement, time) {
        if (!trackElement) {
            console.warn("Invalid trackElement in updateTrackUI:", trackElement);
            return;
        }

        const motionTracks = trackElement.querySelector('.motion-tracks');
        if (!motionTracks) {
            console.warn("No motion-tracks element found in trackElement:", trackElement);
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

        const objectUuid = trackElement.dataset.uuid;
        if (!objectUuid) {
            console.warn("No UUID found in trackElement:", trackElement);
            return;
        }

        // 모든 속성의 키프레임 렌더링
        const objectTracks = this.timelineData.tracks.get(objectUuid);
        if (!objectTracks) return;

        // 클립 정보 가져오기 (더 정확한 방법)
        const clipLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const clipDuration = parseFloat(sprite.dataset.duration) || 5;
        
        // 디버깅을 위한 로그 추가
        console.log("updateTrackUI - 클립 정보 상세:", {
            spriteStyleLeft: sprite.style.left,
            parsedClipLeft: clipLeft,
            clipStartTime,
            clipDuration,
            spriteDataset: {
                duration: sprite.dataset.duration,
                initialLeft: sprite.dataset.initialLeft
            }
        });

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

        // position 속성의 키프레임만 렌더링 (통합 키프레임)
        const positionTrack = objectTracks.get('position');
        if (positionTrack) {
            for (let i = 0; i < positionTrack.keyframeCount; i++) {
                const keyframeTime = positionTrack.times[i];
                
                // 클립 범위 체크 - 클립 밖의 키프레임은 UI에 생성하지 않음 (초기 키프레임 제외, 오차 범위 추가)
                if (keyframeTime !== 0 && (keyframeTime < clipStartTime - MotionTimeline.CLIP_RANGE_TOLERANCE || keyframeTime > clipStartTime + clipDuration + MotionTimeline.CLIP_RANGE_TOLERANCE)) {
                    console.log(`updateTrackUI에서 클립 범위 밖 키프레임 건너뜀: 시간=${keyframeTime}, 클립 범위=${clipStartTime}~${clipStartTime + clipDuration}, 오차범위=${MotionTimeline.CLIP_RANGE_TOLERANCE}초`);
                    continue;
                }
                 const keyframeElement = document.createElement('div');
                            
            keyframeElement.className = 'keyframe';
            keyframeElement.dataset.property = 'position';
            keyframeElement.dataset.time = keyframeTime.toFixed(2);
            keyframeElement.dataset.index = i;
            keyframeElement.dataset.draggable = 'false'; // 드래그 가능 상태 초기화

            // .time-ruler-container 기준으로 키프레임 시간의 픽셀 위치 계산
            const timeRulerContainer = document.querySelector('.time-ruler-container');
            if (!timeRulerContainer) {
                console.warn('.time-ruler-container를 찾을 수 없습니다.');
                return;
            }

            const timeRulerRect = timeRulerContainer.getBoundingClientRect();
            const timeRulerWidth = timeRulerRect.width;

            // 키프레임 시간에 해당하는 절대 픽셀 위치 (playhead 위치)
            const playheadPixelPosition = (keyframeTime / this.options.totalSeconds) * timeRulerWidth;

            // 클립의 시작 픽셀 위치
            const clipStartPixelPosition = (clipLeft / 100) * timeRulerWidth;

            // 키프레임 left = playhead 위치 - 클립 시작 위치
            const keyframeLeft = playheadPixelPosition - clipStartPixelPosition;

            console.log("키프레임 위치 계산:", {
                keyframeTime,
                totalSeconds: this.options.totalSeconds,
                timeRulerWidth,
                playheadPixelPosition,
                clipLeftPercent: clipLeft,
                clipStartPixelPosition,
                keyframeLeft
            });

            // px 단위로 설정 (이전 소스와 동일하게)
            keyframeElement.style.left = `${keyframeLeft}px`;
            keyframeElement.dataset.pixelPosition = keyframeLeft.toString();

            console.log("키프레임 위치 계산 결과:", {
                keyframeLeft,
                finalLeft: keyframeElement.style.left
            });

            // 현재 시간과 일치하는 키프레임 강조 (data-is-current 속성 사용)
            // data-is-current 속성 주석처리
            // const timeDiff = Math.abs(keyframeTime - time);
            // const isCurrent = timeDiff < 0.1; // 0.1초 이내면 현재 키프레임으로 간주
            // keyframeElement.dataset.isCurrent = isCurrent.toString();
            // keyframeElement.dataset.timeDiff = timeDiff.toFixed(3);

            // if (isCurrent) {
            //     keyframeElement.classList.add('current');
            //     keyframeElement.dataset.currentTime = time.toFixed(3);
            // }

            // 키프레임 데이터 저장
            const value = new THREE.Vector3(
                positionTrack.values[i * 3],
                positionTrack.values[i * 3 + 1],
                positionTrack.values[i * 3 + 2]
            );
            keyframeElement.dataset.value = JSON.stringify([value.x, value.y, value.z]);

            // 선택된 키프레임인지 확인하여 selected 클래스 추가
            if (this.selectedKeyframe && 
                this.selectedKeyframe.objectId === objectUuid && 
                this.selectedKeyframe.property === 'position' && 
                this.selectedKeyframe.index === i) {
                keyframeElement.classList.add('selected');
                console.log("선택된 키프레임에 selected 클래스 추가:", keyframeElement);
            }

            keyframeLayer.appendChild(keyframeElement);
            
            // 키프레임에 직접 이벤트 리스너 등록
            keyframeElement.addEventListener("click", (e) => {
                e.stopPropagation();
                console.log("키프레임 클릭");
                
                const time = parseFloat(keyframeElement.dataset.time);
                const index = parseInt(keyframeElement.dataset.index);
                this.selectKeyframe(objectUuid, time, keyframeElement, index, {});
            });
            
                         keyframeElement.addEventListener("mousedown", (e) => {
                 console.log("키프레임 mousedown");
                 e.stopPropagation();
                 
                 let isDragging = false;
                 let isOutsideClip = false;
                 let startX = e.clientX;
                 let startY = e.clientY;
                 let dragStartIndex = parseInt(keyframeElement.dataset.index);
                 const REMOVE_THRESHOLD = 50;
                 
                 const handleMouseMove = (e) => {
                     if (!isDragging) {
                         isDragging = true;
                         console.log("드래그 시작");
                     }
                     
                     const dx = e.clientX - startX;
                     const dy = e.clientY - startY; // Y 이동량 추가
                     const sprite = keyframeElement.closest(".animation-sprite");
                     if (!sprite) return;
                     
                     console.log("드래그 중 - dy:", dy, "REMOVE_THRESHOLD:", REMOVE_THRESHOLD);
                     
                     if (dy > REMOVE_THRESHOLD) {
                         // 아래로 드래그해서 삭제 모드
                         if (!isOutsideClip) {
                             isOutsideClip = true;
                             console.log("삭제 모드 진입!");
                             keyframeElement.classList.add("delete-preview");
                             keyframeElement.style.opacity = "0.5";
                             keyframeElement.style.background = "#ff4444";
                         }
                     } else {
                         // 일반 드래그 모드
                         if (isOutsideClip) {
                             isOutsideClip = false;
                             console.log("일반 드래그 모드로 복귀");
                             keyframeElement.style.opacity = "1";
                             keyframeElement.style.background = "#f90";
                             keyframeElement.classList.remove("delete-preview");
                         }
                         
                         // 수평 드래그만 처리 (삭제 모드가 아닐 때)
                         if (!isOutsideClip) {
                             const spriteRect = sprite.getBoundingClientRect();
                             const relativeX = e.clientX - spriteRect.left;
                             const newLeft = Math.max(0, Math.min(spriteRect.width, relativeX));
                             
                             // 키프레임 위치 업데이트
                             keyframeElement.style.left = `${newLeft}px`;
                             
                             // 시간 계산
                             const timeRulerContainer = document.querySelector('.time-ruler-container');
                             if (timeRulerContainer) {
                                 const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                                 const timeRulerWidth = timeRulerRect.width;
                                 const clipLeft = parseFloat(sprite.style.left) || 0;
                                 const clipStartPixelPosition = (clipLeft / 100) * timeRulerWidth;
                                 const keyframeAbsolutePixelPosition = clipStartPixelPosition + newLeft;
                                 const newTimeInSeconds = (keyframeAbsolutePixelPosition / timeRulerWidth) * this.options.totalSeconds;
                                 
                                 console.log("드래그 중 - 새 시간:", newTimeInSeconds);
                                 
                                // TimelineData 업데이트 (모든 속성 동시 업데이트)
                                const properties = ['position', 'rotation', 'scale'];
                                let allUpdated = true;

                                properties.forEach(prop => {
                                    const trackData = this.timelineData.tracks.get(objectUuid)?.get(prop);
                                    if (trackData && dragStartIndex >= 0 && dragStartIndex < trackData.keyframeCount) {
                                        if (trackData.updateKeyframeTime(dragStartIndex, newTimeInSeconds)) {
                                            console.log(`${prop} 키프레임 시간 업데이트 성공:`, newTimeInSeconds);
                                        } else {
                                            console.warn(`${prop} 키프레임 시간 업데이트 실패`);
                                            allUpdated = false;
                                        }
                                    } else {
                                        console.warn(`${prop} trackData를 찾을 수 없거나 유효하지 않은 인덱스`);
                                        allUpdated = false;
                                    }
                                });

                                if (allUpdated) {
                                    keyframeElement.dataset.time = newTimeInSeconds.toFixed(2);
                                    this.timelineData.dirty = true;
                                    this.timelineData.precomputeAnimationData();
                                    
                                    // 모든 속성의 객체 즉시 업데이트
                                    const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
                                    if (object) {
                                        properties.forEach(prop => {
                                            const trackData = this.timelineData.tracks.get(objectUuid)?.get(prop);
                                            if (trackData) {
                                                const newValue = trackData.getValueAtTime(newTimeInSeconds);
                                                if (newValue) {
                                                    this.applyValue(object, prop, newValue);
                                                }
                                            }
                                        });
                                    }
                                }
                             }
                         }
                     }
                 };
                 
                 const handleMouseUp = (e) => {
                     console.log("드래그 종료 - isOutsideClip:", isOutsideClip);
                     
                     if (isDragging) {
                         if (isOutsideClip) {
                             console.log("=== 키프레임 삭제 실행! ===");
                             
                             // 모든 속성(position, rotation, scale)의 키프레임 삭제
                             const trackUuid = keyframeElement.closest('.timeline-track')?.dataset.uuid;
                             if (trackUuid) {
                                 const properties = ['position', 'rotation', 'scale'];
                                 let allDeleted = true;

                                 properties.forEach(prop => {
                                     const trackData = this.timelineData.tracks.get(trackUuid)?.get(prop);
                                     if (trackData) {
                                         if (dragStartIndex >= 0 && dragStartIndex < trackData.keyframeCount) {
                                             if (trackData.removeKeyframeByIndex(dragStartIndex)) {
                                                 console.log(`${prop} 키프레임 삭제 완료:`, dragStartIndex);
                                             } else {
                                                 console.warn(`${prop} 키프레임 삭제 실패:`, dragStartIndex);
                                                 allDeleted = false;
                                             }
                                         } else {
                                             console.warn(`${prop} 유효하지 않은 키프레임 인덱스:`, dragStartIndex);
                                             allDeleted = false;
                                         }
                                     } else {
                                         console.warn(`${prop} trackData를 찾을 수 없음:`, trackUuid);
                                         allDeleted = false;
                                     }
                                 });

                                 if (allDeleted) {
                                     console.log("모든 속성의 키프레임 삭제 완료");
                                 } else {
                                     console.error("일부 속성의 키프레임 삭제에 실패했습니다");
                                 }
                             } else {
                                 console.warn("trackUuid를 찾을 수 없음");
                             }
                             
                             // UI에서 키프레임 제거
                             keyframeElement.remove();
                             
                             // TimelineData 업데이트
                             this.timelineData.dirty = true;
                             this.timelineData.precomputeAnimationData();
                             this.updateAnimation();
                             console.log("=== 키프레임 삭제 완료 ===");
                         } else {
                             console.log("키프레임 이동 완료");
                             // 일반 이동 완료
                             this.timelineData.dirty = true;
                             this.timelineData.precomputeAnimationData();
                             this.updateAnimation(this.currentTime);
                         }
                     }
                     
                     isDragging = false;
                     document.removeEventListener("mousemove", handleMouseMove);
                     document.removeEventListener("mouseup", handleMouseUp);
                 };
                 
                 document.addEventListener("mousemove", handleMouseMove);
                 document.addEventListener("mouseup", handleMouseUp);
             });
        }
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

        // 이미 드래그 가능한 상태인지 확인
        if (keyframeElement.dataset.draggable === 'true') {
            console.log("이미 드래그 가능한 키프레임입니다.");
            return;
        }

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let isOutsideClip = false;
        let dragStartIndex = -1;
        const REMOVE_THRESHOLD = 50;

        // 드래그 가능 상태로 표시
        keyframeElement.dataset.draggable = 'true';

        // 인라인 이벤트 핸들러 사용
        keyframeElement.onclick = (e) => {
            e.stopPropagation();
            console.log("=== 키프레임 클릭 테스트 ===");

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
                console.log("selectKeyframe 호출:", {
                    time,
                    keyframeElement,
                    keyframeIndex
                });
                this.selectKeyframe(track.uuid, time, keyframeElement, keyframeIndex, {});
            }
        };

        // 드래그 이벤트
        keyframeElement.onmousedown = (e) => {
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

            // 키프레임 인덱스 가져오기 (position 트랙 기준으로 모든 속성에 동일하게 적용)
            if (track.uuid) {
                const positionTrackData = this.timelineData.tracks.get(track.uuid)?.get('position');
                if (positionTrackData) {
                    dragStartIndex = positionTrackData.findKeyframeIndex(dragStartTime);
                    console.log("trackData 인덱스", positionTrackData);
                    console.log("trackData 시간", dragStartTime);
                    console.log("드래그 시작 - 인덱스 (position 기준):", dragStartIndex, "시간:", dragStartTime);
                } else {
                    console.warn("position 트랙을 찾을 수 없음:", track.uuid);
                }
            }

            // 키프레임 선택
            if (track.uuid) {
                this.selectKeyframe(track.uuid, dragStartTime, keyframeElement, dragStartIndex, {});
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

                    // .time-ruler-container 기준으로 새로운 시간 계산
                    const timeRulerContainer = document.querySelector('.time-ruler-container');
                    if (!timeRulerContainer) {
                        console.warn('.time-ruler-container를 찾을 수 없습니다.');
                        return;
                    }

                    const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                    const timeRulerWidth = timeRulerRect.width;

                    // 클립의 시작 픽셀 위치
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartPixelPosition = (clipLeft / 100) * timeRulerWidth;

                    // 키프레임의 절대 픽셀 위치 = 클립 시작 위치 + 키프레임 상대 위치
                    const keyframeAbsolutePixelPosition = clipStartPixelPosition + newLeft;

                    // 절대 픽셀 위치를 시간으로 변환
                    const newTimeInSeconds = (keyframeAbsolutePixelPosition / timeRulerWidth) * this.options.totalSeconds;

                    console.log("드래그 중 - 시간 계산:", {
                        newLeft,
                        spriteRectWidth: spriteRect.width,
                        timeRulerWidth,
                        clipLeft,
                        clipStartPixelPosition,
                        keyframeAbsolutePixelPosition,
                        newTimeInSeconds
                    });

                    // TimelineData 업데이트 (안전한 방식)
                    if (track.uuid) {
                        console.log("=== TimelineData 업데이트 시작 ===");
                        console.log("track.uuid:", track.uuid);
                        console.log("property:", property);
                        
                        const trackData = this.timelineData.tracks.get(track.uuid)?.get(property);
                        console.log("trackData 찾기 결과:", !!trackData);
                        
                        if (trackData) {
                            console.log("trackData 상세 정보:");
                            console.log("- keyframeCount:", trackData.keyframeCount);
                            console.log("- times 배열:", Array.from(trackData.times.slice(0, trackData.keyframeCount)));
                            console.log("- values 배열:", Array.from(trackData.values.slice(0, trackData.keyframeCount * 3)));
                            console.log("- dirty 상태:", trackData.dirty);
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
                                console.log("=== 키프레임 시간 업데이트 성공 (makeKeyframeDraggable) ===");
                                console.log("업데이트된 trackData 상태:", {
                                    keyframeCount: trackData.keyframeCount,
                                    times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
                                    values: Array.from(trackData.values.slice(0, trackData.keyframeCount * 3))
                                });
                                
                                // 새로운 인덱스 찾기 (정렬 후)
                                const newIndex = trackData.findKeyframeIndex(newTimeInSeconds);
                                if (newIndex !== -1) {
                                    keyframeElement.dataset.index = newIndex.toString();
                                    console.log("새 키프레임 인덱스 업데이트:", newIndex);
                                } else {
                                    console.warn("새로운 시간에 해당하는 키프레임 인덱스를 찾을 수 없습니다:", newTimeInSeconds);
                                }

                                // TimelineData의 maxTime 업데이트
                                this.timelineData.updateMaxTime(newTimeInSeconds);
                                console.log("maxTime 업데이트 완료:", newTimeInSeconds);

                                // UI의 dataset.time 업데이트
                                keyframeElement.dataset.time = newTimeInSeconds.toFixed(2);
                                console.log("키프레임 시간 업데이트 완료:", newTimeInSeconds);

                                // TimelineData 업데이트
                                this.timelineData.dirty = true;
                                this.timelineData.precomputeAnimationData();

                                // 키프레임이 드래그된 위치로 playhead 이동
                                this.movePlayheadToTime(newTimeInSeconds);
                                
                                // 새로운 시간에 맞춰 애니메이션 즉시 업데이트
                                this.updateAnimation(newTimeInSeconds);


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

                    // 클립 밖에서 마우스를 놓았으면 키프레임 삭제
                    if (isOutsideClip) {
                        console.log("=== 키프레임 드래그 삭제 시작 ===");
                        
                        // 모든 속성(position, rotation, scale)의 키프레임 삭제
                        if (track.uuid) {
                            const properties = ['position', 'rotation', 'scale'];
                            let allDeleted = true;

                            properties.forEach(prop => {
                                const trackData = this.timelineData.tracks.get(track.uuid)?.get(prop);
                                if (trackData) {
                                    // index 기반으로 키프레임 삭제
                                    if (dragStartIndex >= 0 && dragStartIndex < trackData.keyframeCount) {
                                        if (trackData.removeKeyframeByIndex(dragStartIndex)) {
                                            console.log(`${prop} 키프레임 삭제 완료:`, dragStartIndex);
                                        } else {
                                            console.warn(`${prop} 키프레임 삭제 실패:`, dragStartIndex);
                                            allDeleted = false;
                                        }
                                    } else {
                                        console.warn(`${prop} 유효하지 않은 키프레임 인덱스:`, dragStartIndex);
                                        allDeleted = false;
                                    }
                                } else {
                                    console.warn(`${prop} trackData를 찾을 수 없음:`, track.uuid);
                                    allDeleted = false;
                                }
                            });

                            if (allDeleted) {
                                console.log("모든 속성의 키프레임 삭제 완료");
                            } else {
                                console.error("일부 속성의 키프레임 삭제에 실패했습니다");
                            }
                        }

                        // UI에서 키프레임 제거
                        keyframeElement.remove();

                        // TimelineData 업데이트
                        this.timelineData.dirty = true;
                        this.timelineData.precomputeAnimationData();
                        this.updateAnimation();
                        
                        console.log("=== 키프레임 드래그 삭제 완료 ===");
                    } else {
                        // 클립 안에서 놓았으면 드래그 중에 이미 업데이트되었으므로 추가 업데이트 불필요
                        // 현재 시간에 맞춰 애니메이션만 업데이트
                        this.updateAnimation(this.currentTime);
                    }
                }
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        };
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
            if (track.uuid) {
                const time = parseFloat(keyframeElement.dataset.time);
                this.selectKeyframe(track.uuid, time, keyframeElement, null, {});
            }
        });

        // 드래그 이벤트 핸들러를 함수 외부에 정의
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const sprite = keyframeElement.closest(".animation-sprite");
            if (!sprite) return;
            const spriteRect = sprite.getBoundingClientRect();
            const relativeX = e.clientX - spriteRect.left;
            
            console.log("=== 키프레임 드래그 중 디버깅 ===");
            console.log("dy:", dy, "REMOVE_THRESHOLD:", REMOVE_THRESHOLD);
            console.log("isOutsideClip:", isOutsideClip);
            console.log("startY:", startY, "currentY:", e.clientY);
            
            if (dy > REMOVE_THRESHOLD) {
                console.log("아래로 충분히 드래그됨 - 삭제 조건 충족");
                if (!isOutsideClip) {
                    isOutsideClip = true;
                    console.log("isOutsideClip을 true로 변경");
                    keyframeElement.classList.add("delete-preview");
                    keyframeElement.style.opacity = "0.5";
                    keyframeElement.style.background = "#ff4444";
                }
            } else {
                if (isOutsideClip) {
                    isOutsideClip = false;
                    console.log("isOutsideClip을 false로 변경 - 클립 안으로 돌아옴");
                    keyframeElement.style.opacity = "1";
                    keyframeElement.style.background = "#f90";
                    keyframeElement.classList.remove("delete-preview");
                }
                
                // 수평 드래그만 처리 (삭제 모드가 아닐 때)
                if (!isOutsideClip) {
                    const newLeft = Math.max(0, Math.min(spriteRect.width, relativeX));
                    keyframeElement.style.left = `${newLeft}px`;
                    keyframeElement.dataset.pixelPosition = newLeft.toString();
                    const timeRulerContainer = document.querySelector('.time-ruler-container');
                    if (!timeRulerContainer) return;
                    const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                    const timeRulerWidth = timeRulerRect.width;
                    const clipLeft = parseFloat(sprite.style.left) || 0;
                    const clipStartPixelPosition = (clipLeft / 100) * timeRulerWidth;
                    const keyframeAbsolutePixelPosition = clipStartPixelPosition + newLeft;
                    const newTimeInSeconds = (keyframeAbsolutePixelPosition / timeRulerWidth) * this.options.totalSeconds;
                    if (track.uuid) {
                        const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
                        if (trackData) {
                            if (dragStartIndex < 0 || dragStartIndex >= trackData.keyframeCount) return;
                            if (trackData.updateKeyframeTime(dragStartIndex, newTimeInSeconds)) {
                                const newIndex = trackData.findKeyframeIndex(newTimeInSeconds);
                                if (newIndex !== -1) {
                                    keyframeElement.dataset.index = newIndex.toString();
                                }
                                this.timelineData.updateMaxTime(newTimeInSeconds);
                                keyframeElement.dataset.time = newTimeInSeconds.toFixed(2);
                                this.timelineData.dirty = true;
                                this.timelineData.precomputeAnimationData();
                                const draggedObject = this.editor.scene.getObjectByProperty('uuid', track.uuid);
                                if (draggedObject) {
                                    const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
                                    if (trackData) {
                                        const newValue = trackData.getValueAtTime(newTimeInSeconds);
                                        if (newValue) {
                                            this.applyValue(draggedObject, propertyType, newValue);
                                        }
                                    }
                                }
                                this.updateAnimation(this.currentTime);
                                this.forceUpdateObjectAfterKeyframeDrag(track.uuid, propertyType, this.currentTime);
                                if (track.uuid) {
                                    this.updateObjectAnimationImmediately(track.uuid, propertyType, this.currentTime);
                                }
                            }
                        }
                    }
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
                    
                    // 모든 속성(position, rotation, scale)의 키프레임 삭제
                    if (track.uuid) {
                        const properties = ['position', 'rotation', 'scale'];
                        let allDeleted = true;

                        properties.forEach(prop => {
                            const trackData = this.timelineData.tracks.get(track.uuid)?.get(prop);
                            if (trackData) {
                                console.log(`${prop} 삭제할 키프레임 인덱스:`, dragStartIndex);
                                if (dragStartIndex >= 0 && dragStartIndex < trackData.keyframeCount) {
                                    if (trackData.removeKeyframeByIndex(dragStartIndex)) {
                                        console.log(`${prop} 키프레임 삭제 완료!`);
                                    } else {
                                        console.warn(`${prop} 키프레임 삭제 실패!`);
                                        allDeleted = false;
                                    }
                                } else {
                                    console.warn(`${prop} 유효하지 않은 키프레임 인덱스:`, dragStartIndex);
                                    allDeleted = false;
                                }
                            } else {
                                console.warn(`${prop} trackData를 찾을 수 없음:`, track.uuid);
                                allDeleted = false;
                            }
                        });

                        if (allDeleted) {
                            console.log("모든 속성의 키프레임 삭제 완료!");
                        } else {
                            console.error("일부 속성의 키프레임 삭제에 실패했습니다!");
                        }
                    } else {
                        console.warn("track.uuid가 없음");
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
                    const lastDragTime = parseFloat(keyframeElement.dataset.time);
                    this.movePlayheadToTime(lastDragTime);
                    const draggedObject = this.editor.scene.getObjectByProperty('uuid', track.uuid);
                    if (draggedObject) {
                        const trackData = this.timelineData.tracks.get(track.uuid)?.get(propertyType);
                        if (trackData) {
                            const currentValue = trackData.getValueAtTime(this.currentTime);
                            if (currentValue) {
                                this.applyValue(draggedObject, propertyType, currentValue);
                            }
                        }
                    }
                    this.updateAnimation(this.currentTime);
                    this.forceUpdateObjectAfterKeyframeDrag(track.uuid, propertyType, this.currentTime);
                    if (track.uuid) {
                        this.updateObjectAnimationImmediately(track.uuid, propertyType, this.currentTime);
                    }
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
            isOutsideClip = false;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(keyframeElement.style.left) || 0;
            keyframeElement.classList.add("dragging");
            const dragStartTime = parseFloat(keyframeElement.dataset.time);
            
            console.log("드래그 시작 정보:", {
                startX,
                startY,
                startLeft,
                dragStartTime,
                trackUuid: track.uuid,
                propertyType
            });
            
            if (track.uuid) {
                // position 트랙에서 인덱스를 찾아서 모든 속성에 동일하게 적용
                const positionTrackData = this.timelineData.tracks.get(track.uuid)?.get('position');
                if (positionTrackData) {
                    dragStartIndex = positionTrackData.findKeyframeIndex(dragStartTime);
                    console.log("dragStartIndex (position 기준):", dragStartIndex);
                } else {
                    console.warn("position 트랙을 찾을 수 없음:", track.uuid);
                }
            }
            if (track.uuid) {
                this.selectKeyframe(track.uuid, dragStartTime, keyframeElement, dragStartIndex, {});
            }
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            console.log("이벤트 리스너 등록 완료");
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
        console.log("=== updatePlayheadPosition 시작 ===", { percent });

        const playhead = this.container.querySelector(".playhead");
        if (!playhead) {
            console.warn("playhead 요소를 찾을 수 없습니다.");
            return;
        }

        // 퍼센트 범위 제한
        const clampedPercent = Math.max(0, Math.min(100, percent));

        playhead.style.left = `${clampedPercent}%`;
        const currentTime = (clampedPercent / 100) * this.options.totalSeconds;
        this.currentTime = currentTime;

        // time-box 업데이트
        const timeBox = playhead.querySelector(".time-box");
        if (timeBox) {
            timeBox.textContent = `${currentTime.toFixed(2)}s`;
            console.log("time-box 업데이트:", timeBox.textContent);
        }

        console.log("playhead 위치 업데이트:", {
            originalPercent: percent,
            clampedPercent,
            currentTime,
            left: playhead.style.left
        });

        // data-* 속성 업데이트
        this.setAnimationProperty('currentTime', currentTime);
        this.setAnimationProperty('animationFrame', Math.floor(currentTime * this.timelineData.frameRate));

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
        this.updateAnimation(currentTime);

        // Timeline.js와 동기화
        if (this.editor.scene?.userData?.timeline) {
            this.editor.scene.userData.timeline.currentSeconds = currentTime;
        }

        this.updateUI();

        if (this.editor.signals?.timelineChanged) {
            this.editor.signals.timelineChanged.dispatch();
        }

        console.log("=== updatePlayheadPosition 완료 ===");
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

                // 클립 정보 가져오기
                const clipLeft = parseFloat(sprite.style.left) || 0;
                const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                const clipEndTime = clipStartTime + clipDuration;

                // .time-ruler-container에서의 playhead 절대 시간 계산
                const playheadAbsoluteTime = (playheadRelativeToTimeRuler / timeRulerWidth) * this.options.totalSeconds;

                // 키프레임이 클립 범위 밖에 있으면 추가하지 않음
                if (playheadAbsoluteTime < clipStartTime || playheadAbsoluteTime > clipEndTime) {
                    console.warn("키프레임 추가 버튼 - 클립 범위 밖이므로 추가하지 않습니다:", {
                        playheadAbsoluteTime,
                        clipStartTime,
                        clipEndTime,
                        clipDuration
                    });
                    
                    // 사용자에게 알림 표시
                    this.showClipRangeWarning("키프레임은 클립 범위 내에서만 추가할 수 있습니다.");
                    
                    return; // 클립 범위 밖이면 키프레임 추가하지 않음
                }

                // 절대 시간으로 키프레임 저장 (클립 이동에 관계없이 올바른 위치에 추가)
                const absoluteTime = playheadAbsoluteTime;

                console.log("키프레임 추가 - 시간 계산:", {
                    playheadAbsoluteTime,
                    clipStartTime,
                    clipEndTime,
                    absoluteTime,
                    timelineWidth: timeRulerWidth,
                    totalSeconds: this.options.totalSeconds
                });

                // 모든 속성과 함께 키프레임 추가
                const value = this.getKeyframeValue(object, 'position'); // position 값으로 시작
                if (value && track.uuid) {
                    // addKeyframe에서 모든 속성을 함께 저장하므로 position만 호출
                    console.log("모든 속성과 함께 키프레임 추가:", { time: absoluteTime });
                    this.addKeyframe(track.uuid, 'position', absoluteTime, value);
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

                // 클립 정보 가져오기
                const clipLeft = parseFloat(sprite.style.left) || 0;
                const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
                const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                const clipEndTime = clipStartTime + clipDuration;

                // .time-ruler-container에서의 클릭 절대 시간 계산
                const clickAbsoluteTime = (clickRelativeToTimeRuler / timeRulerWidth) * this.options.totalSeconds;

                // 클릭이 클립 범위 밖에 있으면 추가하지 않음
                if (clickAbsoluteTime < clipStartTime || clickAbsoluteTime > clipEndTime) {
                    console.warn("키프레임 레이어 클릭 - 클립 범위 밖이므로 추가하지 않습니다:", {
                        clickAbsoluteTime,
                        clipStartTime,
                        clipEndTime,
                        clipDuration
                    });
                    
                    // 사용자에게 알림 표시
                    this.showClipRangeWarning("키프레임은 클립 범위 내에서만 추가할 수 있습니다.");
                    
                    return; // 클립 범위 밖이면 키프레임 추가하지 않음
                }

                // 클립 내에서의 상대 시간 계산 (키프레임 저장용)
                const relativeTimeInClip = clickAbsoluteTime - clipStartTime;

                console.log("키프레임 레이어 클릭 - 시간 계산:", {
                    clickAbsoluteTime,
                    clipStartTime,
                    clipEndTime,
                    relativeTimeInClip,
                    timelineWidth: timeRulerWidth,
                    totalSeconds: this.options.totalSeconds
                });

                // 모든 속성과 함께 키프레임 추가
                const value = this.getKeyframeValue(object, 'position'); // position 값으로 시작
                if (!value) {
                    console.warn("키프레임 값을 가져올 수 없습니다:", { objectId, propertyType: 'position' });
                    return;
                }

                if (track.uuid) {
                    // addKeyframe에서 모든 속성을 함께 저장하므로 position만 호출
                    console.log("모든 속성과 함께 키프레임 추가 (레이어 클릭):", { time: clickAbsoluteTime });
                    this.addKeyframe(track.uuid, 'position', clickAbsoluteTime, value);
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
        const track = this.timelineData.getTrackById(objectId, property);
        if (track && track.removeKeyframe(time)) {
            this.updateUI();
            return true;
        }
        return false;
    }

    // 키프레임 가져오기 (인덱스 기반)
    getKeyframeByIndex(objectId, property, index) {
        const track = this.timelineData.getTrackById(objectId, property);
        if (track) {
            return track.getKeyframeByIndex(index);
        }
        return null;
    }

    // 키프레임 설정 (인덱스 기반)
    setKeyframeByIndex(objectId, property, index, time, value, interpolation = INTERPOLATION.LINEAR) {
        const track = this.timelineData.getTrackById(objectId, property);
        if (track && track.setKeyframeByIndex(index, time, value, interpolation)) {
            this.timelineData.updateMaxTime(time);
            this.updateUI();
            return true;
        }
        return false;
    }

    // 키프레임 개수 가져오기
    getKeyframeCount(objectId, property) {
        const track = this.timelineData.getTrackById(objectId, property);
        if (track) {
            return track.getKeyframeCount();
        }
        return 0;
    }

    // 모든 키프레임 가져오기
    getAllKeyframes(objectId, property) {
        const track = this.timelineData.getTrackById(objectId, property);
        if (track) {
            return track.getAllKeyframes();
        }
        return [];
    }

    // 선택된 키프레임 삭제 (인덱스 기반)
    deleteSelectedKeyframeByIndex() {
        if (!this.selectedKeyframe) return;

        const { objectId, index, element } = this.selectedKeyframe;

        console.log("키프레임 삭제 시작:", { objectId, index });

        // 모든 속성(position, rotation, scale)의 키프레임 삭제
        const properties = ['position', 'rotation', 'scale'];
        let allDeleted = true;

        properties.forEach(property => {
            if (!this.removeKeyframeByIndex(objectId, property, index)) {
                console.warn(`${property} 키프레임 삭제 실패:`, { objectId, index });
                allDeleted = false;
            } else {
                console.log(`${property} 키프레임 삭제 완료:`, { objectId, index });
            }
        });

        if (allDeleted) {
            // UI 요소 제거
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }

            this.selectedKeyframe = null;

            // Editor의 userData에서도 제거
            if (this.editor.scene.userData.timeline) {
                this.editor.scene.userData.timeline.selectedKeyframe = null;
            }

            // TimelineData 업데이트
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();

            this.updatePropertyPanel();

            if (this.editor.signals?.sceneGraphChanged) {
                this.editor.signals.sceneGraphChanged.dispatch();
            }

            console.log("모든 속성의 키프레임 삭제 완료");
        } else {
            console.error("일부 속성의 키프레임 삭제에 실패했습니다");
        }
    }

    // JSON 로드 후 호출되는 메서드 (Editor.js에서 호출됨)
    onAfterLoad() {
        try {
            console.log("=== MotionTimeline onAfterLoad 시작 ===");
            
            // window.projectData에서 motionTimeline 데이터 확인 (우선순위 1)
            if (window.projectData && window.projectData.motionTimeline) {
                console.log("window.projectData.motionTimeline 데이터:", window.projectData.motionTimeline);
                
                // timelineData가 비어있고 projectData에 데이터가 있으면 복원
                if (!this.timelineData || this.timelineData.tracks.size === 0) {
                    console.log("projectData에서 timelineData 복원 중...");
                    
                    const timelineData = window.projectData.motionTimeline;
                    console.log("원본 timelineData:", timelineData);
                    
                    if (timelineData.tracks && Object.keys(timelineData.tracks).length > 0) {
                        console.log("tracks 데이터 발견:", timelineData.tracks);
                        this.timelineData.fromJSON(timelineData);
                        console.log("projectData에서 복원 완료");
                    } else {
                        console.warn("projectData.motionTimeline에 tracks 데이터가 없습니다:", timelineData);
                    }
                }
            }
            
            // scene.userData에서 motionTimeline 데이터 확인 (우선순위 2)
            if (this.editor.scene && this.editor.scene.userData && this.editor.scene.userData.motionTimeline) {
                console.log("scene.userData.motionTimeline 데이터:", this.editor.scene.userData.motionTimeline);
                
                // timelineData가 여전히 비어있고 scene.userData에 데이터가 있으면 복원
                if (!this.timelineData || this.timelineData.tracks.size === 0) {
                    console.log("scene.userData에서 timelineData 복원 중...");
                    
                    const timelineData = this.editor.scene.userData.motionTimeline;
                    console.log("원본 timelineData:", timelineData);
                    
                    // tracks 속성이 있는지 확인
                    if (timelineData.tracks && Object.keys(timelineData.tracks).length > 0) {
                        console.log("tracks 데이터 발견:", timelineData.tracks);
                        this.timelineData.fromJSON(timelineData);
                        console.log("scene.userData에서 복원 완료");
                    } else {
                        console.warn("scene.userData.motionTimeline에 tracks 데이터가 없습니다:", timelineData);
                    }
                }
            } else {
                console.warn("scene.userData.motionTimeline이 없습니다");
            }
            
            console.log("복원할 MotionTimeline 데이터를 찾을 수 없습니다");

            // timelineData가 여전히 비어있으면 아무것도 하지 않음
            if (!this.timelineData || this.timelineData.tracks.size === 0) {
                console.log("timelineData가 비어있어서 UI 트랙 생성을 건너뜁니다.");
                return;
            }

            console.log("=== UI 트랙 생성 시작 ===");
            console.log("timelineData.tracks.size:", this.timelineData.tracks.size);

            // TimelineData에서 UI 트랙 생성
            this.timelineData.tracks.forEach((objectTracks, objectUuid) => {
                console.log(`트랙 생성 중: ${objectUuid}`);
                console.log(`objectTracks:`, objectTracks);
                
                // 씬에서 해당 객체 찾기
                let object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
                
                // UUID가 일치하지 않는 경우, 이름으로 찾기 시도
                if (!object) {
                    console.log(`UUID로 객체를 찾을 수 없음: ${objectUuid}, 이름으로 찾기 시도`);
                    
                    // scene의 모든 children을 순회하며 이름이 일치하는 객체 찾기
                    const findObjectByName = (parent) => {
                        for (const child of parent.children) {
                            if (child.name && child.name.length > 0) {
                                console.log(`검색 중: ${child.name} (${child.uuid})`);
                            }
                            // MotionTimeline 데이터의 UUID와 일치하는 객체 찾기
                            if (child.uuid === objectUuid) {
                                return child;
                            }
                            const found = findObjectByName(child);
                            if (found) return found;
                        }
                        return null;
                    };
                    
                    object = findObjectByName(this.editor.scene);
                    
                    if (object) {
                        console.log(`이름으로 객체 발견: ${object.name} (${object.uuid})`);
                        
                        // UUID를 실제 객체의 UUID로 업데이트
                        const oldUuid = objectUuid;
                        const newUuid = object.uuid;
                        
                        // TimelineData에서 UUID 업데이트
                        const oldTracks = this.timelineData.tracks.get(oldUuid);
                        if (oldTracks) {
                            this.timelineData.tracks.delete(oldUuid);
                            this.timelineData.tracks.set(newUuid, oldTracks);
                            console.log(`UUID 업데이트: ${oldUuid} -> ${newUuid}`);
                            objectUuid = newUuid; // 현재 반복에서 사용할 UUID 업데이트
                        }
                    } else {
                        // UUID로도 찾을 수 없는 경우, scene의 첫 번째 객체를 사용
                        console.log(`UUID ${objectUuid}로 객체를 찾을 수 없습니다. scene의 첫 번째 객체를 사용합니다.`);
                        if (this.editor.scene.children.length > 0) {
                            object = this.editor.scene.children[0];
                            console.log(`첫 번째 객체 사용: ${object.name} (${object.uuid})`);
                            
                            // UUID를 실제 객체의 UUID로 업데이트
                            const oldUuid = objectUuid;
                            const newUuid = object.uuid;
                            
                            // TimelineData에서 UUID 업데이트
                            const oldTracks = this.timelineData.tracks.get(oldUuid);
                            if (oldTracks) {
                                this.timelineData.tracks.delete(oldUuid);
                                this.timelineData.tracks.set(newUuid, oldTracks);
                                console.log(`UUID 업데이트: ${oldUuid} -> ${newUuid}`);
                                objectUuid = newUuid; // 현재 반복에서 사용할 UUID 업데이트
                            }
                        }
                    }
                }
                
                if (object) {
                    console.log(`객체 발견: ${object.name} (${objectUuid})`);
                    
                    // objectId 생성 (UUID의 일부 사용)
                    const objectId = objectUuid.split('-')[0] || objectUuid;

                    // addTrack 메서드로 UI 트랙 생성 (기존 키프레임 스킵)
                    const track = this.addTrack(objectUuid, objectId, object.name, true);
                    console.log(`UI 트랙 생성 완료:`, track);
                    
                    // 저장된 클립 정보 확인
                    const savedClipData = this.editor.scene.userData.motionTimeline?.clips?.[objectUuid];
                    if (savedClipData) {
                        console.log(`클립 정보 발견:`, savedClipData);
                        // 클립 정보 복원 로직
                    }
                } else {
                    console.warn(`객체를 찾을 수 없습니다: ${objectUuid}`);
                }
            });

            // 애니메이션 상태 복원
            this.timelineData.precomputeAnimationData();

            // 저장된 현재 시간 복원
            if (this.timelineData.currentTime !== undefined) {
                this.currentTime = this.timelineData.currentTime;
                console.log(`저장된 현재 시간 복원: ${this.currentTime}s`);
            } else {
                console.log("저장된 현재 시간이 없어서 0으로 초기화");
                this.currentTime = 0;
            }

            // UI가 완전히 로드되었는지 확인 후 애니메이션 업데이트
            setTimeout(() => {
                this.updateAnimation();

                // 모든 트랙의 UI 업데이트 강제 실행 (클립 범위 고려)
                this.timelineData.getAllTracksByUuid().forEach((trackInfo, key) => {
                    const { uuid: objectUuid } = trackInfo;
                    const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
                    if (trackElement) {
                        // 클립 범위를 고려하여 UI 업데이트
                        this.updateTrackUI(trackElement, this.currentTime);
                        
                        // 클립 범위 밖의 키프레임은 UI에서 제거
                        const sprites = trackElement.querySelectorAll('.animation-sprite');
                        sprites.forEach(sprite => {
                            const spriteLeft = parseFloat(sprite.style.left) || 0;
                            const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
                            const clipDuration = parseFloat(sprite.dataset.duration) || 5;
                            const clipEndTime = clipStartTime + clipDuration;
                            
                            const keyframes = sprite.querySelectorAll('.keyframe');
                            keyframes.forEach(keyframe => {
                                const keyframeTime = parseFloat(keyframe.dataset.time);
                                if (keyframeTime !== 0 && (keyframeTime < clipStartTime || keyframeTime > clipEndTime)) {
                                    console.log(`onAfterLoad에서 클립 범위 밖 키프레임 제거: 시간=${keyframeTime}, 클립 범위=${clipStartTime}~${clipEndTime}`);
                                    keyframe.remove();
                                }
                            });
                        });
                    }
                });

                // 속성 트랙들도 복원
                this.timelineData.tracks.forEach((objectTracks, objectUuid) => {
                    objectTracks.forEach((trackData, property) => {
                        if (property !== 'position') { // position은 이미 처리됨
                            this.createPropertyTrack(objectUuid, property);
                        }
                    });
                });

                // JSON 로드 후 data-is-current 속성 강제 업데이트 (더 긴 지연) - 주석처리
                // setTimeout(() => {
                //     this.updateKeyframeStates(this.currentTime);
                //     console.log("JSON 로드 후 키프레임 상태 업데이트 완료 (지연 실행)");
                    
                //     // 디버깅: 키프레임 요소들이 실제로 존재하는지 확인
                //     const allKeyframes = document.querySelectorAll('.keyframe');
                //     console.log(`총 ${allKeyframes.length}개의 키프레임 요소 발견`);
                    
                //     allKeyframes.forEach((keyframe, index) => {
                //         console.log(`키프레임 ${index}:`, {
                //             time: keyframe.dataset.time,
                //             isCurrent: keyframe.dataset.isCurrent,
                //             hasCurrentClass: keyframe.classList.contains('current')
                //         });
                //     });
                // }, 200); // 추가 200ms 지연
            }, 100); // 100ms 지연으로 UI 로드 완료 보장
            
            // 모든 객체의 최종 상태 확인 및 가시성 설정
            this.timelineData.tracks.forEach((objectTracks, objectUuid) => {
                const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
                if (object) {
                    // 객체를 보이게 설정
                    object.visible = true;
                    
                    // 부모 객체들도 보이게 설정
                    let parent = object.parent;
                    while (parent && parent !== this.editor.scene) {
                        parent.visible = true;
                        parent = parent.parent;
                    }
                }
            });
        } catch (error) {
            console.error("타임라인 데이터 로드 중 오류:", error);
        }
    }

    // JSON 저장 전 호출되는 메서드 (Editor.js에서 호출될 수 있음)
    onBeforeSave() {
        try {
            // scene.userData에 현재 상태 저장
            if (this.editor.scene && this.timelineData) {
                const timelineData = this.timelineData.toJSON();
                
                // 현재 시간 저장
                timelineData.currentTime = this.currentTime;
                console.log(`현재 시간 저장: ${this.currentTime}s`);
                
                // 클립 정보 수집
                const clipsData = {};
                this.timelineData.tracks.forEach((objectTracks, objectUuid) => {
                    const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
                    if (trackElement) {
                        const sprite = trackElement.querySelector('.animation-sprite');
                        if (sprite) {
                            clipsData[objectUuid] = {
                                left: parseFloat(sprite.style.left) || 0,
                                width: parseFloat(sprite.style.width) || 100,
                                duration: parseFloat(sprite.dataset.duration) || 5,
                                initialLeft: parseFloat(sprite.dataset.initialLeft) || 0
                            };
                        }
                    }
                });

                // timelineData에 클립 정보 추가
                timelineData.clips = clipsData;
                
                this.editor.scene.userData.motionTimeline = timelineData;
            }
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
        // console.log(`재생 속도 설정: ${speed}x`);

        // 프레임 레이트 조정으로 속도 변경
        const baseFrameRate = this.options?.framesPerSecond || 30; // Timeline.js의 framesPerSecond 사용
        const newFrameRate = Math.floor(baseFrameRate * speed);

        this.timelineData.frameRate = newFrameRate;
        this.setAnimationProperty('frameRate', newFrameRate);

        // console.log("재생 속도 변경 완료:", {
        //     speed: speed,
        //     baseFrameRate: baseFrameRate,
        //     newFrameRate: newFrameRate
        // });
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

    // 키프레임 드래그 후 객체 강제 업데이트
    forceUpdateObjectAfterKeyframeDrag(objectUuid, propertyType, currentTime) {
        console.log("=== forceUpdateObjectAfterKeyframeDrag ===");
        console.log("objectUuid:", objectUuid);
        console.log("propertyType:", propertyType);
        console.log("currentTime:", currentTime);

        const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
        if (!object) {
            console.warn("객체를 찾을 수 없습니다:", objectUuid);
            return;
        }

        const trackData = this.timelineData.tracks.get(objectUuid)?.get(propertyType);
        if (!trackData) {
            console.warn("트랙 데이터를 찾을 수 없습니다:", objectUuid, propertyType);
            return;
        }

        // 현재 시간에서의 값을 직접 계산하여 적용
        const currentValue = trackData.getValueAtTime(currentTime);
        if (currentValue) {
            console.log("강제 업데이트 - 현재 시간 값:", {
                property: propertyType,
                currentTime: currentTime,
                currentValue: currentValue
            });
            
            // 객체에 값 적용
            this.applyValue(object, propertyType, currentValue);
            
            // 적용 후 객체 상태 확인
            console.log("강제 업데이트 후 객체 상태:", {
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone()
            });
            
            // Three.js 렌더러 강제 업데이트
            if (this.editor.renderer) {
                this.editor.renderer.render(this.editor.scene, this.editor.camera);
            }
        } else {
            console.warn("getValueAtTime에서 null을 반환했습니다:", currentTime);
        }
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
        console.log("=== onKeyframeAdded 시작 ===", {
            objectUuid,
            property,
            index,
            time,
            value
        });
        
        // position 속성일 때만 UI 키프레임 생성 (통합 키프레임)
        if (property !== 'position') {
            console.log("position이 아닌 속성은 UI 키프레임을 생성하지 않습니다:", property);
            return;
        }
        
        const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
        if (!trackElement) {
            console.warn("트랙 요소를 찾을 수 없습니다:", objectUuid);
            return;
        }

        // UI에 키프레임 요소 추가
        const sprite = trackElement.querySelector('.animation-sprite.selected') ||
            trackElement.querySelector('.animation-sprite');
        if (!sprite) {
            console.warn("스프라이트를 찾을 수 없습니다:", objectUuid);
            return;
        }

        // 클립 범위 체크 - 클립 밖의 키프레임은 UI에 생성하지 않음
        const spriteLeft = parseFloat(sprite.style.left) || 0;
        const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
        const clipDuration = parseFloat(sprite.dataset.duration) || 5;
        const clipEndTime = clipStartTime + clipDuration;

        // 클립 범위 밖의 키프레임은 UI에 생성하지 않음 (초기 키프레임 제외, 오차 범위 추가)
        if (time !== 0 && (time < clipStartTime - MotionTimeline.CLIP_RANGE_TOLERANCE || time > clipEndTime + MotionTimeline.CLIP_RANGE_TOLERANCE)) {
            console.log("클립 범위 밖의 키프레임이므로 UI에 생성하지 않습니다:", {
                time,
                clipStartTime,
                clipEndTime,
                tolerance: MotionTimeline.CLIP_RANGE_TOLERANCE,
                property
            });
            return;
        }

        console.log("키프레임 요소 생성 중...");
        const keyframeElement = this.createKeyframeElement(time, value, property, index, sprite);
        console.log("생성된 키프레임 요소:", keyframeElement);
        
        const keyframeLayer = sprite.querySelector('.keyframe-layer');
        if (keyframeLayer) {
            console.log("키프레임 레이어에 요소 추가 중...");
            keyframeLayer.appendChild(keyframeElement);
            this.makePropertyKeyframeDraggable(keyframeElement, { element: trackElement, uuid: objectUuid }, property);
            console.log("키프레임 요소 추가 완료");

            // 새로 추가된 키프레임 자동 선택 (playhead 이동 없이)
            console.log("onKeyframeAdded - 키프레임 자동 선택:", {
                objectUuid,
                time,
                index,
                keyframeElement
            });
            
            // selectKeyframe 메서드를 호출하여 키프레임 선택과 객체 선택을 함께 처리
            // playhead 이동은 하지 않도록 skipPlayheadMove 옵션 전달
            this.selectKeyframe(objectUuid, time, keyframeElement, index, { skipPlayheadMove: true });
            
            // playhead 이동은 하지 않도록 별도로 처리
            // (selectKeyframe에서 playhead 이동을 방지하기 위해)
            console.log("onKeyframeAdded - 키프레임 선택 완료, 객체도 함께 선택됨");
        }
    }

    // 키프레임 삭제 시 UI 업데이트
    onKeyframeRemoved(objectUuid, property, index, time, value) {
        const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
        if (!trackElement) return;

        // UI에서 키프레임 요소 제거
        const sprites = trackElement.querySelectorAll('.animation-sprite');
        sprites.forEach(sprite => {
            const keyframeLayer = sprite.querySelector('.keyframe-layer');
            if (keyframeLayer) {
                const keyframeElement = keyframeLayer.querySelector(`[data-time="${time.toFixed(2)}"]`);
                if (keyframeElement) {
                    keyframeElement.remove();
                }
            }
        });
    }

    // 키프레임 업데이트 시 UI 업데이트
    onKeyframeUpdated(objectUuid, property, index, time, oldValue, newValue) {
        const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
        if (!trackElement) return;

        // UI에서 키프레임 값 업데이트
        const sprites = trackElement.querySelectorAll('.animation-sprite');
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
        const trackElement = this.container.querySelector(`[data-uuid="${objectUuid}"]`);
        if (!trackElement) return;

        // 클립 드래그 중인지 확인
        const isDraggingClip = trackElement.querySelector('.animation-sprite.dragging');
        if (isDraggingClip) {
            console.log('클립 드래그 중이므로 키프레임 이동 이벤트를 무시합니다.');
            return;
        }

        // UI에서 키프레임 위치 업데이트
        const sprites = trackElement.querySelectorAll('.animation-sprite');
        sprites.forEach(sprite => {
            const keyframeLayer = sprite.querySelector('.keyframe-layer');
            if (keyframeLayer) {
                const keyframeElement = keyframeLayer.querySelector(`[data-time="${oldTime}"]`);
                if (keyframeElement) {
                    // 새로운 시간으로 업데이트
                    keyframeElement.dataset.time = newTime.toFixed(2);
                    keyframeElement.dataset.index = index.toString();

                    // 클립 내에서의 상대 위치로 새로운 위치 계산 (updateKeyframesInClip과 동일한 방식)
                    const spriteWidth = sprite.offsetWidth;
                    const spriteLeft = parseFloat(sprite.style.left) || 0;
                    
                    const timeRulerContainer = document.querySelector('.time-ruler-container');
                    if (!timeRulerContainer) {
                        console.warn('.time-ruler-container를 찾을 수 없습니다.');
                        return;
                    }

                    const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                    const timeRulerWidth = timeRulerRect.width;

                    // 키프레임 시간에 해당하는 절대 픽셀 위치
                    const absolutePixelPosition = (newTime / this.options.totalSeconds) * timeRulerWidth;
                    
                    // 클립 시작 픽셀 위치
                    const clipStartPixelPosition = (spriteLeft / 100) * timeRulerWidth;
                    
                    // 클립 내에서의 상대 픽셀 위치
                    const relativePixelPosition = absolutePixelPosition - clipStartPixelPosition;
                    
                    // 클립 내에서의 상대 픽셀 위치로 설정
                    keyframeElement.style.left = `${relativePixelPosition}px`;
                    keyframeElement.dataset.pixelPosition = relativePixelPosition.toString();
                }
            }
        });
    }

    // 키프레임 요소 생성
    createKeyframeElement(time, value, property, index, sprite = null) {
        const keyframeElement = document.createElement("div");
        keyframeElement.className = "keyframe";
        keyframeElement.dataset.time = time.toFixed(2);
        keyframeElement.dataset.property = property;
        keyframeElement.dataset.index = index;
        keyframeElement.title = `${property}: ${time.toFixed(2)}s`;

        // 클립 내에서의 상대 위치로 키프레임 표시 (updateKeyframesInClip과 동일한 방식)
        const targetSprite = sprite || keyframeElement.closest('.animation-sprite');
        if (targetSprite) {
            const spriteWidth = targetSprite.offsetWidth;
            const spriteLeft = parseFloat(targetSprite.style.left) || 0;
            const clipStartTime = (spriteLeft / 100) * this.options.totalSeconds;
            
            // 키프레임 시간에 해당하는 절대 픽셀 위치
            const timeRulerContainer = document.querySelector('.time-ruler-container');
            if (timeRulerContainer) {
                const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                const timeRulerWidth = timeRulerRect.width;
                const absolutePixelPosition = (time / this.options.totalSeconds) * timeRulerWidth;
                
                // 클립 시작 픽셀 위치
                const clipStartPixelPosition = (spriteLeft / 100) * timeRulerWidth;
                
                // 클립 내에서의 상대 픽셀 위치
                const relativePixelPosition = absolutePixelPosition - clipStartPixelPosition;
                
                console.log("키프레임 UI 위치 계산 (클립 상대 위치):", {
                    absoluteTime: time,
                    clipStartTime,
                    absolutePixelPosition,
                    clipStartPixelPosition,
                    relativePixelPosition,
                    spriteWidth
                });
                
                keyframeElement.style.left = `${relativePixelPosition}px`;
                keyframeElement.dataset.pixelPosition = relativePixelPosition.toString();
            } else {
                // fallback: 절대 위치 사용
                const timeRulerContainer = document.querySelector('.time-ruler-container');
                if (timeRulerContainer) {
                    const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                    const timeRulerWidth = timeRulerRect.width;
                    const keyframePixelPosition = (time / this.options.totalSeconds) * timeRulerWidth;
                    keyframeElement.style.left = `${keyframePixelPosition}px`;
                } else {
                    // fallback: 절대 픽셀 위치 사용
                    const timeRulerContainer = document.querySelector('.time-ruler-container');
                    if (timeRulerContainer) {
                        const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                        const timeRulerWidth = timeRulerRect.width;
                        const keyframePixelPosition = (time / this.options.totalSeconds) * timeRulerWidth;
                        keyframeElement.style.left = `${keyframePixelPosition}px`;
                    } else {
                        const percent = (time / this.options.totalSeconds) * 100;
                        keyframeElement.style.left = `${percent}%`;
                    }
                }
            }
        } else {
            // fallback: 절대 위치 사용
            const timeRulerContainer = document.querySelector('.time-ruler-container');
            if (timeRulerContainer) {
                const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                const timeRulerWidth = timeRulerRect.width;
                const keyframePixelPosition = (time / this.options.totalSeconds) * timeRulerWidth;
                keyframeElement.style.left = `${keyframePixelPosition}px`;
            } else {
                // fallback: 절대 픽셀 위치 사용
                const timeRulerContainer = document.querySelector('.time-ruler-container');
                if (timeRulerContainer) {
                    const timeRulerRect = timeRulerContainer.getBoundingClientRect();
                    const timeRulerWidth = timeRulerRect.width;
                    const keyframePixelPosition = (time / this.options.totalSeconds) * timeRulerWidth;
                    keyframeElement.style.left = `${keyframePixelPosition}px`;
                } else {
                    const percent = (time / this.options.totalSeconds) * 100;
                    keyframeElement.style.left = `${percent}%`;
                }
            }
        }

        // 키프레임 스타일 설정
        keyframeElement.style.position = "absolute";
        keyframeElement.style.width = "8px";
        keyframeElement.style.height = "8px";
        // keyframeElement.style.backgroundColor = "#ff6b6b";
        keyframeElement.style.border = "2px solid #fff";
        keyframeElement.style.borderRadius = "50%";
        keyframeElement.style.cursor = "pointer";
        keyframeElement.style.zIndex = "10";

        return keyframeElement;
    }

    // === 트랙 데이터 정리 및 관리 메서드들 ===

    // 트랙 데이터 정리
    cleanupTracksData() {
        console.log('=== MotionTimeline 트랙 데이터 정리 시작 ===');
        
        if (!this.timelineData) {
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return null;
        }
        
        const cleanupResult = this.timelineData.cleanupTracks();
        
        // UI 업데이트
        this.updateUI();
        
        console.log('=== MotionTimeline 트랙 데이터 정리 완료 ===');
        return cleanupResult;
    }

    // 트랙 데이터 백업
    backupTracksData() {
        console.log('=== MotionTimeline 트랙 데이터 백업 시작 ===');
        
        if (!this.timelineData) {
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return null;
        }
        
        const backup = this.timelineData.backupTracks();
        console.log('백업 완료:', backup);
        
        return backup;
    }

    // 트랙 데이터 복원
    restoreTracksData(backup) {
        console.log('=== MotionTimeline 트랙 데이터 복원 시작 ===');
        
        if (!this.timelineData) {
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return false;
        }
        
        const success = this.timelineData.restoreTracks(backup);
        
        if (success) {
            // UI 재생성
            this.recreateUIFromData();
        }
        
        console.log('=== MotionTimeline 트랙 데이터 복원 완료 ===');
        return success;
    }

    // 트랙 데이터 병합
    mergeTracksData(otherTimelineData) {
        console.log('=== MotionTimeline 트랙 데이터 병합 시작 ===');
        
        if (!this.timelineData) {
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return null;
        }
        
        const mergeResult = this.timelineData.mergeTracks(otherTimelineData);
        
        // UI 업데이트
        this.updateUI();
        
        console.log('=== MotionTimeline 트랙 데이터 병합 완료 ===');
        return mergeResult;
    }

    // 트랙 통계 정보
    getTracksStatistics() {
        if (!this.timelineData) {
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return null;
        }
        
        return this.timelineData.getTrackStatistics();
    }

    // 트랙 데이터 검증
    validateTracksData() {
        if (!this.timelineData) {
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return null;
        }
        
        return this.timelineData.validateAndCleanTracks();
    }

    // UI 재생성 (데이터 기반)
    recreateUIFromData() {
        console.log('=== UI 재생성 시작 ===');
        
        // 저장된 현재 시간 복원
        if (this.timelineData.currentTime !== undefined) {
            this.currentTime = this.timelineData.currentTime;
            console.log(`UI 재생성 시 저장된 현재 시간 복원: ${this.currentTime}s`);
        } else {
            console.log("UI 재생성 시 저장된 현재 시간이 없어서 0으로 초기화");
            this.currentTime = 0;
        }
        
        // 기존 UI 클리어
        const trackElements = this.container.querySelectorAll('.timeline-track');
        trackElements.forEach(element => element.remove());
        
        // TimelineData에서 UI 재생성
        this.timelineData.getAllTracksByUuid().forEach((trackInfo, key) => {
            const { uuid: objectUuid } = trackInfo;
            
            // 씬에서 해당 객체 찾기
            const object = this.editor.scene.getObjectByProperty('uuid', objectUuid);
            if (object) {
                const objectId = objectUuid.split('-')[0] || objectUuid;
                this.addTrack(objectUuid, objectId, object.name, true);
            }
        });
        
        // UI 업데이트
        this.updateUI();
        
        // 가져오기 후 data-is-current 속성 강제 업데이트 - 주석처리
        // setTimeout(() => {
        //     this.updateKeyframeStates(this.currentTime);
        //     console.log('가져오기 후 키프레임 상태 업데이트 완료');
        // }, 100);
        
        console.log('=== UI 재생성 완료 ===');
    }

    // 특정 오브젝트의 트랙 정보 가져오기
    getObjectTracksInfo(objectUuid) {
        if (!this.timelineData) {
            return null;
        }
        
        const tracks = this.timelineData.getObjectTracks(objectUuid);
        const tracksInfo = [];
        
        for (const [property, trackData] of tracks) {
            tracksInfo.push({
                property,
                keyframeCount: trackData.getKeyframeCount(),
                trackData: trackData
            });
        }
        
        return tracksInfo;
    }

    // 특정 오브젝트의 트랙 정보 가져오기 (ID 기반)
    getObjectTracksInfoById(objectId) {
        if (!this.timelineData) {
            return null;
        }
        
        const tracks = this.timelineData.getObjectTracksById(objectId);
        const tracksInfo = [];
        
        for (const [property, trackData] of tracks) {
            tracksInfo.push({
                property,
                keyframeCount: trackData.getKeyframeCount(),
                trackData: trackData
            });
        }
        
        return tracksInfo;
    }

    // 트랙 데이터 내보내기 (JSON)
    exportTracksData() {
        if (!this.timelineData) {ㄹ
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return null;
        }
        
        return this.timelineData.toJSON();
    }

    // 트랙 데이터 가져오기 (JSON)
    importTracksData(jsonData) {
        if (!this.timelineData) {
            console.warn('TimelineData가 초기화되지 않았습니다.');
            return false;
        }
        
        try {
            this.timelineData.fromJSON(jsonData);
            
            // 저장된 현재 시간 복원
            if (jsonData.currentTime !== undefined) {
                this.currentTime = jsonData.currentTime;
                console.log(`가져오기 시 저장된 현재 시간 복원: ${this.currentTime}s`);
            } else {
                console.log("가져오기 시 저장된 현재 시간이 없어서 0으로 초기화");
                this.currentTime = 0;
            }
            
            this.recreateUIFromData();
            return true;
        } catch (error) {
            console.error('트랙 데이터 가져오기 실패:', error);
            return false;
        }
    }

    // 객체 변경 시그널 감지하여 선택된 키프레임 업데이트
    setupObjectChangeListener() {
        if (this.editor.signals?.objectChanged) {
            this.editor.signals.objectChanged.add((object) => {
                this.onObjectChanged(object);
            });
        }

        // TransformControls 드래그 상태 감지
        this.setupTransformControlsListener();

        // Playhead 드래그 상태 감지
        this.setupPlayheadDragListener();
    }

    // TransformControls 드래그 상태 감지
    setupTransformControlsListener() {
        // 전역 마우스 이벤트로 드래그 상태 감지
        let isMouseDown = false;
        let dragTimeout = null;

        document.addEventListener('mousedown', () => {
            isMouseDown = true;
            // 마우스 다운 후 짧은 시간 내에 objectChanged가 발생하면 드래그로 간주
            dragTimeout = setTimeout(() => {
                if (isMouseDown) {
                    this.isDragging = true;
                    console.log("드래그 시작 감지");
                }
            }, 50); // 50ms 후 드래그로 간주
        });

        document.addEventListener('mouseup', () => {
            isMouseDown = false;
            if (dragTimeout) {
                clearTimeout(dragTimeout);
                dragTimeout = null;
            }
            
            if (this.isDragging) {
                this.isDragging = false;
                console.log("드래그 종료 감지");
                
                // 대기 중인 키프레임 업데이트가 있으면 실행
                if (this.pendingKeyframeUpdate) {
                    this.pendingKeyframeUpdate = false;
                    if (this.selectedKeyframe) {
                        const object = this.editor.scene.getObjectByProperty('uuid', this.selectedKeyframe.objectId);
                        if (object) {
                            this.updateSelectedKeyframeFromObject(object, { fromUserAction: true });
                        }
                    }
                }
            }
        });

        // 터치 이벤트도 동일하게 처리
        document.addEventListener('touchstart', () => {
            isMouseDown = true;
            dragTimeout = setTimeout(() => {
                if (isMouseDown) {
                    this.isDragging = true;
                    console.log("터치 드래그 시작 감지");
                }
            }, 50);
        });

        document.addEventListener('touchend', () => {
            isMouseDown = false;
            if (dragTimeout) {
                clearTimeout(dragTimeout);
                dragTimeout = null;
            }
            
            if (this.isDragging) {
                this.isDragging = false;
                console.log("터치 드래그 종료 감지");
                
                if (this.pendingKeyframeUpdate) {
                    this.pendingKeyframeUpdate = false;
                    if (this.selectedKeyframe) {
                        const object = this.editor.scene.getObjectByProperty('uuid', this.selectedKeyframe.objectId);
                        if (object) {
                            this.updateSelectedKeyframeFromObject(object, { fromUserAction: true });
                        }
                    }
                }
            }
        });
    }



    // 선택된 키프레임을 객체의 현재 값으로 업데이트
    updateSelectedKeyframeFromObject(object, options) {
        // 타임라인 애니메이션 미리보기로 인한 변경은 완전히 무시
        if (options?.fromTimeline) {
            console.log("타임라인 애니메이션 미리보기 - 키프레임 데이터 업데이트 완전 차단");
            return;
        }

        if (!this.selectedKeyframe) {
            return;
        }
        
        if (!this.selectedKeyframe.objectId || this.selectedKeyframe.objectId !== object.uuid) {
            return;
        }

        // 애니메이션 재생 중에는 키프레임 값을 업데이트하지 않음
        if (this.isPlaying || this.isPlayheadDragging) {
            console.log("애니메이션 재생 중 또는 playhead 드래그 중 - 키프레임 업데이트 건너뜀");
            return;
        }

        console.log("선택된 키프레임 업데이트 (마우스 업 후):", object.name);

        const property = this.selectedKeyframe.property;
        const currentValue = this.getKeyframeValue(object, property);

        if (currentValue) {
            console.log("키프레임 값 업데이트:", {
                property,
                oldValue: this.selectedKeyframe.value,
                newValue: currentValue
            });

            // 선택된 키프레임만 안전하게 업데이트
            this.updateSelectedKeyframeValueOnly(currentValue);

            console.log("키프레임 값 업데이트 완료");
        }
    }

    // 객체가 변경되었을 때 호출되는 메서드
    onObjectChanged(object, options) {
        // 타임라인 애니메이션 미리보기로 인한 변경은 완전히 무시
        if (options?.fromTimeline) {
            console.log("타임라인 애니메이션 미리보기 - 키프레임 데이터 업데이트 완전 차단");
            return;
        }

        // 선택된 키프레임이 있고, 변경된 객체가 선택된 키프레임의 객체인지 확인
        if (!this.selectedKeyframe) {
            return;
        }
        
        if (!this.selectedKeyframe.objectId || this.selectedKeyframe.objectId !== object.uuid) {
            return;
        }

        // 드래그 중이면 업데이트를 대기 상태로 설정
        if (this.isDragging) {
            this.pendingKeyframeUpdate = true;
            console.log("드래그 중 - 키프레임 업데이트 대기");
            return;
        }

        // 애니메이션 재생 중에는 키프레임 값을 업데이트하지 않음
        if (this.isPlaying || this.isPlayheadDragging) {
            console.log("애니메이션 재생 중 또는 playhead 드래그 중 - 키프레임 업데이트 건너뜀");
            return;
        }

        console.log("선택된 키프레임의 객체가 변경됨:", object.name);

        // 선택된 키프레임의 속성에 따라 객체의 현재 값을 가져와서 키프레임 업데이트
        const property = this.selectedKeyframe.property;
        const currentValue = this.getKeyframeValue(object, property);

        if (currentValue) {
            console.log("키프레임 값 업데이트:", {
                property,
                oldValue: this.selectedKeyframe.value,
                newValue: currentValue
            });

            // 선택된 키프레임만 안전하게 업데이트
            this.updateSelectedKeyframeValueOnly(currentValue);

            console.log("키프레임 값 업데이트 완료");
        }
    }

    // 선택된 키프레임의 값만 안전하게 업데이트 (다른 키프레임에 영향 없음)
    updateSelectedKeyframeValueOnly(newValue) {
        if (!this.selectedKeyframe) {
            console.warn("선택된 키프레임이 없습니다.");
            return;
        }

        const { objectId, property, index } = this.selectedKeyframe;
        
        if (!objectId || !property || index === undefined) {
            console.error("선택된 키프레임 정보가 불완전합니다:", this.selectedKeyframe);
            return;
        }

        // 객체에서 모든 속성의 현재 값 가져오기
        const object = this.editor.scene.getObjectByProperty('uuid', objectId);
        if (!object) {
            console.error("객체를 찾을 수 없습니다:", objectId);
            return;
        }

        const position = new THREE.Vector3(object.position.x, object.position.y, object.position.z);
        const rotation = new THREE.Vector3(object.rotation.x, object.rotation.y, object.rotation.z);
        const scale = new THREE.Vector3(object.scale.x, object.scale.y, object.scale.z);

        console.log("키프레임 수정 - 모든 속성 업데이트:", { position, rotation, scale });

        // 모든 속성에 대해 키프레임 업데이트
        const properties = [
            { type: 'position', value: position },
            { type: 'rotation', value: rotation },
            { type: 'scale', value: scale }
        ];

        properties.forEach(({ type, value }) => {
            const track = this.timelineData.tracks.get(objectId)?.get(type);
            if (track && index < track.keyframeCount) {
                // values 배열에서 해당 인덱스의 값만 직접 업데이트
                track.values[index * 3] = value.x;
                track.values[index * 3 + 1] = value.y;
                track.values[index * 3 + 2] = value.z;
                
                console.log(`${type} 키프레임 값 업데이트:`, {
                    index,
                    time: track.times[index],
                    newValue: value,
                    trackValues: track.values.slice(index * 3, index * 3 + 3)
                });
            }
        });

        // selectedKeyframe 정보 업데이트 (현재 수정 중인 속성 기준)
        if (this.selectedKeyframe) {
            this.selectedKeyframe.value = {
                x: newValue.x,
                y: newValue.y,
                z: newValue.z
            };
        }

        // userData도 업데이트
        if (this.editor.scene.userData.timeline && this.editor.scene.userData.timeline.selectedKeyframe) {
            this.editor.scene.userData.timeline.selectedKeyframe.value = {
                x: newValue.x,
                y: newValue.y,
                z: newValue.z
            };
        }

        // TimelineData 상태 업데이트
        this.timelineData.dirty = true;
        this.timelineData.precomputeAnimationData();

        // UI 업데이트
        this.updateUI();

        // 속성 패널 업데이트
        this.updatePropertyPanel();
    }

    // 선택된 키프레임 해제
    clearSelectedKeyframe() {
        if (this.selectedKeyframe) {
            console.log("선택된 키프레임 해제:", this.selectedKeyframe);
            
            // UI에서 선택 상태 제거
            const selectedKeyframeElement = document.querySelector('.keyframe.selected');
            if (selectedKeyframeElement) {
                selectedKeyframeElement.classList.remove('selected');
                selectedKeyframeElement.dataset.isSelected = 'false';
            }
            
            // 선택된 키프레임 정보 초기화
            this.selectedKeyframe = null;
            
            // userData에서도 제거
            if (this.editor.scene.userData.timeline) {
                this.editor.scene.userData.timeline.selectedKeyframe = null;
            }
            
            // 속성 패널 업데이트
            this.updatePropertyPanel();
        }
    }

    // Playhead 드래그 상태 감지
    setupPlayheadDragListener() {
        // playhead 요소 찾기
        const playhead = document.querySelector('.playhead');
        if (!playhead) {
            console.log("playhead 요소를 찾을 수 없습니다");
            return;
        }

        let isMouseDown = false;

        // playhead에서 마우스 다운
        playhead.addEventListener('mousedown', () => {
            isMouseDown = true;
            this.isPlayheadDragging = true;
            console.log("Playhead 드래그 시작");
        });

        // 전역 마우스 업
        document.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                this.isPlayheadDragging = false;
                console.log("Playhead 드래그 종료");
            }
        });

        // 터치 이벤트도 처리
        playhead.addEventListener('touchstart', () => {
            this.isPlayheadDragging = true;
            console.log("Playhead 터치 드래그 시작");
        });

        document.addEventListener('touchend', () => {
            this.isPlayheadDragging = false;
            console.log("Playhead 터치 드래그 종료");
        });
    }
}

export default MotionTimeline;