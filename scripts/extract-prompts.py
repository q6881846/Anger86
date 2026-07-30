import re
import json
import os

with open("/tmp/novel_prompts.txt", "r", encoding="utf-8") as f:
    lines = [l.strip() for l in f.readlines()]

# 解析格式: " 999: 内容"
paragraphs = []
for line in lines:
    m = re.match(r"\s*\d+:\s+(.*)", line)
    if m:
        paragraphs.append(m.group(1))

# 合并所有段落为一个长文本，然后用正则分割
full_text = "\n".join(paragraphs)

# 20 条 Prompt 的正则匹配模式
prompt_patterns = [
    (1, r"1\s*、\s*AI灵感搅拌"),
    (2, r"2\s*、\s*标签选择"),
    (3, r"3\s*、\s*AI优化灵感"),
    (4, r"4\s*、\s*一键生成世界观"),
    (5, r"5\s*、\s*优化时代背景"),
    (6, r"6\s*、\s*优化地理环境"),
    (7, r"7\s*、\s*优化核心法则"),
    (8, r"8\s*、\s*生成核心角色"),
    (9, r"9\s*、\s*生成配角"),
    (10, r"10\s*、\s*主线脉络"),
    (11, r"11\s*、\s*优化主线脉络"),
    (12, r"12\s*、\s*生成详细大纲"),
    (13, r"13\s*、\s*优化详细大纲"),
    (14, r"14\s*、\s*编排与生成"),
    (15, r"15\s*、\s*生成大纲"),
    (16, r"16\s*、\s*正文智能写作"),
    (17, r"17\s*、\s*智能续写"),
    (18, r"18\s*、\s*正文智能校对"),
    (19, r"19\s*、\s*润色去AI"),
    (20, r"20\s*、\s*状态同步"),
]

# 找到每个 prompt 的位置
positions = []
for step_id, pattern in prompt_patterns:
    m = re.search(pattern, full_text)
    if m:
        positions.append((step_id, pattern, m.start()))
    else:
        print(f"Warning: pattern not found: {pattern}")

# 按位置排序
positions.sort(key=lambda x: x[2])

prompts = {}
for i, (step_id, pattern, start) in enumerate(positions):
    end = positions[i + 1][2] if i + 1 < len(positions) else len(full_text)
    chunk = full_text[start:end].strip()

    # 提取标题
    title_match = re.match(r"\d+\s*、\s*(.+?)(?:\n|$)", chunk)
    name = title_match.group(1).strip() if title_match else f"步骤{step_id}"

    # 去掉标题行得到正文
    body = chunk[title_match.end() :].strip() if title_match else chunk

    # 提取变量
    vars_found = re.findall(r"\{\{(\w+)\}\}", body)
    variables = sorted(set(vars_found))

    # 判断输出类型
    output_type = (
        "stream"
        if step_id in [16, 17, 19]
        else "json"
        if ("JSON" in body.upper() or "```json" in body)
        else "markdown"
    )

    # 尝试分离 system 和 user
    system_prompt = ""
    user_prompt = body

    if "[系统提示词]" in body:
        parts = body.split("[系统提示词]", 1)
        if len(parts) > 1:
            sys_part = parts[1]
            user_marker = "[用户消息]"
            if user_marker in sys_part:
                sys_end = sys_part.find(user_marker)
                system_prompt = sys_part[:sys_end].strip()
                user_prompt = user_marker + sys_part[sys_end + len(user_marker) :]
            else:
                system_prompt = sys_part.strip()
                user_prompt = ""

    prompts[f"step{step_id}"] = {
        "id": step_id,
        "name": name,
        "system": system_prompt,
        "user": user_prompt,
        "variables": variables,
        "outputType": output_type,
    }

# 输出
output_dir = "C:/Users/Administrator/Desktop/灵感小说写作/mowen-vite/server"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "prompt-templates.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(prompts, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(prompts)} prompts to {output_path}")
for k, v in prompts.items():
    print(
        f"  {k}: {v['name']} (vars: {len(v['variables'])}, output: {v['outputType']})"
    )
