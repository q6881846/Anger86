import json

SRC = r"C:/Users/Administrator/Desktop/灵感小说写作/mowen-vite/server/prompt-templates.json"
OUT = r"C:/Users/Administrator/Desktop/提示词清单.md"

with open(SRC, encoding="utf-8") as f:
    data = json.load(f)

steps = sorted(data.values(), key=lambda s: s.get("id", 0))

lines = []
lines.append("# 墨文 · 提示词清单\n")
lines.append(f"> 共 **{len(steps)}** 个生成模块，导出自 `server/prompt-templates.json`。")
lines.append("> 提示词中的变量以双花括号表示，如 `{{idea}}`；生成时由前端注入实际内容。")
lines.append("> 输出类型说明：`json`=结构化输出、`stream`=流式正文、`markdown`=普通文本。\n")
lines.append("---\n")

for s in steps:
    sid = s.get("id")
    name = s.get("name", "")
    otype = s.get("outputType", "")
    vars_ = s.get("variables", []) or []
    system = (s.get("system", "") or "").strip()
    user = s.get("user", "") or ""
    lines.append(f"## step{sid} · {name}\n")
    lines.append(f"- **模块 ID**：{sid}")
    lines.append(f"- **输出类型**：{otype}")
    if vars_:
        lines.append("- **变量**：" + "、".join(f"`{{{{{v}}}}}`" for v in vars_))
    else:
        lines.append("- **变量**：（无）")
    lines.append("")
    if system:
        lines.append("### System 提示词\n")
        lines.append("~~~")
        lines.append(system)
        lines.append("~~~\n")
    lines.append("### User 提示词\n")
    lines.append("~~~")
    lines.append(user)
    lines.append("~~~\n")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"OK: 已重新打包 {len(steps)} 个模块 -> {OUT}")
