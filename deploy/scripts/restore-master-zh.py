#!/usr/bin/env python3
"""Restore UTF-8 Chinese strings in master.c while keeping FluffOS structural fixes."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def git_show(rev: str, path: str) -> bytes:
    data = subprocess.check_output(["git", "show", f"{rev}:{path}"], cwd=ROOT)
    return data.replace(b"\r\n", b"\n")


def func_body(src: bytes, sig: bytes) -> bytes | None:
    i = src.find(sig)
    if i < 0:
        return None
    brace = src.find(b"{", i)
    depth = 0
    j = brace
    while j < len(src):
        if src[j : j + 1] == b"{":
            depth += 1
        elif src[j : j + 1] == b"}":
            depth -= 1
            if depth == 0:
                return src[i : j + 1]
        j += 1
    return None


def main() -> None:
    head = git_show("HEAD", "adm/single/master.c")
    good = git_show("b4952c66", "adm/single/master.c")
    fixed = head

    for sig in [
        b"void crash(string error, object command_giver, object current_object)",
        b"void destruct_env_of(object ob)",
        b"string standard_trace(mapping error, int caught)",
        b"string error_handler( mapping error, int caught )",
    ]:
        hb = func_body(fixed, sig)
        gb = func_body(good, sig)
        if hb and gb and hb != gb:
            fixed = fixed.replace(hb, gb, 1)
            print("replaced", sig.decode())

    out = ROOT / "adm/single/master.c"
    out.write_bytes(fixed)
    data = out.read_bytes()
    print("qmarks", data.count(b"??????"))
    print("has 系统核心", "系统核心".encode() in data)
    print("has 你发现事情", "你发现事情".encode() in data)
    print("has varargs", b"varargs object connect" in data)
    print("has private", b"private string *update_file" in data)


if __name__ == "__main__":
    main()
