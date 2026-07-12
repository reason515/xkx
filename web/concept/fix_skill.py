# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(__file__).with_name("build_index.py")
t = p.read_text(encoding="utf-8")
new_skill = '''def skill(cls, name, m, lv, level, learned, enabled):
    need = (level + 1) * (level + 1)
    remain = max(0, need - learned)
    pct = min(100, int(learned * 100 / need)) if need else 0
    eq = '<span class="eq">\\u25a1</span>' if enabled else ''
    return (
        f'<div class="skill-row {cls}"><div class="skill-main">'
        f'<div class="name">{eq}<span class="skname">{name}</span></div>'
        f'<div class="skill-prog">\\u5347\\u7ea7 {learned}/{need}\\uff08\\u8fd8\\u5dee {remain}\\uff09'
        f'<div class="bar"><i style="width:{pct}%"></i></div></div></div>'
        f'<div class="skill-sec"><span class="lv {m}">{lv}</span><div class="num">Lv{level}</div></div></div>'
    )


'''
t2, n = re.subn(r"def skill\(.*?\n\n", new_skill, t, count=1, flags=re.S)
if n != 1:
    raise SystemExit(f"replace skill failed {n}")
# css for skname inherit color from row
if ".skill-main .skname" not in t2:
    t2 = t2.replace(
        ".skill-main .eq{color:var(--item-equipped);font-size:12px}",
        ".skill-main .eq{color:var(--item-equipped);font-size:12px}"
        ".skill-main .skname{font-family:var(--font-display);letter-spacing:.06em}"
        ".skill-row.force .skname{color:var(--skill-force)}"
        ".skill-row.weapon .skname{color:var(--skill-weapon)}"
        ".skill-row.dodge .skname{color:var(--skill-dodge)}"
        ".skill-row.knowledge .skname{color:var(--skill-knowledge)}",
        1,
    )
p.write_text(t2, encoding="utf-8", newline="\n")
import build_index
build_index.main()
print("ok")
