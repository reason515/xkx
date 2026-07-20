#!/usr/bin/env python3
"""
NPC代码标准化改造：
1. 为缺 gender 的 NPC 补默认值 set("gender", "无性")
2. 为缺 setup() 的 NPC 补调用
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SKIP_SUBDIRS = {"backup", "bak"}

def is_npc_file(content):
    return bool(re.search(r'inherit\s+(NPC|NPC_TRAINEE)\b', content))

def fix_npc(filepath):
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    
    if not is_npc_file(content):
        return None
    
    changes = []
    
    has_gender = bool(re.search(r'set\s*\(\s*"gender"', content))
    has_setup = bool(re.search(r'setup\s*\(\s*\)', content))
    
    if not has_gender:
        changes.append("missing_gender")
    if not has_setup:
        changes.append("missing_setup")
    
    if not changes:
        return None
    
    lines = content.split("\n")
    new_lines = []
    inserted_gender = False
    
    for i, line in enumerate(lines):
        if "missing_gender" in changes and not inserted_gender:
            # 在 set_name 之后插入 gender
            if re.search(r'set_name\s*\(', line):
                new_lines.append(line)
                indent = re.match(r'^(\s*)', line).group(1) or "\t"
                new_lines.append(f'{indent}set("gender", "无性");')
                inserted_gender = True
                continue
        
        if "missing_setup" in changes:
            # 在 create() 的最后一个 } 之前（即函数末尾）插入 setup()
            # 简单处理：在 replace_program 之前或最后一个 set 之后
            if re.search(r'replace_program', line) and i > 0:
                # 在 replace_program 前插入
                indent = re.match(r'^(\s*)', line).group(1) or "\t"
                new_lines.append(f'{indent}setup();')
                changes.remove("missing_setup")
        
        new_lines.append(line)
    
    # 如果还有 missing_setup 并且没有 replace_program，在 create() 结尾处插入
    if "missing_setup" in changes:
        # 找 create() 的结尾 }
        in_create = False
        create_depth = 0
        final_lines = []
        for i, line in enumerate(new_lines):
            if re.search(r'void\s+create\s*\(\s*\)', line):
                in_create = True
                create_depth = 0
            if in_create:
                create_depth += line.count("{") - line.count("}")
                if create_depth == 0 and "{" in new_lines[max(0,i-5):i+1] or create_depth <= 0 and i > 0:
                    indent = re.match(r'^(\s*)', line).group(1) or "\t"
                    final_lines.append(f'{indent}setup();')
                    in_create = False
            final_lines.append(line)
        new_lines = final_lines
    
    new_content = "\n".join(new_lines)
    if new_content != content:
        with open(filepath, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_content)
        return changes
    
    return None

def main():
    fixed_gender = 0
    fixed_setup = 0
    
    for root, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_SUBDIRS and d not in (".git", "node_modules", ".tmp-fluffos-check", "fluffos-v2019")]
        
        for fname in files:
            if not fname.endswith(".c"):
                continue
            fpath = os.path.join(root, fname)
            
            result = fix_npc(fpath)
            if result:
                for r in result:
                    if r == "missing_gender":
                        fixed_gender += 1
                    elif r == "missing_setup":
                        fixed_setup += 1
                        print(f"SETUP: {fpath}")
    
    print(f"\n=== 汇总 ===")
    print(f"补 gender: {fixed_gender}")
    print(f"补 setup: {fixed_setup}")

if __name__ == "__main__":
    main()
