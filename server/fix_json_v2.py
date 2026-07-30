import json
import re

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

# Read from backup2 (the state before our bad fix)
backup_path = path + ".backup2"

with open(backup_path, "r", encoding="utf-8") as f:
    raw = f.read()

print(f"Backup2 length: {len(raw)}")

# Strategy: We need to fix unescaped ASCII double quotes inside JSON string values.
# The JSON structure uses " as delimiters. Inside string values, any " must be escaped as \".
# But we have cases like:  "时代背景设定"  where the " is meant to be a quote in Chinese text.
#
# Better strategy: Parse the file more carefully. We know the JSON structure is:
# {
#   "step1": { "id": 1, "name": "...", "system": "...", "user": "...", "variables": [...] },
#   ...
# }
#
# We can use regex to find the "user" and "system" field values and fix quotes inside them.

# Actually, the cleanest approach: manually find each step's user/system field
# and replace unescaped " with 「 / 」 inside the values.

# Let's try a different approach: find all " that appear to be inside string values
# by checking if they're NOT acting as JSON delimiters.
#
# A JSON delimiter " is followed by : , ] } or preceded by : , [ {
# (possibly with whitespace between)

# Actually the simplest reliable approach:
# 1. Split into tokens manually
# 2. When inside a string value, replace " that is surrounded by non-JSON chars

# Let me try yet another approach: use regex to find the 3 string fields (name, system, user)
# and replace " inside them

# Pattern: "field": "value"  where value may contain unescaped "
# We need to match from "field": " to the closing " that is followed by , or } or newline+}


def fix_json_string_quotes(raw):
    """Fix unescaped double quotes inside JSON string values."""

    result = []
    i = 0
    n = len(raw)

    while i < n:
        ch = raw[i]

        # When we see a ", it could be:
        # 1. Start of a JSON key/value string -> keep as is, find the matching end
        # 2. An unescaped quote inside a string value -> replace with 「 or 」

        if ch == '"':
            # Check if this is a JSON string delimiter
            # A delimiter " is typically preceded by { , : [ or whitespace after those
            # or at start of line with whitespace

            # Look backwards to determine context
            j = i - 1
            while j >= 0 and raw[j] in " \t\n\r":
                j -= 1

            prev_meaningful = raw[j] if j >= 0 else ""

            # If preceded by { , : [ then this is a string start (JSON delimiter)
            if prev_meaningful in "{,:[":
                # This is a JSON string opening delimiter - keep it
                result.append(ch)
                i += 1
                continue

            # Otherwise, check if it's followed by : (key) or , } ] (string end)
            # Look ahead
            j2 = i + 1
            while j2 < n and raw[j2] in " \t\n\r":
                j2 += 1
            next_meaningful = raw[j2] if j2 < n else ""

            if next_meaningful in ":":
                # This is a key - keep it
                result.append(ch)
                i += 1
                continue

            if next_meaningful in ",}]":
                # This could be a string closing delimiter
                # But it could also be an unescaped quote inside a value followed by a Chinese char then ,
                # Check if the char right before " is non-ASCII (Chinese)
                if ord(prev_meaningful) > 127:
                    # Likely an unescaped quote inside Chinese text -> replace with 」
                    result.append("」")
                    i += 1
                    continue
                else:
                    # Likely a real closing delimiter
                    result.append(ch)
                    i += 1
                    continue

            # If we get here, the " is inside a string value (surrounded by text)
            # Determine if it's an opening or closing quote
            if ord(prev_meaningful) > 127:
                # After Chinese char -> closing quote
                result.append("」")
            else:
                # Before Chinese char -> opening quote
                result.append("「")
            i += 1
            continue

        result.append(ch)
        i += 1

    return "".join(result)


fixed = fix_json_string_quotes(raw)
print(f"Fixed length: {len(fixed)}")

# Write and test
with open(path, "w", encoding="utf-8") as f:
    f.write(fixed)

try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("JSON parse SUCCESS!")
    print(f"Templates: {list(data.keys())}")
    for key in sorted(data.keys()):
        print(
            f"  {key}: {data[key]['name']} - user length: {len(data[key].get('user', ''))}"
        )
except json.JSONDecodeError as e:
    print(f"JSON parse FAILED at line {e.lineno}, col {e.colno}")
    lines = fixed.split("\n")
    if e.lineno <= len(lines):
        print(f"Line {e.lineno}: {lines[e.lineno - 1][:150]}")
    # Show context
    print(f"\nContext around error:")
    print(repr(fixed[max(0, e.pos - 80) : e.pos + 80]))
