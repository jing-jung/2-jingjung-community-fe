import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;
import './header.js';

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = CONFIG.BASE_URL;
    const WS_BASE_URL = CONFIG.BASE_URL.replace("http://", "ws://");

    let currentUserId;
    try {
        const meResponse = await fetch(`${API_BASE_URL}/users/me`, { credentials: "include" });
        if (!meResponse.ok) throw new Error('Failed to get user info');
        const me = await meResponse.json();
        currentUserId = me.id;
    } catch (e) {
        console.error(e);
        alert('사용자 정보를 가져오는데 실패했습니다.');
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    const recipientId = urlParams.get('recipientId');

    const messageContainer = document.getElementById('message-container');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const backBtn = document.getElementById('back-btn');

    let websocket;

    const setupWebSocket = (currentChatId) => {
        const wsUrl = `${WS_BASE_URL}/ws/${currentChatId}`;
        websocket = new WebSocket(wsUrl);

        websocket.onopen = () => console.log('WebSocket connection established');

        websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            appendMessage(message, message.sender_id === currentUserId);
        };

        websocket.onclose = () => console.log('WebSocket connection closed');
        websocket.onerror = (error) => console.error('WebSocket error:', error);
    };

    const fetchChatHistory = async (currentChatId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/chats/${currentChatId}/messages`, { credentials: "include" });
            if (response.ok) {
                const data = await response.json();
                messageContainer.innerHTML = ''; 
                data.messages.forEach(msg => appendMessage(msg, msg.sender_id === currentUserId));
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };
    
    const initiateChat = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: "include", // ★ 핵심 추가: 쿠키를 보내 백엔드 인증 통과
                body: JSON.stringify({ recipient_id: parseInt(recipientId) })
            });

            if (response.ok) {
                const chat = await response.json();
                window.history.replaceState({}, '', `chat.html?chatId=${chat.room_id}`);
                setupWebSocket(chat.room_id);
                fetchChatHistory(chat.room_id);
            } else {
                const error = await response.json();
                alert(`채팅을 시작할 수 없습니다: ${error.detail}`);
                window.history.back();
            }
        } catch (error) {
            console.error('Error initiating chat:', error);
            alert('채팅방 생성 중 오류가 발생했습니다.');
            window.history.back();
        }
    };

    if (chatId) {
        setupWebSocket(chatId);
        await fetchChatHistory(chatId);
    } else if (recipientId) {
        await initiateChat();
    } else {
        alert('잘못된 접근입니다.');
        window.history.back();
    }
    
    backBtn.addEventListener('click', () => window.history.back());

    messageInput.addEventListener('input', () => {
        sendBtn.disabled = messageInput.value.trim() === '';
        // Auto-resize textarea
        messageInput.style.height = 'auto';
        messageInput.style.height = `${messageInput.scrollHeight}px`;
    });


    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        if (messageText && websocket && websocket.readyState === WebSocket.OPEN) {
            const message = { content: messageText }; 
            websocket.send(JSON.stringify(message));
            
            messageInput.value = '';
            sendBtn.disabled = true;
            messageInput.style.height = 'auto';
        }
    });

    // 2. 메시지 그리기 로직 (영국 시간 -> 한국 시간으로 변환!)
    function appendMessage(message, isSent) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isSent ? 'sent' : 'received');
        
        // 🚀 시간 시차 해결 로직 (Z를 붙여서 브라우저가 한국 시간으로 변환하게 만듦)
        let serverTime = message.created_at;
        if (serverTime) {
            // "2026-04-05 05:45:00" 같은 형태라면 'Z'를 붙이기 위해 'T'로 연결
            serverTime = serverTime.replace(" ", "T");
            if (!serverTime.endsWith("Z")) {
                serverTime += "Z"; 
            }
        } else {
            // 시간 정보가 혹시 없으면 현재 시간
            serverTime = new Date().toISOString();
        }
        
        const dateObj = new Date(serverTime);
        const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <p class="message-content">${message.content}</p>
            <span class="message-time">${timeString}</span>
        `;
        messageContainer.appendChild(messageDiv);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
});