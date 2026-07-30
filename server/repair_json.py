import json
import re

path = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\server\prompt-templates.json"

with open(path, "r", encoding="utf-8") as f:
    raw = f.read()

# Find where the JSON breaks - look for the problematic line
lines = raw.split("\n")
print(f"Total lines: {len(lines)}")

# The issue is at line 46 - let's see what's around it
for i in range(40, 50):
    if i < len(lines):
        print(f"Line {i + 1}: {lines[i][:100]}")

# Try to find and fix the issue
# The problem is likely that step5 user contains unescaped quotes
# Let's use a regex to find and fix the step5 user content

# First, let's find step5
step5_start = raw.find('"step5"')
step6_start = raw.find('"step6"')

if step5_start != -1 and step6_start != -1:
    step5_content = raw[step5_start:step6_start]
    print(f"\nStep5 content length: {len(step5_content)}")
    print(f"Step5 content preview: {step5_content[:200]}")

    # Check if there are issues with quotes
    quote_count = step5_content.count('"')
    print(f"Quote count in step5: {quote_count}")
