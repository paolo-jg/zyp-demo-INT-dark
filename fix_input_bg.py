#!/usr/bin/env python3
"""
Scan .jsx files in specific component directories and change bg-gray-200 to bg-white
ONLY on lines that contain <input, <select, or <textarea elements.

Skips: InvoiceCreationFlow.jsx (already fixed)
Skips directories: admin/, auth/, onboarding/, verification/, banks/, transfer/, payments/, kyb/
Targets directories: philippines/, invoices/, recipients/, dashboard/, team/, shared/
"""

import os
import re

BASE_DIR = "/Users/paologarcia/Downloads/zyp-test-main 5/src/components"

TARGET_DIRS = ["philippines", "invoices", "recipients", "dashboard", "team", "shared"]
SKIP_FILES = ["InvoiceCreationFlow.jsx"]

# Pattern: line contains an input/select/textarea opening tag AND bg-gray-200
INPUT_TAG_PATTERN = re.compile(r'<(input|select|textarea)\b')

changes_made = []
files_scanned = 0

for target_dir in TARGET_DIRS:
    dir_path = os.path.join(BASE_DIR, target_dir)
    if not os.path.isdir(dir_path):
        print(f"[SKIP] Directory not found: {dir_path}")
        continue

    for root, dirs, files in os.walk(dir_path):
        for filename in files:
            if not filename.endswith(".jsx"):
                continue
            if filename in SKIP_FILES:
                print(f"[SKIP] {os.path.join(root, filename)} (excluded file)")
                continue

            filepath = os.path.join(root, filename)
            files_scanned += 1

            with open(filepath, "r", encoding="utf-8") as f:
                original_lines = f.readlines()

            modified = False
            new_lines = []
            file_changes = []

            for line_num, line in enumerate(original_lines, start=1):
                # Check if this line has an input/select/textarea tag AND bg-gray-200
                if INPUT_TAG_PATTERN.search(line) and "bg-gray-200" in line:
                    new_line = line.replace("bg-gray-200", "bg-white")
                    new_lines.append(new_line)
                    modified = True
                    file_changes.append({
                        "line": line_num,
                        "before": line.rstrip(),
                        "after": new_line.rstrip(),
                    })
                else:
                    new_lines.append(line)

            if modified:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)

                rel_path = os.path.relpath(filepath, BASE_DIR)
                changes_made.append({"file": rel_path, "changes": file_changes})

# --- Report ---
print("=" * 80)
print("SCAN COMPLETE")
print(f"Files scanned: {files_scanned}")
print(f"Files modified: {len(changes_made)}")
print("=" * 80)

if not changes_made:
    print("\nNo changes were needed.")
else:
    for entry in changes_made:
        print(f"\n--- {entry['file']} ({len(entry['changes'])} change(s)) ---")
        for c in entry["changes"]:
            print(f"  Line {c['line']}:")
            print(f"    BEFORE: {c['before']}")
            print(f"    AFTER:  {c['after']}")

print("\nDone.")
