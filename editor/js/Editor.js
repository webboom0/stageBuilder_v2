import * as THREE from "three";

import { Config } from "./Config.js";
import { Loader } from "./Loader.js";
import { History as _History } from "./History.js";
import { Strings } from "./Strings.js";
import { Storage as _Storage } from "./Storage.js";
import { Selector } from "./Selector.js";

var _DEFAULT_CAMERA = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
_DEFAULT_CAMERA.name = "Camera";
_DEFAULT_CAMERA.position.set(0, 5, 10);
_DEFAULT_CAMERA.lookAt(new THREE.Vector3());

function Editor() {
  const Signal = signals.Signal; // eslint-disable-line no-undef

  this.signals = {
    // script

    editScript: new Signal(),

    // player

    startPlayer: new Signal(),
    stopPlayer: new Signal(),

    // xr

    enterXR: new Signal(),
    offerXR: new Signal(),
    leaveXR: new Signal(),

    // notifications

    editorCleared: new Signal(),

    savingStarted: new Signal(),
    savingFinished: new Signal(),

    transformModeChanged: new Signal(),
    snapChanged: new Signal(),
    spaceChanged: new Signal(),
    rendererCreated: new Signal(),
    rendererUpdated: new Signal(),
    rendererDetectKTX2Support: new Signal(),

    sceneBackgroundChanged: new Signal(),
    sceneEnvironmentChanged: new Signal(),
    sceneFogChanged: new Signal(),
    sceneFogSettingsChanged: new Signal(),
    sceneGraphChanged: new Signal(),
    sceneRendered: new Signal(),

    cameraChanged: new Signal(),
    cameraResetted: new Signal(),

    geometryChanged: new Signal(),

    objectSelected: new Signal(),
    objectFocused: new Signal(),

    objectAdded: new Signal(),
    objectChanged: new Signal(),
    objectRemoved: new Signal(),

    cameraAdded: new Signal(),
    cameraRemoved: new Signal(),

    helperAdded: new Signal(),
    helperRemoved: new Signal(),

    materialAdded: new Signal(),
    materialChanged: new Signal(),
    materialRemoved: new Signal(),

    scriptAdded: new Signal(),
    scriptChanged: new Signal(),
    scriptRemoved: new Signal(),

    windowResize: new Signal(),

    showHelpersChanged: new Signal(),
    refreshSidebarObject3D: new Signal(),
    refreshSidebarEnvironment: new Signal(),
    historyChanged: new Signal(),

    viewportCameraChanged: new Signal(),
    viewportShadingChanged: new Signal(),

    intersectionsDetected: new Signal(),

    pathTracerUpdated: new Signal(),

    // 점진적 로딩 (3단계)
    progressiveLoadingComplete: new Signal(),
    progressiveLoadingError: new Signal(),
  };

  this.config = new Config();
  this.history = new _History(this);
  this.selector = new Selector(this);
  this.storage = new _Storage();
  this.strings = new Strings(this.config);

  this.loader = new Loader(this);

  this.camera = _DEFAULT_CAMERA.clone();

  this.scene = new THREE.Scene();
  this.scene.name = "Scene";

  this.sceneHelpers = new THREE.Scene();
  this.sceneHelpers.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));

  this.object = {};
  this.geometries = {};
  this.materials = {};
  this.textures = {};
  this.scripts = {};

  this.materialsRefCounter = new Map(); // tracks how often is a material used by a 3D object

  this.mixer = new THREE.AnimationMixer(this.scene);

  this.selected = null;
  this.helpers = {};

  this.cameras = {};

  this.viewportCamera = this.camera;
  this.viewportShading = "default";

  this.addCamera(this.camera);
}

Editor.prototype = {
  setScene: function (scene) {
    try {
      this.scene.uuid = scene.uuid;
      this.scene.name = scene.name;

      this.scene.background = scene.background;
      this.scene.environment = scene.environment;
      this.scene.fog = scene.fog;
      this.scene.backgroundBlurriness = scene.backgroundBlurriness;
      this.scene.backgroundIntensity = scene.backgroundIntensity;

      // userData 복사 시 오류 방지
      try {
        if (scene.userData) {
          this.scene.userData = JSON.parse(JSON.stringify(scene.userData));
        } else {
          this.scene.userData = {};
        }
      } catch (userDataError) {
        console.warn("userData 복사 중 오류 발생, 기본값 사용:", userDataError);
        this.scene.userData = {};
      }

      // avoid render per object
      this.signals.sceneGraphChanged.active = false;

      while (scene.children.length > 0) {
        try {
          this.addObject(scene.children[0]);
        } catch (addObjectError) {
          console.warn("객체 추가 중 오류 발생, 건너뜀:", addObjectError, scene.children[0]);
          // 오류가 발생한 객체는 제거하고 계속 진행
          scene.remove(scene.children[0]);
        }
      }

      this.signals.sceneGraphChanged.active = true;
      this.signals.sceneGraphChanged.dispatch();
    } catch (error) {
      console.error("Scene 설정 중 오류 발생:", error);
    }
  },

  //

  addObject: function (object, parent, index) {
    var scope = this;

    try {
      object.traverse(function (child) {
        try {
          if (child.geometry !== undefined) scope.addGeometry(child.geometry);
          if (child.material !== undefined) scope.addMaterial(child.material);

          scope.addCamera(child);
          scope.addHelper(child);
        } catch (error) {
          console.warn("객체 순회 중 오류 발생:", error, child);
        }
      });

      if (parent === undefined) {
        this.scene.add(object);
      } else {
        parent.children.splice(index, 0, object);
        object.parent = parent;
      }

      this.signals.objectAdded.dispatch(object);
      this.signals.sceneGraphChanged.dispatch();
    } catch (error) {
      console.error("객체 추가 중 오류 발생:", error, object);
    }
  },

  nameObject: function (object, name) {
    object.name = name;
    this.signals.sceneGraphChanged.dispatch();
  },

  removeObject: function (object) {
    if (object.parent === null) return; // avoid deleting the camera or scene

    var scope = this;

    object.traverse(function (child) {
      scope.removeCamera(child);
      scope.removeHelper(child);

      if (child.material !== undefined) scope.removeMaterial(child.material);
    });

    object.parent.remove(object);

    this.signals.objectRemoved.dispatch(object);
    this.signals.sceneGraphChanged.dispatch();
  },

  addGeometry: function (geometry) {
    this.geometries[geometry.uuid] = geometry;
  },

  setGeometryName: function (geometry, name) {
    geometry.name = name;
    this.signals.sceneGraphChanged.dispatch();
  },

  addMaterial: function (material) {
    try {
      if (Array.isArray(material)) {
        for (var i = 0, l = material.length; i < l; i++) {
          this.addMaterialToRefCounter(material[i]);
        }
      } else {
        this.addMaterialToRefCounter(material);
      }

      this.signals.materialAdded.dispatch();
    } catch (error) {
      console.warn("재질 추가 중 오류 발생:", error, material);
    }
  },

  addMaterialToRefCounter: function (material) {
    try {
      // 재질의 텍스처 속성들을 확인하고 오류 처리
      if (material && typeof material === 'object') {
        const textureProperties = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'displacementMap', 'alphaMap'];

        textureProperties.forEach(prop => {
          if (material[prop] && material[prop].isDefault) {
            console.warn(`재질 ${material.name || material.uuid}의 ${prop}가 기본 텍스처입니다.`);
          }
        });
      }

      var materialsRefCounter = this.materialsRefCounter;

      var count = materialsRefCounter.get(material);

      if (count === undefined) {
        materialsRefCounter.set(material, 1);
        this.materials[material.uuid] = material;
      } else {
        count++;
        materialsRefCounter.set(material, count);
      }
    } catch (error) {
      console.warn("재질 참조 카운터 추가 중 오류 발생:", error, material);
    }
  },

  removeMaterial: function (material) {
    if (Array.isArray(material)) {
      for (var i = 0, l = material.length; i < l; i++) {
        this.removeMaterialFromRefCounter(material[i]);
      }
    } else {
      this.removeMaterialFromRefCounter(material);
    }

    this.signals.materialRemoved.dispatch();
  },

  removeMaterialFromRefCounter: function (material) {
    var materialsRefCounter = this.materialsRefCounter;

    var count = materialsRefCounter.get(material);
    count--;

    if (count === 0) {
      materialsRefCounter.delete(material);
      delete this.materials[material.uuid];
    } else {
      materialsRefCounter.set(material, count);
    }
  },

  getMaterialById: function (id) {
    var material;
    var materials = Object.values(this.materials);

    for (var i = 0; i < materials.length; i++) {
      if (materials[i].id === id) {
        material = materials[i];
        break;
      }
    }

    return material;
  },

  setMaterialName: function (material, name) {
    material.name = name;
    this.signals.sceneGraphChanged.dispatch();
  },

  addTexture: function (texture) {
    this.textures[texture.uuid] = texture;
  },

  //

  addCamera: function (camera) {
    if (camera.isCamera) {
      this.cameras[camera.uuid] = camera;

      this.signals.cameraAdded.dispatch(camera);
    }
  },

  removeCamera: function (camera) {
    if (this.cameras[camera.uuid] !== undefined) {
      delete this.cameras[camera.uuid];

      this.signals.cameraRemoved.dispatch(camera);
    }
  },

  //

  addHelper: (function () {
    var geometry = new THREE.SphereGeometry(2, 4, 2);
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      visible: false,
    });

    return function (object, helper) {
      if (helper === undefined) {
        if (object.isCamera) {
          helper = new THREE.CameraHelper(object);
        } else if (object.isPointLight) {
          helper = new THREE.PointLightHelper(object, 1);
        } else if (object.isDirectionalLight) {
          helper = new THREE.DirectionalLightHelper(object, 1);
        } else if (object.isSpotLight) {
          helper = new THREE.SpotLightHelper(object);
        } else if (object.isHemisphereLight) {
          helper = new THREE.HemisphereLightHelper(object, 1);
        } else if (object.isSkinnedMesh) {
          helper = new THREE.SkeletonHelper(object.skeleton.bones[0]);
        } else if (
          object.isBone === true &&
          object.parent &&
          object.parent.isBone !== true
        ) {
          helper = new THREE.SkeletonHelper(object);
        } else {
          // no helper for this object type
          return;
        }

        const picker = new THREE.Mesh(geometry, material);
        picker.name = "picker";
        picker.userData.object = object;
        helper.add(picker);
      }

      this.sceneHelpers.add(helper);
      this.helpers[object.id] = helper;

      this.signals.helperAdded.dispatch(helper);
    };
  })(),

  removeHelper: function (object) {
    if (this.helpers[object.id] !== undefined) {
      var helper = this.helpers[object.id];
      helper.parent.remove(helper);
      helper.dispose();

      delete this.helpers[object.id];

      this.signals.helperRemoved.dispatch(helper);
    }
  },

  //

  addScript: function (object, script) {
    if (this.scripts[object.uuid] === undefined) {
      this.scripts[object.uuid] = [];
    }

    this.scripts[object.uuid].push(script);

    this.signals.scriptAdded.dispatch(script);
  },

  removeScript: function (object, script) {
    if (this.scripts[object.uuid] === undefined) return;

    var index = this.scripts[object.uuid].indexOf(script);

    if (index !== -1) {
      this.scripts[object.uuid].splice(index, 1);
    }

    this.signals.scriptRemoved.dispatch(script);
  },

  getObjectMaterial: function (object, slot) {
    var material = object.material;

    if (Array.isArray(material) && slot !== undefined) {
      material = material[slot];
    }

    return material;
  },

  setObjectMaterial: function (object, slot, newMaterial) {
    if (Array.isArray(object.material) && slot !== undefined) {
      object.material[slot] = newMaterial;
    } else {
      object.material = newMaterial;
    }
  },

  setViewportCamera: function (uuid) {
    this.viewportCamera = this.cameras[uuid];
    this.signals.viewportCameraChanged.dispatch();
  },

  setViewportShading: function (value) {
    this.viewportShading = value;
    this.signals.viewportShadingChanged.dispatch();
  },

  //

  select: function (object) {
    this.selector.select(object);
  },

  selectById: function (id) {
    if (id === this.camera.id) {
      this.select(this.camera);
      return;
    }

    this.select(this.scene.getObjectById(id));
  },

  selectByUuid: function (uuid) {
    var scope = this;

    this.scene.traverse(function (child) {
      if (child.uuid === uuid) {
        scope.select(child);
      }
    });
  },

  deselect: function () {
    this.selector.deselect();
  },

  focus: function (object) {
    if (object !== undefined) {
      this.signals.objectFocused.dispatch(object);
    }
  },

  focusById: function (id) {
    this.focus(this.scene.getObjectById(id));
  },

  clear: function () {
    this.history.clear();
    this.storage.clear();

    this.camera.copy(_DEFAULT_CAMERA);
    this.signals.cameraResetted.dispatch();

    this.scene.name = "Scene";
    this.scene.userData = {};
    this.scene.background = null;
    this.scene.environment = null;
    this.scene.fog = null;

    var objects = this.scene.children;

    this.signals.sceneGraphChanged.active = false;

    while (objects.length > 0) {
      this.removeObject(objects[0]);
    }

    this.signals.sceneGraphChanged.active = true;

    this.geometries = {};
    this.materials = {};
    this.textures = {};
    this.scripts = {};

    this.materialsRefCounter.clear();

    this.animations = {};
    this.mixer.stopAllAction();

    this.deselect();

    this.signals.editorCleared.dispatch();
  },

  //

  fromJSON: async function (json) {
    console.log("=== fromJSON 진입! (AI 디버깅용) ===");
    console.log("project.json 전체 내용:", json);
    console.log("projectData.scene typeof:", typeof json.scene, "value:", json.scene);
    try {
      // ZIP 파일인지 확인 (2단계)
      let projectData = json;
      // console.log("json instanceof Blob:", json instanceof Blob);
      // console.log("json.type:", json.type);
      // console.log("json.type === 'application/zip':", json.type === 'application/zip');
      // console.log("json.type === 'application/x-zip-compressed':", json.type === 'application/x-zip-compressed'); 
      // console.log("json.name:", json.name);
      // console.log("json.size:", json.size);
      // console.log("json.name.endsWith('.zip'):", json.name.endsWith('.zip'));
      // console.log("json.name.endsWith('.json'):", json.name.endsWith('.json'));
      // console.log("json.name.endsWith('.zip'):", json.name.endsWith('.zip'));
      if (json instanceof Blob && (json.type === 'application/zip' || json.type === 'application/x-zip-compressed')) {
        console.log("ZIP 파일 감지, 압축 해제 중...");
        console.log("ZIP 파일 정보:", {
          name: json.name,
          size: json.size,
          type: json.type
        });
        try {
          console.log("DataSplitter 모듈 로드 시작...");
          const { DataSplitter } = await import('./utils/DataSplitter.js');
          console.log("DataSplitter 로드 완료, loadFromProjectZip 호출 중...");
          
          console.log("loadFromProjectZip 함수 호출 전...");
          projectData = await DataSplitter.loadFromProjectZip(json);
          console.log("loadFromProjectZip 함수 호출 완료");
          console.log("ZIP 파일에서 데이터 로드 완료");
        } catch (error) {
          console.error("ZIP 파일 로드 실패:", error);
          console.error("오류 메시지:", error.message);
          console.error("오류 스택:", error.stack);
          console.error("오류 타입:", error.constructor.name);
          
          // 오류가 발생해도 계속 진행하도록 기본 데이터 반환
          console.warn("ZIP 파일 로드 실패로 인해 빈 프로젝트 데이터를 사용합니다.");
          projectData = {
            metadata: {},
            project: {},
            camera: {},
            scene: {
              metadata: { version: 4.5, type: "Object" },
              geometries: {},
              materials: {},
              textures: {},
              images: {},
              shapes: {},
              skeletons: {},
              animations: [],
              object: {
                uuid: THREE.MathUtils.generateUUID(),
                type: "Scene",
                name: "Scene",
                children: [],
                userData: {}
              }
            },
            scripts: {},
            history: {},
            environment: null,
            motionTimeline: null,
            music: null
          };
        }
      } else {
        // 일반 JSON 파일 처리
        // 압축된 데이터 해제 (1단계)
        try {
          const { DataCompressor } = await import('./utils/DataCompressor.js');
          projectData = DataCompressor.decompressProjectData(json);
          console.log("압축된 데이터 해제 완료");
        } catch (error) {
          console.warn("데이터 해제 실패, 원본 데이터 사용:", error);
          projectData = json;
        }
      }
      
      // projectData 디버깅
          console.log("=== projectData 디버깅 ===");
    console.log("projectData:", projectData);
    console.log("projectData 타입:", typeof projectData);
    console.log("projectData 키:", projectData ? Object.keys(projectData) : "undefined");
    console.log("projectData.scene:", projectData?.scene);
    console.log("projectData.scene 타입:", typeof projectData?.scene);
    if (projectData?.scene) {
        console.log("projectData.scene 키:", Object.keys(projectData.scene));
        console.log("projectData.scene.object:", projectData.scene.object);
        console.log("projectData.scene.object.children:", projectData.scene.object?.children);
        console.log("projectData.scene.object.largeChildrenFiles:", projectData.scene.object?.largeChildrenFiles);
    }
    console.log("=== projectData 디버깅 완료 ===");

      // 점진적 로딩 적용 (3단계)
      try {
        const { ProgressiveLoader } = await import('./utils/ProgressiveLoader.js');
        this.progressiveLoader = new ProgressiveLoader(this);
        
        // 로딩 이벤트 설정
        this.progressiveLoader.events.onComplete = (loadedData) => {
          console.log("점진적 로딩 완료:", Object.keys(loadedData));
          this.signals.progressiveLoadingComplete.dispatch(loadedData);
        };
        
        this.progressiveLoader.events.onError = (error) => {
          console.error("점진적 로딩 오류:", error);
          this.signals.progressiveLoadingError.dispatch(error);
        };

        // 점진적 로딩 옵션 가져오기
        const options = this.progressiveLoadingOptions || {
          enabled: true,
          priorityOrder: ['base', 'scene', 'timeline', 'music', 'history'],
          batchSize: 3,
          delayBetweenBatches: 50,
          showProgress: true
        };

        if (options.enabled) {
          // 점진적 로딩 실행
          projectData = await this.progressiveLoader.loadProjectProgressively(projectData, options);
          console.log("점진적 로딩 완료");
        } else {
          console.log("점진적 로딩 비활성화됨");
        }
      } catch (error) {
        console.warn("점진적 로딩 실패, 기본 로딩 사용:", error);
        // 점진적 로딩 실패 시 원본 데이터 사용
      }
      
      var loader = new THREE.ObjectLoader();

      // LoadingManager 설정으로 텍스처 로드 오류 처리 강화
      const loadingManager = new THREE.LoadingManager();
      loadingManager.onError = function (url, itemsLoaded, itemsTotal) {
        console.warn("텍스처 로드 실패:", url, `(${itemsLoaded}/${itemsTotal})`);
        // 오류가 발생해도 계속 진행
      };

      // TextureLoader 오류 처리 강화
      const originalTextureLoaderLoad = THREE.TextureLoader.prototype.load;
      THREE.TextureLoader.prototype.load = function (url, onLoad, onProgress, onError) {
        const safeOnError = function (error) {
          console.warn("텍스처 로드 실패:", url, error);
          // 오류가 발생해도 기본 텍스처 생성
          const defaultTexture = new THREE.Texture();
          defaultTexture.name = 'default';
          defaultTexture.isDefault = true; // 기본 텍스처임을 표시
          if (onLoad) onLoad(defaultTexture);
        };

        // URL이 유효하지 않은 경우 기본 텍스처 반환
        if (!url || url === '' || url === 'undefined') {
          console.warn("유효하지 않은 텍스처 URL:", url);
          const defaultTexture = new THREE.Texture();
          defaultTexture.name = 'default';
          defaultTexture.isDefault = true;
          if (onLoad) onLoad(defaultTexture);
          return;
        }

        return originalTextureLoaderLoad.call(this, url, onLoad, onProgress, safeOnError);
      };

      // ImageLoader 오류 처리 강화
      const originalImageLoaderLoad = THREE.ImageLoader.prototype.load;
      THREE.ImageLoader.prototype.load = function (url, onLoad, onProgress, onError) {
        const safeOnError = function (error) {
          console.warn("이미지 로드 실패:", url, error);
          // 오류가 발생해도 기본 이미지 생성
          const defaultImage = new Image();
          defaultImage.width = 1;
          defaultImage.height = 1;
          defaultImage.isDefault = true;
          if (onLoad) onLoad(defaultImage);
        };

        // URL이 유효하지 않은 경우 기본 이미지 반환
        if (!url || url === '' || url === 'undefined') {
          console.warn("유효하지 않은 이미지 URL:", url);
          const defaultImage = new Image();
          defaultImage.width = 1;
          defaultImage.height = 1;
          defaultImage.isDefault = true;
          if (onLoad) onLoad(defaultImage);
          return;
        }

        return originalImageLoaderLoad.call(this, url, onLoad, onProgress, safeOnError);
      };

      loader.manager = loadingManager;

      var camera = await loader.parseAsync(projectData.camera);

      const existingUuid = this.camera.uuid;
      const incomingUuid = camera.uuid;

      // copy all properties, including uuid
      this.camera.copy(camera);
      this.camera.uuid = incomingUuid;

      delete this.cameras[existingUuid]; // remove old entry [existingUuid, this.camera]
      this.cameras[incomingUuid] = this.camera; // add new entry [incomingUuid, this.camera]

      this.signals.cameraResetted.dispatch();

      this.history.fromJSON(projectData.history);
      this.scripts = projectData.scripts;

      // 씬 로드 시 오류 처리
      try {
        console.log("projectData.scene typeof:", typeof projectData.scene, "value:", projectData.scene);
        
        // scene 데이터가 없는 경우 기본 scene 생성
        if (!projectData.scene) {
          console.warn("scene 데이터가 없습니다. 기본 scene을 생성합니다.");
          projectData.scene = {
            metadata: { version: 4.5, type: "Object" },
            geometries: {},
            materials: {},
            textures: {},
            images: {},
            shapes: {},
            skeletons: {},
            animations: [],
            object: {
              uuid: THREE.MathUtils.generateUUID(),
              type: "Scene",
              name: "Scene",
              children: [],
              userData: {}
            }
          };
        }
        function fixChildrenAndAnimations(obj) {
          if (obj && typeof obj === 'object') {
            if (!Array.isArray(obj.children)) obj.children = [];
            if (!Array.isArray(obj.animations)) obj.animations = [];
            
            // children 배열에서 실제 객체가 아닌 animations 배열만 필터링
            if (Array.isArray(obj.children)) {
              obj.children = obj.children.filter(child => {
                // animations 속성만 있고 다른 객체 속성이 없는 경우만 제거
                if (child && typeof child === 'object' && Array.isArray(child.animations)) {
                  // FBX 객체는 metadata, geometries, materials, skeletons, animations 등의 속성을 가짐
                  const hasObjectProperties = child.metadata !== undefined || 
                                            child.geometries !== undefined || 
                                            child.materials !== undefined ||
                                            child.skeletons !== undefined ||
                                            child.object !== undefined ||
                                            child.uuid !== undefined ||
                                            child.name !== undefined;
                            
                  if (!hasObjectProperties) {
                    console.warn("children 배열에서 animations 배열만 있는 요소 제거:", child);
                    return false;
                  } else {
                    console.log("FBX 객체 유지:", child.name || child.uuid || "unnamed");
                  }
                }
                return true;
              });
            }
            
            obj.children.forEach(child => fixChildrenAndAnimations(child));
          }
        }
        if (projectData.scene) {
          window.projectData = projectData; // 콘솔에서 직접 접근 가능하게
          try {
            if (typeof projectData.scene.toJSON === 'function') {
              projectData.scene = projectData.scene.toJSON();
            }
            
            // 분리된 children 파일 복원
            if (projectData.scene.object && projectData.scene.object.childrenFile) {
              console.log("분리된 children 파일 복원 중:", projectData.scene.object.childrenFile);
              // ZIP 파일에서 분리된 데이터를 로드한 경우 이미 복원되어 있음
              if (!projectData.scene.object.children) {
                console.warn("children 파일이 참조되어 있지만 데이터가 없습니다.");
                projectData.scene.object.children = [];
              }
            }
            
            // 개별 children 파일들 복원
            if (projectData.scene.object && projectData.scene.object.largeChildrenFiles) {
              console.log("개별 children 파일들 복원 중:", projectData.scene.object.largeChildrenFiles);
              // ZIP 파일에서 분리된 데이터를 로드한 경우 이미 복원되어 있음
              if (!projectData.scene.object.children) {
                console.warn("개별 children 파일들이 참조되어 있지만 데이터가 없습니다.");
                projectData.scene.object.children = [];
              }
            }
            
            // object.children을 scene.children으로 복사 (ZIP 파일에서 로드된 경우)
            if (projectData.scene.object && projectData.scene.object.children && projectData.scene.object.children.length > 0) {
              console.log("object.children을 scene.children으로 복사:", projectData.scene.object.children.length, "개");
              projectData.scene.children = [...projectData.scene.object.children];
            }
            
            fixChildrenAndAnimations(projectData.scene);
          } catch (e) {
            console.warn("scene 방어 코드 실행 중 오류:", e);
          }
          try {
            // scene 데이터가 너무 크면 저장하지 않음
            const sceneString = JSON.stringify(projectData.scene, null, 2);
            if (sceneString.length > 1000000) { // 1MB 제한
              console.warn("scene 데이터가 너무 커서 저장하지 않습니다:", sceneString.length, "bytes");
            } else {
              const blob = new Blob([sceneString], {type: "application/json"});
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = "scene_debug_final.json";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
          } catch (e) {
            console.warn("scene 구조 저장 중 오류:", e);
          }
          // children 전체와 0, 1번 요소 콘솔 출력
          console.log("window.projectData.scene.children:", window.projectData.scene.children);
          if (window.projectData.scene.children && window.projectData.scene.children.length > 0) {
            console.log("children[0]:", window.projectData.scene.children[0]);
          }
          if (window.projectData.scene.children && window.projectData.scene.children.length > 1) {
            console.log("children[1]:", window.projectData.scene.children[1]);
          }
        }
        const scene = await loader.parseAsync(projectData.scene);
        this.setScene(scene);
        
        // ZIP 파일에서 로드된 children 데이터를 실제 scene에 복원
        if (projectData.scene && projectData.scene.children && projectData.scene.children.length > 0) {
          console.log("실제 scene에 children 복원 중:", projectData.scene.children.length, "개");
          
          // 기존 children 제거
          this.scene.children = [];
          
          // 각 child를 개별적으로 로드하여 scene에 추가
          for (let i = 0; i < projectData.scene.children.length; i++) {
            try {
              const childData = projectData.scene.children[i];
              if (childData && childData.object) {
                const child = await loader.parseAsync(childData);
                this.scene.add(child);
                console.log(`child ${i} 복원 완료:`, child.name || child.uuid);
              }
            } catch (childError) {
              console.warn(`child ${i} 복원 실패:`, childError);
            }
          }
          
          console.log("scene children 복원 완료, 총 개수:", this.scene.children.length);
          
          // 사이드바 새로고침
          this.signals.sceneGraphChanged.dispatch();
          
          // 기본 선택 설정 (첫 번째 child가 있으면)
          if (this.scene.children.length > 0) {
            try {
              this.select(this.scene.children[0]);
              console.log("기본 선택 설정:", this.scene.children[0].name);
            } catch (selectError) {
              console.warn("기본 선택 설정 실패:", selectError);
            }
          }
        }
      } catch (sceneError) {
        console.warn("씬 로드 중 오류 발생, 기본 씬으로 대체:", sceneError);

        // 기본 씬 설정
        this.scene.name = "Scene";
        this.scene.userData = projectData.scene?.userData || {};

        // 씬의 기본 속성들 복원
        if (projectData.scene) {
          this.scene.uuid = projectData.scene.uuid || this.scene.uuid;
          this.scene.name = projectData.scene.name || "Scene";
          this.scene.userData = { ...this.scene.userData, ...projectData.scene.userData };
        }
      }

      if (projectData.environment === "ModelViewer") {
        this.signals.sceneEnvironmentChanged.dispatch(projectData.environment);
        this.signals.refreshSidebarEnvironment.dispatch();
      }

      // MotionTimeline 데이터 복원
      if (projectData.motionTimeline && this.motionTimeline) {
        try {
          console.log("=== MotionTimeline 데이터 복원 시작 ===");
          console.log("json.motionTimeline:", json.motionTimeline);
          console.log("this.motionTimeline:", this.motionTimeline);

          // scene.userData에 motionTimeline 데이터 저장
          if (!this.scene.userData) {
            this.scene.userData = {};
          }
          this.scene.userData.motionTimeline = projectData.motionTimeline;
          console.log("scene.userData.motionTimeline 설정 완료:", this.scene.userData.motionTimeline);

          // MotionTimeline에서 데이터 로드
          console.log("motionTimeline.onAfterLoad() 호출 중...");
          this.motionTimeline.onAfterLoad();
          console.log("=== MotionTimeline 데이터 복원 완료 ===");
        } catch (error) {
          console.error("MotionTimeline 데이터 복원 중 오류:", error);
        }
      } else {
        console.log("MotionTimeline 데이터가 없거나 motionTimeline 인스턴스가 없습니다.");
        console.log("json.motionTimeline 존재:", !!projectData.motionTimeline);
        console.log("this.motionTimeline 존재:", !!this.motionTimeline);

        // MotionTimeline 데이터가 없으면 아무것도 하지 않음
        // scene.userData.motionTimeline에 저장된 데이터만으로 트랙을 생성해야 함
        console.log("MotionTimeline 데이터가 없으므로 트랙을 생성하지 않습니다.");
      }

      // 원래 메서드들 복원
      THREE.TextureLoader.prototype.load = originalTextureLoaderLoad;
      THREE.ImageLoader.prototype.load = originalImageLoaderLoad;

    } catch (error) {
      console.error("JSON 데이터 로드 중 전체 오류:", error);
      throw error; // 상위로 오류 전파
    }
  },

  toJSON: async function () {
    // scripts clean up
    console.log("Editor toJSON called"); // 디버깅용 로그
    var scene = this.scene;
    var scripts = this.scripts;

    for (var key in scripts) {
      var script = scripts[key];

      if (
        script.length === 0 ||
        scene.getObjectByProperty("uuid", key) === undefined
      ) {
        delete scripts[key];
      }
    }

    // honor modelviewer environment

    let environment = null;

    if (
      this.scene.environment !== null &&
      this.scene.environment.isRenderTargetTexture === true
    ) {
      environment = "ModelViewer";
    }

    // MotionTimeline 데이터 저장
    if (this.motionTimeline) {
      try {
        console.log("=== MotionTimeline 데이터 저장 시작 ===");
        console.log("this.motionTimeline:", this.motionTimeline);
        console.log("this.scene.userData:", this.scene.userData);
        console.log("this.scene.userData.motionTimeline 존재:", !!this.scene.userData?.motionTimeline);
        
        if (this.scene.userData?.motionTimeline) {
          console.log("저장 전 motionTimeline 데이터:", this.scene.userData.motionTimeline);
          console.log("tracks 키들:", Object.keys(this.scene.userData.motionTimeline.tracks || {}));
          
          // 각 트랙의 내용 확인
          Object.entries(this.scene.userData.motionTimeline.tracks || {}).forEach(([uuid, properties]) => {
            console.log(`트랙 ${uuid} properties:`, properties);
            console.log(`트랙 ${uuid} properties 키들:`, Object.keys(properties));
          });
        }

        this.motionTimeline.onBeforeSave();

        console.log("onBeforeSave 완료 후 scene.userData.motionTimeline:", this.scene.userData.motionTimeline);
        console.log("onBeforeSave 후 tracks 키들:", Object.keys(this.scene.userData.motionTimeline?.tracks || {}));
        console.log("=== MotionTimeline 데이터 저장 완료 ===");
      } catch (error) {
        console.error("MotionTimeline 데이터 저장 중 오류:", error);
      }
    } else {
      console.log("motionTimeline 인스턴스가 없어서 저장하지 않습니다.");
    }

    // 기본 프로젝트 데이터 생성 (씬 데이터 안전 처리)
    let sceneData;
    let childrenFile = null;
    
    try {
      // scene.toJSON() 호출 전에 children을 임시로 제거
      const originalChildren = this.scene.children;
      this.scene.children = [];
      
      // 기본 씬 데이터 생성
      sceneData = this.scene.toJSON();
      console.log("기본 씬 데이터 생성 완료");
      
      // children을 별도 파일로 저장 (안전한 처리)
      if (originalChildren.length > 0) {
        console.log("children 개수:", originalChildren.length);
        
        // children을 개별적으로 처리하여 오류 발생 시에도 일부 데이터는 저장
        const childrenData = [];
        const failedChildren = [];
        
        for (let i = 0; i < originalChildren.length; i++) {
          try {
            const childData = originalChildren[i].toJSON();
            childrenData.push(childData);
            console.log(`child ${i} 처리 완료`);
          } catch (childError) {
            console.warn(`child ${i} 처리 실패:`, childError);
            failedChildren.push(i);
            // 실패한 child는 기본 구조만 추가
            childrenData.push({
              uuid: originalChildren[i].uuid || `failed_child_${i}`,
              type: originalChildren[i].type || "Object3D",
              name: originalChildren[i].name || `Failed_Child_${i}`,
              children: [],
              userData: {}
            });
          }
        }
        
        if (failedChildren.length > 0) {
          console.warn("처리 실패한 children:", failedChildren);
        }
        
        try {
          // 각 child를 개별 파일로 저장
          const childrenFiles = [];
          const timestamp = Date.now();
          
          for (let i = 0; i < childrenData.length; i++) {
            try {
              const childSize = JSON.stringify(childrenData[i]).length;
              console.log(`child ${i} 크기:`, childSize, "bytes");
              
              if (childSize > 100000) { // 100KB 이상이면 개별 파일로 저장
                const fileName = `scene_child_${timestamp}_${i}.json`;
                childrenFiles.push({
                  index: i,
                  fileName: fileName,
                  data: childrenData[i]
                });
                console.log(`child ${i}를 개별 파일로 저장:`, fileName);
              } else {
                // 작은 child는 나중에 배열에 포함
                childrenFiles.push({
                  index: i,
                  fileName: null,
                  data: childrenData[i]
                });
              }
            } catch (childSizeError) {
              console.warn(`child ${i} 크기 측정 실패, 개별 파일로 저장:`, childSizeError);
              const fileName = `scene_child_${timestamp}_${i}.json`;
              childrenFiles.push({
                index: i,
                fileName: fileName,
                data: childrenData[i]
              });
            }
          }
          
          // 작은 children들을 하나의 배열로 모음
          const smallChildren = childrenFiles
            .filter(item => item.fileName === null)
            .map(item => item.data);
          
          // 큰 children들은 개별 파일로 저장
          const largeChildrenFiles = childrenFiles
            .filter(item => item.fileName !== null)
            .map(item => item.fileName);
          
          if (largeChildrenFiles.length > 0) {
            childrenFile = {
              smallChildren: smallChildren,
              largeChildrenFiles: largeChildrenFiles,
              childrenFiles: childrenFiles
            };
            console.log(`children 데이터 분리 완료: ${smallChildren.length}개 작은 children, ${largeChildrenFiles.length}개 큰 children 파일`);
            
            // sceneData에 children 참조만 추가
            sceneData.object.children = smallChildren;
            sceneData.object.largeChildrenFiles = largeChildrenFiles;
          } else {
            // 모든 children이 작은 경우
            sceneData.object.children = childrenData;
          }
        } catch (sizeError) {
          console.error("children 데이터 처리 실패:", sizeError);
          // 오류 발생 시 모든 children을 개별 파일로 저장
          const childrenFiles = [];
          const timestamp = Date.now();
          
          for (let i = 0; i < childrenData.length; i++) {
            const fileName = `scene_child_${timestamp}_${i}.json`;
            childrenFiles.push({
              index: i,
              fileName: fileName,
              data: childrenData[i]
            });
          }
          
          childrenFile = {
            smallChildren: [],
            largeChildrenFiles: childrenFiles.map(item => item.fileName),
            childrenFiles: childrenFiles
          };
          
          console.log("오류로 인한 모든 children 개별 파일 저장:", childrenFiles.length, "개 파일");
          sceneData.object.children = [];
          sceneData.object.largeChildrenFiles = childrenFiles.map(item => item.fileName);
        }
      } else {
        sceneData.object.children = [];
      }
      
      // 원래 children 복원
      this.scene.children = originalChildren;
      
    } catch (error) {
      console.error("씬 데이터 생성 실패:", error);
      // 기본 씬 데이터 생성
      sceneData = {
        metadata: { version: 4.5, type: "Object" },
        geometries: {},
        materials: {},
        textures: {},
        images: {},
        shapes: {},
        skeletons: {},
        animations: [],
        object: {
          uuid: this.scene.uuid,
          type: "Scene",
          name: this.scene.name,
          children: [],
          userData: this.scene.userData || {}
        }
      };
      
      // 원래 children 복원
      this.scene.children = originalChildren;
    }

    const baseData = {
      metadata: {},
      project: {
        shadows: this.config.getKey("project/renderer/shadows"),
        shadowType: this.config.getKey("project/renderer/shadowType"),
        toneMapping: this.config.getKey("project/renderer/toneMapping"),
        toneMappingExposure: this.config.getKey(
          "project/renderer/toneMappingExposure"
        ),
      },
      camera: this.viewportCamera.toJSON(),
      scene: sceneData,
      scripts: this.scripts,
      history: this.history.toJSON(),
      environment: environment,
      motionTimeline: this.scene.userData.motionTimeline || null, // MotionTimeline 데이터 저장
      music: this.music ? this.music.toJSON() : undefined, // music 정보 저장
    };

    // MotionTimeline 데이터 저장 확인
    console.log("=== toJSON 반환 전 MotionTimeline 데이터 확인 ===");
    console.log("baseData.motionTimeline 존재:", !!baseData.motionTimeline);
    if (baseData.motionTimeline) {
      console.log("baseData.motionTimeline:", baseData.motionTimeline);
      console.log("baseData.motionTimeline.tracks 키들:", Object.keys(baseData.motionTimeline.tracks || {}));
      
      // 각 트랙의 내용 확인
      Object.entries(baseData.motionTimeline.tracks || {}).forEach(([uuid, properties]) => {
        console.log(`반환 전 트랙 ${uuid} properties:`, properties);
        console.log(`반환 전 트랙 ${uuid} properties 키들:`, Object.keys(properties));
      });
    }
    console.log("=== toJSON 반환 전 MotionTimeline 데이터 확인 완료 ===");

    // 데이터 크기 측정 및 압축 처리
    try {
      // 씬 데이터 크기만 먼저 측정
      const sceneSize = JSON.stringify(sceneData).length;
      console.log("씬 데이터 크기:", sceneSize, "bytes");
      
      if (sceneSize > 10000000) { // 10MB 이상이면 압축하지 않음
        console.warn("씬 데이터가 너무 커서 압축을 건너뜁니다.");
        return baseData;
      }
      
      // 전체 데이터 크기 측정
      const testSize = JSON.stringify(baseData).length;
      console.log("기본 데이터 크기:", testSize, "bytes");
      
      if (testSize > 50000000) { // 50MB 이상이면 압축하지 않음
        console.warn("데이터가 너무 커서 압축을 건너뜁니다.");
        return baseData;
      }
      
      // 데이터 압축 적용 (1단계)
      const { DataCompressor } = await import('./utils/DataCompressor.js');
      const compressedData = DataCompressor.compressProjectData(baseData);
      return compressedData;
    } catch (error) {
      console.warn("데이터 압축 실패, 원본 데이터 반환:", error);
      return baseData;
    }
  },

  // 분리 저장을 위한 새로운 메서드 (2단계)
  toSplitJSON: async function (options = {}) {
    console.log("Editor toSplitJSON called"); // 디버깅용 로그
    
    // 기본 데이터 생성
    const baseData = await this.toJSON();
    
    // children 파일이 분리된 경우 처리
    let childrenFileData = null;
    let individualChildrenFiles = null;
    
    if (baseData.scene && baseData.scene.object) {
      // 단일 파일 참조 (이전 버전 호환성)
      if (baseData.scene.object.childrenFile) {
        try {
          // 원래 children 데이터를 다시 생성 (안전한 처리)
          const originalChildren = this.scene.children;
          childrenFileData = [];
          const failedChildren = [];
          
          for (let i = 0; i < originalChildren.length; i++) {
            try {
              const childData = originalChildren[i].toJSON();
              childrenFileData.push(childData);
            } catch (childError) {
              console.warn(`분리된 children 생성 중 child ${i} 처리 실패:`, childError);
              failedChildren.push(i);
              // 실패한 child는 기본 구조만 추가
              childrenFileData.push({
                uuid: originalChildren[i].uuid || `failed_child_${i}`,
                type: originalChildren[i].type || "Object3D",
                name: originalChildren[i].name || `Failed_Child_${i}`,
                children: [],
                userData: {}
              });
            }
          }
          
          if (failedChildren.length > 0) {
            console.warn("분리된 children 생성 중 처리 실패한 children:", failedChildren);
          }
          
          console.log("분리된 children 데이터 생성 완료");
        } catch (error) {
          console.error("분리된 children 데이터 생성 실패:", error);
          childrenFileData = [];
        }
      }
      // 개별 children 파일 참조 (새로운 방식)
      else if (baseData.scene.object.largeChildrenFiles && Array.isArray(baseData.scene.object.largeChildrenFiles)) {
        try {
          const originalChildren = this.scene.children;
          const childrenFiles = [];
          const failedChildren = [];
          
          for (let i = 0; i < originalChildren.length; i++) {
            try {
              const childData = originalChildren[i].toJSON();
              const childSize = JSON.stringify(childData).length;
              
              if (childSize > 100000) { // 100KB 이상이면 개별 파일로 저장
                const fileName = `scene_child_${Date.now()}_${i}.json`;
                childrenFiles.push({
                  index: i,
                  fileName: fileName,
                  data: childData
                });
              } else {
                // 작은 child는 나중에 배열에 포함
                childrenFiles.push({
                  index: i,
                  fileName: null,
                  data: childData
                });
              }
            } catch (childError) {
              console.warn(`개별 children 생성 중 child ${i} 처리 실패:`, childError);
              failedChildren.push(i);
              // 실패한 child는 개별 파일로 저장
              const fileName = `scene_child_${Date.now()}_${i}.json`;
              childrenFiles.push({
                index: i,
                fileName: fileName,
                data: {
                  uuid: originalChildren[i].uuid || `failed_child_${i}`,
                  type: originalChildren[i].type || "Object3D",
                  name: originalChildren[i].name || `Failed_Child_${i}`,
                  children: [],
                  userData: {}
                }
              });
            }
          }
          
          if (failedChildren.length > 0) {
            console.warn("개별 children 생성 중 처리 실패한 children:", failedChildren);
          }
          
          individualChildrenFiles = childrenFiles;
          console.log(`개별 children 데이터 생성 완료: ${childrenFiles.length}개 children`);
        } catch (error) {
          console.error("개별 children 데이터 생성 실패:", error);
          individualChildrenFiles = [];
        }
      }
    }
    
    // 데이터 분리 적용 (2단계)
    try {
      const { DataSplitter } = await import('./utils/DataSplitter.js');
      
      // 데이터 크기 확인
      try {
        const dataSize = JSON.stringify(baseData).length;
        console.log("분리 전 데이터 크기:", dataSize, "bytes");
        
        if (dataSize > 100000000) { // 100MB 이상이면 분리 강제 적용
          console.warn("데이터가 너무 커서 강제 분리를 적용합니다.");
          options.forceSplit = true;
        }
      } catch (sizeError) {
        console.warn("데이터 크기 측정 실패, 강제 분리 적용:", sizeError);
        options.forceSplit = true;
      }
      
      const splitResult = DataSplitter.splitProjectData(baseData, options);
      
      // children 파일 데이터 추가
      if (childrenFileData && baseData.scene && baseData.scene.object && baseData.scene.object.childrenFile) {
        splitResult.splitFiles[baseData.scene.object.childrenFile] = childrenFileData;
        splitResult.fileReferences.push(baseData.scene.object.childrenFile);
        console.log("children 파일 데이터 추가 완료:", baseData.scene.object.childrenFile);
      }
      
      // 개별 children 파일들 추가
      if (individualChildrenFiles && baseData.scene && baseData.scene.object && baseData.scene.object.largeChildrenFiles) {
        for (const childFile of individualChildrenFiles) {
          if (childFile.fileName) {
            splitResult.splitFiles[childFile.fileName] = childFile.data;
            splitResult.fileReferences.push(childFile.fileName);
            console.log(`개별 child ${childFile.index} 파일 데이터 추가 완료:`, childFile.fileName);
          }
        }
      }
      
      return splitResult;
    } catch (error) {
      console.warn("데이터 분리 실패, 기본 데이터 반환:", error);
      return {
        baseData,
        splitFiles: childrenFileData ? { [baseData.scene?.object?.childrenFile]: childrenFileData } : {},
        fileReferences: childrenFileData ? [baseData.scene?.object?.childrenFile] : []
      };
    }
  },

  // ZIP 파일로 저장하는 메서드 (2단계)
  toProjectZip: async function (projectName = "project", options = {}) {
    console.log("Editor toProjectZip called"); // 디버깅용 로그
    
    try {
      // 분리된 데이터 생성
      const splitResult = await this.toSplitJSON(options);
      
      // ZIP 파일 생성
      const { DataSplitter } = await import('./utils/DataSplitter.js');
      const zipBlob = await DataSplitter.createProjectZip(splitResult, projectName);
      
      return zipBlob;
    } catch (error) {
      console.error("ZIP 파일 생성 실패:", error);
      throw error;
    }
  },

  // 점진적 로딩 설정 메서드 (3단계)
  setProgressiveLoadingOptions: function (options = {}) {
    this.progressiveLoadingOptions = {
      enabled: true,
      priorityOrder: ['base', 'scene', 'timeline', 'music', 'history'],
      batchSize: 3,
      delayBetweenBatches: 50,
      showProgress: true,
      ...options
    };
  },

  // 점진적 로딩 상태 확인 (3단계)
  getProgressiveLoadingStatus: function () {
    if (this.progressiveLoader) {
      return {
        isLoading: this.progressiveLoader.isLoading,
        progress: this.progressiveLoader.getProgress(),
        totalItems: this.progressiveLoader.totalItems,
        loadedItems: this.progressiveLoader.loadedItems
      };
    }
    return { isLoading: false, progress: 0, totalItems: 0, loadedItems: 0 };
  },

  objectByUuid: function (uuid) {
    return this.scene.getObjectByProperty("uuid", uuid, true);
  },

  execute: function (cmd, optionalName) {
    this.history.execute(cmd, optionalName);
  },

  undo: function () {
    this.history.undo();
  },

  redo: function () {
    this.history.redo();
  },

  utils: {
    save: save,
    saveArrayBuffer: saveArrayBuffer,
    saveString: saveString,
    formatNumber: formatNumber,
  },
};

const link = document.createElement("a");

function save(blob, filename) {
  if (link.href) {
    URL.revokeObjectURL(link.href);
  }

  link.href = URL.createObjectURL(blob);
  link.download = filename || "data.json";
  link.dispatchEvent(new MouseEvent("click"));
}

function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], { type: "application/octet-stream" }), filename);
}

function saveString(text, filename) {
  save(new Blob([text], { type: "text/plain" }), filename);
}

function formatNumber(number) {
  return new Intl.NumberFormat("en-us", { useGrouping: true }).format(number);
}

export { Editor };