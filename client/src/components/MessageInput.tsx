import { useState, useRef, useEffect } from 'react'
import './MessageInput.css'

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  disabled: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled
}) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
      handleStopTyping()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)

    if (value.trim() && !isTyping) {
      handleStartTyping()
    } else if (!value.trim() && isTyping) {
      handleStopTyping()
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 2 seconds of no input
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping()
      }, 2000)
    }
  }

  const handleStartTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      onStartTyping()
    }
  }

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      onStopTyping()
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Connecting...' : 'Type a message...'}
            disabled={disabled}
            className="message-input"
            maxLength={500}
          />
          
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="send-button"
            title="Send message (Enter)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        
        <div className="input-info">
          <span className="char-count">
            {message.length}/500
          </span>
          <span className="hint">
            Press Enter to send
          </span>
        </div>
      </form>
    </div>
  )
}

export default MessageInput
