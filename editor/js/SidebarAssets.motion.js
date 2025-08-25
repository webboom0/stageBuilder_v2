import { UIButton } from "./libs/ui.js";
import { createPanel } from './ui/floatPanel.js';
import { getFbxApiUrl, FBX_UPLOAD_CONFIG, validateFBXFile } from "./config/fbx-upload-config.js";

export function createMotionPanel(editor) {
  // Motion 패널
  const motionPanel = document.createElement("div");
  motionPanel.className = "motion-panel";

  // Motion 패널 컨텐츠
  const motionContent = document.createElement("div");
  motionContent.className = "panel-content";
  motionPanel.appendChild(motionContent);

  // Motion 패널 푸터
  const motionFooter = document.createElement("div");
  motionFooter.className = "panel-footer";
  motionPanel.appendChild(motionFooter);

  // FBX 파일 목록을 동적으로 로드하는 함수
  async function loadFBXFilesFromFolder() {
    try {
      console.log("FBX 폴더 스캔 시작...");

      // 서버에서 FBX 파일 목록 가져오기
      const response = await fetch(getFbxApiUrl(FBX_UPLOAD_CONFIG.ENDPOINTS.GET_FILES));

      if (response.ok) {
        const fbxFiles = await response.json();
        console.log("서버에서 로드된 FBX 파일:", fbxFiles);

        // 서버에서 받은 데이터를 그대로 사용
        const processedFiles = fbxFiles.map(file => {
          console.log("처리 중인 파일:", file);
          return {
            path: `..${file.path}`, // 상대 경로로 변환
            name: file.name,
            displayName: file.displayName,
            filename: file.filename// 실제 파일명 (확장자 포함)
          };
        });

        console.log("처리된 파일 목록:", processedFiles);
        return processedFiles;
      } else {
        console.warn("서버에서 FBX 파일 목록을 가져올 수 없습니다. 기본 목록 사용");
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      console.error("FBX 폴더 스캔 실패:", error);

      // 기본 파일 목록 반환
      return [
        {
          path: "../files/fbx/Belly Dance.fbx",
          name: "Belly Dance",
          displayName: "Belly Dance",
          filename: "Belly Dance.fbx"
        },
        {
          path: "../files/fbx/Samba Dancing.fbx",
          name: "Samba Dancing",
          displayName: "Samba Dancing",
          filename: "Samba Dancing.fbx"
        },
        {
          path: "../files/fbx/Overhead Squat.fbx",
          name: "Overhead Squat",
          displayName: "Overhead Squat",
          filename: "Overhead Squat.fbx"
        }
      ];
    }
  }

  // 선택된 FBX 항목을 추적하는 변수
  let selectedFBXItem = null;

  // 선택 해제 함수
  function clearSelection() {
    if (selectedFBXItem) {
      selectedFBXItem.classList.remove('selected');
      selectedFBXItem = null;
      updateDeleteButton();
      console.log("🎬 FBX 항목 선택 해제됨");
    }
  }

  // 문서 전체 클릭 이벤트 (선택 해제용)
  function setupGlobalClickHandler() {
    document.addEventListener('click', (event) => {
      // fbx-item이나 관련 버튼을 클릭한 경우는 제외
      if (event.target.closest('.fbx-item') ||
        event.target.closest('.delete-fbx-btn') ||
        event.target.closest('.add-fbx-btn')) {
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
      if (selectedFBXItem) {
        await deleteSelectedFBX();
      } else {
        alert("삭제할 FBX 파일을 선택해주세요.");
      }
    });
    return deleteBtn;
  }

  // 삭제 버튼 상태 업데이트
  function updateDeleteButton() {
    const deleteBtn = motionPanel.querySelector('.delete-fbx-btn');
    if (deleteBtn && deleteBtn.dom) {
      if (selectedFBXItem) {
        deleteBtn.dom.disabled = false;
        deleteBtn.dom.style.opacity = "1";
        const filename = selectedFBXItem.dataset.filename;
        deleteBtn.dom.textContent = `��️ ${filename} 삭제`;
      } else {
        deleteBtn.dom.disabled = true;
        deleteBtn.dom.style.opacity = "0.5";
        deleteBtn.dom.textContent = "🗑️ 삭제";
      }
    } else {
      console.log("�� 휴지통 버튼을 찾을 수 없습니다. 아직 생성되지 않았을 수 있습니다.");
    }
  }

  // 선택된 FBX 파일 삭제
  async function deleteSelectedFBX() {
    if (!selectedFBXItem) {
      alert("삭제할 FBX 파일을 선택해주세요.");
      return;
    }

    const filename = selectedFBXItem.dataset.filename;
    const displayName = selectedFBXItem.querySelector('.fbx-name').textContent;

    if (!confirm(`정말로 "${displayName}" (${filename}) 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      console.log("🗑️ FBX 파일 삭제 시작:", filename);

      // 서버에 삭제 요청
      const response = await fetch(getFbxApiUrl(`${FBX_UPLOAD_CONFIG.ENDPOINTS.DELETE_FILE}/${encodeURIComponent(filename)}`), {
        method: 'DELETE',
        mode: 'cors',
        credentials: 'omit'
      });

      if (response.ok) {
        console.log("✅ FBX 파일 삭제 성공:", filename);
        alert(`"${displayName}" 파일이 삭제되었습니다.`);

        // 선택 상태 초기화
        clearSelection();

        // 목록 새로고침
        await displayFBXList();
      } else {
        const errorText = await response.text();
        console.error("❌ FBX 파일 삭제 실패:", response.status, errorText);
        alert(`파일 삭제에 실패했습니다. (HTTP ${response.status})`);
      }

    } catch (error) {
      console.error("❌ FBX 파일 삭제 중 오류:", error);
      alert(`파일 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  // FBX 목록 표시 함수
  async function displayFBXList() {
    const fbxListContainer = motionPanel.querySelector('.fbx-list-container');
    if (!fbxListContainer) {
      console.error("❌ fbxListContainer를 찾을 수 없습니다");
      return;
    }

    console.log("📋 기존 목록 제거 중...");
    // 기존 목록 제거
    fbxListContainer.innerHTML = '';

    // 선택 상태 초기화
    clearSelection();

    try {
      console.log("📡 FBX 파일 목록 로드 중...");
      const fbxFiles = await loadFBXFilesFromFolder();
      console.log("📥 로드된 FBX 파일 수:", fbxFiles ? fbxFiles.length : 0);

      if (!fbxFiles || fbxFiles.length === 0) {
        console.log("�� FBX 파일이 없음 - 안내 메시지 표시");
        const noFilesMessage = document.createElement("div");
        noFilesMessage.className = "no-files-message";
        noFilesMessage.innerHTML = `
          <p>사용 가능한 FBX 파일이 없습니다.</p>
          <p>files/fbx 폴더에 FBX 파일을 추가해주세요.</p>
        `;
        fbxListContainer.appendChild(noFilesMessage);
        return;
      }

      console.log("🔧 FBX 목록 UI 생성 중...");
      fbxFiles.forEach((fbxFile, index) => {
        console.log(`📁 FBX ${index + 1}:`, fbxFile.displayName);

        const fbxItem = document.createElement("div");
        fbxItem.className = "fbx-item";
        fbxItem.dataset.filename = fbxFile.filename || fbxFile.name;
        fbxItem.innerHTML = `
          <div class="fbx-info">
            <span class="fbx-name">${fbxFile.displayName}</span>
            <span class="fbx-filename">${fbxFile.filename || fbxFile.name}</span>
          </div>
          <button class="add-fbx-btn" title="모션 타임라인에 트랙 추가">
            <i class="fas fa-plus"></i>
          </button>
        `;

        // FBX 항목 클릭 이벤트 (선택)
        fbxItem.addEventListener("click", (event) => {
          // 버튼 클릭은 제외
          if (event.target.closest('.add-fbx-btn')) {
            return;
          }

          // 기존 선택 해제
          if (selectedFBXItem) {
            selectedFBXItem.classList.remove('selected');
          }

          // 새 항목 선택
          selectedFBXItem = fbxItem;
          fbxItem.classList.add('selected');

          // 휴지통 버튼 상태 업데이트
          try {
            updateDeleteButton();
          } catch (error) {
            console.log("🔍 휴지통 버튼 상태 업데이트 실패:", error.message);
          }

          console.log("🎬 FBX 항목 선택됨:", fbxFile.displayName);
        });

        // 추가 버튼 클릭 이벤트
        const addBtn = fbxItem.querySelector(".add-fbx-btn");
        if (addBtn) {
          console.log(`🔘 FBX ${index + 1}의 추가 버튼 이벤트 리스너 연결`);

          // 중복 추가 방지를 위한 상태 추적
          let isAdding = false;

          addBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (isAdding) {
              console.log("이미 추가 중입니다...");
              return;
            }

            console.log("�� FBX 파일을 씬에 가져오기 시작:", fbxFile.displayName);

            // 버튼 상태 변경
            isAdding = true;
            addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 가져오는 중...';
            addBtn.disabled = true;
            addBtn.classList.add('adding');

            try {
              // 🚀 핵심: editor.loader.loadFiles 사용 (Menubar.File.js와 동일한 방식)
              if (editor && editor.loader && editor.loader.loadFiles) {
                console.log("�� editor.loader.loadFiles 사용하여 FBX 파일 가져오기");

                // File 객체 생성 (서버에서 가져온 파일 정보로)
                const fileBlob = await fetch(fbxFile.path).then(r => r.blob());
                const file = new File([fileBlob], fbxFile.filename || fbxFile.name, {
                  type: 'application/octet-stream'
                });

                console.log("📁 생성된 File 객체:", file);

                // FileList 생성 (editor.loader.loadFiles가 기대하는 형식)
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const fileList = dataTransfer.files;

                console.log("📋 생성된 FileList:", fileList);

                // editor.loader.loadFiles 호출 (Menubar.File.js와 동일)
                await editor.loader.loadFiles(fileList);

                console.log("✅ FBX 파일 가져오기 성공:", fbxFile.displayName);

                // 성공 피드백
                showAddSuccess(fbxFile.displayName);

                // 버튼을 체크 표시로 변경 (가져오기 완료 표시)
                addBtn.classList.remove('adding');
                addBtn.classList.add('success');
                addBtn.innerHTML = '<i class="fas fa-check"></i> 가져옴';

                // 3초 후 원래 상태로 복원
                setTimeout(() => {
                  addBtn.innerHTML = '<i class="fas fa-plus"></i>';
                  addBtn.classList.remove('success');
                  addBtn.disabled = false;
                  isAdding = false;
                }, 3000);

                console.log("�� FBX 파일이 씬에 성공적으로 가져와짐:", fbxFile.displayName);

              } else {
                throw new Error("editor.loader.loadFiles를 찾을 수 없습니다.");
              }

            } catch (error) {
              console.error("❌ FBX 파일 가져오기 실패:", error);

              // 오류 피드백
              showAddError(fbxFile.displayName, error.message);

              // 버튼 상태 복원
              addBtn.innerHTML = '<i class="fas fa-plus"></i>';
              addBtn.classList.remove('adding');
              addBtn.disabled = false;
              isAdding = false;
            }
          });
        } else {
          console.error(`❌ FBX ${index + 1}의 추가 버튼을 찾을 수 없습니다`);
        }


        fbxListContainer.appendChild(fbxItem);
        console.log(`✅ FBX ${index + 1} UI 항목 추가 완료`);
      });

      console.log("✅ FBX 목록 UI 생성 완료");

    } catch (error) {
      console.error("❌ FBX 목록 표시 실패:", error);
    }
  }

  // FBX 목록 컨테이너 추가
  const fbxListContainer = document.createElement("div");
  fbxListContainer.className = "fbx-list-container";
  motionContent.appendChild(fbxListContainer);

  // FBX 업로드 기능
  const uploadSection = document.createElement("div");
  uploadSection.className = "upload-section";

  // 파일 입력 요소 (숨김)
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "fbxFileInput";
  fileInput.accept = ".fbx";
  fileInput.style.display = "none";
  uploadSection.appendChild(fileInput);

  // 불러오기 버튼
  const uploadBtn = new UIButton("");
  uploadBtn.setInnerHTML("<i class='fas fa-upload'></i>");
  uploadBtn.onClick(async (event) => {
    event.preventDefault();
    event.stopPropagation();

    console.log("�� FBX 업로드 시작...");

    // 🚀 수정: getFbxApiUrl 사용하여 올바른 서버 URL 생성
    try {
      const healthResponse = await fetch(getFbxApiUrl(FBX_UPLOAD_CONFIG.ENDPOINTS.HEALTH), {
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
      // �� 수정: 함수명 변경하여 중복 제거
      if (!validateSelectedFBXFile(file)) {
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

        // FBX 목록 새로고침
        setTimeout(async () => {
          try {
            await displayFBXList();
            console.log("✅ FBX 목록 새로고침 완료");
          } catch (error) {
            console.error("❌ FBX 목록 새로고침 실패:", error);
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

  // 🚀 수정: 함수명을 validateSelectedFBXFile로 변경
  function validateSelectedFBXFile(file) {
    const validation = validateFBXFile(file);  // import된 함수 사용
    if (!validation.isValid) {
      showUploadError(validation.error);
      return false;
    }
    return true;
  }

  // 파일 업로드 함수
  async function uploadFileToServer(file) {
    try {
      const formData = new FormData();
      formData.append('fbxFile', file);

      console.log("📤 업로드 요청 시작:", file.name);
      const response = await fetch(getFbxApiUrl(FBX_UPLOAD_CONFIG.ENDPOINTS.UPLOAD), {
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

  // FBX 추가 성공 메시지 표시
  function showAddSuccess(fbxName) {
    const existingMessage = motionPanel.querySelector(".add-success-message");
    if (existingMessage) existingMessage.remove();
  
    const successDiv = document.createElement("div");
    successDiv.className = "add-success-message";
    successDiv.innerHTML = `
      <div class="success-text">✅ "${fbxName}" 씬에 가져옴!</div>
      <div class="success-detail">3D 뷰포트에서 모델을 확인할 수 있습니다.</div>
    `;
  
    motionPanel.appendChild(successDiv);
  
    // 5초 후 제거
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.remove();
      }
    }, 5000);
  }

  // FBX 추가 실패 메시지 표시
  function showAddError(fbxName, errorMessage) {
    const existingMessage = motionPanel.querySelector(".add-error-message");
    if (existingMessage) existingMessage.remove();
  
    const errorDiv = document.createElement("div");
    errorDiv.className = "add-error-message";
    errorDiv.innerHTML = `
      <div class="error-text">❌ "${fbxName}" 씬 가져오기 실패: ${errorMessage}</div>
      <div class="error-detail">파일 경로와 형식을 확인해주세요.</div>
    `;
  
    motionPanel.appendChild(errorDiv);
  
    // 5초 후 제거
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  // FBX 로더를 동적으로 로드하는 함수
  async function loadFBXLoader() {
    // 이미 로드되어 있는지 확인
    if (window.THREE && window.THREE.FBXLoader) {
      return window.THREE.FBXLoader;
    }

    // FBX 로더 스크립트 동적 로드
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/three@0.150.0/examples/js/loaders/FBXLoader.js';
      script.onload = () => {
        console.log('✅ FBX 로더 로드 완료');
        resolve(window.THREE.FBXLoader);
      };
      script.onerror = () => {
        reject(new Error('FBX 로더 로드 실패'));
      };
      document.head.appendChild(script);
    });
  }

  // FBX 불러오기 버튼을 Motion 패널에 직접 추가
  motionFooter.appendChild(uploadBtn.dom);

  // 업로드 섹션을 Motion 패널 컨텐츠에 추가
  motionContent.appendChild(uploadSection);

  // 서버 연결 테스트 버튼
  const testConnectionBtn = new UIButton("");
  testConnectionBtn.setInnerHTML("<i class='fas fa-server'></i>");
  testConnectionBtn.onClick(async () => {
    console.log("🔍 서버 연결 테스트 시작...");
    try {
      // 🚀 수정: getFbxApiUrl 사용하여 올바른 서버 URL 생성
      const healthResponse = await fetch(getFbxApiUrl(FBX_UPLOAD_CONFIG.ENDPOINTS.HEALTH), {
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
  motionFooter.appendChild(testConnectionBtn.dom);


  // 새로고침 버튼
  const refreshBtn = new UIButton("");
  refreshBtn.setInnerHTML("<i class='fas fa-retweet'></i>");
  refreshBtn.onClick(async () => {
    console.log("�� 새로고침 버튼 클릭됨");
    try {
      await displayFBXList();
      console.log("✅ 새로고침 완료");
    } catch (error) {
      console.error("❌ 새로고침 실패:", error);
    }
  });
  motionFooter.appendChild(refreshBtn.dom);

  // 휴지통 버튼 추가
  const deleteBtn = createDeleteButton();
  motionFooter.appendChild(deleteBtn.dom);

  // 전역 클릭 핸들러 설정
  setupGlobalClickHandler();

  // 초기 FBX 목록 로드 (휴지통 버튼 생성 후)
  setTimeout(async () => {
    try {
      console.log("🚀 초기 FBX 목록 로드 시작");
      await displayFBXList();
      console.log("✅ 초기 FBX 목록 로드 완료");
    } catch (error) {
      console.error("❌ 초기 FBX 목록 로드 실패:", error);
    }
  }, 100);

  return motionPanel;
}