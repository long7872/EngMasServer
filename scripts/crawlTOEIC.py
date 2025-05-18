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
def interact(url):
    # Thiết lập driver cho Selenium
    options = Options()
    options.headless = False  # Nếu bạn muốn xem trình duyệt chạy
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

    # Mở trang
    driver.get(url)

    try:
        time.sleep(1)  # Đợi một chút cho overlay xuất hiện

        # Chờ cho nút 'Tiếp tục với tư cách khách' xuất hiện và nhấp vào đó
        wait = WebDriverWait(driver, 10)
        guest_button = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "continue-as-guest")))
        guest_button.click()
        time.sleep(1)
        print("Đã nhấn: Tiếp tục với tư cách khách")

        # Xử lý pop-up nếu có
        alert = WebDriverWait(driver, 5).until(EC.alert_is_present())
        alert.accept()  # Nhấn vào OK trên pop-up
        time.sleep(1)
        print("Đã nhấn OK trên pop-up")

        # Chờ cho nút 'Bắt đầu' xuất hiện và nhấp vào đó
        start_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a.butt.active.start-quiz")))
        driver.execute_script("arguments[0].scrollIntoView(true);", start_button)
        time.sleep(1)
        start_button.click()
        time.sleep(1)
        print("Đã nhấn nút Bắt đầu")

        # Chờ cho nút 'Bắt đầu tiếp theo' xuất hiện và nhấp vào đó
        continue_start_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a.butt.active")))
        driver.execute_script("arguments[0].scrollIntoView(true);", continue_start_button)
        time.sleep(1)
        continue_start_button.click()
        time.sleep(1)
        print("Đã nhấn nút Bắt đầu tiếp theo")

        # Chờ cho nút 'Nộp bài' xuất hiện và nhấp vào đó
        submit_button = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button#btnNopBai.butt.summit"))
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", submit_button)
        time.sleep(1)
        submit_button.click()
        time.sleep(1)
        print("Đã nhấn nút Nộp bài")
        
        # Chờ cho nút 'Gửi bài ngay' xuất hiện và nhấp vào đó
        continue_submit_button = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn.btn-submit"))
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", continue_submit_button)
        time.sleep(1)
        continue_submit_button.click()
        time.sleep(1)
        print("Đã nhấn nút Gửi bài ngay")
        
        # Chờ cho nút 'xem đáp án' xuất hiện và nhấp vào đó
        show_answer_button = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.button.primary.btn_showRighAnswer"))
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", show_answer_button)
        time.sleep(1)
        show_answer_button.click()
        time.sleep(1)
        print("Đã nhấn nút xem đáp án")
        
        # for index in range(1, 32):
        #     crawlP1P2(driver, index)

        crawlP3P4(driver, 32)
        
    finally:
        driver.quit()

def crawlP1P2(driver, index):
    
    # Lấy HTML của trang sau khi nhấn 'xem đáp án' để trích xuất câu hỏi và câu trả lời
    page_source = driver.page_source
    soup = BeautifulSoup(page_source, 'html.parser')

    # Mở file để ghi câu hỏi và câu trả lời vào
    data_directory = os.path.join(os.path.dirname(__file__), f"../data/TOEIC/TEST 2/{index}")
    os.makedirs(data_directory, exist_ok=True)  # Tạo thư mục nếu chưa tồn tại
    
    # Tìm tất cả các thẻ <div class="audio-test"> và lấy các tệp âm thanh từ thẻ <audio> bên trong
    audio_divs = soup.find_all('div', class_='audio-test')  # Tìm tất cả thẻ div có class='audio-test'
    
    if audio_divs:
        for div in audio_divs:
            audio = div.find('audio')  # Tìm thẻ <audio> trong mỗi thẻ <div class="audio-test">
            if audio:
                audio_url = audio.find('source')['src']  # Lấy URL âm thanh từ thẻ <source>
                # Gọi hàm tải về và lưu vào thư mục data_directory
                download_audio(audio_url, data_directory, f"audio_{index}.mp3")
                print(f"Đã tải âm thanh {index}")
    
    # Tìm thẻ <div class="item-flex"> và lấy ảnh trong thẻ <img>
    item_flex_div = soup.find('div', class_='item-flex')
    if item_flex_div:
        img_tag = item_flex_div.find('img')
        if img_tag and img_tag.get('src'):
            image_url = img_tag['src']  # Lấy URL của ảnh
            # Lưu ảnh vào thư mục
            download_image(image_url, data_directory, f"image_{index}.jpg")
            print(f"Đã tải ảnh {index}")

    # Tìm thẻ <div class="explanation ng-binding"> và lấy tất cả các thẻ <strong> bên trong
    explanation_div = soup.find('div', class_='explanation ng-binding')
    if explanation_div:
        p_tags = explanation_div.find_all('p', recursive=False)  # Tìm tất cả thẻ <p>
        explanations = []
        if p_tags:
            p = p_tags[0]
            strong_tags = p.find_all('strong')
            
            # Trích xuất nội dung giữa các thẻ <br>
            content = p.get_text(separator='\n', strip=True)
            explanations.append(content)  # Thêm nội dung chính từ <p> vào danh sách giải thích
            
            # Trích xuất tất cả nội dung giữa các thẻ <br> và <strong>
            for strong in strong_tags:
                explanations.append(strong.text.strip())  # Thêm nội dung từ thẻ <strong>
            
        # Ghi vào file
        explanation_file_path = os.path.join(data_directory, f"explanation_{index}.txt")
        with open(explanation_file_path, "w", encoding="utf-8") as file:
            for explanation in explanations:
                file.write(f"{explanation}\n")
        
        print(f"Đã lưu giải thích vào {explanation_file_path}")
        
    # Chờ cho nút 'Bắt đầu tiếp theo' xuất hiện và nhấp vào đó
    next_button = WebDriverWait(driver, 20).until(
        EC.element_to_be_clickable((By.XPATH, "//a[@class='butt active ng-scope' and @ng-if='ctrlVar.canNext']"))
    )
    next_button.click()
    time.sleep(1)
    print("Đã nhấn nút next")

def crawlP3P4(driver, index):
    
    # Lấy HTML của trang sau khi nhấn 'xem đáp án' để trích xuất câu hỏi và câu trả lời
    page_source = driver.page_source
    soup = BeautifulSoup(page_source, 'html.parser')

    # Mở file để ghi câu hỏi và câu trả lời vào
    data_directory = os.path.join(os.path.dirname(__file__), f"../data/TOEIC/TEST 2/{index}")
    os.makedirs(data_directory, exist_ok=True)  # Tạo thư mục nếu chưa tồn tại
    
    # Tìm tất cả các thẻ <div class="audio-test"> và lấy các tệp âm thanh từ thẻ <audio> bên trong
    audio_divs = soup.find_all('div', class_='audio-test')  # Tìm tất cả thẻ div có class='audio-test'
    
    if audio_divs:
        for div in audio_divs:
            audio = div.find('audio')  # Tìm thẻ <audio> trong mỗi thẻ <div class="audio-test">
            if audio:
                audio_url = audio.find('source')['src']  # Lấy URL âm thanh từ thẻ <source>
                # Gọi hàm tải về và lưu vào thư mục data_directory
                download_audio(audio_url, data_directory, f"audio_{index}.mp3")
                print(f"Đã tải âm thanh {index}")
    
    # Tìm thẻ <div class="item-flex"> và lấy ảnh trong thẻ <img>
    item_flex_div = soup.find('div', class_='item-flex')
    if item_flex_div:
        img_tag = item_flex_div.find('img')
        if img_tag and img_tag.get('src'):
            image_url = img_tag['src']  # Lấy URL của ảnh
            # Lưu ảnh vào thư mục
            download_image(image_url, data_directory, f"image_{index}.jpg")
            print(f"Đã tải ảnh {index}")


    # Tìm thẻ <div class="exe-pro ng-scope">
    general_div = soup.find('div', class_='exe-pro ng-scope')
    if general_div:
        explanations = []
        options = general_div.find_all('div', class_='form-option ng-scope')
        for option in options:
            title = option.find('h3', class_='ng-binding')
            explanations.append(title.text.strip())
        
            choices = []
            choice_labels = option.find_all('label', class_='ng-scope')
            for label in choice_labels:
                choice_text = label.find('p', class_='ng-binding').text.strip()
                choices.append(choice_text)
                explanations.append(choice_text)    
            
            # 3. Lấy lựa chọn có ng-empty=true (được chọn)
            selected_choice = option.find('input', class_='ng-empty true')
            if selected_choice:
                selected_value = selected_choice.get('value')  # Lấy giá trị của lựa chọn được chọn
                selected_text = choices[int(selected_value)]  # Tìm nội dung của lựa chọn được chọn
                explanations.append(selected_text)
            else:
                selected_text = "Không có lựa chọn"
        # Ghi vào file
        explanation_file_path = os.path.join(data_directory, f"explanation_{index}.txt")
        with open(explanation_file_path, "w", encoding="utf-8") as file:
            for explanation in explanations:
                file.write(f"{explanation}\n")
        
        print(f"Đã lưu giải thích vào {explanation_file_path}")
        
    # Chờ cho nút 'Bắt đầu tiếp theo' xuất hiện và nhấp vào đó
    next_button = WebDriverWait(driver, 20).until(
        EC.element_to_be_clickable((By.XPATH, "//a[@class='butt active ng-scope' and @ng-if='ctrlVar.canNext']"))
    )
    next_button.click()
    time.sleep(1)
    print("Đã nhấn nút next")

def download_audio(audio_url, data_directory, file_name):
    # Tải âm thanh và lưu vào thư mục đã chỉ định
    if not os.path.exists(data_directory):
        os.makedirs(data_directory)

    response = requests.get(audio_url, stream=True)
    file_path = os.path.join(data_directory, file_name)

    with open(file_path, "wb") as audio_file:
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                audio_file.write(chunk)

    print(f"Đã tải xuống {file_name} vào thư mục {data_directory}")
    
def download_image(image_url, data_directory, file_name):
    # Tải ảnh và lưu vào thư mục đã chỉ định
    if not os.path.exists(data_directory):
        os.makedirs(data_directory)

    response = requests.get(image_url, stream=True)
    file_path = os.path.join(data_directory, file_name)

    with open(file_path, "wb") as image_file:
        for chunk in response.iter_content(chunk_size=1024):
            if chunk:
                image_file.write(chunk)

    print(f"Đã tải xuống {file_name} vào thư mục {data_directory}")

url = "https://zenlishtoeic.vn/stm-quizzes/test-2-ets-2024/"
interact(url)