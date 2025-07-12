import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import cors from 'cors';

const app = express();
const server = createServer(app);

// Redis clients for Socket.IO adapter (pub/sub)
const pubClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
});

const subClient = pubClient.duplicate();

// Separate Redis client for data storage
const dataClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
});

// Socket.IO server with Redis adapter
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store for active users in rooms (in-memory + Redis backup)
interface User {
  id: string;
  username: string;
  room: string;
  joinedAt: string;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  room: string;
}

const activeUsers = new Map<string, User>();

// Redis data storage functions
async function saveUserToRedis(user: User) {
  try {
    await dataClient.hSet(`user:${user.id}`, {
      id: user.id,
      username: user.username,
      room: user.room,
      joinedAt: user.joinedAt
    });
    
    // Add user to room set
    await dataClient.sAdd(`room:${user.room}:users`, user.id);
    
    // Set expiration (optional - users expire after 24 hours of inactivity)
    await dataClient.expire(`user:${user.id}`, 86400);
    
    console.log(`💾 Saved user ${user.username} to Redis`);
  } catch (error) {
    console.error('Error saving user to Redis:', error);
  }
}

async function removeUserFromRedis(userId: string, room: string) {
  try {
    await dataClient.del(`user:${userId}`);
    await dataClient.sRem(`room:${room}:users`, userId);
    console.log(`🗑️ Removed user ${userId} from Redis`);
  } catch (error) {
    console.error('Error removing user from Redis:', error);
  }
}

async function saveChatMessage(message: ChatMessage) {
  try {
    // Save individual message
    await dataClient.hSet(`message:${message.id}`, {
      id: message.id,
      username: message.username,
      message: message.message,
      timestamp: message.timestamp,
      room: message.room
    });
    
    // Add message to room's message list (with score as timestamp for ordering)
    await dataClient.zAdd(`room:${message.room}:messages`, {
      score: Date.now(),
      value: message.id
    });
    
    // Keep only last 100 messages per room (optional)
    await dataClient.zRemRangeByRank(`room:${message.room}:messages`, 0, -101);
    
    console.log(`💬 Saved message from ${message.username} in ${message.room} to Redis`);
  } catch (error) {
    console.error('Error saving message to Redis:', error);
  }
}

async function getRoomMessages(room: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    // Get latest message IDs
    const messageIds = await dataClient.zRange(`room:${room}:messages`, -limit, -1);
    
    if (messageIds.length === 0) return [];
    
    // Get message details
    const messages: ChatMessage[] = [];
    for (const messageId of messageIds) {
      const messageData = await dataClient.hGetAll(`message:${messageId}`);
      if (messageData.id) {
        messages.push({
          id: messageData.id,
          username: messageData.username,
          message: messageData.message,
          timestamp: messageData.timestamp,
          room: messageData.room
        });
      }
    }
    
    return messages; // Already in chronological order
  } catch (error) {
    console.error('Error getting room messages from Redis:', error);
    return [];
  }
}

async function getRoomUsers(room: string): Promise<User[]> {
  try {
    const userIds = await dataClient.sMembers(`room:${room}:users`);
    const users: User[] = [];
    
    for (const userId of userIds) {
      const userData = await dataClient.hGetAll(`user:${userId}`);
      if (userData.id) {
        users.push({
          id: userData.id,
          username: userData.username,
          room: userData.room,
          joinedAt: userData.joinedAt
        });
      }
    }
    
    return users;
  } catch (error) {
    console.error('Error getting room users from Redis:', error);
    return [];
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining a room
  socket.on('join-room', ({ username, room }: { username: string; room: string }) => {
    // Leave previous room if any
    const previousUser = activeUsers.get(socket.id);
    if (previousUser) {
      socket.leave(previousUser.room);
      socket.to(previousUser.room).emit('user-left', {
        username: previousUser.username,
        message: `${previousUser.username} left the room`,
        room: previousUser.room
      });
    }

    // Join new room
    socket.join(room);
    activeUsers.set(socket.id, { id: socket.id, username, room, joinedAt: new Date().toISOString() });

    // Save user to Redis
    saveUserToRedis(activeUsers.get(socket.id)!);

    // Notify others in the room
    socket.to(room).emit('user-joined', {
      username,
      message: `${username} joined the room`,
      room
    });

    // Send confirmation to the user
    socket.emit('room-joined', {
      room,
      username,
      message: `Welcome to ${room}!`
    });

    // Send list of users in the room
    const roomUsers = Array.from(activeUsers.values())
      .filter(user => user.room === room)
      .map(user => ({ id: user.id, username: user.username }));
    
    io.to(room).emit('room-users', roomUsers);

    // Load and send chat history
    getRoomMessages(room, 50).then(messages => {
      socket.emit('chat-history', messages);
    });

    console.log(`${username} joined room: ${room}`);
  });

  // Handle chat messages
  socket.on('send-message', async ({ message }: { message: string }) => {
    const user = activeUsers.get(socket.id);
    if (user) {
      const messageData: ChatMessage = {
        id: Date.now().toString(),
        username: user.username,
        message,
        timestamp: new Date().toISOString(),
        room: user.room
      };

      // Save message to Redis
      await saveChatMessage(messageData);

      // Send message to all users in the room
      io.to(user.room).emit('new-message', messageData);
      console.log(`Message from ${user.username} in ${user.room}: ${message}`);

      // Save message to Redis
      saveChatMessage(messageData);
    }
  });

  // Handle typing indicators
  socket.on('typing-start', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('user-typing', {
        username: user.username,
        isTyping: true
      });
    }
  });

  socket.on('typing-stop', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('user-typing', {
        username: user.username,
        isTyping: false
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('user-left', {
        username: user.username,
        message: `${user.username} left the room`,
        room: user.room
      });

      // Update room users list
      activeUsers.delete(socket.id);
      removeUserFromRedis(socket.id, user.room);
      const roomUsers = Array.from(activeUsers.values())
        .filter(u => u.room === user.room)
        .map(u => ({ id: u.id, username: u.username }));
      
      io.to(user.room).emit('room-users', roomUsers);
      
      console.log(`${user.username} disconnected from ${user.room}`);
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get active rooms
app.get('/api/rooms', (req, res) => {
  const rooms = Array.from(new Set(
    Array.from(activeUsers.values()).map(user => user.room)
  ));
  res.json({ rooms });
});

// Redis monitoring endpoints (for debugging)
app.get('/api/redis/status', async (req, res) => {
  try {
    const info = await dataClient.info();
    const keys = await dataClient.keys('*');
    res.json({ 
      status: 'connected',
      totalKeys: keys.length,
      keys: keys,
      info: info.split('\n').slice(0, 10) // First 10 lines of info
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/redis/room/:room/messages', async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await getRoomMessages(room, 50);
    res.json({ room, messages, count: messages.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/redis/room/:room/users', async (req, res) => {
  try {
    const { room } = req.params;
    const users = await getRoomUsers(room);
    res.json({ room, users, count: users.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Initialize Redis adapter and start server
async function startServer() {
  try {
    await pubClient.connect();
    await subClient.connect();
    await dataClient.connect();
    
    // Set up Redis adapter for distributed Socket.IO
    io.adapter(createAdapter(pubClient, subClient));
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Redis adapter configured for distributed Socket.IO`);
      console.log(`🌐 Client URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
    });
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.log('⚠️  Running without Redis adapter (single node mode)');
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (single node mode)`);
    });
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await pubClient.quit();
  await subClient.quit();
  await dataClient.quit();
  server.close();
});

startServer();
