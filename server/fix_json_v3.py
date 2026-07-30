import json

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"
backup_path = path + ".backup2"

with open(backup_path, "r", encoding="utf-8") as f:
    raw = f.read()


def fix_json_quotes(raw):
    """Fix unescaped double quotes inside JSON string values.

    Strategy: Track whether we're inside a JSON string. When inside a string,
    a " is only a closing delimiter if it's followed by (optional ws) then ,}] or :
    Otherwise it's an unescaped quote inside the value -> replace with 「 or 」.
    """
    result = []
    i = 0
    n = len(raw)
    inside_string = False
    replacements = 0

    while i < n:
        ch = raw[i]

        if ch == "\\" and inside_string:
            # Escaped character - copy both chars
            result.append(ch)
            if i + 1 < n:
                result.append(raw[i + 1])
                i += 2
            else:
                i += 1
            continue

        if ch == '"':
            if not inside_string:
                # Opening a string (key or value)
                inside_string = True
                result.append(ch)
                i += 1
                continue
            else:
                # Inside a string - check if this is the closing delimiter
                # Look ahead past whitespace
                j = i + 1
                while j < n and raw[j] in " \t\n\r":
                    j += 1
                next_meaningful = raw[j] if j < n else ""

                if next_meaningful in ",}]" or next_meaningful == ":":
                    # This is a closing delimiter
                    inside_string = False
                    result.append(ch)
                    i += 1
                    continue
                else:
                    # This is an unescaped quote inside the string value
                    # Determine opening or closing
                    prev_char = raw[i - 1] if i > 0 else ""
                    if ord(prev_char) > 127:
                        # After Chinese char -> closing quote
                        result.append("」")
                    else:
                        # Opening quote
                        result.append("「")
                    replacements += 1
                    i += 1
                    continue

        result.append(ch)
        i += 1

    print(f"Made {replacements} replacements")
    return "".join(result)


fixed = fix_json_quotes(raw)

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
    print(f"\nContext around error:")
    print(repr(fixed[max(0, e.pos - 80) : e.pos + 80]))
