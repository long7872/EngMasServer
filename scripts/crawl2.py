import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from bs4 import BeautifulSoup
import os
import time

# Hàm để lấy câu hỏi và câu trả lời từ mỗi trang và lưu vào file riêng biệt
def interact_with_show_button(url, file_index):
    # Thiết lập driver cho Selenium
    options = Options()
    options.headless = False  # Nếu bạn muốn xem trình duyệt chạy
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    # Mở trang
    driver.get(url)

    try:
        # Cuộn trang một chút để overlay có thể xuất hiện
        driver.execute_script("window.scrollBy(0, 500);")
        time.sleep(1)  # Đợi một chút cho overlay xuất hiện

        # Chờ đợi cho phần overlay (nếu có) và nút đóng hiện ra
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.formkit-close'))
        )

        # Tìm và nhấn nút đóng overlay
        close_button = driver.find_element(By.CSS_SELECTOR, '.formkit-close')
        close_button.click()
        print("Overlay đã được đóng.")

        # Chờ đợi cho các nút "Show" xuất hiện
        show_buttons = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.XPATH, "//button[contains(text(), 'Show')]"))
        )
        
        # Cuộn đến từng nút "Show" và nhấn vào
        for button in show_buttons:
            # Cuộn đến nút Show
            driver.execute_script("arguments[0].scrollIntoView();", button)
            time.sleep(0.01)  # Đợi 1 giây để cuộn hoàn tất

            # Sử dụng ActionChains để đảm bảo nút có thể được nhấn
            actions = ActionChains(driver)
            actions.move_to_element(button).click().perform()
            time.sleep(0.01)  # Đợi 1 giây để phần trả lời xuất hiện

        print("Đã nhấn tất cả các nút Show.")

        # Đợi một lúc cho các câu trả lời hiển thị đầy đủ trước khi lấy dữ liệu
        time.sleep(1)

    finally:
        # Sau khi đã nhấn nút "Show", lấy dữ liệu câu hỏi và câu trả lời
        extract_data(driver.page_source, file_index)
        driver.quit()  # Đảm bảo đóng trình duyệt sau khi hoàn thành


def extract_data(page_source, file_index):
    # Dùng BeautifulSoup để phân tích mã nguồn trang web đã tải
    soup = BeautifulSoup(page_source, 'html.parser')

    # Mở file để ghi câu hỏi và câu trả lời vào
    data_directory = os.path.join(os.path.dirname(__file__), "../data")
    os.makedirs(data_directory, exist_ok=True)  # Tạo thư mục nếu chưa tồn tại

# Tiến hành ghi vào file
    file_path = os.path.join(data_directory, f"questions_answers{file_index}.txt")
    with open(file_path, "w", encoding="utf-8") as file:
        # Tìm tất cả các thẻ div với id="exercise"
        exercise_div = soup.find('div', id='exercise')

        if exercise_div:
            # Tiến hành tìm các thẻ div bên trong thẻ div với id="exercise"
            inner_div = exercise_div.find('div')
            
            if inner_div:
                # Tìm và lấy nội dung từ thẻ h1 bên trong
                title = inner_div.find('h1')
                if title:
                    file.write(f"Title: {title.get_text(strip=True)}\n")
                    file.write("-" * 50 + "\n")
                else:
                    print("Không tìm thấy thẻ <h1>.")

            else:
                print("Không tìm thấy thẻ <div> bên trong thẻ <div id='exercise'>.")

        else:
            print("Không tìm thấy thẻ <div id='exercise'>.")
        
        # Tìm tất cả các câu hỏi trong bài tập
        exercises = soup.find_all('tr')

        # Loop qua từng câu hỏi trong mỗi phần tử <tr>
        for exercise in exercises:
            # Trích xuất câu hỏi từ các phần tử span có class textPart
            question_parts = exercise.find_all('span', class_='textPart')
            # print(f"Question part: {question_parts}\n")
            
            # Kiểm tra xem có bao nhiêu phần tử 'textPart'
            if len(question_parts) > 1:
                # Nếu có nhiều hơn 1 phần tử 'textPart', nối chúng lại với nhau
                question = ' [answer] '.join(part.get_text(strip=True) for part in question_parts)
                # print(f"Question > 1: {question}\n")
            else:
                # Nếu chỉ có 1 phần tử 'textPart', thêm [answer] vào sau câu hỏi
                question = question_parts[0].get_text(strip=True) + " [answer]"
                # print(f"Question with [answer]: {question}\n")

            # Tìm tất cả các thẻ span có style="color: rgb(28, 97, 99);"
            answer_parts = exercise.find_all('span', style="color: rgb(28, 97, 99); padding: 1px;")
            
            # Lọc các thẻ <span> có chứa "[ " và "]"
            answer = None
            for part in answer_parts:
                part_text = part.get_text(strip=True)
                if part_text.startswith("[") and part_text.endswith("]"):
                    answer = part_text[1:-1]  # Loại bỏ dấu "[" và "]"
                    break

            if not answer:
                answer = "No answer found"

            # Ghi câu hỏi và câu trả lời vào file
            file.write(f"Question: {question}\n")
            file.write(f"Answer: {answer}\n")
            file.write("-" * 50 + "\n")

# Đọc các liên kết bài tập từ file
def read_links_from_file(file_path):
    # Kiểm tra nếu file tồn tại
    if not os.path.exists(file_path):
        print(f"File không tồn tại: {file_path}")
        return []

    # Đọc các liên kết từ file
    with open(file_path, "r", encoding="utf-8") as file:
        links = file.readlines()

    # Loại bỏ ký tự thừa như dấu xuống dòng và trả về danh sách các liên kết
    return [link.strip() for link in links]

# Đảm bảo thư mục ../data tồn tại
data_directory = os.path.join(os.path.dirname(__file__), "../data")
os.makedirs(data_directory, exist_ok=True)  # Tạo thư mục nếu chưa tồn tại

# Đường dẫn đến file chứa các liên kết bài tập
file_path = os.path.join(data_directory, "exercise_links.txt")

# Lấy danh sách liên kết từ file
exercise_links = read_links_from_file(file_path)

# Kiểm tra các liên kết đã được đọc
if not exercise_links:
    print("Không có liên kết bài tập nào.")
else:
    print(f"Đã tìm thấy {len(exercise_links)} liên kết bài tập.")
    
    # Sử dụng các liên kết trong Selenium
    for i, link in enumerate(exercise_links, start=1):
        print(f"Đang xử lý bài tập {i}: {link}")
        interact_with_show_button(link, i)  # Hàm của bạn xử lý từng bài tập
