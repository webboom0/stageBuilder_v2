import { UIPanel, UIRow, UIHorizontalRule } from "./libs/ui.js";
// import { initMusic } from "./VideoEdit.js";

function MenubarFile(editor) {
  const strings = editor.strings;

  const saveArrayBuffer = editor.utils.saveArrayBuffer;
  const saveString = editor.utils.saveString;

  const container = new UIPanel();
  container.setClass("menu file-menu");

  const options = new UIPanel();
  options.setClass("options horizontal-options");
  container.add(options);

  // New 버튼
  const newButton = new UIRow();
  newButton.setClass("option button-style");
  newButton.dom.innerHTML = `
    <i class="fas fa-file"></i>
    <span>${strings.getKey("menubar/file/new")}</span>
  `;
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

  // Import 버튼
  const importButton = new UIRow();
  importButton.setClass("option button-style");
  importButton.dom.innerHTML = `
    <i class="fas fa-file-import"></i>
    <span>${strings.getKey("menubar/file/import")}</span>
  `;
  importButton.onClick(function () {
    const input = document.createElement("input");
    input.type = "file";
    input.addEventListener("change", function () {
      editor.loader.loadFiles(input.files);
    });
    input.click();
  });
  options.add(importButton);

  // Export 버튼
  // const exportButton = new UIRow();
  // exportButton.setClass("option button-style");
  // exportButton.dom.innerHTML = `
  //   <i class="fas fa-file-export"></i>
  //   <span>${strings.getKey("menubar/file/export")}</span>
  // `;
  // exportButton.onClick(function () {
  //   exportSubmenu.setDisplay(
  //     exportSubmenu.dom.style.display === "none" ? "block" : "none"
  //   );
  // });
  // options.add(exportButton);

  // Publish 버튼
  // const publishButton = new UIRow();
  // publishButton.setClass("option button-style");
  // publishButton.dom.innerHTML = `
  //   <i class="fas fa-globe"></i>
  //   <span>${strings.getKey("menubar/file/publish")}</span>
  // `;
  // publishButton.onClick(function () {
  //   publishSubmenu.setDisplay(
  //     publishSubmenu.dom.style.display === "none" ? "block" : "none"
  //   );
  // });
  // options.add(publishButton);

  // Export 서브메뉴
  const exportSubmenu = new UIPanel();
  exportSubmenu.setClass("submenu");
  exportSubmenu.dom.style.display = "none";
  options.add(exportSubmenu);

  // Publish 서브메뉴
  const publishSubmenu = new UIPanel();
  publishSubmenu.setClass("submenu");
  publishSubmenu.dom.style.display = "none";
  options.add(publishSubmenu);

  // New Project 버튼
  // const newProjectButton = new UIRow();
  // newProjectButton.setClass("option button-style");
  // newProjectButton.dom.innerHTML = `
  //   <i class="fas fa-folder-plus"></i>
  //   <span>${strings.getKey("menubar/file/new")}</span>
  // `;
  // newProjectButton.onClick(function () {
  //   newProjectSubmenu.setDisplay(
  //     newProjectSubmenu.dom.style.display === "none" ? "block" : "none"
  //   );
  // });
  // options.add(newProjectButton);

  // New Project 서브메뉴
  const newProjectSubmenu = new UIPanel();
  newProjectSubmenu.setClass("submenu");
  newProjectSubmenu.setPosition("fixed");
  newProjectSubmenu.dom.style.display = "none";
  options.add(newProjectSubmenu);

  // New Project / Empty
  let option = new UIRow()
    .setTextContent(strings.getKey("menubar/file/new/empty"))
    .setClass("option");
  option.onClick(function () {
    if (confirm(strings.getKey("prompt/file/open"))) {
      editor.clear();
    }
  });
  newProjectSubmenu.add(option);

  //

  //   newProjectSubmenu.add(new UIHorizontalRule());

  // New Project / ...

  // const examples = [
  // 	{ title: 'menubar/file/new/Arkanoid', file: 'arkanoid.app.json' },
  // 	{ title: 'menubar/file/new/Camera', file: 'camera.app.json' },
  // 	{ title: 'menubar/file/new/Particles', file: 'particles.apㅁp.json' },
  // 	{ title: 'menubar/file/new/Pong', file: 'pong.app.json' },
  // 	{ title: 'menubar/file/new/Shaders', file: 'shaders.app.json' }
  // ];

  // const loader = new THREE.FileLoader();

  // for ( let i = 0; i < examples.length; i ++ ) {

  // 	( function ( i ) {

  // 		const example = examples[ i ];

  // 		const option = new UIRow();
  // 		option.setClass( 'option' );
  // 		option.setTextContent( strings.getKey( example.title ) );
  // 		option.onClick( function () {

  // 			if ( confirm( strings.getKey( 'prompt/file/open' ) ) ) {

  // 				loader.load( 'examples/' + example.file, function ( text ) {

  // 					editor.clear();
  // 					editor.fromJSON( JSON.parse( text ) );

  // 				} );

  // 			}

  // 		} );
  // 		newProjectSubmenu.add( option );

  // 	} )( i );

  // }

  // Open Project Form
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
        await editor.fromJSON(json);
        editor.signals.editorCleared.remove(onEditorCleared);
      }

      editor.signals.editorCleared.add(onEditorCleared);
      editor.clear();
    } catch (e) {
      alert(strings.getKey("prompt/file/failedToOpenProject"));
      console.error(e);
    } finally {
      openProjectForm.reset();
    }
  });

  openProjectForm.appendChild(openProjectInput);

  // Open 버튼
  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-folder-open"></i>
    <span>${strings.getKey("menubar/file/open")}</span>
  `;
  option.onClick(function () {
    if (confirm(strings.getKey("prompt/file/open"))) {
      openProjectInput.click();
    }
  });
  options.add(option);

  // Save 버튼
  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-save"></i>
    <span>${strings.getKey("menubar/file/save")}</span>
  `;
  option.onClick(function () {
    const json = editor.toJSON();
    console.log("Saving project:", json); // 저장되는 전체 데이터 확인
    // 특히 music 데이터가 있는지 확인
    if (json.music) {
      console.log("Music data being saved:", json.music);
    } else {
      console.log("No music data to save");
    }
    const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
    editor.utils.save(blob, "project.json");
  });
  options.add(option);

  //

  options.add(new UIHorizontalRule());

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
  exportSubmenu.add(option);

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
      { binary: true, animations: optimizedAnimations }
    );
  });
  exportSubmenu.add(option);

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
      { animations: optimizedAnimations }
    );
  });
  exportSubmenu.add(option);

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
  exportSubmenu.add(option);

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
  exportSubmenu.add(option);

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
      { binary: true }
    );
  });
  exportSubmenu.add(option);

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
  exportSubmenu.add(option);

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
      "model-binary.stl"
    );
  });
  exportSubmenu.add(option);

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
  exportSubmenu.add(option);

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

// window.addEventListener("load", () => {
//   const savedMusicState = localStorage.getItem("musicState");
//   if (savedMusicState) {
//     editor.music = JSON.parse(savedMusicState);
//     // 필요한 경우 UI 요소 업데이트
//     startTimeUi.dom.value = formatTime(editor.music.startTime);
//     endTimeUi.dom.value = formatTime(editor.music.endTime);
//   }
// });
