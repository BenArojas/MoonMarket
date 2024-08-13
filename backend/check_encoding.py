import os

def check_utf8(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            file.read()
        return True
    except UnicodeDecodeError:
        return False

def scan_directory(directory):
    non_utf8_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                if not check_utf8(file_path):
                    non_utf8_files.append(file_path)
    return non_utf8_files

# Replace '.' with your project directory if different
problematic_files = scan_directory('.')
if problematic_files:
    print("Files that are not UTF-8 encoded:")
    for file in problematic_files:
        print(file)
else:
    print("All Python files are UTF-8 encoded.")