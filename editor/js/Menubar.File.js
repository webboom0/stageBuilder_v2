import { UIPanel, UIRow, UIHorizontalRule } from "./libs/ui.js";
import { ProgressiveLoader } from './utils/ProgressiveLoader.js';

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
  openProjectInput.accept = ".json,.zip";
  openProjectInput.addEventListener("change", async function () {
     // 파일 선택 즉시 오버레이 UI 띄우기
    if (editor.progressiveLoader && typeof editor.progressiveLoader.createProgressUI === 'function') {
      editor.progressiveLoader.createProgressUI();
    } else {
      // ProgressiveLoader 인스턴스가 아직 없으면 임시로 생성해서라도 UI 띄움
      import('./utils/ProgressiveLoader.js').then(({ ProgressiveLoader }) => {
        (new ProgressiveLoader(editor)).createProgressUI();
      });
    }
    const file = openProjectInput.files[0];

    if (file === undefined) return;

    try {
      console.log("파일 로드 시작:", file.name, file.type);

      async function onEditorCleared() {
        try {
                  if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
          // ZIP 파일 처리
          console.log("ZIP 파일 감지, 압축 해제 중...");
          await editor.fromJSON(file); // Blob으로 전달
        } else {
            // JSON 파일 처리
            const json = JSON.parse(await file.text());
            console.log("Loading project:", json); // 불러오는 데이터 확인
            await editor.fromJSON(json);
          }
        } catch (error) {
          console.error("파일 로드 중 오류:", error);
          alert("파일 로드 중 오류가 발생했습니다: " + error.message);
        }

        editor.signals.editorCleared.remove(onEditorCleared);
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
    .onClick(async function () {
      try {
        const json = await editor.toJSON(); // async 호출
        console.log("Saving project:", json); // 저장되는 전체 데이터 확인
        // 특히 music 데이터가 있는지 확인
        if (json.music) {
          console.log("Music data being saved:", json.music);
        } else {
          console.log("No music data to save");
        }
        const blob = new Blob([JSON.stringify(json)], {
          type: "application/json",
        });
        editor.utils.save(blob, "project.json");
      } catch (error) {
        console.error("프로젝트 저장 중 오류:", error);
        alert("프로젝트 저장 중 오류가 발생했습니다: " + error.message);
      }
    });

  // options.add(option);

  //

  // Save As with Download Attribute

  option = new UIRow()
    .addClass("option")
    .setTextContent("저장하기(ZIP)")
    .onClick(async function () {
      // ZIP 저장만 허용, 취소 시 아무 동작 없음
      const saveMethod = confirm("ZIP 파일로 저장하시겠습니까?");
      if (saveMethod) {
        // ZIP 파일로 저장
        await saveAsZip();
      } else {
        // 취소
        return;
      }
    });

  options.add(option);

  // ZIP 파일로 저장하는 함수
  async function saveAsZip() {
    const loader = new ProgressiveLoader(editor);
    try {
      loader.createProgressUI();
      loader.totalItems = 3;
      loader.loadedItems = 0;
      document.querySelector('#progressive-loader-progress h3').textContent = '프로젝트 저장 중...';
      loader.updateProgress();
      
      // 1단계: 데이터 준비
      loader.loadedItems = 1;
      loader.updateProgress();
      document.getElementById('progress-detail').textContent = '데이터 준비 중...';

      // showSaveFilePicker를 사용자 제스처 내에서 즉시 실행
      if ("showSaveFilePicker" in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: "project.zip",
          types: [
            {
              description: "ZIP Files",
              accept: { "application/zip": [".zip"] },
            },
          ],
        });

        // 2단계: ZIP 파일 생성
        loader.loadedItems = 2;
        loader.updateProgress();
        document.getElementById('progress-detail').textContent = 'ZIP 파일 생성 중...';
        const zipBlob = await editor.toProjectZip("project", {
          splitTimeline: true,
          splitMusic: true,
          splitHistory: false
        });

        // 3단계: 파일 저장
        loader.loadedItems = 3;
        loader.updateProgress();
        document.getElementById('progress-detail').textContent = '파일 저장 중...';
        const writable = await handle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
        console.log("ZIP 파일 저장 완료");

      } else {
        // 대체 방법
        loader.loadedItems = 2;
        loader.updateProgress();
        document.getElementById('progress-detail').textContent = 'ZIP 파일 생성 중...';
        const zipBlob = await editor.toProjectZip("project", {
          splitTimeline: true,
          splitMusic: true,
          splitHistory: false
        });

        loader.loadedItems = 3;
        loader.updateProgress();
        document.getElementById('progress-detail').textContent = '파일 저장 중...';
        const fileName = prompt("파일 이름을 입력하세요:", "project.zip");
        if (fileName) {
          const url = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
          console.log("ZIP 파일 저장 완료:", fileName);
        }
      }
      setTimeout(() => loader.hideProgressUI(), 700);
    } catch (error) {
      loader.hideProgressUI();
      console.error("ZIP 파일 저장 실패:", error);
      alert("ZIP 파일 저장 중 오류가 발생했습니다: " + error.message);
    }
  }

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