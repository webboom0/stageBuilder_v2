import { UITabbedPanel, UISpan, UIDiv, UIButton, UIInteger, UIBreak, UIText, UISelect } from "./libs/ui.js";
import { createPanel } from './ui/floatPanel.js';
import { createAudioPanel } from './SidebarAssets.audio.js';
import { createMotionPanel } from './SidebarAssets.motion.js';

function SidebarAssets(editor) {
  const container = new UIDiv();
  container.setId("sidebar-assets");
  container.setClass("sidebar-panel");

  // Assets 패널 헤더
  const header = new UIDiv();
  header.setClass("panel-header");
  header.add(new UIText("Assets"));

  // Assets 컨텐츠 영역
  const content = new UIDiv();
  content.setClass("panel-content");

  // 🎵 오디오 패널 생성
  const audioPanel = createAudioPanel(editor);
  
  // 🎬 모션 패널 생성
  const motionPanel = createMotionPanel(editor);

  

  // CSS 스타일 추가 (두 패널 모두에 적용)
  const style = document.createElement('style');
  style.textContent = `
    /* 공통 스타일 */
    .audio-list-container, .fbx-list-container {
      max-height: 300px;
      overflow-y: auto;
      border-radius: 0px;
      padding: 0px !important;
      gap: 0 !important;
    }
    
    .audio-item, .fbx-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px !important;
      margin-bottom: 0 !important;
    }
    
    .audio-info, .fbx-info {
      display: flex;
      flex-direction: column;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      padding-right: 30px;
      width: 80%;
      gap: 0 !important;
    }
    
    .audio-name, .fbx-name {
      font-weight: bold;
      color: #fff;
    }
    
    .audio-filename, .fbx-filename {
      font-size: 11px;
      color: #aaa;
      margin-top: 2px;
    }
    
    .no-files-message {
      text-align: center;
      color: #666;
      padding: 20px;
    }
    
    .no-files-message p {
      margin: 5px 0;
    }
    
    /* 업로드 관련 스타일 */
    .upload-section {
      margin: 10px 0;
      padding: 15px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      background-color: #fafafa;
      text-align: center;
    }
    
    .upload-section:hover {
      border-color: #4CAF50;
      background-color: #f0f8f0;
    }
    
    .upload-progress {
      margin-top: 10px;
      padding: 10px;
      background-color: #e3f2fd;
      border-radius: 4px;
      border: 1px solid #2196f3;
    }
    
    .progress-text {
      margin-bottom: 8px;
      color: #1976d2;
      font-weight: bold;
    }
    
    .progress-bar {
      width: 100%;
      height: 20px;
      background-color: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
    }
    
    .progress-fill {
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #45a049);
      animation: progress-animation 2s ease-in-out infinite;
    }
    
    @keyframes progress-animation {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0%); }
      100% { transform: translateX(100%); }
    }
    
    .upload-success {
      margin-top: 10px;
      padding: 10px;
      background-color: #e8f5e8;
      border-radius: 4px;
      border: 1px solid #4CAF50;
      color: #2e7d32;
      font-weight: bold;
    }
    
    .upload-error {
      margin-top: 10px;
      padding: 10px;
      background-color: #ffebee;
      border-radius: 4px;
      border: 1px solid #f44336;
      color: #c62828;
      font-weight: bold;
    }

    .floating-panel .Text {
      display: none !important;
    }
     
    /* 선택된 항목 스타일 */
    .audio-item, .fbx-item {
      cursor: pointer;
      transition: all 0.2s ease;
    }
     
    .audio-item:hover, .fbx-item:hover {
      background-color: #f0f0f0;
    }
     
    .audio-item.selected, .fbx-item.selected {
      background-color: #fff !important;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
    }
    
    .audio-item.selected .audio-info > *,
    .fbx-item.selected .fbx-info > * {
      color: #333 !important;
    }
     
    /* 오디오/모션 트랙 추가 성공/실패 메시지 스타일 */
    .add-success-message {
      margin: 10px 0;
      padding: 15px;
      background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
      border-radius: 8px;
      border: 2px solid rgba(255,255,255,.1);
      color: #fff;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 4px 12px #444;
      animation: slideIn 0.5s ease-out;
    }
     
    .add-success-message .success-text {
      font-size: 12px;
      margin-bottom: 8px;
    }
     
    .add-success-message .success-detail {
      font-size: 10px;
      color: #666;
      font-weight: normal;
    }
     
    @keyframes slideIn {
      0% { transform: translateY(-20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
     
    .add-error-message {
      margin: 10px 0;
      padding: 10px;
      background-color: #ffebee;
      border-radius: 4px;
      border: 1px solid #f44336;
      color: #c62828;
      font-weight: bold;
      text-align: center;
    }

    .panel-footer {
      display: flex;
      gap: 2px;
      background: #444444;
      border-top: solid 1px #333;
      padding: 5px;
    }
    
    .panel-footer .Button {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
  `;
  document.head.appendChild(style);

  // �� 오디오 패널을 floatPanel로 생성
  const audioFloatPanel = createPanel('Sound', audioPanel);
  
  // �� 모션 패널을 floatPanel로 생성
  const motionFloatPanel = createPanel('Motion', motionPanel);

  // sidebar-assets 컨테이너에 두 패널 추가
  const sidebarAssetsContainer = document.querySelector('#sidebar-assets');
  if (sidebarAssetsContainer) {
    sidebarAssetsContainer.appendChild(audioFloatPanel);
    sidebarAssetsContainer.appendChild(motionFloatPanel);
  }

  return container;
}

export { SidebarAssets };