/**
 * 키보드 단축키 관리 클래스
 * 타임라인 관련 모든 단축키를 중앙에서 관리
 */
export class KeyboardShortcuts {
    constructor(motionTimeline) {
        this.motionTimeline = motionTimeline;
        this.isEnabled = true;

        // 단축키 정의
        this.shortcuts = {
            'Space': {
                description: '재생/일시정지',
                action: () => this.togglePlayPause(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false
                }
            },
            'KeyK': {
                description: '현재 시간에 키프레임 추가',
                action: () => this.addKeyframe(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false
                }
            },
            'KeyD': {
                description: '선택된 키프레임 삭제',
                action: () => this.deleteSelectedKeyframe(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false
                }
            },
            'KeyM': {
                description: 'Playhead 위치 이동',
                action: () => this.showPlayheadMoveDialog(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false
                }
            },
            'Escape': {
                description: '정지',
                action: () => this.stop(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false
                }
            },
            'F1': {
                description: '단축키 도움말 표시',
                action: () => this.showHelp(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false
                }
            }
        };

        this.init();
    }

    init() {
        this.bindEvents();
        console.log('KeyboardShortcuts 초기화 완료');
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleKeyDown(e) {
        if (!this.isEnabled) return;

        // 입력 필드에 포커스가 있으면 단축키 비활성화
        const activeElement = document.activeElement;
        if (this.isInputField(activeElement)) {
            return;
        }

        // Ctrl+Z 디버깅
        // if (e.code === 'KeyZ' && e.ctrlKey) {
        //     console.log("🎯 Ctrl+Z 감지됨:", {
        //         code: e.code,
        //         ctrlKey: e.ctrlKey,
        //         shiftKey: e.shiftKey,
        //         metaKey: e.metaKey
        //     });
        // }

        const shortcut = this.shortcuts[e.code];
        if (!shortcut) {
            return; // 로그 제거
        }

        // 조건 확인
        if (shortcut.conditions) {
            for (const [key, value] of Object.entries(shortcut.conditions)) {
                if (e[key] !== value) {
                    return; // 로그 제거
                }
            }
        }

        // 기본 동작 방지
        if (shortcut.preventDefault) {
            e.preventDefault();
        }

        // 액션 실행
        try {
            if (shortcut.code === 'KeyZ' && shortcut.conditions?.ctrlKey) {
                // KeyZ의 경우 shiftKey 상태를 전달
                this.handleKeyZAction(e.shiftKey);
            } else {
                shortcut.action();
            }
        } catch (error) {
            console.error('단축키 실행 중 오류:', error);
        }
    }

    // 입력 필드인지 확인하는 헬퍼 함수
    isInputField(element) {
        if (!element) return false;
        
        const inputTypes = [
            'input', 'textarea', 'select', 'contenteditable'
        ];
        
        // input, textarea, select 요소 확인
        if (inputTypes.includes(element.tagName.toLowerCase())) {
            return true;
        }
        
        // contenteditable 속성 확인
        if (element.contentEditable === 'true') {
            return true;
        }
        
        // CodeMirror 에디터 확인
        if (element.closest('.CodeMirror')) {
            return true;
        }
        
        // 특정 클래스나 ID를 가진 입력 필드 확인
        const inputClasses = ['input', 'textarea', 'form-control', 'ui-input', 'totalSeconds', 'seconds'];
        const inputIds = ['seconds', 'search', 'command', 'totalSeconds'];
        
        if (inputClasses.some(cls => element.classList.contains(cls))) {
            return true;
        }
        
        if (inputIds.some(id => element.id === id)) {
            return true;
        }
        
        // 부모 요소에서 입력 필드 관련 클래스 확인
        const parentWithInputClass = element.closest('.input, .textarea, .form-control, .ui-input');
        if (parentWithInputClass) {
            return true;
        }
        
        return false;
    }

    // 재생/일시정지 토글
    togglePlayPause() {
        console.log("KeyboardShortcuts - 재생/일시정지 토글");

        if (!this.motionTimeline.isPlaying) {
            console.log("재생 시작");
            this.motionTimeline.play();
        } else {
            console.log("일시정지");
            this.motionTimeline.pause();
        }
    }

    // 키프레임 추가
    addKeyframe() {
        console.log("KeyboardShortcuts - 키프레임 추가");

        // 현재 선택된 객체가 있는지 확인
        const selectedObject = this.motionTimeline.editor.selected;
        if (!selectedObject) {
            console.warn("키프레임을 추가할 객체가 선택되지 않았습니다.");
            this.showWarning("키프레임을 추가하려면 객체를 선택하세요.");
            return;
        }

        // 현재 시간 가져오기
        const currentTime = this.motionTimeline.currentTime;
        console.log("현재 시간에 키프레임 추가:", {
            objectUuid: selectedObject.uuid,
            objectName: selectedObject.name,
            currentTime: currentTime
        });

        // 선택된 객체의 트랙이 있는지 확인
        const trackElement = this.motionTimeline.container.querySelector(`[data-uuid="${selectedObject.uuid}"]`);
        if (!trackElement) {
            console.warn("선택된 객체의 트랙을 찾을 수 없습니다:", selectedObject.uuid);
            this.showWarning("선택된 객체의 트랙을 찾을 수 없습니다.");
            return;
        }

        // 현재 시간이 클립 범위에 있는지 확인
        const sprites = trackElement.querySelectorAll('.animation-sprite');
        let isInClipRange = false;

        sprites.forEach(sprite => {
            const clipLeft = parseFloat(sprite.style.left) || 0;
            const clipStartTime = (clipLeft / 100) * this.motionTimeline.options.totalSeconds;
            const clipDuration = parseFloat(sprite.dataset.duration) || 5;
            const clipEndTime = clipStartTime + clipDuration;

            if (currentTime >= clipStartTime && currentTime <= clipEndTime) {
                isInClipRange = true;
            }
        });

        if (!isInClipRange) {
            console.warn("현재 시간이 클립 범위 밖에 있습니다:", currentTime);
            this.showWarning("키프레임은 클립 범위 내에서만 추가할 수 있습니다.");
            return;
        }

        // 키프레임 추가
        const value = this.motionTimeline.getKeyframeValue(selectedObject, 'position');
        if (value && selectedObject.uuid) {
            console.log("단축키로 키프레임 추가:", {
                objectUuid: selectedObject.uuid,
                time: currentTime,
                value: value
            });

            const success = this.motionTimeline.addKeyframe(selectedObject.uuid, 'position', currentTime, value);
            if (success) {
                console.log("키프레임 추가 성공!");
                this.showSuccess("✓ 키프레임 추가됨");
            } else {
                console.error("키프레임 추가 실패!");
                this.showWarning("키프레임 추가에 실패했습니다.");
            }
        } else {
            console.warn("키프레임 값을 가져올 수 없습니다.");
            this.showWarning("키프레임 값을 가져올 수 없습니다.");
        }
    }

    // 선택된 키프레임 삭제
    deleteSelectedKeyframe() {
        console.log("KeyboardShortcuts - 선택된 키프레임 삭제");

        // 선택된 키프레임이 있는지 확인
        if (!this.motionTimeline.selectedKeyframe) {
            console.warn("삭제할 키프레임이 선택되지 않았습니다.");
            this.showWarning("삭제할 키프레임을 선택하세요.");
            return;
        }

        // 삭제 전에 선택된 키프레임 정보 저장
        const wasSelected = !!this.motionTimeline.selectedKeyframe;

        // 키프레임 삭제 실행
        this.motionTimeline.deleteSelectedKeyframeByIndex();

        // 삭제가 성공했는지 확인 (selectedKeyframe이 null이 되었는지)
        if (wasSelected && !this.motionTimeline.selectedKeyframe) {
            // 성공 메시지 표시
            this.showSuccess("선택된 키프레임이 삭제되었습니다.");
        }
    }

    // 정지
    stop() {
        console.log("KeyboardShortcuts - 정지");
        this.motionTimeline.stop();
    }

	// 히스토리 관련 메서드들은 Editor.js에서 전역으로 처리됨
	// Ctrl+Z: 되돌리기, Ctrl+Shift+Z: 다시하기

	// // KeyZ 액션 처리 (Ctrl+Z vs Ctrl+Shift+Z)
	// handleKeyZAction(shiftKey) {
	// 	console.log("🎯 handleKeyZAction 호출됨:", { shiftKey });
	// 	if (shiftKey) {
	// 		console.log("🎯 Ctrl+Shift+Z 감지 - 에디터 히스토리 되돌리기");
	// 		this.editorUndo();
	// 	} else {
	// 		console.log("🎯 Ctrl+Z 감지 - 통합 히스토리 되돌리기");
	// 		this.undo();
	// 	}
	// }

	// 에디터 히스토리 되돌리기 (Editor Undo)
	// editorUndo() {
	// 	console.log("KeyboardShortcuts - 에디터 히스토리 되돌리기");
		
	// 	if (this.motionTimeline.editor && this.motionTimeline.editor.history) {
	// 		try {
	// 			const result = this.motionTimeline.editor.history.undo();
	// 			if (result) {
	// 				console.log("에디터 되돌리기 성공:", result.name);
	// 			this.showSuccess(`✓ 에디터 되돌리기: ${result.name}`);
	// 			} else {
	// 				console.log("에디터 되돌리기할 명령이 없습니다.");
	// 				this.showWarning("에디터 되돌리기할 명령이 없습니다.");
	// 			}
	// 		} catch (error) {
	// 			console.error("에디터 되돌리기 중 오류:", error);
	// 			this.showWarning("에디터 되돌리기 중 오류가 발생했습니다.");
	// 		}
	// 	} else {
	// 		console.warn("에디터 히스토리 시스템을 찾을 수 없습니다.");
	// 		this.showWarning("에디터 히스토리 시스템을 찾을 수 없습니다.");
	// 	}
	// }

    // Playhead 이동 다이얼로그 표시
    showPlayheadMoveDialog() {
        console.log("KeyboardShortcuts - Playhead 이동 다이얼로그 표시");

        // 기존 다이얼로그가 있으면 제거
        const existingDialog = document.querySelector('.playhead-move-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // 현재 시간 정보 가져오기
        const currentTime = this.motionTimeline.currentTime || 0;
        const totalSeconds = this.motionTimeline.options?.totalSeconds || 180;
        const currentFrame = Math.round(currentTime * (this.motionTimeline.options?.framesPerSecond || 30));

        const dialogContainer = document.createElement('div');
        dialogContainer.className = 'playhead-move-dialog';
        dialogContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 20px;
            z-index: 1000;
            min-width: 350px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            color: #fff;
        `;

        dialogContainer.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 15px 0; color: #fff; border-bottom: 1px solid #444; padding-bottom: 10px;">
                    🎯 Playhead 위치 이동
                </h3>
                <div style="margin-bottom: 15px; color: #888; font-size: 12px;">
                    원하는 시간으로 Playhead를 이동할 수 있습니다.
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; color: #ccc;">시간 (초):</label>
                        <input type="number" id="playhead-time-input" min="0" max="${totalSeconds}" step="0.1" value="${currentTime.toFixed(1)}" 
                               style="width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px;">
                        <span style="color: #888; font-size: 11px;">0초 ~ ${totalSeconds}초 (${Math.floor(totalSeconds / 60)}분)</span>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; margin-bottom: 5px; color: #ccc;">프레임:</label>
                        <input type="number" id="playhead-frame-input" min="0" max="${Math.round(totalSeconds * (this.motionTimeline.options?.framesPerSecond || 30))}" value="${currentFrame}" 
                               style="width: 100%; padding: 8px; background: #333; border: 1px solid #555; color: #fff; border-radius: 4px;">
                        <span style="color: #888; font-size: 11px;">0 ~ ${Math.round(totalSeconds * (this.motionTimeline.options?.framesPerSecond || 30))} 프레임</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px; padding: 10px; background: #333; border-radius: 4px;">
                    <span style="color: #ccc; font-size: 12px;">현재 위치: <span style="color: #4CAF50; font-weight: bold;">${this.formatTime(currentTime)}</span> (프레임 ${currentFrame})</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="playhead-move-cancel" style="padding: 8px 16px; background: #555; border: none; color: #fff; border-radius: 4px; cursor: pointer;">취소</button>
                <button id="playhead-move-apply" style="padding: 8px 16px; background: #007acc; border: none; color: #fff; border-radius: 4px; cursor: pointer;">이동</button>
            </div>
        `;

        document.body.appendChild(dialogContainer);

        // 입력 필드 참조
        const timeInput = dialogContainer.querySelector('#playhead-time-input');
        const frameInput = dialogContainer.querySelector('#playhead-frame-input');
        const fps = this.motionTimeline.options?.framesPerSecond || 30;

        // 시간 입력 시 프레임 자동 업데이트
        timeInput.addEventListener('input', () => {
            const time = parseFloat(timeInput.value) || 0;
            const frame = Math.round(time * fps);
            frameInput.value = frame;
        });

        // 프레임 입력 시 시간 자동 업데이트
        frameInput.addEventListener('input', () => {
            const frame = parseInt(frameInput.value) || 0;
            const time = frame / fps;
            timeInput.value = time.toFixed(1);
        });

        // 이동 버튼 이벤트
        const applyBtn = dialogContainer.querySelector('#playhead-move-apply');
        applyBtn.addEventListener('click', () => {
            const time = parseFloat(timeInput.value) || 0;
            const clampedTime = Math.max(0, Math.min(totalSeconds, time));

            console.log(`Playhead를 ${clampedTime}초로 이동`);

            // Playhead 이동 - 메인 Timeline 인스턴스 사용
            const mainTimeline = this.motionTimeline.editor?.timeline;
            if (mainTimeline && mainTimeline.setCurrentFrame) {
                mainTimeline.setCurrentFrame(Math.round(clampedTime * fps), true);
            } else {
                // 대안: MotionTimeline의 직접적인 방법 사용
                const frame = Math.round(clampedTime * fps);
                this.motionTimeline.setCurrentFrame?.(frame, true);
                this.motionTimeline.updatePlayheadPosition?.(clampedTime / totalSeconds * 100);
            }

            // 속성패널 닫기
            const propertyPanel = document.querySelector('.property-panel');
            if (propertyPanel) {
                propertyPanel.style.display = 'none';
            }

            // 다이얼로그 닫기
            dialogContainer.remove();

            // 성공 메시지 표시
            this.showSuccess(`Playhead가 ${this.formatTime(clampedTime)}로 이동되었습니다.`);
        });

        // 취소 버튼 이벤트
        const cancelBtn = dialogContainer.querySelector('#playhead-move-cancel');
        cancelBtn.addEventListener('click', () => {
            dialogContainer.remove();
        });

        // ESC 키로 닫기
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                dialogContainer.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 외부 클릭으로 닫기
        const closeOnOutsideClick = (e) => {
            if (!dialogContainer.contains(e.target)) {
                dialogContainer.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        document.addEventListener('click', closeOnOutsideClick);

        // Enter 키로 이동
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                const time = parseFloat(timeInput.value) || 0;
                const clampedTime = Math.max(0, Math.min(totalSeconds, time));

                // Playhead 이동 - 메인 Timeline 인스턴스 사용
                const mainTimeline = this.motionTimeline.editor?.timeline;
                if (mainTimeline && mainTimeline.setCurrentFrame) {
                    mainTimeline.setCurrentFrame(Math.round(clampedTime * fps), true);
                } else {
                    // 대안: MotionTimeline의 직접적인 방법 사용
                    const frame = Math.round(clampedTime * fps);
                    this.motionTimeline.setCurrentFrame?.(frame, true);
                    this.motionTimeline.updatePlayheadPosition?.(clampedTime / totalSeconds * 100);
                }

                // 속성패널 닫기
                const propertyPanel = document.querySelector('.property-panel');
                if (propertyPanel) {
                    propertyPanel.style.display = 'none';
                }

                dialogContainer.remove();
                this.showSuccess(`Playhead가 ${this.formatTime(clampedTime)}로 이동되었습니다.`);

                document.removeEventListener('keydown', handleEnter);
            }
        };
        document.addEventListener('keydown', handleEnter);

        // 포커스를 시간 입력 필드에 설정
        timeInput.focus();
        timeInput.select();
    }

    // 시간 포맷팅 헬퍼 메서드
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 100);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    // 도움말 표시
    showHelp() {
        // 기존 도움말이 있으면 제거
        const existingHelp = document.querySelector('.keyboard-shortcuts-help');
        if (existingHelp) {
            existingHelp.remove();
        }

        const help = document.createElement('div');
        help.className = 'keyboard-shortcuts-help';
        help.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 400px;
            min-width: 300px;
        `;

        const shortcutsList = Object.entries(this.shortcuts)
            .map(([key, shortcut]) => `<div style="margin-bottom: 8px;"><strong>${this.getKeyDisplayName(key)}</strong> - ${shortcut.description}</div>`)
            .join('');

        help.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                🎬 타임라인 단축키
            </h3>
            <div style="line-height: 1.6;">
                ${shortcutsList}
            </div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ccc; font-size: 12px; color: #666;">
                💡 <strong>K 키 사용법:</strong><br>
                1. 애니메이션할 객체를 선택<br>
                2. 원하는 시간으로 playhead 이동<br>
                3. K 키를 눌러 키프레임 추가<br><br>
                                 💡 <strong>히스토리 단축키:</strong><br>
                 • Ctrl+Z: 모든 작업 되돌리기 (통합)<br>
                 • Ctrl+Y: 되돌린 작업 다시하기 (통합)<br>
                 • Ctrl+Shift+Z: 에디터 작업 되돌리기
            </div>
            <button onclick="this.parentElement.remove()" style="
                position: absolute;
                top: 10px;
                right: 10px;
                background: #ff6b6b;
                color: white;
                border: none;
                border-radius: 50%;
                width: 25px;
                height: 25px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
            ">×</button>
        `;

        document.body.appendChild(help);

        // ESC 키나 클릭으로 닫기
        const closeHelp = (e) => {
            if (e.code === "Escape" || e.target === help) {
                help.remove();
                document.removeEventListener("keydown", closeHelp);
                document.removeEventListener("click", closeHelp);
            }
        };

        document.addEventListener("keydown", closeHelp);
        document.addEventListener("click", closeHelp);
    }

    // 키 표시 이름 변환
    getKeyDisplayName(keyCode) {
        const keyNames = {
            'Space': 'Space',
            'KeyK': 'K',
            'KeyD': 'D',
            'KeyM': 'M',
            'KeyZ': 'Ctrl+Z',
            'KeyY': 'Ctrl+Y',
            'Escape': 'ESC',
            'F1': 'F1'
        };
        return keyNames[keyCode] || keyCode;
    }

    // 성공 메시지 표시
    showSuccess(message) {
        this.showNotification(message, '#4CAF50');
    }

    // 경고 메시지 표시
    showWarning(message) {
        this.showNotification(message, '#ff9800');
    }

    // 알림 표시
    showNotification(message, color) {
        // 기존 알림이 있으면 제거
        const existingNotification = document.querySelector('.keyboard-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'keyboard-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${color};
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            animation: fadeInOut 1s ease-in-out;
        `;

        notification.textContent = message;

        // CSS 애니메이션 추가
        if (!document.querySelector('#keyboard-notification-style')) {
            const style = document.createElement('style');
            style.id = 'keyboard-notification-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // 0.8초 후 자동 제거 (더 빠르게 사라지도록)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 800);
    }

    // 단축키 활성화/비활성화
    enable() {
        this.isEnabled = true;
        console.log('키보드 단축키 활성화');
    }

    disable() {
        this.isEnabled = false;
        console.log('키보드 단축키 비활성화');
    }

    // 단축키 추가
    addShortcut(keyCode, shortcut) {
        this.shortcuts[keyCode] = shortcut;
        console.log(`단축키 추가: ${keyCode}`);
    }

    // 단축키 제거
    removeShortcut(keyCode) {
        delete this.shortcuts[keyCode];
        console.log(`단축키 제거: ${keyCode}`);
    }

    // 현재 단축키 목록 반환
    getShortcuts() {
        return this.shortcuts;
    }
} 