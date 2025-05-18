import os
import json
import re

def get_unique_filename(directory, filename):
    # Kiểm tra nếu file đã tồn tại, nếu có, thêm hậu tố số vào tên file
    base_name, ext = os.path.splitext(filename)
    counter = 1
    new_filename = filename
    while os.path.exists(os.path.join(directory, new_filename)):
        new_filename = f"{base_name}_{counter}{ext}"
        counter += 1
    return new_filename

def rename_mp3_files(question_path):
    # Đổi tên file mp3
    for file in os.listdir(question_path):
        if file.endswith('.mp3'):
            file_path = os.path.join(question_path, file)
            new_name = "audio_question.mp3"
            new_file_path = os.path.join(question_path, get_unique_filename(question_path, new_name))
            os.rename(file_path, new_file_path)
            print(f"Đổi tên {file} thành {new_name}")

def rename_jpg_files(question_path):
    # Đổi tên file jpg
    for file in os.listdir(question_path):
        if file.endswith('.jpg'):
            file_path = os.path.join(question_path, file)
            new_name = "image_question_1.jpg"
            new_file_path = os.path.join(question_path, get_unique_filename(question_path, new_name))
            os.rename(file_path, new_file_path)
            print(f"Đổi tên {file} thành {new_name}")

def rename_json_files(question_path):
    # Đổi tên file json
    for file in os.listdir(question_path):
        if file.endswith('.json'):
            file_path = os.path.join(question_path, file)
            new_name = "question.json"
            new_file_path = os.path.join(question_path, get_unique_filename(question_path, new_name))
            os.rename(file_path, new_file_path)
            print(f"Đổi tên {file} thành {new_name}")

def remove_trailing_commas_from_json(file_path):
    """
    Hàm này kiểm tra và sửa lỗi dấu phẩy dư trong JSON.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = f.read()

    # Sử dụng biểu thức chính quy để loại bỏ dấu phẩy dư sau phần tử cuối cùng trong đối tượng hoặc mảng
    data = re.sub(r",\s*([}\]])", r"\1", data)

    # Ghi lại nội dung đã chỉnh sửa vào file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(data)
    print(f"Đã sửa dấu phẩy dư trong {file_path}")

def add_missing_commas_to_json(file_path):
    """
    Hàm này kiểm tra và thêm dấu phẩy thiếu trong JSON.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        data = f.read()

    # Biểu thức chính quy để tìm thiếu dấu phẩy giữa các phần tử
    # Tìm chuỗi dạng 'value1value2' (không có dấu phẩy giữa các giá trị)
    data = re.sub(r'(\d)(\s*[{\[])', r'\1,\2', data)  # Thêm dấu phẩy giữa các phần tử số trong đối tượng hoặc mảng
    data = re.sub(r'(\s*)([A-Za-z0-9"])(\s*[:])', r'\1,\2\3', data)  # Thêm dấu phẩy nếu thiếu giữa giá trị và dấu :

    # Ghi lại nội dung đã chỉnh sửa vào file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(data)
    print(f"Đã sửa thiếu dấu phẩy trong {file_path}")

def check_and_add_brackets_to_json(file_path):
    # Đọc nội dung file JSON
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Quét và xóa dấu phẩy dư trong các key của JSON
    data = remove_commas_in_keys(data)

    # Kiểm tra nếu nội dung không phải là danh sách
    if not isinstance(data, list):
        # Nếu không phải danh sách, thêm vào danh sách
        data = [data]

    # Ghi lại nội dung đã chỉnh sửa vào file
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
    print(f"Đã sửa dấu phẩy dư trong key và thay đổi nội dung trong {file_path} thành danh sách nếu cần.")


def remove_commas_in_keys(d):
    """
    Hàm này quét qua tất cả các key trong dictionary và xóa dấu phẩy dư.
    """
    if isinstance(d, dict):  # Nếu là dictionary
        return {re.sub(r',+', '', key): remove_commas_in_keys(value) for key, value in d.items()}
    elif isinstance(d, list):  # Nếu là list, tiếp tục quét các phần tử trong list
        return [remove_commas_in_keys(item) for item in d]
    else:
        return d  # Nếu không phải dict hoặc list, giữ nguyên giá trị
        
def rename_files_in_folders(root_dir):
    added_files = []  # Danh sách lưu các file không bắt đầu và kết thúc bằng []
    
    # Duyệt qua các thư mục con trong root_dir (Test 1)
    for part in os.listdir(root_dir):
        part_path = os.path.join(root_dir, part)
        if os.path.isdir(part_path):  # Kiểm tra nếu là thư mục
            # Duyệt qua các câu hỏi trong từng part
            for question in os.listdir(part_path):
                question_path = os.path.join(part_path, question)
                if os.path.isdir(question_path):
                    
                    # Kiểm tra và sửa nội dung của các file JSON
                    for file in os.listdir(question_path):
                        if file.endswith('.json'):
                            file_path = os.path.join(question_path, file)
                            # remove_trailing_commas_from_json(file_path)  # Loại bỏ dấu phẩy dư
                            # add_missing_commas_to_json(file_path)  # Thêm dấu phẩy thiếu nếu có
                            check_and_add_brackets_to_json(file_path)  # Kiểm tra và thêm dấu ngoặc
                            added_files.append(file)
    
    # In ra danh sách các file đã được xử lý
    print("\nDanh sách các file đã được xử lý:")
    for file in added_files:
        print(file)
# Mở file để ghi câu hỏi và câu trả lời vào
data_directory = os.path.join(os.path.dirname(__file__), "../data/TOEIC")
os.makedirs(data_directory, exist_ok=True)  # Tạo thư mục nếu chưa tồn tại

# Tiến hành ghi vào file
file_path = os.path.join(data_directory, f"Test 1 - ETS 2024")

# Thay đổi đường dẫn root_dir tới thư mục chứa Test 1
root_dir = file_path
rename_files_in_folders(root_dir)
