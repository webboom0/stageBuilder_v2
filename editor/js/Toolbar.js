import * as THREE from 'three';
import { UIPanel, UIButton, UICheckbox } from './libs/ui.js';

function Toolbar( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'toolbar' );

	function createSvgIcon( svg, title ) {
		const span = document.createElement( 'span' );
		span.className = 'toolbar-svg-icon';
		span.innerHTML = svg;
		span.title = title;
		return span;
	}

	function applyCameraPreset( preset ) {
		const camera = editor.camera;
		if ( ! camera ) return;

		camera.position.set( preset.position[ 0 ], preset.position[ 1 ], preset.position[ 2 ] );
		camera.rotation.set( preset.rotation[ 0 ], preset.rotation[ 1 ], preset.rotation[ 2 ] );

		if ( preset.lookAt ) camera.lookAt( preset.lookAt[ 0 ], preset.lookAt[ 1 ], preset.lookAt[ 2 ] );

		if ( camera.fov !== undefined ) {
			camera.fov = 50.00;
			camera.updateProjectionMatrix();
		}

		if ( camera.near !== undefined ) camera.near = 0.01;
		if ( camera.far !== undefined ) camera.far = 1000.00;

		camera.updateMatrix();
		camera.updateMatrixWorld();
		signals.cameraChanged.dispatch();
	}

	function setCeilingTransparencyForTopView( enabled ) {
		const stage = editor.scene?.getObjectByName( 'Stage' );
		if ( ! stage ) return;

		const lightLikeNameRe = /(light|spot|조명|라이트)/i;

		const applyToMaterial = ( material ) => {
			if ( ! material ) return;

			if ( enabled ) {
				if ( ! material.userData ) material.userData = {};
				if ( ! material.userData.__topViewOriginal ) {
					material.userData.__topViewOriginal = {
						transparent: material.transparent,
						opacity: material.opacity,
						depthWrite: material.depthWrite,
						needsUpdate: material.needsUpdate
					};
				}
				material.transparent = true;
				material.opacity = 0.14;
				material.depthWrite = false;
				material.needsUpdate = true;
				return;
			}

			const original = material.userData && material.userData.__topViewOriginal;
			if ( ! original ) return;

			material.transparent = original.transparent;
			material.opacity = original.opacity;
			material.depthWrite = original.depthWrite;
			material.needsUpdate = true;
			delete material.userData.__topViewOriginal;
		};

		stage.traverse( ( child ) => {
			if ( child.isMesh !== true ) return;
			const name = String( child.name || '' );
			if ( name === '_Floor' ) return; // 바닥은 유지

			if ( Array.isArray( child.material ) ) {
				child.material.forEach( applyToMaterial );
			} else {
				applyToMaterial( child.material );
			}
		} );

		const setHiddenForTopView = ( child ) => {
			if ( enabled ) {
				if ( child.userData.__topViewVisible === undefined ) {
					child.userData.__topViewVisible = child.visible;
				}
				child.visible = false;
			} else if ( child.userData.__topViewVisible !== undefined ) {
				child.visible = child.userData.__topViewVisible;
				delete child.userData.__topViewVisible;
			}
		};

		const isHideableLightVisual = ( child ) => {
			const name = String( child.name || '' );
			const type = String( child.type || '' );
			const isActualLight = type.endsWith( 'Light' );
			if ( isActualLight ) return false; // 라이트 본체는 유지

			const isHelper = type.endsWith( 'Helper' ) || type.includes( 'LightHelper' );
			const isLightSpriteLike =
				( child.isSprite === true || child.isPoints === true || child.isLine === true ) &&
				lightLikeNameRe.test( name );
			const isNamedLightLike =
				lightLikeNameRe.test( name ) &&
				( child.isMesh === true || child.isObject3D === true );

			return isHelper || isLightSpriteLike || isNamedLightLike;
		};

		// 사용자가 추가한 조명 아이콘/헬퍼: helper 트리
		const sceneHelpers = editor.sceneHelpers;
		if ( sceneHelpers ) {
			sceneHelpers.traverse( ( child ) => {
				if ( ! isHideableLightVisual( child ) ) return;
				setHiddenForTopView( child );
			} );
		}

		// 사용자가 씬에 직접 추가한 조명 아이콘/헬퍼
		editor.scene?.traverse( ( child ) => {
			if ( ! isHideableLightVisual( child ) ) return;
			setHiddenForTopView( child );
		} );

		// 실제 라이트 본체는 숨기지 않음(검정화면 방지)
	}

	// translate / rotate / scale

	const translateIcon = document.createElement( 'img' );
	translateIcon.title = strings.getKey( 'toolbar/translate' );
	translateIcon.src = 'images/translate.svg';

	const translate = new UIButton();
	translate.dom.className = 'Button selected';
	translate.dom.appendChild( translateIcon );
	translate.onClick( function () {

		signals.transformModeChanged.dispatch( 'translate' );

	} );
	container.add( translate );

	const rotateIcon = document.createElement( 'img' );
	rotateIcon.title = strings.getKey( 'toolbar/rotate' );
	rotateIcon.src = 'images/rotate.svg';

	const rotate = new UIButton();
	rotate.dom.appendChild( rotateIcon );
	rotate.onClick( function () {

		signals.transformModeChanged.dispatch( 'rotate' );

	} );
	container.add( rotate );

	const scaleIcon = document.createElement( 'img' );
	scaleIcon.title = strings.getKey( 'toolbar/scale' );
	scaleIcon.src = 'images/scale.svg';

	const scale = new UIButton();
	scale.dom.appendChild( scaleIcon );
	scale.onClick( function () {

		signals.transformModeChanged.dispatch( 'scale' );

	} );
	container.add( scale );

	// Preset Camera Views
	const perspIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h16v10H4z" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><path d="M4 7l8 4.6L20 7" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><text x="12" y="20" text-anchor="middle" font-size="6" fill="#d2d2d2" font-family="Arial">P</text></svg>',
		'원근 시점'
	);

	const persp = new UIButton();
	persp.dom.className = 'Button big';
	persp.dom.style.cssText = 'margin-left: 8px;';
	persp.dom.appendChild( perspIcon );
	persp.dom.title = '원근 시점';
	persp.onClick( function () {
		setCeilingTransparencyForTopView( false );

		applyCameraPreset( {
			position: [ 0.000, 126.461, 252.922 ],
			rotation: [ -26.57 * Math.PI / 180, 0, 0 ],
			lookAt: [ 0, 0, 0 ]
		} );

	} );
	container.add( persp );

	const audienceIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="4" width="14" height="9" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><circle cx="8" cy="17.5" r="1.2" fill="#d2d2d2"/><circle cx="12" cy="17.5" r="1.2" fill="#d2d2d2"/><circle cx="16" cy="17.5" r="1.2" fill="#d2d2d2"/><text x="12" y="21.2" text-anchor="middle" font-size="5" fill="#d2d2d2" font-family="Arial">AUD</text></svg>',
		'객석 시점'
	);

	const audience = new UIButton();
	audience.dom.className = 'Button big';
	audience.dom.appendChild( audienceIcon );
	audience.dom.title = '객석 시점';
	audience.onClick( function () {
		setCeilingTransparencyForTopView( false );

		applyCameraPreset( {
			position: [ 0.000, 46.380, 288.37 ],
			rotation: [ 0, 0, 0 ]
		} );

	} );
	container.add( audience );

	const frontIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="5" width="14" height="14" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><path d="M12 18V7" stroke="#d2d2d2" stroke-width="1.4"/><path d="M9.5 9.5L12 7l2.5 2.5" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><text x="12" y="22" text-anchor="middle" font-size="6" fill="#d2d2d2" font-family="Arial">F</text></svg>',
		'정면 시점'
	);

	const front = new UIButton();
	front.dom.className = 'Button big';
	front.dom.appendChild( frontIcon );
	front.dom.title = '정면 시점';
	front.onClick( function () {
		setCeilingTransparencyForTopView( false );

		applyCameraPreset( {
			position: [ 0.000, 11.660, 284.553 ],
			rotation: [ 0, 0, 0 ]
		} );

	} );
	container.add( front );

	const rightIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="5" width="14" height="14" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><path d="M7 12h10" stroke="#d2d2d2" stroke-width="1.4"/><path d="M14.5 9.5L17 12l-2.5 2.5" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><text x="12" y="22" text-anchor="middle" font-size="6" fill="#d2d2d2" font-family="Arial">R</text></svg>',
		'우측 시점'
	);

	const side = new UIButton();
	side.dom.className = 'Button big';
	side.dom.appendChild( rightIcon );
	side.dom.title = '우측 시점';
	side.onClick( function () {
		setCeilingTransparencyForTopView( false );

		applyCameraPreset( {
			position: [ 151.409, 11.793, -1.179 ],
			rotation: [ 0, 90 * Math.PI / 180, 0 ]
		} );

	} );
	container.add( side );

	const leftIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="5" width="14" height="14" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><path d="M7 12h10" stroke="#d2d2d2" stroke-width="1.4"/><path d="M9.5 9.5L7 12l2.5 2.5" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><text x="12" y="22" text-anchor="middle" font-size="6" fill="#d2d2d2" font-family="Arial">L</text></svg>',
		'좌측 시점'
	);

	const left = new UIButton();
	left.dom.className = 'Button big';
	left.dom.appendChild( leftIcon );
	left.dom.title = '좌측 시점';
	left.onClick( function () {
		setCeilingTransparencyForTopView( false );

		applyCameraPreset( {
			position: [ -151.409, 11.793, -1.179 ],
			rotation: [ 0, -90 * Math.PI / 180, 0 ]
		} );

	} );
	container.add( left );

	const topIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5" y="5" width="14" height="14" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><path d="M12 17V7" stroke="#d2d2d2" stroke-width="1.4"/><path d="M9.5 9.5L12 7l2.5 2.5" fill="none" stroke="#d2d2d2" stroke-width="1.4"/><text x="12" y="22" text-anchor="middle" font-size="6" fill="#d2d2d2" font-family="Arial">T</text></svg>',
		'상단 시점'
	);
	
	const top = new UIButton();
	top.dom.className = 'Button big';
	top.dom.appendChild( topIcon );
	top.dom.title = '상단 시점';
	top.onClick( function () {
		setCeilingTransparencyForTopView( true );

		applyCameraPreset( {
			position: [ 0.000, 125.282, 0.012 ],
			rotation: [ -Math.PI / 2, 0, 0 ],
			lookAt: [ 0, 0, 0 ]
		} );

	} );
	container.add( top );

	// Zoom In/Out buttons
	const zoomInIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10" cy="10" r="5" fill="none" stroke="#d2d2d2" stroke-width="1.5"/><path d="M14.5 14.5L20 20" stroke="#d2d2d2" stroke-width="1.5"/><path d="M10 7v6M7 10h6" stroke="#d2d2d2" stroke-width="1.5"/></svg>',
		'확대'
	);
	
	const zoomIn = new UIButton();
	zoomIn.dom.className = 'Button big';
	zoomIn.dom.style.cssText = 'margin-left: 8px;';
	zoomIn.dom.appendChild( zoomInIcon );
	zoomIn.dom.title = '확대';
	zoomIn.onClick( function () {
		
		const camera = editor.camera;
		if ( camera ) {
			if ( camera.isPerspectiveCamera ) {
				// Perspective 카메라: 위치를 목표점에 가깝게 이동
				const direction = new THREE.Vector3();
				camera.getWorldDirection( direction );
				camera.position.add( direction.multiplyScalar( 10 ) );
			} else if ( camera.isOrthographicCamera ) {
				// Orthographic 카메라: zoom 속성 조정
				camera.zoom = Math.min( camera.zoom * 1.2, 10 );
				camera.updateProjectionMatrix();
			}
			
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
		
	} );
	container.add( zoomIn );

	const zoomOutIcon = createSvgIcon(
		'<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10" cy="10" r="5" fill="none" stroke="#d2d2d2" stroke-width="1.5"/><path d="M14.5 14.5L20 20" stroke="#d2d2d2" stroke-width="1.5"/><path d="M7 10h6" stroke="#d2d2d2" stroke-width="1.5"/></svg>',
		'축소'
	);
	
	const zoomOut = new UIButton();
	zoomOut.dom.className = 'Button big';
	zoomOut.dom.appendChild( zoomOutIcon );
	zoomOut.dom.title = '축소';
	zoomOut.onClick( function () {
		
		const camera = editor.camera;
		if ( camera ) {
			if ( camera.isPerspectiveCamera ) {
				// Perspective 카메라: 위치를 목표점에서 멀어지게 이동
				const direction = new THREE.Vector3();
				camera.getWorldDirection( direction );
				camera.position.add( direction.multiplyScalar( -10 ) );
			} else if ( camera.isOrthographicCamera ) {
				// Orthographic 카메라: zoom 속성 조정
				camera.zoom = Math.max( camera.zoom / 1.2, 0.1 );
				camera.updateProjectionMatrix();
			}
			
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
		
	} );
	container.add( zoomOut );

	const local = new UICheckbox( false );
	local.dom.classList.add( 'toolbar-local-switch' );
	local.dom.title = strings.getKey( 'toolbar/local' );
	local.onChange( function () {

		signals.spaceChanged.dispatch( this.getValue() === true ? 'local' : 'world' );

	} );
	container.add( local );

	//

	signals.transformModeChanged.add( function ( mode ) {

		translate.dom.classList.remove( 'selected' );
		rotate.dom.classList.remove( 'selected' );
		scale.dom.classList.remove( 'selected' );

		switch ( mode ) {

			case 'translate': translate.dom.classList.add( 'selected' ); break;
			case 'rotate': rotate.dom.classList.add( 'selected' ); break;
			case 'scale': scale.dom.classList.add( 'selected' ); break;

		}

	} );

	// 스테이지 박스(.viewer) 안에서 툴바 드래그 이동
	{
		let dragging = false;
		let pointerOffsetX = 0;
		let pointerOffsetY = 0;
		let parentRect = null;

		const dom = container.dom;

		dom.addEventListener( 'pointerdown', function ( event ) {
			// 버튼 위에서는 기존 클릭 동작 우선
			if ( event.target.closest( 'button' ) ) return;

			const parent = dom.parentElement;
			if ( ! parent ) return;

			dragging = true;
			parentRect = parent.getBoundingClientRect();
			const rect = dom.getBoundingClientRect();

			// 가운데 정렬 transform에서 픽셀 좌표로 전환
			dom.style.transform = 'none';
			dom.style.left = `${rect.left - parentRect.left}px`;
			dom.style.top = `${rect.top - parentRect.top}px`;
			dom.style.bottom = 'auto';

			pointerOffsetX = event.clientX - rect.left;
			pointerOffsetY = event.clientY - rect.top;

			dom.setPointerCapture( event.pointerId );
			event.preventDefault();
		} );

		dom.addEventListener( 'pointermove', function ( event ) {
			if ( ! dragging || ! parentRect ) return;

			const maxLeft = parentRect.width - dom.offsetWidth;
			const maxTop = parentRect.height - dom.offsetHeight;

			let nextLeft = event.clientX - parentRect.left - pointerOffsetX;
			let nextTop = event.clientY - parentRect.top - pointerOffsetY;

			nextLeft = Math.max( 0, Math.min( maxLeft, nextLeft ) );
			nextTop = Math.max( 0, Math.min( maxTop, nextTop ) );

			dom.style.left = `${nextLeft}px`;
			dom.style.top = `${nextTop}px`;
		} );

		function stopDragging( event ) {
			if ( ! dragging ) return;
			dragging = false;
			try { dom.releasePointerCapture( event.pointerId ); } catch ( e ) {}
		}

		dom.addEventListener( 'pointerup', stopDragging );
		dom.addEventListener( 'pointercancel', stopDragging );
	}

	return container;

}

export { Toolbar };
