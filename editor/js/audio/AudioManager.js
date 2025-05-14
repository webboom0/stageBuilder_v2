// editor/audio/AudioManager.js
class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.tracks = scene.userData.audio.tracks;
  }

  addTrack(audioData) {
    const track = {
      id: this.tracks.length + 1,
      data: audioData,
      startTime: 0,
      duration: audioData.duration,
    };
    this.tracks.push(track);
    return track;
  }
}

export default AudioManager;
