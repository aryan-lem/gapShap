import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import './NewConversationModal.css';
interface User {
  id: number;
  name: string;
  pictureUrl?: string;
}

interface NewConversationModalProps {
  onClose: () => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ onClose }) => {
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const { createDirectConversation, createGroupConversation } = useChat();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/users`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Failed to fetch users');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [API_URL]);

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return isGroup ? [...prev, userId] : [userId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      return;
    }
    
    try {
      if (isGroup) {
        if (!groupName.trim()) {
          alert('Please enter a group name');
          return;
        }
        await createGroupConversation(groupName, selectedUsers);
      } else {
        await createDirectConversation(selectedUsers[0]);
      }
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isGroup ? 'New Group Chat' : 'New Message'}</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="conversation-type-toggle">
            <button 
              className={!isGroup ? 'active' : ''}
              onClick={() => {
                setIsGroup(false);
                setSelectedUsers([]);
              }}
            >
              Direct Message
            </button>
            <button 
              className={isGroup ? 'active' : ''}
              onClick={() => setIsGroup(true)}
            >
              Group Chat
            </button>
          </div>

          {isGroup && (
            <div className="group-name">
              <label>Group Name:</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
          )}

          <div className="user-list">
            <h3>Select {isGroup ? 'Participants' : 'User'}</h3>
            {loading ? (
              <p>Loading users...</p>
            ) : (
              users.map(user => (
                <div 
                  key={user.id} 
                  className={`user-item ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                  onClick={() => toggleUserSelection(user.id)}
                >
                  <div className="user-avatar">
                    {user.pictureUrl ? (
                      <img src={user.pictureUrl} alt={user.name} />
                    ) : (
                      <div className="avatar-placeholder">{user.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="user-name">{user.name}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button 
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || (isGroup && !groupName.trim())}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;