import DataMap from '../DataMap.js';
import ChainMap from '../ChainMap.js';
import NodeBuilderState from './NodeBuilderState.js';
import { cubeMapNode } from '../../../nodes/utils/CubeMapNode.js';
import { NodeFrame } from '../../../nodes/Nodes.js';
import { objectGroup, renderGroup, frameGroup, cubeTexture, texture, fog, rangeFogFactor, densityFogFactor, reference, pmremTexture, screenUV } from '../../../nodes/TSL.js';

import { CubeUVReflectionMapping, EquirectangularReflectionMapping, EquirectangularRefractionMapping } from '../../../constants.js';
import { hashArray } from '../../../nodes/core/NodeUtils.js';

const outputNodeMap = new WeakMap();

class Nodes extends DataMap {

	constructor( renderer, backend ) {

		super();

		this.renderer = renderer;
		this.backend = backend;
		this.nodeFrame = new NodeFrame();
		this.nodeBuilderCache = new Map();
		this.callHashCache = new ChainMap();
		this.groupsData = new ChainMap();
		this.cacheLib = {};

	}

	updateGroup( nodeUniformsGroup ) {

		const groupNode = nodeUniformsGroup.groupNode;
		const name = groupNode.name;

		// objectGroup is every updated

		if ( name === objectGroup.name ) return true;

		// renderGroup is updated once per render/compute call

		if ( name === renderGroup.name ) {

			const uniformsGroupData = this.get( nodeUniformsGroup );
			const renderId = this.nodeFrame.renderId;

			if ( uniformsGroupData.renderId !== renderId ) {

				uniformsGroupData.renderId = renderId;

				return true;

			}

			return false;

		}

		// frameGroup is updated once per frame

		if ( name === frameGroup.name ) {

			const uniformsGroupData = this.get( nodeUniformsGroup );
			const frameId = this.nodeFrame.frameId;

			if ( uniformsGroupData.frameId !== frameId ) {

				uniformsGroupData.frameId = frameId;

				return true;

			}

			return false;

		}

		// other groups are updated just when groupNode.needsUpdate is true

		const groupChain = [ groupNode, nodeUniformsGroup ];

		let groupData = this.groupsData.get( groupChain );
		if ( groupData === undefined ) this.groupsData.set( groupChain, groupData = {} );

		if ( groupData.version !== groupNode.version ) {

			groupData.version = groupNode.version;

			return true;

		}

		return false;

	}

	getForRenderCacheKey( renderObject ) {

		return renderObject.initialCacheKey;

	}

	getForRender( renderObject ) {

		const renderObjectData = this.get( renderObject );

		let nodeBuilderState = renderObjectData.nodeBuilderState;

		if ( nodeBuilderState === undefined ) {

			const { nodeBuilderCache } = this;

			const cacheKey = this.getForRenderCacheKey( renderObject );

			nodeBuilderState = nodeBuilderCache.get( cacheKey );

			if ( nodeBuilderState === undefined ) {

				const nodeBuilder = this.backend.createNodeBuilder( renderObject.object, this.renderer );
				nodeBuilder.scene = renderObject.scene;
				nodeBuilder.material = renderObject.material;
				nodeBuilder.camera = renderObject.camera;
				nodeBuilder.context.material = renderObject.material;
				nodeBuilder.lightsNode = renderObject.lightsNode;
				nodeBuilder.environmentNode = this.getEnvironmentNode( renderObject.scene );
				nodeBuilder.fogNode = this.getFogNode( renderObject.scene );
				nodeBuilder.clippingContext = renderObject.clippingContext;
				nodeBuilder.build();

				nodeBuilderState = this._createNodeBuilderState( nodeBuilder );

				nodeBuilderCache.set( cacheKey, nodeBuilderState );

			}

			nodeBuilderState.usedTimes ++;

			renderObjectData.nodeBuilderState = nodeBuilderState;

		}

		return nodeBuilderState;

	}

	delete( object ) {

		if ( object.isRenderObject ) {

			const nodeBuilderState = this.get( object ).nodeBuilderState;
			nodeBuilderState.usedTimes --;

			if ( nodeBuilderState.usedTimes === 0 ) {

				this.nodeBuilderCache.delete( this.getForRenderCacheKey( object ) );

			}

		}

		return super.delete( object );

	}

	getForCompute( computeNode ) {

		const computeData = this.get( computeNode );

		let nodeBuilderState = computeData.nodeBuilderState;

		if ( nodeBuilderState === undefined ) {

			const nodeBuilder = this.backend.createNodeBuilder( computeNode, this.renderer );
			nodeBuilder.build();

			nodeBuilderState = this._createNodeBuilderState( nodeBuilder );

			computeData.nodeBuilderState = nodeBuilderState;

		}

		return nodeBuilderState;

	}

	_createNodeBuilderState( nodeBuilder ) {

		return new NodeBuilderState(
			nodeBuilder.vertexShader,
			nodeBuilder.fragmentShader,
			nodeBuilder.computeShader,
			nodeBuilder.getAttributesArray(),
			nodeBuilder.getBindings(),
			nodeBuilder.updateNodes,
			nodeBuilder.updateBeforeNodes,
			nodeBuilder.updateAfterNodes,
			nodeBuilder.monitor,
			nodeBuilder.transforms
		);

	}

	getEnvironmentNode( scene ) {

		this.updateEnvironment( scene );

		let environmentNode = null;

		if ( scene.environmentNode && scene.environmentNode.isNode ) {

			environmentNode = scene.environmentNode;

		} else {

			const sceneData = this.get( scene );

			if ( sceneData.environmentNode ) {

				environmentNode = sceneData.environmentNode;

			}

		}

		return environmentNode;

	}

	getBackgroundNode( scene ) {

		this.updateBackground( scene );

		let backgroundNode = null;

		if ( scene.backgroundNode && scene.backgroundNode.isNode ) {

			backgroundNode = scene.backgroundNode;

		} else {

			const sceneData = this.get( scene );

			if ( sceneData.backgroundNode ) {

				backgroundNode = sceneData.backgroundNode;

			}

		}

		return backgroundNode;

	}

	getFogNode( scene ) {

		this.updateFog( scene );

		return scene.fogNode || this.get( scene ).fogNode || null;

	}

	getCacheKey( scene, lightsNode ) {

		const chain = [ scene, lightsNode ];
		const callId = this.renderer.info.calls;

		let cacheKeyData = this.callHashCache.get( chain );

		if ( cacheKeyData === undefined || cacheKeyData.callId !== callId ) {

			const environmentNode = this.getEnvironmentNode( scene );
			const fogNode = this.getFogNode( scene );

			const values = [];

			if ( lightsNode ) values.push( lightsNode.getCacheKey( true ) );
			if ( environmentNode ) values.push( environmentNode.getCacheKey() );
			if ( fogNode ) values.push( fogNode.getCacheKey() );

			values.push( this.renderer.shadowMap.enabled ? 1 : 0 );

			cacheKeyData = {
				callId,
				cacheKey: hashArray( values )
			};

			this.callHashCache.set( chain, cacheKeyData );

		}

		return cacheKeyData.cacheKey;

	}

	get isToneMappingState() {

		return this.renderer.getRenderTarget() ? false : true;

	}

	updateBackground( scene ) {

		const sceneData = this.get( scene );
		const background = scene.background;

		if ( background ) {

			const forceUpdate = ( scene.backgroundBlurriness === 0 && sceneData.backgroundBlurriness > 0 ) || ( scene.backgroundBlurriness > 0 && sceneData.backgroundBlurriness === 0 );

			if ( sceneData.background !== background || forceUpdate ) {

				const backgroundNode = this.getCacheNode( 'background', background, () => {

					if ( background.isCubeTexture === true || ( background.mapping === EquirectangularReflectionMapping || background.mapping === EquirectangularRefractionMapping || background.mapping === CubeUVReflectionMapping ) ) {

						if ( scene.backgroundBlurriness > 0 || background.mapping === CubeUVReflectionMapping ) {

							return pmremTexture( background );

						} else {

							let envMap;

							if ( background.isCubeTexture === true ) {

								envMap = cubeTexture( background );

							} else {

								envMap = texture( background );

							}

							return cubeMapNode( envMap );

						}

					} else if ( background.isTexture === true ) {

						return texture( background, screenUV.flipY() ).setUpdateMatrix( true );

					} else if ( background.isColor !== true ) {

						console.error( 'WebGPUNodes: Unsupported background configuration.', background );

					}

				}, forceUpdate );

				sceneData.backgroundNode = backgroundNode;
				sceneData.background = background;
				sceneData.backgroundBlurriness = scene.backgroundBlurriness;

			}

		} else if ( sceneData.backgroundNode ) {

			delete sceneData.backgroundNode;
			delete sceneData.background;

		}

	}

	getCacheNode( type, object, callback, forceUpdate = false ) {

		const nodeCache = this.cacheLib[ type ] || ( this.cacheLib[ type ] = new WeakMap() );

		let node = nodeCache.get( object );

		if ( node === undefined || forceUpdate ) {

			node = callback();
			nodeCache.set( object, node );

		}

		return node;

	}

	updateFog( scene ) {

		const sceneData = this.get( scene );
		const sceneFog = scene.fog;

		if ( sceneFog ) {

			if ( sceneData.fog !== sceneFog ) {

				const fogNode = this.getCacheNode( 'fog', sceneFog, () => {

					if ( sceneFog.isFogExp2 ) {

						const color = reference( 'color', 'color', sceneFog ).setGroup( renderGroup );
						const density = reference( 'density', 'float', sceneFog ).setGroup( renderGroup );

						return fog( color, densityFogFactor( density ) );

					} else if ( sceneFog.isFog ) {

						const color = reference( 'color', 'color', sceneFog ).setGroup( renderGroup );
						const near = reference( 'near', 'float', sceneFog ).setGroup( renderGroup );
						const far = reference( 'far', 'float', sceneFog ).setGroup( renderGroup );

						return fog( color, rangeFogFactor( near, far ) );

					} else {

						console.error( 'THREE.Renderer: Unsupported fog configuration.', sceneFog );

					}

				} );

				sceneData.fogNode = fogNode;
				sceneData.fog = sceneFog;

			}

		} else {

			delete sceneData.fogNode;
			delete sceneData.fog;

		}

	}

	updateEnvironment( scene ) {

		const sceneData = this.get( scene );
		const environment = scene.environment;

		if ( environment ) {

			if ( sceneData.environment !== environment ) {

				const environmentNode = this.getCacheNode( 'environment', environment, () => {

					if ( environment.isCubeTexture === true ) {

						return cubeTexture( environment );

					} else if ( environment.isTexture === true ) {

						return texture( environment );

					} else {

						console.error( 'Nodes: Unsupported environment configuration.', environment );

					}

				} );

				sceneData.environmentNode = environmentNode;
				sceneData.environment = environment;

			}

		} else if ( sceneData.environmentNode ) {

			delete sceneData.environmentNode;
			delete sceneData.environment;

		}

	}

	getNodeFrame( renderer = this.renderer, scene = null, object = null, camera = null, material = null ) {

		const nodeFrame = this.nodeFrame;
		nodeFrame.renderer = renderer;
		nodeFrame.scene = scene;
		nodeFrame.object = object;
		nodeFrame.camera = camera;
		nodeFrame.material = material;

		return nodeFrame;

	}

	getNodeFrameForRender( renderObject ) {

		return this.getNodeFrame( renderObject.renderer, renderObject.scene, renderObject.object, renderObject.camera, renderObject.material );

	}

	getOutputCacheKey() {

		const renderer = this.renderer;

		return renderer.toneMapping + ',' + renderer.currentColorSpace;

	}

	hasOutputChange( outputTarget ) {

		const cacheKey = outputNodeMap.get( outputTarget );

		return cacheKey !== this.getOutputCacheKey();

	}

	getOutputNode( outputTexture ) {

		const renderer = this.renderer;
		const cacheKey = this.getOutputCacheKey();

		const output = texture( outputTexture, screenUV ).renderOutput( renderer.toneMapping, renderer.currentColorSpace );

		outputNodeMap.set( outputTexture, cacheKey );

		return output;

	}

	updateBefore( renderObject ) {

		const nodeBuilder = renderObject.getNodeBuilderState();

		for ( const node of nodeBuilder.updateBeforeNodes ) {

			// update frame state for each node

			this.getNodeFrameForRender( renderObject ).updateBeforeNode( node );

		}

	}

	updateAfter( renderObject ) {

		const nodeBuilder = renderObject.getNodeBuilderState();

		for ( const node of nodeBuilder.updateAfterNodes ) {

			// update frame state for each node

			this.getNodeFrameForRender( renderObject ).updateAfterNode( node );

		}

	}

	updateForCompute( computeNode ) {

		const nodeFrame = this.getNodeFrame();
		const nodeBuilder = this.getForCompute( computeNode );

		for ( const node of nodeBuilder.updateNodes ) {

			nodeFrame.updateNode( node );

		}

	}

	updateForRender( renderObject ) {

		const nodeFrame = this.getNodeFrameForRender( renderObject );
		const nodeBuilder = renderObject.getNodeBuilderState();

		for ( const node of nodeBuilder.updateNodes ) {

			nodeFrame.updateNode( node );

		}

	}

	needsRefresh( renderObject ) {

		const nodeFrame = this.getNodeFrameForRender( renderObject );
		const monitor = renderObject.getMonitor();

		return monitor.needsRefresh( renderObject, nodeFrame );

	}

	dispose() {

		super.dispose();

		this.nodeFrame = new NodeFrame();
		this.nodeBuilderCache = new Map();

	}

}

export default Nodes;
