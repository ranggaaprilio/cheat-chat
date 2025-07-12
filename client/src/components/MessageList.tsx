import { formatDistanceToNow } from 'date-fns'
import './MessageList.css'

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  room: string;
}

interface MessageListProps {
  messages: Message[];
  currentUser: string;
  typingUsers: Set<string>;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  typingUsers
}) => {
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'just now'
    }
  }

  const getMessageClass = (username: string) => {
    if (username === 'System') return 'message system-message'
    if (username === currentUser) return 'message own-message'
    return 'message other-message'
  }

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (username: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">
          <p>No messages yet. Start the conversation! 💬</p>
        </div>
      ) : (
        messages.map((message) => (
          <div key={message.id} className={getMessageClass(message.username)}>
            {message.username !== 'System' && message.username !== currentUser && (
              <div
                className="message-avatar"
                style={{ backgroundColor: getAvatarColor(message.username) }}
              >
                {getInitials(message.username)}
              </div>
            )}
            
            <div className="message-content">
              {message.username !== 'System' && (
                <div className="message-header">
                  <span className="message-username">
                    {message.username === currentUser ? 'You' : message.username}
                  </span>
                  <span className="message-time">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
              )}
              
              <div className="message-text">
                {message.message}
              </div>
            </div>

            {message.username === currentUser && (
              <div
                className="message-avatar own-avatar"
                style={{ backgroundColor: getAvatarColor(message.username) }}
              >
                {getInitials(message.username)}
              </div>
            )}
          </div>
        ))
      )}

      {typingUsers.size > 0 && (
        <div className="typing-indicator">
          <div className="typing-content">
            <div className="typing-avatar">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="typing-text">
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageList
