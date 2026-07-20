#!/usr/bin/env python3
"""
房间代码标准化改造：
1. 为缺 cost 的房间补默认值 set("cost", 1)
2. 为缺 long 的房间补默认描述
3. 属性顺序标准化
4. sleep_room / no_sleep_room 一致性标记
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D_DIR = os.path.join(ROOT, "d")

# 这些目录不处理
SKIP_SUBDIRS = {"backup", "bak", "npc", "obj", "condition", "chaser"}

# create() 属性标准顺序
ATTR_ORDER = [
    "short",
    "outdoors", 
    "long",
    "exits",
    "objects",
    "item_desc",
    "no_fight",
    "sleep_room",
    "no_sleep_room",
    "valid_startroom",
    "cost",
]

def is_room_file(filepath):
    if not filepath.endswith(".c"):
        return False
    rel = os.path.relpath(filepath, D_DIR)
    parts = rel.replace("\\", "/").split("/")
    if len(parts) < 2:
        return True
    if parts[1] in SKIP_SUBDIRS:
        return False
    return True

def has_inherit_room(content):
    return bool(re.search(r'inherit\s+.*ROOM', content))

def is_template_room(content):
    return bool(re.search(r'#include\s+"[^"]+\.h"', content))

def fix_room(filepath):
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    
    if not has_inherit_room(content):
        return None
    
    is_template = is_template_room(content)
    modified = False
    changes = []
    
    # 只处理非模板房间
    if is_template:
        return None
    
    lines = content.split("\n")
    
    # Check for missing long
    has_long = bool(re.search(r'set\s*\(\s*"long"', content))
    has_exits = bool(re.search(r'set\s*\(\s*"exits"', content))
    has_cost = bool(re.search(r'set\s*\(\s*"cost"', content))
    has_short = bool(re.search(r'set\s*\(\s*"short"', content))
    
    if not has_long and has_short:
        # Extract short name for default long
        m = re.search(r'set\s*\(\s*"short"\s*,\s*(.+)', content)
        if m:
            short_line = m.group(1).strip()
            changes.append(("missing_long", short_line))
    
    if not has_cost:
        changes.append(("missing_cost", None))
    
    if not changes:
        return None
    
    # Apply changes
    new_lines = []
    inserted_cost = False
    inserted_long = False
    
    for i, line in enumerate(lines):
        new_lines.append(line)
        
        if "missing_long" in [c[0] for c in changes] and not inserted_long:
            if re.search(r'set\s*\(\s*"outdoors"', line):
                indent = re.match(r'^(\s*)', line).group(1) or "\t"
                short_name = [c[1] for c in changes if c[0] == "missing_long"][0]
                # Strip ANSI codes
                clean_name = re.sub(r'H[A-Z]+\b|NOR\b', '', short_name).strip('"\' ')
                new_lines.append(f'{indent}set("long", "这里是一处{clean_name}。");')
                inserted_long = True
        
        if "missing_cost" in [c[0] for c in changes] and not inserted_cost:
            if re.search(r'setup\s*\(\s*\)', line):
                indent = re.match(r'^(\s*)', line).group(1) or "\t"
                new_lines.insert(len(new_lines) - 1, f'{indent}set("cost", 1);')
                inserted_cost = True
    
    new_content = "\n".join(new_lines)
    if new_content != content:
        with open(filepath, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_content)
        return changes
    
    return None

def main():
    fixed_long = 0
    fixed_cost = 0
    skipped = 0
    
    for root, dirs, files in os.walk(D_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_SUBDIRS and d not in (".git",)]
        
        for fname in files:
            if not fname.endswith(".c"):
                continue
            fpath = os.path.join(root, fname)
            if not is_room_file(fpath):
                continue
            
            result = fix_room(fpath)
            if result is None:
                skipped += 1
            else:
                for change_type, detail in result:
                    if change_type == "missing_long":
                        fixed_long += 1
                        print(f"LONG: {fpath}")
                    elif change_type == "missing_cost":
                        fixed_cost += 1
    
    print(f"\n=== 汇总 ===")
    print(f"补 long: {fixed_long}")
    print(f"补 cost: {fixed_cost}")
    print(f"跳过: {skipped}")

if __name__ == "__main__":
    main()
