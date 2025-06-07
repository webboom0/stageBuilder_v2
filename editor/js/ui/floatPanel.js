function createPanel(title, contentDom) {
    const panel = document.createElement('div');
    panel.className = 'floating-panel';
    panel.style.position = 'relative';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.textContent = title;

    const undockBtn = document.createElement('button');
    undockBtn.textContent = '⧉'; // undock 아이콘
    undockBtn.style.float = 'right';
    header.appendChild(undockBtn);

    panel.appendChild(header);
    panel.appendChild(contentDom);

    // 플로팅 상태 관리
    let floating = null;
    let originalParent = null;
    let originalNext = null;

    // 토글 언독/도킹 기능
    undockBtn.onclick = () => {
        if (!floating) {
            // 언독
            originalParent = panel.parentElement;
            originalNext = panel.nextSibling;
            floating = createFloatingPanel(panel, title, () => {
                // 도킹 콜백
                if (originalNext) {
                    originalParent.insertBefore(panel, originalNext);
                } else {
                    originalParent.appendChild(panel);
                }
                floating.remove();
                floating = null;
                undockBtn.textContent = '⧉';
            });
            document.getElementById('floatingPanels').appendChild(floating);
            undockBtn.textContent = '▢';
        } else {
            // 도킹
            if (originalNext) {
                originalParent.insertBefore(panel, originalNext);
            } else {
                originalParent.appendChild(panel);
            }
            floating.remove();
            floating = null;
            undockBtn.textContent = '⧉';
        }
    };

    return panel;
}

function createFloatingPanel(panel, title, onDock) {
    // 플로팅 div 생성
    const floating = document.createElement('div');
    floating.className = 'floating-panel';
    floating.style.position = 'fixed';
    floating.style.top = '100px';
    floating.style.left = '100px';
    floating.style.width = '280px';
    floating.style.background = '#222';
    floating.style.zIndex = 9999;
    floating.style.border = '1px solid #888';
    floating.style.resize = 'both';
    floating.style.overflow = 'auto';

    // 헤더 + 닫기/도킹 버튼
    const header = document.createElement('div');
    header.className = 'floating-header';
    header.textContent = title;
    header.style.background = '#444';
    header.style.color = '#fff';
    header.style.padding = '5px';
    header.style.cursor = 'move';

    const dockBtn = document.createElement('button');
    dockBtn.textContent = '▢';
    dockBtn.style.float = 'right';
    header.appendChild(dockBtn);

    floating.appendChild(header);
    floating.appendChild(panel);

    // 도킹 기능
    dockBtn.onclick = () => {
        if (onDock) onDock();
    };

    // 드래그 이동
    let isDragging = false, offsetX = 0, offsetY = 0;
    header.onmousedown = function (e) {
        isDragging = true;
        offsetX = e.clientX - floating.offsetLeft;
        offsetY = e.clientY - floating.offsetTop;
        document.onmousemove = function (e) {
            if (isDragging) {
                floating.style.left = (e.clientX - offsetX) + 'px';
                floating.style.top = (e.clientY - offsetY) + 'px';
            }
        };
        document.onmouseup = function () {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
    return floating;
}

export { createPanel };