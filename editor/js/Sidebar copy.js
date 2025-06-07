import { UITabbedPanel, UISpan } from "./libs/ui.js";

import { SidebarScene } from "./Sidebar.Scene.js";
import { SidebarProperties } from "./Sidebar.Properties.js";
import { SidebarProject } from "./Sidebar.Project.js";
import { SidebarSettings } from "./Sidebar.Settings.js";
import { SidebarLight } from "./Sidebar.Light.js";

import { createPanel } from './ui/floatPanel.js';

function Sidebar(editor) {
  const strings = editor.strings;

  const container = new UITabbedPanel();
  container.setId("sidebar");

  // const sidebarProperties = new SidebarProperties(editor);

  // const scene = new UISpan().add(new SidebarScene(editor), sidebarProperties);
  const scene = new UISpan().add(new SidebarScene(editor));
  const project = new SidebarProject(editor);
  const settings = new SidebarSettings(editor);
  const sidebarLight = new SidebarLight(editor);

  container.addTab("scene", strings.getKey("sidebar/scene"), scene);
  container.addTab("light", "조명", sidebarLight);
  // container.addTab("project", strings.getKey("sidebar/project"), project);
  //   container.addTab("settings", strings.getKey("sidebar/settings"), settings);
  container.select("scene");

  // const sidebarPropertiesResizeObserver = new ResizeObserver(function () {
  //   sidebarProperties.tabsDiv.setWidth(getComputedStyle(container.dom).width);
  // });

  // sidebarPropertiesResizeObserver.observe(container.tabsDiv.dom);

  // 탭으로 묶기
  const sceneTab = { title: 'Scene', content: new SidebarScene(editor).dom };
  const lightTab = { title: 'Light', content: new SidebarLight(editor).dom };
  const tabbedPanel = createTabbedPanel([sceneTab, lightTab]);
  const sceneLightPanel = createPanel('Scene/Light', tabbedPanel);

  const propertiesPanel = createPanel('Properties', new SidebarProperties(editor).dom);

  const sidebarContainer = document.querySelector('.side');
  sidebarContainer.appendChild(sceneLightPanel);
  sidebarContainer.appendChild(propertiesPanel);

  return container;
}

// 탭 패널 생성 함수
function createTabbedPanel(tabs) {
  // tabs: [{title: 'Scene', content: DOM}, {title: 'Light', content: DOM}]
  const panel = document.createElement('div');
  panel.className = 'tabbed-panel';

  const tabHeader = document.createElement('div');
  tabHeader.className = 'tab-header';

  const tabContent = document.createElement('div');
  tabContent.className = 'tab-content';

  tabs.forEach((tab, idx) => {
    const btn = document.createElement('button');
    btn.textContent = tab.title;
    btn.className = 'tab-btn';
    if (idx === 0) btn.classList.add('active');
    btn.onclick = () => {
      // 모든 버튼/컨텐츠 비활성화
      tabHeader.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      tabContent.childNodes.forEach(c => c.style.display = 'none');
      // 현재 탭 활성화
      btn.classList.add('active');
      tabContent.childNodes[idx].style.display = '';
    };
    tabHeader.appendChild(btn);

    // 컨텐츠
    tab.content.style.display = idx === 0 ? '' : 'none';
    tabContent.appendChild(tab.content);
  });

  panel.appendChild(tabHeader);
  panel.appendChild(tabContent);
  return panel;
}

export { Sidebar };
