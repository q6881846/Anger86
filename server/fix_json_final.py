import json

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

# The issue is at char 3146, which is in step5 user content
# Let's find what's there
print(f"Char at 3140: {repr(raw[3140:3150])}")
print(f"Char 3146: {repr(raw[3146])}, ord={ord(raw[3146])}")

# Check for Chinese quotes around that area
for i in range(3100, 3200):
    c = raw[i]
    if ord(c) > 127:
        print(f"  pos {i}: {repr(c)} ord={ord(c)}")
