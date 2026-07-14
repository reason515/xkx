#!/usr/bin/env python3
"""Patch mudlib on server for FluffOS connect failures. Run as root:
   python3 patch-mudlib-connect.py
"""
from pathlib import Path

ROOT = Path("/opt/xkx")


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8", errors="surrogateescape")
    if new.strip() in text and old not in text:
        print(f"[skip] {label}: already patched")
        return
    if old not in text:
        raise SystemExit(f"[fail] {label}: pattern not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8", errors="surrogateescape")
    print(f"[ok] {label}")


def main() -> None:
    master = ROOT / "adm/single/master.c"
    wizard = ROOT / "adm/simul_efun/wizard.c"
    http_h = ROOT / "include/net/http.h"
    preload = ROOT / "adm/etc/preload"

    # log_error: never call wizardp during compile/load
    old_log = None
    text = master.read_text(encoding="utf-8", errors="surrogateescape")
    import re

    text2, n = re.subn(
        r"void log_error\(string file, string message\)\s*\{[\s\S]*?\n\}",
        """void log_error(string file, string message)
{
	// 避免编译/加载阶段调用 wizardp()/SECURITY_D
	efun::write_file(LOG_DIR "debug.log", message);
}""",
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("[fail] log_error replace")
    master.write_text(text2, encoding="utf-8", errors="surrogateescape")
    print("[ok] master.c log_error")

    # connect already may be patched; ensure CONNECT_ERR logging exists
    if "CONNECT_ERR" not in master.read_text(encoding="utf-8", errors="surrogateescape"):
        print("[warn] connect() may be old; check varargs object connect")

    wizard.write_text(
        """//Cracked by Kafei
// wiz.c

string wizhood(mixed ob)
{
	object sec;
	mixed err, st;
	sec = find_object(SECURITY_D);
	if (!sec) {
		err = catch(sec = load_object(SECURITY_D));
		if (err || !sec) return "(player)";
	}
	err = catch(st = sec->get_status(ob));
	if (err || !stringp(st)) return "(player)";
	return st;
}

int wizardp(mixed ob)
{
	object sec;
	mixed err, lvl;

	if (!ob) return 0;
	sec = find_object(SECURITY_D);
	if (!sec) {
		err = catch(sec = load_object(SECURITY_D));
		if (err || !sec) return 0;
	}
	err = catch(lvl = sec->get_wiz_level(ob));
	if (err) return 0;
	return (lvl > 0);
}

int wiz_level(mixed ob)
{
	object sec;
	mixed err, lvl;

	if (!ob) return 0;
	sec = find_object(SECURITY_D);
	if (!sec) {
		err = catch(sec = load_object(SECURITY_D));
		if (err || !sec) return 0;
	}
	err = catch(lvl = sec->get_wiz_level(ob));
	if (err) return 0;
	return lvl;
}
""",
        encoding="utf-8",
    )
    print("[ok] wizard.c")

    ht = http_h.read_text(encoding="utf-8", errors="surrogateescape")
    ht2 = ht.replace("static private void", "private void")
    if ht2 != ht:
        http_h.write_text(ht2, encoding="utf-8", errors="surrogateescape")
        print("[ok] http.h")
    else:
        print("[skip] http.h")

    pl = preload.read_text(encoding="utf-8", errors="surrogateescape")
    lines = []
    for line in pl.splitlines():
        if line.strip() == "/adm/daemons/network/http":
            lines.append("# /adm/daemons/network/http")
        else:
            lines.append(line)
    preload.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("[ok] preload")

    print("Done. Restart driver: pkill -f 'driver config.xkx' && su - xkx -c 'cd /opt/xkx && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 ./driver config.xkx'")


if __name__ == "__main__":
    main()
