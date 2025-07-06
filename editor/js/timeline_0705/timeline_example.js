// 타임라인 인덱스 기반 키프레임 관리 사용 예시
import { TimelineData, TrackData, INTERPOLATION } from './TimelineCore.js';
import { MotionTimeline } from './MotionTimeline.js';
import * as THREE from 'three';

// 예제 1: TrackData 직접 사용
function trackDataExample() {
    console.log("=== TrackData 인덱스 기반 사용 예시 ===");

    const track = new TrackData();

    // 키프레임 추가
    track.addKeyframe(1.0, new THREE.Vector3(0, 0, 0));
    track.addKeyframe(2.0, new THREE.Vector3(10, 0, 0));
    track.addKeyframe(3.0, new THREE.Vector3(10, 10, 0));

    console.log("키프레임 개수:", track.getKeyframeCount());

    // 인덱스로 키프레임 접근
    const keyframe0 = track.getKeyframeByIndex(0);
    console.log("인덱스 0의 키프레임:", keyframe0);

    // 인덱스로 키프레임 수정
    track.setKeyframeByIndex(1, 2.5, new THREE.Vector3(15, 0, 0), INTERPOLATION.BEZIER);

    // 인덱스로 키프레임 삭제
    track.removeKeyframeByIndex(2);

    // 모든 키프레임 가져오기
    const allKeyframes = track.getAllKeyframes();
    console.log("모든 키프레임:", allKeyframes);
}

// 예제 2: TimelineData 사용
function timelineDataExample() {
    console.log("=== TimelineData 인덱스 기반 사용 예시 ===");

    const timelineData = new TimelineData();
    const objectUuid = "test-object-123";

    // 트랙 추가
    const track = timelineData.addTrack(objectUuid, 'position');

    // 키프레임 추가
    track.addKeyframe(1.0, new THREE.Vector3(0, 0, 0));
    track.addKeyframe(2.0, new THREE.Vector3(10, 0, 0));

    console.log("키프레임 개수:", timelineData.getKeyframeCount(objectUuid, 'position'));

    // 인덱스로 키프레임 접근
    const keyframe = timelineData.getKeyframeByIndex(objectUuid, 'position', 0);
    console.log("인덱스 0의 키프레임:", keyframe);

    // 인덱스로 키프레임 수정
    timelineData.setKeyframeByIndex(objectUuid, 'position', 1, 2.5, new THREE.Vector3(15, 0, 0));

    // 인덱스로 키프레임 삭제
    timelineData.removeKeyframeByIndex(objectUuid, 'position', 0);

    // 모든 키프레임 가져오기
    const allKeyframes = timelineData.getAllKeyframes(objectUuid, 'position');
    console.log("모든 키프레임:", allKeyframes);
}

// 예제 3: MotionTimeline 사용 (실제 에디터에서)
function motionTimelineExample(motionTimeline) {
    console.log("=== MotionTimeline 인덱스 기반 사용 예시 ===");

    const objectId = 123;
    const property = 'position';

    // 키프레임 추가 (기존 방식)
    motionTimeline.addKeyframe(objectId, property, 1.0, new THREE.Vector3(0, 0, 0));
    motionTimeline.addKeyframe(objectId, property, 2.0, new THREE.Vector3(10, 0, 0));

    console.log("키프레임 개수:", motionTimeline.getKeyframeCount(objectId, property));

    // 인덱스로 키프레임 접근
    const keyframe = motionTimeline.getKeyframeByIndex(objectId, property, 0);
    console.log("인덱스 0의 키프레임:", keyframe);

    // 인덱스로 키프레임 수정
    motionTimeline.setKeyframeByIndex(objectId, property, 1, 2.5, new THREE.Vector3(15, 0, 0));

    // 인덱스로 키프레임 삭제
    motionTimeline.removeKeyframeByIndex(objectId, property, 0);

    // 모든 키프레임 가져오기
    const allKeyframes = motionTimeline.getAllKeyframes(objectId, property);
    console.log("모든 키프레임:", allKeyframes);
}

// 예제 4: TimelineCore 사용 (UI 요소 관리)
function timelineCoreExample(timelineCore) {
    console.log("=== TimelineCore 인덱스 기반 사용 예시 ===");

    const track = timelineCore.addTrack('position', 'object-123', 'Test Object');
    const clip = timelineCore.addClip(track, { left: 0, width: 100 });

    // 인덱스로 키프레임 UI 요소 추가
    timelineCore.addKeyframeByIndex(clip, 0, {
        time: 1.0,
        x: 0,
        y: 0,
        z: 0,
        left: 10
    });

    timelineCore.addKeyframeByIndex(clip, 1, {
        time: 2.0,
        x: 10,
        y: 0,
        z: 0,
        left: 50
    });

    console.log("키프레임 개수:", timelineCore.getKeyframeCount(clip));

    // 인덱스로 키프레임 UI 요소 가져오기
    const keyframeElement = timelineCore.getKeyframeByIndex(clip, 0);
    console.log("인덱스 0의 키프레임 요소:", keyframeElement);

    // 인덱스로 키프레임 UI 요소 업데이트
    timelineCore.updateKeyframeByIndex(clip, 1, {
        time: 2.5,
        x: 15,
        y: 0,
        z: 0,
        left: 60
    });

    // 인덱스로 키프레임 UI 요소 삭제
    timelineCore.removeKeyframeByIndex(clip, 0);

    // 모든 키프레임 UI 요소 가져오기
    const allKeyframeElements = timelineCore.getAllKeyframes(clip);
    console.log("모든 키프레임 요소:", allKeyframeElements);
}

// 새로운 안전한 타임라인 시스템 사용 예제
class SafeTimelineExample {
    constructor(editor) {
        this.editor = editor;
        this.motionTimeline = null;
        this.timelineData = null;

        this.init();
    }

    init() {
        console.log("=== 안전한 타임라인 시스템 초기화 ===");

        // 타임라인 설정
        const timelineSettings = {
            totalSeconds: 60,
            framesPerSecond: 30,
            currentFrame: 0
        };

        // MotionTimeline 인스턴스 생성
        this.motionTimeline = new MotionTimeline(this.editor, timelineSettings);
        this.timelineData = this.motionTimeline.timelineData;

        // TimelineData 이벤트 리스너 설정
        this.setupEventListeners();

        console.log("타임라인 시스템 초기화 완료");
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 키프레임 추가 이벤트
        this.timelineData.addEventListener('track_keyframe_added', (data) => {
            console.log('🔵 키프레임 추가됨:', {
                objectUuid: data.objectUuid,
                property: data.property,
                index: data.index,
                time: data.time,
                value: data.value
            });
        });

        // 키프레임 삭제 이벤트
        this.timelineData.addEventListener('track_keyframe_removed', (data) => {
            console.log('🔴 키프레임 삭제됨:', {
                objectUuid: data.objectUuid,
                property: data.property,
                index: data.index,
                time: data.time
            });
        });

        // 키프레임 업데이트 이벤트
        this.timelineData.addEventListener('track_keyframe_updated', (data) => {
            console.log('🟡 키프레임 업데이트됨:', {
                objectUuid: data.objectUuid,
                property: data.property,
                index: data.index,
                time: data.time,
                oldValue: data.oldValue,
                newValue: data.newValue
            });
        });

        // 키프레임 이동 이벤트
        this.timelineData.addEventListener('track_keyframe_moved', (data) => {
            console.log('🟢 키프레임 이동됨:', {
                objectUuid: data.objectUuid,
                property: data.property,
                index: data.index,
                oldTime: data.oldTime,
                newTime: data.newTime
            });
        });
    }

    // 안전한 키프레임 추가 예제
    addKeyframeSafely(objectUuid, property, time, value) {
        console.log("=== 안전한 키프레임 추가 ===");

        try {
            // 1. TimelineData에 키프레임 추가
            const trackData = this.timelineData.addTrack(objectUuid, property);
            if (!trackData) {
                throw new Error(`트랙을 생성할 수 없습니다: ${objectUuid}.${property}`);
            }

            const success = trackData.addKeyframe(time, value, INTERPOLATION.LINEAR);
            if (!success) {
                throw new Error(`키프레임 추가 실패: ${time}`);
            }

            // 2. 최대 시간 업데이트
            this.timelineData.updateMaxTime(time);

            // 3. 애니메이션 데이터 재계산
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();

            console.log("✅ 키프레임 추가 성공:", {
                objectUuid,
                property,
                time,
                value,
                keyframeCount: trackData.getKeyframeCount()
            });

            return true;
        } catch (error) {
            console.error("❌ 키프레임 추가 실패:", error.message);
            return false;
        }
    }

    // 안전한 키프레임 삭제 예제
    removeKeyframeSafely(objectUuid, property, index) {
        console.log("=== 안전한 키프레임 삭제 ===");

        try {
            const trackData = this.timelineData.tracks.get(objectUuid)?.get(property);
            if (!trackData) {
                throw new Error(`트랙을 찾을 수 없습니다: ${objectUuid}.${property}`);
            }

            const success = trackData.removeKeyframeByIndex(index);
            if (!success) {
                throw new Error(`키프레임 삭제 실패: 인덱스 ${index}`);
            }

            // 애니메이션 데이터 재계산
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();

            console.log("✅ 키프레임 삭제 성공:", {
                objectUuid,
                property,
                index,
                remainingKeyframes: trackData.getKeyframeCount()
            });

            return true;
        } catch (error) {
            console.error("❌ 키프레임 삭제 실패:", error.message);
            return false;
        }
    }

    // 안전한 키프레임 시간 업데이트 예제
    updateKeyframeTimeSafely(objectUuid, property, index, newTime) {
        console.log("=== 안전한 키프레임 시간 업데이트 ===");

        try {
            const trackData = this.timelineData.tracks.get(objectUuid)?.get(property);
            if (!trackData) {
                throw new Error(`트랙을 찾을 수 없습니다: ${objectUuid}.${property}`);
            }

            const success = trackData.updateKeyframeTime(index, newTime);
            if (!success) {
                throw new Error(`키프레임 시간 업데이트 실패: 인덱스 ${index} -> ${newTime}`);
            }

            // 최대 시간 업데이트
            this.timelineData.updateMaxTime(newTime);

            // 애니메이션 데이터 재계산
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();

            console.log("✅ 키프레임 시간 업데이트 성공:", {
                objectUuid,
                property,
                index,
                newTime
            });

            return true;
        } catch (error) {
            console.error("❌ 키프레임 시간 업데이트 실패:", error.message);
            return false;
        }
    }

    // 안전한 키프레임 값 업데이트 예제
    updateKeyframeValueSafely(objectUuid, property, index, newValue) {
        console.log("=== 안전한 키프레임 값 업데이트 ===");

        try {
            const trackData = this.timelineData.tracks.get(objectUuid)?.get(property);
            if (!trackData) {
                throw new Error(`트랙을 찾을 수 없습니다: ${objectUuid}.${property}`);
            }

            const success = trackData.updateKeyframeValue(index, newValue);
            if (!success) {
                throw new Error(`키프레임 값 업데이트 실패: 인덱스 ${index}`);
            }

            // 애니메이션 데이터 재계산
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();

            console.log("✅ 키프레임 값 업데이트 성공:", {
                objectUuid,
                property,
                index,
                newValue
            });

            return true;
        } catch (error) {
            console.error("❌ 키프레임 값 업데이트 실패:", error.message);
            return false;
        }
    }

    // 타임라인 데이터 검증 예제
    validateTimelineData() {
        console.log("=== 타임라인 데이터 검증 ===");

        const validation = this.timelineData.validate();

        if (validation.isValid) {
            console.log("✅ 타임라인 데이터가 유효합니다");
        } else {
            console.error("❌ 타임라인 데이터 오류:", validation.errors);
        }

        return validation.isValid;
    }

    // 타임라인 데이터 백업/복원 예제
    backupAndRestoreTimelineData() {
        console.log("=== 타임라인 데이터 백업/복원 ===");

        try {
            // 백업
            const backup = this.timelineData.clone();
            console.log("✅ 타임라인 데이터 백업 완료");

            // 복원
            this.timelineData = backup;
            this.timelineData.dirty = true;
            this.timelineData.precomputeAnimationData();

            console.log("✅ 타임라인 데이터 복원 완료");
            return true;
        } catch (error) {
            console.error("❌ 타임라인 데이터 백업/복원 실패:", error.message);
            return false;
        }
    }

    // 종합 사용 예제
    runCompleteExample() {
        console.log("=== 종합 사용 예제 시작 ===");

        // 1. 씬에서 객체 가져오기
        const objects = this.editor.scene.children.filter(child => child.type === 'Mesh');
        if (objects.length === 0) {
            console.warn("씬에 메시 객체가 없습니다.");
            return;
        }

        const testObject = objects[0];
        console.log("테스트 객체:", testObject.name, testObject.uuid);

        // 2. 키프레임 추가
        const position1 = new THREE.Vector3(0, 0, 0);
        const position2 = new THREE.Vector3(10, 5, 0);
        const position3 = new THREE.Vector3(0, 10, 0);

        this.addKeyframeSafely(testObject.uuid, 'position', 0, position1);
        this.addKeyframeSafely(testObject.uuid, 'position', 2, position2);
        this.addKeyframeSafely(testObject.uuid, 'position', 4, position3);

        // 3. 키프레임 값 업데이트
        const newPosition = new THREE.Vector3(5, 5, 5);
        this.updateKeyframeValueSafely(testObject.uuid, 'position', 1, newPosition);

        // 4. 키프레임 시간 이동
        this.updateKeyframeTimeSafely(testObject.uuid, 'position', 2, 3);

        // 5. 데이터 검증
        this.validateTimelineData();

        // 6. 애니메이션 재생
        this.motionTimeline.play();

        // 7. 5초 후 정지
        setTimeout(() => {
            this.motionTimeline.stop();
            console.log("=== 종합 사용 예제 완료 ===");
        }, 5000);
    }

    // 디버깅 도구
    debugTimelineState() {
        console.log("=== 타임라인 상태 디버깅 ===");

        console.log("TimelineData 상태:", {
            maxTime: this.timelineData.maxTime,
            frameRate: this.timelineData.frameRate,
            dirty: this.timelineData.dirty,
            trackCount: this.timelineData.tracks.size
        });

        this.timelineData.tracks.forEach((objectTracks, objectUuid) => {
            console.log(`객체 ${objectUuid}:`);
            objectTracks.forEach((trackData, property) => {
                console.log(`  ${property}: ${trackData.getKeyframeCount()}개 키프레임`);
                for (let i = 0; i < trackData.getKeyframeCount(); i++) {
                    const keyframe = trackData.getKeyframeByIndex(i);
                    console.log(`    [${i}] 시간: ${keyframe.time}, 값: ${keyframe.value.x}, ${keyframe.value.y}, ${keyframe.value.z}`);
                }
            });
        });
    }
}

// 전역 인스턴스 생성 함수
export function createSafeTimelineExample(editor) {
    return new SafeTimelineExample(editor);
}

// 사용법 가이드
export function showUsageGuide() {
    console.log(`
=== 타임라인 인덱스 기반 키프레임 관리 사용 가이드 ===

1. TrackData 직접 사용:
   - addKeyframe(time, value, interpolation)
   - getKeyframeByIndex(index)
   - setKeyframeByIndex(index, time, value, interpolation)
   - removeKeyframeByIndex(index)
   - getKeyframeCount()
   - getAllKeyframes()

2. TimelineData 사용:
   - addTrack(objectUuid, property)
   - getKeyframeByIndex(objectUuid, property, index)
   - setKeyframeByIndex(objectUuid, property, index, time, value, interpolation)
   - removeKeyframeByIndex(objectUuid, property, index)
   - getKeyframeCount(objectUuid, property)
   - getAllKeyframes(objectUuid, property)

3. MotionTimeline 사용:
   - addKeyframe(objectId, property, time, value)
   - getKeyframeByIndex(objectId, property, index)
   - setKeyframeByIndex(objectId, property, index, time, value, interpolation)
   - removeKeyframeByIndex(objectId, property, index)
   - getKeyframeCount(objectId, property)
   - getAllKeyframes(objectId, property)
   - deleteSelectedKeyframeByIndex()

4. TimelineCore 사용 (UI 요소):
   - addKeyframeByIndex(clip, index, options)
   - getKeyframeByIndex(clip, index)
   - updateKeyframeByIndex(clip, index, options)
   - removeKeyframeByIndex(clip, index)
   - getKeyframeCount(clip)
   - getAllKeyframes(clip)

장점:
- 부동소수점 정밀도 문제 해결
- 더 빠른 검색 및 접근
- 예측 가능한 결과
- 하위 호환성 유지
- 확장성 향상
  `);
}

// 예제 실행
export function runExamples() {
    trackDataExample();
    timelineDataExample();
    showUsageGuide();
}

// 트랙 데이터 정리 및 관리 예제
export function createTracksDataManagementExample(editor) {
    console.log('=== 트랙 데이터 정리 및 관리 예제 시작 ===');

    const motionTimeline = editor.motionTimeline;
    if (!motionTimeline) {
        console.error('MotionTimeline이 초기화되지 않았습니다.');
        return;
    }

    // 1. 트랙 통계 정보 확인
    console.log('--- 트랙 통계 정보 ---');
    const stats = motionTimeline.getTracksStatistics();
    if (stats) {
        console.log('총 트랙 수:', stats.totalTracks);
        console.log('총 키프레임 수:', stats.totalKeyframes);
        console.log('트랙별 속성 분포:', Object.fromEntries(stats.tracksByProperty));
        console.log('트랙이 있는 오브젝트 수:', stats.objectsWithTracks.size);
    }

    // 2. 트랙 데이터 검증
    console.log('--- 트랙 데이터 검증 ---');
    const validation = motionTimeline.validateTracksData();
    if (validation) {
        console.log('검증 결과:', validation.isValid ? '유효' : '오류 있음');
        if (!validation.isValid) {
            console.error('오류 목록:', validation.errors);
        }
        console.log('정리된 트랙 수:', validation.totalTracks);
    }

    // 3. 트랙 데이터 정리
    console.log('--- 트랙 데이터 정리 ---');
    const cleanupResult = motionTimeline.cleanupTracksData();
    if (cleanupResult) {
        console.log('제거된 빈 트랙:', cleanupResult.emptyTracksRemoved);
        console.log('정리 전 통계:', cleanupResult.beforeStats);
        console.log('정리 후 통계:', cleanupResult.afterStats);
    }

    // 4. 트랙 데이터 백업
    console.log('--- 트랙 데이터 백업 ---');
    const backup = motionTimeline.backupTracksData();
    if (backup) {
        console.log('백업 완료:', {
            timestamp: new Date(backup.timestamp).toLocaleString(),
            maxTime: backup.maxTime,
            tracksCount: backup.tracks.size
        });
        
        // 백업 데이터를 localStorage에 저장 (실제 사용 시에는 파일로 저장)
        localStorage.setItem('timeline_backup', JSON.stringify(backup));
        console.log('백업이 localStorage에 저장되었습니다.');
    }

    // 5. 특정 오브젝트의 트랙 정보 확인
    console.log('--- 특정 오브젝트 트랙 정보 ---');
    if (editor.selected) {
        const objectTracks = motionTimeline.getObjectTracksInfo(editor.selected.uuid);
        if (objectTracks) {
            console.log(`선택된 오브젝트 (${editor.selected.name})의 트랙 정보:`, objectTracks);
        }
    }

    // 6. 트랙 데이터 내보내기/가져오기 예제
    console.log('--- 트랙 데이터 내보내기/가져오기 ---');
    const exportData = motionTimeline.exportTracksData();
    if (exportData) {
        console.log('내보내기 데이터:', exportData);
        
        // 가져오기 테스트 (실제로는 다른 파일에서 가져올 수 있음)
        const importSuccess = motionTimeline.importTracksData(exportData);
        console.log('가져오기 성공 여부:', importSuccess);
    }

    // 7. 트랙 데이터 병합 예제
    console.log('--- 트랙 데이터 병합 예제 ---');
    const otherTimelineData = new TimelineData();
    
    // 테스트용 트랙 추가
    const testTrack = otherTimelineData.addTrack('test-uuid', 'position');
    testTrack.addKeyframe(1.0, new THREE.Vector3(1, 2, 3));
    testTrack.addKeyframe(2.0, new THREE.Vector3(4, 5, 6));
    
    const mergeResult = motionTimeline.mergeTracksData(otherTimelineData);
    if (mergeResult) {
        console.log('병합 결과:', mergeResult);
    }

    console.log('=== 트랙 데이터 정리 및 관리 예제 완료 ===');
}

// 트랙 데이터 모니터링 예제
export function createTracksDataMonitoringExample(editor) {
    console.log('=== 트랙 데이터 모니터링 예제 시작 ===');

    const motionTimeline = editor.motionTimeline;
    if (!motionTimeline) {
        console.error('MotionTimeline이 초기화되지 않았습니다.');
        return;
    }

    // 모니터링 함수
    const monitorTracksData = () => {
        const stats = motionTimeline.getTracksStatistics();
        if (stats) {
            console.log(`[${new Date().toLocaleTimeString()}] 트랙 상태:`, {
                totalTracks: stats.totalTracks,
                totalKeyframes: stats.totalKeyframes,
                objectsCount: stats.objectsWithTracks.size
            });
        }
    };

    // 5초마다 모니터링
    const monitoringInterval = setInterval(monitorTracksData, 5000);
    
    // 30초 후 모니터링 중지
    setTimeout(() => {
        clearInterval(monitoringInterval);
        console.log('트랙 데이터 모니터링이 중지되었습니다.');
    }, 30000);

    console.log('=== 트랙 데이터 모니터링 예제 시작됨 (30초간 실행) ===');
}

// 트랙 데이터 성능 최적화 예제
export function createTracksDataOptimizationExample(editor) {
    console.log('=== 트랙 데이터 성능 최적화 예제 시작 ===');

    const motionTimeline = editor.motionTimeline;
    if (!motionTimeline) {
        console.error('MotionTimeline이 초기화되지 않았습니다.');
        return;
    }

    // 1. 성능 측정 시작
    const startTime = performance.now();

    // 2. 대량의 키프레임 추가 (성능 테스트)
    console.log('--- 대량 키프레임 추가 테스트 ---');
    const testObjectUuid = 'test-performance-uuid';
    
    for (let i = 0; i < 100; i++) {
        const time = i * 0.1;
        const value = new THREE.Vector3(i, i * 2, i * 3);
        motionTimeline.addKeyframe(testObjectUuid, 'position', time, value);
    }

    // 3. 성능 측정 중간점
    const midTime = performance.now();
    console.log(`100개 키프레임 추가 시간: ${(midTime - startTime).toFixed(2)}ms`);

    // 4. 데이터 정리 및 최적화
    console.log('--- 데이터 정리 및 최적화 ---');
    const cleanupResult = motionTimeline.cleanupTracksData();
    
    // 5. 최종 성능 측정
    const endTime = performance.now();
    console.log(`전체 처리 시간: ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`정리 시간: ${(endTime - midTime).toFixed(2)}ms`);

    if (cleanupResult) {
        console.log('최적화 결과:', {
            beforeTracks: cleanupResult.beforeStats.totalTracks,
            afterTracks: cleanupResult.afterStats.totalTracks,
            beforeKeyframes: cleanupResult.beforeStats.totalKeyframes,
            afterKeyframes: cleanupResult.afterStats.totalKeyframes
        });
    }

    console.log('=== 트랙 데이터 성능 최적화 예제 완료 ===');
} 