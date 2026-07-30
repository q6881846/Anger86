import json
import shutil

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"
backup = path + ".backup2"

# Copy current state as backup
shutil.copy2(path, backup)
print(f"Backup saved to {backup}")

with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

print(f"Original length: {len(raw)}")
print(f"Contains U+201C: {chr(0x201C) in raw}")
print(f"Contains U+201D: {chr(0x201D) in raw}")

# Replace ALL Chinese double quotes with 「」 globally
raw_fixed = raw.replace(chr(0x201C), "「").replace(chr(0x201D), "」")

print(f"After replacement length: {len(raw_fixed)}")
print(f"Still contains U+201C: {chr(0x201C) in raw_fixed}")
print(f"Still contains U+201D: {chr(0x201D) in raw_fixed}")

# Write fixed version first
with open(path, "w", encoding="utf-8") as f:
    f.write(raw_fixed)

# Now try to parse
try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("JSON parse SUCCESS!")
    print(f"Templates loaded: {list(data.keys())}")

    # Now update steps
    # Step 4 - keep the anti-add rules that were added earlier
    # Step 5-7 - update to new format (checking style)
    # Step 8 - update to new format

    # Let's check what step4 looks like now
    print(f"\nStep 4 name: {data['step4']['name']}")
    print(f"Step 4 user length: {len(data['step4']['user'])}")
    print(f"Step 4 user first 200: {data['step4']['user'][:200]}")

    # Check if step4 has the old format or new format
    if "---world---" not in data["step4"]["user"]:
        print("Step 4 still has OLD format - needs update")
    else:
        print("Step 4 already has new format")

except json.JSONDecodeError as e:
    print(f"JSON parse FAILED at line {e.lineno}, col {e.colno}")
    # Show context
    lines = raw_fixed.split("\n")
    if e.lineno <= len(lines):
        print(f"Line {e.lineno}: {lines[e.lineno - 1][:100]}")

    # Find the specific issue
    pos = e.pos
    print(f"\nContext around error position {pos}:")
    print(repr(raw_fixed[max(0, pos - 50) : pos + 50]))
