import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;
import './header.js';

document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = `http://${CONFIG.BASE_URL}`;
    const WS_BASE_URL = `ws://${CONFIG.BASE_URL}`;

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
    const recipientNicknameEl = document.getElementById('recipient-nickname');

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
                messageContainer.innerHTML = ''; // Clear placeholder messages
                data.messages.forEach(msg => appendMessage(msg, msg.sender_id === currentUserId));
            } else {
                console.error('Failed to fetch chat history');
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };
    
    const initiateChat = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // credentials: "include" will handle the cookie
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
    });

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        if (messageText && websocket && websocket.readyState === WebSocket.OPEN) {
            const message = { content: messageText }; // Changed 'text' to 'content' to match backend
            websocket.send(JSON.stringify(message));
            
            const sentMessage = {
                content: messageText,
                created_at: new Date().toISOString()
            }
            appendMessage(sentMessage, true);

            messageInput.value = '';
            sendBtn.disabled = true;
        }
    });

    function appendMessage(message, isSent) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isSent ? 'sent' : 'received');
        
        messageDiv.innerHTML = `
            <p class="message-content">${message.content}</p>
            <span class="message-time">${new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        `;
        messageContainer.appendChild(messageDiv);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
});
