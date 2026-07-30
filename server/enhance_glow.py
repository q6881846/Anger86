import os
import re

ROUTES_DIR = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\src\routes"

# Strategy: Find and enhance boxShadow values to be more visible
# Also add boxShadow to elements that should have glow but don't


def enhance_boxshadow(content, filepath):
    """Enhance existing boxShadow values and add to key elements."""

    # Pattern 1: Enhance existing gold boxShadow
    # Find: boxShadow: '0 4px 20px rgba(212,166,87,0.3)'
    # Replace with stronger version
    content = re.sub(
        r"boxShadow: '0 4px 20px rgba\(212,166,87,0\.3\)'",
        "boxShadow: '0 4px 20px rgba(212,166,87,0.35), 0 0 30px rgba(212,166,87,0.15)'",
        content,
    )
    content = re.sub(
        r'boxShadow: "0 4px 20px rgba\(212,166,87,0\.3\)"',
        'boxShadow: "0 4px 20px rgba(212,166,87,0.35), 0 0 30px rgba(212,166,87,0.15)"',
        content,
    )

    # Pattern 2: Enhance onMouseEnter boxShadow
    content = re.sub(
        r"boxShadow = '0 8px 32px rgba\(212,166,87,0\.45\)'",
        "boxShadow = '0 8px 32px rgba(212,166,87,0.5), 0 0 40px rgba(212,166,87,0.2)'",
        content,
    )

    # Pattern 3: Add glow to onMouseEnter handlers that only have transform
    # Find: e.currentTarget.style.transform = 'scale(1.03)';\n              e.currentTarget.style.boxShadow = ...
    # If there's a transform without boxShadow in onMouseEnter, add it

    # Pattern 4: Add boxShadow to cards that have border but no boxShadow
    # Find: border: '1px solid var(--ink-border)', borderRadius: 16,
    # If next line is not boxShadow, add it after borderRadius
    content = re.sub(
        r"(border: '1px solid var\(--ink-border\)',\s*borderRadius: \d+,)(?!\s*boxShadow)",
        r"\1 boxShadow: '0 4px 16px rgba(0,0,0,0.3)',",
        content,
    )

    # Pattern 5: Enhance onMouseEnter for cards that have hover effect
    # Find patterns like: onMouseEnter={(e) => { e.currentTarget.style.borderColor = '...';
    # Add boxShadow to the hover effect
    content = re.sub(
        r"(onMouseEnter=\{\(e\) => \{[^}]*e\.currentTarget\.style\.borderColor = ')([^']*)(';[^}]*\}\})",
        lambda m: (
            f"{m.group(1)}{m.group(2)}'; {m.group(0).split('borderColor = ')[0].split('{')[-1]}e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(212,166,87,0.1)';"
        ),
        content,
    )

    return content


# Process all files
for fname in sorted(os.listdir(ROUTES_DIR)):
    if not fname.endswith(".tsx"):
        continue

    path = os.path.join(ROUTES_DIR, fname)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = enhance_boxshadow(content, fname)

    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Enhanced: {fname}")
    else:
        print(f"No changes: {fname}")

print("\nDone!")
