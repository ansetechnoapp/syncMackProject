import os
import ast

# This function scans all .py files in the given directory and its subdirectories.
# It always includes 'AgentTraeCreated/Rephrasing/project_scanner.py' and 'AgentTraeCreated/Rephrasing/question_optimizer.py'
# in the scan, regardless of their location, for deeper analysis.
def scan_project(directory):
    project_info = {}
    # Always include these two files explicitly
    special_files = [
        os.path.abspath(os.path.join(directory, 'AgentTraeCreated', 'Rephrasing', 'project_scanner.py')),
        os.path.abspath(os.path.join(directory, 'AgentTraeCreated', 'Rephrasing', 'question_optimizer.py'))
    ]
    scanned_files = set()
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.abspath(os.path.join(root, file))
                scanned_files.add(filepath)
    # Add special files if not already found
    for sf in special_files:
        scanned_files.add(sf)
    for filepath in scanned_files:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    tree = ast.parse(f.read())
                    functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
                    classes = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
                    project_info[filepath] = {'functions': functions, 'classes': classes}
                except Exception:
                    continue
    return project_info
