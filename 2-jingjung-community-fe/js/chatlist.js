import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;
import './header.js';

document.addEventListener('DOMContentLoaded', () => {
    // API_BASE_URL 선언 (http:// 중복 방지)
    const API_BASE_URL = CONFIG.BASE_URL;

    // 로그인 확인
    fetch(`${API_BASE_URL}/users/me`, { credentials: "include" })
        .then(res => { if (!res.ok) window.location.href = "login.html"; })
        .catch(e => { console.error("Login check failed:", e); window.location.href = "login.html"; });

    const chatListContainer = document.getElementById('chat-list-container');
    const backBtn = document.getElementById('back-btn');

    // 뒤로가기 버튼 기능
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // 채팅 목록 불러오기
    const fetchChatList = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/chats`, { credentials: "include" });
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

    // 채팅 목록 화면에 그리기
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

            // 프로필 이미지 경로 처리
            let profileUrl = chat.other_user_image_url || '';
            if (profileUrl && !profileUrl.startsWith('http')) {
                profileUrl = API_BASE_URL + profileUrl;
            }

            const profileImg = profileUrl ? `<div class="profile-img" style="background-image: url('${profileUrl}'); background-size: cover; background-position: center;"></div>` : '<div class="profile-img"></div>';
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

    // 채팅방 클릭 시 이동
    chatListContainer.addEventListener('click', (event) => {
        const chatItem = event.target.closest('.chat-item');
        if (chatItem) {
            const chatId = chatItem.dataset.chatId;
            window.location.href = `chat.html?chatId=${chatId}`;
        }
    });

    fetchChatList();
});