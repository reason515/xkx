#!/usr/bin/env python3
"""
为缺少 outdoors 属性的 ROOM 文件自动补全。
从文件路径 /d/<area>/... 推导区域名，在 set("short" 后插入 set("outdoors")。
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D_DIR = os.path.join(ROOT, "d")

# 已知的区域名别名映射（路径名 -> outdoors 值）
AREA_ALIASES = {
    "bwdh": "bwdh",  # 比武大会
    "city": "city",   # 扬州
    "xkx": "xkx",     # 侠客行
}

def extract_area(filepath):
    """从 /d/<area>/... 路径提取区域名"""
    rel = os.path.relpath(filepath, D_DIR)
    parts = rel.replace("\\", "/").split("/")
    # parts[0] 就是 area
    if parts:
        area = parts[0]
        # 处理已知别名
        return AREA_ALIASES.get(area, area)
    return None

def is_room_file(filepath):
    """判断是否是房间文件"""
    if not filepath.endswith(".c"):
        return False
    # 排除 npc/, obj/, backup/, bak/, condition/, chaser/ 等子目录
    rel = os.path.relpath(filepath, D_DIR)
    parts = rel.replace("\\", "/").split("/")
    if len(parts) < 2:
        return True  # 直接在 /d/<area>/ 下的文件
    subdir = parts[1]
    if subdir in ("npc", "obj", "backup", "bak", "condition", "chaser"):
        return False
    return True

def has_inherit_room(content):
    """检查是否继承 ROOM"""
    return bool(re.search(r'inherit\s+', content) and 
                re.search(r'\bROOM\b', content))

def has_outdoors(content):
    """检查是否已设置 outdoors"""
    return bool(re.search(r'set\s*\(\s*"outdoors"', content))

def add_outdoors(filepath, area):
    """在文件中添加 outdoors 属性"""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    
    if has_outdoors(content):
        return False  # 已经有了，跳过
    
    # 在 set("short" 之后的第一行插入
    lines = content.split("\n")
    new_lines = []
    inserted = False
    
    for i, line in enumerate(lines):
        new_lines.append(line)
        if not inserted:
            # 匹配 set("short" 行（含可能的 ANSI 色彩）
            if re.search(r'set\s*\(\s*"short"', line):
                # 获取缩进
                indent = re.match(r'^(\s*)', line).group(1)
                if not indent:
                    indent = "\t"
                # 检查下一行是否已经是 set("outdoors"
                next_line = lines[i + 1] if i + 1 < len(lines) else ""
                if 'set("outdoors"' not in next_line and 'set("outdoors"' not in line:
                    new_lines.append(f'{indent}set("outdoors", "{area}");')
                    inserted = True
    
    if not inserted:
        return False  # 没找到插入点
    
    with open(filepath, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(new_lines))
    return True

def main():
    added = 0
    skipped = 0
    no_short = 0
    
    for root, dirs, files in os.walk(D_DIR):
        # 排除不需要的目录
        dirs[:] = [d for d in dirs if d not in ("backup", "bak", ".git")]
        
        for fname in files:
            if not fname.endswith(".c"):
                continue
            fpath = os.path.join(root, fname)
            
            if not is_room_file(fpath):
                continue
            
            area = extract_area(fpath)
            if not area:
                skipped += 1
                continue
            
            with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            
            if not has_inherit_room(content):
                skipped += 1
                continue
            
            if has_outdoors(content):
                skipped += 1
                continue
            
            if not re.search(r'set\s*\(\s*"short"', content):
                no_short += 1
                print(f"NO_SHORT: {fpath}")
                continue
            
            if add_outdoors(fpath, area):
                added += 1
                print(f"ADDED: {fpath} → {area}")
    
    print(f"\n=== 汇总 ===")
    print(f"已添加 outdoors: {added}")
    print(f"跳过（已有/非ROOM）: {skipped}")
    print(f"无 short 行无法插入: {no_short}")

if __name__ == "__main__":
    main()
