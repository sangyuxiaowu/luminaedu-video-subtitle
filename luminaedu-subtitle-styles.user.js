// ==UserScript==
// @name         LuminaEdu 视频字幕样式自定义
// @name:en      LuminaEdu Video Subtitle Styles Customization
// @namespace    https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @version      1.0.0
// @description  自定义 LuminaEdu 视频字幕的样式，包括字体大小、颜色、背景、位置等
// @description:en Customize LuminaEdu video subtitle styles including font size, color, background, position, etc.
// @author       桑榆肖物
// @license      MIT
// @homepage     https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @supportURL   https://github.com/sangyuxiaowu/luminaedu-video-subtitle/issues
// @match        *://*.luminaedu.com/*
// @match        *://luminaedu.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 默认配置
    const DEFAULT_CONFIG = {
        fontSize: '24px',
        fontColor: '#FFFFFF',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        position: 'bottom',
        bottomOffset: '50px',
        padding: '8px 16px',
        borderRadius: '4px',
        fontWeight: 'bold',
        lineHeight: '1.5',
        enabled: true
    };

    // 获取配置
    function getConfig() {
        const savedConfig = GM_getValue('subtitleConfig', {});
        return { ...DEFAULT_CONFIG, ...savedConfig };
    }

    // 保存配置
    function saveConfig(config) {
        GM_setValue('subtitleConfig', config);
    }

    // 应用字幕样式
    function applySubtitleStyles() {
        const config = getConfig();
        
        if (!config.enabled) {
            return;
        }

        // 创建或更新样式
        let styleElement = document.getElementById('luminaedu-subtitle-custom-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'luminaedu-subtitle-custom-styles';
            document.head.appendChild(styleElement);
        }

        // 常见的视频字幕选择器
        const subtitleSelectors = [
            '.video-subtitle',
            '.subtitle',
            '.caption',
            '.vjs-text-track-display',
            '.video-react .video-react-text-track-display',
            '.plyr__captions',
            '[class*="subtitle"]',
            '[class*="caption"]'
        ].join(', ');

        styleElement.textContent = `
            ${subtitleSelectors} {
                font-size: ${config.fontSize} !important;
                color: ${config.fontColor} !important;
                font-family: ${config.fontFamily} !important;
                background-color: ${config.backgroundColor} !important;
                text-shadow: ${config.textShadow} !important;
                padding: ${config.padding} !important;
                border-radius: ${config.borderRadius} !important;
                font-weight: ${config.fontWeight} !important;
                line-height: ${config.lineHeight} !important;
                ${config.position === 'bottom' ? `bottom: ${config.bottomOffset} !important;` : ''}
                ${config.position === 'top' ? `top: ${config.bottomOffset} !important;` : ''}
            }
            
            ${subtitleSelectors} span,
            ${subtitleSelectors} div,
            ${subtitleSelectors} p {
                font-size: inherit !important;
                color: inherit !important;
                font-family: inherit !important;
                text-shadow: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
            }
        `;
    }

    // 创建设置面板
    function createSettingsPanel() {
        const config = getConfig();

        // 移除已存在的面板
        const existingPanel = document.getElementById('luminaedu-subtitle-settings-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = 'luminaedu-subtitle-settings-panel';
        panel.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                        z-index: 10000; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; font-family: Arial, sans-serif;">
                <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
                    字幕样式设置
                </h2>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; margin-bottom: 10px;">
                        <input type="checkbox" id="subtitle-enabled" ${config.enabled ? 'checked' : ''} 
                               style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                        <span style="color: #333; font-weight: bold;">启用自定义样式</span>
                    </label>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">字体大小</label>
                    <input type="text" id="subtitle-font-size" value="${config.fontSize}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">例如: 24px, 1.5em, 120%</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">字体颜色</label>
                    <input type="text" id="subtitle-font-color" value="${config.fontColor}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">例如: #FFFFFF, white, rgb(255,255,255)</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">字体</label>
                    <input type="text" id="subtitle-font-family" value="${config.fontFamily}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">例如: Arial, Microsoft YaHei, sans-serif</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">背景颜色</label>
                    <input type="text" id="subtitle-background-color" value="${config.backgroundColor}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">例如: rgba(0,0,0,0.7), #000000</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">文字阴影</label>
                    <input type="text" id="subtitle-text-shadow" value="${config.textShadow}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">例如: 2px 2px 4px rgba(0,0,0,0.8)</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">位置</label>
                    <select id="subtitle-position" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="bottom" ${config.position === 'bottom' ? 'selected' : ''}>底部</option>
                        <option value="top" ${config.position === 'top' ? 'selected' : ''}>顶部</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">偏移距离</label>
                    <input type="text" id="subtitle-bottom-offset" value="${config.bottomOffset}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">距离顶部或底部的距离，例如: 50px</small>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">内边距</label>
                    <input type="text" id="subtitle-padding" value="${config.padding}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">例如: 8px 16px</small>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #555; font-weight: bold;">圆角</label>
                    <input type="text" id="subtitle-border-radius" value="${config.borderRadius}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    <small style="color: #777;">例如: 4px</small>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="subtitle-save-btn" 
                            style="padding: 10px 20px; background: #4CAF50; color: white; border: none; 
                                   border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">
                        保存
                    </button>
                    <button id="subtitle-reset-btn" 
                            style="padding: 10px 20px; background: #ff9800; color: white; border: none; 
                                   border-radius: 4px; cursor: pointer; font-size: 16px;">
                        恢复默认
                    </button>
                    <button id="subtitle-close-btn" 
                            style="padding: 10px 20px; background: #f44336; color: white; border: none; 
                                   border-radius: 4px; cursor: pointer; font-size: 16px;">
                        关闭
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 保存按钮
        document.getElementById('subtitle-save-btn').addEventListener('click', function() {
            const newConfig = {
                enabled: document.getElementById('subtitle-enabled').checked,
                fontSize: document.getElementById('subtitle-font-size').value,
                fontColor: document.getElementById('subtitle-font-color').value,
                fontFamily: document.getElementById('subtitle-font-family').value,
                backgroundColor: document.getElementById('subtitle-background-color').value,
                textShadow: document.getElementById('subtitle-text-shadow').value,
                position: document.getElementById('subtitle-position').value,
                bottomOffset: document.getElementById('subtitle-bottom-offset').value,
                padding: document.getElementById('subtitle-padding').value,
                borderRadius: document.getElementById('subtitle-border-radius').value,
                fontWeight: config.fontWeight,
                lineHeight: config.lineHeight
            };
            saveConfig(newConfig);
            applySubtitleStyles();
            alert('设置已保存！');
            panel.remove();
        });

        // 恢复默认按钮
        document.getElementById('subtitle-reset-btn').addEventListener('click', function() {
            if (confirm('确定要恢复默认设置吗？')) {
                saveConfig(DEFAULT_CONFIG);
                panel.remove();
                createSettingsPanel();
                applySubtitleStyles();
            }
        });

        // 关闭按钮
        document.getElementById('subtitle-close-btn').addEventListener('click', function() {
            panel.remove();
        });
    }

    // 注册菜单命令
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('字幕样式设置', createSettingsPanel);
    }

    // 初始化
    function init() {
        applySubtitleStyles();
        
        // 使用防抖来优化性能，避免频繁应用样式
        let debounceTimer = null;
        const observer = new MutationObserver(function(mutations) {
            // 检查是否有相关的字幕元素变化
            const hasRelevantChanges = mutations.some(mutation => {
                if (mutation.type === 'childList') {
                    const nodes = Array.from(mutation.addedNodes);
                    return nodes.some(node => {
                        if (node.nodeType === 1) { // Element node
                            return node.matches && (
                                node.matches('.video-subtitle, .subtitle, .caption, .vjs-text-track-display, [class*="subtitle"], [class*="caption"]') ||
                                node.querySelector('.video-subtitle, .subtitle, .caption, .vjs-text-track-display, [class*="subtitle"], [class*="caption"]')
                            );
                        }
                        return false;
                    });
                }
                return false;
            });
            
            if (hasRelevantChanges) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(applySubtitleStyles, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
