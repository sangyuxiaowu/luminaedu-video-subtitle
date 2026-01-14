# LuminaEdu 视频字幕样式自定义

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license">
  <img src="https://img.shields.io/badge/Tampermonkey-支持-brightgreen.svg" alt="tampermonkey">
  <img src="https://img.shields.io/badge/Violentmonkey-支持-brightgreen.svg" alt="violentmonkey">
</p>

一个用于自定义 LuminaEdu 视频字幕样式的 Tampermonkey/Violentmonkey 用户脚本。通过这个脚本，你可以轻松调整字幕的字体大小、颜色、背景、位置等多个属性，打造最适合自己的观看体验。

## ✨ 功能特性

- 🎨 **样式自定义** - 自由调整字体大小、颜色、字体、背景色等
- 📍 **位置调整** - 支持顶部/底部显示，可调整偏移距离
- 💾 **配置保存** - 设置自动保存，下次访问时自动应用
- 🔄 **实时生效** - 修改后立即生效，无需刷新页面
- 🎯 **简单易用** - 图形化配置界面，无需编写代码
- 🌐 **跨平台支持** - 支持 Chrome、Firefox、Edge、Safari 等主流浏览器

## 🚀 快速开始

### 安装步骤

1. **安装浏览器扩展**
   
   首先需要安装用户脚本管理器扩展（二选一）：
   
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)

2. **安装用户脚本**
   
   访问[安装页面](https://sangyuxiaowu.github.io/luminaedu-video-subtitle/)，点击"一键安装脚本"按钮。
   
   或者手动安装：
   - 打开 [luminaedu-subtitle-styles.user.js](luminaedu-subtitle-styles.user.js)
   - 点击浏览器扩展图标
   - 选择"创建新脚本"
   - 复制粘贴脚本内容并保存

3. **开始使用**
   
   访问 LuminaEdu 网站，脚本会自动应用默认样式。点击浏览器工具栏的 Tampermonkey/Violentmonkey 图标，选择"字幕样式设置"即可打开配置面板。

## 🎯 使用说明

### 打开设置面板

1. 访问 LuminaEdu 网站
2. 点击浏览器工具栏的 Tampermonkey/Violentmonkey 图标
3. 在弹出菜单中选择"字幕样式设置"
4. 在设置面板中调整各项参数
5. 点击"保存"按钮应用设置

### 配置项说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 启用自定义样式 | 勾选后才会应用自定义样式 | ☑️ |
| 字体大小 | 字幕文字大小，支持 px、em、% 等单位 | `24px`, `1.5em` |
| 字体颜色 | 文字颜色，支持颜色名称、HEX、RGB 等格式 | `#FFFFFF`, `white` |
| 字体 | 字体名称，可指定多个作为备选 | `Arial, Microsoft YaHei` |
| 背景颜色 | 字幕背景色，支持透明度 | `rgba(0,0,0,0.7)` |
| 文字阴影 | CSS text-shadow 属性值 | `2px 2px 4px rgba(0,0,0,0.8)` |
| 位置 | 字幕显示位置（顶部/底部） | `底部` |
| 偏移距离 | 距离顶部或底部的距离 | `50px` |
| 内边距 | 字幕内容的内边距 | `8px 16px` |
| 圆角 | 背景圆角大小 | `4px` |

## 📖 常见问题

### Q: 脚本安装后不生效？

**A:** 请检查：
- 确保已正确安装 Tampermonkey 或 Violentmonkey 扩展
- 确保脚本已启用（在扩展管理界面查看）
- 确认在设置中勾选了"启用自定义样式"
- 尝试刷新页面或重启浏览器

### Q: 为什么字幕样式没有变化？

**A:** 可能原因：
- LuminaEdu 网站更新了字幕的 HTML 结构，请[提交 Issue](https://github.com/sangyuxiaowu/luminaedu-video-subtitle/issues) 反馈
- 某些特殊页面可能使用了不同的字幕实现
- 浏览器缓存问题，尝试清除缓存后重试

### Q: 如何恢复默认设置？

**A:** 在设置面板中点击"恢复默认"按钮即可。

### Q: 如何卸载脚本？

**A:** 在 Tampermonkey 或 Violentmonkey 的管理界面中找到本脚本，点击删除即可。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

### 反馈问题

如果你发现了 Bug 或有功能建议，请[提交 Issue](https://github.com/sangyuxiaowu/luminaedu-video-subtitle/issues)。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

## 📧 联系方式

- GitHub: [@sangyuxiaowu](https://github.com/sangyuxiaowu)
- Issues: [GitHub Issues](https://github.com/sangyuxiaowu/luminaedu-video-subtitle/issues)

---

<p align="center">Made with ❤️ by 桑榆肖物</p>
