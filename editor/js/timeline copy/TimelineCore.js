// editor/js/timeline/TimelineCore.js
import * as THREE from "three";

// 타임라인 상수 정의
export const INTERPOLATION = {
  LINEAR: 0,
  BEZIER: 1,
  STEP: 2
};
// 최대 키프레임 수
const MAX_FRAMES = 3600; // 60fps * 60초

// 트랙 데이터 클래스
export class TrackData {
  constructor() {
    this.keyframes = new Float32Array(MAX_FRAMES * 3); // position/rotation/scale 데이터
    this.times = new Float32Array(MAX_FRAMES); // 키프레임 시간
    this.values = new Float32Array(MAX_FRAMES * 3); // 키프레임 값
    this.interpolations = new Uint8Array(MAX_FRAMES); // 보간 타입
    this.keyframeCount = 0;
    this.dirty = true; // 프리컴파일 필요 여부
  }

  // 키프레임 추가
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

    if (this.keyframeCount >= MAX_FRAMES) {
      console.error('Maximum number of keyframes reached');
      return false;
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
    return true;
  }
  // 키프레임 삭제 (인덱스 기반)
  removeKeyframeByIndex(index) {
    if (index < 0 || index >= this.keyframeCount) return false;

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
    // 버블 정렬로 키프레임 시간순 정렬
    for (let i = 0; i < this.keyframeCount - 1; i++) {
      for (let j = 0; j < this.keyframeCount - i - 1; j++) {
        if (this.times[j] > this.times[j + 1]) {
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
        // 베지어 보간 구현
        const p0 = prevValue;
        const p3 = nextValue;
        const p1 = new THREE.Vector3(
          this.values[prevIndex * 3 + 3],
          this.values[prevIndex * 3 + 4],
          this.values[prevIndex * 3 + 5]
        );
        const p2 = new THREE.Vector3(
          this.values[nextIndex * 3 - 3],
          this.values[nextIndex * 3 - 2],
          this.values[nextIndex * 3 - 1]
        );
        return this.bezierInterpolate(p0, p1, p2, p3, t);
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
}

// 타임라인 데이터 클래스
export class TimelineData {
  constructor() {
    this.tracks = new Map(); // objectUuid -> Map(property -> TrackData)
    this.maxTime = 0;
    this.frameRate = 30;
    this.precomputedData = null;
    this.dirty = true; // 프리컴파일 필요 여부
  }
  // 트랙 추가
  addTrack(objectUuid, property) {
    if (!this.tracks.has(objectUuid)) {
      this.tracks.set(objectUuid, new Map());
    }
    const objectTracks = this.tracks.get(objectUuid);
    if (!objectTracks.has(property)) {
      objectTracks.set(property, new TrackData());
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
    this.tracks.clear();
    this.maxTime = data.maxTime;
    this.frameRate = data.frameRate;

    Object.entries(data.tracks).forEach(([objectUuid, properties]) => {
      Object.entries(properties).forEach(([property, trackData]) => {
        const track = this.addTrack(objectUuid, property);
        trackData.times.forEach((time, index) => {
          const value = new THREE.Vector3(
            trackData.values[index * 3],
            trackData.values[index * 3 + 1],
            trackData.values[index * 3 + 2]
          );
          track.addKeyframe(time, value, trackData.interpolations[index]);
        });
      });
    });

    this.dirty = true;
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
