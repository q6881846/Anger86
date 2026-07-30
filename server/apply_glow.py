import re
import os
import shutil

ROUTES_DIR = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\src\routes"
CSS_FILE = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\src\index.css"

# Backup all files
for fname in os.listdir(ROUTES_DIR):
    if fname.endswith(".tsx"):
        src = os.path.join(ROUTES_DIR, fname)
        shutil.copy2(src, src + ".glow-bak")

print("Backups created")

# ---- Update index.css glow classes to pseudo-element approach ----
with open(CSS_FILE, "r", encoding="utf-8") as f:
    css = f.read()

# Replace the glow section with pseudo-element based version
old_glow = """/* ---- Global Glow Effects ---- */
.glow-card {
  transition: all 0.4s var(--ease-out);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px var(--ink-border);
}
.glow-card:hover {
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(212,166,87,0.15), 0 0 0 1px rgba(212,166,87,0.25);
  transform: translateY(-2px);
}

.glow-button {
  transition: all 0.3s var(--ease-spring);
  box-shadow: 0 4px 16px rgba(212,166,87,0.2), 0 0 8px rgba(212,166,87,0.1);
}
.glow-button:hover {
  box-shadow: 0 8px 24px rgba(212,166,87,0.35), 0 0 16px rgba(212,166,87,0.2);
  transform: translateY(-1px) scale(1.02);
}
.glow-button:active {
  transform: translateY(0) scale(0.98);
  box-shadow: 0 2px 8px rgba(212,166,87,0.15);
}

.glow-input {
  transition: all 0.3s var(--ease-out);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}
.glow-input:focus {
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 0 0 2px rgba(212,166,87,0.3), 0 0 12px rgba(212,166,87,0.15);
}

.glow-active {
  box-shadow: 0 0 0 2px rgba(212,166,87,0.4), 0 0 16px rgba(212,166,87,0.2);
  animation: glow-pulse 3s ease-in-out infinite;
}

.glow-border {
  box-shadow: 0 0 0 1px var(--ink-border);
  transition: box-shadow 0.4s var(--ease-out);
}
.glow-border:hover {
  box-shadow: 0 0 0 1px rgba(212,166,87,0.3), 0 4px 20px rgba(212,166,87,0.1);
}

.glow-green {
  box-shadow: 0 0 0 2px rgba(110,192,146,0.3), 0 0 12px rgba(110,192,146,0.15);
}

.glow-vermilion {
  box-shadow: 0 0 0 2px rgba(232,93,104,0.3), 0 0 12px rgba(232,93,104,0.15);
}

.glow-text {
  text-shadow: 0 0 8px rgba(212,166,87,0.3);
}"""

new_glow = """/* ---- Global Glow Effects (pseudo-element, no conflict with inline styles) ---- */
.glow-button {
  position: relative;
  overflow: visible;
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
  position: relative;
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
}
.glow-border::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 0 0 1px var(--ink-border);
  transition: box-shadow 0.4s var(--ease-out);
  pointer-events: none;
  z-index: -1;
}
.glow-border:hover::before {
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
}"""

if old_glow in css:
    css = css.replace(old_glow, new_glow)
    print("CSS updated to pseudo-element glow")
else:
    print("WARNING: old glow CSS not found, checking...")
    # Try to find and replace just the glow section
    glow_start = css.find("/* ---- Global Glow Effects")
    if glow_start != -1:
        reveal_start = css.find(".reveal", glow_start)
        if reveal_start != -1:
            css = css[:glow_start] + new_glow + "\n\n" + css[reveal_start:]
            print("CSS replaced via position")

with open(CSS_FILE, "w", encoding="utf-8") as f:
    f.write(css)


# ---- Process route files ----
def add_glow_classes(content):
    """Add glow classes to JSX elements based on their style content."""
    result = []
    i = 0

    while i < len(content):
        # Find style={{ openings
        style_idx = content.find("style={{", i)
        if style_idx == -1:
            result.append(content[i:])
            break

        # Find matching }}
        start = style_idx + 7  # after 'style={{'
        depth = 2
        j = start
        while j < len(content) and depth > 0:
            if content[j] == "{":
                depth += 1
            elif content[j] == "}":
                depth -= 1
            j += 1

        style_block = content[start : j - 2]

        # Determine what glow class to add
        glow_class = None

        # Button: has gold gradient
        if "linear-gradient(135deg, #d4a657, #f0c674)" in style_block:
            glow_class = "glow-button"
        # Card: has ink-card background + ink-border
        elif (
            "background: 'var(--ink-card)'" in style_block
            and "border: '1px solid var(--ink-border)'" in style_block
        ):
            glow_class = "glow-card"
        # Input: textarea with ink-surface background
        elif "background: 'var(--ink-surface)'" in style_block and (
            "border: '1px solid var(--ink-border)'" in style_block
            or "border: '1px solid" in style_block
        ):
            # Check if parent element is textarea or input
            tag_start = content.rfind("<", i, style_idx)
            if tag_start != -1:
                tag_text = content[tag_start:style_idx].strip()
                if "<textarea" in tag_text or "<input" in tag_text:
                    glow_class = "glow-input"
        # Active state: has gold background tint
        elif (
            "rgba(212,166,87,0.15)" in style_block
            or "rgba(212,166,87,0.2)" in style_block
        ):
            if "background:" in style_block:
                tag_start = content.rfind("<", i, style_idx)
                if tag_start != -1:
                    tag_text = content[tag_start:style_idx].strip()
                    # Only for clickable/selectable items, not generic backgrounds
                    if "onClick" in content[j : j + 200] or "cursor" in style_block:
                        glow_class = "glow-active"

        # Check for existing className
        tag_start = content.rfind("<", i, style_idx)
        if tag_start != -1 and glow_class:
            tag_section = content[tag_start:style_idx]
            if "className=" not in tag_section:
                # Insert className before style
                result.append(content[i:style_idx])
                result.append(f'className="{glow_class}" ')
                result.append(content[style_idx:j])
            else:
                # Append to existing className
                cls_match = re.search(r'className=["\']([^"\']*)["\']', tag_section)
                if cls_match:
                    existing = cls_match.group(1)
                    if glow_class not in existing:
                        new_cls = f"{existing} {glow_class}"
                        tag_section_new = (
                            tag_section[: cls_match.start()]
                            + f'className="{new_cls}"'
                            + tag_section[cls_match.end() :]
                        )
                        result.append(content[i:tag_start])
                        result.append(tag_section_new)
                        result.append(content[style_idx:j])
                    else:
                        result.append(content[i:j])
                else:
                    result.append(content[i:j])
        else:
            result.append(content[i:j])

        i = j

    return "".join(result)


# Process all route files
for fname in os.listdir(ROUTES_DIR):
    if not fname.endswith(".tsx"):
        continue

    path = os.path.join(ROUTES_DIR, fname)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = add_glow_classes(content)

    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated: {fname}")
    else:
        print(f"No changes: {fname}")

print("\nDone. Now running TypeScript check...")
