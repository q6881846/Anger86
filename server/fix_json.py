import json
import shutil

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"
backup = path + ".backup"

# Backup first
shutil.copy2(path, backup)
print(f"Backup created: {backup}")

# Read raw
with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

# Check if JSON is valid
try:
    data = json.loads(raw)
    print("JSON is valid!")

    # If valid, just update steps 6-8
    data["step6"]["name"] = "优化地理环境"
    data["step6"]["user"] = (
        '创意：{{idea}}\n标签：{{tags}}\n世界时代背景设定：{{world}}\n地理与势力分布：{{currentContent}}\n\n你作为网文世界观架构师，对以下"背景环境设定"进行审校和补全。\n\n## 检查清单（逐项检查，缺什么补什么）\n\n- [ ] 是否有3-5个具体的地名/场景名？（每个附一句话特征描述，不能只是"北方""南方"这种模糊方位）\n- [ ] 各势力/角色群体之间的关系是否明确？（谁和谁敌对、谁和谁结盟、谁中立，不能只是罗列名字）\n- [ ] 主角起步位置是否标注？\n- [ ] 是否有"禁区""秘境""关键地点"等能推动剧情的特殊场所？\n- [ ] 地理环境是否和小说类型匹配？（玄幻要有修仙宗门/秘境，都市要有城市/商圈，校园要有学校/社团）\n\n## 输出规则\n\n1. 只输出补充和修正后的新版本，不要保留检查清单本身\n2. 已经写得好的内容原样保留，不要改写\n3. 只补充缺失的部分，不重复已有内容\n4. 总字数控制在200-300字\n5. 禁止英文'
    )

    data["step7"]["user"] = (
        '创意：{{idea}}\n标签：{{tags}}\n世界时代背景设定：{{world}}\n地理与势力分布：{{geography}}\n核心法则 / 金手指：{{currentContent}}\n\n你作为网文世界观架构师，对以下"核心法则设定"进行审校和补全。\n\n## 检查清单（逐项检查，缺什么补什么）\n\n### 通用检查（所有类型必查）\n- [ ] 核心规则是否清晰？（读者能不能用一句话说清"这本书的玩法是什么"）\n- [ ] 主角的核心优势是什么？（金手指/信息差/特殊身份/性格优势，必须有）\n- [ ] 主角的限制/代价是什么？（没有代价的金手指没有张力）\n- [ ] 规则是否有"漏洞"可以被主角利用？（规则漏洞是爽点的核心来源之一）\n\n### 有力量体系的类型（玄幻/修仙/高武/末世/游戏等）额外检查\n- [ ] 等级划分是否列出具体名称？（不能只写"九重境界"，要写出每级叫什么）\n- [ ] 每个等级的战力差距是否有参照物？（如"筑基可以一拳碎石，金丹可以一掌劈山"）\n- [ ] 升级条件和瓶颈是否明确？\n\n### 无力量体系的类型（言情/都市/悬疑/年代等）额外检查\n- [ ] 核心矛盾的规则是否写清？（如"婚姻法规定XX""公司晋升需要XX条件"）\n- [ ] 关键资源/筹码是什么？（钱/人脉/证据/秘密/合同，主角拿什么和对手博弈）\n- [ ] 社会规则对主角的限制是什么？（为什么主角不能直接掀桌子）\n\n### 穿越/重生类额外检查\n- [ ] 前世信息差的具体范围是否明确？（知道哪些未来事件、不知道哪些）\n- [ ] 信息差有没有时效性？（是不是越用越不准）\n- [ ] 有没有"蝴蝶效应"导致信息失效的机制？\n\n## 输出规则\n\n1. 只输出补充和修正后的新版本，不要保留检查清单本身\n2. 已经写得好的内容原样保留，不要改写\n3. 只补充缺失的部分，不重复已有内容\n4. 总字数控制在200-300字\n5. 禁止英文'
    )

    data["step8"]["user"] = (
        '创意：{{idea}}\n标签：{{tags}}\n时代背景：{{worldContext}}\n地理环境和势力分布：{{geography}}\n法则和金手指：{{rules}}\n\n你作为番茄平台资深角色策划，基于世界观推导核心角色。\n\n## 推导原则\n1. 每个角色必须服务于"冲突"或"爽点"，不能是"为了存在而存在"\n2. 角色的能力必须在{{rules}}框架内，或明确利用{{rules}}的漏洞\n3. 角色的身份必须在{{geography}}的势力分布中有落点\n4. 角色之间的关系必须形成"张力网"，不是孤立存在\n\n## 角色数量与分工（至少4位核心角色，如有必要可补充更多重要配角）\n1. **主角**：必须有1个"想隐藏的秘密"和1个"不得不暴露的契机"\n2. **核心对手**：与主角有1个"共同目标"但"手段对立"，不是纯恶\n3. **关键盟友**：有1个"背叛主角的合理动机"，但未必真背叛\n4. **情感锚点**：让主角"在乎"的人，但这份在乎会成为主角的软肋\n\n## 输出格式（JSON数组）\n```json\n[\n  {\n    "name": "角色名",\n    "role": "主角/核心对手/关键盟友/情感锚点/配角/功能性反派/龙套",\n    "identity": {\n      "surface": "表面身份（他人眼中的标签，如：西街铁匠）",\n      "actual": "实际身份（隐藏的一面，如：元婴大佬）",\n      "faction": "所属势力（引用{{geography}}中的势力名）"\n    },\n    "core_desire": "最想要什么（具体可衡量，如：三年内买到回故乡的船票）",\n    "inner_conflict": "欲望与恐惧的冲突（如：想复仇却怕变成仇人那样的人）",\n    "secret": "隐藏的秘密（主角必须有，其他角色可选）",\n    "exposure_trigger": "秘密暴露的契机（主角必须有，其他角色可选）",\n    "abilities": [\n      {\n        "name": "能力名",\n        "source": "能力来源：法则内/法则漏洞/势力传承/天生异禀",\n        "limitation": "能力限制（必须有）",\n        "exploitable": "是否可被主角利用（是/否）"\n      }\n    ],\n    "relations": [\n      {\n        "target": "关联角色名",\n        "surface": "表面关系（如：师徒）",\n        "actual": "实际关系（如：互相利用）",\n        "tension": "关系张力来源（如：师父知道主角的秘密）"\n      }\n    ],\n    "plot_function": "剧情功能：推动主线/制造冲突/提供信息/情感催化/世界观展示/爽点释放",\n    "arc_direction": "成长方向：从XX到XX（如：从逃避到直面）",\n    "death_flag": "是否可领盒饭（是/否/待定），及触发条件"\n  }\n]\n```'
    )

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("All steps updated successfully!")
    print(f"Step 6 user: {len(data['step6']['user'])} chars")
    print(f"Step 7 user: {len(data['step7']['user'])} chars")
    print(f"Step 8 user: {len(data['step8']['user'])} chars")

except json.JSONDecodeError as e:
    print(f"JSON parse error at line {e.lineno}, col {e.colno}: {e.msg}")
    print(f"Error at: {raw[max(0, e.pos - 50) : e.pos + 50]}")
