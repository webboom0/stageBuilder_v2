import { UITabbedPanel, UISpan } from "./libs/ui.js";

import { SidebarScene } from "./Sidebar.Scene.js";
import { SidebarProperties } from "./Sidebar.Properties.js";
import { SidebarProject } from "./Sidebar.Project.js";
import { SidebarPanelScene } from "./Sidebar.PanelScene.js";
import { SidebarStageSelector } from "./Sidebar.StageSelector.js";
import { SidebarNanseol } from "./Sidebar.Nanseol.js";
import { SidebarSettings } from "./Sidebar.Settings.js";
import { SidebarLight } from "./Sidebar.Light.js";
import { SidebarAssets } from "./SidebarAssets.js";

import { createPanel } from './ui/floatPanel.js';

function Sidebar(editor) {
  // const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setId("sidebar");

  const sidebarProperties = new SidebarProperties(editor);
  const sidebarPanelScene = new SidebarPanelScene(editor);

  // const scene = new UISpan().add(new SidebarScene(editor), sidebarProperties);
  const scene = new UISpan().add(new SidebarScene(editor));
  const project = new SidebarProject(editor);
  const settings = new SidebarSettings(editor);
  const sidebarLight = new SidebarLight(editor);
  const sidebarAssets = new SidebarAssets(editor);

  container.addTab("scene", "Scene", scene);
  container.addTab("light", "Light", sidebarLight);
  // container.addTab("project", strings.getKey("sidebar/project"), project);
  //   container.addTab("settings", strings.getKey("sidebar/settings"), settings);
  container.select("scene");

  // container.addTab("light", "조명", sidebarLight);
  // container.addTab("project", strings.getKey("sidebar/project"), project);
  //   container.addTab("settings", strings.getKey("sidebar/settings"), settings);
  // container.select("scene");

  // const sidebarPropertiesResizeObserver = new ResizeObserver(function () {
  //   sidebarProperties.tabsDiv.setWidth(getComputedStyle(container.dom).width);
  // });

  // sidebarPropertiesResizeObserver.observe(container.tabsDiv.dom);


  const scenePanel = createPanel('Scene', new SidebarPanelScene(editor).dom);
  scenePanel.classList.add('floating-panel-scene-fixed');
  scenePanel.style.overflow = 'auto';

  const stagePanel = createPanel('무대', new SidebarStageSelector(editor).dom);
  const nanseolPanel = createPanel('무대연출', new SidebarNanseol(editor).dom);
  const propertiesPanel = createPanel('Properties', new SidebarProperties(editor).dom);

  const sidebarContainer = document.querySelector('#sidebar');
  sidebarContainer.appendChild(scenePanel);
  sidebarContainer.appendChild(stagePanel);
  sidebarContainer.appendChild(nanseolPanel);
  sidebarContainer.appendChild(propertiesPanel);
  
  // SidebarAssets를 sidebar-assets 컨테이너에 추가
  const sidebarAssetsContainer = document.querySelector('#sidebar-assets');
  if (sidebarAssetsContainer) {
    sidebarAssetsContainer.appendChild(sidebarAssets.dom);
  } else {
    console.warn("⚠️ #sidebar-assets 컨테이너를 찾을 수 없습니다.");
  }

  return container;
}

export { Sidebar };
