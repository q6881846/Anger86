import re
import os

ROUTES_DIR = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\src\routes"
CSS_FILE = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\src\index.css"

# ---- Update index.css ----
with open(CSS_FILE, "r", encoding="utf-8") as f:
    css = f.read()

# Check if glow classes already exist
glow_check = css.find(".glow-button")
if glow_check != -1:
    print("Glow classes already in CSS")
else:
    # Add glow section before .reveal
    glow_css = """/* ---- Global Glow Effects ---- */
.glow-button {
  position: relative;
  overflow: visible;
  transition: all 0.3s var(--ease-spring);
}
.glow-button::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 4px 24px rgba(212,166,87,0.35), 0 0 16px rgba(212,166,87,0.2);
  opacity: 0;
  transition: opacity 0.3s var(--ease-out);
  pointer-events: none;
  z-index: -1;
}
.glow-button:hover::before {
  opacity: 1;
}
.glow-button:active {
  transform: translateY(0) scale(0.98);
}

.glow-card {
  position: relative;
  transition: all 0.4s var(--ease-out);
}
.glow-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px var(--ink-border);
  transition: all 0.4s var(--ease-out);
  pointer-events: none;
  z-index: -1;
}
.glow-card:hover::before {
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(212,166,87,0.15), 0 0 0 1px rgba(212,166,87,0.25);
}
.glow-card:hover {
  transform: translateY(-2px);
}

.glow-input {
  transition: all 0.3s var(--ease-out);
}
.glow-input:focus {
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 0 0 2px rgba(212,166,87,0.3), 0 0 12px rgba(212,166,87,0.15);
}

.glow-active {
  position: relative;
}
.glow-active::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 0 0 2px rgba(212,166,87,0.4), 0 0 16px rgba(212,166,87,0.2);
  animation: glow-pulse 3s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

.glow-border {
  position: relative;
  transition: all 0.4s var(--ease-out);
}
.glow-border:hover {
  box-shadow: 0 0 0 1px rgba(212,166,87,0.3), 0 4px 20px rgba(212,166,87,0.1);
}

.glow-green {
  position: relative;
}
.glow-green::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 0 0 2px rgba(110,192,146,0.3), 0 0 12px rgba(110,192,146,0.15);
  pointer-events: none;
  z-index: -1;
}

.glow-vermilion {
  position: relative;
}
.glow-vermilion::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 0 0 2px rgba(232,93,104,0.3), 0 0 12px rgba(232,93,104,0.15);
  pointer-events: none;
  z-index: -1;
}

.glow-text {
  text-shadow: 0 0 8px rgba(212,166,87,0.3);
}

"""
    # Insert before .reveal
    reveal_pos = css.find(".reveal {")
    if reveal_pos != -1:
        css = css[:reveal_pos] + glow_css + css[reveal_pos:]
    else:
        css = css + "\n\n" + glow_css

    with open(CSS_FILE, "w", encoding="utf-8") as f:
        f.write(css)
    print("Glow CSS added to index.css")

# ---- Process route files ----
# Strategy: Find specific patterns and add glow classes safely


def safe_add_class(content, tag_pattern, glow_class, max_replacements=None):
    """Add glow_class to elements matching tag_pattern. Only add if no className exists."""
    count = 0
    result = []
    i = 0

    while i < len(content):
        match = tag_pattern.search(content, i)
        if not match:
            result.append(content[i:])
            break

        start, end = match.span()
        tag_text = match.group(0)

        # Check if already has className
        if "className=" in tag_text:
            # Skip - already has className
            result.append(content[i:end])
        else:
            # Insert className
            # Find position after tag name to insert className
            tag_end = tag_text.find(" ")
            if tag_end == -1:
                tag_end = len(tag_text) - 1  # before >
            else:
                # Find first space after tag name
                tag_end = tag_text.find(" ", tag_text.find("<") + 1)

            # Insert before style= or after tag name
            new_tag = (
                tag_text[:tag_end] + f' className="{glow_class}"' + tag_text[tag_end:]
            )
            result.append(content[i:start])
            result.append(new_tag)
            count += 1

            if max_replacements and count >= max_replacements:
                result.append(content[end:])
                break

        i = end

    return "".join(result)


# Gold gradient buttons
gold_button_pattern = re.compile(
    r"<(button|div)\b[^>]*style=\{\{[^}]*linear-gradient\(135deg, #d4a657, #f0c674\)[^}]*\}\}[^>]*>"
)

# Cards with ink-card background
card_pattern = re.compile(
    r"<(div|section)\b[^>]*style=\{\{[^}]*background: \'var\(--ink-card\)\'[^}]*\}\}[^>]*>"
)

# Active/selected items with gold tint
active_pattern = re.compile(
    r"<(div|button)\b[^>]*style=\{\{[^}]*rgba\(212,166,87,0\.1[57]\)[^}]*\}\}[^>]*>"
)

for fname in sorted(os.listdir(ROUTES_DIR)):
    if not fname.endswith(".tsx"):
        continue

    path = os.path.join(ROUTES_DIR, fname)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Add glow-button to gold gradient buttons (limit to prevent over-applying)
    # content = safe_add_class(content, gold_button_pattern, 'glow-button', max_replacements=5)

    # Add glow-card to ink-card elements
    # content = safe_add_class(content, card_pattern, 'glow-card', max_replacements=5)

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {fname}")

print("\nAll done. Run `npx tsc --noEmit` to verify.")
