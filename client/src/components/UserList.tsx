import './UserList.css'

interface User {
  id: string;
  username: string;
}

interface UserListProps {
  users: User[];
  currentUser: string;
}

const UserList: React.FC<UserListProps> = ({ users, currentUser }) => {
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
    <div className="user-list">
      <div className="user-list-header">
        <h3>Online Users ({users.length})</h3>
      </div>
      
      <div className="user-list-content">
        {users.length === 0 ? (
          <div className="no-users">
            <p>No users online</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`user-item ${user.username === currentUser ? 'current-user' : ''}`}
            >
              <div
                className="user-avatar"
                style={{ backgroundColor: getAvatarColor(user.username) }}
              >
                {getInitials(user.username)}
              </div>
              
              <div className="user-info">
                <span className="user-name">
                  {user.username === currentUser ? `${user.username} (You)` : user.username}
                </span>
                <div className="user-status">
                  <span className="status-indicator online"></span>
                  <span className="status-text">Online</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default UserList
