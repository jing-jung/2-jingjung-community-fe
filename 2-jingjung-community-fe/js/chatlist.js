import { CONFIG } from './config.js';
import './header.js'; 

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = `http://${CONFIG.BASE_URL}`;

    fetch(`${API_BASE_URL}/users/me`, { credentials: "include" })
        .then(res => { if (!res.ok) window.location.href = "login.html"; })
        .catch(e => { console.error("Login check failed:", e); window.location.href = "login.html"; });

    const chatListContainer = document.getElementById('chat-list-container');

    const fetchChatList = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chats`, { credentials: "include" });
            if (response.ok) {
                const data = await response.json();
                renderChatList(data.chats);
            } else {
                console.error('Failed to fetch chat list');
                chatListContainer.innerHTML = '<p>채팅 목록을 불러오는데 실패했습니다.</p>';
            }
        } catch (error) {
            console.error('Error fetching chat list:', error);
            chatListContainer.innerHTML = '<p>오류가 발생했습니다.</p>';
        }
    };

    const renderChatList = (chats) => {
        chatListContainer.innerHTML = ''; 
        if (chats.length === 0) {
            chatListContainer.innerHTML = '<p>진행중인 대화가 없습니다.</p>';
            return;
        }

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chat.room_id;

            const profileImg = chat.other_user_image_url ? `<div class="profile-img" style="background-image: url('${API_BASE_URL}${chat.other_user_image_url}')"></div>` : '<div class="profile-img"></div>';
            const unreadCount = chat.unread_count > 0 ? `<div class="unread-count">${chat.unread_count}</div>` : '';
            const lastMessageTime = chat.last_message_created_at ? new Date(chat.last_message_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            
            chatItem.innerHTML = `
                ${profileImg}
                <div class="chat-details">
                    <div class="chat-partner-name">${chat.other_user_nickname}</div>
                    <div class="last-message">${chat.last_message_content || '대화를 시작해보세요.'}</div>
                </div>
                <div class="chat-info">
                    <div class="last-message-time">${lastMessageTime}</div>
                    ${unreadCount}
                </div>
            `;
            
            chatListContainer.appendChild(chatItem);
        });
    };

    chatListContainer.addEventListener('click', (event) => {
        const chatItem = event.target.closest('.chat-item');
        if (chatItem) {
            const chatId = chatItem.dataset.chatId;
            window.location.href = `chat.html?chatId=${chatId}`;
        }
    });

    fetchChatList();
});
