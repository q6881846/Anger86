#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把审查所需的核心文件汇总成 审查文件清单.md 输出到桌面。
运行时读取最新文件内容，避免导出陈旧/不一致的版本。"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP = r"C:\Users\Administrator\Desktop"
OUT = os.path.join(DESKTOP, "审查文件清单.md")

# (相对项目根的路径, 说明, 是否必发)
FILES = [
    ("package.json", "根目录依赖与脚本配置", True),
    ("vite.config.ts", "Vite 构建 / 代理 / 安全扫描插件", True),
    ("tailwind.config.ts", "Tailwind 主题配置（已清理 indigo2）", True),
    ("src/main.tsx", "前端入口：安全自检、HashRouter、ErrorBoundary", True),
    ("src/App.tsx", "路由与全局组件挂载（已清理 isPipeline 死代码）", True),
    ("src/index.css", "全局样式（已清理 --indigo2 变量）", True),
    ("src/lib/store/novelGenesis.ts", "Zustand store：load 并发锁、自动保存 try/catch", True),
    ("src/lib/security-check.ts", "前端安全自检（main.tsx 引用）", False),
    ("src/components/ErrorBoundary.tsx", "错误边界组件", False),
    ("src/lib/db/stepOutputs.ts", "步骤输出存取（novelGenesis 引用）", False),
    ("src/routes/ArchitecturePage.tsx", "架构页（复杂页面示例 1）", False),
    ("src/routes/WritingPage.tsx", "写作页（复杂页面示例 2）", False),
    ("src/routes/InspirationPage.tsx", "灵感页（复杂页面示例 3）", False),
]


def read_text(rel):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        return f"（文件不存在：{rel}）"
    with open(p, "r", encoding="utf-8") as f:
        return f.read()


def main():
    out = ["# 审查文件清单（mowen-vite）", ""]
    out.append("> 汇总核心配置 + 入口 + 关键模块的最新代码，供独立审查使用。")
    out.append("> 生成方式：运行 `python scripts/export_review_files.py`（读取最新文件）。")
    out.append("")
    for rel, desc, required in FILES:
        content = read_text(rel).rstrip("\n")
        ext = os.path.splitext(rel)[1].lstrip(".")
        tag = "【必发】" if required else "【建议】"
        out.append(f"## {tag} {rel}")
        out.append("")
        out.append(f"> {desc}")
        out.append("")
        out.append(f"```{ext}")
        out.append(content)
        out.append("```")
        out.append("")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("written:", OUT)


if __name__ == "__main__":
    main()
