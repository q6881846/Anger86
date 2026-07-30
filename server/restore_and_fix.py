import json
import shutil

src = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json.backup"
dst = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

# Restore from backup
shutil.copy2(src, dst)
print("Restored from backup.")

with open(dst, "r", encoding="utf-8") as f:
    raw = f.read()

# Replace Chinese quotes with 「」 globally
raw = raw.replace(chr(0x201C), "「").replace(chr(0x201D), "」")

# Parse to verify
with open(dst, "w", encoding="utf-8") as f:
    f.write(raw)

try:
    data = json.loads(raw)
    print("JSON valid after replacing quotes!")
except Exception as e:
    print(f"JSON still invalid: {e}")
    exit(1)
