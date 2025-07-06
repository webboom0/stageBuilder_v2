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
    this.ids = new Array(MAX_FRAMES); // 키프레임 고유 ID
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

    const index = this.keyframeCount;
    this.times[index] = time;
    this.values[index * 3] = value.x;
    this.values[index * 3 + 1] = value.y;
    this.values[index * 3 + 2] = value.z;
    this.interpolations[index] = interpolation;

    // 고유 ID 생성
    const keyframeId = crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '_' + Math.random());
    this.ids[index] = keyframeId;

    this.keyframeCount++;
    this.dirty = true;

    this.sortKeyframes();
    return keyframeId; // ID 반환
  }
  // 키프레임 삭제
  removeKeyframe(time) {
    const index = this.findKeyframeIndex(time);
    if (index === -1) return false;

    // 마지막 키프레임을 현재 위치로 이동
    if (index < this.keyframeCount - 1) {
      this.times[index] = this.times[this.keyframeCount - 1];
      this.values[index * 3] = this.values[(this.keyframeCount - 1) * 3];
      this.values[index * 3 + 1] = this.values[(this.keyframeCount - 1) * 3 + 1];
      this.values[index * 3 + 2] = this.values[(this.keyframeCount - 1) * 3 + 2];
      this.interpolations[index] = this.interpolations[this.keyframeCount - 1];
      this.ids[index] = this.ids[this.keyframeCount - 1];
    }

    this.keyframeCount--;
    this.dirty = true;
    this.sortKeyframes();
    return true;
  }

  // ID로 키프레임 삭제
  removeKeyframeById(keyframeId) {
    const index = this.ids.findIndex(id => id === keyframeId);
    if (index === -1) return false;

    // 마지막 키프레임을 현재 위치로 이동
    if (index < this.keyframeCount - 1) {
      this.times[index] = this.times[this.keyframeCount - 1];
      this.values[index * 3] = this.values[(this.keyframeCount - 1) * 3];
      this.values[index * 3 + 1] = this.values[(this.keyframeCount - 1) * 3 + 1];
      this.values[index * 3 + 2] = this.values[(this.keyframeCount - 1) * 3 + 2];
      this.interpolations[index] = this.interpolations[this.keyframeCount - 1];
      this.ids[index] = this.ids[this.keyframeCount - 1];
    }

    this.keyframeCount--;
    this.dirty = true;
    this.sortKeyframes();
    return true;
  }

  // 키프레임 인덱스 찾기
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

          // ID 교환
          [this.ids[j], this.ids[j + 1]] = [this.ids[j + 1], this.ids[j]];
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

  // 기존 ID를 사용하여 키프레임 추가
  addKeyframeWithId(time, value, interpolation = INTERPOLATION.LINEAR, keyframeId) {
    if (!value || typeof value.x === 'undefined' || typeof value.y === 'undefined' || typeof value.z === 'undefined') {
      console.error('Invalid value for keyframe');
      return false;
    }

    if (this.keyframeCount >= MAX_FRAMES) {
      console.error('Maximum number of keyframes reached');
      return false;
    }

    const index = this.keyframeCount;
    this.times[index] = time;
    this.values[index * 3] = value.x;
    this.values[index * 3 + 1] = value.y;
    this.values[index * 3 + 2] = value.z;
    this.interpolations[index] = interpolation;
    this.ids[index] = keyframeId;

    this.keyframeCount++;
    this.dirty = true;

    this.sortKeyframes();
    return keyframeId;
  }

  // ID로 키프레임 시간 업데이트
  updateKeyframeTimeById(keyframeId, newTime) {
    const index = this.ids.findIndex(id => id === keyframeId);
    if (index === -1) return false;

    this.times[index] = newTime;
    this.dirty = true;
    this.sortKeyframes();
    return true;
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
    const totalFrames = Math.ceil(this.maxTime * this.frameRate);

    this.tracks.forEach((objectTracks, objectUuid) => {
      const objectData = new Map();
      objectTracks.forEach((trackData, property) => {
        const frames = new Float32Array(totalFrames * 3);
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
          interpolations: Array.from(trackData.interpolations.slice(0, trackData.keyframeCount)),
          ids: Array.from(trackData.ids.slice(0, trackData.keyframeCount))
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
          const interpolation = trackData.interpolations[index];
          const keyframeId = trackData.ids ? trackData.ids[index] : null;

          if (keyframeId) {
            // 기존 ID가 있으면 그대로 사용
            track.addKeyframeWithId(time, value, interpolation, keyframeId);
          } else {
            // 기존 ID가 없으면 새로 생성
            track.addKeyframe(time, value, interpolation);
          }
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
  // 키프레임 추가
  addKeyframe(clip, options = {}) {
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
  // 클립 이벤트 바인딩
  bindClipEvents(clip, track) {
    // 타입별로 오버라이드
  }

  bindKeyframeEvents(keyframe, clip) {
    // 타입별로 오버라이드
  }
}

export default TimelineCore;
