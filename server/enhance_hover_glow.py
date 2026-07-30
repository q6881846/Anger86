import os
import re

ROUTES_DIR = r"C:\Users\Administrator\Desktop\灵感小说写作\mowen-vite\src\routes"


def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # Pattern 1: onMouseEnter with borderColor but no boxShadow
    # Match: onMouseEnter={... e.currentTarget.style.borderColor='...'; ...}
    # Add boxShadow before the closing }
    def add_glow_to_hover(match):
        inner = match.group(1)
        # Check if already has boxShadow
        if "boxShadow" in inner or "box-shadow" in inner:
            return match.group(0)

        # Add boxShadow after borderColor or background or color
        # Try to find a good insertion point
        if "borderColor='" in inner:
            # Insert after the last style assignment
            # Find the last ; before closing
            last_semi = inner.rfind(";")
            if last_semi != -1:
                before = inner[: last_semi + 1]
                after = inner[last_semi + 1 :]
                # Try to detect color from borderColor
                color_match = re.search(r"borderColor='([^']*)'", inner)
                if color_match:
                    color = color_match.group(1)
                    # Extract rgba or hex
                    if (
                        "rgba(212,166,87" in color
                        or "#d4a657" in color
                        or "#f0c674" in color
                        or "rgba(212,166,87" in color
                    ):
                        glow = " e.currentTarget.style.boxShadow='0 0 20px rgba(212,166,87,0.2)';"
                    elif "rgba(110,192,146" in color or "#6ec092" in color:
                        glow = " e.currentTarget.style.boxShadow='0 0 20px rgba(110,192,146,0.2)';"
                    elif "rgba(122,158,240" in color or "#7a9ef0" in color:
                        glow = " e.currentTarget.style.boxShadow='0 0 20px rgba(122,158,240,0.2)';"
                    elif "rgba(232,93,104" in color or "#e85d68" in color:
                        glow = " e.currentTarget.style.boxShadow='0 0 20px rgba(232,93,104,0.2)';"
                    else:
                        glow = " e.currentTarget.style.boxShadow='0 0 20px rgba(212,166,87,0.15)';"

                    new_inner = before + glow + after
                    return f"onMouseEnter={{{new_inner}}}"

        return match.group(0)

    # Apply to onMouseEnter handlers
    content = re.sub(r"onMouseEnter=\{([^}]*)\}", add_glow_to_hover, content)

    # Pattern 2: onMouseLeave handlers that reset - add boxShadow reset
    def add_reset_glow(match):
        inner = match.group(1)
        if "boxShadow" in inner or "box-shadow" in inner:
            return match.group(0)

        # Add boxShadow reset
        last_semi = inner.rfind(";")
        if last_semi != -1:
            before = inner[: last_semi + 1]
            after = inner[last_semi + 1 :]
            reset = " e.currentTarget.style.boxShadow='none';"
            new_inner = before + reset + after
            return f"onMouseLeave={{{new_inner}}}"

        return match.group(0)

    content = re.sub(r"onMouseLeave=\{([^}]*)\}", add_reset_glow, content)

    # Pattern 3: onMouseEnter with only transform - add glow for buttons
    def add_glow_to_transform(match):
        inner = match.group(1)
        if "boxShadow" in inner or "box-shadow" in inner:
            return match.group(0)

        if "transform" in inner and "scale" in inner:
            last_semi = inner.rfind(";")
            if last_semi != -1:
                before = inner[: last_semi + 1]
                after = inner[last_semi + 1 :]
                glow = " e.currentTarget.style.boxShadow='0 8px 32px rgba(212,166,87,0.4)';"
                new_inner = before + glow + after
                return f"onMouseEnter={{{new_inner}}}"

        return match.group(0)

    content = re.sub(r"onMouseEnter=\{([^}]*)\}", add_glow_to_transform, content)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


# Process all files
for fname in sorted(os.listdir(ROUTES_DIR)):
    if not fname.endswith(".tsx"):
        continue

    filepath = os.path.join(ROUTES_DIR, fname)
    changed = process_file(filepath)
    print(f"{'Enhanced' if changed else 'No changes'}: {fname}")

print("\nDone!")
