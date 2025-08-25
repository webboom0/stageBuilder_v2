import { UIButton } from "./libs/ui.js";
import { createPanel } from './ui/floatPanel.js';
import { getApiUrl, AUDIO_UPLOAD_CONFIG } from "./config/audio-upload-config.js";

export function createAudioPanel(editor) {
  // Sound 패널
  const soundPanel = document.createElement("div");
  soundPanel.className = "sound-panel";
  
  // Sound 패널 컨텐츠
  const soundContent = document.createElement("div");
  soundContent.className = "panel-content";
  soundPanel.appendChild(soundContent);
  
  // Sound 패널 푸터
  const soundFooter = document.createElement("div");
  soundFooter.className = "panel-footer";
  soundPanel.appendChild(soundFooter);

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
          displayName: "수제순",
          filename: "SUJESHUN.mp3"
        },
        {
          path: "../files/music/DRAMA.mp3",
          name: "DRAMA",
          displayName: "드라마",
          filename: "DRAMA.mp3"
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
    const deleteBtn = soundPanel.querySelector('.delete-audio-btn');
    if (deleteBtn && deleteBtn.dom) {
      if (selectedAudioItem) {
        deleteBtn.dom.disabled = false;
        deleteBtn.dom.style.opacity = "1";
        const filename = selectedAudioItem.dataset.filename;
        deleteBtn.dom.textContent = `��️ ${filename} 삭제`;
      } else {
        deleteBtn.dom.disabled = true;
        deleteBtn.dom.style.opacity = "0.5";
        deleteBtn.dom.textContent = "🗑️ 삭제";
      }
    } else {
      console.log("휴지통 버튼을 찾을 수 없습니다. 아직 생성되지 않았을 수 있습니다.");
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
    const audioListContainer = soundPanel.querySelector('.audio-list-container');
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
        console.log("음악 파일이 없음 - 안내 메시지 표시");
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
        console.log(`음악 ${index + 1}:`, audioFile.displayName);

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
          
          console.log("음악 항목 선택됨:", audioFile.displayName);
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
  soundContent.appendChild(audioListContainer);

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
    const existingMessage = soundPanel.querySelector(".add-success-message");
    if (existingMessage) existingMessage.remove();

    const successDiv = document.createElement("div");
    successDiv.className = "add-success-message";
    successDiv.innerHTML = `
      <div class="success-text">✅ "${audioName}" 오디오 타임라인에 트랙 추가됨!</div>
      <div class="success-detail">오디오 타임라인에서 편집할 수 있습니다.</div>
    `;

    soundPanel.appendChild(successDiv);

    // 5초 후 제거
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 5000);
  }
  
  // 오디오 트랙 추가 실패 메시지 표시
  function showAddError(audioName, errorMessage) {
    const existingMessage = soundPanel.querySelector(".add-error-message");
    if (existingMessage) existingMessage.remove();

    const errorDiv = document.createElement("div");
    errorDiv.className = "add-error-message";
    errorDiv.innerHTML = `
      <div class="error-text">❌ "${audioName}" 추가 실패: ${errorMessage}</div>
    `;

    errorDiv.appendChild(errorDiv);

    // 5초 후 제거
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // 음악 불러오기 버튼을 Sound 패널에 직접 추가
  soundFooter.appendChild(uploadBtn.dom);

  // 업로드 섹션을 Sound 패널 컨텐츠에 추가
  soundContent.appendChild(uploadSection);

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
  soundFooter.appendChild(testConnectionBtn.dom);
  

  // 새로고침 버튼
  const refreshBtn = new UIButton("");
  refreshBtn.setInnerHTML("<i class='fas fa-retweet'></i>");
  refreshBtn.onClick(async () => {
    console.log("새로고침 버튼 클릭됨");
    try {
      await displayAudioList();
      console.log("✅ 새로고침 완료");
    } catch (error) {
      console.error("❌ 새로고침 실패:", error);
    }
  });
  soundFooter.appendChild(refreshBtn.dom);
  
  // 휴지통 버튼 추가
  const deleteBtn = createDeleteButton();
  soundFooter.appendChild(deleteBtn.dom);

  // 전역 클릭 핸들러 설정
  setupGlobalClickHandler();
  
  // 초기 음악 목록 로드 (휴지통 버튼 생성 후)
  setTimeout(async () => {
    try {
      console.log("초기 음악 목록 로드 시작");
      await displayAudioList();
      console.log("✅ 초기 음악 목록 로드 완료");
    } catch (error) {
      console.error("❌ 초기 음악 목록 로드 실패:", error);
    }
  }, 100);

  return soundPanel;
}