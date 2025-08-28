import { UIPanel, UIButton, UICheckbox } from './libs/ui.js';

function Toolbar( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'toolbar' );

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
	const perspIcon = document.createElement( 'img' );
	perspIcon.src = 'images/persp.svg';

	const persp = new UIButton();
	persp.dom.className = 'Button big';
	persp.dom.appendChild( perspIcon );
	persp.dom.title = 'Perspective View';
	persp.onClick( function () {
		
		const camera = editor.camera;
		if ( camera ) {
			// 원근 시점 설정 (이미지 속성 기반)
			camera.position.set( 0.000, 126.461, 252.922 );
			camera.rotation.set( -26.57 * Math.PI / 180, 0, 0 );
			camera.lookAt( 0, 0, 0 );
			
			// 화각 설정
			if ( camera.fov !== undefined ) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			
			// near, far 클리핑 플레인 설정
			if ( camera.near !== undefined ) camera.near = 0.01;
			if ( camera.far !== undefined ) camera.far = 1000.00;
			
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
		
	} );
	container.add( persp );

	const frontIcon = document.createElement( 'img' );
	frontIcon.src = 'images/front.svg';

	const front = new UIButton();
	front.dom.className = 'Button big';
	front.dom.appendChild( frontIcon );
	front.dom.title = 'Front View';
	front.onClick( function () {
		
		const camera = editor.camera;
		if ( camera ) {
			// 정면 시점 설정 (이미지 속성 기반)
			camera.position.set( 0.000, 11.660, 284.553 );
			camera.rotation.set( 0 * Math.PI / 180, 0 * Math.PI / 180, 0 * Math.PI / 180 );
			
			// 화각 설정
			if ( camera.fov !== undefined ) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			
			// near, far 클리핑 플레인 설정
			if ( camera.near !== undefined ) camera.near = 0.01;
			if ( camera.far !== undefined ) camera.far = 1000.00;
			
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
		
	} );
	container.add( front );

	const sideIcon = document.createElement( 'img' );
	sideIcon.src = 'images/side.svg';

	const side = new UIButton();
	side.dom.className = 'Button big';
	side.dom.appendChild( sideIcon );
	side.dom.title = 'Side View';
	side.onClick( function () {
		
		const camera = editor.camera;
		if ( camera ) {
			// 측면 시점 설정 (이미지 속성 기반)
			camera.position.set( 151.409, 11.793, -1.179 );
			camera.rotation.set( 0 * Math.PI / 180, 90 * Math.PI / 180, 0 * Math.PI / 180 );
			
			// 화각 설정
			if ( camera.fov !== undefined ) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			
			// near, far 클리핑 플레인 설정
			if ( camera.near !== undefined ) camera.near = 0.01;
			if ( camera.far !== undefined ) camera.far = 1000.00;
			
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
		
	} );
	container.add( side );

	const topIcon = document.createElement( 'img' );
	topIcon.src = 'images/top.svg';
	
	const top = new UIButton();
	top.dom.className = 'Button big';
	top.dom.appendChild( topIcon );
	top.dom.title = 'Top View';
	top.onClick( function () {
		
		const camera = editor.camera;
		if ( camera ) {
			// 상단 시점 설정 (이미지 속성 기반)
			camera.position.set( 0.000, 125.282, 0.012 );
			camera.rotation.set( -Math.PI / 2, 0, 0 );
			camera.lookAt( 0, 0, 0 );
			
			// 화각 설정
			if ( camera.fov !== undefined ) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			
			// near, far 클리핑 플레인 설정
			if ( camera.near !== undefined ) camera.near = 0.01;
			if ( camera.far !== undefined ) camera.far = 1000.00;
			
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
		
	} );
	container.add( top );

	const local = new UICheckbox( false );
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

	return container;

}

export { Toolbar };
