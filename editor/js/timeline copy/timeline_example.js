// 타임라인 인덱스 기반 키프레임 관리 사용 예시
import { TimelineData, TrackData, INTERPOLATION } from './TimelineCore.js';

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