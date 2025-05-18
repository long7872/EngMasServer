import os
import requests
from bs4 import BeautifulSoup

# URL của trang chứa các bài tập ngữ pháp
url = 'https://www.perfect-english-grammar.com/grammar-exercises.html'

# Gửi yêu cầu HTTP để lấy nội dung của trang
response = requests.get(url)

# Kiểm tra xem yêu cầu có thành công không (Mã 200 OK)
if response.status_code == 200:
    # Phân tích HTML của trang
    soup = BeautifulSoup(response.content, 'html.parser')

    # Lọc phần nội dung chính với id 'main-content'
    main_content = soup.find('section', {'id': 'main-content'})

    # Tìm tất cả các liên kết trong phần tử <a> có thuộc tính href trong phần main-content
    exercises = main_content.find_all('a', href=True)  # Tìm tất cả thẻ <a> có thuộc tính href
    
    # Lọc ra các liên kết có chứa từ "exercise" hoặc các từ khóa như "past", "present", "simple", ...
    keywords = ["exercise", "past", "present", "simple", "tense", "conditionals", "perfect"]
    
    # Loại bỏ các liên kết không liên quan đến bài tập (ví dụ: "membership", "about", "contact", ...)
    exclude_keywords = ["membership", "contact", "about", "privacy-policy", "the-method"]

    exercise_links = [
        link['href'] for link in exercises
        if any(keyword in link['href'] for keyword in keywords) 
        and not any(exclude in link['href'] for exclude in exclude_keywords)
    ]
    
    # Đảm bảo thư mục ../data tồn tại
    data_directory = os.path.join(os.path.dirname(__file__), "../data")
    os.makedirs(data_directory, exist_ok=True)  # Tạo thư mục nếu chưa tồn tại

    # Định nghĩa đường dẫn file
    file_path = os.path.join(data_directory, "exercise_links.txt")

    # Ghi các liên kết vào file
    with open(file_path, "w", encoding="utf-8") as file:
        for link in exercise_links:
            # Đảm bảo đường dẫn là đầy đủ, nếu là đường dẫn tương đối
            if link.startswith('/'):
                link = f"https://www.perfect-english-grammar.com{link}"
            file.write(link + "\n")
    
    print(f"Đã lưu tất cả các liên kết bài tập vào file: {file_path}")

else:
    print(f"Failed to retrieve content. Status code: {response.status_code}")
