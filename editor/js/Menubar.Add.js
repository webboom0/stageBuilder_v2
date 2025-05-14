import * as THREE from "three";

import { UIPanel, UIRow } from "./libs/ui.js";

import { AddObjectCommand } from "./commands/AddObjectCommand.js";

function MenubarAdd(editor) {
  const strings = editor.strings;

  const container = new UIPanel();
  container.setClass("menu add-menu");

  const options = new UIPanel();
  options.setClass("options horizontal-options");
  container.add(options);

  // Group
  let option = new UIRow();

  // Mesh / Box

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
     <i class="fas fa-dice-d6"></i>
     <span>${strings.getKey("menubar/add/mesh/box")}</span>
   `;
  option.onClick(function () {
    const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Box";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  options.add(option);

  /*
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-object-group"></i>
    <span>${strings.getKey("menubar/add/group")}</span>
  `;
  option.onClick(function () {
    const mesh = new THREE.Group();
    mesh.name = "Group";
    editor.execute(new AddObjectCommand(editor, mesh));
  });
  options.add(option);

  // Mesh 버튼과 서브메뉴
  const meshButton = new UIRow();
  meshButton.setClass("option button-style");
  meshButton.dom.innerHTML = `
    <i class="fas fa-cube"></i>
    <span>${strings.getKey("menubar/add/mesh")}</span>
  `;
  meshButton.onClick(function () {
    meshSubmenu.setDisplay(
      meshSubmenu.dom.style.display === "none" ? "block" : "none"
    );
  });
  options.add(meshButton);

  const meshSubmenu = new UIPanel()
    .setPosition("fixed")
    .addClass("options")
    .setDisplay("none");
  meshSubmenu.setClass("submenu");
  options.add(meshSubmenu);

  // Mesh / Box

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-cube"></i>
    <span>${strings.getKey("menubar/add/mesh/box")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Box";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Capsule

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-capsule"></i>
    <span>${strings.getKey("menubar/add/mesh/capsule")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.CapsuleGeometry(1, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Capsule";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Circle

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-circle"></i>
    <span>${strings.getKey("menubar/add/mesh/circle")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.CircleGeometry(1, 32, 0, Math.PI * 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Circle";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Cylinder

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-cylinder"></i>
    <span>${strings.getKey("menubar/add/mesh/cylinder")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.CylinderGeometry(
      1,
      1,
      1,
      32,
      1,
      false,
      0,
      Math.PI * 2
    );
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Cylinder";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Dodecahedron

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-dodecahedron"></i>
    <span>${strings.getKey("menubar/add/mesh/dodecahedron")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Dodecahedron";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Icosahedron

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-icosahedron"></i>
    <span>${strings.getKey("menubar/add/mesh/icosahedron")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Icosahedron";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Lathe

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-lathe"></i>
    <span>${strings.getKey("menubar/add/mesh/lathe")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.LatheGeometry();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
    );
    mesh.name = "Lathe";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Octahedron

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-octahedron"></i>
    <span>${strings.getKey("menubar/add/mesh/octahedron")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.OctahedronGeometry(1, 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Octahedron";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Plane

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-plane"></i>
    <span>${strings.getKey("menubar/add/mesh/plane")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Plane";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Ring

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-ring"></i>
    <span>${strings.getKey("menubar/add/mesh/ring")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.RingGeometry(0.5, 1, 32, 1, 0, Math.PI * 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Ring";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Sphere

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-circle"></i>
    <span>${strings.getKey("menubar/add/mesh/sphere")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.SphereGeometry(
      1,
      32,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI
    );
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Sphere";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Sprite

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-paint-brush"></i>
    <span>${strings.getKey("menubar/add/mesh/sprite")}</span>
  `;
  option.onClick(function () {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
    sprite.name = "Sprite";

    editor.execute(new AddObjectCommand(editor, sprite));
  });
  meshSubmenu.add(option);

  // Mesh / Tetrahedron

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-tetrahedron"></i>
    <span>${strings.getKey("menubar/add/mesh/tetrahedron")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.TetrahedronGeometry(1, 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Tetrahedron";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Torus

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-torus"></i>
    <span>${strings.getKey("menubar/add/mesh/torus")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.TorusGeometry(1, 0.4, 12, 48, Math.PI * 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Torus";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / TorusKnot

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-torus-knot"></i>
    <span>${strings.getKey("menubar/add/mesh/torusknot")}</span>
  `;
  option.onClick(function () {
    const geometry = new THREE.TorusKnotGeometry(1, 0.4, 64, 8, 2, 3);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "TorusKnot";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);

  // Mesh / Tube

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-tube"></i>
    <span>${strings.getKey("menubar/add/mesh/tube")}</span>
  `;
  option.onClick(function () {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2, 2, -2),
      new THREE.Vector3(2, -2, -0.6666666666666667),
      new THREE.Vector3(-2, -2, 0.6666666666666667),
      new THREE.Vector3(-2, 2, 2),
    ]);

    const geometry = new THREE.TubeGeometry(path, 64, 1, 8, false);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Tube";

    editor.execute(new AddObjectCommand(editor, mesh));
  });
  meshSubmenu.add(option);
*/
  // Light 버튼과 서브메뉴
  // const lightButton = new UIRow();
  // lightButton.setClass("option button-style");
  // lightButton.dom.innerHTML = `
  //   <i class="fas fa-lightbulb"></i>
  //   <span>${strings.getKey("menubar/add/light")}</span>
  // `;
  // lightButton.onClick(function () {
  //   lightSubmenu.setDisplay(
  //     lightSubmenu.dom.style.display === "none" ? "block" : "none"
  //   );
  // });
  // options.add(lightButton);

  // const lightSubmenu = new UIPanel()
  //   .setPosition("fixed")
  //   .addClass("options")
  //   .setDisplay("none");
  // lightSubmenu.setClass("submenu");
  // options.add(lightSubmenu);

  // Light / Ambient

  // option = new UIRow();
  // option.setClass("option button-style");
  // option.dom.innerHTML = `
  //   <i class="fas fa-sun"></i>
  //   <span>${strings.getKey("menubar/add/light/ambient")}</span>
  // `;
  // option.onClick(function () {
  //   const color = 0x222222;

  //   const light = new THREE.AmbientLight(color);
  //   light.name = "AmbientLight";

  //   editor.execute(new AddObjectCommand(editor, light));
  // });
  // options.add(option);

  // Light / Hemisphere

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
      <i class="fas fa-cube"></i>
      <span>${strings.getKey("menubar/add/light/hemisphere")}</span>
    `;
  option.onClick(function () {
    const skyColor = 0x00aaff;
    const groundColor = 0xffaa00;
    const intensity = 1;

    const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
    light.name = "HemisphereLight";

    light.position.set(0, 10, 0);

    editor.execute(new AddObjectCommand(editor, light));
  });
  options.add(option);

  // Light / Directional

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-lightbulb"></i>
    <span>${strings.getKey("menubar/add/light/directional")}</span>
  `;
  option.onClick(function () {
    const color = 0xffffff;
    const intensity = 1;

    const light = new THREE.DirectionalLight(color, intensity);
    light.name = "DirectionalLight";
    light.target.name = "DirectionalLight Target";

    light.position.set(5, 10, 7.5);

    editor.execute(new AddObjectCommand(editor, light));
  });
  options.add(option);

  // Light / Point

  // option = new UIRow();
  // option.setClass("option button-style");
  // option.dom.innerHTML = `
  //   <i class="fas fa-circle"></i>
  //   <span>${strings.getKey("menubar/add/light/point")}</span>
  // `;
  // option.onClick(function () {
  //   const color = 0xffffff;
  //   const intensity = 1;
  //   const distance = 0;

  //   const light = new THREE.PointLight(color, intensity, distance);
  //   light.name = "PointLight";

  //   editor.execute(new AddObjectCommand(editor, light));
  // });
  // lightSubmenu.add(option);

  // Light / Spot

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-star"></i>
    <span>${strings.getKey("menubar/add/light/spot")}</span>
  `;
  option.onClick(function () {
    const color = 0xffffff;
    const intensity = 1;
    const distance = 0;
    const angle = Math.PI * 0.1;
    const penumbra = 0;

    const light = new THREE.SpotLight(
      color,
      intensity,
      distance,
      angle,
      penumbra,
    );
    light.name = "SpotLight";

    // light.target.name = "SpotLight Target";

    light.position.set(5, 10, 7.5);
    // light.decay.set(0);

    // Target 설정
    const targetObject = new THREE.Object3D();
    light.target = targetObject;
    light.target.name = "SpotLight Target";
    targetObject.position.set(1, 1, 1); // 빛이 비출 위치 설정
    editor.scene.add(targetObject);

    // Scene에 SpotLight 추가
    // editor.scene.add(spotLight);

    editor.execute(new AddObjectCommand(editor, light));
  });
  options.add(option);

  // Camera 버튼과 서브메뉴
  // const cameraButton = new UIRow();
  // cameraButton.setClass("option button-style");
  // cameraButton.dom.innerHTML = `
  //   <i class="fas fa-camera"></i>
  //   <span>${strings.getKey("menubar/add/camera")}</span>
  // `;
  // cameraButton.onClick(function () {
  //   cameraSubmenu.setDisplay(
  //     cameraSubmenu.dom.style.display === "none" ? "block" : "none"
  //   );
  // });
  // options.add(cameraButton);

  const cameraSubmenu = new UIPanel()
    .setPosition("fixed")
    .addClass("options")
    .setDisplay("none");
  cameraSubmenu.setClass("submenu");
  options.add(cameraSubmenu);

  // Camera / Perspective

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-video"></i>
    <span>${strings.getKey("menubar/add/camera/perspective")}</span>
  `;
  option.onClick(function () {
    const camera = new THREE.PerspectiveCamera();
    camera.name = "PerspectiveCamera";

    editor.execute(new AddObjectCommand(editor, camera));
  });
  cameraSubmenu.add(option);

  // Camera / Orthographic

  option = new UIRow();
  option.setClass("option button-style");
  option.dom.innerHTML = `
    <i class="fas fa-film"></i>
    <span>${strings.getKey("menubar/add/camera/orthographic")}</span>
  `;
  option.onClick(function () {
    const aspect = editor.camera.aspect;
    const camera = new THREE.OrthographicCamera(-aspect, aspect);
    camera.name = "OrthographicCamera";

    editor.execute(new AddObjectCommand(editor, camera));
  });
  cameraSubmenu.add(option);

  return container;
}

export { MenubarAdd };
