const db = require("../db/connection.promise");

function shuffleWord(word) {
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

async function getShuffledWords(db) {
    const [rows] = await db.query(`SELECT word FROM vocab_api ORDER BY RAND() LIMIT 10`);
    const original = rows.map(row => row.word);
    const scrambled = original.map(shuffleWord);
    return { original, scrambled };
}

let playerQueue = [];  // Hàng đợi người chơi
let activePairs = {};  // Map socketId ↔ socketId (đang chơi cùng ai)
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('Một người chơi kết nối:', socket.id);

        // Lắng nghe sự kiện 'join_queue' khi người chơi tham gia game
        socket.on('join_queue', async (userInfo) => {
            console.log(`${socket.id} (${userInfo.username}) tham gia hàng đợi`);

            if (!userInfo || !userInfo.username) {
                console.warn(`User info không hợp lệ từ ${socket.id}`);
                return;
            }
            let photo_url = ""
            if (userInfo.photo_url) photo_url = userInfo.photo_url

            // Thêm vào hàng đợi
            playerQueue.push({
                socketId: socket.id,
                userInfo: {
                    user_id: userInfo.user_id,
                    username: userInfo.username,
                    photo_url: photo_url
                }
            });

            // Nếu đủ 2 người, ghép đôi
            if (playerQueue.length >= 2) {
                console.log("Start");
                const player1 = playerQueue.shift();
                const player2 = playerQueue.shift();

                // Gửi thông tin người đối diện cho mỗi người chơi
                io.to(player1.socketId).emit('game_start', {
                    message: 'Game bắt đầu!',
                    opponent: player2.userInfo
                });

                io.to(player2.socketId).emit('game_start', {
                    message: 'Game bắt đầu!',
                    opponent: player1.userInfo
                });

                activePairs[player1.socketId] = player2.socketId;
                activePairs[player2.socketId] = player1.socketId;

                const userId1 = player1.userInfo.user_id;
                const userId2 = player2.userInfo.user_id;

                 const { original, scrambled } = await getShuffledWords(db);
                // Gửi dữ liệu game
                io.to(player1.socketId).emit('game_data', {
                    original,
                    scrambled
                });

                io.to(player2.socketId).emit('game_data', {
                    original,
                    scrambled
                });
            }
        });

         // Lắng nghe khi 1 người qua câu tiếp theo
        socket.on('next_question', (data) => {
            const { current_question, current_score } = data;
            const opponentId = activePairs[socket.id];
            if (opponentId) {
                io.to(opponentId).emit('opponent_next_question', {
                    current_question, current_score
                });
                console.log(`📩 Đồng bộ current_question=${current_question}, current_score:${current_score} đến ${opponentId}`);
            }
            console.log(`📨 Nhận next_question từ ${socket.id}, đối thủ là ${opponentId}`);
        });

         // Ngắt kết nối
        socket.on('disconnect', () => {
            const index = playerQueue.findIndex(p => p.socketId === socket.id);
            if (index !== -1) {
                playerQueue.splice(index, 1);
                console.log(`${socket.id} bị loại khỏi hàng đợi`);
            }

            // Xoá khỏi cặp đang chơi
            const opponent = activePairs[socket.id];
            if (opponent) {
                delete activePairs[opponent];
                delete activePairs[socket.id];
                console.log(`${socket.id} rời trận đấu với ${opponent}`);
            }
        });
    });
};
