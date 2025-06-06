// editor/js/timeline/TimelineCore.js
class TimelineCore {
  constructor(options) {
    this.options = options;
    this.tracks = new Map();
    this.container = options.container;
  }

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

  bindClipEvents(clip, track) {
    // 타입별로 오버라이드
  }

  bindKeyframeEvents(keyframe, clip) {
    // 타입별로 오버라이드
  }
}

export default TimelineCore;
