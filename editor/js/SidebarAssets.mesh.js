import * as THREE from "three";
import { UIButton } from "./libs/ui.js";
import { AddObjectCommand } from "./commands/AddObjectCommand.js";

// Viewport.js와 동일한 바닥 레벨 (바닥 아래로 이동 방지)
const DEFAULT_FLOOR_LEVEL = -3.8;

export function createMeshPanel(editor) {
  const meshPanel = document.createElement("div");
  meshPanel.className = "mesh-panel";

  const panelContent = document.createElement("div");
  panelContent.className = "panel-content";

  // 버튼 그리드 컨테이너 (직육면체, 원통)
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "mesh-buttons-container";

  // 직육면체 (Box) 버튼
  const boxBtn = new UIButton("");
  boxBtn.setInnerHTML("<i class='fas fa-cube'></i> 직육면체");
  boxBtn.dom.classList.add("mesh-add-btn");
  boxBtn.onClick(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = "Box";
    mesh.scale.set(20, 20, 20);
    const halfHeight = 10;
    mesh.position.y = DEFAULT_FLOOR_LEVEL + halfHeight;
    mesh.userData.minYPosition = mesh.position.y;
    mesh.userData.source = 'mesh';
    editor.execute(new AddObjectCommand(editor, mesh));
  });
  buttonsContainer.appendChild(boxBtn.dom);

  // 원통 (Cylinder) 버튼
  const cylinderBtn = new UIButton("");
  cylinderBtn.setInnerHTML("<i class='fas fa-database'></i> 원통");
  cylinderBtn.dom.classList.add("mesh-add-btn");
  cylinderBtn.onClick(() => {
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
    mesh.scale.set(12, 12, 12);
    const halfHeight = 6;
    mesh.position.y = DEFAULT_FLOOR_LEVEL + halfHeight;
    mesh.userData.minYPosition = mesh.position.y;
    mesh.userData.source = 'mesh';
    editor.execute(new AddObjectCommand(editor, mesh));
  });
  buttonsContainer.appendChild(cylinderBtn.dom);

  panelContent.appendChild(buttonsContainer);
  meshPanel.appendChild(panelContent);

  return meshPanel;
}
