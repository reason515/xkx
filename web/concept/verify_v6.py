# -*- coding: utf-8 -*-
from pathlib import Path
t = Path(__file__).with_name("index.html").read_text(encoding="utf-8")
checks = {
    "no_remain": "\u8fd8\u5dee" not in t,
    "no_upgrade_word": "\u5347\u7ea7 " not in t and "\u5347\u7ea7" not in t.split("skill")[0] if False else "\u5347\u7ea7" not in t,
    "exit_pad": "exit-pad" in t,
    "southeast": "\u4e1c\u5357" in t,
    "up_extra": 'data-exit="up"' in t,
    "world_map": "world-map" in t,
    "map_mode": "map-mode" in t,
    "train_log": "train-log" in t,
    "dazuo_text": "\u5185\u606f\u5f00\u59cb\u5728\u4f53\u5185\u6d41\u52a8" in t,
    "barline": "barline" in t,
    "yangzhou_here": "spot city here" in t or ("here" in t and "\u626c\u5dde" in t),
}
# softer upgrade check
checks["no_upgrade_in_skills"] = "\u5347\u7ea7" not in t
for k, v in checks.items():
    print(("OK" if v else "FAIL"), k)
print("fails", sum(1 for v in checks.values() if not v))
