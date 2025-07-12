import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import JoinForm from './components/JoinForm'
import ChatRoom from './components/ChatRoom'
import './App.css'

interface User {
  id: string;
  username: string;
}

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  room: string;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<string>('')
  const [currentRoom, setCurrentRoom] = useState<string>('')
  const [isInRoom, setIsInRoom] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [roomUsers, setRoomUsers] = useState<User[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')
    setSocket(newSocket)

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from server')
    })

    // Room event handlers
    newSocket.on('room-joined', (data) => {
      setIsInRoom(true)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: data.message,
        timestamp: new Date().toISOString(),
        room: data.room
      }])
    })

    newSocket.on('user-joined', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: data.message,
        timestamp: new Date().toISOString(),
        room: data.room || 'Unknown'
      }])
    })

    newSocket.on('user-left', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: data.message,
        timestamp: new Date().toISOString(),
        room: data.room || 'Unknown'
      }])
    })

    newSocket.on('room-users', (users: User[]) => {
      setRoomUsers(users)
    })

    // Chat history event handler
    newSocket.on('chat-history', (history: Message[]) => {
      setMessages(history)
      console.log(`📚 Loaded ${history.length} messages from chat history`)
    })

    // Message event handlers
    newSocket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    // Typing event handlers
    newSocket.on('user-typing', ({ username, isTyping }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev)
        if (isTyping) {
          newSet.add(username)
        } else {
          newSet.delete(username)
        }
        return newSet
      })
    })

    return () => {
      newSocket.close()
    }
  }, []) // Remove currentRoom dependency to prevent reconnection

  const joinRoom = (username: string, room: string) => {
    if (socket) {
      setCurrentUser(username)
      setCurrentRoom(room)
      setMessages([]) // Clear previous messages
      socket.emit('join-room', { username, room })
    }
  }

  const sendMessage = (message: string) => {
    if (socket && message.trim()) {
      socket.emit('send-message', { message })
    }
  }

  const startTyping = () => {
    if (socket) {
      socket.emit('typing-start')
    }
  }

  const stopTyping = () => {
    if (socket) {
      socket.emit('typing-stop')
    }
  }

  const leaveRoom = () => {
    setIsInRoom(false)
    setCurrentRoom('')
    setCurrentUser('')
    setMessages([])
    setRoomUsers([])
    setTypingUsers(new Set())
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Distributed Chat App</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <main className="app-main">
        {!isInRoom ? (
          <JoinForm onJoin={joinRoom} isConnected={isConnected} />
        ) : (
          <ChatRoom
            currentUser={currentUser}
            currentRoom={currentRoom}
            messages={messages}
            roomUsers={roomUsers}
            typingUsers={typingUsers}
            onSendMessage={sendMessage}
            onStartTyping={startTyping}
            onStopTyping={stopTyping}
            onLeaveRoom={leaveRoom}
          />
        )}
      </main>
    </div>
  )
}

export default App
