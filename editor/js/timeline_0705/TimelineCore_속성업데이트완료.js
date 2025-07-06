// editor/js/timeline/TimelineCore.js
import * as THREE from "three";

// 타임라인 상수 정의
export const INTERPOLATION = {
  LINEAR: 0,
  BEZIER: 1,
  STEP: 2
};

// 키프레임 이벤트 타입
export const KEYFRAME_EVENTS = {
  ADDED: 'keyframe_added',
  REMOVED: 'keyframe_removed',
  UPDATED: 'keyframe_updated',
  MOVED: 'keyframe_moved',
  SELECTED: 'keyframe_selected'
};

// 최대 키프레임 수 (기본값)
const DEFAULT_MAX_FRAMES = 1000; // 기본 1000개 키프레임
const MAX_FRAMES_LIMIT = 10000;  // 최대 10000개 키프레임

// 트랙 데이터 클래스
export class TrackData {
  constructor(initialCapacity = DEFAULT_MAX_FRAMES) {
    this.capacity = Math.min(initialCapacity, MAX_FRAMES_LIMIT);
    this.times = new Float32Array(this.capacity); // 키프레임 시간
    this.values = new Float32Array(this.capacity * 3); // 키프레임 값 (x,y,z)
    this.interpolations = new Uint8Array(this.capacity); // 보간 타입
    this.keyframeCount = 0;
    this.dirty = true; // 프리컴파일 필요 여부
    this.eventListeners = new Map(); // 이벤트 리스너들
  }

  // 배열 크기 확장 (필요시)
  expandCapacity(newCapacity) {
    if (newCapacity <= this.capacity) return true;
    
    const maxCapacity = Math.min(newCapacity, MAX_FRAMES_LIMIT);
    if (maxCapacity <= this.capacity) return false;

    try {
      // 새로운 배열 생성
      const newTimes = new Float32Array(maxCapacity);
      const newValues = new Float32Array(maxCapacity * 3);
      const newInterpolations = new Uint8Array(maxCapacity);

      // 기존 데이터 복사
      newTimes.set(this.times);
      newValues.set(this.values);
      newInterpolations.set(this.interpolations);

      // 배열 교체
      this.times = newTimes;
      this.values = newValues;
      this.interpolations = newInterpolations;
      this.capacity = maxCapacity;

      console.log(`TrackData capacity expanded to ${maxCapacity}`);
      return true;
    } catch (error) {
      console.error('Failed to expand TrackData capacity:', error);
      return false;
    }
  }

  // 메모리 사용량 계산
  getMemoryUsage() {
    return {
      times: this.times.byteLength,
      values: this.values.byteLength,
      interpolations: this.interpolations.byteLength,
      total: this.times.byteLength + this.values.byteLength + this.interpolations.byteLength,
      capacity: this.capacity,
      used: this.keyframeCount,
      utilization: (this.keyframeCount / this.capacity * 100).toFixed(1) + '%'
    };
  }

  // 메모리 최적화 (사용하지 않는 공간 제거)
  optimizeMemory() {
    if (this.keyframeCount === 0) {
      // 키프레임이 없으면 최소 크기로 축소
      this.times = new Float32Array(DEFAULT_MAX_FRAMES);
      this.values = new Float32Array(DEFAULT_MAX_FRAMES * 3);
      this.interpolations = new Uint8Array(DEFAULT_MAX_FRAMES);
      this.capacity = DEFAULT_MAX_FRAMES;
      return true;
    }

    // 사용 중인 키프레임 수에 맞게 크기 조정
    const optimalCapacity = Math.max(DEFAULT_MAX_FRAMES, this.keyframeCount * 2);
    if (optimalCapacity < this.capacity) {
      return this.expandCapacity(optimalCapacity);
    }
    return true;
  }

  // 이벤트 리스너 추가
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  // 이벤트 리스너 제거
  removeEventListener(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 이벤트 발생
  emit(eventType, data) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`이벤트 리스너 오류 (${eventType}):`, error);
        }
      });
    }
  }

  // 키프레임 추가 (안전한 버전)
  addKeyframe(time, value, interpolation = INTERPOLATION.LINEAR) {
    console.log('TrackData.addKeyframe called with:', {
      time,
      value,
      interpolation,
      valueType: value ? typeof value : 'undefined',
      hasX: value ? typeof value.x !== 'undefined' : false,
      hasY: value ? typeof value.y !== 'undefined' : false,
      hasZ: value ? typeof value.z !== 'undefined' : false
    });

    if (!value) {
      console.error('Invalid value for keyframe: value is undefined or null');
      return false;
    }

    if (typeof value.x === 'undefined' || typeof value.y === 'undefined' || typeof value.z === 'undefined') {
      console.error('Invalid value for keyframe: value object is missing required properties', {
        value,
        hasX: typeof value.x !== 'undefined',
        hasY: typeof value.y !== 'undefined',
        hasZ: typeof value.z !== 'undefined'
      });
      return false;
    }

    if (this.keyframeCount >= this.capacity) {
      // 용량 확장 시도
      const newCapacity = Math.min(this.capacity * 2, MAX_FRAMES_LIMIT);
      if (!this.expandCapacity(newCapacity)) {
        console.error('Maximum number of keyframes reached');
        return false;
      }
    }

    const existingIndex = this.findKeyframeIndex(time);
    if (existingIndex !== -1) {
      console.warn("이미 존재하는 시간의 키프레임입니다:", time);
      return false;
    }

    const index = this.keyframeCount;
    this.times[index] = time;
    this.values[index * 3] = value.x;
    this.values[index * 3 + 1] = value.y;
    this.values[index * 3 + 2] = value.z;
    this.interpolations[index] = interpolation;
    this.keyframeCount++;
    this.dirty = true;

    this.sortKeyframes();

    // 이벤트 발생
    this.emit(KEYFRAME_EVENTS.ADDED, {
      index,
      time,
      value,
      interpolation
    });

    return true;
  }

  // 키프레임 삭제 (인덱스 기반) - 안전한 버전
  removeKeyframeByIndex(index) {
    if (index < 0 || index >= this.keyframeCount) {
      console.warn(`유효하지 않은 키프레임 인덱스: ${index}`);
      return false;
    }

    const removedTime = this.times[index];
    const removedValue = new THREE.Vector3(
      this.values[index * 3],
      this.values[index * 3 + 1],
      this.values[index * 3 + 2]
    );

    // 마지막 키프레임을 현재 위치로 이동
    if (index < this.keyframeCount - 1) {
      this.times[index] = this.times[this.keyframeCount - 1];
      this.values[index * 3] = this.values[(this.keyframeCount - 1) * 3];
      this.values[index * 3 + 1] = this.values[(this.keyframeCount - 1) * 3 + 1];
      this.values[index * 3 + 2] = this.values[(this.keyframeCount - 1) * 3 + 2];
      this.interpolations[index] = this.interpolations[this.keyframeCount - 1];
    }

    this.keyframeCount--;
    this.dirty = true;
    this.sortKeyframes();

    // 이벤트 발생
    this.emit(KEYFRAME_EVENTS.REMOVED, {
      index,
      time: removedTime,
      value: removedValue
    });

    return true;
  }

  // 키프레임 시간 업데이트 (안전한 버전)
  updateKeyframeTime(index, newTime) {
    console.log("=== TrackData.updateKeyframeTime 호출 ===");
    console.log("index:", index, "newTime:", newTime);
    console.log("keyframeCount:", this.keyframeCount);
    console.log("업데이트 전 times 배열:", Array.from(this.times.slice(0, this.keyframeCount)));
    
    if (index < 0 || index >= this.keyframeCount) {
      console.warn(`유효하지 않은 키프레임 인덱스: ${index}`);
      return false;
    }

    const oldTime = this.times[index];
    console.log("oldTime:", oldTime, "newTime:", newTime);
    
    if (Math.abs(oldTime - newTime) < 0.001) {
      console.log("키프레임 시간이 동일합니다:", newTime);
      return true; // 변경 없음
    }

    // 같은 시간에 다른 키프레임이 있는지 확인
    const existingIndex = this.findKeyframeIndex(newTime);
    if (existingIndex !== -1 && existingIndex !== index) {
      console.warn("해당 시간에 이미 키프레임이 존재합니다:", newTime);
      return false;
    }

    console.log("키프레임 시간 업데이트 실행:", oldTime, "->", newTime);
    this.times[index] = newTime;
    console.log("업데이트 후 times 배열:", Array.from(this.times.slice(0, this.keyframeCount)));
    
    this.dirty = true;
    this.sortKeyframes();

    // 이벤트 발생
    this.emit(KEYFRAME_EVENTS.MOVED, {
      index,
      oldTime,
      newTime,
      value: new THREE.Vector3(
        this.values[index * 3],
        this.values[index * 3 + 1],
        this.values[index * 3 + 2]
      )
    });

    return true;
  }

  // 키프레임 값 업데이트 (안전한 버전)
  updateKeyframeValue(index, newValue) {
    if (index < 0 || index >= this.keyframeCount) {
      console.warn(`유효하지 않은 키프레임 인덱스: ${index}`);
      return false;
    }

    if (!newValue || typeof newValue.x === 'undefined' || typeof newValue.y === 'undefined' || typeof newValue.z === 'undefined') {
      console.error("유효하지 않은 키프레임 값:", newValue);
      return false;
    }

    const oldValue = new THREE.Vector3(
      this.values[index * 3],
      this.values[index * 3 + 1],
      this.values[index * 3 + 2]
    );

    this.values[index * 3] = newValue.x;
    this.values[index * 3 + 1] = newValue.y;
    this.values[index * 3 + 2] = newValue.z;
    this.dirty = true;

    // 이벤트 발생
    this.emit(KEYFRAME_EVENTS.UPDATED, {
      index,
      time: this.times[index],
      oldValue,
      newValue
    });

    return true;
  }

  // 키프레임 삭제 (시간 기반 - 하위 호환성)
  removeKeyframe(time) {
    const index = this.findKeyframeIndex(time);
    if (index === -1) return false;
    return this.removeKeyframeByIndex(index);
  }

  // 키프레임 인덱스 찾기 (시간 기반)
  findKeyframeIndex(time) {
    // 이진 검색으로 키프레임 인덱스 찾기
    let left = 0;
    let right = this.keyframeCount - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = this.times[mid];

      if (Math.abs(midTime - time) < 0.001) {
        return mid;
      }

      if (midTime < time) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return -1;
  }

  // 키프레임 시간으로 인덱스 찾기 (가장 가까운)
  findClosestKeyframeIndex(time) {
    if (this.keyframeCount === 0) return -1;
    if (this.keyframeCount === 1) return 0;

    // 이진 검색으로 가장 가까운 키프레임 찾기
    let left = 0;
    let right = this.keyframeCount - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = this.times[mid];

      if (Math.abs(midTime - time) < 0.001) {
        return mid;
      }

      if (midTime < time) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // 가장 가까운 인덱스 반환
    if (left >= this.keyframeCount) return this.keyframeCount - 1;
    if (right < 0) return 0;

    const leftTime = this.times[left];
    const rightTime = this.times[right];

    return Math.abs(leftTime - time) < Math.abs(rightTime - time) ? left : right;
  }

  // 키프레임 값 가져오기 (인덱스 기반)
  getKeyframeByIndex(index) {
    if (index < 0 || index >= this.keyframeCount) return null;

    return {
      time: this.times[index],
      value: new THREE.Vector3(
        this.values[index * 3],
        this.values[index * 3 + 1],
        this.values[index * 3 + 2]
      ),
      interpolation: this.interpolations[index]
    };
  }

  // 키프레임 값 설정 (인덱스 기반)
  setKeyframeByIndex(index, time, value, interpolation) {
    if (index < 0 || index >= this.keyframeCount) return false;
    if (!value || typeof value.x === 'undefined' || typeof value.y === 'undefined' || typeof value.z === 'undefined') {
      return false;
    }

    this.times[index] = time;
    this.values[index * 3] = value.x;
    this.values[index * 3 + 1] = value.y;
    this.values[index * 3 + 2] = value.z;
    this.interpolations[index] = interpolation;
    this.dirty = true;

    this.sortKeyframes();
    return true;
  }

  // 키프레임 개수 가져오기
  getKeyframeCount() {
    return this.keyframeCount;
  }

  // 모든 키프레임 가져오기
  getAllKeyframes() {
    const keyframes = [];
    for (let i = 0; i < this.keyframeCount; i++) {
      keyframes.push(this.getKeyframeByIndex(i));
    }
    return keyframes;
  }

  // 키프레임 시간순 정렬
  sortKeyframes() {
    console.log("=== sortKeyframes 호출 ===");
    console.log("정렬 전 times:", Array.from(this.times.slice(0, this.keyframeCount)));
    
    // 버블 정렬로 키프레임 시간순 정렬
    for (let i = 0; i < this.keyframeCount - 1; i++) {
      for (let j = 0; j < this.keyframeCount - i - 1; j++) {
        if (this.times[j] > this.times[j + 1]) {
          console.log(`정렬 중: 인덱스 ${j}(${this.times[j]})와 ${j+1}(${this.times[j+1]}) 교환`);
          
          // 시간 교환
          [this.times[j], this.times[j + 1]] = [this.times[j + 1], this.times[j]];

          // 값 교환
          const tempX = this.values[j * 3];
          const tempY = this.values[j * 3 + 1];
          const tempZ = this.values[j * 3 + 2];
          this.values[j * 3] = this.values[(j + 1) * 3];
          this.values[j * 3 + 1] = this.values[(j + 1) * 3 + 1];
          this.values[j * 3 + 2] = this.values[(j + 1) * 3 + 2];
          this.values[(j + 1) * 3] = tempX;
          this.values[(j + 1) * 3 + 1] = tempY;
          this.values[(j + 1) * 3 + 2] = tempZ;

          // 보간 타입 교환
          [this.interpolations[j], this.interpolations[j + 1]] =
            [this.interpolations[j + 1], this.interpolations[j]];
        }
      }
    }
    
    console.log("정렬 후 times:", Array.from(this.times.slice(0, this.keyframeCount)));
  }

  // 키프레임 값 가져오기
  getValueAtTime(time) {
    if (this.keyframeCount === 0) return null;
    if (this.keyframeCount === 1) {
      return new THREE.Vector3(
        this.values[0],
        this.values[1],
        this.values[2]
      );
    }

    // 시간 범위 체크
    if (time <= this.times[0]) {
      return new THREE.Vector3(
        this.values[0],
        this.values[1],
        this.values[2]
      );
    }
    if (time >= this.times[this.keyframeCount - 1]) {
      const lastIndex = (this.keyframeCount - 1) * 3;
      return new THREE.Vector3(
        this.values[lastIndex],
        this.values[lastIndex + 1],
        this.values[lastIndex + 2]
      );
    }

    // 이웃한 키프레임 찾기
    let nextIndex = 0;
    while (nextIndex < this.keyframeCount && this.times[nextIndex] < time) {
      nextIndex++;
    }
    const prevIndex = nextIndex - 1;

    // 보간
    const prevTime = this.times[prevIndex];
    const nextTime = this.times[nextIndex];
    const t = (time - prevTime) / (nextTime - prevTime);

    const prevValue = new THREE.Vector3(
      this.values[prevIndex * 3],
      this.values[prevIndex * 3 + 1],
      this.values[prevIndex * 3 + 2]
    );
    const nextValue = new THREE.Vector3(
      this.values[nextIndex * 3],
      this.values[nextIndex * 3 + 1],
      this.values[nextIndex * 3 + 2]
    );

    switch (this.interpolations[prevIndex]) {
      case INTERPOLATION.LINEAR:
        return prevValue.lerp(nextValue, t);
      case INTERPOLATION.STEP:
        return prevValue;
      case INTERPOLATION.BEZIER:
        // 베지어 보간 구현 (현재는 선형 보간으로 대체)
        console.warn("베지어 보간은 아직 완전히 구현되지 않았습니다. 선형 보간을 사용합니다.");
        return prevValue.lerp(nextValue, t);
      default:
        return prevValue.lerp(nextValue, t);
    }
  }

  // 베지어 보간 구현
  bezierInterpolate(p0, p1, p2, p3, t) {
    const cx = 3 * (p1.x - p0.x);
    const bx = 3 * (p2.x - p1.x) - cx;
    const ax = p3.x - p0.x - cx - bx;

    const cy = 3 * (p1.y - p0.y);
    const by = 3 * (p2.y - p1.y) - cy;
    const ay = p3.y - p0.y - cy - by;

    const cz = 3 * (p1.z - p0.z);
    const bz = 3 * (p2.z - p1.z) - cz;
    const az = p3.z - p0.z - cz - bz;

    const t2 = t * t;
    const t3 = t2 * t;

    return new THREE.Vector3(
      ax * t3 + bx * t2 + cx * t + p0.x,
      ay * t3 + by * t2 + cy * t + p0.y,
      az * t3 + bz * t2 + cz * t + p0.z
    );
  }

  // 트랙 데이터 검증
  validate() {
    const errors = [];

    if (this.keyframeCount < 0) {
      errors.push("키프레임 개수가 음수입니다");
    }

    if (this.keyframeCount > this.capacity) {
      errors.push("키프레임 개수가 최대값을 초과했습니다");
    }

    // 시간 순서 검증
    for (let i = 1; i < this.keyframeCount; i++) {
      if (this.times[i] < this.times[i - 1]) {
        errors.push(`키프레임 시간이 순서대로 정렬되지 않았습니다: 인덱스 ${i - 1}(${this.times[i - 1]}) > 인덱스 ${i}(${this.times[i]})`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 트랙 데이터 복사
  clone() {
    const cloned = new TrackData(this.capacity);
    cloned.keyframeCount = this.keyframeCount;
    cloned.dirty = this.dirty;

    // 배열 복사
    cloned.times.set(this.times.slice(0, this.keyframeCount));
    cloned.values.set(this.values.slice(0, this.keyframeCount * 3));
    cloned.interpolations.set(this.interpolations.slice(0, this.keyframeCount));

    return cloned;
  }
}

// 타임라인 데이터 클래스
export class TimelineData {
  constructor() {
    this.tracks = new Map(); // Map<objectUuid, Map<property, TrackData>>
    this.tracksById = new Map(); // Map<objectId, Map<property, TrackData>> - ID 기반 접근
    this.maxTime = 0;
    this.frameRate = 30;
    this.dirty = true;
    this.eventListeners = new Map();
    this.precomputedData = new Map(); // 프리컴퓨트된 애니메이션 데이터
  }

  // 이벤트 리스너 추가
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  // 이벤트 리스너 제거
  removeEventListener(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 이벤트 발생
  emit(eventType, data) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`TimelineData 이벤트 리스너 오류 (${eventType}):`, error);
        }
      });
    }
  }

  // 트랙 데이터 정리 및 통합 관리 메서드들
  addTrack(objectUuid, property, objectId = null) {
    if (!this.tracks.has(objectUuid)) {
      this.tracks.set(objectUuid, new Map());
    }
    
    if (!this.tracks.get(objectUuid).has(property)) {
      const trackData = new TrackData();
      this.tracks.get(objectUuid).set(property, trackData);
      
      // objectId가 제공된 경우 ID 기반 맵에도 저장
      if (objectId !== null) {
        if (!this.tracksById.has(objectId)) {
          this.tracksById.set(objectId, new Map());
        }
        this.tracksById.get(objectId).set(property, trackData);
      }
      
      this.emit('track_added', { objectUuid, objectId, property });
      return trackData;
    }
    
    return this.tracks.get(objectUuid).get(property);
  }

  // UUID로 트랙 가져오기
  getTrackByUuid(objectUuid, property) {
    return this.tracks.get(objectUuid)?.get(property);
  }

  // ID로 트랙 가져오기
  getTrackById(objectId, property) {
    return this.tracksById.get(objectId)?.get(property);
  }

  // 모든 트랙 가져오기 (UUID 기반)
  getAllTracksByUuid() {
    const result = new Map();
    for (const [uuid, properties] of this.tracks) {
      for (const [property, trackData] of properties) {
        result.set(`${uuid}_${property}`, {
          uuid,
          property,
          trackData,
          keyframeCount: trackData.getKeyframeCount()
        });
      }
    }
    return result;
  }

  // 모든 트랙 가져오기 (ID 기반)
  getAllTracksById() {
    const result = new Map();
    for (const [id, properties] of this.tracksById) {
      for (const [property, trackData] of properties) {
        result.set(`${id}_${property}`, {
          id,
          property,
          trackData,
          keyframeCount: trackData.getKeyframeCount()
        });
      }
    }
    return result;
  }

  // 특정 오브젝트의 모든 트랙 가져오기
  getObjectTracks(objectUuid) {
    return this.tracks.get(objectUuid) || new Map();
  }

  // 특정 오브젝트의 모든 트랙 가져오기 (ID 기반)
  getObjectTracksById(objectId) {
    return this.tracksById.get(objectId) || new Map();
  }

  // 트랙 삭제 (UUID 기반)
  removeTrackByUuid(objectUuid, property) {
    const trackData = this.tracks.get(objectUuid)?.get(property);
    if (trackData) {
      this.tracks.get(objectUuid).delete(property);
      if (this.tracks.get(objectUuid).size === 0) {
        this.tracks.delete(objectUuid);
      }
      this.emit('track_removed', { objectUuid, property });
      return true;
    }
    return false;
  }

  // 트랙 삭제 (ID 기반)
  removeTrackById(objectId, property) {
    const trackData = this.tracksById.get(objectId)?.get(property);
    if (trackData) {
      this.tracksById.get(objectId).delete(property);
      if (this.tracksById.get(objectId).size === 0) {
        this.tracksById.delete(objectId);
      }
      this.emit('track_removed', { objectId, property });
      return true;
    }
    return false;
  }

  // 트랙 통계 정보
  getTrackStatistics() {
    const stats = {
      totalTracks: 0,
      totalKeyframes: 0,
      tracksByProperty: new Map(),
      objectsWithTracks: new Set()
    };

    for (const [uuid, properties] of this.tracks) {
      stats.objectsWithTracks.add(uuid);
      for (const [property, trackData] of properties) {
        stats.totalTracks++;
        stats.totalKeyframes += trackData.getKeyframeCount();
        
        if (!stats.tracksByProperty.has(property)) {
          stats.tracksByProperty.set(property, 0);
        }
        stats.tracksByProperty.set(property, stats.tracksByProperty.get(property) + 1);
      }
    }

    return stats;
  }

  // 트랙 데이터 검증 및 정리
  validateAndCleanTracks() {
    const errors = [];
    const cleaned = [];

    for (const [uuid, properties] of this.tracks) {
      for (const [property, trackData] of properties) {
        const validation = trackData.validate();
        if (!validation.isValid) {
          errors.push({
            uuid,
            property,
            errors: validation.errors
          });
        } else {
          cleaned.push({
            uuid,
            property,
            keyframeCount: trackData.getKeyframeCount()
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      cleaned,
      totalTracks: cleaned.length
    };
  }

  // 전체 메모리 사용량 계산
  getTotalMemoryUsage() {
    let totalMemory = 0;
    let totalTracks = 0;
    let totalKeyframes = 0;
    const trackDetails = [];

    for (const [uuid, properties] of this.tracks) {
      for (const [property, trackData] of properties) {
        const memoryUsage = trackData.getMemoryUsage();
        totalMemory += memoryUsage.total;
        totalKeyframes += trackData.getKeyframeCount();
        totalTracks++;
        
        trackDetails.push({
          uuid,
          property,
          memoryUsage,
          keyframeCount: trackData.getKeyframeCount()
        });
      }
    }

    return {
      totalMemory,
      totalTracks,
      totalKeyframes,
      averageMemoryPerTrack: totalTracks > 0 ? totalMemory / totalTracks : 0,
      trackDetails
    };
  }

  // 메모리 최적화 (모든 트랙)
  optimizeMemory() {
    let optimizedTracks = 0;
    let savedMemory = 0;

    for (const [uuid, properties] of this.tracks) {
      for (const [property, trackData] of properties) {
        const beforeMemory = trackData.getMemoryUsage().total;
        if (trackData.optimizeMemory()) {
          const afterMemory = trackData.getMemoryUsage().total;
          savedMemory += (beforeMemory - afterMemory);
          optimizedTracks++;
        }
      }
    }

    console.log(`Memory optimization completed: ${optimizedTracks} tracks optimized, ${(savedMemory / 1024).toFixed(2)}KB saved`);
    return { optimizedTracks, savedMemory };
  }

  // 빈 트랙 정리 (메모리 절약)
  cleanupEmptyTracks() {
    let removedTracks = 0;

    for (const [uuid, properties] of this.tracks) {
      const emptyProperties = [];
      for (const [property, trackData] of properties) {
        if (trackData.getKeyframeCount() === 0) {
          emptyProperties.push(property);
        }
      }
      
      // 빈 프로퍼티 제거
      emptyProperties.forEach(property => {
        this.removeTrackByUuid(uuid, property);
        removedTracks++;
      });
    }

    console.log(`Cleaned up ${removedTracks} empty tracks`);
    return removedTracks;
  }

  // 빈 트랙 정리
  removeEmptyTracks() {
    const removed = [];
    
    for (const [uuid, properties] of this.tracks) {
      for (const [property, trackData] of properties) {
        if (trackData.getKeyframeCount() === 0) {
          this.removeTrackByUuid(uuid, property);
          removed.push({ uuid, property });
        }
      }
    }

    return removed;
  }

  // 트랙 데이터 정리 및 최적화
  cleanupTracks() {
    console.log('=== 트랙 데이터 정리 시작 ===');
    
    const stats = this.getTrackStatistics();
    console.log('정리 전 통계:', stats);
    
    // 1. 빈 트랙 제거
    const emptyTracksRemoved = this.removeEmptyTracks();
    console.log('제거된 빈 트랙:', emptyTracksRemoved);
    
    // 2. 데이터 검증
    const validation = this.validateAndCleanTracks();
    console.log('데이터 검증 결과:', validation);
    
    // 3. 프리컴퓨트 데이터 재계산
    if (this.dirty) {
      this.precomputeAnimationData();
    }
    
    // 4. 정리 후 통계
    const finalStats = this.getTrackStatistics();
    console.log('정리 후 통계:', finalStats);
    
    console.log('=== 트랙 데이터 정리 완료 ===');
    
    return {
      emptyTracksRemoved,
      validation,
      beforeStats: stats,
      afterStats: finalStats
    };
  }

  // 트랙 데이터 백업
  backupTracks() {
    const backup = {
      tracks: new Map(),
      tracksById: new Map(),
      maxTime: this.maxTime,
      timestamp: Date.now()
    };
    
    // tracks 백업
    for (const [uuid, properties] of this.tracks) {
      backup.tracks.set(uuid, new Map());
      for (const [property, trackData] of properties) {
        backup.tracks.get(uuid).set(property, trackData.clone());
      }
    }
    
    // tracksById 백업
    for (const [id, properties] of this.tracksById) {
      backup.tracksById.set(id, new Map());
      for (const [property, trackData] of properties) {
        backup.tracksById.get(id).set(property, trackData.clone());
      }
    }
    
    return backup;
  }

  // 트랙 데이터 복원
  restoreTracks(backup) {
    if (!backup || !backup.tracks) {
      console.error('유효하지 않은 백업 데이터입니다.');
      return false;
    }
    
    console.log('=== 트랙 데이터 복원 시작 ===');
    
    // 기존 데이터 클리어
    this.tracks.clear();
    this.tracksById.clear();
    
    // tracks 복원
    for (const [uuid, properties] of backup.tracks) {
      this.tracks.set(uuid, new Map());
      for (const [property, trackData] of properties) {
        this.tracks.get(uuid).set(property, trackData.clone());
      }
    }
    
    // tracksById 복원
    for (const [id, properties] of backup.tracksById) {
      this.tracksById.set(id, new Map());
      for (const [property, trackData] of properties) {
        this.tracksById.get(id).set(property, trackData.clone());
      }
    }
    
    this.maxTime = backup.maxTime || 0;
    this.dirty = true;
    
    // 프리컴퓨트 데이터 재계산
    this.precomputeAnimationData();
    
    console.log('=== 트랙 데이터 복원 완료 ===');
    return true;
  }

  // 트랙 데이터 병합
  mergeTracks(otherTimelineData) {
    if (!otherTimelineData || !otherTimelineData.tracks) {
      console.error('유효하지 않은 병합 데이터입니다.');
      return false;
    }
    
    console.log('=== 트랙 데이터 병합 시작 ===');
    
    let mergedCount = 0;
    let conflictCount = 0;
    
    for (const [uuid, properties] of otherTimelineData.tracks) {
      for (const [property, trackData] of properties) {
        const existingTrack = this.getTrackByUuid(uuid, property);
        
        if (existingTrack) {
          // 기존 트랙이 있으면 키프레임 병합
          const existingKeyframes = existingTrack.getAllKeyframes();
          const newKeyframes = trackData.getAllKeyframes();
          
          for (const keyframe of newKeyframes) {
            const existingIndex = existingTrack.findKeyframeIndex(keyframe.time);
            if (existingIndex === -1) {
              existingTrack.addKeyframe(keyframe.time, keyframe.value, keyframe.interpolation);
              mergedCount++;
            } else {
              conflictCount++;
            }
          }
        } else {
          // 새 트랙 생성
          this.addTrack(uuid, property).addKeyframe(
            trackData.times[0],
            new THREE.Vector3(
              trackData.values[0],
              trackData.values[1],
              trackData.values[2]
            ),
            trackData.interpolations[0]
          );
          mergedCount++;
        }
      }
    }
    
    this.dirty = true;
    this.precomputeAnimationData();
    
    console.log(`=== 트랙 데이터 병합 완료: ${mergedCount}개 병합, ${conflictCount}개 충돌 ===`);
    return { mergedCount, conflictCount };
  }

  // 트랙 추가
  addTrack(objectUuid, property) {
    if (!this.tracks.has(objectUuid)) {
      this.tracks.set(objectUuid, new Map());
    }
    const objectTracks = this.tracks.get(objectUuid);
    if (!objectTracks.has(property)) {
      const trackData = new TrackData();
      objectTracks.set(property, trackData);

      // 트랙 데이터의 이벤트를 TimelineData로 전달
      trackData.addEventListener(KEYFRAME_EVENTS.ADDED, (data) => {
        this.emit('track_keyframe_added', { objectUuid, property, ...data });
      });
      trackData.addEventListener(KEYFRAME_EVENTS.REMOVED, (data) => {
        this.emit('track_keyframe_removed', { objectUuid, property, ...data });
      });
      trackData.addEventListener(KEYFRAME_EVENTS.UPDATED, (data) => {
        this.emit('track_keyframe_updated', { objectUuid, property, ...data });
      });
      trackData.addEventListener(KEYFRAME_EVENTS.MOVED, (data) => {
        this.emit('track_keyframe_moved', { objectUuid, property, ...data });
      });
    }
    return objectTracks.get(property);
  }

  // 트랙 삭제
  removeTrack(objectUuid, property) {
    const objectTracks = this.tracks.get(objectUuid);
    if (objectTracks) {
      objectTracks.delete(property);
      if (objectTracks.size === 0) {
        this.tracks.delete(objectUuid);
      }
      this.dirty = true;
    }
  }

  // 최대 시간 업데이트
  updateMaxTime(time) {
    this.maxTime = Math.max(this.maxTime, time);
    this.dirty = true;
  }

  // 애니메이션 데이터 사전 계산
  precomputeAnimationData() {
    if (!this.dirty) return;

    this.precomputedData = new Map();

    // 더 큰 시간 범위를 위해 여유분 추가 (10% 여유)
    const safetyMargin = 1.1;
    const totalFrames = Math.ceil(this.maxTime * this.frameRate * safetyMargin);

    console.log("=== precomputeAnimationData 디버깅 ===");
    console.log("maxTime:", this.maxTime);
    console.log("frameRate:", this.frameRate);
    console.log("계산된 totalFrames:", totalFrames);
    console.log("실제 최대 프레임 인덱스:", totalFrames - 1);

    this.tracks.forEach((objectTracks, objectUuid) => {
      console.log("TimelineCore- precomputeAnimationData");
      console.log(objectTracks);
      console.log(objectUuid);
      const objectData = new Map();
      objectTracks.forEach((trackData, property) => {
        console.log(`=== precomputeAnimationData - ${objectUuid}.${property} ===`);
        console.log(`키프레임 개수: ${trackData.keyframeCount}`);
        console.log(`시간 배열: ${Array.from(trackData.times.slice(0, trackData.keyframeCount))}`);
        console.log(`값 배열: ${Array.from(trackData.values.slice(0, trackData.keyframeCount * 3))}`);

        const frames = new Float32Array(totalFrames * 3);

        // 초기값 설정 (모든 프레임을 0으로 초기화)
        for (let i = 0; i < totalFrames * 3; i++) {
          frames[i] = 0;
        }

        for (let frame = 0; frame < totalFrames; frame++) {
          const time = frame / this.frameRate;
          const value = trackData.getValueAtTime(time);
          if (value) {
            frames[frame * 3] = value.x;
            frames[frame * 3 + 1] = value.y;
            frames[frame * 3 + 2] = value.z;
          }
        }
        objectData.set(property, frames);
      });
      this.precomputedData.set(objectUuid, objectData);
    });

    this.dirty = false;
    console.log("precomputeAnimationData 완료");
  }

  // JSON 형식으로 변환
  toJSON() {
    const data = {
      tracks: {},
      maxTime: this.maxTime,
      frameRate: this.frameRate
    };

    this.tracks.forEach((objectTracks, objectUuid) => {
      data.tracks[objectUuid] = {};
      objectTracks.forEach((trackData, property) => {
        data.tracks[objectUuid][property] = {
          times: Array.from(trackData.times.slice(0, trackData.keyframeCount)),
          values: Array.from(trackData.values.slice(0, trackData.keyframeCount * 3)),
          interpolations: Array.from(trackData.interpolations.slice(0, trackData.keyframeCount))
        };
      });
    });

    console.log("toJSON");
    console.log(data);
    return data;
  }

  // JSON 형식으로 부터 데이터 로드     
  fromJSON(data) {
    console.log("=== TimelineCore fromJSON 시작 ===");
    console.log("받은 데이터:", data);

    this.tracks.clear();
    this.maxTime = data.maxTime || 0;
    this.frameRate = data.frameRate || 30;

    // tracks가 Map인지 일반 객체인지 확인
    let tracksData;
    if (data.tracks instanceof Map) {
      tracksData = data.tracks;
    } else if (typeof data.tracks === 'object' && data.tracks !== null) {
      // 일반 객체를 Map으로 변환
      tracksData = new Map(Object.entries(data.tracks));
    } else {
      console.warn("tracks 데이터가 없거나 잘못된 형식입니다:", data.tracks);
      tracksData = new Map();
    }

    console.log("처리할 tracks 데이터:", tracksData);

    tracksData.forEach((properties, objectUuid) => {
      console.log(`객체 ${objectUuid} 처리 중:`, properties);

      // properties가 Map인지 일반 객체인지 확인
      let propertiesData;
      if (properties instanceof Map) {
        propertiesData = properties;
      } else if (typeof properties === 'object' && properties !== null) {
        propertiesData = new Map(Object.entries(properties));
      } else {
        console.warn(`객체 ${objectUuid}의 properties가 잘못된 형식입니다:`, properties);
        return;
      }

      propertiesData.forEach((trackData, property) => {
        console.log(`속성 ${property} 처리 중:`, trackData);

        const track = this.addTrack(objectUuid, property);

        if (trackData.times && Array.isArray(trackData.times)) {
          trackData.times.forEach((time, index) => {
            if (trackData.values && trackData.values.length >= (index * 3 + 2)) {
              const value = new THREE.Vector3(
                trackData.values[index * 3] || 0,
                trackData.values[index * 3 + 1] || 0,
                trackData.values[index * 3 + 2] || 0
              );
              const interpolation = trackData.interpolations && trackData.interpolations[index]
                ? trackData.interpolations[index]
                : INTERPOLATION.LINEAR;
              track.addKeyframe(time, value, interpolation);
            }
          });
        }
      });
    });

    this.dirty = true;
    console.log("=== TimelineCore fromJSON 완료 ===");
  }

  // 타임라인 데이터 검증
  validate() {
    const errors = [];

    this.tracks.forEach((objectTracks, objectUuid) => {
      objectTracks.forEach((trackData, property) => {
        const validation = trackData.validate();
        if (!validation.isValid) {
          errors.push(`트랙 ${objectUuid}.${property}: ${validation.errors.join(', ')}`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 타임라인 데이터 복사
  clone() {
    const cloned = new TimelineData();
    cloned.maxTime = this.maxTime;
    cloned.frameRate = this.frameRate;
    cloned.dirty = this.dirty;

    this.tracks.forEach((objectTracks, objectUuid) => {
      objectTracks.forEach((trackData, property) => {
        const clonedTrack = cloned.addTrack(objectUuid, property);
        // 트랙 데이터 복사
        clonedTrack.keyframeCount = trackData.keyframeCount;
        clonedTrack.times.set(trackData.times.slice(0, trackData.keyframeCount));
        clonedTrack.values.set(trackData.values.slice(0, trackData.keyframeCount * 3));
        clonedTrack.interpolations.set(trackData.interpolations.slice(0, trackData.keyframeCount));
      });
    });

    return cloned;
  }
}

// 타임라인 코어 클래스
class TimelineCore {
  constructor(options) {
    this.options = options;
    this.tracks = new Map();
    this.container = options.container;
  }

  // 트랙 추가
  addTrack(type, objectId, objectName, extraOptions = {}) {
    const track = {
      type,
      objectId,
      objectName,
      element: document.createElement("div"),
      keyframes: new Map(),
      ...extraOptions,
    };
    track.element.className = "timeline-track";
    track.element.dataset.objectId = objectId;
    track.element.innerHTML = `
        <div class="track-label">${objectName}</div>
        <div class="clips-container"></div>
      `;
    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);
    return track;
  }

  // 클립 추가
  addClip(track, options = {}) {
    const clip = document.createElement("div");
    clip.className = "animation-sprite";
    clip.style.position = "absolute";
    clip.style.left = (options.left || 0) + "px";
    clip.style.width = (options.width || 100) + "px";
    clip.style.height = "30px";
    clip.style.background = "#6cf";
    clip.style.border = "1px solid #39c";
    clip.style.borderRadius = "4px";
    clip.style.cursor = "pointer";
    clip.style.top = "0px";
    clip.innerHTML = `
        <div class="keyframe-layer"></div>
        <div class="sprite-handle left" style="position:absolute;left:0;top:0;width:6px;height:100%;cursor:w-resize;background:#39c;opacity:0.5;"></div>
        <div class="sprite-handle right" style="position:absolute;right:0;top:0;width:6px;height:100%;cursor:e-resize;background:#39c;opacity:0.5;"></div>
      `;
    // clips-container에 추가
    const clipsContainer = track.element.querySelector(".clips-container");
    clipsContainer.appendChild(clip);
    this.bindClipEvents(clip, track);
    return clip;
  }

  // 키프레임 추가 (인덱스 기반)
  addKeyframeByIndex(clip, index, options = {}) {
    const keyframe = document.createElement("div");
    keyframe.className = "keyframe";
    keyframe.style.position = "absolute";
    keyframe.style.top = "8px";
    keyframe.style.width = "10px";
    keyframe.style.height = "14px";
    keyframe.style.background = "#f90";
    keyframe.style.border = "1px solid #c60";
    keyframe.style.borderRadius = "50%";
    keyframe.style.cursor = "pointer";
    keyframe.style.left = (options.left || 10) + "px";
    keyframe.dataset.index = index;
    keyframe.dataset.time = options.time || 0;
    keyframe.dataset.x = options.x || 0;
    keyframe.dataset.y = options.y || 0;
    keyframe.dataset.z = options.z || 0;

    // keyframe-layer에 추가
    const keyframeLayer = clip.querySelector(".keyframe-layer");
    keyframeLayer.appendChild(keyframe);
    this.bindKeyframeEvents(keyframe, clip);
    return keyframe;
  }

  // 키프레임 추가 (기존 메서드 - 하위 호환성)
  addKeyframe(clip, options = {}) {
    return this.addKeyframeByIndex(clip, options.index || 0, options);
  }

  // 키프레임 삭제 (인덱스 기반)
  removeKeyframeByIndex(clip, index) {
    const keyframeLayer = clip.querySelector(".keyframe-layer");
    const keyframes = keyframeLayer.querySelectorAll(".keyframe");

    for (let keyframe of keyframes) {
      if (parseInt(keyframe.dataset.index) === index) {
        keyframe.remove();
        return true;
      }
    }
    return false;
  }

  // 키프레임 삭제 (시간 기반)
  removeKeyframeByTime(clip, time) {
    const keyframeLayer = clip.querySelector(".keyframe-layer");
    const keyframes = keyframeLayer.querySelectorAll(".keyframe");

    for (let keyframe of keyframes) {
      if (Math.abs(parseFloat(keyframe.dataset.time) - time) < 0.001) {
        keyframe.remove();
        return true;
      }
    }
    return false;
  }

  // 키프레임 가져오기 (인덱스 기반)
  getKeyframeByIndex(clip, index) {
    const keyframeLayer = clip.querySelector(".keyframe-layer");
    const keyframes = keyframeLayer.querySelectorAll(".keyframe");

    for (let keyframe of keyframes) {
      if (parseInt(keyframe.dataset.index) === index) {
        return {
          element: keyframe,
          index: parseInt(keyframe.dataset.index),
          time: parseFloat(keyframe.dataset.time),
          x: parseFloat(keyframe.dataset.x),
          y: parseFloat(keyframe.dataset.y),
          z: parseFloat(keyframe.dataset.z)
        };
      }
    }
    return null;
  }

  // 모든 키프레임 가져오기
  getAllKeyframes(clip) {
    const keyframeLayer = clip.querySelector(".keyframe-layer");
    const keyframes = keyframeLayer.querySelectorAll(".keyframe");
    const result = [];

    for (let keyframe of keyframes) {
      result.push({
        element: keyframe,
        index: parseInt(keyframe.dataset.index),
        time: parseFloat(keyframe.dataset.time),
        x: parseFloat(keyframe.dataset.x),
        y: parseFloat(keyframe.dataset.y),
        z: parseFloat(keyframe.dataset.z)
      });
    }

    // 인덱스 순으로 정렬
    result.sort((a, b) => a.index - b.index);
    return result;
  }

  // 키프레임 개수 가져오기
  getKeyframeCount(clip) {
    const keyframeLayer = clip.querySelector(".keyframe-layer");
    return keyframeLayer.querySelectorAll(".keyframe").length;
  }

  // 키프레임 업데이트 (인덱스 기반)
  updateKeyframeByIndex(clip, index, options = {}) {
    const keyframe = this.getKeyframeByIndex(clip, index);
    if (!keyframe) return false;

    if (options.time !== undefined) {
      keyframe.element.dataset.time = options.time;
      keyframe.element.style.left = (options.left || keyframe.element.style.left) + "px";
    }
    if (options.x !== undefined) keyframe.element.dataset.x = options.x;
    if (options.y !== undefined) keyframe.element.dataset.y = options.y;
    if (options.z !== undefined) keyframe.element.dataset.z = options.z;

    return true;
  }

  // 클립 이벤트 바인딩
  bindClipEvents(clip, track) {
    // 타입별로 오버라이드
  }

  bindKeyframeEvents(keyframe, clip) {
    // 타입별로 오버라이드
  }
}

export default TimelineCore;
