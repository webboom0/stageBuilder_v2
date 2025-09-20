import { UIHorizontalRule, UIPanel, UIRow } from './libs/ui.js';

function MenubarView( editor ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/view' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// Helpers

	const states = {

		gridHelper: true,
		guideHelper: true,
		cameraHelpers: true,
		lightHelpers: true,
		skeletonHelpers: true

	};

	// Grid Helper

	let option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/gridHelper' ) ).onClick( function () {

		states.gridHelper = ! states.gridHelper;

		this.toggleClass( 'toggle-on', states.gridHelper );

		signals.showHelpersChanged.dispatch( states );

	} ).toggleClass( 'toggle-on', states.gridHelper );

	options.add( option );

	// Guide Helper

	option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( '가이드 도우미' ).onClick( function () {

		states.guideHelper = ! states.guideHelper;

		this.toggleClass( 'toggle-on', states.guideHelper );

		signals.showHelpersChanged.dispatch( states );

	} ).toggleClass( 'toggle-on', states.guideHelper );

	options.add( option );

	// Camera Helpers - 주석처리

	// option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/cameraHelpers' ) ).onClick( function () {

	// 	states.cameraHelpers = ! states.cameraHelpers;

	// 	this.toggleClass( 'toggle-on', states.cameraHelpers );

	// 	signals.showHelpersChanged.dispatch( states );

	// } ).toggleClass( 'toggle-on', states.cameraHelpers );

	// options.add( option );

	// Light Helpers - 주석처리

	// option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/lightHelpers' ) ).onClick( function () {

	// 	states.lightHelpers = ! states.lightHelpers;

	// 	this.toggleClass( 'toggle-on', states.lightHelpers );

	// 	signals.showHelpersChanged.dispatch( states );

	// } ).toggleClass( 'toggle-on', states.lightHelpers );

	// options.add( option );

	// Skeleton Helpers

	option = new UIRow().addClass( 'option' ).addClass( 'toggle' ).setTextContent( strings.getKey( 'menubar/view/skeletonHelpers' ) ).onClick( function () {

		states.skeletonHelpers = ! states.skeletonHelpers;

		this.toggleClass( 'toggle-on', states.skeletonHelpers );

		signals.showHelpersChanged.dispatch( states );

	} ).toggleClass( 'toggle-on', states.skeletonHelpers );

	options.add( option );
	
	options.add( new UIHorizontalRule() );

	// Audience View (객석시점)
	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( '객석시점' );
	option.onClick( function () {
		
		// 카메라를 객석시점으로 변경 (이미지 속성 기반)
		const camera = editor.camera;
		if ( camera ) {
			
			// 위치 설정 (X: -0.103, Y: 46.167, Z: -70.978)
			camera.position.set( -0.103, 46.167, -70.978 );
			
			// 회전 설정 (X: -172.04°, Y: 0.94°, Z: 179.87°)
			camera.rotation.set(
				THREE.MathUtils.degToRad( -172.04 ),
				THREE.MathUtils.degToRad( 0.94 ),
				THREE.MathUtils.degToRad( 179.87 )
			);
			
			// 스케일 설정 (X: 1.000, Y: 1.000, Z: 1.000)
			camera.scale.set( 1.000, 1.000, 1.000 );
			
			// 화각 설정 (50.00)
			if ( camera.fov !== undefined ) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			
			// near, far 클리핑 플레인 설정
			if ( camera.near !== undefined ) camera.near = 0.01;
			if ( camera.far !== undefined ) camera.far = 1000.00;
			
			// 카메라 업데이트
			camera.updateMatrix();
			camera.updateMatrixWorld();
			
			// 에디터에 변경사항 알림
			signals.cameraChanged.dispatch();
			
		}
		
	} );
	options.add( option );

	//

	options.add( new UIHorizontalRule() );

	// Fullscreen

	option = new UIRow();
	option.setClass( 'option' );
	option.setTextContent( strings.getKey( 'menubar/view/fullscreen' ) );
	option.onClick( function () {

		if ( document.fullscreenElement === null ) {

			document.documentElement.requestFullscreen();

		} else if ( document.exitFullscreen ) {

			document.exitFullscreen();

		}

		// Safari

		if ( document.webkitFullscreenElement === null ) {

			document.documentElement.webkitRequestFullscreen();

		} else if ( document.webkitExitFullscreen ) {

			document.webkitExitFullscreen();

		}

	} );
	options.add( option );

	// XR (Work in progress)

	if ( 'xr' in navigator ) {

		if ( 'offerSession' in navigator.xr ) {

			signals.offerXR.dispatch( 'immersive-ar' );

		} else {

			navigator.xr.isSessionSupported( 'immersive-ar' )
				.then( function ( supported ) {

					if ( supported ) {

						const option = new UIRow();
						option.setClass( 'option' );
						option.setTextContent( 'AR' );
						option.onClick( function () {

							signals.enterXR.dispatch( 'immersive-ar' );

						} );
						options.add( option );

					} else {

						navigator.xr.isSessionSupported( 'immersive-vr' )
							.then( function ( supported ) {

								if ( supported ) {

									const option = new UIRow();
									option.setClass( 'option' );
									option.setTextContent( 'VR' );
									option.onClick( function () {

										signals.enterXR.dispatch( 'immersive-vr' );

									} );
									options.add( option );

								}

							} );

					}

				} );

		}

	}

	//

	return container;

}

export { MenubarView };
