import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * 全局错误边界：捕获子组件树任何渲染错误，防止 LLM 畸形数据导致白屏
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到渲染异常:', error);
    console.error('[ErrorBoundary] 组件栈:', errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 使用项目设计系统配色（墨色暗黑 + 朱色错误 + 靛色按钮）
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] text-white p-6">
            <div className="max-w-lg w-full text-center space-y-6">
              <div className="text-5xl animate-bounce">💥</div>
              
              <h1 className="text-2xl font-bold text-[#e85d68] font-serif">
                页面渲染出错
              </h1>
              
              <p className="text-gray-400 text-sm leading-relaxed">
                系统在渲染过程中遇到意外错误。这通常是因为 AI 返回了无法解析的数据格式，
                或某个步骤的数据发生了损坏。
              </p>

              <div className="bg-[#11162a] border border-[#1e2740] rounded-lg p-4 text-left overflow-auto max-h-48">
                <div className="text-xs text-gray-500 mb-2">错误信息：</div>
                <code className="text-xs text-[#e85d68] whitespace-pre-wrap break-all">
                  {this.state.error?.message || 'Unknown error'}
                </code>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="px-5 py-2 rounded-lg border border-[#7a9ef0] text-[#7a9ef0] hover:bg-[#7a9ef0]/10 transition-colors text-sm"
                >
                  尝试恢复
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-5 py-2 rounded-lg bg-[#7a9ef0] hover:bg-[#5a7ed0] text-white transition-colors text-sm"
                >
                  刷新页面
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
