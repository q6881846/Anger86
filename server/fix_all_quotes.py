import json
import re

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

# The problem: unescaped ASCII " inside JSON string values, surrounded by Chinese text
# Strategy: Replace patterns like  ChineseChar"ChineseText"ChineseChar with ChineseChar「ChineseText」ChineseChar
# But we need to be careful not to break JSON structure

# Better approach: find all " that are between non-ASCII chars and replace with 「 / 」

result = []
i = 0
replacements = 0
while i < len(raw):
    ch = raw[i]
    if ch == '"':
        # Check context: is this quote inside a Chinese text value?
        prev_char = raw[i - 1] if i > 0 else ""
        next_char = raw[i + 1] if i + 1 < len(raw) else ""

        # If previous char is non-ASCII (Chinese), this is likely an opening or closing quote in text
        if ord(prev_char) > 127:
            # This is a closing quote -> replace with 」
            result.append("」")
            replacements += 1
            i += 1
            continue
        elif ord(next_char) > 127:
            # This is an opening quote -> replace with 「
            result.append("「")
            replacements += 1
            i += 1
            continue

    result.append(ch)
    i += 1

fixed = "".join(result)
print(f"Made {replacements} replacements")

# Write fixed version
with open(path, "w", encoding="utf-8") as f:
    f.write(fixed)

# Verify
try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("JSON parse SUCCESS!")
    print(f"Templates: {list(data.keys())}")
    for key in data:
        print(f"  {key}: {data[key]['name']}")
except json.JSONDecodeError as e:
    print(f"JSON parse FAILED at line {e.lineno}, col {e.colno}")
    lines = fixed.split("\n")
    if e.lineno <= len(lines):
        print(f"Line {e.lineno}: {lines[e.lineno - 1][:120]}")
