// vibero-integration-demo.js - Complete integration example for Vibero features

import { ViberoAnnotationLayer } from './components/AnnotationLayer.vibero.js';
import { ViberoSectionNavigator } from './components/SectionNavigator.vibero.js';
import { i18n, translationService } from './utils/vibero-i18n.js';

/**
 * ViberoReader - Main class that integrates all Vibero features
 */
export class ViberoReader {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      locale: 'zh-CN',
      enableAnnotations: true,
      enableNavigation: true,
      enableImmersiveMode: true,
      enableTranslation: true,
      enableAI: true,
      navigationPosition: 'both', // 'left' | 'right' | 'both'
      ...options
    };

    // Initialize i18n
    i18n.setLocale(this.options.locale);

    // Initialize components
    this.annotationLayer = null;
    this.sectionNavigator = null;
    this.pdfViewer = null;

    this._init();
  }

  _init() {
    // Wrap container with Vibero classes
    this.container.classList.add('vibero-pdf-container');
    if (this.options.enableImmersiveMode) {
      this.container.classList.add('vibero-immersive-mode');
    }

    // Create PDF viewer wrapper
    this.pdfViewer = document.createElement('div');
    this.pdfViewer.className = 'vibero-pdf-viewer';
    this.container.appendChild(this.pdfViewer);

    // Initialize annotation layer
    if (this.options.enableAnnotations) {
      this.annotationLayer = new ViberoAnnotationLayer(this.pdfViewer, {
        enableTranslation: this.options.enableTranslation,
        enableAIExplanation: this.options.enableAI,
        locale: this.options.locale
      });
    }

    // Initialize section navigator
    if (this.options.enableNavigation) {
      this.sectionNavigator = new ViberoSectionNavigator(this.container, {
        position: this.options.navigationPosition,
        showMiniMap: true,
        autoHighlight: true,
        smoothScroll: true
      });

      // Listen to navigation events
      this.sectionNavigator.on('sectionNavigate', (data) => {
        this._onSectionNavigate(data);
      });
    }

    // Add reading progress indicator
    this._addReadingProgress();

    // Add keyboard shortcuts
    this._setupKeyboardShortcuts();
  }

  _addReadingProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'vibero-reading-progress';
    progressBar.innerHTML = '<div class="vibero-reading-progress-bar"></div>';
    document.body.appendChild(progressBar);

    // Update progress on scroll
    window.addEventListener('scroll', () => {
      const scrollPercentage = Math.min(100, Math.max(0,
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      ));
      const bar = progressBar.querySelector('.vibero-reading-progress-bar');
      bar.style.width = `${scrollPercentage}%`;
    });
  }

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + I: Toggle immersive mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        this.toggleImmersiveMode();
      }

      // Ctrl/Cmd + F: Toggle focus mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        this.toggleFocusMode();
      }

      // Escape: Close AI sidebar
      if (e.key === 'Escape') {
        if (this.annotationLayer) {
          this.annotationLayer.hideAISidebar();
        }
      }
    });
  }

  // Load PDF document
  async loadPDF(pdfUrl) {
    // This is a placeholder - integrate with your actual PDF.js implementation
    console.log('Loading PDF:', pdfUrl);
    
    // Example: Create canvas for each page
    // In production, use PDF.js to render pages
    const mockPages = 5;
    for (let i = 1; i <= mockPages; i++) {
      const page = document.createElement('div');
      page.className = 'vibero-pdf-page';
      page.style.width = '100%';
      page.style.height = '800px';
      page.style.background = 'white';
      page.dataset.pageNumber = i;
      this.pdfViewer.appendChild(page);
    }

    // Update annotation layer dimensions
    if (this.annotationLayer) {
      const rect = this.pdfViewer.getBoundingClientRect();
      this.annotationLayer.updateDimensions(rect.width, rect.height);
    }
  }

  // Add annotation to the document
  async addAnnotation(annotation) {
    if (!this.annotationLayer) return;

    // Fetch translation if not provided
    if (this.options.enableTranslation && !annotation.translation) {
      annotation.translation = await translationService.translate(
        annotation.content,
        this.options.locale
      );
    }

    this.annotationLayer.addAnnotation(annotation);
  }

  // Add multiple annotations
  async addAnnotations(annotations) {
    for (const annotation of annotations) {
      await this.addAnnotation(annotation);
    }
  }

  // Set document sections
  setSections(sections) {
    if (!this.sectionNavigator) return;
    this.sectionNavigator.setSections(sections);
  }

  // Navigate to section
  navigateToSection(sectionId) {
    if (!this.sectionNavigator) return;
    this.sectionNavigator.navigateToSection(sectionId);
  }

  // Toggle immersive mode
  toggleImmersiveMode() {
    this.container.classList.toggle('vibero-immersive-mode');
    const isImmersive = this.container.classList.contains('vibero-immersive-mode');
    console.log('Immersive mode:', isImmersive ? 'ON' : 'OFF');
  }

  // Toggle focus mode (extra immersive)
  toggleFocusMode() {
    this.container.classList.toggle('vibero-focus-mode');
    const isFocus = this.container.classList.contains('vibero-focus-mode');
    console.log('Focus mode:', isFocus ? 'ON' : 'OFF');
  }

  // Event handler for section navigation
  _onSectionNavigate(data) {
    console.log('Navigating to section:', data);
    
    // Scroll to section (implement based on your PDF rendering)
    if (data.page) {
      const pageElement = this.pdfViewer.querySelector(`[data-page-number="${data.page}"]`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Cleanup
  destroy() {
    if (this.annotationLayer) {
      this.annotationLayer.destroy();
    }
    if (this.sectionNavigator) {
      this.sectionNavigator.destroy();
    }
  }
}

/**
 * Example usage and demo data
 */
export function createViberoDemo() {
  // Initialize reader
  const container = document.getElementById('pdf-container');
  const reader = new ViberoReader(container, {
    locale: 'zh-CN',
    enableAnnotations: true,
    enableNavigation: true,
    enableImmersiveMode: true,
    navigationPosition: 'both'
  });

  // Load PDF
  reader.loadPDF('/path/to/document.pdf');

  // Add sections (document outline)
  const sections = [
    {
      id: 'intro',
      title: 'Introduction',
      type: 'introduction',
      page: 1,
      level: 0
    },
    {
      id: 'background',
      title: 'Background',
      type: 'section',
      page: 2,
      level: 0,
      children: [
        {
          id: 'related-work',
          title: 'Related Work',
          type: 'subsection',
          page: 3,
          level: 1
        }
      ]
    },
    {
      id: 'methodology',
      title: 'Methodology',
      type: 'section',
      page: 5,
      level: 0,
      children: [
        {
          id: 'data-collection',
          title: 'Data Collection',
          type: 'subsection',
          page: 6,
          level: 1
        },
        {
          id: 'analysis',
          title: 'Analysis',
          type: 'subsection',
          page: 8,
          level: 1
        }
      ]
    },
    {
      id: 'results',
      title: 'Results',
      type: 'section',
      page: 10,
      level: 0
    },
    {
      id: 'conclusion',
      title: 'Conclusion',
      type: 'conclusion',
      page: 15,
      level: 0
    }
  ];

  reader.setSections(sections);

  // Add annotations (AI-generated sticky notes)
  const annotations = [
    {
      id: 'ann-1',
      x: 100,
      y: 150,
      type: 'translation',
      content: 'Machine learning is a subset of artificial intelligence.',
      translation: '机器学习是人工智能的一个子集。',
      aiExplanation: `
        <p>机器学习（Machine Learning）是人工智能的核心技术之一。</p>
        <h4>核心概念：</h4>
        <ul>
          <li><strong>监督学习</strong>：使用标注数据训练模型</li>
          <li><strong>无监督学习</strong>：从未标注数据中发现模式</li>
          <li><strong>强化学习</strong>：通过奖励机制学习最优策略</li>
        </ul>
        <p>机器学习使计算机能够从数据中自动学习和改进，而无需显式编程。</p>
      `,
      page: 1,
      reference: 'Section 1.1, Page 1'
    },
    {
      id: 'ann-2',
      x: 250,
      y: 300,
      type: 'explanation',
      content: 'Neural networks are inspired by biological neural networks.',
      translation: '神经网络受生物神经网络启发。',
      aiExplanation: `
        <p>人工神经网络（Artificial Neural Networks, ANN）模仿人脑神经元的工作方式。</p>
        <h4>关键组成：</h4>
        <ul>
          <li><strong>输入层</strong>：接收原始数据</li>
          <li><strong>隐藏层</strong>：进行特征提取和转换</li>
          <li><strong>输出层</strong>：产生最终预测结果</li>
        </ul>
        <p>通过反向传播算法，神经网络可以自动调整权重以最小化预测误差。</p>
      `,
      page: 2,
      reference: 'Section 2.3, Page 2'
    },
    {
      id: 'ann-3',
      x: 400,
      y: 200,
      type: 'concept',
      content: 'Gradient descent is an optimization algorithm.',
      translation: '梯度下降是一种优化算法。',
      aiExplanation: `
        <p>梯度下降（Gradient Descent）是机器学习中最常用的优化算法。</p>
        <h4>工作原理：</h4>
        <ol>
          <li>计算损失函数对参数的梯度</li>
          <li>沿着梯度的反方向更新参数</li>
          <li>重复直到收敛</li>
        </ol>
        <p>学习率（learning rate）是控制每次更新步长的关键超参数。</p>
        <pre>θ = θ - α * ∇J(θ)</pre>
      `,
      page: 3,
      reference: 'Section 3.1, Page 3'
    },
    {
      id: 'ann-4',
      x: 150,
      y: 450,
      type: 'question',
      content: 'What is overfitting?',
      translation: '什么是过拟合？',
      aiExplanation: `
        <p>过拟合（Overfitting）是机器学习中的常见问题。</p>
        <h4>表现：</h4>
        <ul>
          <li>模型在训练集上表现很好</li>
          <li>但在测试集上表现很差</li>
          <li>模型记住了训练数据的噪声</li>
        </ul>
        <h4>解决方法：</h4>
        <ul>
          <li>增加训练数据</li>
          <li>使用正则化（L1/L2）</li>
          <li>Dropout</li>
          <li>Early stopping</li>
          <li>数据增强</li>
        </ul>
      `,
      page: 5,
      reference: 'Section 4.2, Page 5'
    }
  ];

  reader.addAnnotations(annotations);

  // Return reader instance for further control
  return reader;
}

/**
 * Quick start function for easy integration
 */
export function initViberoReader(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return null;
  }

  return new ViberoReader(container, options);
}

// Auto-initialize if data attributes are present
document.addEventListener('DOMContentLoaded', () => {
  const autoInitContainers = document.querySelectorAll('[data-vibero-reader]');
  
  autoInitContainers.forEach(container => {
    const options = {
      locale: container.dataset.locale || 'zh-CN',
      enableAnnotations: container.dataset.annotations !== 'false',
      enableNavigation: container.dataset.navigation !== 'false',
      enableImmersiveMode: container.dataset.immersive !== 'false',
      navigationPosition: container.dataset.navPosition || 'both'
    };

    new ViberoReader(container, options);
  });
});
