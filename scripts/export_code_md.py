#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把本次会话涉及/修改的源代码文件汇总成 代码清单.md 输出到桌面。
与 export_prompts_md.py 风格一致：可重复运行，读取最新文件内容。"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP = r"C:\Users\Administrator\Desktop"
OUT = os.path.join(DESKTOP, "代码清单.md")

# (相对项目根的路径, 改动说明)
FILES = [
    ("src/App.tsx", "页面路由与全局组件挂载：抽出独立 404 组件、删除 isPipeline 死代码、清理无用 import"),
    ("src/components/NotFoundPage.tsx", "本次新增：独立 404 页面组件，替代 App.tsx 内联 JSX"),
    ("src/lib/store/novelGenesis.ts", "Zustand store：load 增加 module 级并发去重锁；两处自动保存订阅加 try/catch"),
    ("tailwind.config.ts", "删除未被使用的 indigo2 色板（src 零引用，仅为死配置）"),
    ("src/index.css", "删除未被引用的 --indigo2 / --indigo2-bright CSS 变量"),
    ("vite.config.ts", "securityScanPlugin 注释判断改进：基于 key 匹配位置排除行内注释，避免漏报 URL 中真实 key"),
    ("scripts/export_prompts_md.py", "提示词导出脚本（本次新增，便于重复打包提示词）"),
]


def read_text(rel):
    with open(os.path.join(ROOT, rel), "r", encoding="utf-8") as f:
        return f.read()


def main():
    out = ["# 代码清单（mowen-vite）", ""]
    out.append("> 本清单汇总本次会话中新增 / 修改过的源代码文件，便于查看与归档。")
    out.append("> 生成方式：运行 `python scripts/export_code_md.py`（与提示词导出脚本风格一致）。")
    out.append("")
    for rel, desc in FILES:
        content = read_text(rel).rstrip("\n")
        ext = os.path.splitext(rel)[1].lstrip(".")
        out.append(f"## {rel}")
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
