"""
重命名导入语句脚本
将所有 gpt_researcher 导入语句改为 ycm_researcher
"""
import os
import re
from pathlib import Path

def rename_imports_in_file(file_path):
    """
    在单个文件中重命名导入语句
    """
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # 替换导入语句
    modified_content = re.sub(
        r'from gpt_researcher', 
        'from ycm_researcher', 
        content
    )
    modified_content = re.sub(
        r'import gpt_researcher', 
        'import ycm_researcher', 
        modified_content
    )
    
    # 如果内容有变化，写回文件
    if content != modified_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(modified_content)
        print(f"已修改: {file_path}")
        return True
    return False

def rename_imports_in_directory(directory):
    """
    在目录中递归重命名所有 Python 文件中的导入语句
    """
    modified_count = 0
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                if rename_imports_in_file(file_path):
                    modified_count += 1
    
    return modified_count

if __name__ == "__main__":
    ycm_researcher_dir = Path("ycm_researcher")
    
    print("开始重命名导入语句...")
    modified_count = rename_imports_in_directory(ycm_researcher_dir)
    print(f"完成！已修改 {modified_count} 个文件。")
