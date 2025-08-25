import { UITabbedPanel, UISpan, UIDiv, UIButton, UIInteger, UIBreak, UIText, UISelect } from "./libs/ui.js";
import { createPanel } from './ui/floatPanel.js';
import { getApiUrl, AUDIO_UPLOAD_CONFIG } from "./config/audio-upload-config.js";

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

  // Sound 패널
  const soundPanel = new UIDiv();
  soundPanel.setClass("sound-panel");
  
  // Sound 패널 컨텐츠
  const soundContent = new UIDiv();
  soundContent.setClass("panel-content");
  soundPanel.add(soundContent);
  
  // Sound 패널 푸터
  const soundFooter = new UIDiv();
  soundFooter.setClass("panel-footer");
  soundPanel.add(soundFooter);
  // 음악 파일 목록을 동적으로 로드하는 함수
  async function loadAudioFilesFromFolder() {
    try {
      console.log("음악 폴더 스캔 시작...");

      // 서버에서 음악 파일 목록 가져오기
      const response = await fetch(getApiUrl(AUDIO_UPLOAD_CONFIG.ENDPOINTS.GET_FILES));

      if (response.ok) {
        const audioFiles = await response.json();
        console.log("서버에서 로드된 음악 파일:", audioFiles);

        // 서버에서 받은 데이터를 그대로 사용 (이미 올바른 형식)
        const processedFiles = audioFiles.map(file => {
          console.log("처리 중인 파일:", file);
          return {
            path: `..${file.path}`, // 상대 경로로 변환
            name: file.name,
            displayName: file.displayName,
            filename: file.filename // 실제 파일명 (확장자 포함)
          };
        });

        console.log("처리된 파일 목록:", processedFiles);
        return processedFiles;
      } else {
        console.warn("서버에서 음악 파일 목록을 가져올 수 없습니다. 기본 목록 사용");
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      console.error("음악 폴더 스캔 실패:", error);

      // 기본 파일 목록 반환
      return [
        {
          path: "../files/music/SUJESHUN.mp3",
          name: "SUJESHUN",
          displayName: "수제순"
        },
        {
          path: "../files/music/DRAMA.mp3",
          name: "DRAMA",
          displayName: "드라마"
        }
      ];
    }
  }

  // 선택된 음악 항목을 추적하는 변수
  let selectedAudioItem = null;
  
  // 선택 해제 함수
  function clearSelection() {
    if (selectedAudioItem) {
      selectedAudioItem.classList.remove('selected');
      selectedAudioItem = null;
      updateDeleteButton();
      console.log("🎵 음악 항목 선택 해제됨");
    }
  }
  
  // 문서 전체 클릭 이벤트 (선택 해제용)
  function setupGlobalClickHandler() {
    document.addEventListener('click', (event) => {
      // audio-item이나 관련 버튼을 클릭한 경우는 제외
      if (event.target.closest('.audio-item') || 
          event.target.closest('.delete-audio-btn') ||
          event.target.closest('.add-audio-btn')) {
        return;
      }
      
      // 다른 곳을 클릭하면 선택 해제
      clearSelection();
    });
  }
  
  // 휴지통 버튼 생성 및 관리
  function createDeleteButton() {
    const deleteBtn = new UIButton("");
    deleteBtn.setInnerHTML("<i class='fas fa-trash'></i>");
    deleteBtn.setClass("Button");
    deleteBtn.onClick(async () => {
      if (selectedAudioItem) {
        await deleteSelectedAudio();
      } else {
        alert("삭제할 음악을 선택해주세요.");
      }
    });
    return deleteBtn;
  }
  
  // 삭제 버튼 상태 업데이트
  function updateDeleteButton() {
    const deleteBtn = soundPanel.dom.querySelector('.delete-audio-btn');
    if (deleteBtn && deleteBtn.dom) {
      if (selectedAudioItem) {
        deleteBtn.dom.disabled = false;
        deleteBtn.dom.style.opacity = "1";
        const filename = selectedAudioItem.dataset.filename;
        deleteBtn.dom.textContent = `🗑️ ${filename} 삭제`;
      } else {
        deleteBtn.dom.disabled = true;
        deleteBtn.dom.style.opacity = "0.5";
        deleteBtn.dom.textContent = "🗑️ 삭제";
      }
    } else {
      console.log("🔍 휴지통 버튼을 찾을 수 없습니다. 아직 생성되지 않았을 수 있습니다.");
    }
  }
  
  // 선택된 음악 파일 삭제
  async function deleteSelectedAudio() {
    if (!selectedAudioItem) {
      alert("삭제할 음악을 선택해주세요.");
      return;
    }
    
    const filename = selectedAudioItem.dataset.filename;
    const displayName = selectedAudioItem.querySelector('.audio-name').textContent;
    
    if (!confirm(`정말로 "${displayName}" (${filename}) 파일을 삭제하시겠습니까?`)) {
      return;
    }
    
    try {
      console.log("🗑️ 음악 파일 삭제 시작:", filename);
      
             // 서버에 삭제 요청 (서버의 실제 엔드포인트와 맞춤)
       const response = await fetch(getApiUrl(`/api/audio-files/${encodeURIComponent(filename)}`), {
         method: 'DELETE',
         mode: 'cors',
         credentials: 'omit'
       });
      
      if (response.ok) {
        console.log("✅ 음악 파일 삭제 성공:", filename);
        alert(`"${displayName}" 파일이 삭제되었습니다.`);
        
                 // 선택 상태 초기화
         clearSelection();
        
        // 목록 새로고침
        await displayAudioList();
      } else {
        const errorText = await response.text();
        console.error("❌ 음악 파일 삭제 실패:", response.status, errorText);
        alert(`파일 삭제에 실패했습니다. (HTTP ${response.status})`);
      }
      
    } catch (error) {
      console.error("❌ 음악 파일 삭제 중 오류:", error);
      alert(`파일 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  // 음악 목록 표시 함수
  async function displayAudioList() {
    const audioListContainer = soundPanel.dom.querySelector('.audio-list-container');
    if (!audioListContainer) {
      console.error("❌ audioListContainer를 찾을 수 없습니다");
      return;
    }

    console.log("📋 기존 목록 제거 중...");
    // 기존 목록 제거
    audioListContainer.innerHTML = '';
    
    // 선택 상태 초기화
    clearSelection();

    try {
      console.log("📡 음악 파일 목록 로드 중...");
      const audioFiles = await loadAudioFilesFromFolder();
      console.log("📥 로드된 음악 파일 수:", audioFiles ? audioFiles.length : 0);

      if (!audioFiles || audioFiles.length === 0) {
        console.log("📝 음악 파일이 없음 - 안내 메시지 표시");
        const noFilesMessage = document.createElement("div");
        noFilesMessage.className = "no-files-message";
        noFilesMessage.innerHTML = `
          <p>사용 가능한 음악 파일이 없습니다.</p>
          <p>files/music 폴더에 음악 파일을 추가해주세요.</p>
        `;
        audioListContainer.appendChild(noFilesMessage);
        return;
      }

      console.log("🔧 음악 목록 UI 생성 중...");
      audioFiles.forEach((audioFile, index) => {
        console.log(`📁 음악 ${index + 1}:`, audioFile.displayName);

        const audioItem = document.createElement("div");
        audioItem.className = "audio-item";
        audioItem.dataset.filename = audioFile.filename || audioFile.name;
        audioItem.innerHTML = `
          <div class="audio-info">
            <span class="audio-name">${audioFile.displayName}</span>
            <span class="audio-filename">${audioFile.filename || audioFile.name}</span>
          </div>
          <button class="add-audio-btn" title="오디오 타임라인에 트랙 추가">
            <i class="fas fa-plus"></i>
          </button>
        `;

        // 음악 항목 클릭 이벤트 (선택)
        audioItem.addEventListener("click", (event) => {
          // 버튼 클릭은 제외
          if (event.target.closest('.add-audio-btn')) {
            return;
          }
          
          // 기존 선택 해제
          if (selectedAudioItem) {
            selectedAudioItem.classList.remove('selected');
          }
          
                  // 새 항목 선택
        selectedAudioItem = audioItem;
        audioItem.classList.add('selected');
        
        // 휴지통 버튼 상태 업데이트
        try {
          updateDeleteButton();
        } catch (error) {
          console.log("🔍 휴지통 버튼 상태 업데이트 실패:", error.message);
        }
        
        console.log("🎵 음악 항목 선택됨:", audioFile.displayName);
        });

        // 추가 버튼 클릭 이벤트
        const addBtn = audioItem.querySelector(".add-audio-btn");
        if (addBtn) {
          console.log(`🔘 음악 ${index + 1}의 추가 버튼 이벤트 리스너 연결`);
          
          // 중복 추가 방지를 위한 상태 추적
          let isAdding = false;
          
          addBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (isAdding) {
              console.log("이미 추가 중입니다...");
              return;
            }
            
            console.log("🎵 오디오 트랙에 음악 추가 시작:", audioFile.displayName);
            
            // 버튼 상태 변경
            isAdding = true;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 추가 중...';
            addBtn.disabled = true;
            addBtn.classList.add('adding');
            
                         try {
               // 디버깅 정보 출력
               console.log("🔍 Editor 객체 상태 확인:");
               console.log("  - editor 존재:", !!editor);
               console.log("  - editor 타입:", typeof editor);
               console.log("  - editor 키들:", editor ? Object.keys(editor) : "undefined");
               console.log("  - audioTimeline 존재:", editor && !!editor.audioTimeline);
               console.log("  - audioTimeline 타입:", editor && editor.audioTimeline ? typeof editor.audioTimeline : "undefined");
               console.log("  - audioTimeline 키들:", editor && editor.audioTimeline ? Object.keys(editor.audioTimeline) : "undefined");
               
               // 오디오 트랙에 음악 추가
               if (editor && editor.audioTimeline) {
                 // addAudioFromAsset 메서드 사용 (AudioTimeline.js에 구현됨)
                 if (editor.audioTimeline.addAudioFromAsset) {
                   console.log("🎯 addAudioFromAsset 메서드 호출 시도:", audioFile.displayName);
                   await editor.audioTimeline.addAudioFromAsset(audioFile);
                   console.log("✅ 오디오 트랙에 음악 추가 성공:", audioFile.displayName);
                   
                                     // 성공 피드백
                  showAddSuccess(audioFile.displayName);
                  
                  // 버튼을 체크 표시로 변경 (추가 완료 표시)
                  addBtn.classList.remove('adding');
                  addBtn.classList.add('success');
                  addBtn.innerHTML = '<i class="fas fa-check"></i> 추가됨';
                  
                  // 3초 후 원래 상태로 복원
                  setTimeout(() => {
                    addBtn.innerHTML = '<i class="fas fa-plus"></i>';
                    addBtn.classList.remove('success');
                    addBtn.disabled = false;
                    isAdding = false;
                  }, 3000);
                   
                 } else {
                   throw new Error("AudioTimeline에 addAudioFromAsset 메서드가 없습니다.");
                 }
               } else {
                 // 더 자세한 오류 정보 제공
                 if (!editor) {
                   throw new Error("editor 객체가 전달되지 않았습니다.");
                 } else if (!editor.audioTimeline) {
                   throw new Error("editor.audioTimeline이 초기화되지 않았습니다. AudioTimeline 컴포넌트가 로드되었는지 확인해주세요.");
                 }
               }
              
            } catch (error) {
              console.error("❌ 오디오 트랙 추가 실패:", error);
              
              // 오류 피드백
              showAddError(audioFile.displayName, error.message);
              
              // 버튼 상태 복원
              addBtn.innerHTML = '<i class="fas fa-plus"></i>';
              addBtn.classList.remove('adding');
              addBtn.disabled = false;
              isAdding = false;
            }
          });
        } else {
          console.error(`❌ 음악 ${index + 1}의 추가 버튼을 찾을 수 없습니다`);
        }

        audioListContainer.appendChild(audioItem);
        console.log(`✅ 음악 ${index + 1} UI 항목 추가 완료`);
      });

      console.log("✅ 음악 목록 UI 생성 완료");

    } catch (error) {
      console.error("❌ 음악 목록 표시 실패:", error);
    }
  }

  // 음악 목록 컨테이너 추가
  const audioListContainer = document.createElement("div");
  audioListContainer.className = "audio-list-container";
  soundContent.dom.appendChild(audioListContainer);

  // 음악 업로드 기능
  const uploadSection = document.createElement("div");
  uploadSection.className = "upload-section";

  // 파일 입력 요소 (숨김)
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "audioFileInput";
  fileInput.accept = "audio/*";
  fileInput.style.display = "none";
  uploadSection.appendChild(fileInput);

  // 불러오기 버튼
  const uploadBtn = new UIButton("");
  uploadBtn.setInnerHTML("<i class='fas fa-upload'></i>");
  uploadBtn.onClick(async (event) => {
    event.preventDefault();
    event.stopPropagation();

    console.log("🎵 음악 업로드 시작...");

    // 서버 연결 상태 확인
    try {
      const healthResponse = await fetch(getApiUrl('/api/health'), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!healthResponse.ok) {
        alert("서버에 연결할 수 없습니다. 서버를 시작해주세요.");
        return;
      }

      // 파일 선택 다이얼로그 열기
      fileInput.click();

    } catch (error) {
      console.error("❌ 서버 연결 확인 실패:", error);
      alert("서버에 연결할 수 없습니다. 서버를 시작해주세요.");
    }
  });

  // 파일 선택 이벤트
  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("📁 선택된 파일:", file.name, file.size, file.type);

    try {
      // 파일 유효성 검사
      if (!validateAudioFile(file)) {
        return;
      }

      // 업로드 진행 상태 표시
      showUploadProgress(file.name);

      // 파일을 서버에 업로드
      const success = await uploadFileToServer(file);

      if (success) {
        // 성공 메시지 표시
        showUploadSuccess(file.name);

        // 파일 입력 초기화
        fileInput.value = "";

        // 음악 목록 새로고침 (즉시 실행)
        console.log("🔄 음악 목록 새로고침 시작...");

        // 잠시 대기 후 새로고침 (서버에서 파일 처리 시간 고려)
        setTimeout(async () => {
          try {
            await displayAudioList();
            console.log("✅ 음악 목록 새로고침 완료");
          } catch (error) {
            console.error("❌ 음악 목록 새로고침 실패:", error);
          }
        }, 1500);

      } else {
        showUploadError("파일 업로드에 실패했습니다.");
      }

    } catch (error) {
      console.error("❌ 파일 업로드 오류:", error);
      showUploadError(`업로드 오류: ${error.message}`);
    }
  });

  // 파일 유효성 검사 함수
  function validateAudioFile(file) {
    const maxSize = AUDIO_UPLOAD_CONFIG.UPLOAD.MAX_FILE_SIZE;
    if (file.size > maxSize) {
      showUploadError(`파일 크기가 ${(maxSize / (1024 * 1024)).toFixed(0)}MB를 초과합니다.`);
      return false;
    }

    const allowedTypes = AUDIO_UPLOAD_CONFIG.UPLOAD.ALLOWED_TYPES;
    const allowedExtensions = AUDIO_UPLOAD_CONFIG.UPLOAD.ALLOWED_EXTENSIONS;

    if (!allowedTypes.includes(file.type) && !file.name.match(new RegExp(`\\.(${allowedExtensions.join('|')})$`, 'i'))) {
      showUploadError("지원하지 않는 오디오 파일 형식입니다.");
      return false;
    }

    return true;
  }

  // 파일 업로드 함수
  async function uploadFileToServer(file) {
    try {
      const formData = new FormData();
      // AudioTimeline.js와 동일한 필드명 사용
      formData.append('audioFile', file);

      console.log("📤 업로드 요청 시작:", file.name);
      const response = await fetch(getApiUrl(AUDIO_UPLOAD_CONFIG.ENDPOINTS.UPLOAD), {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit'
      });

      console.log("📥 서버 응답:", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ 업로드 성공:", result);
        return true;
      } else {
        const errorText = await response.text();
        console.error("❌ 업로드 실패:", response.status, errorText);
        showUploadError(`업로드 실패: HTTP ${response.status}`);
        return false;
      }

    } catch (error) {
      console.error("❌ 업로드 중 오류:", error);
      showUploadError(`업로드 오류: ${error.message}`);
      return false;
    }
  }

  // 업로드 진행 상태 표시
  function showUploadProgress(fileName) {
    const existingProgress = uploadSection.querySelector(".upload-progress");
    if (existingProgress) existingProgress.remove();

    const progressDiv = document.createElement("div");
    progressDiv.className = "upload-progress";
    progressDiv.innerHTML = `
      <div class="progress-text">📤 ${fileName} 업로드 중...</div>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
    `;

    uploadSection.appendChild(progressDiv);
  }

  // 업로드 성공 메시지 표시
  function showUploadSuccess(fileName) {
    const existingProgress = uploadSection.querySelector(".upload-progress");
    if (existingProgress) existingProgress.remove();

    const successDiv = document.createElement("div");
    successDiv.className = "upload-success";
    successDiv.innerHTML = `
      <div class="success-text">✅ ${fileName} 업로드 완료!</div>
    `;

    uploadSection.appendChild(successDiv);

    // 3초 후 제거
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 3000);
  }

  // 업로드 오류 메시지 표시
  function showUploadError(message) {
    const existingProgress = uploadSection.querySelector(".upload-progress");
    if (existingProgress) existingProgress.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "upload-error";
    errorDiv.innerHTML = `
      <div class="error-text">❌ ${message}</div>
    `;

    uploadSection.appendChild(errorDiv);

    // 5초 후 제거
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }
  
  // 오디오 트랙 추가 성공 메시지 표시
  function showAddSuccess(audioName) {
    const existingMessage = soundPanel.dom.querySelector(".add-success-message");
    if (existingMessage) existingMessage.remove();

    const successDiv = document.createElement("div");
    successDiv.className = "add-success-message";
    successDiv.innerHTML = `
      <div class="success-text">✅ "${audioName}" 오디오 타임라인에 트랙 추가됨!</div>
      <div class="success-detail">오디오 타임라인에서 편집할 수 있습니다.</div>
    `;

    soundPanel.dom.appendChild(successDiv);

    // 5초 후 제거
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 5000);
  }
  
  // 오디오 트랙 추가 실패 메시지 표시
  function showAddError(audioName, errorMessage) {
    const existingMessage = soundPanel.dom.querySelector(".add-error-message");
    if (existingMessage) existingMessage.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "add-error-message";
    errorDiv.innerHTML = `
      <div class="error-text">❌ "${audioName}" 추가 실패: ${errorMessage}</div>
    `;

    soundPanel.dom.appendChild(errorDiv);

    // 5초 후 제거
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // 음악 불러오기 버튼을 Sound 패널에 직접 추가
  soundFooter.add(uploadBtn);

  // 업로드 섹션을 Sound 패널 컨텐츠에 추가
  soundContent.add(uploadSection);

  // 서버 연결 테스트 버튼
  const testConnectionBtn = new UIButton("");
  testConnectionBtn.setInnerHTML("<i class='fas fa-server'></i>");
  testConnectionBtn.onClick(async () => {
    console.log("🔍 서버 연결 테스트 시작...");
    try {
      const healthResponse = await fetch(getApiUrl('/api/health'), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      console.log("🏥 서버 상태:", healthResponse.status, healthResponse.statusText);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log("✅ 서버 응답:", healthData);
        alert(`서버 연결 성공!\n상태: ${healthData.status || 'OK'}`);
      } else {
        alert(`서버 연결 실패!\nHTTP ${healthResponse.status}: ${healthResponse.statusText}`);
      }
    } catch (error) {
      console.error("❌ 서버 연결 테스트 실패:", error);
      alert(`서버 연결 테스트 실패!\n오류: ${error.message}`);
    }
  });
  soundFooter.add(testConnectionBtn);
  

  // 새로고침 버튼
  const refreshBtn = new UIButton("");
  refreshBtn.setInnerHTML("<i class='fas fa-retweet'></i>");
  refreshBtn.onClick(async () => {
    console.log("🔄 새로고침 버튼 클릭됨");
    try {
      await displayAudioList();
      console.log("✅ 새로고침 완료");
    } catch (error) {
      console.error("❌ 새로고침 실패:", error);
    }
  });
  soundFooter.add(refreshBtn);
  
  // 휴지통 버튼 추가
  const deleteBtn = createDeleteButton();
  soundFooter.add(deleteBtn);

  // 전역 클릭 핸들러 설정
  setupGlobalClickHandler();
  
  // 초기 음악 목록 로드 (휴지통 버튼 생성 후)
  setTimeout(async () => {
    try {
      console.log("🚀 초기 음악 목록 로드 시작");
      await displayAudioList();
      console.log("✅ 초기 음악 목록 로드 완료");
    } catch (error) {
      console.error("❌ 초기 음악 목록 로드 실패:", error);
    }
  }, 100);

  // CSS 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    .audio-list-container {
      max-height: 300px;
      overflow-y: auto;
      border-radius: 0px;
      padding: 0px !important;
      gap:0 !important;
    }
    
    .audio-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px !important;
      margin-bottom: 0 !important;
    }
    
    .audio-info {
      display: flex;
      flex-direction: column;
       white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      padding-right: 30px;
      idth: 80%;
      gap:0 !important;
    }
    
    .audio-name {
      font-weight: bold;
      color: #333;
    }
    
    .audio-filename {
      font-size: 11px;
      color: #666;
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

         .floating-panel .Text{
       display: none !important;
     }
     
     /* 선택된 음악 항목 스타일 */
     .audio-item {
       cursor: pointer;
       transition: all 0.2s ease;
     }
     
     .audio-item:hover {
       background-color: #f0f0f0;
     }
     
     .audio-item.selected {
       background-color: #fff !important;
       box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
     }
       .audio-item.selected .audio-info>*{
       color:#333 !important;
       }
     
     /* 휴지통 버튼 스타일 
     .delete-audio-btn {
       background-color: #f44336 !important;
       color: white !important;
       border: none !important;
       padding: 8px 16px !important;
       border-radius: 4px !important;
       cursor: pointer !important;
       font-size: 14px !important;
       transition: all 0.2s ease !important;
     }
     
     .delete-audio-btn:hover:not(:disabled) {
       background-color: #d32f2f !important;
       transform: translateY(-1px) !important;
       box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3) !important;
     }
     
     .delete-audio-btn:disabled {
       background-color: #ccc !important;
       cursor: not-allowed !important;
     }
     */
    
     /* 오디오 트랙 추가 성공/실패 메시지 스타일 */
     .add-success-message {
       margin: 10px 0;
       padding: 15px;
       background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
       border-radius: 8px;
       border: 2px solid #4CAF50;
       color: #2e7d32;
       font-weight: bold;
       text-align: center;
       box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
       animation: slideIn 0.5s ease-out;
     }
     
     .add-success-message .success-text {
       font-size: 16px;
       margin-bottom: 8px;
     }
     
     .add-success-message .success-detail {
       font-size: 12px;
       color: #388e3c;
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

     .panel-footer{
      display: flex;
      gap: 2px;
      background: #444444;
      border-top: solid 1px #333;
      padding: 5px;
     }
    .panel-footer .Button{
      width:20px;
      height:20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
  `;
  document.head.appendChild(style);

  // Sound 패널을 floatPanel로 생성
  const soundFloatPanel = createPanel('Sound', soundPanel.dom);

  // sidebar-assets 컨테이너에 패널 추가
  const sidebarAssetsContainer = document.querySelector('#sidebar-assets');
  if (sidebarAssetsContainer) {
    sidebarAssetsContainer.appendChild(soundFloatPanel);
  }

  return container;
}

export { SidebarAssets };
