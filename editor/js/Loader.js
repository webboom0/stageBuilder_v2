import * as THREE from "three";

import { TGALoader } from "three/addons/loaders/TGALoader.js";

import { AddObjectCommand } from "./commands/AddObjectCommand.js";

import { LoaderUtils } from "./LoaderUtils.js";

import { unzipSync, strFromU8 } from "three/addons/libs/fflate.module.js";

function Loader(editor) {
  // 객체를 scene에 추가하기 전에 처리하는 함수 추가
  function processObject(object) {
    object.traverse((child) => {
      if (child.parent && child.parent.isGroup) {
        // 그룹의 하위 객체인 경우
        child.userData.hideInScenePanel = true;
        child.userData.notSelectable = true;
        child.userData.notEditable = true;
      }
    });
    return object;
  }

  // 파일명에서 이름 추출
  function getFileNameFromPath(path) {
    return path.split("/").pop().split(".").shift();
  }

  const scope = this;

  this.texturePath = "";

  this.loadItemList = function (items) {
    LoaderUtils.getFilesFromItemList(items, function (files, filesMap) {
      scope.loadFiles(files, filesMap);
    });
  };

  this.loadFiles = function (files, filesMap) {
    if (files.length > 0) {
      filesMap = filesMap || LoaderUtils.createFilesMap(files);

      const manager = new THREE.LoadingManager();
      manager.setURLModifier(function (url) {
        url = url.replace(/^(\.?\/)/, ""); // remove './'

        const file = filesMap[url];

        if (file) {
          console.log("Loading", url);

          return URL.createObjectURL(file);
        }

        return url;
      });

      manager.addHandler(/\.tga$/i, new TGALoader());

      for (let i = 0; i < files.length; i++) {
        scope.loadFile(files[i], manager);
      }
    }
  };

  this.loadFile = function (file, manager) {
    const filename = file.name;
    const extension = filename.split(".").pop().toLowerCase();

    const reader = new FileReader();
    reader.addEventListener("progress", function (event) {
      const size =
        "(" +
        editor.utils.formatNumber(Math.floor(event.total / 1000)) +
        " KB)";
      const progress = Math.floor((event.loaded / event.total) * 100) + "%";

      console.log("Loading", filename, size, progress);
    });

    switch (extension) {
      case "3dm": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { Rhino3dmLoader } = await import(
              "three/addons/loaders/3DMLoader.js"
            );

            const loader = new Rhino3dmLoader();
            loader.setLibraryPath("../examples/jsm/libs/rhino3dm/");
            loader.parse(
              contents,
              function (object) {
                object.name = filename;

                editor.execute(new AddObjectCommand(editor, object));
              },
              function (error) {
                console.error(error);
              },
            );
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "3ds": {
        reader.addEventListener(
          "load",
          async function (event) {
            const { TDSLoader } = await import(
              "three/addons/loaders/TDSLoader.js"
            );

            const loader = new TDSLoader();
            const object = loader.parse(event.target.result);

            editor.execute(new AddObjectCommand(editor, object));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "3mf": {
        reader.addEventListener(
          "load",
          async function (event) {
            const { ThreeMFLoader } = await import(
              "three/addons/loaders/3MFLoader.js"
            );

            const loader = new ThreeMFLoader();
            const object = loader.parse(event.target.result);

            editor.execute(new AddObjectCommand(editor, object));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "amf": {
        reader.addEventListener(
          "load",
          async function (event) {
            const { AMFLoader } = await import(
              "three/addons/loaders/AMFLoader.js"
            );

            const loader = new AMFLoader();
            const amfobject = loader.parse(event.target.result);

            editor.execute(new AddObjectCommand(editor, amfobject));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "dae": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { ColladaLoader } = await import(
              "three/addons/loaders/ColladaLoader.js"
            );

            const loader = new ColladaLoader(manager);
            const collada = loader.parse(contents);

            collada.scene.name = filename;

            editor.execute(new AddObjectCommand(editor, collada.scene));
          },
          false,
        );
        reader.readAsText(file);

        break;
      }

      case "drc": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { DRACOLoader } = await import(
              "three/addons/loaders/DRACOLoader.js"
            );

            const loader = new DRACOLoader();
            loader.setDecoderPath("../examples/jsm/libs/draco/");
            loader.parse(contents, function (geometry) {
              let object;

              if (geometry.index !== null) {
                const material = new THREE.MeshStandardMaterial();

                object = new THREE.Mesh(geometry, material);
                object.name = filename;
              } else {
                const material = new THREE.PointsMaterial({ size: 0.01 });
                material.vertexColors = geometry.hasAttribute("color");

                object = new THREE.Points(geometry, material);
                object.name = filename;
              }

              loader.dispose();
              editor.execute(new AddObjectCommand(editor, object));
            });
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "fbx": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { FBXLoader } = await import(
              "three/addons/loaders/FBXLoader.js"
            );

            const loader = new FBXLoader(manager);
            const object = loader.parse(contents);
            // 전체 객체의 크기를 0.1로 조절
            object.scale.set(0.1, 0.1, 0.1);
            //  이름 설정
            object.name = getFileNameFromPath(file.name);

            // 객체 처리
            processObject(object);

            editor.execute(new AddObjectCommand(editor, object));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }
      /*
      case "fbx": {
        console.log("Loader.js - fbx");
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { FBXLoader } = await import(
              "three/addons/loaders/FBXLoader.js"
            );

            const loader = new FBXLoader(manager);
            const object = loader.parse(contents);

            // 전체 객체의 크기를 0.1로 조절
            object.scale.set(0.1, 0.1, 0.1);

            // 스킨드 메시가 있는지 확인
            let hasSkinnedMesh = false;
            object.traverse((child) => {
              if (child.isSkinnedMesh) {
                hasSkinnedMesh = true;
              }
            });

            // 스킨드 메시가 없는 경우에만 새로운 메시 생성
            if (!hasSkinnedMesh) {
              let rootBone = null;
              object.traverse((child) => {
                if (child.isBone && !child.parent.isBone) {
                  rootBone = child;
                }
              });

              if (rootBone && rootBone.skeleton) {
                console.log("Creating mesh for skeleton");
                const newMesh = createSkinnedMesh(rootBone.skeleton);
                object.add(newMesh);
              }
            }

            // 기존 객체 처리
            processObject(object);

            editor.execute(new AddObjectCommand(editor, object));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }
*/
      case "glb": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const loader = await createGLTFLoader();

            loader.parse(contents, "", function (result) {
              const scene = result.scene;
              scene.name = filename;

              scene.animations.push(...result.animations);
              editor.execute(new AddObjectCommand(editor, scene));

              loader.dracoLoader.dispose();
              loader.ktx2Loader.dispose();
            });
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "gltf": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const loader = await createGLTFLoader(manager);

            loader.parse(contents, "", function (result) {
              const scene = result.scene;
              scene.name = filename;

              scene.animations.push(...result.animations);
              editor.execute(new AddObjectCommand(editor, scene));

              loader.dracoLoader.dispose();
              loader.ktx2Loader.dispose();
            });
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "js":
      case "json": {
        reader.addEventListener(
          "load",
          function (event) {
            const contents = event.target.result;

            // 2.0

            if (contents.indexOf("postMessage") !== -1) {
              const blob = new Blob([contents], { type: "text/javascript" });
              const url = URL.createObjectURL(blob);

              const worker = new Worker(url);

              worker.onmessage = function (event) {
                event.data.metadata = { version: 2 };
                handleJSON(event.data);
              };

              worker.postMessage(Date.now());

              return;
            }

            // >= 3.0

            let data;

            try {
              data = JSON.parse(contents);
            } catch (error) {
              alert(error);
              return;
            }

            handleJSON(data);
          },
          false,
        );
        reader.readAsText(file);

        break;
      }

      case "kmz": {
        reader.addEventListener(
          "load",
          async function (event) {
            const { KMZLoader } = await import(
              "three/addons/loaders/KMZLoader.js"
            );

            const loader = new KMZLoader();
            const collada = loader.parse(event.target.result);

            collada.scene.name = filename;

            editor.execute(new AddObjectCommand(editor, collada.scene));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "ldr":
      case "mpd": {
        reader.addEventListener(
          "load",
          async function (event) {
            const { LDrawLoader } = await import(
              "three/addons/loaders/LDrawLoader.js"
            );

            const loader = new LDrawLoader();
            loader.setPath("../../examples/models/ldraw/officialLibrary/");
            loader.parse(event.target.result, function (group) {
              group.name = filename;
              // Convert from LDraw coordinates: rotate 180 degrees around OX
              group.rotation.x = Math.PI;

              editor.execute(new AddObjectCommand(editor, group));
            });
          },
          false,
        );
        reader.readAsText(file);

        break;
      }

      case "md2": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { MD2Loader } = await import(
              "three/addons/loaders/MD2Loader.js"
            );

            const geometry = new MD2Loader().parse(contents);
            const material = new THREE.MeshStandardMaterial();

            const mesh = new THREE.Mesh(geometry, material);
            mesh.mixer = new THREE.AnimationMixer(mesh);
            mesh.name = filename;

            mesh.animations.push(...geometry.animations);
            editor.execute(new AddObjectCommand(editor, mesh));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      // case "obj": {
      //   console.log("loader.js - obj 들어옴");
      //   reader.addEventListener(
      //     "load",
      //     async function (event) {
      //       const contents = event.target.result;

      //       const { OBJLoader } = await import(
      //         "three/addons/loaders/OBJLoader.js"
      //       );

      //       const loader = new OBJLoader();
      //       const object = loader.parse(contents);
      //       object.name = filename;

      //       // 더 단순한 Phong 재질 사용
      //       const wallMaterial = new THREE.MeshPhongMaterial({
      //         color: 0xcccccc, // 밝은 회색
      //         specular: 0x111111, // 반사광 색상
      //         shininess: 30, // 광택
      //         side: THREE.DoubleSide,
      //       });

      //       // 모든 메시에 재질 적용
      //       object.traverse((child) => {
      //         if (child.isMesh) {
      //           child.material = wallMaterial;
      //           // 그림자 설정
      //           child.castShadow = true;
      //           child.receiveShadow = true;
      //         }
      //       });

      //       // 객체 처리
      //       processObject(object);

      //       editor.execute(new AddObjectCommand(editor, object));
      //     },
      //     false,
      //   );
      //   reader.readAsText(file);

      //   break;
      // }

      case "obj": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { OBJLoader } = await import(
              "three/addons/loaders/OBJLoader.js"
            );

            const object = new OBJLoader().parse(contents);
            object.name = filename;

            // 객체 처리
            processObject(object);

            editor.execute(new AddObjectCommand(editor, object));
          },
          false,
        );
        reader.readAsText(file);

        break;
      }

      case "pcd": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { PCDLoader } = await import(
              "three/addons/loaders/PCDLoader.js"
            );

            const points = new PCDLoader().parse(contents);
            points.name = filename;

            editor.execute(new AddObjectCommand(editor, points));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "ply": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { PLYLoader } = await import(
              "three/addons/loaders/PLYLoader.js"
            );

            const geometry = new PLYLoader().parse(contents);
            let object;

            if (geometry.index !== null) {
              const material = new THREE.MeshStandardMaterial();

              object = new THREE.Mesh(geometry, material);
              object.name = filename;
            } else {
              const material = new THREE.PointsMaterial({ size: 0.01 });
              material.vertexColors = geometry.hasAttribute("color");

              object = new THREE.Points(geometry, material);
              object.name = filename;
            }

            editor.execute(new AddObjectCommand(editor, object));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "stl": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { STLLoader } = await import(
              "three/addons/loaders/STLLoader.js"
            );

            const geometry = new STLLoader().parse(contents);
            const material = new THREE.MeshStandardMaterial();

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = filename;

            editor.execute(new AddObjectCommand(editor, mesh));
          },
          false,
        );

        if (reader.readAsBinaryString !== undefined) {
          reader.readAsBinaryString(file);
        } else {
          reader.readAsArrayBuffer(file);
        }

        break;
      }

      case "svg": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { SVGLoader } = await import(
              "three/addons/loaders/SVGLoader.js"
            );

            const loader = new SVGLoader();
            const paths = loader.parse(contents).paths;

            //

            const group = new THREE.Group();
            group.name = filename;
            group.scale.multiplyScalar(0.1);
            group.scale.y *= -1;

            for (let i = 0; i < paths.length; i++) {
              const path = paths[i];

              const material = new THREE.MeshBasicMaterial({
                color: path.color,
                depthWrite: false,
              });

              const shapes = SVGLoader.createShapes(path);

              for (let j = 0; j < shapes.length; j++) {
                const shape = shapes[j];

                const geometry = new THREE.ShapeGeometry(shape);
                const mesh = new THREE.Mesh(geometry, material);

                group.add(mesh);
              }
            }

            editor.execute(new AddObjectCommand(editor, group));
          },
          false,
        );
        reader.readAsText(file);

        break;
      }

      case "usdz": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { USDZLoader } = await import(
              "three/addons/loaders/USDZLoader.js"
            );

            const group = new USDZLoader().parse(contents);
            group.name = filename;

            editor.execute(new AddObjectCommand(editor, group));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "vox": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { VOXLoader, VOXMesh } = await import(
              "three/addons/loaders/VOXLoader.js"
            );

            const chunks = new VOXLoader().parse(contents);

            const group = new THREE.Group();
            group.name = filename;

            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];

              const mesh = new VOXMesh(chunk);
              group.add(mesh);
            }

            editor.execute(new AddObjectCommand(editor, group));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "vtk":
      case "vtp": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { VTKLoader } = await import(
              "three/addons/loaders/VTKLoader.js"
            );

            const geometry = new VTKLoader().parse(contents);
            const material = new THREE.MeshStandardMaterial();

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = filename;

            editor.execute(new AddObjectCommand(editor, mesh));
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      case "wrl": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { VRMLLoader } = await import(
              "three/addons/loaders/VRMLLoader.js"
            );

            const result = new VRMLLoader().parse(contents);

            editor.execute(new AddObjectCommand(editor, result));
          },
          false,
        );
        reader.readAsText(file);

        break;
      }

      case "xyz": {
        reader.addEventListener(
          "load",
          async function (event) {
            const contents = event.target.result;

            const { XYZLoader } = await import(
              "three/addons/loaders/XYZLoader.js"
            );

            const geometry = new XYZLoader().parse(contents);

            const material = new THREE.PointsMaterial();
            material.vertexColors = geometry.hasAttribute("color");

            const points = new THREE.Points(geometry, material);
            points.name = filename;

            editor.execute(new AddObjectCommand(editor, points));
          },
          false,
        );
        reader.readAsText(file);

        break;
      }

      case "zip": {
        reader.addEventListener(
          "load",
          function (event) {
            handleZIP(event.target.result);
          },
          false,
        );
        reader.readAsArrayBuffer(file);

        break;
      }

      default:
        console.error("Unsupported file format (" + extension + ").");

        break;
    }
  };

  function handleJSON(data) {
    if (data.metadata === undefined) {
      // 2.0

      data.metadata = { type: "Geometry" };
    }

    if (data.metadata.type === undefined) {
      // 3.0

      data.metadata.type = "Geometry";
    }

    if (data.metadata.formatVersion !== undefined) {
      data.metadata.version = data.metadata.formatVersion;
    }

    switch (data.metadata.type.toLowerCase()) {
      case "buffergeometry": {
        const loader = new THREE.BufferGeometryLoader();
        const result = loader.parse(data);

        const mesh = new THREE.Mesh(result);

        editor.execute(new AddObjectCommand(editor, mesh));

        break;
      }

      case "geometry":
        console.error('Loader: "Geometry" is no longer supported.');

        break;

      case "object": {
        const loader = new THREE.ObjectLoader();
        loader.setResourcePath(scope.texturePath);

        loader.parse(data, function (result) {
          editor.execute(new AddObjectCommand(editor, result));
        });

        break;
      }

      case "app":
        editor.fromJSON(data);

        break;
    }
  }

  async function handleZIP(contents) {
    const zip = unzipSync(new Uint8Array(contents));

    const manager = new THREE.LoadingManager();
    manager.setURLModifier(function (url) {
      const file = zip[url];

      if (file) {
        console.log("Loading", url);

        const blob = new Blob([file.buffer], {
          type: "application/octet-stream",
        });
        return URL.createObjectURL(blob);
      }

      return url;
    });

    // Poly

    if (zip["model.obj"] && zip["materials.mtl"]) {
      const { MTLLoader } = await import("three/addons/loaders/MTLLoader.js");
      const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");

      const materials = new MTLLoader(manager).parse(
        strFromU8(zip["materials.mtl"]),
      );
      const object = new OBJLoader()
        .setMaterials(materials)
        .parse(strFromU8(zip["model.obj"]));

      editor.execute(new AddObjectCommand(editor, object));
      return;
    }

    //

    for (const path in zip) {
      const file = zip[path];

      const extension = path.split(".").pop().toLowerCase();

      switch (extension) {
        case "fbx": {
          const { FBXLoader } = await import(
            "three/addons/loaders/FBXLoader.js"
          );

          const loader = new FBXLoader(manager);
          const object = loader.parse(file.buffer);

          editor.execute(new AddObjectCommand(editor, object));

          break;
        }

        case "glb": {
          const loader = await createGLTFLoader();

          loader.parse(file.buffer, "", function (result) {
            const scene = result.scene;

            scene.animations.push(...result.animations);
            editor.execute(new AddObjectCommand(editor, scene));

            loader.dracoLoader.dispose();
            loader.ktx2Loader.dispose();
          });

          break;
        }

        case "gltf": {
          const loader = await createGLTFLoader(manager);

          loader.parse(strFromU8(file), "", function (result) {
            const scene = result.scene;

            scene.animations.push(...result.animations);
            editor.execute(new AddObjectCommand(editor, scene));

            loader.dracoLoader.dispose();
            loader.ktx2Loader.dispose();
          });

          break;
        }
      }
    }
  }

  async function createGLTFLoader(manager) {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const { DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js");
    const { KTX2Loader } = await import("three/addons/loaders/KTX2Loader.js");
    const { MeshoptDecoder } = await import(
      "three/addons/libs/meshopt_decoder.module.js"
    );

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("../examples/jsm/libs/draco/gltf/");

    const ktx2Loader = new KTX2Loader(manager);
    ktx2Loader.setTranscoderPath("../examples/jsm/libs/basis/");

    editor.signals.rendererDetectKTX2Support.dispatch(ktx2Loader);

    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(dracoLoader);
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);

    return loader;
  }
}

export { Loader };
