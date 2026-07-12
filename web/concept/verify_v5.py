# -*- coding: utf-8 -*-
from pathlib import Path
t = Path(__file__).with_name("index.html").read_text(encoding="utf-8")
tests = {
    "equipped": "\u5df2\u88c5\u5907" in t,
    "remain": "\u8fd8\u5dee" in t,
    "atk": "\u653b\u51fb" in t,
    "defense": "\u9632\u5fa1" in t,
    "scroll": t.count("sheet-scroll") >= 3,
    "no_compass": 'id="compass"' not in t,
    "no_pot_meter": "meter potential" not in t,
    "fixed_h": "min(620px" in t,
    "exp_scalar": "scalar exp" in t,
    "enabled_box": "enabled-box" in t,
    "quest_exp": "\u9605\u5386" in t,
    "shen": ">\u795e<" in t or "\u795e</span>" in t,
}
for k, v in tests.items():
    print(("OK" if v else "FAIL"), k)
print("fail_count", sum(1 for v in tests.values() if not v))
