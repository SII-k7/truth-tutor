# Vibero 功能集成文档

## 概述

Vibero 沉浸模式已成功集成到 Truth Tutor 应用中，提供增强的阅读和标注体验。

## 集成的组件

### 1. ViberoAnnotationLayer（Vibero 标注层）
- **文件**: `components/AnnotationLayer.vibero.js`
- **功能**: 
  - 🌐 悬停翻译提示
  - 💡 AI 解答侧边栏
  - 📌 彩色便签式标注
  - 🎯 多种标注类型（翻译、解释、概念、问题）

### 2. ViberoSectionNavigator（Vibero 导航器）
- **文件**: `components/SectionNavigator.vibero.js`
- **功能**:
  - 📚 左右双侧文章脉络面板
  - 🎯 浮动导航控制按钮
  - 📊 阅读进度追踪
  - ⌨️ 键盘快捷键支持

## 使用方法

### 切换 Vibero 模式

#### 方法 1: 点击按钮
- 点击页面右上角的 **"✨ Vibero 沉浸模式"** 按钮
- 再次点击切换回普通模式（按钮文字变为 **"📖 普通模式"**）

#### 方法 2: 键盘快捷键
- 按 `Ctrl+V` (Windows/Linux) 或 `Cmd+V` (Mac) 切换模式

### Vibero 模式特性

#### 标注交互
1. **悬停查看翻译**: 鼠标悬停在便签标注上，显示翻译提示
2. **点击查看详情**: 点击便签标注，打开 AI 解答侧边栏
3. **关闭侧边栏**: 点击侧边栏右上角的 × 按钮或点击遮罩层

#### 导航交互
1. **章节导航**: 
   - 左右两侧显示文章脉络面板
   - 点击章节标题跳转到对应页面
   - 当前章节高亮显示
2. **浮动控制**: 
   - 右下角显示上一章节/下一章节按钮
   - 快捷键: `Ctrl+P` (上一章节), `Ctrl+N` (下一章节)
3. **阅读进度**: 
   - 导航面板底部显示阅读进度条
   - 实时更新百分比

## 技术实现

### 状态管理
```javascript
state.viberoMode = false; // 当前模式标志
state.viberoAnnotationLayer = null; // Vibero 标注层实例
state.viberoSectionNavigator = null; // Vibero 导航器实例
```

### 模式切换逻辑
- 切换到 Vibero 模式时：
  - 隐藏普通的 Sidebar 和 SectionNavigator
  - 显示 Vibero 的左右导航面板和浮动控制
  - 使用 ViberoAnnotationLayer 渲染标注
  
- 切换回普通模式时：
  - 显示普通的 Sidebar 和 SectionNavigator
  - 隐藏 Vibero 的导航面板和浮动控制
  - 使用普通 AnnotationLayer 渲染标注

### 数据同步
- 两种模式共享相同的章节数据（通过 `loadDocumentOutline`）
- 两种模式共享相同的标注数据（通过 `renderAnnotationsForPage`）
- 用户偏好保存在 localStorage 中

## 测试验证

### 启动服务
```bash
cd /Users/zhukeqi/.openclaw/workspace/truth-tutor-repo
npm start
```

### 测试步骤
1. 打开浏览器访问应用
2. 加载一个 PDF 文档
3. 点击 "✨ Vibero 沉浸模式" 按钮
4. 验证：
   - ✅ 左右导航面板显示
   - ✅ 浮动控制按钮显示
   - ✅ 标注以便签形式显示
   - ✅ 悬停标注显示翻译
   - ✅ 点击标注打开 AI 侧边栏
5. 切换回普通模式，验证组件正确隐藏/显示

## 键盘快捷键总结

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+V` / `Cmd+V` | 切换 Vibero 模式 |
| `Ctrl+D` / `Cmd+D` | 切换深色模式 |
| `Ctrl+P` / `Cmd+P` | 上一章节（Vibero 模式） |
| `Ctrl+N` / `Cmd+N` | 下一章节（Vibero 模式） |

## 文件修改清单

### 修改的文件
- `app.js` - 主应用入口，添加了 Vibero 组件集成逻辑

### 新增的函数
- `toggleViberoMode()` - 切换 Vibero 模式
- `initViberoMode()` - 初始化 Vibero 模式和切换按钮

### 修改的函数
- `initPDFComponents()` - 添加 ViberoAnnotationLayer 初始化
- `initNavigationComponents()` - 添加 ViberoSectionNavigator 初始化
- `loadDocumentOutline()` - 同步章节数据到 Vibero 导航器
- `renderAnnotationsForPage()` - 根据模式选择正确的标注层

## 注意事项

1. **性能**: 两套组件同时初始化，但只有一套在运行时显示
2. **兼容性**: Vibero 组件使用现代 CSS 特性，建议使用最新浏览器
3. **数据格式**: 标注数据需要包含 `type`, `content`, `translation` 等字段才能充分利用 Vibero 功能
4. **AI 解答**: 当前 AI 解答使用模拟数据，需要连接真实 API

## 未来改进

- [ ] 添加更多标注类型和样式
- [ ] 优化 AI 解答加载性能
- [ ] 添加标注编辑和删除功能
- [ ] 支持自定义导航面板位置
- [ ] 添加更多键盘快捷键
- [ ] 支持标注导出和分享

## 联系方式

如有问题或建议，请联系开发团队。
