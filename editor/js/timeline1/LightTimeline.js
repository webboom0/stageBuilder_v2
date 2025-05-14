import { BaseTimeline } from "./BaseTimeline.js";
// editor/timeline/LightTimeline.js
class LightTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.initLightTracks();
  }

  initLightTracks() {
    // 조명 관련 트랙 추가
    this.addTrack("intensity", {
      name: "Intensity",
      properties: ["value"],
      interpolation: "linear",
    });

    this.addTrack("color", {
      name: "Color",
      properties: ["r", "g", "b"],
      interpolation: "linear",
    });

    this.addTrack("visibility", {
      name: "Visibility",
      properties: ["visible"],
      interpolation: "step",
    });
  }
}
export { LightTimeline };
