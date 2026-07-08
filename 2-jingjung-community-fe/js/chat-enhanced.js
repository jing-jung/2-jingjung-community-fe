import { CONFIG, Logger } from './config-enhanced.js';
import { 
    fetchWithRetry, 
    getRelativeTime, 
    formatTime,
    showLoadingSpinner,
    hideLoadingSpinner,
    showToast,
    debounce
} from './utils.js';
import './header.js';
import monitor from './monitoring.js';

/**
 * 향상된 채팅 클래스
 * - WebSocket 자동 재연결
 * - 메시지 전송 실패 시 재시도
 * - 옵티미스틱 UI 업데이트
 * - 읽음 상태 실시간 반영
 */
class ChatManager {
    constructor() {
        this.websocket = null;
        this.currentUserId = null;
        this.chatId = null;
        this.recipientId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = []; // 전송 실패한 메시지 큐
        this.isConnected = false;
        this.pingInterval = null;
        
        // DOM 요소
        this.messageContainer = null;
        this.messageForm = null;
        this.messageInput = null;
        this.sendBtn = null;
        this.backBtn = null;
        this.connectionStatus = null;
    }
    
    /**
     * 초기화
     */
    async init() {
        try {
            // 1. 현재 사용자 정보 가져오기
            await this.loadCurrentUser();
            
            // 2. URL 파라미터 파싱
            this.parseUrlParams();
            
            // 3. DOM 요소 초기화
            this.initDomElements();
            
            // 4. 채팅방 설정
            if (this.chatId) {
                await this.loadChatHistory(this.chatId);
                this.setupWebSocket(this.chatId);
            } else if (this.recipientId) {
                await this.initiateChat();
            } else {
                showToast('잘못된 접근입니다', 'error');
                window.history.back();
                return;
            }
            
            // 5. 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 6. 성능 추적
            monitor.trackUserAction('chat_opened', { chatId: this.chatId });
            
        } catch (error) {
            Logger.error('Chat initialization failed:', error);
            showToast('채팅을 불러오는데 실패했습니다', 'error');
            window.history.back();
        }
    }
    
    /**
     * 현재 사용자 정보 가져오기
     */
    async loadCurrentUser() {
        try {
            const user = await fetchWithRetry(`${CONFIG.BASE_URL}/users/me`);
            this.currentUserId = user.id;
            Logger.info('Current user loaded:', this.currentUserId);
        } catch (error) {
            Logger.error('Failed to load user info:', error);
            showToast('로그인이 필요합니다', 'error');
            window.location.href = 'login.html';
            throw error;
        }
    }
    
    /**
     * URL 파라미터 파싱
     */
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.chatId = urlParams.get('chatId');
        this.recipientId = urlParams.get('recipientId');
    }
    
    /**
     * DOM 요소 초기화
     */
    initDomElements() {
        this.messageContainer = document.getElementById('message-container');
        this.messageForm = document.getElementById('message-form');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.backBtn = document.getElementById('back-btn');
        
        // 연결 상태 표시 요소 추가
        this.connectionStatus = document.createElement('div');
        this.connectionStatus.className = 'connection-status';
        this.connectionStatus.style.display = 'none';
        document.body.appendChild(this.connectionStatus);
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 뒤로가기 버튼
        this.backBtn?.addEventListener('click', () => {
            this.cleanup();
            window.history.back();
        });
        
        // 메시지 입력 실시간 감지
        this.messageInput?.addEventListener('input', () => {
            this.sendBtn.disabled = this.messageInput.value.trim() === '';
            this.autoResizeTextarea();
        });
        
        // 메시지 전송
        this.messageForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Enter 키로 전송 (Shift+Enter는 줄바꿈)
        this.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 페이지 나가기 전 정리
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // 온라인/오프라인 감지
        window.addEventListener('online', () => {
            Logger.info('Network online');
            this.reconnectWebSocket();
        });
        
        window.addEventListener('offline', () => {
            Logger.warn('Network offline');
            this.showConnectionStatus('오프라인 상태입니다', 'offline');
        });
    }
    
    /**
     * 채팅방 생성
     */
    async initiateChat() {
        try {
            showLoadingSpinner('채팅방을 생성하는 중...');
            
            const chat = await fetchWithRetry(`${CONFIG.BASE_URL}/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient_id: parseInt(this.recipientId) })
            });
            
            // URL 업데이트
            this.chatId = chat.room_id;
            window.history.replaceState({}, '', `chat.html?chatId=${this.chatId}`);
            
            // WebSocket 연결
            this.setupWebSocket(this.chatId);
            
            // 채팅 기록 불러오기
            await this.loadChatHistory(this.chatId);
            
            hideLoadingSpinner();
            
        } catch (error) {
            hideLoadingSpinner();
            Logger.error('Failed to initiate chat:', error);
            showToast('채팅방 생성에 실패했습니다', 'error');
            window.history.back();
        }
    }
    
    /**
     * 채팅 기록 불러오기
     */
    async loadChatHistory(chatId) {
        try {
            const data = await fetchWithRetry(
                `${CONFIG.BASE_URL}/chats/${chatId}/messages`
            );
            
            this.messageContainer.innerHTML = '';
            
            if (data.messages.length === 0) {
                this.showEmptyState();
            } else {
                data.messages.forEach(msg => {
                    this.appendMessage(msg, msg.sender_id === this.currentUserId, false);
                });
                this.scrollToBottom();
            }
            
        } catch (error) {
            Logger.error('Failed to load chat history:', error);
            showToast('채팅 기록을 불러오는데 실패했습니다', 'error');
        }
    }
    
    /**
     * WebSocket 설정
     */
    setupWebSocket(chatId) {
        const wsUrl = `${CONFIG.WS_URL}/ws/${chatId}`;
        Logger.info('Connecting to WebSocket:', wsUrl);
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => this.onWebSocketOpen();
            this.websocket.onmessage = (event) => this.onWebSocketMessage(event);
            this.websocket.onclose = (event) => this.onWebSocketClose(event);
            this.websocket.onerror = (error) => this.onWebSocketError(error);
            
        } catch (error) {
            Logger.error('Failed to create WebSocket:', error);
            this.showConnectionStatus('연결 실패', 'error');
        }
    }
    
    /**
     * WebSocket 연결 성공
     */
    onWebSocketOpen() {
        Logger.info('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.hideConnectionStatus();
        
        // Ping 시작 (30초마다)
        this.startPing();
        
        // 전송 실패한 메시지 재전송
        this.retryQueuedMessages();
        
        monitor.trackEvent('websocket', 'connected', this.chatId);
    }
    
    /**
     * WebSocket 메시지 수신
     */
    onWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            Logger.debug('Message received:', message);
            
            // 내가 보낸 메시지인지 확인
            const isSent = message.sender_id === this.currentUserId;
            
            // 메시지 추가
            this.appendMessage(message, isSent, true);
            
            // 읽음 처리
            if (!isSent) {
                this.markAsRead(message.id);
            }
            
            monitor.trackEvent('websocket', 'message_received', this.chatId);
            
        } catch (error) {
            Logger.error('Failed to parse message:', error);
        }
    }
    
    /**
     * WebSocket 연결 종료
     */
    onWebSocketClose(event) {
        Logger.warn('WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.stopPing();
        
        // 비정상 종료 시 재연결 시도
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.showConnectionStatus('연결이 끊겼습니다. 재연결 중...', 'reconnecting');
            this.reconnectWebSocket();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showConnectionStatus('연결 실패. 페이지를 새로고침 해주세요.', 'error');
        }
        
        monitor.trackEvent('websocket', 'disconnected', this.chatId);
    }
    
    /**
     * WebSocket 에러
     */
    onWebSocketError(error) {
        Logger.error('WebSocket error:', error);
        this.showConnectionStatus('연결 오류 발생', 'error');
        monitor.trackEvent('websocket', 'error', this.chatId);
    }
    
    /**
     * WebSocket 재연결
     */
    reconnectWebSocket() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            Logger.error('Max reconnect attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 지수 백오프
        
        Logger.info(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (this.chatId) {
                this.setupWebSocket(this.chatId);
            }
        }, delay);
    }
    
    /**
     * Ping 시작 (연결 유지)
     */
    startPing() {
        this.stopPing();
        
        this.pingInterval = setInterval(() => {
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({ type: 'ping' }));
                Logger.debug('Ping sent');
            }
        }, 30000);
    }
    
    /**
     * Ping 중지
     */
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * 메시지 전송
     */
    async sendMessage() {
        const content = this.messageInput.value.trim();
        
        if (!content) return;
        
        // 입력창 초기화 및 버튼 비활성화
        this.messageInput.value = '';
        this.sendBtn.disabled = true;
        this.autoResizeTextarea();
        
        // 임시 메시지 객체 생성
        const tempMessage = {
            id: 'temp_' + Date.now(),
            content: content,
            sender_id: this.currentUserId,
            created_at: new Date().toISOString(),
            is_read: 0,
            status: 'sending'
        };
        
        // 옵티미스틱 UI 업데이트
        this.appendMessage(tempMessage, true, true);
        
        try {
            // WebSocket으로 전송
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({ content }));
                
                // 전송 성공 상태 업데이트
                this.updateMessageStatus(tempMessage.id, 'sent');
                
                monitor.trackEvent('chat', 'message_sent', this.chatId);
                
            } else {
                // WebSocket 연결 안 됨 → 큐에 추가
                this.messageQueue.push(tempMessage);
                this.updateMessageStatus(tempMessage.id, 'queued');
                showToast('메시지가 전송 대기 중입니다', 'warning');
            }
            
        } catch (error) {
            Logger.error('Failed to send message:', error);
            
            // 전송 실패 → 큐에 추가
            this.messageQueue.push(tempMessage);
            this.updateMessageStatus(tempMessage.id, 'failed');
            showToast('메시지 전송 실패. 재시도 중...', 'error');
        }
    }
    
    /**
     * 메시지 추가
     */
    appendMessage(message, isSent, animated = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        messageDiv.dataset.messageId = message.id;
        
        if (animated) {
            messageDiv.classList.add('message-enter');
        }
        
        // 메시지 상태 표시
        let statusIcon = '';
        if (isSent && message.status) {
            switch (message.status) {
                case 'sending':
                    statusIcon = '<span class="status-icon sending">⏳</span>';
                    break;
                case 'sent':
                    statusIcon = '<span class="status-icon sent">✓</span>';
                    break;
                case 'read':
                    statusIcon = '<span class="status-icon read">✓✓</span>';
                    break;
                case 'failed':
                    statusIcon = '<span class="status-icon failed">❌</span>';
                    break;
            }
        }
        
        // 시간 포맷팅
        const timeString = formatTime(message.created_at);
        
        messageDiv.innerHTML = `
            <p class="message-content">${this.escapeHtml(message.content)}</p>
            <div class="message-footer">
                <span class="message-time">${timeString}</span>
                ${statusIcon}
            </div>
        `;
        
        this.messageContainer.appendChild(messageDiv);
        
        // 애니메이션 후 클래스 제거
        if (animated) {
            setTimeout(() => messageDiv.classList.remove('message-enter'), 300);
        }
        
        this.scrollToBottom();
    }
    
    /**
     * 메시지 상태 업데이트
     */
    updateMessageStatus(messageId, status) {
        const messageDiv = this.messageContainer.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageDiv) return;
        
        const statusIcon = messageDiv.querySelector('.status-icon');
        if (!statusIcon) return;
        
        statusIcon.className = `status-icon ${status}`;
        
        switch (status) {
            case 'sending':
                statusIcon.textContent = '⏳';
                break;
            case 'sent':
                statusIcon.textContent = '✓';
                break;
            case 'read':
                statusIcon.textContent = '✓✓';
                break;
            case 'failed':
                statusIcon.textContent = '❌';
                break;
        }
    }
    
    /**
     * 전송 실패한 메시지 재시도
     */
    async retryQueuedMessages() {
        if (this.messageQueue.length === 0) return;
        
        Logger.info('Retrying queued messages:', this.messageQueue.length);
        
        for (const message of this.messageQueue) {
            try {
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    this.websocket.send(JSON.stringify({ content: message.content }));
                    this.updateMessageStatus(message.id, 'sent');
                }
            } catch (error) {
                Logger.error('Failed to retry message:', error);
            }
        }
        
        this.messageQueue = [];
    }
    
    /**
     * 읽음 처리
     */
    async markAsRead(messageId) {
        try {
            await fetchWithRetry(`${CONFIG.BASE_URL}/chats/${this.chatId}/messages/${messageId}/read`, {
                method: 'PUT'
            });
        } catch (error) {
            Logger.error('Failed to mark as read:', error);
        }
    }
    
    /**
     * 빈 상태 표시
     */
    showEmptyState() {
        this.messageContainer.innerHTML = `
            <div class="empty-state">
                <p class="system-message">대화를 시작해보세요 👋</p>
            </div>
        `;
    }
    
    /**
     * 하단으로 스크롤
     */
    scrollToBottom() {
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }
    
    /**
     * Textarea 자동 리사이즈
     */
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = `${this.messageInput.scrollHeight}px`;
    }
    
    /**
     * HTML 이스케이프 (XSS 방어)
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 연결 상태 표시
     */
    showConnectionStatus(message, type) {
        if (!this.connectionStatus) return;
        
        this.connectionStatus.textContent = message;
        this.connectionStatus.className = `connection-status ${type}`;
        this.connectionStatus.style.display = 'block';
    }
    
    /**
     * 연결 상태 숨김
     */
    hideConnectionStatus() {
        if (this.connectionStatus) {
            this.connectionStatus.style.display = 'none';
        }
    }
    
    /**
     * 정리 (메모리 누수 방지)
     */
    cleanup() {
        Logger.info('Cleaning up chat manager');
        
        // WebSocket 종료
        if (this.websocket) {
            this.websocket.close(1000, 'Normal closure');
            this.websocket = null;
        }
        
        // Ping 중지
        this.stopPing();
        
        // 이벤트 리스너 제거
        this.messageForm?.removeEventListener('submit', this.sendMessage);
        this.backBtn?.removeEventListener('click', this.cleanup);
        
        monitor.trackUserAction('chat_closed', { chatId: this.chatId });
    }
}

// ============================================
// 페이지 로드 시 초기화
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const chatManager = new ChatManager();
    await chatManager.init();
    
    // 전역 객체로 등록 (디버깅용)
    window.chatManager = chatManager;
});
