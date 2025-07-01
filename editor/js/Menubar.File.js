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
      const json = JSON.parse(await file.text());
      console.log("Loading project:", json); // 불러오는 데이터 확인

      async function onEditorCleared() {
        try {
          await editor.fromJSON(json);
        } catch (error) {
          console.error("JSON 데이터 로드 중 오류:", error);
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
    .onClick(function () {
      const json = editor.toJSON();
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
    });

  options.add(option);

  //

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

          const json = editor.toJSON();
          const blob = new Blob([JSON.stringify(json)], {
            type: "application/json",
          });

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
        // MotionTimeline 데이터 저장
        if (editor.motionTimeline && editor.motionTimeline.onBeforeSave) {
          console.log("=== MotionTimeline 데이터 저장 시작 ===");
          console.log("this.motionTimeline:", editor.motionTimeline);
          console.log("this.scene.userData:", editor.scene.userData);
          editor.motionTimeline.onBeforeSave();
          console.log("onBeforeSave 완료 후 scene.userData.motionTimeline:", editor.scene.userData.motionTimeline);
          console.log("=== MotionTimeline 데이터 저장 완료 ===");
        }

        const json = editor.toJSON();
        const blob = new Blob([JSON.stringify(json)], {
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
