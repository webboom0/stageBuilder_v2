// editor/js/timeline/RenderTimeline.js
import { UIPanel, UIRow, UINumber, UIText, UIButton } from "../libs/ui.js";
import * as THREE from "three";

export class RenderTimeline {
  constructor(editor, timelineData) {
    this.editor = editor;
    this.timelineData = timelineData;
    this.isRendering = false;
    this.renderWindow = null;
    this.renderCanvas = null;
    this.renderContext = null;
    this.currentFrame = 0;
    this.totalFrames = 0;
    this.fps = 30;
    this.totalSeconds = 180;
    
    // 렌더링 설정
    this.renderSettings = {
      width: 1920,
      height: 1080,
      quality: 'high', // 'low', 'medium', 'high'
      format: 'mp4', // 'mp4', 'webm', 'gif'
      frameRate: 30
    };

    // 원본 설정 백업
    this.originalSettings = { ...this.renderSettings };
    
    // 새 창용 씬과 렌더러
    this.previewScene = null;
    this.previewRenderer = null;
    this.previewCamera = null;
    
    this.init();
  }

  init() {
    // 타임라인 데이터에서 설정 가져오기
    if (this.timelineData) {
      this.fps = this.timelineData.framesPerSecond || 30;
      this.totalSeconds = this.timelineData.totalSeconds || 180;
      this.totalFrames = this.totalSeconds * this.fps;
    }
    
    console.log("RenderTimeline 초기화:", {
      fps: this.fps,
      totalSeconds: this.totalSeconds,
      totalFrames: this.totalFrames
    });
  }

  // 렌더링 창 열기
  openRenderWindow() {
    if (this.renderWindow && !this.renderWindow.closed) {
      this.renderWindow.focus();
      return;
    }

    // 새 창 열기
    this.renderWindow = window.open('', 'renderTimeline', 
      'width=1200,height=800,scrollbars=yes,resizable=yes,menubar=no,toolbar=no'
    );

    if (!this.renderWindow) {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      return;
    }

    this.createRenderUI();
    this.setupRenderCanvas();
    this.bindRenderEvents();
  }

  // 렌더링 UI 생성
  createRenderUI() {
    const doc = this.renderWindow.document;
    doc.title = '타임라인 렌더링';

    // CSS 스타일 추가
    const style = doc.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 20px;
        font-family: Arial, sans-serif;
        background: #1e1e1e;
        color: #fff;
      }
      
      .render-container {
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .render-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding: 15px;
        background: #2a2a2a;
        border-radius: 8px;
      }
      
      .render-title {
        font-size: 24px;
        font-weight: bold;
        color: #4CAF50;
      }
      
      .render-controls {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .render-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
      }
      
      .render-btn.primary {
        background: #4CAF50;
        color: white;
      }
      
      .render-btn.primary:hover {
        background: #45a049;
      }
      
      .render-btn.secondary {
        background: #666;
        color: white;
      }
      
      .render-btn.secondary:hover {
        background: #555;
      }
      
      .render-btn:disabled {
        background: #333;
        color: #666;
        cursor: not-allowed;
      }
      
      .render-settings {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .setting-group {
        background: #2a2a2a;
        padding: 15px;
        border-radius: 8px;
      }
      
      .setting-label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
        color: #ccc;
      }
      
      .setting-input {
        width: 100%;
        padding: 8px;
        background: #333;
        border: 1px solid #555;
        color: #fff;
        border-radius: 4px;
        box-sizing: border-box;
      }
      
      .setting-input:focus {
        border-color: #4CAF50;
        outline: none;
      }
      
      .render-preview {
        background: #2a2a2a;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }
      
      .preview-canvas {
        width: 100%;
        max-width: 800px;
        height: auto;
        border: 2px solid #555;
        border-radius: 4px;
        background: #000;
      }
      
      .render-progress {
        background: #2a2a2a;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        display: none;
      }
      
      .progress-bar {
        width: 100%;
        height: 20px;
        background: #333;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        width: 0%;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        text-align: center;
        color: #ccc;
      }
      
      .render-info {
        background: #2a2a2a;
        border-radius: 8px;
        padding: 20px;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
      }
      
      .info-item {
        text-align: center;
      }
      
      .info-value {
        font-size: 24px;
        font-weight: bold;
        color: #4CAF50;
      }
      
      .info-label {
        font-size: 12px;
        color: #888;
        margin-top: 5px;
      }
    `;
    doc.head.appendChild(style);

    // 메인 컨테이너 생성
    const container = doc.createElement('div');
    container.className = 'render-container';
    
    // 헤더
    const header = doc.createElement('div');
    header.className = 'render-header';
    header.innerHTML = `
      <div class="render-title">🎬 타임라인 렌더링</div>
      <div class="render-controls">
        <button class="render-btn primary" id="startRender">렌더링 시작</button>
        <button class="render-btn secondary" id="stopRender" disabled>중지</button>
        <button class="render-btn secondary" id="closeWindow">닫기</button>
      </div>
    `;
    container.appendChild(header);

    // 렌더링 설정
    const settings = doc.createElement('div');
    settings.className = 'render-settings';
    settings.innerHTML = `
      <div class="setting-group">
        <label class="setting-label">해상도</label>
        <select class="setting-input" id="resolutionSelect">
          <option value="1920x1080">1920 x 1080 (Full HD)</option>
          <option value="1280x720">1280 x 720 (HD)</option>
          <option value="854x480">854 x 480 (SD)</option>
          <option value="custom">사용자 정의</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label class="setting-label">품질</label>
        <select class="setting-input" id="qualitySelect">
          <option value="high">고품질</option>
          <option value="medium">중간</option>
          <option value="low">저품질</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label class="setting-label">출력 형식</label>
        <select class="setting-input" id="formatSelect">
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
          <option value="gif">GIF</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label class="setting-label">프레임 레이트</label>
        <select class="setting-input" id="fpsSelect">
          <option value="30">30 FPS</option>
          <option value="24">24 FPS</option>
          <option value="60">60 FPS</option>
        </select>
      </div>
    `;
    container.appendChild(settings);

    // 사용자 정의 해상도 입력 (초기에는 숨김)
    const customResolution = doc.createElement('div');
    customResolution.className = 'setting-group';
    customResolution.id = 'customResolution';
    customResolution.style.display = 'none';
    customResolution.innerHTML = `
      <label class="setting-label">사용자 정의 해상도</label>
      <div style="display: flex; gap: 10px;">
        <input type="number" class="setting-input" id="customWidth" placeholder="너비" min="1" max="7680">
        <span style="color: #ccc; line-height: 35px;">x</span>
        <input type="number" class="setting-input" id="customHeight" placeholder="높이" min="1" max="4320">
      </div>
    `;
    container.appendChild(customResolution);

    // 렌더링 미리보기
    const preview = doc.createElement('div');
    preview.className = 'render-preview';
    preview.innerHTML = `
      <h3 style="margin-top: 0; color: #4CAF50;">렌더링 미리보기</h3>
      <canvas id="previewCanvas" class="preview-canvas"></canvas>
      <div style="margin-top: 15px; text-align: center;">
        <button class="render-btn secondary" id="previewFrame">현재 프레임 미리보기</button>
        <button class="render-btn secondary" id="previewTimeline">타임라인 미리보기</button>
        <button class="render-btn secondary" id="debugAnimation" style="background: #FF9800;">🐛 애니메이션 디버그</button>
      </div>
    `;
    container.appendChild(preview);

    // 렌더링 진행률
    const progress = doc.createElement('div');
    progress.className = 'render-progress';
    progress.innerHTML = `
      <h3 style="margin-top: 0; color: #4CAF50;">렌더링 진행률</h3>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="progress-text" id="progressText">0% 완료 (0 / ${this.totalFrames} 프레임)</div>
    `;
    container.appendChild(progress);

    // 렌더링 정보
    const info = doc.createElement('div');
    info.className = 'render-info';
    info.innerHTML = `
      <h3 style="margin-top: 0; color: #4CAF50;">렌더링 정보</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-value" id="totalFramesInfo">${this.totalFrames}</div>
          <div class="info-label">총 프레임</div>
        </div>
        <div class="info-item">
          <div class="info-value" id="totalTimeInfo">${this.formatTime(this.totalSeconds)}</div>
          <div class="info-label">총 시간</div>
        </div>
        <div class="info-item">
          <div class="info-value" id="estimatedTimeInfo">--:--</div>
          <div class="info-label">예상 소요 시간</div>
        </div>
        <div class="info-item">
          <div class="info-value" id="fileSizeInfo">-- MB</div>
          <div class="info-label">예상 파일 크기</div>
        </div>
      </div>
    `;
    container.appendChild(info);

    doc.body.appendChild(container);
  }

  // 렌더링 캔버스 설정
  setupRenderCanvas() {
    const doc = this.renderWindow.document;
    this.renderCanvas = doc.getElementById('previewCanvas');
    
    if (!this.renderCanvas) {
      console.error('렌더링 캔버스를 찾을 수 없습니다.');
      return;
    }

    // 캔버스 크기 설정
    this.renderCanvas.width = 800;
    this.renderCanvas.height = 450;
    
    this.renderContext = this.renderCanvas.getContext('2d');
    
    // 새 창용 Three.js 씬 생성
    this.createPreviewScene();
    
    // 초기 미리보기 그리기
    this.drawPreviewFrame();
  }

  // 새 창용 Three.js 씬 생성
  createPreviewScene() {
    try {
      // Three.js 라이브러리 동적 로드
      this.loadThreeJS().then(() => {
        this.setupPreviewScene();
      }).catch(error => {
        console.warn('Three.js 로드 실패:', error);
        this.showPreviewStatus('Three.js 로드 실패, 기본 미리보기로 진행', 'warning');
      });
    } catch (error) {
      console.error('Three.js 씬 생성 중 오류:', error);
    }
  }

  // 미리보기 씬 설정
  setupPreviewScene() {
    try {
      // Three.js가 로드되었는지 확인
      if (typeof THREE === 'undefined') {
        console.error('Three.js가 로드되지 않았습니다.');
        return;
      }

      console.log('Three.js 객체 확인:', typeof THREE);
      console.log('원본 씬 정보:', {
        children: this.editor.scene ? this.editor.scene.children.length : 'undefined',
        name: this.editor.scene ? this.editor.scene.name : 'undefined'
      });
      
      // 씬 복사
      this.previewScene = this.editor.scene.clone();
      console.log('씬 복사 완료:', {
        children: this.previewScene.children.length,
        name: this.previewScene.name
      });
      
      // 카메라 복사 및 설정
      if (this.editor.camera) {
        this.previewCamera = this.editor.camera.clone();
        console.log('카메라 복사 완료:', this.previewCamera.type);
      } else {
        // 에디터에 카메라가 없으면 씬에서 찾기
        const sceneCamera = this.editor.scene.getObjectByProperty('type', 'PerspectiveCamera') ||
                           this.editor.scene.getObjectByProperty('type', 'OrthographicCamera');
        if (sceneCamera) {
          this.previewCamera = sceneCamera.clone();
          console.log('씬에서 카메라 찾아서 복사 완료:', this.previewCamera.type);
        } else {
          // 기본 카메라 생성
          this.previewCamera = new THREE.PerspectiveCamera(75, 800 / 450, 0.1, 1000);
          this.previewCamera.position.set(0, 0, 5);
          console.log('기본 카메라 생성 완료');
        }
      }
      
      // WebGL 렌더러용 별도 캔버스 생성 (2D 캔버스와 분리)
      const webglCanvas = this.renderWindow.document.createElement('canvas');
      webglCanvas.width = 800;
      webglCanvas.height = 450;
      webglCanvas.style.display = 'none'; // 숨김 처리
      
      // 렌더러 생성 (별도 캔버스 사용)
      this.previewRenderer = new THREE.WebGLRenderer({ 
        canvas: webglCanvas,
        alpha: true,
        antialias: true
      });
      this.previewRenderer.setSize(800, 450);
      this.previewRenderer.setClearColor(0x000000, 1);
      
      console.log('미리보기 씬 설정 완료:', {
        scene: this.previewScene,
        camera: this.previewCamera,
        renderer: this.previewRenderer,
        sceneChildren: this.previewScene.children.length
      });
      
      // 복사된 씬의 객체들 확인
      console.log('복사된 씬의 객체들:');
      this.previewScene.traverse((object) => {
        if (object.name) {
          console.log(`- ${object.name} (${object.type})`);
        }
      });
      
    } catch (error) {
      console.error('미리보기 씬 설정 중 오류:', error);
    }
  }

  // Three.js 라이브러리 동적 로드
  async loadThreeJS() {
    // 이미 로드되어 있는지 확인
    if (typeof THREE !== 'undefined') {
      console.log('Three.js가 이미 로드되어 있습니다.');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = this.renderWindow.document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.integrity = 'sha512-QdTX+2GFXWw25Tvr5cgyRkLZqP6/0ci2Rr/9zJ+QmFzJtG/owwvtHnJxtEWam6/HD2szi/wDgQaR6ySVa2QfA==';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('Three.js 라이브러리 로드 완료');
        // 전역 THREE 객체가 로드되었는지 확인
        if (typeof THREE !== 'undefined') {
          resolve();
        } else {
          reject(new Error('Three.js 로드 후에도 객체를 찾을 수 없습니다.'));
        }
      };
      
      script.onerror = () => {
        console.warn('Three.js 로드 실패');
        reject(new Error('Three.js 로드 실패'));
      };
      
      this.renderWindow.document.head.appendChild(script);
    });
  }

  // 렌더링 이벤트 바인딩
  bindRenderEvents() {
    const doc = this.renderWindow.document;

    // 해상도 선택 이벤트
    const resolutionSelect = doc.getElementById('resolutionSelect');
    if (resolutionSelect) {
      resolutionSelect.addEventListener('change', (e) => {
        const customResolution = doc.getElementById('customResolution');
        if (e.target.value === 'custom') {
          customResolution.style.display = 'block';
        } else {
          customResolution.style.display = 'none';
          this.updateRenderSettings();
        }
      });
    }

    // 렌더링 시작 버튼
    const startRenderBtn = doc.getElementById('startRender');
    if (startRenderBtn) {
      startRenderBtn.addEventListener('click', () => {
        this.startRendering();
      });
    }

    // 렌더링 중지 버튼
    const stopRenderBtn = doc.getElementById('stopRender');
    if (stopRenderBtn) {
      stopRenderBtn.addEventListener('click', () => {
        this.stopRendering();
      });
    }

    // 창 닫기 버튼
    const closeBtn = doc.getElementById('closeWindow');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.renderWindow.close();
      });
    }

    // 현재 프레임 미리보기
    const previewFrameBtn = doc.getElementById('previewFrame');
    if (previewFrameBtn) {
      previewFrameBtn.addEventListener('click', () => {
        this.previewCurrentFrame();
      });
    }

    // 타임라인 미리보기
    const previewTimelineBtn = doc.getElementById('previewTimeline');
    if (previewTimelineBtn) {
      previewTimelineBtn.addEventListener('click', () => {
        this.previewTimeline();
      });
    }

    // 애니메이션 디버그
    const debugAnimationBtn = doc.getElementById('debugAnimation');
    if (debugAnimationBtn) {
      debugAnimationBtn.addEventListener('click', () => {
        this.showAnimationDebugInfo();
        this.showPreviewStatus('애니메이션 디버그 정보를 콘솔에 출력했습니다', 'info');
      });
    }

    // 설정 변경 시 정보 업데이트
    const inputs = doc.querySelectorAll('.setting-input');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.updateRenderInfo();
      });
    });
  }

  // 렌더링 설정 업데이트
  updateRenderSettings() {
    const doc = this.renderWindow.document;
    
    const resolution = doc.getElementById('resolutionSelect').value;
    const quality = doc.getElementById('qualitySelect').value;
    const format = doc.getElementById('formatSelect').value;
    const fps = parseInt(doc.getElementById('fpsSelect').value);

    if (resolution === 'custom') {
      const width = parseInt(doc.getElementById('customWidth').value) || 1920;
      const height = parseInt(doc.getElementById('customHeight').value) || 1080;
      this.renderSettings.width = width;
      this.renderSettings.height = height;
    } else {
      const [width, height] = resolution.split('x').map(Number);
      this.renderSettings.width = width;
      this.renderSettings.height = height;
    }

    this.renderSettings.quality = quality;
    this.renderSettings.format = format;
    this.renderSettings.frameRate = fps;

    console.log('렌더링 설정 업데이트:', this.renderSettings);
    this.updateRenderInfo();
  }

  // 렌더링 정보 업데이트
  updateRenderInfo() {
    const doc = this.renderWindow.document;
    
    // 예상 소요 시간 계산 (프레임당 0.1초 가정)
    const estimatedSeconds = this.totalFrames * 0.1;
    const estimatedTime = this.formatTime(estimatedSeconds);
    
    // 예상 파일 크기 계산 (품질에 따라)
    let fileSizeMB = 0;
    switch (this.renderSettings.quality) {
      case 'high':
        fileSizeMB = (this.totalFrames * this.renderSettings.width * this.renderSettings.height * 0.0001) / 1024;
        break;
      case 'medium':
        fileSizeMB = (this.totalFrames * this.renderSettings.width * this.renderSettings.height * 0.00005) / 1024;
        break;
      case 'low':
        fileSizeMB = (this.totalFrames * this.renderSettings.width * this.renderSettings.height * 0.00002) / 1024;
        break;
    }

    const estimatedTimeInfo = doc.getElementById('estimatedTimeInfo');
    const fileSizeInfo = doc.getElementById('fileSizeInfo');

    if (estimatedTimeInfo) {
      estimatedTimeInfo.textContent = estimatedTime;
    }
    if (fileSizeInfo) {
      fileSizeInfo.textContent = `${fileSizeMB.toFixed(1)} MB`;
    }
  }

  // 렌더링 시작
  async startRendering() {
    if (this.isRendering) return;

    this.updateRenderSettings();
    
    this.isRendering = true;
    this.currentFrame = 0;

    // UI 상태 변경
    const doc = this.renderWindow.document;
    const startBtn = doc.getElementById('startRender');
    const stopBtn = doc.getElementById('stopRender');
    const progress = doc.querySelector('.render-progress');

    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (progress) progress.style.display = 'block';

    console.log('렌더링 시작:', this.renderSettings);

    // 렌더링 루프 시작
    await this.renderLoop();
  }

  // 렌더링 중지
  stopRendering() {
    this.isRendering = false;
    
    // UI 상태 복원
    const doc = this.renderWindow.document;
    const startBtn = doc.getElementById('startRender');
    const stopBtn = doc.getElementById('stopRender');

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    console.log('렌더링 중지됨');
  }

  // 렌더링 루프
  async renderLoop() {
    const doc = this.renderWindow.document;
    const progressFill = doc.getElementById('progressFill');
    const progressText = doc.getElementById('progressText');

    while (this.isRendering && this.currentFrame < this.totalFrames) {
      // 현재 프레임 렌더링
      await this.renderFrame(this.currentFrame);

      // 진행률 업데이트
      const progress = (this.currentFrame / this.totalFrames) * 100;
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
      if (progressText) {
        progressText.textContent = `${progress.toFixed(1)}% 완료 (${this.currentFrame} / ${this.totalFrames} 프레임)`;
      }

      this.currentFrame++;

      // 프레임 간 지연 (실제 렌더링에서는 필요 없음)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (this.currentFrame >= this.totalFrames) {
      this.renderComplete();
    }
  }

  // 개별 프레임 렌더링
  async renderFrame(frameNumber) {
    const currentTime = frameNumber / this.fps;
    
    console.log(`프레임 ${frameNumber} 렌더링 중... (${currentTime.toFixed(2)}초)`);

    // 여기서 실제 3D 씬을 렌더링합니다
    // 1. 현재 시간에 맞는 애니메이션 상태로 씬 업데이트
    await this.updateSceneAtTime(currentTime);
    
    // 2. 씬을 캔버스에 렌더링
    await this.renderSceneToCanvas();
    
    // 3. 프레임을 파일에 저장 (실제 구현에서는 MediaRecorder 등 사용)
    // this.saveFrame(frameNumber);
  }

  // 특정 시간에 씬 상태 업데이트
  async updateSceneAtTime(time) {
    if (!this.previewScene) {
      console.error('미리보기 씬을 찾을 수 없습니다.');
      return;
    }

    console.log(`=== 미리보기 씬 상태 업데이트 시작: ${time.toFixed(2)}초 ===`);

    try {
      // MotionTimeline 애니메이션 업데이트 (미리보기 씬에만 적용)
      if (this.editor.motionTimeline) {
        console.log('✅ MotionTimeline 발견, 애니메이션 적용 시작...');
        console.log('MotionTimeline 상태:', {
          hasTimelineData: !!this.editor.motionTimeline.timelineData,
          timelineData: this.editor.motionTimeline.timelineData,
          tracksCount: this.editor.motionTimeline.timelineData ? this.editor.motionTimeline.timelineData.tracks.size : 0
        });
        
        // 원본 타임라인의 애니메이션 데이터를 미리보기 씬에 적용
        this.applyMotionTimelineToPreview(time);
        console.log('✅ MotionTimeline 애니메이션 미리보기 씬에 적용 완료');
      } else {
        console.warn('❌ MotionTimeline을 찾을 수 없습니다.');
      }

      // LightTimeline 애니메이션 업데이트 (미리보기 씬에만 적용)
      if (this.editor.lightTimeline) {
        console.log('✅ LightTimeline 발견, 애니메이션 적용 시작...');
        console.log('LightTimeline 상태:', {
          hasTimelineData: !!this.editor.lightTimeline.timelineData,
          timelineData: this.editor.lightTimeline.timelineData,
          tracksCount: this.editor.lightTimeline.timelineData ? this.editor.lightTimeline.timelineData.tracks.size : 0
        });
        
        this.applyLightTimelineToPreview(time);
        console.log('✅ LightTimeline 애니메이션 미리보기 씬에 적용 완료');
      } else {
        console.warn('❌ LightTimeline을 찾을 수 없습니다.');
      }

      // AudioTimeline 업데이트 (렌더링 중에는 오디오 재생하지 않음)
      if (this.editor.audioTimeline) {
        console.log('✅ AudioTimeline 발견, 시간 업데이트...');
        console.log('AudioTimeline 시간 업데이트 완료');
      } else {
        console.warn('❌ AudioTimeline을 찾을 수 없습니다.');
      }

      // 미리보기 씬의 모든 객체에 애니메이션 업데이트 적용
      console.log('🔄 미리보기 씬 객체 애니메이션 업데이트 시작...');
      this.updatePreviewSceneObjects(time);

      // 디버깅: 미리보기 씬의 객체 상태 출력
      console.log('📊 미리보기 씬 객체 상태 확인:');
      this.previewScene.traverse((object) => {
        if (object.name) {
          console.log(`  - ${object.name} (${object.type}):`, {
            위치: object.position,
            회전: object.rotation,
            크기: object.scale,
            가시성: object.visible
          });
        }
      });

      console.log(`=== 미리보기 씬 상태 업데이트 완료: ${time.toFixed(2)}초 ===`);
    } catch (error) {
      console.error('❌ 미리보기 씬 상태 업데이트 중 오류 발생:', error);
    }
  }

  // 씬의 모든 객체에 애니메이션 업데이트 적용
  updateSceneObjects(time) {
    if (!this.editor.scene) return;

    const scene = this.editor.scene;
    let updatedObjects = 0;
    
    // 씬의 모든 객체를 순회하며 애니메이션 업데이트
    scene.traverse((object) => {
      let objectUpdated = false;
      
      // 사용자 정의 애니메이션이 있는 경우
      if (object.userData && object.userData.animations) {
        this.updateObjectAnimation(object, time);
        objectUpdated = true;
      }
      
      // 키프레임 애니메이션이 있는 경우
      if (object.userData && object.userData.keyframes) {
        this.updateObjectKeyframes(object, time);
        objectUpdated = true;
      }
      
      // Three.js 기본 애니메이션 클립이 있는 경우
      if (object.animations && object.animations.length > 0) {
        this.updateObjectAnimations(object, time);
        objectUpdated = true;
      }
      
      // 위치, 회전, 크기 애니메이션이 있는 경우
      if (object.userData && (object.userData.positionAnimation || object.userData.rotationAnimation || object.userData.scaleAnimation)) {
        this.updateObjectTransformAnimation(object, time);
        objectUpdated = true;
      }
      
      if (objectUpdated) {
        updatedObjects++;
      }
    });
    
    console.log(`애니메이션 업데이트 완료: ${updatedObjects}개 객체`);
  }

  // Three.js 기본 애니메이션 클립 업데이트
  updateObjectAnimations(object, time) {
    try {
      if (object.animations && object.animations.length > 0) {
        object.animations.forEach(animation => {
          if (animation.duration > 0) {
            // 애니메이션 시간을 0-1 범위로 정규화
            const normalizedTime = (time % animation.duration) / animation.duration;
            
            // 애니메이션 클립 실행
            if (animation.tracks && animation.tracks.length > 0) {
              animation.tracks.forEach(track => {
                if (track.name === '.position') {
                  const position = track.getValueAtTime(normalizedTime * animation.duration);
                  if (position && position.length >= 3) {
                    object.position.set(position[0], position[1], position[2]);
                  }
                } else if (track.name === '.rotation') {
                  const rotation = track.getValueAtTime(normalizedTime * animation.duration);
                  if (rotation && rotation.length >= 4) {
                    object.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
                  }
                } else if (track.name === '.scale') {
                  const scale = track.getValueAtTime(normalizedTime * animation.duration);
                  if (scale && scale.length >= 3) {
                    object.scale.set(scale[0], scale[1], scale[2]);
                  }
                }
              });
            }
          }
        });
      }
    } catch (error) {
      console.warn('객체 기본 애니메이션 업데이트 중 오류:', error);
    }
  }

  // 객체의 변환 애니메이션 업데이트
  updateObjectTransformAnimation(object, time) {
    try {
      // 위치 애니메이션
      if (object.userData.positionAnimation) {
        const posAnim = object.userData.positionAnimation;
        if (posAnim.keyframes && posAnim.keyframes.length > 0) {
          this.interpolatePosition(object, posAnim.keyframes, time);
        }
      }
      
      // 회전 애니메이션
      if (object.userData.rotationAnimation) {
        const rotAnim = object.userData.rotationAnimation;
        if (rotAnim.keyframes && rotAnim.keyframes.length > 0) {
          this.interpolateRotation(object, rotAnim.keyframes, time);
        }
      }
      
      // 크기 애니메이션
      if (object.userData.scaleAnimation) {
        const scaleAnim = object.userData.scaleAnimation;
        if (scaleAnim.keyframes && scaleAnim.keyframes.length > 0) {
          this.interpolateScale(object, scaleAnim.keyframes, time);
        }
      }
    } catch (error) {
      console.warn('객체 변환 애니메이션 업데이트 중 오류:', error);
    }
  }

  // 객체의 사용자 정의 애니메이션 업데이트
  updateObjectAnimation(object, time) {
    try {
      const animations = object.userData.animations;
      if (Array.isArray(animations)) {
        animations.forEach(anim => {
          if (anim.type === 'position' && anim.keyframes) {
            this.interpolatePosition(object, anim.keyframes, time);
          } else if (anim.type === 'rotation' && anim.keyframes) {
            this.interpolateRotation(object, anim.keyframes, time);
          } else if (anim.type === 'scale' && anim.keyframes) {
            this.interpolateScale(object, anim.keyframes, time);
          }
        });
      }
    } catch (error) {
      console.warn('객체 애니메이션 업데이트 중 오류:', error);
    }
  }

  // 객체의 키프레임 애니메이션 업데이트
  updateObjectKeyframes(object, time) {
    try {
      const keyframes = object.userData.keyframes;
      if (Array.isArray(keyframes) && keyframes.length > 0) {
        // 시간에 맞는 키프레임 찾기
        const currentKeyframe = this.findCurrentKeyframe(keyframes, time);
        if (currentKeyframe) {
          // 키프레임 값 적용
          if (currentKeyframe.position) {
            object.position.copy(currentKeyframe.position);
          }
          if (currentKeyframe.rotation) {
            object.rotation.copy(currentKeyframe.rotation);
          }
          if (currentKeyframe.scale) {
            object.scale.copy(currentKeyframe.scale);
          }
        }
      }
    } catch (error) {
      console.warn('객체 키프레임 업데이트 중 오류:', error);
    }
  }

  // 현재 시간에 맞는 키프레임 찾기
  findCurrentKeyframe(keyframes, time) {
    if (keyframes.length === 0) return null;
    
    // 시간순으로 정렬
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    
    // 현재 시간보다 작거나 같은 가장 가까운 키프레임 찾기
    let currentKeyframe = sortedKeyframes[0];
    for (let i = 0; i < sortedKeyframes.length; i++) {
      if (sortedKeyframes[i].time <= time) {
        currentKeyframe = sortedKeyframes[i];
      } else {
        break;
      }
    }
    
    return currentKeyframe;
  }

  // 위치 보간
  interpolatePosition(object, keyframes, time) {
    if (keyframes.length < 2) return;
    
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    const currentKeyframe = this.findCurrentKeyframe(sortedKeyframes, time);
    const nextKeyframe = sortedKeyframes.find(k => k.time > time);
    
    if (currentKeyframe && nextKeyframe) {
      const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
      object.position.lerpVectors(currentKeyframe.position, nextKeyframe.position, t);
    } else if (currentKeyframe) {
      object.position.copy(currentKeyframe.position);
    }
  }

  // 회전 보간
  interpolateRotation(object, keyframes, time) {
    if (keyframes.length < 2) return;
    
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    const currentKeyframe = this.findCurrentKeyframe(sortedKeyframes, time);
    const nextKeyframe = sortedKeyframes.find(k => k.time > time);
    
    if (currentKeyframe && nextKeyframe) {
      const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
      object.quaternion.slerpQuaternions(currentKeyframe.rotation, nextKeyframe.rotation, t);
    } else if (currentKeyframe) {
      object.quaternion.copy(currentKeyframe.rotation);
    }
  }

  // 크기 보간
  interpolateScale(object, keyframes, time) {
    if (keyframes.length < 2) return;
    
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    const currentKeyframe = this.findCurrentKeyframe(sortedKeyframes, time);
    const nextKeyframe = sortedKeyframes.find(k => k.time > time);
    
    if (currentKeyframe && nextKeyframe) {
      const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
      object.scale.lerpVectors(currentKeyframe.scale, nextKeyframe.scale, t);
    } else if (currentKeyframe) {
      object.scale.copy(currentKeyframe.scale);
    }
  }

  // 씬을 캔버스에 렌더링
  async renderSceneToCanvas() {
    if (!this.previewScene || !this.previewRenderer || !this.previewCamera) {
      console.error('미리보기 씬, 렌더러 또는 카메라를 찾을 수 없습니다.');
      return;
    }

    try {
      // 미리보기 씬 렌더링
      this.previewRenderer.render(this.previewScene, this.previewCamera);
      
      // 렌더링 결과를 미리보기 캔버스에 표시
      this.updatePreviewCanvas();
      
      console.log('미리보기 씬 렌더링 완료:', {
        width: this.renderSettings.width,
        height: this.renderSettings.height,
        camera: this.previewCamera.type
      });
      
    } catch (error) {
      console.error('미리보기 씬 렌더링 중 오류:', error);
    }
  }

  // 미리보기 전용 렌더링 (해상도 변경 없이)
  async renderSceneToCanvasForPreview() {
    if (!this.previewScene || !this.previewRenderer || !this.previewCamera) {
      console.error('미리보기 씬, 렌더러 또는 카메라를 찾을 수 없습니다.');
      return;
    }

    try {
      // 미리보기 씬 렌더링
      this.previewRenderer.render(this.previewScene, this.previewCamera);
      
      // 렌더링 결과를 미리보기 캔버스에 표시 (고정 해상도 사용)
      this.updatePreviewCanvasForPreview();
      
      console.log('미리보기 전용 렌더링 완료');
      
    } catch (error) {
      console.error('미리보기 전용 렌더링 중 오류:', error);
    }
  }

  // 미리보기 캔버스 업데이트
  updatePreviewCanvas() {
    if (!this.renderCanvas || !this.renderContext || !this.previewRenderer) return;

    // WebGL 렌더러의 DOM 요소를 캔버스에 복사
    const rendererElement = this.previewRenderer.domElement;
    
    // 현재 렌더러의 실제 크기 가져오기
    const rendererSize = new THREE.Vector2();
    this.previewRenderer.getSize(rendererSize);
    const currentWidth = rendererSize.width;
    const currentHeight = rendererSize.height;
    
    // 캔버스 크기에 맞게 스케일링
    const scale = Math.min(
      this.renderCanvas.width / currentWidth,
      this.renderCanvas.height / currentHeight
    );
    
    const scaledWidth = currentWidth * scale;
    const scaledHeight = currentHeight * scale;
    
    // 캔버스 중앙에 렌더링 결과 표시
    const offsetX = (this.renderCanvas.width - scaledWidth) / 2;
    const offsetY = (this.renderCanvas.height - scaledHeight) / 2;

    // 배경 지우기
    this.renderContext.fillStyle = '#000';
    this.renderContext.fillRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);

    // Three.js 렌더러의 결과를 캔버스에 직접 복사
    try {
      // WebGL 컨텍스트에서 픽셀 데이터 읽기 (현재 렌더러 크기 사용)
      const gl = this.previewRenderer.getContext();
      const pixels = new Uint8Array(currentWidth * currentHeight * 4);
      
      // 픽셀 데이터 읽기
      gl.readPixels(0, 0, currentWidth, currentHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      // ImageData 생성
      const imageData = this.renderContext.createImageData(currentWidth, currentHeight);
      
      // RGBA 순서를 맞추기 위해 픽셀 데이터 복사 (WebGL은 아래에서 위로, Canvas는 위에서 아래로)
      for (let y = 0; y < currentHeight; y++) {
        for (let x = 0; x < currentWidth; x++) {
          const srcIndex = (y * currentWidth + x) * 4;
          const dstIndex = ((currentHeight - 1 - y) * currentWidth + x) * 4;
          
          imageData.data[dstIndex] = pixels[srcIndex];     // R
          imageData.data[dstIndex + 1] = pixels[srcIndex + 1]; // G
          imageData.data[dstIndex + 2] = pixels[srcIndex + 2]; // B
          imageData.data[dstIndex + 3] = pixels[srcIndex + 3]; // A
        }
      }
      
      // 임시 캔버스에 ImageData 그리기
      const tempCanvas = this.renderWindow.document.createElement('canvas');
      tempCanvas.width = currentWidth;
      tempCanvas.height = currentHeight;
      const tempContext = tempCanvas.getContext('2d');
      tempContext.putImageData(imageData, 0, 0);
      
      // 미리보기 캔버스에 스케일링하여 그리기
      this.renderContext.drawImage(
        tempCanvas,
        offsetX, offsetY,
        scaledWidth, scaledHeight
      );
      
    } catch (error) {
      console.warn('WebGL 픽셀 데이터를 읽을 수 없습니다:', error);
      
      // 대체 방법: 간단한 프레임 표시
      this.renderContext.fillStyle = '#333';
      this.renderContext.fillRect(offsetX, offsetY, scaledWidth, scaledHeight);
      
      this.renderContext.fillStyle = '#4CAF50';
      this.renderContext.font = '16px Arial';
      this.renderContext.textAlign = 'center';
      this.renderContext.fillText(
        `프레임 ${this.currentFrame}`, 
        this.renderCanvas.width / 2, 
        this.renderCanvas.height / 2
      );
      
      this.renderContext.font = '14px Arial';
      this.renderContext.fillStyle = '#888';
      this.renderContext.fillText(
        '애니메이션 미리보기', 
        this.renderCanvas.width / 2, 
        this.renderCanvas.height / 2 + 25
      );
    }
  }

  // 미리보기 전용 캔버스 업데이트 (고정 해상도 사용)
  updatePreviewCanvasForPreview() {
    if (!this.renderCanvas || !this.renderContext || !this.previewRenderer) return;

    // 미리보기용 고정 해상도 사용
    const previewWidth = 640;
    const previewHeight = 360;
    
    // 캔버스 크기에 맞게 스케일링
    const scale = Math.min(
      this.renderCanvas.width / previewWidth,
      this.renderCanvas.height / previewHeight
    );
    
    const scaledWidth = previewWidth * scale;
    const scaledHeight = previewHeight * scale;
    
    // 캔버스 중앙에 렌더링 결과 표시
    const offsetX = (this.renderCanvas.width - scaledWidth) / 2;
    const offsetY = (this.renderCanvas.height - scaledHeight) / 2;

    // 배경 지우기
    this.renderContext.fillStyle = '#000';
    this.renderContext.fillRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);

    // Three.js 렌더러의 결과를 캔버스에 직접 복사
    try {
      // WebGL 컨텍스트에서 픽셀 데이터 읽기 (고정 해상도 사용)
      const gl = this.previewRenderer.getContext();
      const pixels = new Uint8Array(previewWidth * previewHeight * 4);
      
      // 픽셀 데이터 읽기
      gl.readPixels(0, 0, previewWidth, previewHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      
      // ImageData 생성
      const imageData = this.renderContext.createImageData(previewWidth, previewHeight);
      
      // RGBA 순서를 맞추기 위해 픽셀 데이터 복사 (WebGL은 아래에서 위로, Canvas는 위에서 아래로)
      for (let y = 0; y < previewHeight; y++) {
        for (let x = 0; x < previewWidth; x++) {
          const srcIndex = (y * previewWidth + x) * 4;
          const dstIndex = ((previewHeight - 1 - y) * previewWidth + x) * 4;
          
          imageData.data[dstIndex] = pixels[srcIndex];     // R
          imageData.data[dstIndex + 1] = pixels[srcIndex + 1]; // G
          imageData.data[dstIndex + 2] = pixels[srcIndex + 2]; // B
          imageData.data[dstIndex + 3] = pixels[srcIndex + 3]; // A
        }
      }
      
      // 임시 캔버스에 ImageData 그리기
      const tempCanvas = this.renderWindow.document.createElement('canvas');
      tempCanvas.width = previewWidth;
      tempCanvas.height = previewHeight;
      const tempContext = tempCanvas.getContext('2d');
      tempContext.putImageData(imageData, 0, 0);
      
      // 미리보기 캔버스에 스케일링하여 그리기
      this.renderContext.drawImage(
        tempCanvas,
        offsetX, offsetY,
        scaledWidth, scaledHeight
      );
      
    } catch (error) {
      console.warn('미리보기 WebGL 픽셀 데이터를 읽을 수 없습니다:', error);
      
      // 대체 방법: 간단한 프레임 표시
      this.renderContext.fillStyle = '#333';
      this.renderContext.fillRect(offsetX, offsetY, scaledWidth, scaledHeight);
      
      this.renderContext.fillStyle = '#4CAF50';
      this.renderContext.font = '16px Arial';
      this.renderContext.textAlign = 'center';
      this.renderContext.fillText(
        `프레임 ${this.currentFrame}`, 
        this.renderCanvas.width / 2, 
        this.renderCanvas.height / 2
      );
      
      this.renderContext.font = '14px Arial';
      this.renderContext.fillStyle = '#888';
      this.renderContext.fillText(
        '애니메이션 미리보기', 
        this.renderCanvas.width / 2, 
        this.renderCanvas.height / 2 + 25
      );
    }
  }

  // 렌더링 완료
  renderComplete() {
    this.isRendering = false;
    
    const doc = this.renderWindow.document;
    const startBtn = doc.getElementById('startRender');
    const stopBtn = doc.getElementById('stopRender');

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;

    // 완료 메시지 표시
    const progressText = doc.getElementById('progressText');
    if (progressText) {
      progressText.textContent = '렌더링 완료! 🎉';
      progressText.style.color = '#4CAF50';
      progressText.style.fontWeight = 'bold';
    }

    console.log('렌더링 완료!');
    
    // 다운로드 링크 생성 (실제 구현에서는 실제 파일 생성)
    this.createDownloadLink();
  }

  // 다운로드 링크 생성
  createDownloadLink() {
    const doc = this.renderWindow.document;
    
    const downloadSection = doc.createElement('div');
    downloadSection.className = 'render-info';
    downloadSection.style.marginTop = '20px';
    downloadSection.innerHTML = `
      <h3 style="margin-top: 0; color: #4CAF50;">다운로드</h3>
      <div style="text-align: center; padding: 20px;">
        <p style="color: #ccc; margin-bottom: 15px;">렌더링이 완료되었습니다!</p>
        <button class="render-btn primary" id="downloadVideo">🎬 WebM 비디오 다운로드</button>
        <button class="render-btn secondary" id="downloadFrames">🖼️ PNG 프레임 다운로드</button>
        <div style="margin-top: 10px; font-size: 12px; color: #888;">
          <p>• WebM: 고품질 비디오 파일 (VP9 코덱)</p>
          <p>• PNG: 개별 프레임 이미지 (최대 100개)</p>
        </div>
      </div>
    `;

    // 기존 다운로드 섹션이 있으면 제거
    const existingDownload = doc.querySelector('.render-info:last-child');
    if (existingDownload && existingDownload.querySelector('#downloadVideo')) {
      existingDownload.remove();
    }

    doc.body.appendChild(downloadSection);

    // 다운로드 버튼 이벤트
    const downloadVideoBtn = doc.getElementById('downloadVideo');
    if (downloadVideoBtn) {
      downloadVideoBtn.addEventListener('click', () => {
        this.downloadVideo();
      });
    }

    const downloadFramesBtn = doc.getElementById('downloadFrames');
    if (downloadFramesBtn) {
      downloadFramesBtn.addEventListener('click', () => {
        this.downloadFrames();
      });
    }
  }

  // 비디오 다운로드
  async downloadVideo() {
    try {
      console.log('비디오 다운로드 시작...');
      
      // 다운로드 상태 표시
      this.showDownloadStatus('비디오 렌더링 중...', 'info');
      
      // MediaRecorder 설정
      const stream = this.renderCanvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000 // 5 Mbps
      });
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // 다운로드 링크 생성
        const a = this.renderWindow.document.createElement('a');
        a.href = url;
        a.download = `timeline_render_${Date.now()}.webm`;
        a.style.display = 'none';
        this.renderWindow.document.body.appendChild(a);
        a.click();
        this.renderWindow.document.body.removeChild(a);
        
        // 메모리 정리
        URL.revokeObjectURL(url);
        
        this.showDownloadStatus('비디오 다운로드 완료!', 'success');
        console.log('비디오 다운로드 완료');
      };
      
      // 렌더링 시작
      mediaRecorder.start();
      
      // 타임라인 재생하면서 녹화
      await this.recordTimeline(mediaRecorder);
      
    } catch (error) {
      console.error('비디오 다운로드 중 오류:', error);
      this.showDownloadStatus('비디오 다운로드 실패', 'error');
    }
  }

  // 타임라인 녹화
  async recordTimeline(mediaRecorder) {
    const totalFrames = this.totalFrames;
    const frameInterval = 1000 / this.fps; // 프레임 간격 (밀리초)
    
    console.log(`녹화 시작: ${totalFrames}프레임, ${frameInterval}ms 간격`);
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / this.fps;
      
      // 씬 상태 업데이트
      await this.updateSceneAtTime(time);
      
      // 씬 렌더링
      await this.renderSceneToCanvas();
      
      // 진행률 표시
      const progress = ((frame + 1) / totalFrames) * 100;
      this.showDownloadProgress(progress, frame + 1, totalFrames);
      
      // 프레임 간 지연
      await new Promise(resolve => setTimeout(resolve, frameInterval));
    }
    
    // 녹화 중지
    mediaRecorder.stop();
    console.log('녹화 완료');
  }

  // 프레임 다운로드
  async downloadFrames() {
    try {
      console.log('프레임 다운로드 시작...');
      
      // 다운로드 상태 표시
      this.showDownloadStatus('프레임 렌더링 중...', 'info');
      
      // JSZip 라이브러리 동적 로드
      if (typeof JSZip === 'undefined') {
        await this.loadJSZip();
      }
      
      // ZIP 파일 생성을 위한 JSZip 라이브러리 확인
      if (typeof JSZip === 'undefined') {
        // JSZip이 없으면 개별 다운로드
        await this.downloadIndividualFrames();
      } else {
        // JSZip으로 압축 다운로드
        await this.downloadFramesAsZip();
      }
      
    } catch (error) {
      console.error('프레임 다운로드 중 오류:', error);
      this.showDownloadStatus('프레임 다운로드 실패', 'error');
    }
  }

  // JSZip 라이브러리 동적 로드
  async loadJSZip() {
    try {
      this.showDownloadStatus('JSZip 라이브러리 로딩 중...', 'info');
      
      // CDN에서 JSZip 로드
      const script = this.renderWindow.document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxfRXVXehLp89f3WfAXzWfqRAPqFqQwe/flFLhOq7/OsF9Vq0i0mUJbvw==';
      script.crossOrigin = 'anonymous';
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('JSZip 라이브러리 로드 완료');
          this.showDownloadStatus('JSZip 로드 완료', 'success');
          resolve();
        };
        
        script.onerror = () => {
          console.warn('JSZip 로드 실패, 개별 다운로드로 진행');
          this.showDownloadStatus('JSZip 로드 실패, 개별 다운로드로 진행', 'warning');
          reject(new Error('JSZip 로드 실패'));
        };
        
        this.renderWindow.document.head.appendChild(script);
      });
      
    } catch (error) {
      console.warn('JSZip 로드 중 오류:', error);
      throw error;
    }
  }

  // 개별 프레임 다운로드
  async downloadIndividualFrames() {
    const totalFrames = Math.min(100, this.totalFrames); // 최대 100프레임
    const frameInterval = Math.max(1, Math.floor(this.totalFrames / totalFrames));
    
    console.log(`개별 프레임 다운로드: ${totalFrames}프레임`);
    
    for (let i = 0; i < totalFrames; i++) {
      const frame = i * frameInterval;
      const time = frame / this.fps;
      
      // 씬 상태 업데이트
      await this.updateSceneAtTime(time);
      
      // 씬 렌더링
      await this.renderSceneToCanvas();
      
      // 프레임을 이미지로 변환하여 다운로드
      await this.downloadFrameAsImage(frame, time);
      
      // 진행률 표시
      const progress = ((i + 1) / totalFrames) * 100;
      this.showDownloadProgress(progress, i + 1, totalFrames);
      
      // 프레임 간 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.showDownloadStatus('프레임 다운로드 완료!', 'success');
  }

  // 프레임을 이미지로 다운로드
  async downloadFrameAsImage(frameNumber, time) {
    try {
      // 캔버스를 이미지로 변환
      const dataURL = this.renderCanvas.toDataURL('image/png');
      
      // 다운로드 링크 생성
      const a = this.renderWindow.document.createElement('a');
      a.href = dataURL;
      a.download = `frame_${frameNumber.toString().padStart(4, '0')}_${time.toFixed(2)}s.png`;
      a.style.display = 'none';
      this.renderWindow.document.body.appendChild(a);
      a.click();
      this.renderWindow.document.body.removeChild(a);
      
    } catch (error) {
      console.warn(`프레임 ${frameNumber} 다운로드 실패:`, error);
    }
  }

  // ZIP으로 프레임 다운로드 (JSZip 사용)
  async downloadFramesAsZip() {
    const totalFrames = Math.min(200, this.totalFrames); // 최대 200프레임
    const frameInterval = Math.max(1, Math.floor(this.totalFrames / totalFrames));
    
    console.log(`ZIP 프레임 다운로드: ${totalFrames}프레임`);
    
    const zip = new JSZip();
    const framesFolder = zip.folder('frames');
    
    for (let i = 0; i < totalFrames; i++) {
      const frame = i * frameInterval;
      const time = frame / this.fps;
      
      // 씬 상태 업데이트
      await this.updateSceneAtTime(time);
      
      // 씬 렌더링
      await this.renderSceneToCanvas();
      
      // 프레임을 이미지로 변환하여 ZIP에 추가
      const dataURL = this.renderCanvas.toDataURL('image/png');
      const base64Data = dataURL.split(',')[1];
      const fileName = `frame_${frame.toString().padStart(4, '0')}_${time.toFixed(2)}s.png`;
      
      framesFolder.file(fileName, base64Data, { base64: true });
      
      // 진행률 표시
      const progress = ((i + 1) / totalFrames) * 100;
      this.showDownloadProgress(progress, i + 1, totalFrames);
      
      // 프레임 간 지연
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    
    const a = this.renderWindow.document.createElement('a');
    a.href = url;
    a.download = `timeline_frames_${Date.now()}.zip`;
    a.style.display = 'none';
    this.renderWindow.document.body.appendChild(a);
    a.click();
    this.renderWindow.document.body.removeChild(a);
    
    // 메모리 정리
    URL.revokeObjectURL(url);
    
    this.showDownloadStatus('ZIP 프레임 다운로드 완료!', 'success');
  }

  // 현재 프레임 미리보기
  async previewCurrentFrame() {
    if (!this.previewScene) {
      console.error('미리보기 씬을 찾을 수 없습니다.');
      return;
    }

    console.log('현재 프레임 미리보기 시작...');
    
    try {
      const currentTime = this.currentFrame / this.fps;
      console.log(`현재 프레임: ${this.currentFrame}, 시간: ${currentTime.toFixed(2)}초`);
      
      // 씬 상태 업데이트
      await this.updateSceneAtTime(currentTime);
      
      // 씬을 캔버스에 렌더링
      await this.renderSceneToCanvas();
      
      console.log('현재 프레임 미리보기 완료');
      
      // 미리보기 상태 표시
      this.showPreviewStatus('현재 프레임 미리보기 완료', 'success');
      
    } catch (error) {
      console.error('현재 프레임 미리보기 중 오류 발생:', error);
      this.showPreviewStatus('미리보기 중 오류 발생', 'error');
    }
  }

  // 타임라인 미리보기
  async previewTimeline() {
    if (!this.previewScene) {
      console.error('미리보기 씬을 찾을 수 없습니다.');
      return;
    }

    console.log('타임라인 미리보기 시작...');
    
    try {
      // 빠른 미리보기를 위해 낮은 해상도로 설정
      const originalRendererSize = new THREE.Vector2();
      this.previewRenderer.getSize(originalRendererSize);
      const originalCameraAspect = this.previewCamera.aspect;

      const previewWidth = 640;
      const previewHeight = 360;
      this.previewRenderer.setSize(previewWidth, previewHeight);
      this.previewCamera.aspect = previewWidth / previewHeight;
      this.previewCamera.updateProjectionMatrix();

      // 미리보기용 프레임 수 제한 (성능 향상을 위해)
      const previewFrames = Math.min(60, this.totalFrames); // 최대 60프레임
      const frameInterval = Math.max(1, Math.floor(this.totalFrames / previewFrames));
      
      console.log(`미리보기 설정: ${previewFrames}프레임, ${frameInterval}프레임 간격`);

      // 미리보기 진행률 표시
      this.showPreviewProgress(0, previewFrames);

      // 애니메이션 미리보기 시작
      for (let i = 0; i < previewFrames; i++) {
        const frame = i * frameInterval;
        const time = frame / this.fps;
        
        this.showPreviewProgress(i + 1, previewFrames);
        this.showPreviewStatus(`미리보기 프레임 ${i + 1}/${previewFrames}: ${frame}프레임 (${time.toFixed(2)}초)`, 'info');
        
        await this.updateSceneAtTime(time);
        await this.renderSceneToCanvas(); // renderSceneToCanvasForPreview 대신 renderSceneToCanvas 사용
        
        await new Promise(resolve => setTimeout(resolve, 100)); // 시각적 확인을 위한 딜레이
      }

      // 원본 렌더러 및 카메라 설정 복원
      this.previewRenderer.setSize(originalRendererSize.width, originalRendererSize.height);
      this.previewCamera.aspect = originalCameraAspect;
      this.previewCamera.updateProjectionMatrix();

      console.log('타임라인 미리보기 완료');
      this.showPreviewStatus('타임라인 미리보기 완료!', 'success');
    } catch (error) {
      console.error('타임라인 미리보기 중 오류 발생:', error);
      this.showPreviewStatus('미리보기 중 오류 발생', 'error');
    }
  }

  // 미리보기 진행률 표시
  showPreviewProgress(current, total) {
    if (!this.renderWindow || this.renderWindow.closed) return;
    
    const doc = this.renderWindow.document;
    const progressElement = doc.getElementById('previewProgress');
    
    if (!progressElement) {
      // 진행률 표시 요소가 없으면 생성
      this.createPreviewProgressElement();
    }
    
    const progress = (current / total) * 100;
    const progressElement2 = doc.getElementById('previewProgress');
    if (progressElement2) {
      progressElement2.style.width = `${progress}%`;
      progressElement2.textContent = `${current}/${total} (${progress.toFixed(1)}%)`;
    }
  }

  // 미리보기 진행률 요소 생성
  createPreviewProgressElement() {
    if (!this.renderWindow || this.renderWindow.closed) return;
    
    const doc = this.renderWindow.document;
    const previewSection = doc.querySelector('.render-preview');
    
    if (previewSection) {
      const progressContainer = doc.createElement('div');
      progressContainer.style.cssText = `
        margin-top: 15px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
      `;
      
      const progressBar = doc.createElement('div');
      progressBar.id = 'previewProgress';
      progressBar.style.cssText = `
        width: 0%;
        height: 20px;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        color: white;
        text-align: center;
        line-height: 20px;
        font-size: 12px;
        transition: width 0.3s ease;
      `;
      progressBar.textContent = '0/0 (0%)';
      
      progressContainer.appendChild(progressBar);
      previewSection.appendChild(progressContainer);
    }
  }

  // 미리보기 상태 표시
  showPreviewStatus(message, type = 'info') {
    if (!this.renderWindow || this.renderWindow.closed) return;
    
    const doc = this.renderWindow.document;
    const previewSection = doc.querySelector('.render-preview');
    
    if (previewSection) {
      // 기존 상태 메시지 제거
      const existingStatus = previewSection.querySelector('.preview-status');
      if (existingStatus) {
        existingStatus.remove();
      }
      
      // 새 상태 메시지 생성
      const statusElement = doc.createElement('div');
      statusElement.className = 'preview-status';
      statusElement.style.cssText = `
        margin-top: 10px;
        padding: 8px 12px;
        border-radius: 4px;
        text-align: center;
        font-size: 14px;
        font-weight: bold;
      `;
      
      // 타입에 따른 스타일 설정
      switch (type) {
        case 'success':
          statusElement.style.background = '#4CAF50';
          statusElement.style.color = 'white';
          break;
        case 'error':
          statusElement.style.background = '#f44336';
          statusElement.style.color = 'white';
          break;
        case 'warning':
          statusElement.style.background = '#FF9800';
          statusElement.style.color = 'white';
          break;
        default:
          statusElement.style.background = '#2196F3';
          statusElement.style.color = 'white';
      }
      
      statusElement.textContent = message;
      previewSection.appendChild(statusElement);
      
      // 3초 후 자동으로 제거
      setTimeout(() => {
        if (statusElement.parentNode) {
          statusElement.remove();
        }
      }, 3000);
    }
  }

  // 미리보기 프레임 그리기
  drawPreviewFrame() {
    if (!this.renderContext) return;

    const canvas = this.renderCanvas;
    
    // 배경
    this.renderContext.fillStyle = '#000';
    this.renderContext.fillRect(0, 0, canvas.width, canvas.height);
    
    // 그리드
    this.renderContext.strokeStyle = '#333';
    this.renderContext.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += 50) {
      this.renderContext.beginPath();
      this.renderContext.moveTo(x, 0);
      this.renderContext.lineTo(x, canvas.height);
      this.renderContext.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += 50) {
      this.renderContext.beginPath();
      this.renderContext.moveTo(0, y);
      this.renderContext.lineTo(canvas.width, y);
      this.renderContext.stroke();
    }
    
    // 중앙 텍스트
    this.renderContext.fillStyle = '#4CAF50';
    this.renderContext.font = '24px Arial';
    this.renderContext.textAlign = 'center';
    this.renderContext.fillText('렌더링 미리보기', canvas.width / 2, canvas.height / 2);
    
    this.renderContext.font = '16px Arial';
    this.renderContext.fillStyle = '#888';
    this.renderContext.fillText(
      `${this.renderSettings.width} x ${this.renderSettings.height}`, 
      canvas.width / 2, 
      canvas.height / 2 + 30
    );
  }

  // 시간 포맷팅
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 정리
  dispose() {
    this.isRendering = false;
    if (this.renderWindow && !this.renderWindow.closed) {
      this.renderWindow.close();
    }
  }

  // 다운로드 상태 표시
  showDownloadStatus(message, type = 'info') {
    if (!this.renderWindow || this.renderWindow.closed) return;
    
    const doc = this.renderWindow.document;
    const downloadSection = doc.querySelector('.render-info:last-child');
    
    if (downloadSection) {
      // 기존 상태 메시지 제거
      const existingStatus = downloadSection.querySelector('.download-status');
      if (existingStatus) {
        existingStatus.remove();
      }
      
      // 새 상태 메시지 생성
      const statusElement = doc.createElement('div');
      statusElement.className = 'download-status';
      statusElement.style.cssText = `
        margin-top: 15px;
        padding: 8px 12px;
        border-radius: 4px;
        text-align: center;
        font-size: 14px;
        font-weight: bold;
      `;
      
      // 타입에 따른 스타일 설정
      switch (type) {
        case 'success':
          statusElement.style.background = '#4CAF50';
          statusElement.style.color = 'white';
          break;
        case 'error':
          statusElement.style.background = '#f44336';
          statusElement.style.color = 'white';
          break;
        case 'warning':
          statusElement.style.background = '#FF9800';
          statusElement.style.color = 'white';
          break;
        default:
          statusElement.style.background = '#2196F3';
          statusElement.style.color = 'white';
      }
      
      statusElement.textContent = message;
      downloadSection.appendChild(statusElement);
      
      // 5초 후 자동으로 제거
      setTimeout(() => {
        if (statusElement.parentNode) {
          statusElement.remove();
        }
      }, 5000);
    }
  }

  // 다운로드 진행률 표시
  showDownloadProgress(progress, current, total) {
    if (!this.renderWindow || this.renderWindow.closed) return;
    
    const doc = this.renderWindow.document;
    const downloadSection = doc.querySelector('.render-info:last-child');
    
    if (downloadSection) {
      // 기존 진행률 표시 제거
      const existingProgress = downloadSection.querySelector('.download-progress');
      if (existingProgress) {
        existingProgress.remove();
      }
      
      // 새 진행률 표시 생성
      const progressContainer = doc.createElement('div');
      progressContainer.className = 'download-progress';
      progressContainer.style.cssText = `
        margin-top: 15px;
        background: #333;
        border-radius: 4px;
        overflow: hidden;
      `;
      
      const progressBar = doc.createElement('div');
      progressBar.style.cssText = `
        width: ${progress}%;
        height: 20px;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        color: white;
        text-align: center;
        line-height: 20px;
        font-size: 12px;
        transition: width 0.3s ease;
      `;
      progressBar.textContent = `${current}/${total} (${progress.toFixed(1)}%)`;
      
      progressContainer.appendChild(progressBar);
      downloadSection.appendChild(progressContainer);
    }
  }

  // 애니메이션 디버깅 정보 표시
  showAnimationDebugInfo() {
    if (!this.previewScene) {
      console.log('미리보기 씬이 아직 생성되지 않았습니다.');
      return;
    }
    
    const scene = this.previewScene;
    let animationObjects = 0;
    let totalObjects = 0;
    
    scene.traverse((object) => {
      totalObjects++;
      
      if (object.userData && (
        object.userData.animations || 
        object.userData.keyframes || 
        object.userData.positionAnimation || 
        object.userData.rotationAnimation || 
        object.userData.scaleAnimation
      )) {
        animationObjects++;
        console.log(`애니메이션 객체 발견:`, {
          name: object.name || 'unnamed',
          type: object.type,
          userData: object.userData,
          animations: object.animations ? object.animations.length : 0
        });
      }
    });
    
    console.log(`미리보기 씬 애니메이션 디버깅 정보: 총 ${totalObjects}개 객체 중 ${animationObjects}개가 애니메이션 포함`);
    
    // 타임라인 정보도 표시
    if (this.editor.motionTimeline) {
      console.log('MotionTimeline 상태:', {
        currentTime: this.editor.motionTimeline.currentTime,
        hasUpdateAnimation: typeof this.editor.motionTimeline.updateAnimation === 'function',
        hasUpdateFrame: typeof this.editor.motionTimeline.updateFrame === 'function'
      });
    }
    
    if (this.editor.lightTimeline) {
      console.log('LightTimeline 상태:', {
        currentTime: this.editor.lightTimeline.currentTime,
        hasUpdateAnimation: typeof this.editor.lightTimeline.updateAnimation === 'function',
        hasUpdateFrame: typeof this.editor.lightTimeline.updateFrame === 'function'
      });
    }
    
    if (this.editor.audioTimeline) {
      console.log('AudioTimeline 상태:', {
        currentTime: this.editor.audioTimeline.currentTime
      });
    }
  }

  // MotionTimeline 애니메이션을 미리보기 씬에 적용
  applyMotionTimelineToPreview(time) {
    if (!this.editor.motionTimeline || !this.previewScene) return;
    
    try {
      console.log('MotionTimeline 애니메이션 적용 시작:', time);
      
      // MotionTimeline의 TimelineData에서 직접 애니메이션 데이터 가져오기
      if (this.editor.motionTimeline.timelineData) {
        const timelineData = this.editor.motionTimeline.timelineData;
        console.log('TimelineData 발견:', timelineData);
        
        // 모든 트랙에 대해 애니메이션 적용
        timelineData.getAllTracksByUuid().forEach((trackInfo, trackKey) => {
          const objectUuid = trackKey.split('_')[0];
          const property = trackKey.split('_')[1];
          
          // 미리보기 씬에서 해당 객체 찾기
          let previewObject = null;
          this.previewScene.traverse((object) => {
            if (object.uuid === objectUuid) {
              previewObject = object;
            }
          });
          
          if (!previewObject) {
            console.log(`미리보기 씬에서 객체를 찾을 수 없습니다: ${objectUuid}`);
            return;
          }
          
          // TrackData에서 현재 시간에 맞는 값 가져오기
          const trackData = timelineData.getObjectTracks(objectUuid);
          if (trackData && trackData.has(property)) {
            const propertyTrack = trackData.get(property);
            const value = propertyTrack.getValueAtTime(time);
            
            if (value !== null && value !== undefined) {
              console.log(`애니메이션 적용: ${objectUuid} ${property} =`, value);
              this.applyValueToPreviewObject(previewObject, property, value);
            }
          }
        });
      }
      
      // 또는 기존 방식으로 원본 씬의 상태를 미리보기 씬에 복사
      this.previewScene.traverse((object) => {
        if (this.editor.scene) {
          const originalObject = this.editor.scene.getObjectByProperty('name', object.name);
          if (originalObject) {
            // 원본 객체의 현재 상태를 미리보기 객체에 복사
            object.position.copy(originalObject.position);
            object.rotation.copy(originalObject.rotation);
            object.scale.copy(originalObject.scale);
          }
        }
      });
      
      console.log('MotionTimeline 애니메이션 미리보기 씬에 적용 완료');
    } catch (error) {
      console.warn('MotionTimeline 애니메이션 적용 중 오류:', error);
    }
  }

  // LightTimeline 애니메이션을 미리보기 씬에 적용
  applyLightTimelineToPreview(time) {
    if (!this.editor.lightTimeline || !this.previewScene) return;
    
    try {
      console.log('LightTimeline 애니메이션 적용 시작:', time);
      
      // LightTimeline의 TimelineData에서 직접 애니메이션 데이터 가져오기
      if (this.editor.lightTimeline.timelineData) {
        const timelineData = this.editor.lightTimeline.timelineData;
        console.log('LightTimeline TimelineData 발견:', timelineData);
        
        // 모든 트랙에 대해 애니메이션 적용
        timelineData.getAllTracksByUuid().forEach((trackInfo, trackKey) => {
          const objectUuid = trackKey.split('_')[0];
          const property = trackKey.split('_')[1];
          
          // 미리보기 씬에서 해당 조명 객체 찾기
          let previewObject = null;
          this.previewScene.traverse((object) => {
            if (object.uuid === objectUuid && object.isLight) {
              previewObject = object;
            }
          });
          
          if (!previewObject) {
            console.log(`미리보기 씬에서 조명 객체를 찾을 수 없습니다: ${objectUuid}`);
            return;
          }
          
          // TrackData에서 현재 시간에 맞는 값 가져오기
          const trackData = timelineData.getObjectTracks(objectUuid);
          if (trackData && trackData.has(property)) {
            const propertyTrack = trackData.get(property);
            const value = propertyTrack.getValueAtTime(time);
            
            if (value !== null && value !== undefined) {
              console.log(`조명 애니메이션 적용: ${objectUuid} ${property} =`, value);
              this.applyLightValueToPreviewObject(previewObject, property, value);
            }
          }
        });
      }
      
    } catch (error) {
      console.warn('LightTimeline 애니메이션 적용 중 오류:', error);
    }
  }

  // 미리보기 씬의 모든 객체에 애니메이션 업데이트 적용
  updatePreviewSceneObjects(time) {
    if (!this.previewScene) return;

    const scene = this.previewScene;
    let updatedObjects = 0;
    
    // 미리보기 씬의 모든 객체를 순회하며 애니메이션 업데이트
    scene.traverse((object) => {
      let objectUpdated = false;
      
      // 사용자 정의 애니메이션이 있는 경우
      if (object.userData && object.userData.animations) {
        this.updatePreviewObjectAnimation(object, time);
        objectUpdated = true;
      }
      
      // 키프레임 애니메이션이 있는 경우
      if (object.userData && object.userData.keyframes) {
        this.updatePreviewObjectKeyframes(object, time);
        objectUpdated = true;
      }
      
      // Three.js 기본 애니메이션 클립이 있는 경우
      if (object.animations && object.animations.length > 0) {
        this.updatePreviewObjectAnimations(object, time);
        objectUpdated = true;
      }
      
      // 위치, 회전, 크기 애니메이션이 있는 경우
      if (object.userData && (object.userData.positionAnimation || object.userData.rotationAnimation || object.userData.scaleAnimation)) {
        this.updatePreviewObjectTransformAnimation(object, time);
        objectUpdated = true;
      }
      
      if (objectUpdated) {
        updatedObjects++;
      }
    });
    
    console.log(`미리보기 씬 애니메이션 업데이트 완료: ${updatedObjects}개 객체`);
  }

  // 미리보기 씬용 Three.js 기본 애니메이션 클립 업데이트
  updatePreviewObjectAnimations(object, time) {
    try {
      if (object.animations && object.animations.length > 0) {
        object.animations.forEach(animation => {
          if (animation.duration > 0) {
            // 애니메이션 시간을 0-1 범위로 정규화
            const normalizedTime = (time % animation.duration) / animation.duration;
            
            // 애니메이션 클립 실행
            if (animation.tracks && animation.tracks.length > 0) {
              animation.tracks.forEach(track => {
                if (track.name === '.position') {
                  const position = track.getValueAtTime(normalizedTime * animation.duration);
                  if (position && position.length >= 3) {
                    object.position.set(position[0], position[1], position[2]);
                  }
                } else if (track.name === '.rotation') {
                  const rotation = track.getValueAtTime(normalizedTime * animation.duration);
                  if (rotation && rotation.length >= 4) {
                    object.quaternion.set(rotation[0], rotation[1], rotation[2], rotation[3]);
                  }
                } else if (track.name === '.scale') {
                  const scale = track.getValueAtTime(normalizedTime * animation.duration);
                  if (scale && scale.length >= 3) {
                    object.scale.set(scale[0], scale[1], scale[2]);
                  }
                }
              });
            }
          }
        });
      }
    } catch (error) {
      console.warn('미리보기 씬 객체 기본 애니메이션 업데이트 중 오류:', error);
    }
  }

  // 미리보기 씬용 객체의 변환 애니메이션 업데이트
  updatePreviewObjectTransformAnimation(object, time) {
    try {
      // 위치 애니메이션
      if (object.userData.positionAnimation) {
        const posAnim = object.userData.positionAnimation;
        if (posAnim.keyframes && posAnim.keyframes.length > 0) {
          this.interpolatePreviewPosition(object, posAnim.keyframes, time);
        }
      }
      
      // 회전 애니메이션
      if (object.userData.rotationAnimation) {
        const rotAnim = object.userData.rotationAnimation;
        if (rotAnim.keyframes && rotAnim.keyframes.length > 0) {
          this.interpolatePreviewRotation(object, rotAnim.keyframes, time);
        }
      }
      
      // 크기 애니메이션
      if (object.userData.scaleAnimation) {
        const scaleAnim = object.userData.scaleAnimation;
        if (scaleAnim.keyframes && scaleAnim.keyframes.length > 0) {
          this.interpolatePreviewScale(object, scaleAnim.keyframes, time);
        }
      }
    } catch (error) {
      console.warn('미리보기 씬 객체 변환 애니메이션 업데이트 중 오류:', error);
    }
  }

  // 미리보기 씬용 객체의 사용자 정의 애니메이션 업데이트
  updatePreviewObjectAnimation(object, time) {
    try {
      const animations = object.userData.animations;
      if (Array.isArray(animations)) {
        animations.forEach(anim => {
          if (anim.type === 'position' && anim.keyframes) {
            this.interpolatePreviewPosition(object, anim.keyframes, time);
          } else if (anim.type === 'rotation' && anim.keyframes) {
            this.interpolatePreviewRotation(object, anim.keyframes, time);
          } else if (anim.type === 'scale' && anim.keyframes) {
            this.interpolatePreviewScale(object, anim.keyframes, time);
          }
        });
      }
    } catch (error) {
      console.warn('미리보기 씬 객체 애니메이션 업데이트 중 오류:', error);
    }
  }

  // 미리보기 씬용 객체의 키프레임 애니메이션 업데이트
  updatePreviewObjectKeyframes(object, time) {
    try {
      const keyframes = object.userData.keyframes;
      if (Array.isArray(keyframes) && keyframes.length > 0) {
        // 시간에 맞는 키프레임 찾기
        const currentKeyframe = this.findCurrentKeyframe(keyframes, time);
        if (currentKeyframe) {
          // 키프레임 값 적용
          if (currentKeyframe.position) {
            object.position.copy(currentKeyframe.position);
          }
          if (currentKeyframe.rotation) {
            object.rotation.copy(currentKeyframe.rotation);
          }
          if (currentKeyframe.scale) {
            object.scale.copy(currentKeyframe.scale);
          }
        }
      }
    } catch (error) {
      console.warn('미리보기 씬 객체 키프레임 업데이트 중 오류:', error);
    }
  }

  // 미리보기 씬용 위치 보간
  interpolatePreviewPosition(object, keyframes, time) {
    if (keyframes.length < 2) return;
    
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    const currentKeyframe = this.findCurrentKeyframe(sortedKeyframes, time);
    const nextKeyframe = sortedKeyframes.find(k => k.time > time);
    
    if (currentKeyframe && nextKeyframe) {
      const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
      object.position.lerpVectors(currentKeyframe.position, nextKeyframe.position, t);
    } else if (currentKeyframe) {
      object.position.copy(currentKeyframe.position);
    }
  }

  // 미리보기 씬용 회전 보간
  interpolatePreviewRotation(object, keyframes, time) {
    if (keyframes.length < 2) return;
    
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    const currentKeyframe = this.findCurrentKeyframe(sortedKeyframes, time);
    const nextKeyframe = sortedKeyframes.find(k => k.time > time);
    
    if (currentKeyframe && nextKeyframe) {
      const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
      object.quaternion.slerpQuaternions(currentKeyframe.rotation, nextKeyframe.rotation, t);
    } else if (currentKeyframe) {
      object.quaternion.copy(currentKeyframe.rotation);
    }
  }

  // 미리보기 씬용 크기 보간
  interpolatePreviewScale(object, keyframes, time) {
    if (keyframes.length < 2) return;
    
    const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
    const currentKeyframe = this.findCurrentKeyframe(sortedKeyframes, time);
    const nextKeyframe = sortedKeyframes.find(k => k.time > time);
    
    if (currentKeyframe && nextKeyframe) {
      const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
      object.scale.lerpVectors(currentKeyframe.scale, nextKeyframe.scale, t);
    } else if (currentKeyframe) {
      object.scale.copy(currentKeyframe.scale);
    }
  }

  // 키프레임 애니메이션을 객체에 적용
  applyKeyframeAnimationToObject(obj, time) {
    try {
      if (!obj.animation || !obj.animation.keyframes) return;
      
      const keyframes = obj.animation.keyframes;
      if (keyframes.length === 0) return;
      
      // 시간순으로 정렬
      const sortedKeyframes = keyframes.sort((a, b) => a.time - b.time);
      
      // 현재 시간에 맞는 키프레임 찾기
      let currentKeyframe = sortedKeyframes[0];
      let nextKeyframe = null;
      
      for (let i = 0; i < sortedKeyframes.length; i++) {
        if (sortedKeyframes[i].time <= time) {
          currentKeyframe = sortedKeyframes[i];
          if (i + 1 < sortedKeyframes.length) {
            nextKeyframe = sortedKeyframes[i + 1];
          }
        } else {
          break;
        }
      }
      
      // 미리보기 씬에서 해당 객체 찾기
      let previewObject = null;
      this.previewScene.traverse((object) => {
        if (object.name === obj.name || object.uuid === obj.uuid) {
          previewObject = object;
        }
      });
      
      if (!previewObject) return;
      
      // 키프레임 값 적용
      if (currentKeyframe.position) {
        if (nextKeyframe && nextKeyframe.position) {
          // 보간 적용
          const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
          previewObject.position.lerpVectors(
            new THREE.Vector3().copy(currentKeyframe.position),
            new THREE.Vector3().copy(nextKeyframe.position),
            t
          );
        } else {
          previewObject.position.copy(currentKeyframe.position);
        }
      }
      
      if (currentKeyframe.rotation) {
        if (nextKeyframe && nextKeyframe.rotation) {
          // 회전 보간
          const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
          previewObject.quaternion.slerpQuaternions(
            new THREE.Quaternion().copy(currentKeyframe.rotation),
            new THREE.Quaternion().copy(nextKeyframe.rotation),
            t
          );
        } else {
          previewObject.quaternion.copy(currentKeyframe.rotation);
        }
      }
      
      if (currentKeyframe.scale) {
        if (nextKeyframe && nextKeyframe.scale) {
          // 크기 보간
          const t = (time - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
          previewObject.scale.lerpVectors(
            new THREE.Vector3().copy(currentKeyframe.scale),
            new THREE.Vector3().copy(nextKeyframe.scale),
            t
          );
        } else {
          previewObject.scale.copy(currentKeyframe.scale);
        }
      }
      
    } catch (error) {
      console.warn('키프레임 애니메이션 적용 중 오류:', error);
    }
  }

  // 미리보기 씬의 객체에 애니메이션 값 적용
  applyValueToPreviewObject(object, property, value) {
    try {
      switch (property) {
        case 'position':
          if (value && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.z === 'number') {
            object.position.set(value.x, value.y, value.z);
            console.log(`위치 업데이트: ${object.name}`, value);
          }
          break;
          
        case 'rotation':
          if (value && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.z === 'number') {
            object.rotation.set(value.x, value.y, value.z);
            console.log(`회전 업데이트: ${object.name}`, value);
          }
          break;
          
        case 'scale':
          if (value && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.z === 'number') {
            object.scale.set(value.x, value.y, value.z);
            console.log(`크기 업데이트: ${object.name}`, value);
          }
          break;
          
        case 'quaternion':
          if (value && typeof value.x === 'number' && typeof value.y === 'number' && 
              typeof value.z === 'number' && typeof value.w === 'number') {
            object.quaternion.set(value.x, value.y, value.z, value.w);
            console.log(`쿼터니언 업데이트: ${object.name}`, value);
          }
          break;
          
        default:
          console.log(`알 수 없는 속성: ${property}`, value);
      }
    } catch (error) {
      console.warn(`애니메이션 값 적용 중 오류 (${property}):`, error);
    }
  }

  // 미리보기 씬의 조명 객체에 애니메이션 값 적용
  applyLightValueToPreviewObject(object, property, value) {
    try {
      switch (property) {
        case 'intensity':
          if (typeof value === 'number') {
            object.intensity = value;
            console.log(`조명 강도 업데이트: ${object.name}`, value);
          }
          break;
          
        case 'color':
          if (value && typeof value.r === 'number' && typeof value.g === 'number' && typeof value.b === 'number') {
            object.color.setRGB(value.r, value.g, value.b);
            console.log(`조명 색상 업데이트: ${object.name}`, value);
          }
          break;
          
        case 'position':
          if (value && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.z === 'number') {
            object.position.set(value.x, value.y, value.z);
            console.log(`조명 위치 업데이트: ${object.name}`, value);
          }
          break;
          
        case 'rotation':
          if (value && typeof value.x === 'number' && typeof value.y === 'number' && typeof value.z === 'number') {
            object.rotation.set(value.x, value.y, value.z);
            console.log(`조명 회전 업데이트: ${object.name}`, value);
          }
          break;
          
        default:
          console.log(`알 수 없는 조명 속성: ${property}`, value);
      }
    } catch (error) {
      console.warn(`조명 애니메이션 값 적용 중 오류 (${property}):`, error);
    }
  }
}
