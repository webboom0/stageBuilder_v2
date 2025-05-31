import { Box3, Vector3 } from "three";

import { UIPanel, UIRow, UIHorizontalRule, UIText } from "./libs/ui.js";

import { AddObjectCommand } from "./commands/AddObjectCommand.js";
import { RemoveObjectCommand } from "./commands/RemoveObjectCommand.js";
import { SetPositionCommand } from "./commands/SetPositionCommand.js";
import { clone } from "../../examples/jsm/utils/SkeletonUtils.js";

function MenubarEdit(editor) {
  const strings = editor.strings;

  const container = new UIPanel();
  container.setClass("menu edit-menu");

  const options = new UIPanel();
  options.setClass("options horizontal-options");
  container.add(options);

  // Undo 버튼
  // const undoButton = new UIRow();
  // undoButton.setClass("option button-style");
  // undoButton.dom.innerHTML = `
  //   <i class="fas fa-undo"></i>
  //   <span>${strings.getKey("menubar/edit/undo")}</span>
  // `;
  // undoButton.onClick(function () {
  //   editor.undo();
  // });
  // options.add(undoButton);

  // Redo 버튼
  // const redoButton = new UIRow();
  // redoButton.setClass("option button-style");
  // redoButton.dom.innerHTML = `
  //   <i class="fas fa-redo"></i>
  //   <span>${strings.getKey("menubar/edit/redo")}</span>
  // `;
  // redoButton.onClick(function () {
  //   editor.redo();
  // });
  // options.add(redoButton);

  // Clone 버튼
  // const cloneButton = new UIRow();
  // cloneButton.setClass("option button-style");
  // cloneButton.dom.innerHTML = `
  //   <i class="fas fa-clone"></i>
  //   <span>${strings.getKey("menubar/edit/clone")}</span>
  // `;
  // cloneButton.onClick(function () {
  //   let object = editor.selected;
  //   if (object.parent === null) return; // avoid cloning the camera or scene

  //   object = object.clone();
  //   editor.execute(new AddObjectCommand(editor, object));
  // });
  // options.add(cloneButton);

  const cloneButton = new UIRow();
  cloneButton.setClass("option button-style");
  cloneButton.dom.innerHTML = `
    <i class="fas fa-clone"></i>
    <span>${strings.getKey("menubar/edit/clone")}</span>
  `;
  cloneButton.onClick(function () {
    let object = editor.selected;

    if (object === null || object.parent === null) return; // avoid cloning the camera or scene

    object = clone(object);

    editor.execute(new AddObjectCommand(editor, object));
  });
  options.add(cloneButton);

  // Delete 버튼
  const deleteButton = new UIRow();
  deleteButton.setClass("option button-style");
  deleteButton.dom.innerHTML = `
    <i class="fas fa-trash-alt"></i>
    <span>${strings.getKey("menubar/edit/delete")}</span>
  `;
  deleteButton.onClick(function () {
    let object = editor.selected;

    if (confirm("Delete " + object.name + "?")) {
      const parent = object.parent;
      if (parent !== null)
        editor.execute(new RemoveObjectCommand(editor, object));
    }
  });
  options.add(deleteButton);

  // Center 버튼
  // const centerButton = new UIRow();
  // centerButton.setClass("option button-style");
  // centerButton.dom.innerHTML = `
  //   <i class="fas fa-crosshairs"></i>
  //   <span>${strings.getKey("menubar/edit/center")}</span>
  // `;
  // centerButton.onClick(function () {
  //   const object = editor.selected;
  //   const geometry = object.geometry;

  //   if (geometry) {
  //     geometry.center();
  //     geometry.computeBoundingSphere();

  //     const cmd = new SetGeometryCommand(editor, object, geometry);
  //     cmd.update();

  //     editor.signals.geometryChanged.dispatch(object);
  //   }
  // });
  // options.add(centerButton);

  return container;
}

export { MenubarEdit };
