import { UIPanel, UIRow, UIHorizontalRule } from "./libs/ui.js";

function MenubarFile(editor) {
  const strings = editor.strings;

  const saveArrayBuffer = editor.utils.saveArrayBuffer;
  const saveString = editor.utils.saveString;

  const container = new UIPanel();
  container.setClass("menu");

  const title = new UIPanel();
  title.setClass("title");
  title.setTextContent(strings.getKey("menubar/file"));
  container.add(title);

  const options = new UIPanel();
  options.setClass("options");
  container.add(options);

  // New 버튼
  const newButton = new UIRow();
  newButton.setClass("option button-style");
  newButton.setTextContent("새파일");
  newButton.onClick(async function () {
    if (confirm("Any unsaved data will be lost. Are you sure?")) {
      // 현재 editor 초기화
      editor.clear();
      // await initMusic();

      // 전체 탭 초기화 이벤트 발생
      // window.resetAllTabs 함수가 있는지 확인하고 직접 호출
      if (typeof window.resetAllTabs === "function") {
        await window.resetAllTabs();
      }
      //window.dispatchEvent(resetEvent);

      // location.reload();
    }
  });
  options.add(newButton);

  // New Project

  // const newProjectSubmenuTitle = new UIRow()
  //   .setTextContent(strings.getKey("menubar/file/new"))
  //   .addClass("option")
  //   .addClass("submenu-title");
  // newProjectSubmenuTitle.onMouseOver(function () {
  //   const { top, right } = this.dom.getBoundingClientRect();
  //   const { paddingTop } = getComputedStyle(this.dom);
  //   newProjectSubmenu.setLeft(right + "px");
  //   newProjectSubmenu.setTop(top - parseFloat(paddingTop) + "px");
  //   newProjectSubmenu.setDisplay("block");
  // });
  // newProjectSubmenuTitle.onMouseOut(function () {
  //   newProjectSubmenu.setDisplay("none");
  // });
  // options.add(newProjectSubmenuTitle);

  // const newProjectSubmenu = new UIPanel()
  //   .setPosition("fixed")
  //   .addClass("options")
  //   .setDisplay("none");
  // newProjectSubmenuTitle.add(newProjectSubmenu);
  // // New Project / Empty

  let option = new UIRow();
  //   .setTextContent(strings.getKey("menubar/file/new/empty"))
  //   .setClass("option");
  // option.onClick(function () {
  //   if (confirm(strings.getKey("prompt/file/open"))) {
  //     editor.clear();
  //   }
  // });
  // newProjectSubmenu.add(option);

  // newProjectSubmenu.add(new UIHorizontalRule());

  // // New Project / ...

  // const examples = [
  //   { title: "menubar/file/new/Arkanoid", file: "arkanoid.app.json" },
  //   { title: "menubar/file/new/Camera", file: "camera.app.json" },
  //   { title: "menubar/file/new/Particles", file: "particles.app.json" },
  //   { title: "menubar/file/new/Pong", file: "pong.app.json" },
  //   { title: "menubar/file/new/Shaders", file: "shaders.app.json" },
  // ];

  // const loader = new THREE.FileLoader();

  // for (let i = 0; i < examples.length; i++) {
  //   (function (i) {
  //     const example = examples[i];

  //     const option = new UIRow();
  //     option.setClass("option");
  //     option.setTextContent(strings.getKey(example.title));
  //     option.onClick(function () {
  //       if (confirm(strings.getKey("prompt/file/open"))) {
  //         loader.load("examples/" + example.file, function (text) {
  //           editor.clear();
  //           editor.fromJSON(JSON.parse(text));
  //         });
  //       }
  //     });
  //     newProjectSubmenu.add(option);
  //   })(i);
  // }
  // Open

  const openProjectForm = document.createElement("form");
  openProjectForm.style.display = "none";
  document.body.appendChild(openProjectForm);

  const openProjectInput = document.createElement("input");
  openProjectInput.multiple = false;
  openProjectInput.type = "file";
  openProjectInput.accept = ".json";
  openProjectInput.addEventListener("change", async function () {
    const file = openProjectInput.files[0];

    if (file === undefined) return;

    try {
      let json;
      try {
        const fileText = await file.text();
        json = JSON.parse(fileText);
        console.log("Loading project:", json); // 불러오는 데이터 확인
      } catch (parseError) {
        console.error("JSON 파싱 실패:", parseError);

        // JSON 파싱 실패 시 복구 시도
        try {
          const fileText = await file.text();
          // JSON 복구 시도: 불완전한 JSON 문자열 정리
          let cleanedText = fileText.trim();

          // 불완전한 객체나 배열 닫기
          let openBraces = (cleanedText.match(/\{/g) || []).length;
          let closeBraces = (cleanedText.match(/\}/g) || []).length;
          let openBrackets = (cleanedText.match(/\[/g) || []).length;
          let closeBrackets = (cleanedText.match(/\]/g) || []).length;

          // 닫는 괄호 추가
          while (openBraces > closeBraces) {
            cleanedText += '}';
            closeBraces++;
          }
          while (openBrackets > closeBrackets) {
            cleanedText += ']';
            closeBrackets++;
          }

          console.log("JSON 복구 시도:", cleanedText);
          json = JSON.parse(cleanedText);
          console.log("JSON 복구 성공:", json);
        } catch (recoveryError) {
          console.error("JSON 복구도 실패:", recoveryError);
          // 최후의 수단: 기본 구조 생성
          json = {
            scene: {
              type: 'Scene',
              children: [],
              animations: []
            },
            camera: {
              type: 'PerspectiveCamera',
              position: [0, 0, 5],
              rotation: [0, 0, 0]
            },
            objects: [],
            animations: []
          };
          console.log("기본 JSON 구조 생성:", json);
        }
      }

      async function onEditorCleared() {
        try {
          // JSON 데이터 검증 및 복구
          const validatedJson = validateAndRepairJSON(json);
          console.log("JSON 데이터 검증 및 복구 완료:", validatedJson);

          // Editor에서 JSON 로드 (더 안전한 방식)
          try {
            await editor.fromJSON(validatedJson);
            console.log("JSON 데이터 로드 완료");
          } catch (loadError) {
            console.error("Editor.fromJSON 실패, 대체 방법 시도:", loadError);

            // 대체 방법: 기본 씬으로 시작하고 데이터만 복원
            editor.clear();

            // 씬의 userData 복원
            if (validatedJson.scene && validatedJson.scene.userData) {
              editor.scene.userData = { ...editor.scene.userData, ...validatedJson.scene.userData };
            }

            // MotionTimeline 데이터 복원
            if (validatedJson.motionTimeline && editor.motionTimeline) {
              editor.scene.userData.motionTimeline = validatedJson.motionTimeline;
              editor.motionTimeline.onAfterLoad();
            }

            // 추가적인 데이터 복원 시도
            try {
              // scene의 기본 구조만 복원
              if (validatedJson.scene) {
                // 기본 scene 속성만 설정
                if (validatedJson.scene.name) {
                  editor.scene.name = validatedJson.scene.name;
                }
                if (validatedJson.scene.userData) {
                  editor.scene.userData = { ...editor.scene.userData, ...validatedJson.scene.userData };
                }
              }

              // camera 복원 시도
              if (validatedJson.camera && editor.camera) {
                try {
                  if (validatedJson.camera.position) {
                    editor.camera.position.set(
                      validatedJson.camera.position[0] || 0,
                      validatedJson.camera.position[1] || 0,
                      validatedJson.camera.position[2] || 5
                    );
                  }
                  if (validatedJson.camera.rotation) {
                    editor.camera.rotation.set(
                      validatedJson.camera.rotation[0] || 0,
                      validatedJson.camera.rotation[1] || 0,
                      validatedJson.camera.rotation[2] || 0
                    );
                  }
                } catch (cameraError) {
                  console.warn("카메라 복원 실패:", cameraError);
                }
              }

              console.log("대체 방법으로 데이터 복원 완료");
            } catch (fallbackError) {
              console.error("대체 방법도 실패:", fallbackError);
              // 최후의 수단: 완전히 새로운 씬으로 시작
              editor.clear();
              alert("파일 로드에 실패했습니다. 새로운 씬으로 시작합니다.");
            }
          }
        } catch (error) {
          console.error("JSON 데이터 로드 중 전체 오류:", error);
          // 오류 발생 시 사용자에게 알림
          alert("파일 로드 중 오류가 발생했습니다: " + error.message);
        }

        editor.signals.editorCleared.remove(onEditorCleared);
      }

      // JSON 데이터 검증 및 복구 함수
      function validateAndRepairJSON(data) {
        if (!data) return data;

        console.log("JSON 데이터 검증 시작:", data);

        // animations 속성이 없으면 빈 배열로 초기화
        if (!data.animations) {
          data.animations = [];
        }

        // scene 속성이 없으면 기본 scene 구조 생성
        if (!data.scene) {
          data.scene = {
            type: 'Scene',
            children: [],
            animations: []
          };
        }

        // scene의 animations 속성도 확인
        if (data.scene && !data.scene.animations) {
          data.scene.animations = [];
        }

        // scene이 THREE.js 형식이 아니면 기본 형식으로 변환
        if (data.scene && (!data.scene.type || data.scene.type !== 'Scene')) {
          console.warn("scene이 THREE.js 형식이 아니므로 기본 형식으로 변환");
          data.scene = {
            type: 'Scene',
            uuid: data.scene.uuid || crypto.randomUUID(),
            name: data.scene.name || 'Scene',
            children: data.scene.children || [],
            animations: data.scene.animations || [],
            userData: data.scene.userData || {},
            matrix: data.scene.matrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
          };
        }

        // scene의 children이 올바른 형식인지 확인하고 복구
        if (data.scene && data.scene.children) {
          if (!Array.isArray(data.scene.children)) {
            console.warn("scene.children가 배열이 아니므로 빈 배열로 초기화");
            data.scene.children = [];
          } else {
            // children의 각 객체를 검증하고 복구
            data.scene.children = data.scene.children.filter(child => {
              if (!child || typeof child !== 'object') {
                console.warn("유효하지 않은 child 객체 제거:", child);
                return false;
              }

              // type 속성이 없으면 기본값 설정
              if (!child.type) {
                console.warn("child에 type 속성이 없어 기본값 설정:", child);
                child.type = 'Object3D'; // 기본 타입
              }

              // uuid가 없으면 생성
              if (!child.uuid) {
                console.warn("child에 uuid가 없어 생성:", child);
                child.uuid = crypto.randomUUID();
              }

              // 필수 속성들이 없으면 기본값 설정
              if (!child.name) child.name = 'Object';
              if (!child.position) child.position = [0, 0, 0];
              if (!child.rotation) child.rotation = [0, 0, 0];
              if (!child.scale) child.scale = [1, 1, 1];
              if (!child.matrix) child.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
              if (!child.userData) child.userData = {};
              if (!child.children) child.children = [];
              if (!child.animations) child.animations = [];

              return true;
            });
          }
        }

        // objects 배열이 없으면 빈 배열로 초기화
        if (!data.objects) {
          data.objects = [];
        }

        // objects 배열의 각 객체를 검증하고 복구
        if (data.objects && Array.isArray(data.objects)) {
          data.objects = data.objects.filter(obj => {
            if (!obj || typeof obj !== 'object') {
              console.warn("유효하지 않은 object 제거:", obj);
              return false;
            }

            // type 속성이 없으면 기본값 설정
            if (!obj.type) {
              console.warn("object에 type 속성이 없어 기본값 설정:", obj);
              obj.type = 'Object3D';
            }

            // uuid가 없으면 생성
            if (!obj.uuid) {
              console.warn("object에 uuid가 없어 생성:", obj);
              obj.uuid = crypto.randomUUID();
            }

            // 필수 속성들이 없으면 기본값 설정
            if (!obj.name) obj.name = 'Object';
            if (!obj.position) obj.position = [0, 0, 0];
            if (!obj.rotation) obj.rotation = [0, 0, 0];
            if (!obj.scale) obj.scale = [1, 1, 1];
            if (!obj.matrix) obj.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            if (!obj.userData) obj.userData = {};
            if (!obj.children) obj.children = [];
            if (!obj.animations) obj.animations = [];

            return true;
          });
        }

        // camera 속성 확인
        if (!data.camera) {
          data.camera = {
            type: 'PerspectiveCamera',
            uuid: crypto.randomUUID(),
            name: 'Camera',
            fov: 50,
            aspect: 1,
            near: 0.1,
            far: 2000,
            position: [0, 0, 5],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          };
        }

        // camera가 THREE.js 형식이 아니면 기본 형식으로 변환
        if (data.camera && (!data.camera.type || !data.camera.uuid)) {
          console.warn("camera가 THREE.js 형식이 아니므로 기본 형식으로 변환");
          data.camera = {
            type: 'PerspectiveCamera',
            uuid: data.camera.uuid || crypto.randomUUID(),
            name: data.camera.name || 'Camera',
            fov: data.camera.fov || 50,
            aspect: data.camera.aspect || 1,
            near: data.camera.near || 0.1,
            far: data.camera.far || 2000,
            position: data.camera.position || [0, 0, 5],
            rotation: data.camera.rotation || [0, 0, 0],
            scale: data.camera.scale || [1, 1, 1]
          };
        }

        // 재귀적으로 모든 객체의 children을 검증하고 복구
        function validateChildrenRecursively(children) {
          if (!Array.isArray(children)) return [];

          return children.filter(child => {
            if (!child || typeof child !== 'object') {
              console.warn("재귀 검증: 유효하지 않은 child 객체 제거:", child);
              return false;
            }

            // type 속성이 없으면 기본값 설정
            if (!child.type) {
              console.warn("재귀 검증: child에 type 속성이 없어 기본값 설정:", child);
              child.type = 'Object3D';
            }

            // uuid가 없으면 생성
            if (!child.uuid) {
              console.warn("재귀 검증: child에 uuid가 없어 생성:", child);
              child.uuid = crypto.randomUUID();
            }

            // 필수 속성들이 없으면 기본값 설정
            if (!child.name) child.name = 'Object';
            if (!child.position) child.position = [0, 0, 0];
            if (!child.rotation) child.rotation = [0, 0, 0];
            if (!child.scale) child.scale = [1, 1, 1];
            if (!child.matrix) child.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
            if (!child.userData) child.userData = {};
            if (!child.children) child.children = [];
            if (!child.animations) child.animations = [];

            // 재귀적으로 children 검증
            if (child.children) {
              child.children = validateChildrenRecursively(child.children);
            }

            return true;
          });
        }

        // scene의 children을 재귀적으로 검증
        if (data.scene && data.scene.children) {
          data.scene.children = validateChildrenRecursively(data.scene.children);
        }

        // objects의 children을 재귀적으로 검증
        if (data.objects && Array.isArray(data.objects)) {
          data.objects.forEach(obj => {
            if (obj.children) {
              obj.children = validateChildrenRecursively(obj.children);
            }
          });
        }

        console.log("JSON 데이터 검증 및 복구 완료:", data);
        return data;
      }

      editor.signals.editorCleared.add(onEditorCleared);

      editor.clear();
    } catch (e) {
      alert(strings.getKey("prompt/file/failedToOpenProject"));
      console.error("파일 파싱 오류:", e);
    } finally {
      //form.reset();
      openProjectForm.reset();
    }
  });


  openProjectForm.appendChild(openProjectInput);

  option = new UIRow()
    .addClass("option")
    .setTextContent(strings.getKey("menubar/file/open"))
    .onClick(function () {
      if (confirm(strings.getKey("prompt/file/open"))) {
        openProjectInput.click();
      }
    });

  options.add(option);

  // Save

  option = new UIRow()
    .addClass("option")
    .setTextContent(strings.getKey("menubar/file/save"))
    .onClick(function () {
      // MotionTimeline 데이터 저장
      if (editor.motionTimeline && editor.motionTimeline.onBeforeSave) {
        editor.motionTimeline.onBeforeSave();
      }

      // 저장 전 데이터 정리
      const rawJson = editor.toJSON();
      const cleanJson = cleanDataForSaving(validateAndRepairJSON(rawJson));

      console.log("Saving project:", cleanJson); // 저장되는 전체 데이터 확인
      // 특히 music 데이터가 있는지 확인
      if (cleanJson.music) {
        console.log("Music data being saved:", cleanJson.music);
      } else {
        console.log("No music data to save");
      }

      // JSON.stringify에 안전장치 추가
      let jsonString;
      try {
        jsonString = JSON.stringify(cleanJson);
        console.log("JSON 문자열 생성 성공, 길이:", jsonString.length);
      } catch (error) {
        console.error("JSON.stringify 실패:", error);
        // 더 강력한 정리 시도
        const fallbackJson = {
          error: "Data too large to serialize",
          timestamp: new Date().toISOString(),
          motionTimeline: cleanJson.motionTimeline || cleanJson.userData?.motionTimeline
        };
        jsonString = JSON.stringify(fallbackJson);
      }

      const blob = new Blob([jsonString], {
        type: "application/json",
      });
      editor.utils.save(blob, "project.json");
    });

  options.add(option);

  // Save As with Download Attribute

  option = new UIRow()
    .addClass("option")
    .setTextContent("다름이름으로 저장")
    .onClick(async function () {
      // showSaveFilePicker를 사용자 제스처 내에서 즉시 실행
      if ("showSaveFilePicker" in window) {
        try {
          // 사용자 제스처 내에서 즉시 실행
          const handle = await window.showSaveFilePicker({
            suggestedName: "project.json",
            types: [
              {
                description: "JSON Files",
                accept: { "application/json": [".json"] },
              },
            ],
          });

          // 파일 핸들을 얻은 후 데이터 준비
          // MotionTimeline 데이터 저장
          if (editor.motionTimeline && editor.motionTimeline.onBeforeSave) {
            console.log("=== MotionTimeline 데이터 저장 시작 ===");
            console.log("this.motionTimeline:", editor.motionTimeline);
            console.log("this.scene.userData:", editor.scene.userData);
            editor.motionTimeline.onBeforeSave();
            console.log("onBeforeSave 완료 후 scene.userData.motionTimeline:", editor.scene.userData.motionTimeline);
            console.log("=== MotionTimeline 데이터 저장 완료 ===");
          }

          // 저장 전 데이터 정리 함수 (내부에 정의)
          function cleanDataForSaving(data) {
            // 먼저 데이터 검증 및 복구 수행
            data = validateAndRepairJSON(data);

            if (data === null || data === undefined) {
              return data;
            }

            // 순환 참조 방지를 위한 WeakSet
            const seen = new WeakSet();
            let circularRefCount = 0;
            let threeJsObjectCount = 0;
            let domElementCount = 0;
            let functionCount = 0;
            let largeObjectCount = 0;

            function cleanObject(obj, depth = 0) {
              // 깊이 제한 (무한 재귀 방지)
              if (depth > 10) {
                return '[Max Depth Reached]';
              }

              if (obj === null || typeof obj !== 'object') {
                return obj;
              }

              // 순환 참조 체크
              if (seen.has(obj)) {
                circularRefCount++;
                return '[Circular Reference]';
              }

              // 배열인 경우
              if (Array.isArray(obj)) {
                // 배열 크기 제한
                if (obj.length > 10000) {
                  largeObjectCount++;
                  return `[Large Array: ${obj.length} items]`;
                }

                seen.add(obj);
                const cleaned = obj.slice(0, 1000).map(item => cleanObject(item, depth + 1)); // 최대 1000개만 처리
                seen.delete(obj);
                return cleaned;
              }

              // 객체인 경우
              if (obj.constructor !== Object) {
                // THREE.js 객체나 특수 객체는 건너뛰기 (하지만 필수 속성은 보존)
                if (obj.isObject3D || obj.isScene || obj.isCamera || obj.isMesh ||
                  obj.isMaterial || obj.isTexture || obj.isGeometry ||
                  obj.isBufferGeometry || obj.isAnimationMixer ||
                  obj.isAnimationAction || obj.isAnimationClip ||
                  obj.isBufferAttribute || obj.isInterleavedBuffer ||
                  obj.isRenderTarget || obj.isWebGLRenderTarget ||
                  obj.isShader || obj.isProgram) {
                  threeJsObjectCount++;

                  // 기본 속성만 보존
                  const basicProps = {
                    type: obj.type || obj.constructor.name,
                    name: obj.name || '',
                    uuid: obj.uuid || '',
                    visible: obj.visible !== undefined ? obj.visible : true
                  };

                  // 특별한 객체들은 추가 속성 보존
                  if (obj.isScene) {
                    // children을 완전한 객체로 저장 (UUID만이 아닌)
                    basicProps.children = obj.children ? obj.children.map(child => {
                      if (child && typeof child === 'object') {
                        return cleanObject(child, depth + 1);
                      }
                      return child.uuid || '';
                    }) : [];
                    basicProps.animations = obj.animations ? obj.animations.map(anim => ({
                      name: anim.name,
                      duration: anim.duration,
                      tracks: anim.tracks ? anim.tracks.map(track => ({
                        name: track.name,
                        times: Array.from(track.times || []),
                        values: Array.from(track.values || [])
                      })) : []
                    })) : [];
                  }

                  if (obj.isMesh) {
                    basicProps.position = obj.position ? { x: obj.position.x, y: obj.position.y, z: obj.position.z } : { x: 0, y: 0, z: 0 };
                    basicProps.rotation = obj.rotation ? { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z } : { x: 0, y: 0, z: 0 };
                    basicProps.scale = obj.scale ? { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z } : { x: 1, y: 1, z: 1 };
                    basicProps.animations = obj.animations ? obj.animations.map(anim => ({
                      name: anim.name,
                      duration: anim.duration,
                      tracks: anim.tracks ? anim.tracks.map(track => ({
                        name: track.name,
                        times: Array.from(track.times || []),
                        values: Array.from(track.values || [])
                      })) : []
                    })) : [];
                  }

                  return basicProps;
                }

                // THREE.js Animation 객체는 특별 처리
                if (obj.isAnimationClip) {
                  threeJsObjectCount++;
                  return {
                    type: 'AnimationClip',
                    name: obj.name,
                    duration: obj.duration,
                    tracks: obj.tracks ? obj.tracks.map(track => ({
                      name: track.name,
                      times: Array.from(track.times),
                      values: Array.from(track.values)
                    })) : []
                  };
                }

                // DOM 요소는 건너뛰기
                if (obj instanceof Element || obj instanceof HTMLElement ||
                  obj instanceof Node || obj instanceof EventTarget) {
                  domElementCount++;
                  return '[DOM Element]';
                }

                // 함수는 건너뛰기
                if (typeof obj === 'function') {
                  functionCount++;
                  return '[Function]';
                }

                // Map, Set 등은 일반 객체로 변환
                if (obj instanceof Map) {
                  const entries = Array.from(obj.entries()).slice(0, 100); // 최대 100개만 처리
                  return Object.fromEntries(entries.map(([k, v]) => [k, cleanObject(v, depth + 1)]));
                }
                if (obj instanceof Set) {
                  const items = Array.from(obj).slice(0, 100); // 최대 100개만 처리
                  return items.map(item => cleanObject(item, depth + 1));
                }

                // 기타 특수 객체들
                if (obj instanceof WeakMap || obj instanceof WeakSet) {
                  return '[Weak Collection]';
                }
                if (obj instanceof ArrayBuffer || obj instanceof SharedArrayBuffer) {
                  return '[Array Buffer]';
                }
                if (obj instanceof DataView) {
                  return '[Data View]';
                }
                if (obj instanceof RegExp) {
                  return obj.toString();
                }
                if (obj instanceof Date) {
                  return obj.toISOString();
                }
                if (obj instanceof Error) {
                  return { name: obj.name, message: obj.message, stack: obj.stack };
                }
              }

              seen.add(obj);
              const cleaned = {};

              // 객체 키 개수 제한
              const keys = Object.keys(obj);
              if (keys.length > 1000) {
                largeObjectCount++;
                return `[Large Object: ${keys.length} properties]`;
              }

              for (const [key, value] of Object.entries(obj)) {
                // 특정 키는 건너뛰기
                if (key === 'mixer' || key === 'animationMixer' ||
                  key === 'renderer' || key === 'camera' || key === 'scene' ||
                  key === 'geometry' || key === 'material' || key === 'texture' ||
                  key === 'userData' && typeof value === 'object' && value !== null) {
                  // userData는 motionTimeline만 유지하고 나머지는 제거
                  if (key === 'userData') {
                    const cleanUserData = {};
                    if (value.motionTimeline) {
                      cleanUserData.motionTimeline = cleanObject(value.motionTimeline, depth + 1);
                    }
                    if (Object.keys(cleanUserData).length > 0) {
                      cleaned[key] = cleanUserData;
                    }
                  }
                  continue;
                }

                // animations는 특별 처리 (THREE.js에서 필요)
                if (key === 'animations' && Array.isArray(value)) {
                  cleaned[key] = value.map(anim => {
                    if (anim && typeof anim === 'object') {
                      return {
                        type: 'AnimationClip',
                        name: anim.name || 'Animation',
                        duration: anim.duration || 0,
                        tracks: anim.tracks ? anim.tracks.map(track => ({
                          name: track.name,
                          times: Array.from(track.times || []),
                          values: Array.from(track.values || [])
                        })) : []
                      };
                    }
                    return anim;
                  });
                  continue;
                }

                // 값 정리
                const cleanedValue = cleanObject(value, depth + 1);
                if (cleanedValue !== undefined) {
                  cleaned[key] = cleanedValue;
                }
              }

              seen.delete(obj);
              return cleaned;
            }

            const result = cleanObject(data);

            // 디버깅 정보 출력
            console.log("데이터 정리 완료:", {
              circularRefCount,
              threeJsObjectCount,
              domElementCount,
              functionCount,
              largeObjectCount,
              totalRemoved: circularRefCount + threeJsObjectCount + domElementCount + functionCount + largeObjectCount
            });

            return result;
          }

          // 저장 전 데이터 정리
          const cleanJson = cleanDataForSaving(editor.toJSON());

          // JSON.stringify에 안전장치 추가
          let jsonString;
          try {
            jsonString = JSON.stringify(cleanJson);
            console.log("JSON 문자열 생성 성공, 길이:", jsonString.length);
          } catch (error) {
            console.error("JSON.stringify 실패:", error);
            // 더 강력한 정리 시도
            const fallbackJson = {
              error: "Data too large to serialize",
              timestamp: new Date().toISOString(),
              motionTimeline: cleanJson.motionTimeline || cleanJson.userData?.motionTimeline
            };
            jsonString = JSON.stringify(fallbackJson);
          }

          const blob = new Blob([jsonString], { type: 'application/json' });

          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log("파일 저장 완료");

        } catch (error) {
          console.error("Error saving file:", error);

          // showSaveFilePicker가 실패하면 대체 방법 사용
          if (error.name === 'AbortError') {
            // 사용자가 취소한 경우 아무것도 하지 않음
            return;
          } else if (error.name === 'SecurityError') {
            console.log("showSaveFilePicker 실패, 대체 방법 사용");
          } else {
            console.log("기타 에러 발생, 대체 방법 사용:", error.name);
          }

          // 대체 방법 실행
          await saveWithFallbackMethod();
        }
      } else {
        // File System Access API를 지원하지 않는 브라우저
        console.log("File System Access API 미지원, 대체 방법 사용");
        await saveWithFallbackMethod();
      }



      // 대체 저장 방법 함수
      async function saveWithFallbackMethod() {
        // 저장 전 데이터 정리 함수 (내부에 정의)
        function cleanDataForSaving(data) {
          // 먼저 데이터 검증 및 복구 수행
          data = validateAndRepairJSON(data);

          if (data === null || data === undefined) {
            return data;
          }

          // 순환 참조 방지를 위한 WeakSet
          const seen = new WeakSet();
          let circularRefCount = 0;
          let threeJsObjectCount = 0;
          let domElementCount = 0;
          let functionCount = 0;
          let largeObjectCount = 0;

          function cleanObject(obj, depth = 0) {
            // 깊이 제한 (무한 재귀 방지)
            if (depth > 10) {
              return '[Max Depth Reached]';
            }

            if (obj === null || typeof obj !== 'object') {
              return obj;
            }

            // 순환 참조 체크
            if (seen.has(obj)) {
              circularRefCount++;
              return '[Circular Reference]';
            }

            // 배열인 경우
            if (Array.isArray(obj)) {
              // 배열 크기 제한
              if (obj.length > 10000) {
                largeObjectCount++;
                return `[Large Array: ${obj.length} items]`;
              }

              seen.add(obj);
              const cleaned = obj.slice(0, 1000).map(item => cleanObject(item, depth + 1)); // 최대 1000개만 처리
              seen.delete(obj);
              return cleaned;
            }

            // 객체인 경우
            if (obj.constructor !== Object) {
              // THREE.js 객체나 특수 객체는 건너뛰기 (하지만 필수 속성은 보존)
              if (obj.isObject3D || obj.isScene || obj.isCamera || obj.isMesh ||
                obj.isMaterial || obj.isTexture || obj.isGeometry ||
                obj.isBufferGeometry || obj.isAnimationMixer ||
                obj.isAnimationAction || obj.isAnimationClip ||
                obj.isBufferAttribute || obj.isInterleavedBuffer ||
                obj.isRenderTarget || obj.isWebGLRenderTarget ||
                obj.isShader || obj.isProgram) {
                threeJsObjectCount++;

                // 기본 속성만 보존
                const basicProps = {
                  type: obj.type || obj.constructor.name,
                  name: obj.name || '',
                  uuid: obj.uuid || '',
                  visible: obj.visible !== undefined ? obj.visible : true
                };

                // 특별한 객체들은 추가 속성 보존
                if (obj.isScene) {
                  // children을 완전한 객체로 저장 (UUID만이 아닌)
                  basicProps.children = obj.children ? obj.children.map(child => {
                    if (child && typeof child === 'object') {
                      return cleanObject(child, depth + 1);
                    }
                    return child.uuid || '';
                  }) : [];
                  basicProps.animations = obj.animations ? obj.animations.map(anim => ({
                    name: anim.name,
                    duration: anim.duration,
                    tracks: anim.tracks ? anim.tracks.map(track => ({
                      name: track.name,
                      times: Array.from(track.times || []),
                      values: Array.from(track.values || [])
                    })) : []
                  })) : [];
                }

                if (obj.isMesh) {
                  basicProps.position = obj.position ? { x: obj.position.x, y: obj.position.y, z: obj.position.z } : { x: 0, y: 0, z: 0 };
                  basicProps.rotation = obj.rotation ? { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z } : { x: 0, y: 0, z: 0 };
                  basicProps.scale = obj.scale ? { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z } : { x: 1, y: 1, z: 1 };
                  basicProps.animations = obj.animations ? obj.animations.map(anim => ({
                    name: anim.name,
                    duration: anim.duration,
                    tracks: anim.tracks ? anim.tracks.map(track => ({
                      name: track.name,
                      times: Array.from(track.times || []),
                      values: Array.from(track.values || [])
                    })) : []
                  })) : [];
                }

                return basicProps;
              }

              // THREE.js Animation 객체는 특별 처리
              if (obj.isAnimationClip) {
                threeJsObjectCount++;
                return {
                  type: 'AnimationClip',
                  name: obj.name,
                  duration: obj.duration,
                  tracks: obj.tracks ? obj.tracks.map(track => ({
                    name: track.name,
                    times: Array.from(track.times),
                    values: Array.from(track.values)
                  })) : []
                };
              }

              // DOM 요소는 건너뛰기
              if (obj instanceof Element || obj instanceof HTMLElement ||
                obj instanceof Node || obj instanceof EventTarget) {
                domElementCount++;
                return '[DOM Element]';
              }

              // 함수는 건너뛰기
              if (typeof obj === 'function') {
                functionCount++;
                return '[Function]';
              }

              // Map, Set 등은 일반 객체로 변환
              if (obj instanceof Map) {
                const entries = Array.from(obj.entries()).slice(0, 100); // 최대 100개만 처리
                return Object.fromEntries(entries.map(([k, v]) => [k, cleanObject(v, depth + 1)]));
              }
              if (obj instanceof Set) {
                const items = Array.from(obj).slice(0, 100); // 최대 100개만 처리
                return items.map(item => cleanObject(item, depth + 1));
              }

              // 기타 특수 객체들
              if (obj instanceof WeakMap || obj instanceof WeakSet) {
                return '[Weak Collection]';
              }
              if (obj instanceof ArrayBuffer || obj instanceof SharedArrayBuffer) {
                return '[Array Buffer]';
              }
              if (obj instanceof DataView) {
                return '[Data View]';
              }
              if (obj instanceof RegExp) {
                return obj.toString();
              }
              if (obj instanceof Date) {
                return obj.toISOString();
              }
              if (obj instanceof Error) {
                return { name: obj.name, message: obj.message, stack: obj.stack };
              }
            }

            seen.add(obj);
            const cleaned = {};

            // 객체 키 개수 제한
            const keys = Object.keys(obj);
            if (keys.length > 1000) {
              largeObjectCount++;
              return `[Large Object: ${keys.length} properties]`;
            }

            for (const [key, value] of Object.entries(obj)) {
              // 특정 키는 건너뛰기
              if (key === 'mixer' || key === 'animationMixer' ||
                key === 'renderer' || key === 'camera' || key === 'scene' ||
                key === 'geometry' || key === 'material' || key === 'texture' ||
                key === 'userData' && typeof value === 'object' && value !== null) {
                // userData는 motionTimeline만 유지하고 나머지는 제거
                if (key === 'userData') {
                  const cleanUserData = {};
                  if (value.motionTimeline) {
                    cleanUserData.motionTimeline = cleanObject(value.motionTimeline, depth + 1);
                  }
                  if (Object.keys(cleanUserData).length > 0) {
                    cleaned[key] = cleanUserData;
                  }
                }
                continue;
              }

              // animations는 특별 처리 (THREE.js에서 필요)
              if (key === 'animations' && Array.isArray(value)) {
                cleaned[key] = value.map(anim => {
                  if (anim && typeof anim === 'object') {
                    return {
                      type: 'AnimationClip',
                      name: anim.name || 'Animation',
                      duration: anim.duration || 0,
                      tracks: anim.tracks ? anim.tracks.map(track => ({
                        name: track.name,
                        times: Array.from(track.times || []),
                        values: Array.from(track.values || [])
                      })) : []
                    };
                  }
                  return anim;
                });
                continue;
              }

              // 값 정리
              const cleanedValue = cleanObject(value, depth + 1);
              if (cleanedValue !== undefined) {
                cleaned[key] = cleanedValue;
              }
            }

            seen.delete(obj);
            return cleaned;
          }

          const result = cleanObject(data);

          // 디버깅 정보 출력
          console.log("데이터 정리 완료:", {
            circularRefCount,
            threeJsObjectCount,
            domElementCount,
            functionCount,
            largeObjectCount,
            totalRemoved: circularRefCount + threeJsObjectCount + domElementCount + functionCount + largeObjectCount
          });

          return result;
        }

        // MotionTimeline 데이터 저장
        if (editor.motionTimeline && editor.motionTimeline.onBeforeSave) {
          console.log("=== MotionTimeline 데이터 저장 시작 ===");
          console.log("this.motionTimeline:", editor.motionTimeline);
          console.log("this.scene.userData:", editor.scene.userData);
          editor.motionTimeline.onBeforeSave();
          console.log("onBeforeSave 완료 후 scene.userData.motionTimeline:", editor.scene.userData.motionTimeline);
          console.log("=== MotionTimeline 데이터 저장 완료 ===");
        }

        // 저장 전 데이터 정리
        const cleanJson = cleanDataForSaving(editor.toJSON());

        // JSON.stringify에 안전장치 추가
        let jsonString;
        try {
          jsonString = JSON.stringify(cleanJson);
          console.log("JSON 문자열 생성 성공, 길이:", jsonString.length, "bytes");
        } catch (error) {
          console.error("JSON.stringify 실패:", error);
          // 더 강력한 정리 시도
          const fallbackJson = {
            error: "Data too large to serialize",
            timestamp: new Date().toISOString(),
            motionTimeline: cleanJson.motionTimeline || cleanJson.userData?.motionTimeline
          };
          jsonString = JSON.stringify(fallbackJson);
        }

        // 압축 기능 제거하고 일반 JSON으로 저장
        const blob = new Blob([jsonString], {
          type: "application/json",
        });

        // 파일명 입력 받기
        const fileName = prompt("파일 이름을 입력하세요:", "project.json");
        if (fileName) {
          // download 속성을 사용한 링크 생성
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';

          // 링크 클릭하여 다운로드 시작
          document.body.appendChild(link);
          link.click();

          // 정리
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);

          console.log("대체 방법으로 파일 저장 완료:", fileName);
        }
      }
    });

  options.add(option);

  // Save As
  // option = new UIRow()
  //   .addClass("option")
  //   .setTextContent(strings.getKey("menubar/file/saveAs"))
  //   .onClick(function () {
  //     const json = editor.toJSON();
  //     const blob = new Blob([JSON.stringify(json)], {
  //       type: "application/json",
  //     });

  //     // 파일 이름 입력 받기
  //     const fileName = prompt("Enter file name:", "project.json");
  //     if (fileName) {
  //       editor.utils.save(blob, fileName);
  //     }
  //   });

  // options.add(option);

  options.add(new UIHorizontalRule());
  // Import

  const form = document.createElement("form");
  form.style.display = "none";
  document.body.appendChild(form);

  const fileInput = document.createElement("input");
  fileInput.multiple = true;
  fileInput.type = "file";
  fileInput.addEventListener("change", function () {
    editor.loader.loadFiles(fileInput.files);
    form.reset();
  });
  form.appendChild(fileInput);

  option = new UIRow();
  option.setClass("option");
  option.setTextContent(strings.getKey("menubar/file/import"));
  option.onClick(function () {
    fileInput.click();
  });
  options.add(option);

  // Export

  const fileExportSubmenuTitle = new UIRow()
    .setTextContent(strings.getKey("menubar/file/export"))
    .addClass("option")
    .addClass("submenu-title");
  fileExportSubmenuTitle.onMouseOver(function () {
    const { top, right } = this.dom.getBoundingClientRect();
    const { paddingTop } = getComputedStyle(this.dom);
    fileExportSubmenu.setLeft(right + "px");
    fileExportSubmenu.setTop(top - parseFloat(paddingTop) + "px");
    fileExportSubmenu.setDisplay("block");
  });
  fileExportSubmenuTitle.onMouseOut(function () {
    fileExportSubmenu.setDisplay("none");
  });
  options.add(fileExportSubmenuTitle);

  const fileExportSubmenu = new UIPanel()
    .setPosition("fixed")
    .addClass("options")
    .setDisplay("none");
  fileExportSubmenuTitle.add(fileExportSubmenu);

  // Export DRC

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("DRC");
  option.onClick(async function () {
    const object = editor.selected;

    if (object === null || object.isMesh === undefined) {
      alert(strings.getKey("prompt/file/export/noMeshSelected"));
      return;
    }

    const { DRACOExporter } = await import(
      "three/addons/exporters/DRACOExporter.js"
    );

    const exporter = new DRACOExporter();

    const options = {
      decodeSpeed: 5,
      encodeSpeed: 5,
      encoderMethod: DRACOExporter.MESH_EDGEBREAKER_ENCODING,
      quantization: [16, 8, 8, 8, 8],
      exportUvs: true,
      exportNormals: true,
      exportColor: object.geometry.hasAttribute("color"),
    };

    // TODO: Change to DRACOExporter's parse( geometry, onParse )?
    const result = exporter.parse(object, options);
    saveArrayBuffer(result, "model.drc");
  });
  fileExportSubmenu.add(option);

  // Export GLB

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("GLB");
  option.onClick(async function () {
    const scene = editor.scene;
    const animations = getAnimations(scene);

    const optimizedAnimations = [];

    for (const animation of animations) {
      optimizedAnimations.push(animation.clone().optimize());
    }

    const { GLTFExporter } = await import(
      "three/addons/exporters/GLTFExporter.js"
    );

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      function (result) {
        saveArrayBuffer(result, "scene.glb");
      },
      undefined,
      { binary: true, animations: optimizedAnimations },
    );
  });
  fileExportSubmenu.add(option);

  // Export GLTF

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("GLTF");
  option.onClick(async function () {
    const scene = editor.scene;
    const animations = getAnimations(scene);

    const optimizedAnimations = [];

    for (const animation of animations) {
      optimizedAnimations.push(animation.clone().optimize());
    }

    const { GLTFExporter } = await import(
      "three/addons/exporters/GLTFExporter.js"
    );

    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      function (result) {
        saveString(JSON.stringify(result, null, 2), "scene.gltf");
      },
      undefined,
      { animations: optimizedAnimations },
    );
  });
  fileExportSubmenu.add(option);

  // Export OBJ

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("OBJ");
  option.onClick(async function () {
    const object = editor.selected;

    if (object === null) {
      alert(strings.getKey("prompt/file/export/noObjectSelected"));
      return;
    }

    const { OBJExporter } = await import(
      "three/addons/exporters/OBJExporter.js"
    );

    const exporter = new OBJExporter();

    saveString(exporter.parse(object), "model.obj");
  });
  fileExportSubmenu.add(option);

  // Export PLY (ASCII)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("PLY");
  option.onClick(async function () {
    const { PLYExporter } = await import(
      "three/addons/exporters/PLYExporter.js"
    );

    const exporter = new PLYExporter();

    exporter.parse(editor.scene, function (result) {
      saveArrayBuffer(result, "model.ply");
    });
  });
  fileExportSubmenu.add(option);

  // Export PLY (BINARY)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("PLY (BINARY)");
  option.onClick(async function () {
    const { PLYExporter } = await import(
      "three/addons/exporters/PLYExporter.js"
    );

    const exporter = new PLYExporter();

    exporter.parse(
      editor.scene,
      function (result) {
        saveArrayBuffer(result, "model-binary.ply");
      },
      { binary: true },
    );
  });
  fileExportSubmenu.add(option);

  // Export STL (ASCII)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("STL");
  option.onClick(async function () {
    const { STLExporter } = await import(
      "three/addons/exporters/STLExporter.js"
    );

    const exporter = new STLExporter();

    saveString(exporter.parse(editor.scene), "model.stl");
  });
  fileExportSubmenu.add(option);

  // Export STL (BINARY)

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("STL (BINARY)");
  option.onClick(async function () {
    const { STLExporter } = await import(
      "three/addons/exporters/STLExporter.js"
    );

    const exporter = new STLExporter();

    saveArrayBuffer(
      exporter.parse(editor.scene, { binary: true }),
      "model-binary.stl",
    );
  });
  fileExportSubmenu.add(option);

  // Export USDZ

  option = new UIRow();
  option.setClass("option");
  option.setTextContent("USDZ");
  option.onClick(async function () {
    const { USDZExporter } = await import(
      "three/addons/exporters/USDZExporter.js"
    );

    const exporter = new USDZExporter();

    saveArrayBuffer(await exporter.parseAsync(editor.scene), "model.usdz");
  });
  fileExportSubmenu.add(option);

  //

  function getAnimations(scene) {
    const animations = [];

    scene.traverse(function (object) {
      animations.push(...object.animations);
    });

    return animations;
  }

  return container;
}

export { MenubarFile };
