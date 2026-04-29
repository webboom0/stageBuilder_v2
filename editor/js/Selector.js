import * as THREE from "three";

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

class Selector {
  constructor(editor) {
    const signals = editor.signals;

    this.editor = editor;
    this.signals = signals;

    // signals

    signals.intersectionsDetected.add((intersects) => {
      if (intersects.length > 0) {
        const object = intersects[0].object;

        if (object.userData.object !== undefined) {
          // helper

          this.select(object.userData.object);
        } else {
          this.select(object);
        }
      } else {
        this.select(null);
      }
    });
  }

  getIntersects(raycaster) {
    const objects = [];

    this.editor.scene.traverseVisible(function (child) {
      objects.push(child);
    });

    this.editor.sceneHelpers.traverseVisible(function (child) {
      if (child.name === "picker") objects.push(child);
    });

    return raycaster.intersectObjects(objects, false);
  }

  getPointerIntersects(point, camera) {
    mouse.set(point.x * 2 - 1, -(point.y * 2) + 1);

    raycaster.setFromCamera(mouse, camera);

    return this.getIntersects(raycaster);
  }

  select(object) {
    if (object !== null && object !== this.editor.scene) {
      const objectName = String(object.name || "");
      const shouldSelectSelf =
        object.isLight === true ||
        objectName.startsWith("_StageFrontSpotTarget_") ||
        object.userData?.selectSelf === true;

      // 기본은 최상위 부모 선택(기존 동작 유지), 단 라이트/특정 타겟은 자기 자신 선택
      let selectedObject = object;
      if (!shouldSelectSelf) {
        let topParent = object;
        while (topParent.parent && topParent.parent !== this.editor.scene) {
          topParent = topParent.parent;
        }
        selectedObject = topParent;
      }

      // 이미 같은 객체가 선택되어 있다면 리턴
      if (this.editor.selected === selectedObject) return;

      let uuid = selectedObject.uuid;
      this.editor.selected = selectedObject;
      this.editor.config.setKey("selected", uuid);
    } else {
      this.editor.selected = null;
      this.editor.config.setKey("selected", null);
    }

    this.signals.objectSelected.dispatch(this.editor.selected);
  }

  deselect() {
    this.select(null);
  }
}

export { Selector };