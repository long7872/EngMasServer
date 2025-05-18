const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config({ path: 'server.env' });

const app = express();
const server = http.createServer(app);  // Create server for express
const io = socketIo(server);  // Use the server created for socket.io

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
const userRoutes = require('./routes/user.routes');
const vocabRoutes = require('./routes/vocab.routes');
const topicRoutes = require('./routes/topic.routes');
const courseRoutes = require('./routes/course.routes');
const voiceRoutes = require('./routes/voice.routes');

app.use('/users', userRoutes);
app.use('/vocabs', vocabRoutes);
app.use('/topics', topicRoutes);
app.use('/courses', courseRoutes);
app.use('/voices', voiceRoutes);

// Import và sử dụng Socket.IO controller
require('./socket/socket.controller')(io);

server.listen(PORT, () => {
  console.log(`🚀 Server express socket đang chạy tại http://localhost:${PORT}`);
});