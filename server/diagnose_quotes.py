import json

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

# Find all problematic characters - any non-ASCII character that could be a quote
problematic = set()
for i, ch in enumerate(raw):
    if ord(ch) > 127:
        # Check if it's a quote-like character
        if ch in '""""""""""':
            problematic.add((hex(ord(ch)), ch, i, raw[max(0, i - 20) : i + 20]))

print("Found problematic quote characters:")
for p in problematic:
    print(f"  char={repr(p[1])} code={p[0]} pos={p[2]} context={repr(p[3])}")

# also check for raw ASCII double quotes that aren't escaped properly
issues = []
for i, ch in enumerate(raw):
    if ch == '"' and i > 0:
        prev = raw[i - 1]
        if ord(prev) > 127:
            issues.append((i, raw[max(0, i - 30) : i + 30]))

print(f"\nFound {len(issues)} unescaped ASCII double quotes after non-ASCII chars:")
for pos, ctx in issues[:10]:
    print(f"  pos={pos}: {repr(ctx)}")
