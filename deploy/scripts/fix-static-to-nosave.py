#!/usr/bin/env python3
"""Convert MudOS `static` vars/functions to FluffOS SENSIBLE_MODIFIERS form."""
from pathlib import Path
import re

import os
import sys

root = Path(os.environ.get("XKX_ROOT") or (sys.argv[1] if len(sys.argv) > 1 else "/opt/xkx"))
paths = []
for sub in ("feature", "inherit", "clone", "adm", "cmds", "kungfu"):
    p = root / sub
    if p.exists():
        paths.extend(p.rglob("*.c"))

changed = []
for p in paths:
    text = p.read_text(encoding="utf-8", errors="surrogateescape")
    orig = text
    # static TYPE var -> nosave TYPE var
    text2 = re.sub(
        r"(?m)^([ \t]*)static[ \t]+((?:mapping|mixed|string|int|object|float|buffer|function|class)\b)",
        r"\1nosave \2",
        text,
    )
    # static [modifiers] returntype func -> private ...
    text2 = re.sub(
        r"(?m)^([ \t]*)static[ \t]+((?:private|nomask|varargs|public|protected)[ \t]+)*(void|int|string|object|mapping|mixed|float|buffer|status)\b",
        lambda m: m.group(1) + "private " + (m.group(2) or "") + m.group(3),
        text2,
    )
    if text2 != orig:
        p.write_text(text2, encoding="utf-8", errors="surrogateescape")
        changed.append(str(p.relative_to(root)))

print("changed", len(changed), "files")
for name in ("adm/daemons/chinesed.c", "adm/daemons/natured.c", "feature/dbase.c"):
    p = root / name
    if p.exists():
        print("---", name, "---")
        print("\n".join(p.read_text(encoding="utf-8", errors="surrogateescape").splitlines()[:20]))
