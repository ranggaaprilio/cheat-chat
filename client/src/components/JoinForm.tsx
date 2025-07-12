import { useState } from 'react'
import './JoinForm.css'

interface JoinFormProps {
  onJoin: (username: string, room: string) => void;
  isConnected: boolean;
}

const JoinForm: React.FC<JoinFormProps> = ({ onJoin, isConnected }) => {
  const [username, setUsername] = useState('')
  const [room, setRoom] = useState('')
  const [errors, setErrors] = useState<{ username?: string; room?: string }>({})

  const validateForm = () => {
    const newErrors: { username?: string; room?: string } = {}
    
    if (!username.trim()) {
      newErrors.username = 'Username is required'
    } else if (username.trim().length < 2) {
      newErrors.username = 'Username must be at least 2 characters'
    } else if (username.trim().length > 20) {
      newErrors.username = 'Username must be less than 20 characters'
    }

    if (!room.trim()) {
      newErrors.room = 'Room name is required'
    } else if (room.trim().length < 2) {
      newErrors.room = 'Room name must be at least 2 characters'
    } else if (room.trim().length > 30) {
      newErrors.room = 'Room name must be less than 30 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected) {
      alert('Please wait for connection to be established')
      return
    }

    if (validateForm()) {
      onJoin(username.trim(), room.trim())
    }
  }

  const popularRooms = ['General', 'Random', 'Tech', 'Gaming', 'Music']

  return (
    <div className="join-form-container">
      <div className="join-form-card">
        <h2>Join a Chat Room</h2>
        <p className="join-form-description">
          Enter your username and choose a room to start chatting!
        </p>

        <form onSubmit={handleSubmit} className="join-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className={errors.username ? 'error' : ''}
              maxLength={20}
            />
            {errors.username && <span className="error-message">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="room">Room Name</label>
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room name"
              className={errors.room ? 'error' : ''}
              maxLength={30}
            />
            {errors.room && <span className="error-message">{errors.room}</span>}
          </div>

          <div className="popular-rooms">
            <p>Popular rooms:</p>
            <div className="room-buttons">
              {popularRooms.map((roomName) => (
                <button
                  key={roomName}
                  type="button"
                  className="room-button"
                  onClick={() => setRoom(roomName)}
                >
                  {roomName}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="join-button"
            disabled={!isConnected}
          >
            {isConnected ? 'Join Room' : 'Connecting...'}
          </button>
        </form>

        <div className="connection-info">
          <p>
            💡 <strong>Multi-node distributed chat:</strong> This app uses Redis adapter 
            to enable real-time communication across multiple server instances.
          </p>
        </div>
      </div>
    </div>
  )
}

export default JoinForm
