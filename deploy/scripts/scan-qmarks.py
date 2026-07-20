#!/usr/bin/env python3
import glob
import os

for p in glob.glob("/opt/xkx/d/xiakedao/obj/*.c") + glob.glob(
    "/opt/xkx/clone/**/*.c", recursive=True
):
    try:
        b = open(p, "rb").read()
    except OSError:
        continue
    if b"??????" in b or b"????" in b:
        print("QMARKS", p)
    try:
        b.decode("utf-8")
    except UnicodeDecodeError:
        print("NONUTF8", p)
        # show set_name lines if any
        for line in b.split(b"\n"):
            if b"set_name" in line or b'set("short"' in line:
                print(" ", line[:120])
