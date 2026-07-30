path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

# Find all ASCII double quotes and their positions
quotes = []
for i, c in enumerate(raw):
    if ord(c) == 34:  # ASCII double quote
        quotes.append((i, repr(raw[max(0, i - 10) : i + 11])))

print(f"Total ASCII double quotes: {len(quotes)}")
print(f"First 30 quotes with context:")
for i, (pos, ctx) in enumerate(quotes[:30]):
    print(f"  {i}: pos={pos}, context={ctx}")

# Check if count is even/odd in step5 area
# Find step5 start
step5_start = raw.find('"step5"')
step6_start = raw.find('"step6"')
if step5_start != -1 and step6_start != -1:
    step5_quotes = [q for q in quotes if step5_start <= q[0] <= step6_start]
    print(f"\nStep5 area quotes: {len(step5_quotes)}")
    for pos, ctx in step5_quotes[:20]:
        print(f"  pos={pos}, context={ctx}")
