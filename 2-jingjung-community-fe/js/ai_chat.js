import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;
import './header.js';

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // 메시지 추가 함수
    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
        
        // 텍스트 포맷팅
        // 1. 간격 조정: 항목 사이는 한 줄 띄우기(\n\n), 마지막 멘트 앞은 두 줄 띄우기(\n\n\n)
        let processedText = text
            .replace(/(https?:\/\/[^\s]+)\s+(\d+\.)/g, '$1\n\n$2')
            .replace(/(https?:\/\/[^\s]+)\s+([^\d\s])/g, '$1\n\n\n$2');

        // 2. 링크 변환, 줄바꿈 변환, 마크다운 볼드체 처리
        const formattedText = processedText
            .replace(
                /(https?:\/\/[^\s]+)/g, 
                '<a href="$1" target="_blank" class="map-link">🗺️ 지도에서 보기</a>'
            )
            .replace(/(?:\r\n|\r|\n)/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        msgDiv.innerHTML = formattedText;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function handleSend() {
        const message = chatInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        chatInput.value = '';

        try {
            // config.js에 정의된 BASE_URL 사용 (없으면 직접 기입)
            const apiUrl = `${BASE_URL}/chat`; 
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: localStorage.getItem('userId') || 'guest_user', // 로그인 정보 활용
                    message: message
                })
            });

            if (response.ok) {
                const data = await response.json();
                appendMessage('bot', data.reply);
            } else {
                appendMessage('bot', "앗! 여울이가 잠시 자리를 비웠나 봐용. 나중에 다시 물어봐 주실래요? 💦");
            }
        } catch (error) {
            console.error('Chat Error:', error);
            appendMessage('bot', "앗! 네트워크 연결이 불안정해용. 확인 부탁드려요! 💦");
        }
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
});