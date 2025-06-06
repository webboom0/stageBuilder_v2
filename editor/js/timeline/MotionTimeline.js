import { BaseTimeline } from "./BaseTimeline.js";
import { UIPanel, UIRow, UINumber, UIText } from "../libs/ui.js";
import * as THREE from "three";

export class MotionTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.selectedObject = null;
    this.selectedProperty = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.selectedKeyframe = null;
    this.selectedSprite = null;
    this.initMotionTracks();
    this.bindEvents();
    this.timeline = this.editor.scene.userData.timeline || {};
    // 속성 편집 패널 생성
    this.propertyPanel = this.createPropertyPanel();
    this.container.appendChild(this.propertyPanel.dom);
    document
      .querySelector("#keyframe-property-panel")
      .appendChild(this.propertyPanel.dom);
      let stageGroup = this.editor.scene.children.find(
        (child) => child.name === "Stage"
      );
  
      if (!stageGroup) {
        stageGroup = new THREE.Group();
        stageGroup.name = "Stage";
        this.editor.scene.add(stageGroup);
      }
  
    // 비디오 배경 생성}
    this.createVideoBackground(stageGroup);

  }
  initMotionTracks() {
    // 위치, 회전, 스케일 트랙 추가
    // 필요 시 주석 해제
  }

  bindEvents() {
    this.container.addEventListener("click", (e) => {
      const track = e.target.closest(".timeline-track");
      if (!track) return;

      const objectId = track.dataset.objectId;
      const currentFrame = this.currentFrame;
      if (e.target.classList.contains("add-keyframe-btn")) {
        this.addKeyframe(objectId, currentFrame);
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

  addKeyframe(objectId, frame) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const object =  this.editor.scene.getObjectById(parseInt(objectId));
    ;
    if (!object) return;

    const selectedSprite = track.element.querySelector(
      ".animation-sprite.selected"
    );
    if (!selectedSprite) return;

    const sprite =
      selectedSprite || track.element.querySelector(".animation-sprite");

    const timelineTracks = document.querySelector(".timeline-track");
    const playhead = document.querySelector(".playhead");

    if (!timelineTracks) return;

    const timelineRect = timelineTracks.getBoundingClientRect();
    const playheadRect = playhead.getBoundingClientRect();
    const spriteRect = sprite.getBoundingClientRect();

    if (
      playheadRect.left < spriteRect.left ||
      playheadRect.left > spriteRect.right
    ) {
      return;
    }

    const relativePlayheadPosition = playheadRect.left - spriteRect.left;

    const spriteWidth = spriteRect.width;
    const clipDuration = parseFloat(sprite.dataset.duration) || 0;
    const timeInSeconds =
      (relativePlayheadPosition / spriteWidth) * clipDuration;

    const keyframeElement = document.createElement("div");
    keyframeElement.className = "keyframe";
    keyframeElement.style.left = `${relativePlayheadPosition}px`;
    keyframeElement.dataset.time = timeInSeconds.toString();
    keyframeElement.dataset.pixelPosition = relativePlayheadPosition.toString();
    keyframeElement.dataset.frame = frame;

    const position = [
      object.position.x.toFixed(3),
      object.position.y.toFixed(3),
      object.position.z.toFixed(3),
    ];
    keyframeElement.dataset.position = JSON.stringify(position);

    keyframeElement.style.left = `${keyframeElement.dataset.pixelPosition}px`;

    keyframeElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectKeyframe(objectId, frame, keyframeElement);
    });

    let keyframeLayer = sprite.querySelector(".keyframe-layer");
    if (!keyframeLayer) {
      keyframeLayer = document.createElement("div");
      keyframeLayer.className = "keyframe-layer";
      sprite.appendChild(keyframeLayer);
    }

    keyframeLayer.appendChild(keyframeElement);

    this.makeKeyframeDraggable(keyframeElement, track, frame, object);

    this.updateAnimation(objectId);

    this.selectKeyframe(objectId, frame, keyframeElement);

    return keyframeElement;
  }

  makeKeyframeDraggable(keyframeElement, track, frame, object) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;

    keyframeElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseFloat(keyframeElement.style.left) || 0;
      e.stopPropagation();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const clipElement = keyframeElement.closest(".animation-sprite");
      if (!clipElement) return;

      const clipWidth = clipElement.offsetWidth;
      const clipDuration = parseFloat(clipElement.dataset.duration);

      const newLeft = Math.max(0, Math.min(clipWidth, startLeft + dx));

      const newTimeInSeconds = (newLeft / clipWidth) * clipDuration;

      const deleteThreshold = 50;
      if (dy > deleteThreshold) {
        keyframeElement.remove();
        if (track && track.keyframes) {
          delete track.keyframes[frame];
        }
        isDragging = false;
        return;
      }

      keyframeElement.style.left = `${newLeft}px`;
      keyframeElement.dataset.time = newTimeInSeconds.toFixed(2);
      keyframeElement.dataset.pixelPosition = newLeft.toString();

      if (track.keyframes) {
        const keyframeData = track.keyframes[frame];
        if (keyframeData) {
          keyframeData.time = newTimeInSeconds;
        }
      }

      if (this.editor.signals?.timelineKeyframeChanged) {
        this.editor.signals.timelineKeyframeChanged.dispatch({
          track,
          frame,
          time: newTimeInSeconds,
        });
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  updateAnimation(objectId) {
    const track = this.tracks.get(objectId);
    if (!track) return;

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (!object) return;

    const clipElement = track.element?.querySelector(".animation-sprite");
    if (!clipElement) return;

    const clipStartTime = parseFloat(clipElement.dataset.startTime || "0");
    const currentRelativeTime = this.currentTime - clipStartTime;

    if (track.keyframes.position) {
      const keyframes = Array.from(track.keyframes.position.entries()).sort(
        ([a], [b]) => parseFloat(a) - parseFloat(b)
      );

      let prevKeyframe = null;
      let nextKeyframe = null;

      for (let i = 0; i < keyframes.length; i++) {
        const [frame, data] = keyframes[i];
        if (data.time <= currentRelativeTime) {
          prevKeyframe = { frame: parseInt(frame), data };
        } else {
          nextKeyframe = { frame: parseInt(frame), data };
          break;
        }
      }

      if (prevKeyframe && nextKeyframe) {
        const alpha =
          (currentRelativeTime - prevKeyframe.data.time) /
          (nextKeyframe.data.time - prevKeyframe.data.time);

        object.position.set(
          this.lerp(
            prevKeyframe.data.value.x,
            nextKeyframe.data.value.x,
            alpha
          ),
          this.lerp(
            prevKeyframe.data.value.y,
            nextKeyframe.data.value.y,
            alpha
          ),
          this.lerp(prevKeyframe.data.value.z, nextKeyframe.data.value.z, alpha)
        );
      } else if (prevKeyframe) {
        object.position.set(
          prevKeyframe.data.value.x,
          prevKeyframe.data.value.y,
          prevKeyframe.data.value.z
        );
      }
    }

    if (this.editor.signals?.objectChanged) {
      this.editor.signals.objectChanged.dispatch(object);
    }
  }

  play() {
    this.isPlaying = true;
    this.animate();
  }

  pause() {
    this.isPlaying = false;
  }

  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.updateAnimation();
  }

  animate() {
    if (!this.isPlaying) return;

    this.currentTime += 1 / 60;
    if (this.currentTime >= this.options.totalSeconds) {
      this.currentTime = 0;
    }

    this.tracks.forEach((track, objectId) => {
      this.updateAnimation(objectId);
    });

    requestAnimationFrame(() => this.animate());
  }

  lerp(start, end, alpha) {
    return start + (end - start) * alpha;
  }

  selectKeyframe(objectId, frame, keyframeElement) {
    console.log("selectKeyframe");
    const previousSelected =  document.querySelector(".keyframe.selected");
    if (previousSelected) {
      previousSelected.classList.remove("selected");
    }

    keyframeElement.classList.add("selected");
    const track = this.tracks.get(objectId);
    console.log(track);
    if (!track || !track.keyframes) return;
    console.log(track);
    // const keyframeData = track.keyframes["position"]?.get(frame.toString());
    // if (!keyframeData) return;

    this.selectedKeyframe = {
      objectId,
      frame,
      element: keyframeElement,
      // data: keyframeData,
    };

    this.updatePropertyPanel();
  }

  updateFrame(frame) {
    const currentTime = frame / this.options.framesPerSecond;

    this.tracks.forEach((track, objectId) => {
      const object = this.editor.scene.getObjectById(parseInt(objectId));
      if (!object) return;

      object.visible = false;

      const clips = track.element.querySelectorAll(".animation-sprite");
      clips.forEach((clip) => {
        const clipLeft = parseFloat(clip.style.left) || 0;
        const clipWidth = parseFloat(clip.style.width) || 0;
        const clipStartTime = (clipLeft / 100) * this.options.totalSeconds;
        const clipEndTime =
          clipStartTime + (clipWidth / 100) * this.options.totalSeconds;

        if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
          object.visible = true;
          let hasChanges = false;

          ["position"].forEach((propertyType) => {
            const keyframes = track.keyframes[propertyType];
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
              this.interpolateProperty(
                object,
                propertyType,
                prevKeyframe,
                nextKeyframe,
                alpha
              );
              hasChanges = true;
            } else if (prevKeyframe) {
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
      if (!this.selectedKeyframe?.data?.data?.position) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      this.selectedKeyframe.data.data.position.x = numValue;

      const object = this.editor.scene.getObjectById(
        parseInt(this.selectedKeyframe.objectId)
      );
      if (object) {
        object.position.x = numValue;
        if (this.editor.signals?.objectChanged) this.editor.signals.objectChanged.dispatch(object);
      }
    });

    posY.onChange((value) => {
      if (!this.selectedKeyframe?.data?.data?.position) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      this.selectedKeyframe.data.data.position.y = numValue;

      const object = this.editor.scene.getObjectById(
        parseInt(this.selectedKeyframe.objectId)
      );
      if (object) {
        object.position.y = numValue;
        if (this.editor.signals?.objectChanged) this.editor.signals.objectChanged.dispatch(object);
      }
    });

    posZ.onChange((value) => {
      if (!this.selectedKeyframe?.data?.data?.position) return;

      const numValue = Number(value);
      if (isNaN(numValue)) return;

      this.selectedKeyframe.data.data.position.z = numValue;

      const object = this.editor.scene.getObjectById(
        parseInt(this.selectedKeyframe.objectId)
      );
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
    // if (!this.selectedKeyframe?.data?.value || !this.propertyPanel) return;
    // const position = this.selectedKeyframe.data.data.position;
    const position = JSON.parse(this.selectedKeyframe.element.dataset.position);
    const xInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="x"]'
    );
    const yInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="y"]'
    );
    const zInput = this.propertyPanel.dom.querySelector(
      '.position-row input[data-axis="z"]'
    );

    if (xInput) xInput.value = position[0].toString();
    if (yInput) yInput.value = position[1].toString();
    if (zInput) zInput.value = position[2].toString();
  }

  addTrack(objectUuid, objectId, objectName) {
    if (this.tracks.has(objectId)) return;

    const track = {
      element: document.createElement("div"),
      keyframes: new Map(),
      objectId: objectId,
      objectName: objectName,
      objectUuid: objectUuid,
    };
    track.element.className = "timeline-track";
    track.element.dataset.objectId = objectId;

    const trackTopArea = document.createElement("div");
    trackTopArea.className = "motion-tracks";

    trackTopArea.dataset.uuid = objectUuid;
    trackTopArea.dataset.objectId = objectId;
    trackTopArea.dataset.objectName = objectName;

    const trackHeader = document.createElement("div");
    trackHeader.className = "track-header";
    trackHeader.innerHTML = `
      <div class="track-info">
        <span class="track-name">${
          typeof objectName === "object"
            ? objectName.name || "Object"
            : objectName
        }</span>
      </div>
      <div class="track-controls">
        <button class="prev-keyframe-btn" title="Previous Keyframe"><i class="fa fa-step-backward"></i></button>
        <button class="add-keyframe-btn" title="Add Keyframe">+</button>
        <button class="next-keyframe-btn" title="Next Keyframe"><i class="fa fa-step-forward"></i></button>
      </div>
    `;
    trackTopArea.appendChild(trackHeader);

    const object = this.editor.scene.getObjectById(parseInt(objectId));
    if (object && object.animations) {
      const animationDuration = object.animations[0]?.duration || 0;
      const totalFrames = Math.floor(
        animationDuration * this.options.framesPerSecond
      );

      const trackContent = document.createElement("div");
      trackContent.className = "track-content";

      const sprite = document.createElement("div");
      sprite.className = "animation-sprite selected";
      sprite.dataset.duration = animationDuration;
      sprite.innerHTML = `
        <div class="sprite-handle left"></div>
        <div class="sprite-content">
          <span class="sprite-name">${
            object.animations[0]?.name || "Animation"
          }</span>
        </div>
        <div class="sprite-handle right"></div>
      `;

      const spriteWidth =
        (totalFrames /
          (this.options.totalSeconds * this.options.framesPerSecond)) *
        100;
      sprite.style.width = `${spriteWidth}%`;
      sprite.style.left = "0%";

      trackContent.appendChild(sprite);
      trackTopArea.appendChild(trackContent);

      this.bindSpriteEvents(sprite, track);

      const keyframes = sprite.querySelectorAll(".keyframe");
      keyframes.forEach((keyframe) => {
        const frame = parseInt(keyframe.dataset.frame);
        this.makeKeyframeDraggable(keyframe, track, frame, object);
      });
    }

    track.element.appendChild(trackTopArea);

    this.tracks.set(objectId, track);
    this.container.appendChild(track.element);

    this.bindTrackEvents(track);

    return track;
  }

  bindSpriteEvents(sprite, track) {
    let isDragging = false;
    let isResizing = false;
    let startX;
    let startLeft;
    let startWidth;
    let resizeHandle;

    sprite.addEventListener("mousedown", (e) => {
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
      e.stopPropagation();
    });

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

    document.addEventListener("mousemove", (e) => {
      if (!isDragging && !isResizing) return;
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
            this.updateKeyframesInClip(track, sprite);
          }
        } else {
          const newWidth = Math.max(
            10,
            Math.min(startWidth + deltaPercent, 100 - startLeft)
          );
          if (!this.checkClipCollision(sprite, startLeft, newWidth)) {
            sprite.style.width = `${newWidth}%`;
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
          this.updateKeyframesInClip(track, sprite);
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        if (track.objectId) {
          this.updateAnimation(track.objectId);
        }
      }
    });

    sprite.addEventListener("click", (e) => {
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

    keyframes.forEach((keyframe) => {
      const pixelPosition = parseFloat(keyframe.dataset.pixelPosition);

      if (pixelPosition < 0 || pixelPosition > spriteWidth) {
        keyframe.remove();

        const frame = parseInt(keyframe.dataset.frame);
        if (track.keyframes && track.keyframes[frame]) {
          delete track.keyframes[frame];
        }

        return;
      }

      const frame = Math.round(
        (pixelPosition / spriteWidth) *
          this.options.totalSeconds *
          this.options.framesPerSecond
      );
      keyframe.dataset.frame = frame.toString();

      if (track.keyframes && track.keyframes[frame]) {
        track.keyframes[frame].time = frame / this.options.framesPerSecond;
      }
    });
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
    stagePlane.position.set(0, 79.100, -74.039);
    stagePlane.scale.set(1, 0.639, 1);
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
            } catch (error) {}
          };
          document.addEventListener("click", playVideo);
        }
      } catch (error) {}
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

    const { objectId, frame, element } = this.selectedKeyframe;
    const track = this.tracks.get(objectId);

    if (!track || !track.keyframes) return;

    track.keyframes.delete(frame);

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

    const sortedKeyframes = keyframeElements.sort((a, b) => {
      return parseInt(a.dataset.frame) - parseInt(b.dataset.frame);
    });

    const currentIndex = sortedKeyframes.indexOf(selectedKeyframe);

    if (direction === "prev" && currentIndex > 0) {
      const prevKeyframe = sortedKeyframes[currentIndex - 1];
      selectedKeyframe.classList.remove("selected");
      prevKeyframe.classList.add("selected");
      this.selectedKeyframe = prevKeyframe;
    } else if (
      direction === "next" &&
      currentIndex < sortedKeyframes.length - 1
    ) {
      const nextKeyframe = sortedKeyframes[currentIndex + 1];
      selectedKeyframe.classList.remove("selected");
      nextKeyframe.classList.add("selected");
      this.selectedKeyframe = nextKeyframe;
    }
  }
}

