# LuminaEdu 字幕自定义工具

一个 Tampermonkey/Violentmonkey 用户脚本，用于自定义 LuminaEdu 视频字幕的样式。

## 功能特性

- 自定义字幕字体大小（12-40px）
- 自定义字体颜色
- 自定义背景颜色和透明度
- 调整字幕距离底部的距离
- 一键开启中文配音，使用浏览器内置语音功能自动静音原视频并按字幕时间轴同步播放；若当前字幕尚未播完，会暂停视频等待播报结束后再继续
- 支持独立的配音设置小面板，可选择浏览器提供的中文语音并记住用户上次选择
- 支持在配音设置小面板中调节中文配音倍速和音量
- 首次使用自动显示设置面板
- 设置自动保存

## 安装方法

### 方法一：直接安装（推荐）
1. 确保已安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 点击此链接安装：[安装链接](https://raw.githubusercontent.com/sangyuxiaowu/luminaedu-video-subtitle/main/luminaedu-subtitle-customizer.user.js)

### 方法二：手动安装
1. 复制脚本代码
2. 打开 Tampermonkey 仪表板
3. 点击"添加新脚本"
4. 粘贴代码并保存

## 使用方法

1. 访问 LuminaEdu 课程页面（以 `/course` 开头的 URL）
2. 首次使用会自动显示设置面板在视频中央
3. 之后可通过视频区域下方的"字幕设置"按钮打开面板
4. 可在"字幕设置"右侧使用"中文配音"开关启用中文字幕配音
5. 可通过"配音设置"按钮打开独立的小面板，调整语音、倍速和音量
4. 调整设置后即时生效

## 界面截图

![效果图](image.png)

![中文配音](tts.png)

## 技术细节

- 使用 MutationObserver 监听 DOM 变化，并在视频区域重建后重新挂载按钮
- 使用 GM_setValue/GM_getValue 保存用户设置
- 监听 history API 以支持 SPA 导航
- 使用 !important 确保样式优先级

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件