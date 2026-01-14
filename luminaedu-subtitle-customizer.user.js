// ==UserScript==
// @name          LuminaEdu Video Subtitle Customizer
// @name:zh-CN    LuminaEdu 视频字幕自定义工具
// @namespace     https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @version       4.0.0
// @description   Customize LuminaEdu video subtitle styles (font size, color, background, etc.)
// @description:zh-CN 自定义LuminaEdu视频字幕的字体大小、颜色、背景等样式
// @author        sangyuxiaowu
// @match         https://www.luminaedu.com/*
// @icon          https://www.luminaedu.com/lib/images/favicon.ico
// @icon64        https://www.luminaedu.com/lib/images/favicon.ico
// @homepage      https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @homepageURL   https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @supportURL    https://github.com/sangyuxiaowu/luminaedu-video-subtitle/issues
// @updateURL     https://raw.githubusercontent.com/sangyuxiaowu/luminaedu-video-subtitle/main/luminaedu-video-subtitle.user.js
// @downloadURL   https://raw.githubusercontent.com/sangyuxiaowu/luminaedu-video-subtitle/main/luminaedu-video-subtitle.user.js
// @grant         GM_addStyle
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @license       MIT
// @copyright     2024, sangyuxiaowu
// @run-at        document-end
// @noframes
// ==/UserScript==


(function() {
    'use strict';

    // 默认设置
    const defaultSettings = {
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: 'rgba(8, 8, 8, 0.75)',
        fontFamily: '"YouTube Noto", Roboto, "Arial Unicode Ms", Arial, Helvetica, Verdana, "PT Sans Caption", sans-serif',
        borderRadius: '2.85556px',
        bottom: '50px',
        enabled: true
    };

    // 全局变量
    let settings = { ...defaultSettings };
    let controlPanel = null;
    let settingsButton = null;
    let observer = null;
    let panelInitialized = false;
    let isFirstVisit = true;
    let panelShownForFirstVisit = false;
    let scriptInitialized = false;
    let lastProcessedUrl = '';

    // 检查是否是课程页面
    function isCoursePage() {
        return window.location.pathname.includes('/course');
    }

    // 检查是否有视频相关元素
    function hasVideoElements() {
        return document.querySelector('.video-place') ||
               document.querySelector('.module_tabs') ||
               document.querySelector('.addText');
    }

    // 初始化
    function init() {
        if (scriptInitialized) return;

        loadSettings();

        // 检查是否是第一次使用
        const firstUse = GM_getValue('firstUse', true);
        if (firstUse) {
            isFirstVisit = true;
            GM_setValue('firstUse', false);
        } else {
            isFirstVisit = false;
        }

        // 记录当前URL
        lastProcessedUrl = window.location.href;

        // 如果是课程页面，初始化功能
        if (isCoursePage()) {
            initCoursePage();
        }

        // 设置SPA监听
        setupSPAListener();

        scriptInitialized = true;
    }

    // 初始化课程页面功能
    function initCoursePage() {
        console.log('初始化课程页面功能');

        // 设置控制面板
        setupControlPanel();

        // 尝试设置按钮
        trySetupButton();

        // 设置观察器
        setupObservers();

        // 应用样式
        applyStyles();

        // 首次访问时显示面板
        if (isFirstVisit && !panelShownForFirstVisit) {
            setTimeout(() => {
                showControlPanel(true);
                panelShownForFirstVisit = true;
            }, 2000);
        }
    }

    // 尝试设置按钮（带重试机制）
    function trySetupButton(retryCount = 0) {
        if (retryCount > 10) {
            console.log('设置按钮失败，已达到最大重试次数');
            return;
        }

        if (!isCoursePage()) return;

        if (setupButton()) {
            console.log('按钮设置成功');
        } else {
            // 如果按钮设置失败，等待一段时间后重试
            setTimeout(() => {
                trySetupButton(retryCount + 1);
            }, 500);
        }
    }

    // 加载设置
    function loadSettings() {
        const saved = GM_getValue('subtitleSettings');
        if (saved) {
            settings = { ...defaultSettings, ...saved };
        }
    }

    // 保存设置
    function saveSettings() {
        GM_setValue('subtitleSettings', settings);
    }

    // 应用字幕样式
    function applyStyles() {
        if (!settings.enabled) return;

        // 移除旧的样式
        const oldStyle = document.getElementById('custom-subtitle-style');
        if (oldStyle) oldStyle.remove();

        // 创建新样式
        const style = document.createElement('style');
        style.id = 'custom-subtitle-style';
        style.textContent = `
            .addText .addTextStyle {
                font-size: ${settings.fontSize} !important;
                color: ${settings.color} !important;
                background: ${settings.backgroundColor} !important;
                font-family: ${settings.fontFamily} !important;
                border-radius: ${settings.borderRadius} !important;
            }
            .addText {
                bottom: ${settings.bottom} !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 设置控制面板
    function setupControlPanel() {
        if (controlPanel || panelInitialized) return;

        // 创建面板
        const panel = document.createElement('div');
        panel.id = 'subtitle-control-panel';
        panel.style.cssText = `
            display: none;
            position: fixed;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 1000000;
            width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            border: 1px solid #444;
            backdrop-filter: blur(10px);
        `;

        // 面板内容
        panel.innerHTML = `
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600;">字幕设置</h3>
                <div>
                    <span id="drag-handle" style="cursor: move; padding: 5px; margin-right: 10px;">≡</span>
                    <span id="close-panel" style="cursor: pointer; font-size: 18px;">×</span>
                </div>
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="enable-toggle" style="margin-right: 8px;">
                    <span>启用自定义字幕样式</span>
                </label>
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">
                    字体大小
                    <span id="font-size-value" style="float: right;">${parseInt(settings.fontSize)}</span>
                </label>
                <input type="range" id="font-size-slider" min="12" max="40" value="${parseInt(settings.fontSize)}" style="width: 100%;">
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">字体颜色</label>
                <input type="color" id="font-color-picker" value="${settings.color}" style="width: 100%; height: 30px;">
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">背景颜色</label>
                <input type="color" id="bg-color-picker" value="${settings.backgroundColor.split(')')[0] + ')'}" style="width: 100%; height: 30px;">
                <div style="margin-top: 5px; display: flex; align-items: center;">
                    <span style="font-size: 12px; margin-right: 10px;">透明度:</span>
                    <input type="range" id="bg-opacity-slider" min="0" max="1" step="0.05" value="0.75" style="width: 100%;">
                    <span id="opacity-value" style="margin-left: 10px; font-size: 12px; width: 30px;">75%</span>
                </div>
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">
                    距离底部
                    <span id="bottom-value" style="float: right;">${parseInt(settings.bottom)}px</span>
                </label>
                <input type="range" id="bottom-slider" min="10" max="150" value="${parseInt(settings.bottom)}" style="width: 100%;">
            </div>

            <div class="control-group" style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">
                    圆角大小
                    <span id="radius-value" style="float: right;">${parseFloat(settings.borderRadius)}px</span>
                </label>
                <input type="range" id="radius-slider" min="0" max="20" step="0.5" value="${parseFloat(settings.borderRadius)}" style="width: 100%;">
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="reset-btn" style="flex: 1; padding: 8px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer;">重置</button>
                <button id="apply-btn" style="flex: 1; padding: 8px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">应用</button>
            </div>
        `;

        document.body.appendChild(panel);
        controlPanel = panel;
        panelInitialized = true;

        // 设置事件监听
        setupPanelEvents();
    }

    // 设置面板事件
    function setupPanelEvents() {
        if (!controlPanel) return;

        // 启用/禁用切换
        const enableToggle = controlPanel.querySelector('#enable-toggle');
        enableToggle.checked = settings.enabled;
        enableToggle.addEventListener('change', (e) => {
            settings.enabled = e.target.checked;
            saveSettings();
            applyStyles();
        });

        // 字体大小
        const fontSizeSlider = controlPanel.querySelector('#font-size-slider');
        const fontSizeValue = controlPanel.querySelector('#font-size-value');
        fontSizeSlider.addEventListener('input', (e) => {
            fontSizeValue.textContent = e.target.value;
        });
        fontSizeSlider.addEventListener('change', (e) => {
            settings.fontSize = e.target.value + 'px';
            saveSettings();
            applyStyles();
        });

        // 字体颜色
        const fontColorPicker = controlPanel.querySelector('#font-color-picker');
        fontColorPicker.addEventListener('change', (e) => {
            settings.color = e.target.value;
            saveSettings();
            applyStyles();
        });

        // 背景颜色和透明度
        const bgColorPicker = controlPanel.querySelector('#bg-color-picker');
        const bgOpacitySlider = controlPanel.querySelector('#bg-opacity-slider');
        const opacityValue = controlPanel.querySelector('#opacity-value');

        // 解析当前背景色
        const bgColorMatch = settings.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (bgColorMatch) {
            const [_, r, g, b, a = 0.75] = bgColorMatch;
            bgColorPicker.value = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
            bgOpacitySlider.value = a;
            opacityValue.textContent = Math.round(a * 100) + '%';
        }

        bgOpacitySlider.addEventListener('input', (e) => {
            opacityValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        function updateBackgroundColor() {
            const hex = bgColorPicker.value;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            const a = parseFloat(bgOpacitySlider.value);

            settings.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
            saveSettings();
            applyStyles();
        }

        bgColorPicker.addEventListener('change', updateBackgroundColor);
        bgOpacitySlider.addEventListener('change', updateBackgroundColor);

        // 距离底部
        const bottomSlider = controlPanel.querySelector('#bottom-slider');
        const bottomValue = controlPanel.querySelector('#bottom-value');
        bottomSlider.addEventListener('input', (e) => {
            bottomValue.textContent = e.target.value + 'px';
        });
        bottomSlider.addEventListener('change', (e) => {
            settings.bottom = e.target.value + 'px';
            saveSettings();
            applyStyles();
        });

        // 圆角大小
        const radiusSlider = controlPanel.querySelector('#radius-slider');
        const radiusValue = controlPanel.querySelector('#radius-value');
        radiusSlider.addEventListener('input', (e) => {
            radiusValue.textContent = e.target.value + 'px';
        });
        radiusSlider.addEventListener('change', (e) => {
            settings.borderRadius = e.target.value + 'px';
            saveSettings();
            applyStyles();
        });

        // 重置按钮
        controlPanel.querySelector('#reset-btn').addEventListener('click', () => {
            settings = { ...defaultSettings };
            saveSettings();
            applyStyles();

            // 更新UI
            enableToggle.checked = true;
            fontSizeSlider.value = 22;
            fontSizeValue.textContent = '22';
            fontColorPicker.value = '#ffffff';
            bgColorPicker.value = '#080808';
            bgOpacitySlider.value = 0.75;
            opacityValue.textContent = '75%';
            bottomSlider.value = 50;
            bottomValue.textContent = '50px';
            radiusSlider.value = 2.85556;
            radiusValue.textContent = '2.86px';
        });

        // 应用按钮
        controlPanel.querySelector('#apply-btn').addEventListener('click', () => {
            applyStyles();
        });

        // 拖拽功能
        const dragHandle = controlPanel.querySelector('#drag-handle');
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = controlPanel.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onDragEnd);
            e.preventDefault();
        });

        function onDrag(e) {
            if (!isDragging) return;
            controlPanel.style.left = (e.clientX - dragOffset.x) + 'px';
            controlPanel.style.top = (e.clientY - dragOffset.y) + 'px';
            controlPanel.style.right = 'auto';
        }

        function onDragEnd() {
            isDragging = false;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', onDragEnd);
        }

        // 关闭按钮
        controlPanel.querySelector('#close-panel').addEventListener('click', () => {
            controlPanel.style.display = 'none';
        });
    }

    // 显示/隐藏控制面板
    function showControlPanel(show) {
        if (!controlPanel) setupControlPanel();
        if (controlPanel) {
            controlPanel.style.display = show ? 'block' : 'none';

            if (show) {
                // 定位在视频中间
                const videoPlace = document.querySelector('.video-place');
                if (videoPlace) {
                    const rect = videoPlace.getBoundingClientRect();
                    const panelWidth = 300;
                    const panelHeight = 400;

                    controlPanel.style.left = (rect.left + (rect.width - panelWidth) / 2) + 'px';
                    controlPanel.style.top = (rect.top + (rect.height - panelHeight) / 2) + 'px';
                    controlPanel.style.right = 'auto';
                } else {
                    // 默认位置
                    controlPanel.style.left = '50%';
                    controlPanel.style.top = '50%';
                    controlPanel.style.transform = 'translate(-50%, -50%)';
                }
            }
        }
    }

    // 设置字幕设置按钮
    function setupButton() {
        // 如果不是课程页面，直接返回
        if (!isCoursePage()) return false;

        // 移除现有的按钮
        if (settingsButton && settingsButton.parentNode) {
            settingsButton.parentNode.removeChild(settingsButton);
            settingsButton = null;
        }

        // 查找下载按钮
        const downloadButton = document.querySelector('.module_tabs .el-button.float_right.el-button--primary.el-button--small');
        if (!downloadButton) {
            console.log('未找到下载按钮');
            return false;
        }

        // 检查是否已有设置按钮
        const existingSettingsBtn = downloadButton.previousElementSibling;
        if (existingSettingsBtn && existingSettingsBtn.classList &&
            existingSettingsBtn.classList.contains('subtitle-settings-btn')) {
            settingsButton = existingSettingsBtn;
            return true;
        }

        // 创建设置按钮
        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'el-button float_right el-button--primary el-button--small subtitle-settings-btn';
        settingsBtn.style.cssText = 'margin-right: 10px !important;';
        settingsBtn.innerHTML = '<i class="el-icon-setting"></i><span>字幕设置</span>';

        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showControlPanel(true);
        });

        // 插入到下载按钮前
        downloadButton.parentNode.insertBefore(settingsBtn, downloadButton);
        settingsButton = settingsBtn;

        return true;
    }

    // 设置观察器
    function setupObservers() {
        // 清理旧的观察器
        if (observer) {
            observer.disconnect();
        }

        // 创建新的观察器
        observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            let shouldAddButton = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 检查是否添加了视频相关元素
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.classList && (
                                node.classList.contains('video-place') ||
                                node.classList.contains('addText') ||
                                node.querySelector('.video-place') ||
                                node.querySelector('.addText')
                            )) {
                                shouldUpdate = true;
                            }

                            // 检查是否添加了module_tabs或下载按钮
                            if (node.classList && (
                                node.classList.contains('module_tabs') ||
                                node.querySelector('.module_tabs') ||
                                (node.querySelector && node.querySelector('.el-button.float_right.el-button--primary.el-button--small'))
                            )) {
                                shouldAddButton = true;
                            }
                        }
                    }
                }

                // 检查属性变化（针对Vue动态更新）
                if (mutation.type === 'attributes') {
                    if (mutation.target.classList &&
                        (mutation.target.classList.contains('module_tabs') ||
                         mutation.target.classList.contains('el-button'))) {
                        shouldAddButton = true;
                    }
                }
            }

            if (shouldUpdate) {
                applyStyles();
            }

            if (shouldAddButton) {
                setupButton();
            }
        });

        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // 设置SPA路由监听
    function setupSPAListener() {
        // 监听history变化
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function() {
            originalPushState.apply(this, arguments);
            handleSPANavigation();
        };

        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            handleSPANavigation();
        };

        window.addEventListener('popstate', handleSPANavigation);

        // 定期检查页面变化
        setInterval(() => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastProcessedUrl) {
                lastProcessedUrl = currentUrl;
                handleSPANavigation();
            }
        }, 1000);
    }

    // 处理SPA导航
    function handleSPANavigation() {
        const currentUrl = window.location.href;
        const wasCoursePage = isCoursePage();

        // 如果URL变化了但页面类型没变（比如刷新或视频切换）
        if (isCoursePage()) {
            console.log('检测到课程页面导航');

            // 如果是刷新页面或切换视频，重新初始化
            if (wasCoursePage) {
                // 重新设置按钮（可能DOM已经更新）
                trySetupButton();
                applyStyles();
            } else {
                // 从非课程页面导航到课程页面
                initCoursePage();
            }
        } else {
            // 从课程页面导航到非课程页面
            if (wasCoursePage) {
                // 隐藏控制面板
                if (controlPanel) {
                    controlPanel.style.display = 'none';
                }

                // 停止观察器
                if (observer) {
                    observer.disconnect();
                }
            }
        }
    }

    // 添加全局样式
    GM_addStyle(`
        .subtitle-settings-btn {
            margin-right: 10px !important;
        }

        #subtitle-control-panel input[type="range"] {
            width: 100%;
            height: 6px;
            background: #333;
            border-radius: 3px;
            outline: none;
            -webkit-appearance: none;
        }

        #subtitle-control-panel input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            background: #0066cc;
            border-radius: 50%;
            cursor: pointer;
        }

        #subtitle-control-panel input[type="color"] {
            width: 100%;
            height: 32px;
            border: 1px solid #444;
            border-radius: 4px;
            background: #222;
            cursor: pointer;
        }

        #subtitle-control-panel button {
            padding: 8px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }

        #subtitle-control-panel button:hover {
            opacity: 0.9;
        }
    `);

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // 如果页面已经加载完成，立即初始化
        setTimeout(init, 0);
    }
})();