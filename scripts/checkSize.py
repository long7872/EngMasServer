import os
import sys

def human_readable_size(size_in_bytes):
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_in_bytes < 1024:
            return f"{size_in_bytes:.2f} {unit}"
        size_in_bytes /= 1024

def get_folder_size(path):
    total_size = 0
    file_count = 0
    print(f"\n[SCAN] Thư mục: {path}")
    for dirpath, _, filenames in os.walk(path):
        for f in filenames:
            try:
                fp = os.path.join(dirpath, f)
                size = os.path.getsize(fp)
                total_size += size
                file_count += 1
                print(f"  [FILE] {f} - {human_readable_size(size)}")
            except Exception as e:
                print(f"  [WARN] Không đọc được {f}: {e}")
                continue
    print(f"[DONE] {file_count} file, tổng: {human_readable_size(total_size)}")
    return total_size

def scan_folders(base_path):
    folder_sizes = []
    for dirpath, _, _ in os.walk(base_path):
        size = get_folder_size(dirpath)
        folder_sizes.append((dirpath, size))
    return folder_sizes

# Đường dẫn gốc
folder_path = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users'
output_file = 'folder_sizes.txt'

if not os.path.exists(folder_path):
    print(f"[ERROR] Thư mục không tồn tại: {folder_path}")
    sys.exit(1)

# Quét và ghi file
print(f"[START] Quét thư mục gốc: {folder_path}")
folder_data = scan_folders(folder_path)

folder_data_sorted = sorted(folder_data, key=lambda x: x[1], reverse=True)

with open(output_file, 'w', encoding='utf-8') as f:
    for idx, (folder, size) in enumerate(folder_data_sorted, 1):
        line = f"{idx:>3}. {human_readable_size(size):>10}    {folder}"
        print(line)  # Debug ra terminal
        f.write(line + '\n')

print(f"\n[SAVED] Đã ghi kết quả vào: {output_file}")
