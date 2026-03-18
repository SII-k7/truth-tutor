# Vibero 风格功能实现文档

Truth Tutor 项目的 Vibero.dev 风格交互式阅读功能实现。

## 📚 功能概览

### 1. PDF 交互式标注（AI 生成的小贴纸）
- ✅ 便签纸风格的视觉效果
- ✅ 根据标注类型显示不同颜色和图标
- ✅ 悬停动画和点击反馈
- ✅ 点击展开详细信息

### 2. 鼠标悬停显示翻译
- ✅ 渐变色翻译 tooltip
- ✅ 平滑动画效果
- ✅ 智能定位（避免遮挡）

### 3. 点击显示 AI 解答
- ✅ 侧边栏形式展示
- ✅ 加载动画
- ✅ 支持富文本格式（标题、列表、代码块）
- ✅ 显示原文、翻译、解答、参考

### 4. 文章脉络导航
- ✅ 左右两侧显示文章大纲
- ✅ 当前位置高亮
- ✅ 层级缩进显示
- ✅ 阅读进度条
- ✅ 可折叠/展开

### 5. 沉浸式阅读体验
- ✅ 减少 UI 干扰
- ✅ 优化的排版和间距
- ✅ 平滑滚动
- ✅ 专注模式
- ✅ 响应式设计
- ✅ 深色模式支持

## 🚀 快速开始

### 基础用法

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="src/web-ui/styles/vibero-immersive.css">
</head>
<body>
  <div id="pdf-container" data-vibero-reader 
       data-locale="zh-CN"
       data-annotations="true"
       data-navigation="true"
       data-immersive="true"
       data-nav-position="both">
  </div>

  <script type="module">
    import { createViberoDemo } from './src/web-ui/vibero-integration-demo.js';
    
    // 自动初始化演示
    const reader = createViberoDemo();
  </script>
</body>
</html>
```

### 编程方式初始化

```javascript
import { ViberoReader } from './src/web-ui/vibero-integration-demo.js';

// 创建阅读器实例
const reader = new ViberoReader(document.getElementById('pdf-container'), {
  locale: 'zh-CN',
  enableAnnotations: true,
  enableNavigation: true,
  enableImmersiveMode: true,
  enableTranslation: true,
  enableAI: true,
  navigationPosition: 'both' // 'left' | 'right' | 'both'
});

// 加载 PDF
await reader.loadPDF('/path/to/document.pdf');

// 设置章节
reader.setSections([
  {
    id: 'intro',
    title: 'Introduction',
    type: 'introduction',
    page: 1,
    level: 0
  },
  // ... 更多章节
]);

// 添加标注
await reader.addAnnotation({
  id: 'ann-1',
  x: 100,
  y: 150,
  type: 'translation', // 'translation' | 'explanation' | 'concept' | 'question'
  content: 'Original text here',
  translation: '翻译文本',
  aiExplanation: '<p>AI 生成的解答...</p>',
  page: 1,
  reference: 'Section 1.1'
});
```

## 📦 文件结构

```
src/web-ui/
├── components/
│   ├── AnnotationLayer.vibero.js      # Vibero 风格标注层
│   └── SectionNavigator.vibero.js     # Vibero 风格章节导航
├── styles/
│   └── vibero-immersive.css           # 沉浸式阅读样式
├── utils/
│   └── vibero-i18n.js                 # 国际化工具
└── vibero-integration-demo.js         # 集成示例和演示
```

## 🎨 组件详解

### ViberoAnnotationLayer

交互式标注层，支持便签纸风格的标注。

**特性：**
- 便签纸视觉效果（不同颜色和图标）
- 悬停显示翻译 tooltip
- 点击显示 AI 解答侧边栏
- 平滑动画和过渡效果

**API：**

```javascript
const annotationLayer = new ViberoAnnotationLayer(container, {
  enableTranslation: true,
  enableAIExplanation: true,
  stickyNoteStyle: 'vibero',
  locale: 'zh-CN'
});

// 添加标注
annotationLayer.addAnnotation({
  id: 'unique-id',
  x: 100,
  y: 200,
  type: 'translation', // 标注类型
  content: '原文内容',
  translation: '翻译内容',
  aiExplanation: 'AI 解答 HTML',
  page: 1,
  reference: '参考信息'
});

// 移除标注
annotationLayer.removeAnnotation('unique-id');

// 高亮标注
annotationLayer.highlightAnnotation('unique-id');

// 清空所有标注
annotationLayer.clear();

// 隐藏 AI 侧边栏
annotationLayer.hideAISidebar();
```

**标注类型和颜色：**
- `translation` 🌐 - 黄色（翻译）
- `explanation` 💡 - 绿色（解释）
- `concept` 🎯 - 蓝色（概念）
- `question` ❓ - 粉色（问题）

### ViberoSectionNavigator

文章脉络导航，支持左右两侧显示大纲。

**特性：**
- 左右两侧大纲面板
- 层级缩进显示
- 当前章节高亮
- 阅读进度条
- 浮动导航按钮
- 键盘快捷键（Ctrl+P/N）

**API：**

```javascript
const navigator = new ViberoSectionNavigator(container, {
  position: 'both', // 'left' | 'right' | 'both'
  showMiniMap: true,
  autoHighlight: true,
  smoothScroll: true
});

// 设置章节
navigator.setSections([
  {
    id: 'section-1',
    title: '章节标题',
    type: 'chapter',
    page: 1,
    level: 0,
    children: [
      {
        id: 'section-1-1',
        title: '子章节',
        type: 'section',
        page: 2,
        level: 1
      }
    ]
  }
]);

// 更新当前章节
navigator.updateCurrentSection('section-id');

// 导航到章节
navigator.navigateToSection('section-id');

// 上一章节
navigator.navigatePrevious();

// 下一章节
navigator.navigateNext();

// 切换面板
navigator.togglePanel('left'); // 'left' | 'right'

// 监听事件
navigator.on('sectionNavigate', (data) => {
  console.log('Navigating to:', data.sectionId);
});
```

### ViberoI18n

国际化工具，支持多语言翻译。

**API：**

```javascript
import { i18n, translationService } from './utils/vibero-i18n.js';

// 获取翻译
const text = i18n.t('ai.title'); // 'AI 解答'

// 带参数的翻译
const text = i18n.t('nav.page', { page: 5 }); // '第 5 页'

// 切换语言
i18n.setLocale('en-US');

// 添加自定义翻译
i18n.addTranslations('zh-CN', {
  'custom.key': '自定义文本'
});

// 异步翻译服务
const translation = await translationService.translate(
  'Hello world',
  'zh-CN',
  'en-US'
);

// 批量翻译
const translations = await translationService.translateBatch(
  ['Hello', 'World'],
  'zh-CN'
);
```

## ⌨️ 键盘快捷键

- `Ctrl/Cmd + I` - 切换沉浸式模式
- `Ctrl/Cmd + F` - 切换专注模式
- `Ctrl/Cmd + P` - 上一章节
- `Ctrl/Cmd + N` - 下一章节
- `Escape` - 关闭 AI 侧边栏

## 🎯 使用场景

### 场景 1：学术论文阅读

```javascript
const reader = new ViberoReader(container, {
  locale: 'zh-CN',
  navigationPosition: 'both'
});

// 加载论文 PDF
await reader.loadPDF('/papers/research-paper.pdf');

// 添加论文章节
reader.setSections([
  { id: 'abstract', title: 'Abstract', page: 1, level: 0 },
  { id: 'intro', title: 'Introduction', page: 2, level: 0 },
  { id: 'methods', title: 'Methods', page: 5, level: 0 },
  { id: 'results', title: 'Results', page: 10, level: 0 },
  { id: 'discussion', title: 'Discussion', page: 15, level: 0 }
]);

// 添加关键术语标注
await reader.addAnnotation({
  id: 'term-1',
  x: 150,
  y: 200,
  type: 'concept',
  content: 'Convolutional Neural Network',
  translation: '卷积神经网络',
  aiExplanation: '<p>CNN 是一种深度学习架构...</p>'
});
```

### 场景 2：技术文档阅读

```javascript
const reader = new ViberoReader(container, {
  locale: 'zh-CN',
  navigationPosition: 'left', // 只显示左侧导航
  enableImmersiveMode: false  // 保留工具栏
});

// 添加代码示例标注
await reader.addAnnotation({
  id: 'code-1',
  x: 200,
  y: 300,
  type: 'explanation',
  content: 'async function fetchData() { ... }',
  translation: '异步函数获取数据',
  aiExplanation: `
    <p>这是一个异步函数，使用 async/await 语法。</p>
    <pre>
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}
    </pre>
  `
});
```

### 场景 3：教材阅读

```javascript
const reader = new ViberoReader(container, {
  locale: 'zh-CN',
  navigationPosition: 'both'
});

// 添加练习题标注
await reader.addAnnotation({
  id: 'exercise-1',
  x: 100,
  y: 400,
  type: 'question',
  content: 'Exercise 3.1: Prove that...',
  translation: '练习 3.1：证明...',
  aiExplanation: `
    <h4>解题思路：</h4>
    <ol>
      <li>首先理解题目要求</li>
      <li>列出已知条件</li>
      <li>应用相关定理</li>
      <li>逐步推导</li>
    </ol>
    <p>详细解答见教师手册第 45 页。</p>
  `
});
```

## 🔧 高级配置

### 自定义 AI 解答 API

```javascript
// 在 AnnotationLayer.vibero.js 中修改 _fetchAIExplanation 方法
async _fetchAIExplanation(annotation) {
  const response = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: annotation.content,
      type: annotation.type,
      context: annotation.reference
    })
  });
  
  const data = await response.json();
  return data.explanation;
}
```

### 自定义翻译 API

```javascript
import { ViberoTranslationService } from './utils/vibero-i18n.js';

const translationService = new ViberoTranslationService(
  'https://api.example.com/translate',
  'your-api-key'
);

// 使用自定义翻译服务
const translation = await translationService.translate(
  'Hello world',
  'zh-CN'
);
```

### 自定义样式

```css
/* 覆盖默认样式 */
.vibero-sticky-note {
  /* 自定义便签纸样式 */
}

.vibero-outline-panel {
  /* 自定义导航面板样式 */
  width: 320px;
  background: rgba(240, 240, 255, 0.98);
}

.vibero-ai-sidebar {
  /* 自定义 AI 侧边栏样式 */
  width: 500px;
}
```

## 📱 响应式设计

Vibero 功能完全支持响应式设计：

- **桌面端（>1400px）**：显示左右两侧导航
- **平板端（1024px-1400px）**：只显示左侧导航
- **移动端（<768px）**：导航默认折叠，通过按钮展开

## 🌙 深色模式

自动检测系统深色模式偏好：

```css
@media (prefers-color-scheme: dark) {
  /* 深色模式样式自动应用 */
}
```

手动切换：

```javascript
document.body.classList.toggle('dark-mode');
```

## ♿ 无障碍支持

- 键盘导航支持
- ARIA 标签
- 焦点指示器
- 高对比度模式支持
- 减少动画选项

## 🧪 测试

```javascript
// 测试标注功能
const testAnnotation = {
  id: 'test-1',
  x: 100,
  y: 100,
  type: 'translation',
  content: 'Test content',
  translation: '测试内容'
};

reader.addAnnotation(testAnnotation);
reader.annotationLayer.highlightAnnotation('test-1');

// 测试导航功能
reader.navigateToSection('intro');
reader.sectionNavigator.navigateNext();
```

## 📊 性能优化

- 使用 `requestAnimationFrame` 优化滚动监听
- 标注懒加载（只渲染可见区域）
- 翻译结果缓存
- CSS 动画硬件加速

## 🐛 已知问题

1. 在某些浏览器中，深色模式可能需要手动刷新
2. 移动端 Safari 的 backdrop-filter 支持有限
3. 大量标注（>1000）时可能影响性能

## 🔮 未来计划

- [ ] 支持手写笔标注
- [ ] 语音朗读功能
- [ ] 协作标注（多人）
- [ ] 标注导出（Markdown/PDF）
- [ ] 更多标注类型（高亮、下划线等）
- [ ] AI 自动生成标注

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**实现完成时间：** 2026-03-18  
**实现者：** Vibero 功能增强专家  
**项目：** Truth Tutor - Vibero Style Features
