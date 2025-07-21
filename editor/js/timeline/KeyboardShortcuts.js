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
                preventDefault: true
            },
            'KeyK': {
                description: '현재 시간에 키프레임 추가',
                action: () => this.addKeyframe(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false
                }
            },
            'KeyD': {
                description: '선택된 키프레임 삭제',
                action: () => this.deleteSelectedKeyframe(),
                preventDefault: true,
                conditions: {
                    ctrlKey: false,
                    metaKey: false
                }
            },
            'Escape': {
                description: '정지',
                action: () => this.stop(),
                preventDefault: true
            },
            'F1': {
                description: '단축키 도움말 표시',
                action: () => this.showHelp(),
                preventDefault: true
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

        const shortcut = this.shortcuts[e.code];
        if (!shortcut) return;

        // 조건 확인
        if (shortcut.conditions) {
            for (const [key, value] of Object.entries(shortcut.conditions)) {
                if (e[key] !== value) return;
            }
        }

        // 기본 동작 방지
        if (shortcut.preventDefault) {
            e.preventDefault();
        }

        // 액션 실행
        try {
            shortcut.action();
        } catch (error) {
            console.error('단축키 실행 중 오류:', error);
        }
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
                3. K 키를 눌러 키프레임 추가
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

        // 1초 후 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 1000);
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