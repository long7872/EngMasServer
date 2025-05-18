import os

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

def rename_files_in_folders(root_dir):
    # Duyệt qua các thư mục con trong root_dir (Test 1)
    for part in os.listdir(root_dir):
        part_path = os.path.join(root_dir, part)
        if os.path.isdir(part_path):  # Kiểm tra nếu là thư mục
            # Duyệt qua các câu hỏi trong từng part
            for question in os.listdir(part_path):
                question_path = os.path.join(part_path, question)
                if os.path.isdir(question_path):
                    # Đổi tên từng loại file
                    rename_mp3_files(question_path)
                    rename_jpg_files(question_path)
                    rename_json_files(question_path)

# Mở file để ghi câu hỏi và câu trả lời vào
data_directory = os.path.join(os.path.dirname(__file__), "../data/TOEIC")
os.makedirs(data_directory, exist_ok=True)  # Tạo thư mục nếu chưa tồn tại

# Tiến hành ghi vào file
file_path = os.path.join(data_directory, f"Test 2 - ETS 2024")

# Thay đổi đường dẫn root_dir tới thư mục chứa Test 1
root_dir = file_path
rename_files_in_folders(root_dir)
