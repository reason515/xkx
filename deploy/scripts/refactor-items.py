#!/usr/bin/env python3
"""
物品代码标准化改造：
1. 为缺 long 的物品补默认描述
2. 为缺 value 的物品补默认值
只处理真实物品文件（排除 daemon/服务端文件）
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SKIP_SUBDIRS = {"backup", "bak", "condition", "chaser"}

ITEM_INHERITS = [
    "ITEM", "CLOTH", "SWORD", "BLADE", "F_FOOD", "F_LIQUID",
    "PILL", "COMBINED_ITEM", "ARMOR", "STAFF", "WHIP", "HAMMER",
    "HEAD", "NECK", "BOOTS", "FINGER", "HANDS", "WAIST", "WRISTS",
    "SURCOAT", "SHIELD", "CLUB", "STICK", "AXE", "PIKE",
    "THROWING", "BOW", "EQUIP", "MONEY", "POWDER",
]

def is_item_file(content):
    pattern = r'inherit\s+(' + '|'.join(ITEM_INHERITS) + r')\b'
    return bool(re.search(pattern, content))

def fix_item(filepath):
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    
    if not is_item_file(content):
        return None
    
    changes = []
    
    has_long = bool(re.search(r'set\s*\(\s*"long"', content))
    has_value = bool(re.search(r'set\s*\(\s*"value"', content))
    has_unit = bool(re.search(r'set\s*\(\s*"unit"', content))
    
    if not has_long:
        changes.append("missing_long")
    if not has_value:
        changes.append("missing_value")
    
    if not changes:
        return None
    
    lines = content.split("\n")
    new_lines = []
    inserted_long = False
    inserted_value = False
    
    for i, line in enumerate(lines):
        if "missing_long" in changes and not inserted_long:
            # 在 set_name 之后插入 long（set_name 通常在物品中较早出现）
            if re.search(r'set_name\s*\(', line):
                new_lines.append(line)
                indent = re.match(r'^(\s*)', line).group(1) or "\t"
                # 尝试从 set_name 和 unit 提取信息
                name_match = re.search(r'set_name\s*\(\s*"([^"]+)"', content)
                unit_match = re.search(r'set\s*\(\s*"unit"\s*,\s*"([^"]+)"', content)
                name = name_match.group(1) if name_match else "物品"
                unit = unit_match.group(1) if unit_match else "个"
                new_lines.append(f'{indent}set("long", "这是一{unit}{name}。");')
                inserted_long = True
                continue
        
        if "missing_value" in changes and not inserted_value:
            # 在 set("unit" 之后或 setup() 之前插入 value
            if re.search(r'set\s*\(\s*"unit"', line):
                new_lines.append(line)
                indent = re.match(r'^(\s*)', line).group(1) or "\t"
                new_lines.append(f'{indent}set("value", 1);')
                inserted_value = True
                continue
        
        new_lines.append(line)
    
    # 如果在循环中没找到插入点（没有 unit 行），在 setup() 前插入
    if "missing_value" in changes and not inserted_value:
        final = []
        for i, line in enumerate(new_lines):
            if re.search(r'setup\s*\(\s*\)', line) and not inserted_value:
                indent = re.match(r'^(\s*)', line).group(1) or "\t"
                final.append(f'{indent}set("value", 1);')
                inserted_value = True
            final.append(line)
        new_lines = final
    
    new_content = "\n".join(new_lines)
    if new_content != content:
        with open(filepath, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_content)
        return changes
    
    return None

def main():
    fixed_long = 0
    fixed_value = 0
    
    for root, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_SUBDIRS and d not in (".git", "node_modules", ".tmp-fluffos-check", "fluffos-v2019")]
        
        for fname in files:
            if not fname.endswith(".c"):
                continue
            fpath = os.path.join(root, fname)
            
            result = fix_item(fpath)
            if result:
                for r in result:
                    if r == "missing_long":
                        fixed_long += 1
                    elif r == "missing_value":
                        fixed_value += 1
    
    print(f"\n=== 汇总 ===")
    print(f"补 long: {fixed_long}")
    print(f"补 value: {fixed_value}")

if __name__ == "__main__":
    main()
