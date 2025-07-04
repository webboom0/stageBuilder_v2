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
    try {
      // JSON 데이터 검증 및 복구
      json = this.validateAndRepairJSON(json);
      console.log("Editor.js JSON 데이터 검증 완료:", json);

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

      // 카메라 로드 시 오류 처리
      let camera;
      try {
        camera = await loader.parseAsync(json.camera);
      } catch (cameraError) {
        console.warn("카메라 로드 중 오류 발생, 기본 카메라로 대체:", cameraError);

        // 기본 카메라 생성
        camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
        camera.name = "Camera";
        camera.position.set(0, 0, 5);
        camera.uuid = json.camera?.uuid || crypto.randomUUID();
      }

      const existingUuid = this.camera.uuid;
      const incomingUuid = camera.uuid;

      // copy all properties, including uuid
      this.camera.copy(camera);
      this.camera.uuid = incomingUuid;

      delete this.cameras[existingUuid]; // remove old entry [existingUuid, this.camera]
      this.cameras[incomingUuid] = this.camera; // add new entry [incomingUuid, this.camera]

      this.signals.cameraResetted.dispatch();

      // history 로드 시 오류 처리
      try {
        this.history.fromJSON(json.history);
      } catch (historyError) {
        console.warn("history 로드 중 오류 발생, 기본값으로 초기화:", historyError);
        this.history.clear();
      }

      // scripts 로드 시 오류 처리
      try {
        this.scripts = json.scripts || {};
      } catch (scriptsError) {
        console.warn("scripts 로드 중 오류 발생, 빈 객체로 초기화:", scriptsError);
        this.scripts = {};
      }

      // 씬 로드 시 오류 처리
      try {
        const scene = await loader.parseAsync(json.scene);
        this.setScene(scene);
      } catch (sceneError) {
        console.warn("씬 로드 중 오류 발생, 기본 씬으로 대체:", sceneError);

        // 기본 씬 설정
        this.scene.name = "Scene";
        this.scene.userData = json.scene?.userData || {};

        // 씬의 기본 속성들 복원
        if (json.scene) {
          this.scene.uuid = json.scene.uuid || this.scene.uuid;
          this.scene.name = json.scene.name || "Scene";
          this.scene.userData = { ...this.scene.userData, ...json.scene.userData };
        }
      }

      if (json.environment === "ModelViewer") {
        this.signals.sceneEnvironmentChanged.dispatch(json.environment);
        this.signals.refreshSidebarEnvironment.dispatch();
      }

      // MotionTimeline 데이터 복원
      if (json.motionTimeline && this.motionTimeline) {
        try {
          console.log("=== MotionTimeline 데이터 복원 시작 ===");
          console.log("json.motionTimeline:", json.motionTimeline);
          console.log("this.motionTimeline:", this.motionTimeline);

          // scene.userData에 motionTimeline 데이터 저장
          if (!this.scene.userData) {
            this.scene.userData = {};
          }
          this.scene.userData.motionTimeline = json.motionTimeline;
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
        console.log("json.motionTimeline 존재:", !!json.motionTimeline);
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

  // JSON 데이터 검증 및 복구 메서드
  validateAndRepairJSON: function (data) {
    if (!data) return data;

    console.log("Editor.js JSON 데이터 검증 시작:", data);

    // animations 속성이 없으면 빈 배열로 초기화
    if (!data.animations) {
      data.animations = [];
    }

    // scene 속성이 없으면 기본 scene 구조 생성
    if (!data.scene) {
      data.scene = {
        type: 'Scene',
        children: [],
        animations: []
      };
    }

    // scene의 animations 속성도 확인
    if (data.scene && !data.scene.animations) {
      data.scene.animations = [];
    }

    // scene이 THREE.js 형식이 아니면 기본 형식으로 변환
    if (data.scene && (!data.scene.type || data.scene.type !== 'Scene')) {
      console.warn("scene이 THREE.js 형식이 아니므로 기본 형식으로 변환");
      data.scene = {
        type: 'Scene',
        uuid: data.scene.uuid || crypto.randomUUID(),
        name: data.scene.name || 'Scene',
        children: data.scene.children || [],
        animations: data.scene.animations || [],
        userData: data.scene.userData || {},
        matrix: data.scene.matrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
      };
    }

    // scene의 children이 올바른 형식인지 확인하고 복구
    if (data.scene && data.scene.children) {
      if (!Array.isArray(data.scene.children)) {
        console.warn("scene.children가 배열이 아니므로 빈 배열로 초기화");
        data.scene.children = [];
      } else {
        // children의 각 객체를 검증하고 복구
        data.scene.children = data.scene.children.filter(child => {
          if (!child || typeof child !== 'object') {
            console.warn("유효하지 않은 child 객체 제거:", child);
            return false;
          }

          // type 속성이 없으면 기본값 설정
          if (!child.type) {
            console.warn("child에 type 속성이 없어 기본값 설정:", child);
            child.type = 'Object3D'; // 기본 타입
          }

          // uuid가 없으면 생성
          if (!child.uuid) {
            console.warn("child에 uuid가 없어 생성:", child);
            child.uuid = crypto.randomUUID();
          }

          // 필수 속성들이 없으면 기본값 설정
          if (!child.name) child.name = 'Object';
          if (!child.position) child.position = [0, 0, 0];
          if (!child.rotation) child.rotation = [0, 0, 0];
          if (!child.scale) child.scale = [1, 1, 1];
          if (!child.matrix) child.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
          if (!child.userData) child.userData = {};
          if (!child.children) child.children = [];
          if (!child.animations) child.animations = [];

          return true;
        });
      }
    }

    // objects 배열이 없으면 빈 배열로 초기화
    if (!data.objects) {
      data.objects = [];
    }

    // objects 배열의 각 객체를 검증하고 복구
    if (data.objects && Array.isArray(data.objects)) {
      data.objects = data.objects.filter(obj => {
        if (!obj || typeof obj !== 'object') {
          console.warn("유효하지 않은 object 제거:", obj);
          return false;
        }

        // type 속성이 없으면 기본값 설정
        if (!obj.type) {
          console.warn("object에 type 속성이 없어 기본값 설정:", obj);
          obj.type = 'Object3D';
        }

        // uuid가 없으면 생성
        if (!obj.uuid) {
          console.warn("object에 uuid가 없어 생성:", obj);
          obj.uuid = crypto.randomUUID();
        }

        // 필수 속성들이 없으면 기본값 설정
        if (!obj.name) obj.name = 'Object';
        if (!obj.position) obj.position = [0, 0, 0];
        if (!obj.rotation) obj.rotation = [0, 0, 0];
        if (!obj.scale) obj.scale = [1, 1, 1];
        if (!obj.matrix) obj.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        if (!obj.userData) obj.userData = {};
        if (!obj.children) obj.children = [];
        if (!obj.animations) obj.animations = [];

        return true;
      });
    }

    // camera 속성 확인
    if (!data.camera) {
      data.camera = {
        type: 'PerspectiveCamera',
        uuid: crypto.randomUUID(),
        name: 'Camera',
        fov: 50,
        aspect: 1,
        near: 0.1,
        far: 2000,
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      };
    }

    // camera가 THREE.js 형식이 아니면 기본 형식으로 변환
    if (data.camera && (!data.camera.type || !data.camera.uuid)) {
      console.warn("camera가 THREE.js 형식이 아니므로 기본 형식으로 변환");
      data.camera = {
        type: 'PerspectiveCamera',
        uuid: data.camera.uuid || crypto.randomUUID(),
        name: data.camera.name || 'Camera',
        fov: data.camera.fov || 50,
        aspect: data.camera.aspect || 1,
        near: data.camera.near || 0.1,
        far: data.camera.far || 2000,
        position: data.camera.position || [0, 0, 5],
        rotation: data.camera.rotation || [0, 0, 0],
        scale: data.camera.scale || [1, 1, 1]
      };
    }

    // 재귀적으로 모든 객체의 children을 검증하고 복구
    function validateChildrenRecursively(children) {
      if (!Array.isArray(children)) return [];

      return children.filter(child => {
        if (!child || typeof child !== 'object') {
          console.warn("재귀 검증: 유효하지 않은 child 객체 제거:", child);
          return false;
        }

        // type 속성이 없으면 기본값 설정
        if (!child.type) {
          console.warn("재귀 검증: child에 type 속성이 없어 기본값 설정:", child);
          child.type = 'Object3D';
        }

        // uuid가 없으면 생성
        if (!child.uuid) {
          console.warn("재귀 검증: child에 uuid가 없어 생성:", child);
          child.uuid = crypto.randomUUID();
        }

        // 필수 속성들이 없으면 기본값 설정
        if (!child.name) child.name = 'Object';
        if (!child.position) child.position = [0, 0, 0];
        if (!child.rotation) child.rotation = [0, 0, 0];
        if (!child.scale) child.scale = [1, 1, 1];
        if (!child.matrix) child.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        if (!child.userData) child.userData = {};
        if (!child.children) child.children = [];
        if (!child.animations) child.animations = [];

        // 재귀적으로 children 검증
        if (child.children) {
          child.children = validateChildrenRecursively(child.children);
        }

        return true;
      });
    }

    // scene의 children을 재귀적으로 검증
    if (data.scene && data.scene.children) {
      data.scene.children = validateChildrenRecursively(data.scene.children);
    }

    // objects의 children을 재귀적으로 검증
    if (data.objects && Array.isArray(data.objects)) {
      data.objects.forEach(obj => {
        if (obj.children) {
          obj.children = validateChildrenRecursively(obj.children);
        }
      });
    }

    console.log("Editor.js JSON 데이터 검증 및 복구 완료:", data);
    return data;
  },

  toJSON: function () {
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

        this.motionTimeline.onBeforeSave();

        console.log("onBeforeSave 완료 후 scene.userData.motionTimeline:", this.scene.userData.motionTimeline);
        console.log("=== MotionTimeline 데이터 저장 완료 ===");
      } catch (error) {
        console.error("MotionTimeline 데이터 저장 중 오류:", error);
      }
    } else {
      console.log("motionTimeline 인스턴스가 없어서 저장하지 않습니다.");
    }

    return {
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
      scene: this.scene.toJSON(),
      scripts: this.scripts,
      history: this.history.toJSON(),
      environment: environment,
      motionTimeline: this.scene.userData.motionTimeline || null, // MotionTimeline 데이터 저장
      music: this.music ? this.music.toJSON() : undefined, // music 정보 저장
    };
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
