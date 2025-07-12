import { useState, useEffect, useRef } from 'react'
import MessageList from './MessageList'
import UserList from './UserList'
import MessageInput from './MessageInput'
import './ChatRoom.css'

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

interface ChatRoomProps {
  currentUser: string;
  currentRoom: string;
  messages: Message[];
  roomUsers: User[];
  typingUsers: Set<string>;
  onSendMessage: (message: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  onLeaveRoom: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  currentUser,
  currentRoom,
  messages,
  roomUsers,
  typingUsers,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onLeaveRoom
}) => {
  const [showUserList, setShowUserList] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleLeaveRoom = () => {
    if (confirm('Are you sure you want to leave this room?')) {
      onLeaveRoom()
    }
  }

  const toggleUserList = () => {
    setShowUserList(!showUserList)
  }

  return (
    <div className="chat-room">
      <header className="chat-header">
        <div className="room-info">
          <h2>#{currentRoom}</h2>
          <span className="user-count">{roomUsers.length} users</span>
        </div>
        <div className="chat-controls">
          <button
            className="toggle-users-btn"
            onClick={toggleUserList}
            title={showUserList ? 'Hide users' : 'Show users'}
          >
            👥 {showUserList ? 'Hide' : 'Show'} Users
          </button>
          <button
            className="leave-room-btn"
            onClick={handleLeaveRoom}
            title="Leave room"
          >
            🚪 Leave Room
          </button>
        </div>
      </header>

      <div className="chat-content">
        <div className="messages-section">
          <MessageList
            messages={messages}
            currentUser={currentUser}
            typingUsers={typingUsers}
          />
          <div ref={messagesEndRef} />
        </div>

        {showUserList && (
          <aside className="users-section">
            <UserList users={roomUsers} currentUser={currentUser} />
          </aside>
        )}
      </div>

      <footer className="chat-footer">
        <MessageInput
          onSendMessage={onSendMessage}
          onStartTyping={onStartTyping}
          onStopTyping={onStopTyping}
          disabled={false}
        />
      </footer>
    </div>
  )
}

export default ChatRoom
