# 🚀 Distributed WebSocket Chat Application

A real-time chat application built with React, Node.js, Socket.IO, and Redis adapter for distributed scaling across multiple server instances.

## 🌟 Features

- **Real-time messaging** with Socket.IO
- **Multi-room support** - Join different chat rooms
- **User presence** - See who's online in each room
- **Typing indicators** - See when someone is typing
- **Distributed architecture** - Redis adapter enables horizontal scaling
- **Responsive design** - Works on desktop and mobile
- **Modern UI** - Beautiful, intuitive interface

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │   React Client  │    │   React Client  │
│   (Frontend)    │    │   (Frontend)    │    │   (Frontend)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Load Balancer         │
                    │     (Optional)            │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
  ┌───────▼───────┐    ┌─────────▼───────┐    ┌─────────▼───────┐
  │  Node.js App  │    │  Node.js App    │    │  Node.js App    │
  │  (Server 1)   │    │  (Server 2)     │    │  (Server 3)     │
  │  Port: 3001   │    │  Port: 3002     │    │  Port: 3003     │
  └───────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Redis Server   │
                        │  (Pub/Sub)      │
                        │  Port: 6379     │
                        └─────────────────┘
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **Redis** - In-memory data store for pub/sub
- **TypeScript** - Type safety

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Socket.IO Client** - WebSocket client
- **TypeScript** - Type safety
- **CSS3** - Modern styling with gradients and animations

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Redis Server** (can use Docker)
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd websocket-redis
```

### 2. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Start Redis Server

**Option A: Using Docker (Recommended)**
```bash
docker-compose up -d
```

**Option B: Local Redis Installation**
```bash
# On Windows (with Chocolatey)
choco install redis-64

# On macOS (with Homebrew)
brew install redis
redis-server

# On Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### 4. Start the Application

**Development Mode (Both server and client)**
```bash
npm run dev
```

**Or start separately:**
```bash
# Terminal 1: Start server
npm run dev:server

# Terminal 2: Start client
npm run dev:client
```

### 5. Open Your Browser

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## 🌐 Testing Distributed Setup

To test the distributed capabilities:

### Option 1: Multiple Server Instances

```bash
# Terminal 1: Start first server instance
PORT=3001 npm run dev:server

# Terminal 2: Start second server instance
PORT=3002 npm run dev:server

# Terminal 3: Start third server instance
PORT=3003 npm run dev:server

# Terminal 4: Start client
cd client && npm run dev
```

### Option 2: Using PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Start multiple server instances
pm2 start server/index.ts --name "chat-server-1" -- --port 3001
pm2 start server/index.ts --name "chat-server-2" -- --port 3002
pm2 start server/index.ts --name "chat-server-3" -- --port 3003

# Monitor processes
pm2 monit

# Stop all instances
pm2 stop all
```

## 📁 Project Structure

```
websocket-redis/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatRoom.tsx    # Main chat interface
│   │   │   ├── JoinForm.tsx    # Room join form
│   │   │   ├── MessageList.tsx # Message display
│   │   │   ├── MessageInput.tsx# Message input field
│   │   │   ├── UserList.tsx    # Online users list
│   │   │   └── *.css          # Component styles
│   │   ├── App.tsx            # Main app component
│   │   ├── App.css            # Global styles
│   │   └── index.css          # Base styles
│   ├── .env                   # Environment variables
│   └── package.json
├── server/
│   ├── index.ts              # Express server with Socket.IO
│   └── tsconfig.json         # TypeScript config
├── docker-compose.yml        # Redis container setup
├── package.json             # Root package.json
└── README.md               # This file
```

## 🔧 Environment Variables

### Server (.env in root)
```bash
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
CLIENT_URL=http://localhost:5173
```

### Client (.env in client/)
```bash
VITE_SERVER_URL=http://localhost:3001
```

## 🚀 Deployment

### Docker Deployment (Recommended)

The application is fully containerized with Docker support for easy deployment.

#### Quick Start with Docker

```bash
# Start all services (Redis, Server, Client)
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop all services
docker-compose down
```

This will start:
- **Redis**: Port 6379
- **Server**: Port 3001
- **Client**: Port 3000 (http://localhost:3000)

#### Production Deployment

```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# Or build and start with production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Docker Services

1. **redis**: Redis server for pub/sub messaging
2. **server**: Node.js backend API with Socket.IO
3. **client**: React frontend served by Nginx

#### Environment Variables for Docker

```bash
# Server environment
REDIS_HOST=redis
REDIS_PORT=6379
CLIENT_URL=http://localhost:3000
NODE_ENV=production

# Client build environment
VITE_SERVER_URL=http://localhost:3001
```

#### Custom Configuration

```bash
# Custom environment file
cp .env.production .env

# Edit variables as needed
nano .env

# Start with custom environment
docker-compose --env-file .env up -d
```

#### Health Checks

The production configuration includes health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker-compose logs server | grep health
```

### Manual Production Build

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

### Traditional Deployment

For deployment without Docker:

```dockerfile
# Example Dockerfile for manual deployment
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production
RUN cd client && npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
```

## 🎯 Usage Guide

### 1. Join a Room
- Enter your username (2-20 characters)
- Choose or type a room name (2-30 characters)
- Click "Join Room"

### 2. Chat Features
- **Send messages**: Type and press Enter
- **See typing indicators**: Others see when you're typing
- **View online users**: See who's in the room
- **Leave room**: Click "Leave Room" to exit

### 3. Popular Rooms
- **General**: Main discussion room
- **Random**: For random conversations
- **Tech**: Technology discussions
- **Gaming**: Gaming topics
- **Music**: Music enthusiasts

## 🔍 API Endpoints

### HTTP Endpoints
- `GET /health` - Health check
- `GET /api/rooms` - Get active rooms

### Socket.IO Events

#### Client → Server
- `join-room` - Join a chat room
- `send-message` - Send a message
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator

#### Server → Client
- `room-joined` - Confirmation of room join
- `user-joined` - Another user joined
- `user-left` - User left the room
- `room-users` - List of users in room
- `new-message` - New message received
- `user-typing` - Typing indicator

## 🧪 Testing

### Manual Testing
1. Open multiple browser tabs/windows
2. Join the same room with different usernames
3. Send messages and verify real-time delivery
4. Test typing indicators
5. Test user join/leave notifications

### Load Testing
```bash
# Using Artillery.js
npm install -g artillery
artillery quick --count 10 --num 20 http://localhost:3001
```

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis is running: `redis-cli ping`
   - Check Redis host/port configuration
   - Verify Docker container is running

2. **Socket.IO Connection Failed**
   - Check CORS configuration
   - Verify server URL in client environment
   - Check firewall settings

3. **Messages Not Syncing Across Servers**
   - Verify Redis adapter is properly configured
   - Check Redis pub/sub is working: `redis-cli monitor`

### Debug Mode

```bash
# Enable Socket.IO debugging
DEBUG=socket.io* npm run dev:server

# Enable client debugging (in browser console)
localStorage.debug = 'socket.io-client:socket'
```

## 📈 Performance Considerations

### Scaling Guidelines
- **Single server**: Handles ~1,000 concurrent connections
- **Multiple servers**: Use load balancer (nginx, HAProxy)
- **Redis**: Configure persistent storage for production
- **Message history**: Implement database storage for chat history

### Optimization Tips
- Use compression for Socket.IO messages
- Implement rate limiting for message sending
- Add message size limits
- Use Redis clustering for high availability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Socket.IO team for excellent real-time communication library
- Redis team for robust pub/sub functionality
- React and Vite teams for modern development tools

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) section
2. Create a new issue with detailed description
3. Include logs and environment information

---

**Happy Chatting! 🎉**
