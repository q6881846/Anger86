import json
import re

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

# Fix step6 name (if corrupted) and user
# Step 6 name might have weird characters, fix it
raw = raw.replace('"name": "优化地理环境\n创意：{{idea}}"', '"name": "优化地理环境"')

# The step6 user contains merged content - we need to replace it entirely
# Find the step6 user content from "创意：{{idea}}" to the closing quote before variables
step6_old_pattern = r'("step6": \{\s*"id": 6,\s*"name": "优化地理环境",\s*"system": "",\s*"user": )".*?"(\s*,\s*"variables": \[\s*"currentContent",\s*"geography",\s*"idea",\s*"tags",\s*"world"\s*\])'

step6_new_user = '''"创意：{{idea}}
标签：{{tags}}
世界时代背景设定：{{world}}
地理与势力分布：{{currentContent}}

你作为网文世界观架构师，对以下"背景环境设定"进行审校和补全。

## 检查清单（逐项检查，缺什么补什么）

- [ ] 是否有3-5个具体的地名/场景名？（每个附一句话特征描述，不能只是"北方""南方"这种模糊方位）
- [ ] 各势力/角色群体之间的关系是否明确？（谁和谁敌对、谁和谁结盟、谁中立，不能只是罗列名字）
- [ ] 主角起步位置是否标注？
- [ ] 是否有"禁区""秘境""关键地点"等能推动剧情的特殊场所？
- [ ] 地理环境是否和小说类型匹配？（玄幻要有修仙宗门/秘境，都市要有城市/商圈，校园要有学校/社团）

## 输出规则

1. 只输出补充和修正后的新版本，不要保留检查清单本身
2. 已经写得好的内容原样保留，不要改写
3. 只补充缺失的部分，不重复已有内容
4. 总字数控制在200-300字
5. 禁止英文"'''

# We need to do this carefully - let me use a different approach
# Parse as JSON and rebuild

try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"JSON parse error at line {e.lineno}, col {e.colno}: {e.msg}")
    # Show context
    lines = raw.split("\n")
    if e.lineno <= len(lines):
        print(f"Line {e.lineno}: {lines[e.lineno - 1]}")
    exit(1)

# Fix step6
data["step6"]["name"] = "优化地理环境"
data["step6"]["user"] = """创意：{{idea}}
标签：{{tags}}
世界时代背景设定：{{world}}
地理与势力分布：{{currentContent}}

你作为网文世界观架构师，对以下"背景环境设定"进行审校和补全。

## 检查清单（逐项检查，缺什么补什么）

- [ ] 是否有3-5个具体的地名/场景名？（每个附一句话特征描述，不能只是"北方""南方"这种模糊方位）
- [ ] 各势力/角色群体之间的关系是否明确？（谁和谁敌对、谁和谁结盟、谁中立，不能只是罗列名字）
- [ ] 主角起步位置是否标注？
- [ ] 是否有"禁区""秘境""关键地点"等能推动剧情的特殊场所？
- [ ] 地理环境是否和小说类型匹配？（玄幻要有修仙宗门/秘境，都市要有城市/商圈，校园要有学校/社团）

## 输出规则

1. 只输出补充和修正后的新版本，不要保留检查清单本身
2. 已经写得好的内容原样保留，不要改写
3. 只补充缺失的部分，不重复已有内容
4. 总字数控制在200-300字
5. 禁止英文"""

# Fix step7
data["step7"]["user"] = """创意：{{idea}}
标签：{{tags}}
世界时代背景设定：{{world}}
地理与势力分布：{{geography}}
核心法则 / 金手指：{{currentContent}}

你作为网文世界观架构师，对以下"核心法则设定"进行审校和补全。

## 检查清单（逐项检查，缺什么补什么）

### 通用检查（所有类型必查）
- [ ] 核心规则是否清晰？（读者能不能用一句话说清"这本书的玩法是什么"）
- [ ] 主角的核心优势是什么？（金手指/信息差/特殊身份/性格优势，必须有）
- [ ] 主角的限制/代价是什么？（没有代价的金手指没有张力）
- [ ] 规则是否有"漏洞"可以被主角利用？（规则漏洞是爽点的核心来源之一）

### 有力量体系的类型（玄幻/修仙/高武/末世/游戏等）额外检查
- [ ] 等级划分是否列出具体名称？（不能只写"九重境界"，要写出每级叫什么）
- [ ] 每个等级的战力差距是否有参照物？（如"筑基可以一拳碎石，金丹可以一掌劈山"）
- [ ] 升级条件和瓶颈是否明确？

### 无力量体系的类型（言情/都市/悬疑/年代等）额外检查
- [ ] 核心矛盾的规则是否写清？（如"婚姻法规定XX""公司晋升需要XX条件"）
- [ ] 关键资源/筹码是什么？（钱/人脉/证据/秘密/合同，主角拿什么和对手博弈）
- [ ] 社会规则对主角的限制是什么？（为什么主角不能直接掀桌子）

### 穿越/重生类额外检查
- [ ] 前世信息差的具体范围是否明确？（知道哪些未来事件、不知道哪些）
- [ ] 信息差有没有时效性？（是不是越用越不准）
- [ ] 有没有"蝴蝶效应"导致信息失效的机制？

## 输出规则

1. 只输出补充和修正后的新版本，不要保留检查清单本身
2. 已经写得好的内容原样保留，不要改写
3. 只补充缺失的部分，不重复已有内容
4. 总字数控制在200-300字
5. 禁止英文"""

# Fix step8 - keep the original JSON format but make sure it's clean
data["step8"]["user"] = """创意：{{idea}}
标签：{{tags}}
时代背景：{{worldContext}}
地理环境和势力分布：{{geography}}
法则和金手指：{{rules}}

你作为番茄平台资深角色策划，基于世界观推导核心角色。

## 推导原则
1. 每个角色必须服务于"冲突"或"爽点"，不能是"为了存在而存在"
2. 角色的能力必须在{{rules}}框架内，或明确利用{{rules}}的漏洞
3. 角色的身份必须在{{geography}}的势力分布中有落点
4. 角色之间的关系必须形成"张力网"，不是孤立存在

## 角色数量与分工（至少4位核心角色，如有必要可补充更多重要配角）
1. **主角**：必须有1个"想隐藏的秘密"和1个"不得不暴露的契机"
2. **核心对手**：与主角有1个"共同目标"但"手段对立"，不是纯恶
3. **关键盟友**：有1个"背叛主角的合理动机"，但未必真背叛
4. **情感锚点**：让主角"在乎"的人，但这份在乎会成为主角的软肋

## 输出格式（JSON数组）
```json
[
  {
    "name": "角色名",
    "role": "主角/核心对手/关键盟友/情感锚点/配角/功能性反派/龙套",
    "identity": {
      "surface": "表面身份（他人眼中的标签，如：西街铁匠）",
      "actual": "实际身份（隐藏的一面，如：元婴大佬）",
      "faction": "所属势力（引用{{geography}}中的势力名）"
    },
    "core_desire": "最想要什么（具体可衡量，如：三年内买到回故乡的船票）",
    "inner_conflict": "欲望与恐惧的冲突（如：想复仇却怕变成仇人那样的人）",
    "secret": "隐藏的秘密（主角必须有，其他角色可选）",
    "exposure_trigger": "秘密暴露的契机（主角必须有，其他角色可选）",
    "abilities": [
      {
        "name": "能力名",
        "source": "能力来源：法则内/法则漏洞/势力传承/天生异禀",
        "limitation": "能力限制（必须有）",
        "exploitable": "是否可被主角利用（是/否）"
      }
    ],
    "relations": [
      {
        "target": "关联角色名",
        "surface": "表面关系（如：师徒）",
        "actual": "实际关系（如：互相利用）",
        "tension": "关系张力来源（如：师父知道主角的秘密）"
      }
    ],
    "plot_function": "剧情功能：推动主线/制造冲突/提供信息/情感催化/世界观展示/爽点释放",
    "arc_direction": "成长方向：从XX到XX（如：从逃避到直面）",
    "death_flag": "是否可领盒饭（是/否/待定），及触发条件"
  }
]```"""

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Steps 6-8 fixed successfully.")
print(f"Step 6 user length: {len(data['step6']['user'])}")
print(f"Step 7 user length: {len(data['step7']['user'])}")
print(f"Step 8 user length: {len(data['step8']['user'])}")
