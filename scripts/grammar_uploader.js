const fs = require("fs");
const path = require("path");
const db = require("../db/connection.promise");

// Đọc file chứa câu hỏi và câu trả lời
async function parseQuestionsFromFile(filePath) {
  const data = fs.readFileSync(filePath, "utf-8");

  // Chia dữ liệu thành các phần, tách theo 2 dòng trống (ngăn cách giữa các mục)
  const sections = data.split("\n\n");
  const questionsData = [];

  for (let section of sections) {
    // Xử lý mỗi phần, chia theo dòng
    const lines = section.split("\n");

    // Bỏ qua các dòng gạch ngang
    const validLines = lines.filter((line) => !line.startsWith("-"));

    // Lấy tiêu đề (Title)
    const titleLine = validLines[0];
    const title = titleLine.replace("Title: ", "").trim();

    // Lấy câu hỏi và câu trả lời
    const questions = [];
    for (let i = 1; i < validLines.length; i++) {
      if (validLines[i].startsWith("Question:")) {
        const question = validLines[i].replace("Question: ", "").trim();
        const answer = validLines[i + 1].replace("Answer: ", "").trim();
        questions.push({ question, answer });
        i++; // Bỏ qua dòng "Answer" đã xử lý
      }
    }

    questionsData.push({ title, questions });
  }

  return questionsData;
}

// Hàm để chèn vào cơ sở dữ liệu
async function insertGrammarData(questionsData) {
  for (let data of questionsData) {
    const { title, questions } = data;

    // Chèn vào bảng grammar_type với api_id và tên loại ngữ pháp
    const [grammarTypeRes] = await db.query(
      "INSERT INTO grammar_type (grammar_name) VALUES (?)",
      [title]
    );
    const grammarTypeId = grammarTypeRes.insertId;

    // Chèn câu hỏi và câu trả lời vào bảng grammar_questions
    for (let questionData of questions) {
      const { question, answer } = questionData;

      // Chèn loại ngữ pháp vào bảng api với type là 'grammar'
      const [apiRes] = await db.query(
        "INSERT INTO api (type) VALUES ('grammar')"
      );
      const api_id = apiRes.insertId;

      await db.query(
        "INSERT INTO grammar_api (api_id, grammar_type_id, question, answer) VALUES (?, ?, ?, ?)",
        [api_id, grammarTypeId, question, answer]
      );
    }

    console.log(`✅ Inserted questions for "${title}"`);
  }
}

// Đọc tất cả các file từ thư mục ../data/
async function processFiles() {
  const directoryPath = path.join(__dirname, "../data");

  // Đọc tất cả các file trong thư mục
  const files = fs.readdirSync(directoryPath);

  // Lọc ra các file .txt
  const txtFiles = files.filter((file) => file.startsWith("questions_answers"));

  for (let file of txtFiles) {
    const filePath = path.join(directoryPath, file);

    try {
      console.log(`Đang xử lý file: ${filePath}`);
      const questionsData = await parseQuestionsFromFile(filePath);
      await insertGrammarData(questionsData);
      console.log(`✅ Dữ liệu từ file "${file}" đã được chèn thành công`);
    } catch (err) {
      console.error(`❌ Lỗi khi xử lý file "${file}":`, err);
    }
  }
}

// Main function
async function main() {
  try {
    await processFiles();
    console.log("✅ Tất cả dữ liệu đã được chèn thành công");
  } catch (err) {
    console.error("❌ Lỗi:", err);
  } finally {
    db.end(); // Đóng kết nối với cơ sở dữ liệu
  }
}

main();
