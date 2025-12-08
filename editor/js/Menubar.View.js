import { UIHorizontalRule, UIPanel, UIRow } from './libs/ui.js';

function MenubarView(editor) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass('menu');

	const title = new UIPanel();
	title.setClass('title');
	title.setTextContent(strings.getKey('menubar/view'));
	container.add(title);

	const options = new UIPanel();
	options.setClass('options');
	container.add(options);

	// Helpers

	const states = {

		gridHelper: true,
		guideHelper: true,
		cameraHelpers: true,
		lightHelpers: true,
		skeletonHelpers: true

	};

	// === 도우미 메뉴 (2단계) ===
	const helperSubmenuTitle = new UIRow()
		.setTextContent('도우미')
		.addClass('option')
		.addClass('submenu-title');
	helperSubmenuTitle.onMouseOver(function () {
		const { top, right } = helperSubmenuTitle.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle(this.dom);
		helperSubmenu.setLeft(right + 'px');
		helperSubmenu.setTop(top - parseFloat(paddingTop) + 'px');
		helperSubmenu.setStyle('max-height', [`calc( 100vh - ${top}px )`]);
		helperSubmenu.setDisplay('block');
	});
	helperSubmenuTitle.onMouseOut(function () {
		helperSubmenu.setDisplay('none');
	});
	options.add(helperSubmenuTitle);

	const helperSubmenu = new UIPanel()
		.setPosition('fixed')
		.addClass('options')
		.setDisplay('none');
	helperSubmenu.onMouseOver(function () {
		helperSubmenu.setDisplay('block');
	});
	helperSubmenu.onMouseOut(function () {
		helperSubmenu.setDisplay('none');
	});
	container.add(helperSubmenu);

	// Grid Helper
	let option = new UIRow().addClass('option').addClass('toggle').setTextContent('그리드 도우미').onClick(function () {
		states.gridHelper = !states.gridHelper;
		this.toggleClass('toggle-on', states.gridHelper);
		signals.showHelpersChanged.dispatch(states);
	}).toggleClass('toggle-on', states.gridHelper);
	helperSubmenu.add(option);

	// Guide Helper
	option = new UIRow().addClass('option').addClass('toggle').setTextContent('가이드 도우미').onClick(function () {
		states.guideHelper = !states.guideHelper;
		this.toggleClass('toggle-on', states.guideHelper);
		signals.showHelpersChanged.dispatch(states);
	}).toggleClass('toggle-on', states.guideHelper);
	helperSubmenu.add(option);

	// Skeleton Helpers
	option = new UIRow().addClass('option').addClass('toggle').setTextContent('골격 도우미').onClick(function () {
		states.skeletonHelpers = !states.skeletonHelpers;
		this.toggleClass('toggle-on', states.skeletonHelpers);
		signals.showHelpersChanged.dispatch(states);
	}).toggleClass('toggle-on', states.skeletonHelpers);
	helperSubmenu.add(option);

	options.add(new UIHorizontalRule());

	// === 카메라 메뉴 (2단계) ===
	const cameraSubmenuTitle = new UIRow()
		.setTextContent('카메라')
		.addClass('option')
		.addClass('submenu-title');
	cameraSubmenuTitle.onMouseOver(function () {
		const { top, right } = cameraSubmenuTitle.dom.getBoundingClientRect();
		const { paddingTop } = getComputedStyle(this.dom);
		cameraSubmenu.setLeft(right + 'px');
		cameraSubmenu.setTop(top - parseFloat(paddingTop) + 'px');
		cameraSubmenu.setStyle('max-height', [`calc( 100vh - ${top}px )`]);
		cameraSubmenu.setDisplay('block');
	});
	cameraSubmenuTitle.onMouseOut(function () {
		cameraSubmenu.setDisplay('none');
	});
	options.add(cameraSubmenuTitle);

	const cameraSubmenu = new UIPanel()
		.setPosition('fixed')
		.addClass('options')
		.setDisplay('none');
	cameraSubmenu.onMouseOver(function () {
		cameraSubmenu.setDisplay('block');
	});
	cameraSubmenu.onMouseOut(function () {
		cameraSubmenu.setDisplay('none');
	});
	container.add(cameraSubmenu);

	// 객석시점
	option = new UIRow().addClass('option').setTextContent('객석시점').onClick(function () {
		const camera = editor.camera;
		if (camera) {
			camera.position.set(-0.103, 46.167, -70.978);
			camera.rotation.set(
				THREE.MathUtils.degToRad(-172.04),
				THREE.MathUtils.degToRad(0.94),
				THREE.MathUtils.degToRad(179.87)
			);
			camera.scale.set(1.000, 1.000, 1.000);
			if (camera.fov !== undefined) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			if (camera.near !== undefined) camera.near = 0.01;
			if (camera.far !== undefined) camera.far = 1000.00;
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
	});
	cameraSubmenu.add(option);

	// Perspective
	option = new UIRow().addClass('option').setTextContent('Perspective').onClick(function () {
		const camera = editor.camera;
		if (camera) {
			camera.position.set(0.000, 126.461, 252.922);
			camera.rotation.set(-26.57 * Math.PI / 180, 0, 0);
			camera.lookAt(0, 0, 0);
			if (camera.fov !== undefined) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			if (camera.near !== undefined) camera.near = 0.01;
			if (camera.far !== undefined) camera.far = 1000.00;
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
	});
	cameraSubmenu.add(option);

	// Front
	option = new UIRow().addClass('option').setTextContent('Front').onClick(function () {
		const camera = editor.camera;
		if (camera) {
			camera.position.set(0.000, 11.660, 284.553);
			camera.rotation.set(0, 0, 0);
			if (camera.fov !== undefined) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			if (camera.near !== undefined) camera.near = 0.01;
			if (camera.far !== undefined) camera.far = 1000.00;
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
	});
	cameraSubmenu.add(option);

	// Side
	option = new UIRow().addClass('option').setTextContent('Side').onClick(function () {
		const camera = editor.camera;
		if (camera) {
			camera.position.set(151.409, 11.793, -1.179);
			camera.rotation.set(0, 90 * Math.PI / 180, 0);
			if (camera.fov !== undefined) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			if (camera.near !== undefined) camera.near = 0.01;
			if (camera.far !== undefined) camera.far = 1000.00;
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
	});
	cameraSubmenu.add(option);

	// Top
	option = new UIRow().addClass('option').setTextContent('Top').onClick(function () {
		const camera = editor.camera;
		if (camera) {
			camera.position.set(0.000, 125.282, 0.012);
			camera.rotation.set(-Math.PI / 2, 0, 0);
			camera.lookAt(0, 0, 0);
			if (camera.fov !== undefined) {
				camera.fov = 50.00;
				camera.updateProjectionMatrix();
			}
			if (camera.near !== undefined) camera.near = 0.01;
			if (camera.far !== undefined) camera.far = 1000.00;
			camera.updateMatrix();
			camera.updateMatrixWorld();
			signals.cameraChanged.dispatch();
		}
	});
	cameraSubmenu.add(option);

	//

	options.add(new UIHorizontalRule());

	// Fullscreen

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/view/fullscreen'));
	option.onClick(function () {

		if (document.fullscreenElement === null) {

			document.documentElement.requestFullscreen();

		} else if (document.exitFullscreen) {

			document.exitFullscreen();

		}

		// Safari

		if (document.webkitFullscreenElement === null) {

			document.documentElement.webkitRequestFullscreen();

		} else if (document.webkitExitFullscreen) {

			document.webkitExitFullscreen();

		}

	});
	options.add(option);

	// XR (Work in progress)

	if ('xr' in navigator) {

		if ('offerSession' in navigator.xr) {

			signals.offerXR.dispatch('immersive-ar');

		} else {

			navigator.xr.isSessionSupported('immersive-ar')
				.then(function (supported) {

					if (supported) {

						const option = new UIRow();
						option.setClass('option');
						option.setTextContent('AR');
						option.onClick(function () {

							signals.enterXR.dispatch('immersive-ar');

						});
						options.add(option);

					} else {

						navigator.xr.isSessionSupported('immersive-vr')
							.then(function (supported) {

								if (supported) {

									const option = new UIRow();
									option.setClass('option');
									option.setTextContent('VR');
									option.onClick(function () {

										signals.enterXR.dispatch('immersive-vr');

									});
									options.add(option);

								}

							});

					}

				});

		}

	}

	//

	return container;

}

export { MenubarView };
