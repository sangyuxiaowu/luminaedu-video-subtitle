// ==UserScript==
// @name          LuminaEdu Video Subtitle Customizer
// @name:zh-CN    LuminaEdu 视频字幕自定义工具
// @namespace     https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @version       4.2.0
// @description   Customize LuminaEdu video subtitle styles (font size, color, background, etc.)
// @description:zh-CN 自定义LuminaEdu视频字幕的字体大小、颜色、背景等样式
// @author        sangyuxiaowu
// @match         https://www.luminaedu.com/*
// @icon          https://www.luminaedu.com/lib/images/favicon.ico
// @icon64        https://www.luminaedu.com/lib/images/favicon.ico
// @homepage      https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @homepageURL   https://github.com/sangyuxiaowu/luminaedu-video-subtitle
// @supportURL    https://github.com/sangyuxiaowu/luminaedu-video-subtitle/issues
// @updateURL     https://raw.githubusercontent.com/sangyuxiaowu/luminaedu-video-subtitle/main/luminaedu-subtitle-customizer.user.js
// @downloadURL   https://raw.githubusercontent.com/sangyuxiaowu/luminaedu-video-subtitle/main/luminaedu-subtitle-customizer.user.js
// @grant         GM_addStyle
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @license       MIT
// @copyright     2026, sangyuxiaowu
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
        bottom: '50px',
        enabled: true
    };

    const defaultTtsSettings = {
        enabled: false,
        voice: '',
        rate: 1,
        volume: 1
    };

    // 全局变量
    let settings = { ...defaultSettings };
    let controlPanel = null;
    let ttsControlPanel = null;
    let settingsButton = null;
    let ttsSettingsButton = null;
    let observer = null;
    let panelInitialized = false;
    let ttsPanelInitialized = false;
    let isFirstVisit = true;
    let panelShownForFirstVisit = false;
    let scriptInitialized = false;
    let lastProcessedUrl = '';
    let lastIsCoursePage = false;
    let ttsSettings = { ...defaultTtsSettings };
    let ttsToggleButton = null;
    let ttsVoiceSelect = null;
    let ttsVoices = [];
    let ttsCues = [];
    let ttsCurrentCueIndex = -1;
    let ttsBoundVideo = null;
    let ttsOriginalMuted = null;
    let ttsSyncScheduled = false;
    let ttsPreparing = false;
    let ttsSessionId = 0;
    let ttsCurrentUtteranceToken = 0;
    let ttsSpeechActive = false;
    let ttsPausedVideoForSpeech = false;

    const BUTTON_CONTAINER_ID = 'subtitle-settings-button-container';
    const DEFAULT_SPEECH_RATE = 1;

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
        loadTtsSettings();
        cleanupStyles();
        setupSpeechSynthesis();

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
        lastIsCoursePage = isCoursePage();

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

    function loadTtsSettings() {
        const saved = GM_getValue('subtitleTtsSettings');
        if (saved) {
            ttsSettings = { ...defaultTtsSettings, ...saved };
        }
    }

    function cleanupStyles() {
        const oldStyle = document.getElementById('custom-subtitle-style');
        if (oldStyle) {
            oldStyle.remove();
        }
    }

    function parseBackgroundColor(color) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);

        if (!match) {
            return {
                hex: '#080808',
                opacity: 0.75
            };
        }

        const [, r, g, b, alpha = '1'] = match;

        return {
            hex: `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`,
            opacity: Number.parseFloat(alpha)
        };
    }

    function getButtonAnchor() {
        return document.querySelector('.video-place_div, #video-place_div') ||
               document.querySelector('.video-place');
    }

    function getButtonContainer() {
        let container = document.getElementById(BUTTON_CONTAINER_ID);

        if (!container) {
            container = document.createElement('div');
            container.id = BUTTON_CONTAINER_ID;
            container.className = 'subtitle-settings-button-container';
        }

        return container;
    }

    function parseTimestamp(timeText) {
        const normalized = timeText.trim().replace(',', '.');
        const parts = normalized.split(':').map((part) => Number.parseFloat(part));

        if (parts.some((part) => Number.isNaN(part))) {
            return 0;
        }

        while (parts.length < 3) {
            parts.unshift(0);
        }

        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    }

    function parseSubtitleContent(content) {
        if (!content) {
            return [];
        }

        return content
            .replace(/\r/g, '')
            .split(/\n\s*\n/)
            .map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean))
            .map((lines) => {
                if (lines.length < 2) {
                    return null;
                }

                const timelineIndex = lines.findIndex((line) => line.includes('-->'));
                if (timelineIndex === -1) {
                    return null;
                }

                const timeParts = lines[timelineIndex].split('-->').map((part) => part.trim());
                if (timeParts.length !== 2) {
                    return null;
                }

                const text = lines.slice(timelineIndex + 1).join(' ').trim();
                if (!text) {
                    return null;
                }

                const start = parseTimestamp(timeParts[0]);
                const end = parseTimestamp(timeParts[1]);

                if (end <= start) {
                    return null;
                }

                return {
                    start,
                    end,
                    duration: end - start,
                    text
                };
            })
            .filter(Boolean);
    }

    async function ensureChineseSubtitleSelected() {
        const input = getSubtitleLanguageInput();
        if (!input) {
            return true;
        }

        if (isChineseSubtitleLabel(input.value)) {
            return true;
        }

        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        input.click();
        await delay(200);

        const options = Array.from(document.querySelectorAll('.el-select-dropdown__item, [role="option"], .el-scrollbar__view li'));
        const chineseOption = options.find((option) => {
            const text = option.textContent || '';
            const visible = option.offsetParent !== null;
            return visible && isChineseSubtitleLabel(text);
        });

        if (chineseOption) {
            chineseOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            chineseOption.click();
            await waitFor(() => isChineseSubtitleLabel(getSubtitleLanguageInput()?.value || ''), 2500, 120);
            return isChineseSubtitleLabel(getSubtitleLanguageInput()?.value || '');
        }

        return false;
    }

    // 保存设置
    function saveSettings() {
        GM_setValue('subtitleSettings', settings);
    }

    function saveTtsSettings() {
        GM_setValue('subtitleTtsSettings', ttsSettings);
    }

    function delay(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    function waitFor(condition, timeout = 2000, interval = 100) {
        return new Promise((resolve) => {
            const startedAt = Date.now();
            const timer = setInterval(() => {
                if (condition()) {
                    clearInterval(timer);
                    resolve(true);
                    return;
                }

                if (Date.now() - startedAt >= timeout) {
                    clearInterval(timer);
                    resolve(false);
                }
            }, interval);
        });
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function isChineseSubtitleLabel(text) {
        return /中文|汉语|华语|chinese|mandarin|简体|繁体/i.test(text || '');
    }

    function getSubtitleLanguageInput() {
        return document.querySelector('#pane-subtitle input');
    }

    function getSubtitleTextarea() {
        return document.querySelector('#pane-subtitle textarea');
    }

    function getVideoElement() {
        return document.querySelector('video');
    }

    function getPlayerControlButton() {
        return document.querySelector('.vjs-play-control.vjs-control.vjs-button');
    }

    function isPlayerPlaying() {
        const controlButton = getPlayerControlButton();
        if (controlButton) {
            return controlButton.classList.contains('vjs-playing');
        }

        const video = getVideoElement();
        return !!video && !video.paused;
    }

    function clickPlayerControlIfNeeded(shouldPlay) {
        const controlButton = getPlayerControlButton();
        if (!controlButton) {
            return false;
        }

        const isPlaying = controlButton.classList.contains('vjs-playing');
        const isPaused = controlButton.classList.contains('vjs-paused');

        if ((shouldPlay && isPaused) || (!shouldPlay && isPlaying)) {
            controlButton.click();
            return true;
        }

        return false;
    }

    function pauseVideoPlayback() {
        const clicked = clickPlayerControlIfNeeded(false);
        const video = getVideoElement();

        if (!clicked && video && !video.paused) {
            video.pause();
        }
    }

    function resumeVideoPlayback() {
        const clicked = clickPlayerControlIfNeeded(true);
        const video = getVideoElement();

        if (!clicked && video && video.paused) {
            video.play().catch(() => {});
        }
    }

    function getSpeechSynthesisEngine() {
        return window.speechSynthesis || null;
    }

    function getVoiceId(voice) {
        return voice ? (voice.voiceURI || voice.name) : '';
    }

    function getAvailableChineseVoices() {
        const synth = getSpeechSynthesisEngine();
        if (!synth) {
            return [];
        }

        return synth.getVoices().filter((voice) => /^zh(?:-|_)/i.test(voice.lang || ''));
    }

    function getSelectedTtsVoice() {
        if (!ttsVoices.length) {
            return null;
        }

        return ttsVoices.find((voice) => getVoiceId(voice) === ttsSettings.voice) || ttsVoices[0] || null;
    }

    function populateTtsVoiceSelect() {
        ttsVoices = getAvailableChineseVoices();

        if (!ttsVoiceSelect) {
            return;
        }

        const previousValue = ttsSettings.voice;
        ttsVoiceSelect.innerHTML = '';

        if (!ttsVoices.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '无可用中文语音';
            ttsVoiceSelect.appendChild(option);
            ttsVoiceSelect.disabled = true;
            updateTtsButtonState();
            return;
        }

        ttsVoices.forEach((voice) => {
            const option = document.createElement('option');
            option.value = getVoiceId(voice);
            option.textContent = `${voice.name} (${voice.lang})`;
            ttsVoiceSelect.appendChild(option);
        });

        const preferredVoice = ttsVoices.find((voice) => getVoiceId(voice) === previousValue) ||
            ttsVoices.find((voice) => /^zh-CN/i.test(voice.lang || '')) ||
            ttsVoices[0];

        ttsSettings.voice = getVoiceId(preferredVoice);
        ttsVoiceSelect.value = ttsSettings.voice;
        ttsVoiceSelect.disabled = false;

        if (ttsSettings.voice !== previousValue) {
            saveTtsSettings();
        }

        updateTtsButtonState();
    }

    function setupSpeechSynthesis() {
        const synth = getSpeechSynthesisEngine();
        if (!synth) {
            return;
        }

        const refreshVoices = () => {
            populateTtsVoiceSelect();
        };

        refreshVoices();
        setTimeout(refreshVoices, 0);
        setTimeout(refreshVoices, 500);

        if (typeof synth.addEventListener === 'function') {
            synth.addEventListener('voiceschanged', refreshVoices);
        } else {
            synth.onvoiceschanged = refreshVoices;
        }
    }

    // 应用字幕样式
    function applyStyles() {
        cleanupStyles();
        if (!settings.enabled) return;

        // 创建新样式
        const style = document.createElement('style');
        style.id = 'custom-subtitle-style';
        style.textContent = `
            .addText .addTextStyle {
                font-size: ${settings.fontSize} !important;
                color: ${settings.color} !important;
                background: ${settings.backgroundColor} !important;
                font-family: ${settings.fontFamily} !important;
            }
            .addText {
                bottom: ${settings.bottom} !important;
            }
        `;
        document.head.appendChild(style);
    }

    function updateTtsButtonState() {
        if (!ttsToggleButton) {
            return;
        }

        const buttonText = ttsPreparing ? '中文配音加载中' : (ttsSettings.enabled ? '中文配音已开' : '中文配音已关');
        const hasVoices = ttsVoices.length > 0;
        ttsToggleButton.classList.toggle('is-active', ttsSettings.enabled);
        ttsToggleButton.classList.toggle('is-loading', ttsPreparing);
        ttsToggleButton.querySelector('span').textContent = buttonText;
        ttsToggleButton.disabled = ttsPreparing || !hasVoices;

        if (ttsVoiceSelect) {
            ttsVoiceSelect.disabled = ttsPreparing || !hasVoices;
        }
    }

    function findCueIndex(time) {
        return ttsCues.findIndex((cue) => time >= cue.start && time < cue.end);
    }

    function getCueWindowEnd(cueIndex) {
        const nextCue = ttsCues[cueIndex + 1];
        return nextCue ? nextCue.start : ttsCues[cueIndex].end;
    }

    function getConfiguredSpeechRate() {
        return clamp(Number(ttsSettings.rate) || DEFAULT_SPEECH_RATE, 0.5, 2);
    }

    function getConfiguredSpeechVolume() {
        return clamp(Number(ttsSettings.volume), 0, 1);
    }

    async function refreshTtsCues() {
        const switched = await ensureChineseSubtitleSelected();
        if (!switched) {
            console.warn('未能切换到中文字幕，继续尝试读取现有字幕');
        }

        const subtitleTextarea = getSubtitleTextarea();
        const subtitleContent = subtitleTextarea ? subtitleTextarea.value : '';
        ttsCues = parseSubtitleContent(subtitleContent);

        if (!ttsCues.length) {
            throw new Error('未读取到可用字幕内容');
        }
    }

    function cancelCurrentSpeech(resetCueIndex = true) {
        const synth = getSpeechSynthesisEngine();
        if (synth) {
            synth.cancel();
        }

        ttsCurrentUtteranceToken += 1;
        ttsSpeechActive = false;
        ttsPausedVideoForSpeech = false;

        if (resetCueIndex) {
            ttsCurrentCueIndex = -1;
        }
    }

    async function playCueForCurrentTime(cueIndex) {
        if (!ttsSettings.enabled || cueIndex < 0 || cueIndex >= ttsCues.length) {
            return;
        }

        const video = getVideoElement();
        const synth = getSpeechSynthesisEngine();
        if (!video || !synth) {
            return;
        }

        const voice = getSelectedTtsVoice();
        if (!voice) {
            throw new Error('浏览器未提供可用中文语音');
        }

        const cue = ttsCues[cueIndex];

        cancelCurrentSpeech(false);
        const currentToken = ttsCurrentUtteranceToken;
        const utterance = new SpeechSynthesisUtterance(cue.text);
        utterance.voice = voice;
        utterance.lang = voice.lang || 'zh-CN';
        utterance.rate = getConfiguredSpeechRate();
        utterance.pitch = 1;
        utterance.volume = getConfiguredSpeechVolume();
        ttsSpeechActive = true;
        utterance.onend = () => {
            if (currentToken !== ttsCurrentUtteranceToken) {
                return;
            }

            ttsSpeechActive = false;

            if (ttsPausedVideoForSpeech && video.paused && ttsSettings.enabled) {
                ttsPausedVideoForSpeech = false;
                resumeVideoPlayback();
            }
        };
        utterance.onerror = (event) => {
            if (currentToken !== ttsCurrentUtteranceToken) {
                return;
            }

            ttsSpeechActive = false;
            ttsPausedVideoForSpeech = false;
            console.error('浏览器语音播放失败', event.error || event);
        };

        synth.speak(utterance);
        ttsCurrentCueIndex = cueIndex;
    }

    function syncCurrentCuePlayback() {
        if (!ttsSettings.enabled) {
            return;
        }

        const video = getVideoElement();
        const synth = getSpeechSynthesisEngine();

        if (!video || !ttsCues.length || !synth) {
            return;
        }

        if (ttsSpeechActive && ttsCurrentCueIndex !== -1 && video.currentTime >= getCueWindowEnd(ttsCurrentCueIndex) - 0.05) {
            if (!video.paused && !ttsPausedVideoForSpeech) {
                ttsPausedVideoForSpeech = true;
                pauseVideoPlayback();
            }
            return;
        }

        const cueIndex = findCueIndex(video.currentTime);
        if (cueIndex === -1) {
            cancelCurrentSpeech(true);
            return;
        }

        if (video.paused) {
            if (synth.speaking && !synth.paused) {
                synth.pause();
            }
            return;
        }

        if (synth.paused && cueIndex === ttsCurrentCueIndex) {
            synth.resume();
            return;
        }

        if (cueIndex !== ttsCurrentCueIndex) {
            playCueForCurrentTime(cueIndex).catch((error) => {
                console.error('播放中文配音失败', error);
                cancelCurrentSpeech(false);
            });
        }
    }

    function scheduleTtsSync() {
        if (ttsSyncScheduled) {
            return;
        }

        ttsSyncScheduled = true;
        requestAnimationFrame(() => {
            ttsSyncScheduled = false;
            syncCurrentCuePlayback();
        });
    }

    function handleVideoPlay() {
        const synth = getSpeechSynthesisEngine();
        const cueIndex = ttsBoundVideo ? findCueIndex(ttsBoundVideo.currentTime) : -1;

        if (synth && synth.paused && cueIndex === ttsCurrentCueIndex) {
            synth.resume();
            return;
        }

        scheduleTtsSync();
    }

    function handleVideoPause() {
        if (ttsPausedVideoForSpeech) {
            return;
        }

        const synth = getSpeechSynthesisEngine();
        if (synth && synth.speaking && !synth.paused) {
            synth.pause();
        }
    }

    function handleVideoSeeked() {
        cancelCurrentSpeech(true);
        scheduleTtsSync();
    }

    function bindTtsToVideo(video) {
        if (!video || ttsBoundVideo === video) {
            return;
        }

        if (ttsBoundVideo) {
            ttsBoundVideo.removeEventListener('play', handleVideoPlay);
            ttsBoundVideo.removeEventListener('pause', handleVideoPause);
            ttsBoundVideo.removeEventListener('seeking', handleVideoSeeked);
            ttsBoundVideo.removeEventListener('seeked', handleVideoSeeked);
            ttsBoundVideo.removeEventListener('timeupdate', scheduleTtsSync);
            ttsBoundVideo.removeEventListener('ratechange', scheduleTtsSync);
            ttsBoundVideo.removeEventListener('ended', handleVideoPause);
        }

        ttsBoundVideo = video;
        ttsBoundVideo.addEventListener('play', handleVideoPlay);
        ttsBoundVideo.addEventListener('pause', handleVideoPause);
        ttsBoundVideo.addEventListener('seeking', handleVideoSeeked);
        ttsBoundVideo.addEventListener('seeked', handleVideoSeeked);
        ttsBoundVideo.addEventListener('timeupdate', scheduleTtsSync);
        ttsBoundVideo.addEventListener('ratechange', scheduleTtsSync);
        ttsBoundVideo.addEventListener('ended', handleVideoPause);
    }

    function restoreVideoMutedState() {
        if (ttsBoundVideo && ttsOriginalMuted !== null) {
            ttsBoundVideo.muted = ttsOriginalMuted;
        }

        ttsOriginalMuted = null;
    }

    function suspendTtsPlayback() {
        ttsSessionId += 1;
        cancelCurrentSpeech(true);
        if (ttsPausedVideoForSpeech) {
            ttsPausedVideoForSpeech = false;
            resumeVideoPlayback();
        }
        restoreVideoMutedState();
    }

    async function startTtsPlayback() {
        const video = getVideoElement();
        if (!video) {
            throw new Error('未找到视频元素');
        }

        const synth = getSpeechSynthesisEngine();
        if (!synth) {
            throw new Error('当前浏览器不支持语音合成');
        }

        ttsPreparing = true;
        updateTtsButtonState();

        try {
            await waitFor(() => getAvailableChineseVoices().length > 0, 1500, 100);
            populateTtsVoiceSelect();
            if (!ttsVoices.length) {
                throw new Error('浏览器未提供中文语音');
            }

            bindTtsToVideo(video);
            await refreshTtsCues();
            ttsSessionId += 1;
            ttsOriginalMuted = video.muted;
            video.muted = true;
            scheduleTtsSync();
        } finally {
            ttsPreparing = false;
            updateTtsButtonState();
        }
    }

    function stopTtsPlayback() {
        suspendTtsPlayback();
        updateTtsButtonState();
    }

    async function toggleTtsPlayback() {
        if (ttsPreparing) {
            return;
        }

        if (ttsSettings.enabled) {
            ttsSettings.enabled = false;
            saveTtsSettings();
            stopTtsPlayback();
            return;
        }

        ttsSettings.enabled = true;
        saveTtsSettings();
        updateTtsButtonState();

        try {
            await startTtsPlayback();
        } catch (error) {
            console.error('启用中文配音失败', error);
            ttsSettings.enabled = false;
            saveTtsSettings();
            stopTtsPlayback();
        }
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
                <input type="range" id="font-size-slider" min="12" max="70" value="${parseInt(settings.fontSize)}" style="width: 100%;">
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">字体颜色</label>
                <input type="color" id="font-color-picker" value="${settings.color}" style="width: 100%; height: 30px;">
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">背景颜色</label>
                <input type="color" id="bg-color-picker" value="${parseBackgroundColor(settings.backgroundColor).hex}" style="width: 100%; height: 30px;">
                <div style="margin-top: 5px; display: flex; align-items: center;">
                    <span style="font-size: 12px; margin-right: 10px;">透明度:</span>
                    <input type="range" id="bg-opacity-slider" min="0" max="1" step="0.05" value="${parseBackgroundColor(settings.backgroundColor).opacity}" style="width: 100%;">
                    <span id="opacity-value" style="margin-left: 10px; font-size: 12px; width: 30px;">${Math.round(parseBackgroundColor(settings.backgroundColor).opacity * 100)}%</span>
                </div>
            </div>

            <div class="control-group" style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px;">
                    距离底部
                    <span id="bottom-value" style="float: right;">${parseInt(settings.bottom)}px</span>
                </label>
                <input type="range" id="bottom-slider" min="10" max="350" value="${parseInt(settings.bottom)}" style="width: 100%;">
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

    function setupTtsControlPanel() {
        if (ttsControlPanel || ttsPanelInitialized) return;

        const panel = document.createElement('div');
        panel.id = 'subtitle-tts-control-panel';
        panel.style.cssText = `
            display: none;
            position: fixed;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 16px;
            border-radius: 12px;
            z-index: 1000000;
            width: 320px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            border: 1px solid #444;
            backdrop-filter: blur(10px);
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 15px; font-weight: 600;">配音设置</h3>
                <span id="close-tts-panel" style="cursor: pointer; font-size: 18px;">×</span>
            </div>

            <div class="control-group" style="margin-bottom: 14px;">
                <label style="display: block; margin-bottom: 6px; font-size: 13px;">中文语音</label>
                <select id="tts-voice-select" class="subtitle-tts-voice-select" style="width: 100%;"></select>
            </div>

            <div class="control-group" style="margin-bottom: 14px;">
                <label style="display: block; margin-bottom: 6px; font-size: 13px;">
                    配音倍速
                    <span id="tts-rate-value" style="float: right;">${Number(ttsSettings.rate).toFixed(2)}x</span>
                </label>
                <input type="range" id="tts-rate-slider" min="0.5" max="2" step="0.05" value="${Number(ttsSettings.rate)}" style="width: 100%;">
            </div>

            <div class="control-group" style="margin-bottom: 4px;">
                <label style="display: block; margin-bottom: 6px; font-size: 13px;">
                    配音音量
                    <span id="tts-volume-value" style="float: right;">${Math.round(Number(ttsSettings.volume) * 100)}%</span>
                </label>
                <input type="range" id="tts-volume-slider" min="0" max="1" step="0.05" value="${Number(ttsSettings.volume)}" style="width: 100%;">
            </div>
        `;

        document.body.appendChild(panel);
        ttsControlPanel = panel;
        ttsPanelInitialized = true;

        setupTtsPanelEvents();
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
        const parsedBackground = parseBackgroundColor(settings.backgroundColor);
        bgColorPicker.value = parsedBackground.hex;
        bgOpacitySlider.value = String(parsedBackground.opacity);
        opacityValue.textContent = Math.round(parsedBackground.opacity * 100) + '%';

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
        });

        // 应用按钮
        controlPanel.querySelector('#apply-btn').addEventListener('click', () => {
            applyStyles();
            showControlPanel(false);
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

    function setupTtsPanelEvents() {
        if (!ttsControlPanel) return;

        const voiceSelect = ttsControlPanel.querySelector('#tts-voice-select');
        const ttsRateSlider = ttsControlPanel.querySelector('#tts-rate-slider');
        const ttsRateValue = ttsControlPanel.querySelector('#tts-rate-value');
        const ttsVolumeSlider = ttsControlPanel.querySelector('#tts-volume-slider');
        const ttsVolumeValue = ttsControlPanel.querySelector('#tts-volume-value');

        voiceSelect.addEventListener('change', () => {
            ttsSettings.voice = voiceSelect.value;
            saveTtsSettings();

            if (ttsSettings.enabled) {
                cancelCurrentSpeech(true);
                scheduleTtsSync();
            }
        });

        ttsRateSlider.addEventListener('input', (e) => {
            ttsRateValue.textContent = Number(e.target.value).toFixed(2) + 'x';
        });
        ttsRateSlider.addEventListener('change', (e) => {
            ttsSettings.rate = Number(e.target.value);
            saveTtsSettings();

            if (ttsSettings.enabled) {
                cancelCurrentSpeech(true);
                scheduleTtsSync();
            }
        });

        ttsVolumeSlider.addEventListener('input', (e) => {
            const volume = Number(e.target.value);
            ttsVolumeValue.textContent = Math.round(volume * 100) + '%';
        });
        ttsVolumeSlider.addEventListener('change', (e) => {
            ttsSettings.volume = Number(e.target.value);
            saveTtsSettings();

            if (ttsSettings.enabled) {
                cancelCurrentSpeech(true);
                scheduleTtsSync();
            }
        });

        ttsControlPanel.querySelector('#close-tts-panel').addEventListener('click', () => {
            ttsControlPanel.style.display = 'none';
        });
    }

    // 显示/隐藏控制面板
    function showControlPanel(show) {
        if (!controlPanel) setupControlPanel();
        if (controlPanel) {
            controlPanel.style.display = show ? 'block' : 'none';

            if (show) {
                controlPanel.style.transform = 'none';

                // 定位在视频中间
                const videoPlace = document.querySelector('.video-place') || document.querySelector('.video-place_div, #video-place_div');
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

    function showTtsControlPanel(show) {
        if (!ttsControlPanel) setupTtsControlPanel();
        if (!ttsControlPanel) {
            return;
        }

        ttsControlPanel.style.display = show ? 'block' : 'none';
        if (!show) {
            return;
        }

        const anchor = ttsSettingsButton || ttsToggleButton || settingsButton;
        if (anchor) {
            const rect = anchor.getBoundingClientRect();
            const panelWidth = 320;
            const panelHeight = 230;
            const left = Math.min(Math.max(rect.left, 12), Math.max(window.innerWidth - panelWidth - 12, 12));
            const preferredTop = rect.top - panelHeight - 10;
            const top = preferredTop >= 12 ? preferredTop : (rect.bottom + 10);

            ttsControlPanel.style.left = `${left}px`;
            ttsControlPanel.style.top = `${top}px`;
            ttsControlPanel.style.right = 'auto';
            ttsControlPanel.style.transform = 'none';
        } else {
            ttsControlPanel.style.left = '50%';
            ttsControlPanel.style.top = '50%';
            ttsControlPanel.style.transform = 'translate(-50%, -50%)';
        }

        const voiceSelect = ttsControlPanel.querySelector('#tts-voice-select');
        if (voiceSelect) {
            ttsVoiceSelect = voiceSelect;
            populateTtsVoiceSelect();
        }
    }

    // 设置字幕设置按钮
    function setupButton() {
        // 如果不是课程页面，直接返回
        if (!isCoursePage()) return false;

        const anchor = getButtonAnchor();
        if (!anchor || !anchor.parentNode) {
            console.log('未找到按钮挂载目标');
            return false;
        }

        const container = getButtonContainer();
        if (anchor.nextElementSibling !== container) {
            anchor.insertAdjacentElement('afterend', container);
        }

        let settingsBtn = container.querySelector('.subtitle-settings-btn');
        if (!settingsBtn) {
            settingsBtn = document.createElement('button');
            settingsBtn.type = 'button';
            settingsBtn.className = 'el-button el-button--primary el-button--small subtitle-settings-btn';
            settingsBtn.innerHTML = '<i class="el-icon-setting"></i><span>字幕设置</span>';

            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showControlPanel(true);
            });

            container.appendChild(settingsBtn);
        }
        settingsButton = settingsBtn;

        let ttsBtn = container.querySelector('.subtitle-tts-btn');
        if (!ttsBtn) {
            ttsBtn = document.createElement('button');
            ttsBtn.type = 'button';
            ttsBtn.className = 'el-button el-button--small subtitle-tts-btn';
            ttsBtn.innerHTML = '<i class="el-icon-microphone"></i><span>中文配音已关</span>';

            ttsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleTtsPlayback();
            });

            container.appendChild(ttsBtn);
        }

        ttsToggleButton = ttsBtn;

        let ttsSettingsBtn = container.querySelector('.subtitle-tts-settings-btn');
        if (!ttsSettingsBtn) {
            ttsSettingsBtn = document.createElement('button');
            ttsSettingsBtn.type = 'button';
            ttsSettingsBtn.className = 'el-button el-button--small subtitle-tts-settings-btn';
            ttsSettingsBtn.innerHTML = '<i class="el-icon-s-tools"></i><span>配音设置</span>';

            ttsSettingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showTtsControlPanel(true);
            });

            container.appendChild(ttsSettingsBtn);
        }

        ttsSettingsButton = ttsSettingsBtn;
        setupTtsControlPanel();
        const panelVoiceSelect = ttsControlPanel ? ttsControlPanel.querySelector('#tts-voice-select') : null;
        if (panelVoiceSelect) {
            ttsVoiceSelect = panelVoiceSelect;
            populateTtsVoiceSelect();
        }
        updateTtsButtonState();

        if (ttsSettings.enabled && !ttsPreparing && (!ttsBoundVideo || ttsBoundVideo !== getVideoElement() || !ttsCues.length)) {
            startTtsPlayback().catch((error) => {
                console.error('恢复中文配音失败', error);
                ttsSettings.enabled = false;
                saveTtsSettings();
                stopTtsPlayback();
            });
        }

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

                            // 检查是否添加了按钮挂载目标
                            if (node.classList && (
                                node.classList.contains('module_tabs') ||
                                node.classList.contains('video-place_div') ||
                                node.classList.contains('video-place') ||
                                node.querySelector('.module_tabs') ||
                                node.querySelector('.video-place_div, #video-place_div, .video-place')
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
                         mutation.target.classList.contains('video-place_div') ||
                         mutation.target.classList.contains('video-place') ||
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
        const isCurrentCoursePage = isCoursePage();
        const wasCoursePage = lastIsCoursePage;

        lastProcessedUrl = currentUrl;
        lastIsCoursePage = isCurrentCoursePage;

        // 如果URL变化了但页面类型没变（比如刷新或视频切换）
        if (isCurrentCoursePage) {
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
                suspendTtsPlayback();

                // 隐藏控制面板
                if (controlPanel) {
                    controlPanel.style.display = 'none';
                }

                if (ttsControlPanel) {
                    ttsControlPanel.style.display = 'none';
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
        .subtitle-settings-button-container {
            display: flex;
            justify-content: flex-start;
            margin-top: 12px;
            width: 100%;
            gap: 10px;
            flex-wrap: wrap;
        }

        .subtitle-settings-btn,
        .subtitle-tts-btn,
        .subtitle-tts-settings-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .subtitle-tts-voice-select {
            min-width: 220px;
            max-width: 320px;
            height: 32px;
            padding: 0 10px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            background: #fff;
            color: #303133;
            font-size: 13px;
        }

        .subtitle-tts-voice-select:disabled {
            cursor: not-allowed;
            opacity: 0.7;
            background: #f5f7fa;
        }

        .subtitle-tts-btn.is-active {
            background: #67c23a;
            border-color: #67c23a;
            color: #fff;
        }

        .subtitle-tts-btn.is-loading {
            opacity: 0.75;
            cursor: wait;
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
