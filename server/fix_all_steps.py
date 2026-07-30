import json

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)

# === 1. Fix Step 1: Remove anti-add rules ===
step1_user = data["step1"]["user"]
# Keep only the first line (before ## 反添加规则)
if "## 反添加规则" in step1_user:
    step1_user = step1_user.split("## 反添加规则")[0].rstrip()
    data["step1"]["user"] = step1_user
    print("Step 1: Removed anti-add rules")
    print(f"  New user: {step1_user[:100]}")
else:
    print("Step 1: No anti-add rules found (already clean)")

# === 2. Fix Step 3: Remove anti-add rules ===
step3_user = data["step3"]["user"]
if "## 反添加规则" in step3_user:
    # Find the position and keep everything before it
    idx = step3_user.index("## 反添加规则")
    # Also remove the "## 核心原则" section that follows
    step3_user = step3_user[:idx].rstrip()
    data["step3"]["user"] = step3_user
    print("\nStep 3: Removed anti-add rules")
    print(f"  New user: {step3_user[:100]}")
else:
    print("\nStep 3: No anti-add rules found (already clean)")

# === 3. Fix Step 5: Fix incorrect 「」 replacements ===
step5_user = data["step5"]["user"]
# The pattern is: Chinese char + 」 + Chinese text + 」 - first 」 should be 「
# Fix specific patterns
fixes_step5 = [
    ("对以下」时代背景设定」进行", "对以下「时代背景设定」进行"),
    ("只说」落后」或」发达」", "只说「落后」或「发达」"),
    ("只说」封建社会」或」末世」", "只说「封建社会」或「末世」"),
]
for old, new in fixes_step5:
    if old in step5_user:
        step5_user = step5_user.replace(old, new)
        print(f"\nStep 5: Fixed '{old[:20]}...' -> '{new[:20]}...'")

data["step5"]["user"] = step5_user

# === 4. Fix Step 6: Split merged step6/step7 content ===
step6_user = data["step6"]["user"]
# Current step6 has BOTH step6 and step7 content merged:
# "创意：{{idea}}\n标签：{{tags}}\n世界时代背景设定：{{world}}\n地理与势力分布：{{currentContent}}\n你作为网文世界观架构师，根据上述内容丰满和扩写上述「地理与势力分布」。\n具体化地名、地貌特征，明确各方势力的关系（敌对/结盟），给出一段更详实、更真实性、有画面感的「地理与势力分布」设定。\n优化核心法则\n创意：{{idea}}\n标签：{{tags}}\n世界时代背景设定：{{world}}\n地理与势力分布：{{geography}}\n核心法则 / 金手指：{{currentContent}}\n你作为网文世界观架构师，请根据上述内容丰满和扩写上述「核心法则 / 金手指」。\n可以补充力量体系的等级划分，补充金手指的具体限制或升级条件，使其更具逻辑性，输出一段更真实完整的「核心法则 / 金手指」设定。"

# Split at "优化核心法则" - everything before is step6, everything after is step7
if "优化核心法则" in step6_user:
    parts = step6_user.split("优化核心法则")
    step6_new = parts[0].rstrip()
    step7_new = parts[1].lstrip()

    data["step6"]["user"] = step6_new
    print(f"\nStep 6: Split from merged content")
    print(f"  New user: {step6_new[:100]}")

    # step7_new starts with "创意：{{idea}}\n..." which is the step7 content
    # But step7 already has its own content - let's check if it matches
    current_step7 = data["step7"]["user"]
    if step7_new.strip() == current_step7.strip():
        print("Step 7: Already correct (matches split content)")
    else:
        print(f"Step 7: Current content differs from split content")
        print(f"  Current:  {current_step7[:80]}")
        print(f"  Split:    {step7_new[:80]}")
        # Use the split content as it's the correct step7 content
        data["step7"]["user"] = step7_new
        print(f"  Updated step7 from split")

# === 5. Fix any remaining 」 that should be 「 ===
# Pattern: Chinese char + 」 + Chinese char (should be 「)
import re

for step_key in data:
    user = data[step_key]["user"]
    # Find pattern: non-ASCII char followed by 」 followed by non-ASCII char
    # This means 」 is used as opening quote -> should be 「
    fixed = re.sub(r"(?<=[\u4e00-\u9fff])」(?=[\u4e00-\u9fff])", "「", user)
    if fixed != user:
        data[step_key]["user"] = fixed
        print(f"\n{step_key}: Fixed incorrect 」 -> 「 (opening quotes)")

# Write fixed JSON
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Verify
with open(path, "r", encoding="utf-8") as f:
    verify = json.load(f)

print(f"\n=== Verification ===")
print(f"JSON valid: True")
print(f"Steps: {sorted(verify.keys())}")
for key in sorted(verify.keys(), key=lambda x: int(x.replace("step", ""))):
    print(
        f"  {key}: {verify[key]['name']} - user length: {len(verify[key].get('user', ''))}"
    )
