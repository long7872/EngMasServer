# EngMasServer

## 1. Header & Badges

> A robust, scalable, and real-time backend engine powering the EngMas English learning platform.

[![Live API status](https://img.shields.io/website?url=https%3A%2F%2Fengmasserver.onrender.com%2Fusers%2F1%2Fbadges&up_message=online&down_message=unavailable&label=API&style=for-the-badge)](https://engmasserver.onrender.com)
[![Render deployment](https://img.shields.io/badge/Render-deployed-46E3B7?logo=render&logoColor=white&style=for-the-badge)](https://engmasserver.onrender.com)

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.11-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.1.0-000000?logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-010101?logo=socket.io&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Aiven%20Cloud-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue.svg)

**Live API:** [https://engmasserver.onrender.com](https://engmasserver.onrender.com)

EngMasServer provides the backend services for vocabulary and grammar learning, course progress, user and friendship features, and a real-time multiplayer word challenge. It exposes REST endpoints to Android and web clients and a Socket.IO gateway for interactive game events. The voice-assessment integration is currently unavailable because the deployed `LC_API_KEY` is not working.

## 2. Architecture & High-Impact Features

- **Real-time challenge synchronization:** Socket.IO pairs queued players and relays game data, question progress, and opponent departure events, enabling responsive head-to-head learning sessions.
- **Modular REST architecture:** Express routers isolate user, vocabulary, topic, course, and voice capabilities, giving clients clear resource boundaries and providing a foundation for independently evolving services.
- **Learning progress workflows:** REST endpoints combine vocabulary/grammar content with per-user learning status and update course progress in MySQL, supporting continuity between study sessions.
- **Relational data integrity:** The checked-in schema snapshots model learning content and user relationships with primary keys, unique constraints, and foreign keys. Parameterized MySQL queries are used for database values.
- **Bounded connection pooling:** The application uses the `mysql2/promise` pool with `waitForConnections` and a configured five-connection limit rather than opening a new connection for each request.
- **External service integration:** Dropbox-backed profile image uploads and a LanguageConfidence speech-assessment integration are implemented as separate workflows. Speech assessment is currently unavailable in the live deployment because its `LC_API_KEY` is not working.
- **Operational visibility:** Route handlers return error responses and selected failures are logged to the server console. Error handling is currently route-local rather than centralized middleware.

## 3. Tech Stack & Ecosystem

| Category | Technologies | Role |
|---|---|---|
| Core runtime & framework | Node.js, Express 5, `cors`, `dotenv` | HTTP server, REST routing, JSON parsing, and environment-based configuration |
| Real-time communication | Socket.IO 4 | Multiplayer queue, game initialization, progress relay, and disconnect notifications |
| Database & drivers | MySQL, Aiven Cloud MySQL, `mysql2` / `mysql2/promise` | Relational persistence and asynchronous pooled queries |
| Cloud & hosting | Render, Aiven | Application hosting and managed MySQL infrastructure for the deployed service |
| Integrations | Dropbox SDK, LanguageConfidence API, Axios | Profile image storage, speech assessment, and data-ingestion/translation scripts |
| DevTools & data tooling | npm, Node.js watch mode, Python, `requirements.txt` | Dependency management, local development, and offline data preparation/import scripts |

## Ecosystem Integration

EngMasServer is the backend component of the two-part EngMas product ecosystem:

- **Android client:** [EngMas](https://github.com/long7872/EngMas) consumes this server's REST endpoints for users, friendships, vocabulary, topics, courses, learning progress, and voice-analysis requests.
- **Live backend:** [EngMasServer](https://github.com/long7872/EngMasServer) provides the public REST API at [engmasserver.onrender.com](https://engmasserver.onrender.com) and the Socket.IO transport used by online challenges.
- **Firebase complement:** The mobile ecosystem uses Firebase Authentication and Firestore for identity and challenge-related documents, score, and user data. Those Firebase responsibilities are complementary to this Node.js/MySQL backend; Firebase is not directly initialized by the Server code in this repository.
- **Client/server boundary:** REST is the source of truth for the server-managed learning resources and progress workflows, while Socket.IO carries transient, bidirectional online-challenge events. The current server keeps matchmaking state in process memory, whereas durable challenge records may be maintained by the client ecosystem's Firebase workflows.

## 4. System Architecture & Flow

```text
+---------------------+      HTTPS / REST       +-----------------------------+
| Android / Web Client| <---------------------> | Express REST API             |
|                     |                         | /users /vocabs /topics        |
|                     |      Socket.IO          | /courses /voices              |
|                     | <---------------------> | Socket.IO Gateway             |
+---------------------+                         +---------------+-------------+
                                                                |
                                                   Express routers / handlers
                                                                |
                                      +-------------------------+----------------+
                                      |                                          |
                              mysql2 Promise Pool                     External services
                                      |                            Dropbox / Speech API
                                      v
                            +---------------------+
                            | MySQL (Aiven Cloud) |
                            +---------------------+
```

- **Request/response learning state:** REST handlers load study material and learning status from MySQL; status updates and course progress are written back to the database.
- **Live challenge state:** Socket.IO relays events between matched clients. The queue and active player pairs are held in the Node.js process memory, so they are transient and scoped to a single server process; they are not persisted or shared across multiple instances.
- **Online status and streaks:** The repository includes a REST user-status update, but does not implement a Socket.IO presence synchronization flow or a streak-tracking workflow. The game queue should not be treated as durable user state.

## 5. Repository & Directory Structure

```text
EngMasServer/
├── data/                       # Learning source data, sentence lists, archives, and uploaded audio
│   ├── uploads/                # Audio files written by the voice-analysis upload handler
│   └── ...                     # Vocabulary/topic JSON, text lists, and TOEIC content
├── db/                         # MySQL connection modules and versioned schema snapshots
├── routes/                     # Express routers separated by product capability
├── socket/                     # Socket.IO connection and multiplayer event handlers
├── scripts/                    # Data crawlers, importers, translation, and processing utilities
├── .env.example                # Example database/runtime configuration
├── index.js                    # Express + HTTP + Socket.IO bootstrap and route mounting
├── package.json                # Node.js dependencies and npm scripts
├── package-lock.json           # Reproducible npm dependency lockfile
└── requirements.txt            # Python dependencies for data tooling
```

**Separation of concerns**

- `routes/`: HTTP endpoints for users, vocabulary, topics/learning status, courses, and voice utilities.
- `socket/`: Real-time multiplayer queue, event relays, and player disconnect handling.
- `db/`: Promise-based MySQL connection pool (used by the routes) and a legacy direct connection module; `db-ver1.txt` and `db-ver2.txt` are schema snapshots, not an automated migration system.
- `data/`: Seed and source material consumed by the API and utility scripts; this is not a general-purpose runtime database.
- `scripts/`: One-off ingestion, crawling, translation, and data-preparation tools. These are not part of the HTTP request path.

## 6. Key API & Socket.IO Event Documentation

### REST API

All endpoints use the base URL `https://engmasserver.onrender.com`. The deployed service mounts the route groups below.

| Endpoint | Purpose / parameters |
|---|---|
| `GET /users` | List users |
| `POST /users` | Create a user |
| `GET /users/:user_id` | Get one user |
| `PUT /users/:user_id` | Update a user |
| `DELETE /users/:user_id` | Delete a user |
| `PUT /users/:user_id/status` | Update user status |
| `POST /users/upload?user_id=…` | Upload an image; multipart field: `image` |
| `GET /users/:user_id/badges` | Get user badges (may also award badges as a side effect) |
| `PUT /users/:user_id/favourite` | Update a badge's favourite flag; body includes `badge_id` and `favourite` |
| `GET /users/:user_id/friendships` | List the user's friendships |
| `POST /users/:user_id/friendships` | Create a friendship request; body includes `friend_id` and `status` |
| `PUT /users/:user_id/friendships` | Update friendship status |
| `DELETE /users/:user_id/friendships/:friend_id` | Delete a friendship |
| `GET /users/:user_id/friendships/search` | Search users for friendship |
| `GET /vocabs/random` | Get random vocabulary words |
| `GET /vocabs/search/:query` | Search vocabulary by prefix |
| `GET /vocabs/decode/:api_id` | Get a vocabulary entry with related details |
| `GET /topics/learning/:user_id` | Get topics with the user's learning progress |
| `GET /topics/learning/vocabs/:topic_id?user_id=…` | Get a topic and its vocabulary with user status |
| `POST /topics/user/learning` | Create a user-learning record |
| `PUT /topics/user/learning` | Update a user-learning record |
| `POST /topics/user/learning/update_status` | Batch-update vocabulary learning status |
| `GET /courses` | List courses |
| `GET /courses/create?topic_id=…&grammar_type_id=…` | Generate and persist a course from a topic and grammar type |
| `GET /courses/learning/:course_id?user_id=…` | Get course content and learning status |
| `POST /courses/learning/update_status` | Update vocabulary/grammar status and course progress |
| `GET /courses/user_course/:user_id` | List courses associated with a user |
| `GET /voices/sentences` | Get practice sentences |
| `POST /voices/analyze` | Speech assessment integration (currently unavailable; requires a working `LC_API_KEY`); multipart field: `audio` |

Prefix each endpoint with the deployed base URL: `https://engmasserver.onrender.com`. The course-generation endpoint uses `GET` despite creating database records.

The repository does **not** mount standalone `/words`, `/grammar`, or `/challenges` REST routers. Vocabulary is exposed under `/vocabs`; grammar questions are included in course workflows, and challenge gameplay is provided through Socket.IO.

### Socket.IO events

Connect a Socket.IO client to `https://engmasserver.onrender.com`.

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| Client → server | `join_queue` | `{ user_id?, username: string, photo_url?: string }` | Enqueue a player; once two players are available, each is paired |
| Server → client | `game_start` | `{ message: string, opponent: { user_id?, username, photo_url } }` | Announces the matched opponent |
| Server → client | `game_data` | `{ original: string[], scrambled: string[] }` | Supplies the shared word set for the round |
| Client → server | `next_question` | `{ current_question, current_score }` | Sends the sender's current question and score state |
| Server → opponent | `opponent_next_question` | `{ current_question, current_score }` | Relays question/score progress to the paired player |
| Client → server | `leave` | No payload | Removes a queued player or ends their active pairing |
| Server → opponent | `opponent_left` | `{ message: string }` | Notifies the other player that the opponent left |
| Socket.IO lifecycle | `disconnect` | Socket.IO-managed | Cleans up queued/pair state and notifies the paired opponent |

Event names and payloads reflect the current server handlers; there is no event acknowledgement protocol or persistent multiplayer session store.

## 7. Security & Performance Considerations

- **Database access:** Route queries generally bind user-provided values through `mysql2` placeholders. Schema snapshots define primary/unique keys and foreign keys. They do not establish that every frequently filtered column has a dedicated secondary index; validate indexes against production query plans and the deployed schema.
- **Connection management:** The active Promise pool waits for available connections and caps the pool at five connections per application process. Capacity planning should account for the number of Render instances and Aiven's connection limits.
- **Secrets:** Database and integration credentials are read from process environment variables. Keep `server.env` out of version control and configure secrets through Render's environment settings in production.
- **CORS:** Express currently uses `cors()` with its default permissive origin policy. Configure an explicit allowlist for trusted client origins when the deployment requires one; Socket.IO also needs its own origin policy if that restriction is introduced.
- **Payload validation and authentication:** Some handlers perform targeted checks, but there is no shared schema-validation layer or authentication/authorization middleware visible in the current application bootstrap. Treat the API as requiring further access-control and input-validation hardening before exposing privileged operations.
- **Upload handling:** The voice route accepts audio through Multer and writes it to `data/uploads`; the current route does not define explicit size/type limits or a cleanup path for every failure case. Apply upload limits and lifecycle controls for production traffic.
- **Errors and logs:** Failures are handled within individual route handlers and logged with `console` calls; there is no centralized error middleware or structured logging pipeline configured in the app.
- **Query cost:** Random vocabulary/course selection uses `ORDER BY RAND()`, which can become expensive on large tables. Benchmark and consider a scalable sampling strategy if dataset size or request volume grows.
- **Real-time scale:** In-memory player queues and pair mappings work within one process but do not coordinate across instances or survive restarts. A shared adapter/store and explicit session lifecycle would be required for horizontally scaled multiplayer.

## 8. Environment Configuration & Local Setup

### Prerequisites

- Node.js **18.11 or newer** (Express 5 runtime requirement and Node's built-in watch mode).
- npm.
- A reachable MySQL instance and a database schema compatible with the application routes. The files under `db/` are reference snapshots; they are not automatically applied migrations.
- Optional: Dropbox credentials for image uploads and a working LanguageConfidence API key for speech assessment. The live speech-assessment integration is currently unavailable because its `LC_API_KEY` is not working.

### Environment variables

The application loads `server.env` (the checked-in sample is `.env.example`). Create `server.env` in the repository root and provide the values for your environment.

| Variable | Required | Purpose |
|---|---:|---|
| `PORT` | No | HTTP listen port; defaults to `3000` |
| `DB_HOST` | Yes | MySQL hostname |
| `DB_PORT` | No | MySQL port; the Promise pool defaults to `3306` when unset |
| `DB_USER` | Yes | MySQL username |
| `DB_PASS` | Yes | MySQL password. This codebase reads `DB_PASS`, **not** `DB_PASSWORD` |
| `DB_NAME` | Yes | Database/schema name |
| `DROPBOX_TOKEN` | For image uploads | Dropbox access token used by `POST /users/upload` |
| `LC_API_KEY` | For speech assessment | A working LanguageConfidence API key is required by `POST /voices/analyze`. The key configured for the current live deployment is not working, so speech assessment is unavailable there. |

### Local development

```bash
git clone https://github.com/long7872/EngMasServer.git
cd EngMasServer
npm ci
cp .env.example server.env
```

Edit `server.env` with your MySQL values and any optional integration keys. In PowerShell, use `Copy-Item .env.example server.env` in place of `cp`. Ensure the target database has the tables and columns expected by the routes, then start the development server:

```bash
npm run dev
```

The development command uses Node's watch mode and restarts the server when files change. For a production-style local start:

```bash
npm start
```

The API listens on `PORT` (or `3000` if it is unset). Socket.IO shares the same HTTP server and port.
