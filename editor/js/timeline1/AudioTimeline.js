import { BaseTimeline } from "./BaseTimeline.js";
// editor/timeline/AudioTimeline.js
class AudioTimeline extends BaseTimeline {
  constructor(editor, options) {
    super(editor, options);
    this.initAudioTracks();
  }

  initAudioTracks() {
    // 오디오 관련 트랙 추가
    this.addTrack("audio", {
      name: "Audio Track",
      properties: ["volume"],
      interpolation: "linear",
      waveform: true,
    });
  }

  // 오디오 파형 표시 등 특수 기능
  showWaveform(audioData) {}
}
export { AudioTimeline };
