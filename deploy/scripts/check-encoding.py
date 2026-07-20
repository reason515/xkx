#!/usr/bin/env python3
p = open("/opt/xkx/adm/daemons/logind.c", "rb").read()
print("logind nul count", p.count(b"\x00"))
i = p.find(b"HELP RULES")
print("around HELP RULES:", repr(p[i : i + 180]))
m = open("/opt/xkx/adm/single/master.c", "rb").read()
print("master qmark runs", m.count(b"???????"))
print("master sample lines with qmarks:")
for line in m.split(b"\n"):
    if b"????" in line:
        print(line[:160])
