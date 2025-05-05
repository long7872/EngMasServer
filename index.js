const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config({ path: 'server.env' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
const userRoutes = require('./routes/user.routes');
app.use('/users', userRoutes);
const vocabRoutes = require('./routes/vocab.routes');
app.use('/vocabs', vocabRoutes);
const topicRoutes = require('./routes/topic.routes')
app.use('/topics', topicRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
