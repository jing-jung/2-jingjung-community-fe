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

    // 타임스탬프 포맷팅 함수
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';

        const now = new Date();
        const messageDate = new Date(timestamp);

        const isToday = now.getFullYear() === messageDate.getFullYear() &&
                        now.getMonth() === messageDate.getMonth() &&
                        now.getDate() === messageDate.getDate();

        if (isToday) {
            // 오늘이면 시간만 표시 (오전/오후 포함)
            return messageDate.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else {
            // 어제 이전이면 날짜만 표시
            return `${messageDate.getFullYear()}.${String(messageDate.getMonth() + 1).padStart(2, '0')}.${String(messageDate.getDate()).padStart(2, '0')}`;
        }
    };

    // 채팅 목록 화면에 그리기
    const renderChatList = (chats) => {
        chatListContainer.innerHTML = ''; 
        if (chats.length === 0) {
            chatListContainer.innerHTML = '<div class="empty-chat-list"><p>진행중인 대화가 없습니다.</p></div>';
            return;
        }

        // 최신 메시지 순으로 정렬
        chats.sort((a, b) => new Date(b.last_message_created_at) - new Date(a.last_message_created_at));

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-room-item';
            chatItem.dataset.chatId = chat.room_id;

            // 프로필 이미지 경로 처리
            let profileUrl = chat.other_user_image_url || 'images/radish_7.png'; // 기본 이미지
            if (profileUrl && !profileUrl.startsWith('http')) {
                profileUrl = API_BASE_URL + profileUrl;
            }

            const profileImg = `<img src="${profileUrl}" class="chat-profile-img" alt="profile image">`;
            const formattedTime = formatTimestamp(chat.last_message_created_at);

            chatItem.innerHTML = `
                ${profileImg}
                <div class="chat-info">
                    <div class="chat-name">${chat.other_user_nickname}</div>
                    <div class="chat-last-msg">${chat.last_message_content || '대화를 시작해보세요.'}</div>
                </div>
                <div class="chat-meta">
                    <div class="chat-time">${formattedTime}</div>
                </div>
            `;
            
            chatListContainer.appendChild(chatItem);
        });
    };

    // 채팅방 클릭 시 이동
    chatListContainer.addEventListener('click', (event) => {
        const chatItem = event.target.closest('.chat-room-item');
        if (chatItem) {
            const chatId = chatItem.dataset.chatId;
            window.location.href = `chat.html?chatId=${chatId}`;
        }
    });

    fetchChatList();
});