# 안전한 타임라인 시스템

## 개요

이 문서는 리팩토링된 안전한 타임라인 시스템의 사용법과 개선사항을 설명합니다.

## 주요 개선사항

### 1. 단일 소스 오브 트루스 (Single Source of Truth)
- **TimelineData**가 모든 키프레임 정보의 단일 소스
- UI는 TimelineData의 상태를 반영하는 역할만 수행
- 데이터 불일치 문제 해결

### 2. 이벤트 기반 시스템
- 키프레임 변경사항을 자동으로 감지
- UI 자동 업데이트
- 디버깅 및 로깅 개선

### 3. 안전한 키프레임 관리
- 인덱스 기반 키프레임 조작
- 유효성 검증
- 에러 처리 강화

## 파일 구조

```
timeline/
├── TimelineCore.js          # 핵심 데이터 구조 및 이벤트 시스템
├── MotionTimeline.js        # 모션 타임라인 구현
├── BaseTimeline.js          # 기본 타임라인 클래스
├── Timeline.js              # 메인 타임라인 컨트롤러
├── timeline_example.js      # 사용 예제
└── README.md               # 이 문서
```

## 핵심 클래스

### TimelineData
타임라인 데이터의 중앙 저장소

```javascript
const timelineData = new TimelineData();

// 트랙 추가
const trackData = timelineData.addTrack(objectUuid, 'position');

// 키프레임 추가
trackData.addKeyframe(time, value, interpolation);

// 이벤트 리스너
timelineData.addEventListener('track_keyframe_added', (data) => {
  console.log('키프레임 추가됨:', data);
});
```

### TrackData
개별 속성의 키프레임 데이터 관리

```javascript
// 안전한 키프레임 시간 업데이트
trackData.updateKeyframeTime(index, newTime);

// 안전한 키프레임 값 업데이트
trackData.updateKeyframeValue(index, newValue);

// 인덱스 기반 키프레임 삭제
trackData.removeKeyframeByIndex(index);
```

## 사용법

### 1. 기본 설정

```javascript
import { MotionTimeline } from './MotionTimeline.js';

const timelineSettings = {
  totalSeconds: 60,
  framesPerSecond: 30,
  currentFrame: 0
};

const motionTimeline = new MotionTimeline(editor, timelineSettings);
```

### 2. 안전한 키프레임 추가

```javascript
// 기존 방식 (위험)
keyframeElement.dataset.time = newTime; // UI만 변경

// 새로운 방식 (안전)
const trackData = timelineData.tracks.get(objectUuid)?.get(property);
if (trackData.updateKeyframeTime(index, newTime)) {
  // UI는 이벤트로 자동 업데이트됨
  console.log('키프레임 시간 업데이트 성공');
}
```

### 3. 이벤트 리스너 설정

```javascript
// 키프레임 추가 이벤트
timelineData.addEventListener('track_keyframe_added', (data) => {
  console.log('키프레임 추가됨:', data);
});

// 키프레임 이동 이벤트
timelineData.addEventListener('track_keyframe_moved', (data) => {
  console.log('키프레임 이동됨:', data);
});

// 키프레임 삭제 이벤트
timelineData.addEventListener('track_keyframe_removed', (data) => {
  console.log('키프레임 삭제됨:', data);
});
```

### 4. 데이터 검증

```javascript
// 타임라인 데이터 검증
const validation = timelineData.validate();
if (validation.isValid) {
  console.log('데이터가 유효합니다');
} else {
  console.error('데이터 오류:', validation.errors);
}
```

### 5. 백업 및 복원

```javascript
// 백업
const backup = timelineData.clone();

// 복원
timelineData = backup;
timelineData.dirty = true;
timelineData.precomputeAnimationData();
```

## 주요 메서드

### TimelineData
- `addTrack(objectUuid, property)` - 트랙 추가
- `removeTrack(objectUuid, property)` - 트랙 삭제
- `updateMaxTime(time)` - 최대 시간 업데이트
- `precomputeAnimationData()` - 애니메이션 데이터 사전 계산
- `validate()` - 데이터 검증
- `clone()` - 데이터 복사

### TrackData
- `addKeyframe(time, value, interpolation)` - 키프레임 추가
- `removeKeyframeByIndex(index)` - 인덱스 기반 키프레임 삭제
- `updateKeyframeTime(index, newTime)` - 키프레임 시간 업데이트
- `updateKeyframeValue(index, newValue)` - 키프레임 값 업데이트
- `getKeyframeByIndex(index)` - 인덱스 기반 키프레임 조회
- `findKeyframeIndex(time)` - 시간 기반 인덱스 검색

## 이벤트 타입

```javascript
export const KEYFRAME_EVENTS = {
  ADDED: 'keyframe_added',      // 키프레임 추가
  REMOVED: 'keyframe_removed',  // 키프레임 삭제
  UPDATED: 'keyframe_updated',  // 키프레임 값 업데이트
  MOVED: 'keyframe_moved',      // 키프레임 시간 이동
  SELECTED: 'keyframe_selected' // 키프레임 선택
};
```

## 디버깅

### 상태 확인
```javascript
// 타임라인 상태 디버깅
motionTimeline.debugTimelineState();

// 특정 키프레임 애니메이션 디버깅
motionTimeline.debugKeyframeAnimation(objectUuid, property);
```

### 로깅
모든 키프레임 조작은 자동으로 로깅됩니다:
- 🔵 키프레임 추가
- 🔴 키프레임 삭제
- 🟡 키프레임 업데이트
- 🟢 키프레임 이동

## 마이그레이션 가이드

### 기존 코드에서 새로운 시스템으로

1. **키프레임 드래그**
```javascript
// 기존 (위험)
keyframeElement.dataset.time = newTime;
trackData.times[index] = newTime;

// 새로운 (안전)
trackData.updateKeyframeTime(index, newTime);
```

2. **키프레임 값 변경**
```javascript
// 기존 (위험)
keyframeElement.dataset.x = newValue.x;

// 새로운 (안전)
trackData.updateKeyframeValue(index, newValue);
```

3. **키프레임 삭제**
```javascript
// 기존 (위험)
keyframeElement.remove();
delete trackData.times[index];

// 새로운 (안전)
trackData.removeKeyframeByIndex(index);
```

## 성능 최적화

1. **프리컴퓨트 데이터**
   - 키프레임 변경 시 자동으로 재계산
   - 애니메이션 재생 시 빠른 접근

2. **이벤트 시스템**
   - 필요한 경우에만 UI 업데이트
   - 불필요한 DOM 조작 최소화

3. **메모리 관리**
   - Float32Array 사용으로 메모리 효율성
   - 최대 키프레임 수 제한

## 주의사항

1. **항상 TimelineData를 통해서만 키프레임 조작**
2. **UI 직접 수정 금지**
3. **이벤트 리스너에서 에러 처리 필수**
4. **데이터 검증 후 사용**

## 예제 실행

```javascript
import { createSafeTimelineExample } from './timeline_example.js';

const example = createSafeTimelineExample(editor);
example.runCompleteExample();
```

## 문제 해결

### 키프레임이 애니메이션에 반영되지 않는 경우
1. `timelineData.dirty = true` 확인
2. `timelineData.precomputeAnimationData()` 호출
3. `updateAnimation(currentTime)` 호출

### UI가 업데이트되지 않는 경우
1. 이벤트 리스너가 제대로 설정되었는지 확인
2. TimelineData를 통해서만 키프레임 조작했는지 확인
3. DOM 요소가 올바른 선택자로 찾아지는지 확인

### 성능 문제
1. 불필요한 `precomputeAnimationData()` 호출 확인
2. 키프레임 개수가 최대값을 초과하지 않는지 확인
3. 이벤트 리스너에서 무한 루프가 발생하지 않는지 확인 




�� 단축키 목록:
K - 현재 시간에 키프레임 추가
Space - 재생/일시정지
ESC - 정지
F1 - 단축키 도움말 표시
�� K 키 사용법:
애니메이션할 객체를 선택
원하는 시간으로 playhead 이동
K 키를 눌러 키프레임 추가
✨ 추가 기능:
자동 검증: 객체 선택, 클립 범위 체크
시각적 피드백: 키프레임 추가 성공 시 녹색 알림
오류 처리: 조건 불충족 시 경고 메시지
도움말: F1 키로 단축키 목록 확인
�� 안전장치:
객체가 선택되지 않으면 경고
클립 범위 밖이면 경고
트랙이 없으면 경고
이제 K 키만 누르면 현재 선택된 객체의 현재 시간에 키프레임이 추가됩니다! 🚀