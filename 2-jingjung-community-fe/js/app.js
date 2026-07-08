import { CONFIG, Logger } from './config-enhanced.js';
import monitor from './monitoring.js';
import { showToast } from './utils.js';

/**
 * 애플리케이션 초기화
 */
class App {
    constructor() {
        this.serviceWorkerRegistration = null;
        this.pushSubscription = null;
    }
    
    /**
     * 앱 초기화
     */
    async init() {
        Logger.info('Initializing application...');
        
        try {
            // 1. Service Worker 등록
            if (CONFIG.FEATURES.PWA) {
                await this.registerServiceWorker();
            }
            
            // 2. 푸시 알림 권한 요청
            if (CONFIG.FEATURES.PUSH_NOTIFICATIONS) {
                await this.requestNotificationPermission();
            }
            
            // 3. 성능 모니터링 초기화 (프로덕션에서만)
            if (CONFIG.IS_PROD && CONFIG.FEATURES.ANALYTICS) {
                monitor.init();
            }
            
            // 4. 온라인/오프라인 상태 추적
            this.trackOnlineStatus();
            
            // 5. 전역 에러 핸들러
            this.setupGlobalErrorHandler();
            
            // 6. HTTPS 강제 리디렉션 (프로덕션)
            if (CONFIG.IS_PROD) {
                this.enforceHttps();
            }
            
            Logger.info('Application initialized successfully');
            
        } catch (error) {
            Logger.error('Failed to initialize application:', error);
        }
    }
    
    /**
     * Service Worker 등록
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            Logger.warn('Service Worker not supported');
            return;
        }
        
        try {
            this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            Logger.info('Service Worker registered:', this.serviceWorkerRegistration);
            
            // 업데이트 확인
            this.serviceWorkerRegistration.addEventListener('updatefound', () => {
                const newWorker = this.serviceWorkerRegistration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // 새 버전 사용 가능
                        this.showUpdateNotification();
                    }
                });
            });
            
            // 주기적 업데이트 확인 (1시간마다)
            setInterval(() => {
                this.serviceWorkerRegistration.update();
            }, 60 * 60 * 1000);
            
        } catch (error) {
            Logger.error('Service Worker registration failed:', error);
        }
    }
    
    /**
     * 새 버전 알림
     */
    showUpdateNotification() {
        if (confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
            // 새 Service Worker 활성화
            if (this.serviceWorkerRegistration.waiting) {
                this.serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // 페이지 새로고침
            window.location.reload();
        }
    }
    
    /**
     * 푸시 알림 권한 요청
     */
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            Logger.warn('Notifications not supported');
            return;
        }
        
        if (Notification.permission === 'granted') {
            await this.subscribeToPush();
            return;
        }
        
        if (Notification.permission !== 'denied') {
            // 사용자가 로그인한 경우에만 권한 요청
            const isLoggedIn = await this.checkLoginStatus();
            
            if (isLoggedIn) {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    showToast('알림이 활성화되었습니다', 'success');
                    await this.subscribeToPush();
                }
            }
        }
    }
    
    /**
     * 푸시 구독
     */
    async subscribeToPush() {
        if (!this.serviceWorkerRegistration) {
            Logger.warn('Service Worker not registered');
            return;
        }
        
        try {
            // VAPID 공개키 (백엔드에서 생성한 키로 교체 필요)
            const publicVapidKey = 'YOUR_PUBLIC_VAPID_KEY';
            
            this.pushSubscription = await this.serviceWorkerRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey)
            });
            
            // 서버에 구독 정보 전송
            await fetch(`${CONFIG.BASE_URL}/push/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(this.pushSubscription)
            });
            
            Logger.info('Push subscription successful');
            
        } catch (error) {
            Logger.error('Push subscription failed:', error);
        }
    }
    
    /**
     * Base64 URL을 Uint8Array로 변환
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
    
    /**
     * 로그인 상태 확인
     */
    async checkLoginStatus() {
        try {
            const response = await fetch(`${CONFIG.BASE_URL}/users/me`, {
                credentials: 'include'
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 온라인/오프라인 상태 추적
     */
    trackOnlineStatus() {
        window.addEventListener('online', () => {
            Logger.info('Network status: online');
            showToast('인터넷에 연결되었습니다', 'success');
            monitor.trackEvent('network', 'online', window.location.pathname);
        });
        
        window.addEventListener('offline', () => {
            Logger.warn('Network status: offline');
            showToast('인터넷 연결이 끊겼습니다', 'warning');
            monitor.trackEvent('network', 'offline', window.location.pathname);
        });
    }
    
    /**
     * 전역 에러 핸들러
     */
    setupGlobalErrorHandler() {
        // 처리되지 않은 에러
        window.addEventListener('error', (event) => {
            Logger.error('Unhandled error:', event.error);
            
            // 사용자에게 표시 (개발 환경에서만)
            if (CONFIG.IS_DEV) {
                showToast(`에러: ${event.message}`, 'error');
            }
        });
        
        // 처리되지 않은 Promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            Logger.error('Unhandled promise rejection:', event.reason);
            
            if (CONFIG.IS_DEV) {
                showToast(`Promise 에러: ${event.reason}`, 'error');
            }
        });
    }
    
    /**
     * HTTPS 강제 리디렉션
     */
    enforceHttps() {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            Logger.info('Redirecting to HTTPS...');
            location.replace(`https:${location.href.substring(location.protocol.length)}`);
        }
    }
    
    /**
     * 테마 설정 (다크 모드)
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        // 시스템 테마 변경 감지
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
    
    /**
     * 앱 업데이트 확인
     */
    async checkForUpdates() {
        try {
            const response = await fetch('/version.json', { cache: 'no-store' });
            const data = await response.json();
            
            const currentVersion = localStorage.getItem('app_version') || '0.0.0';
            
            if (data.version !== currentVersion) {
                Logger.info(`New version available: ${data.version}`);
                localStorage.setItem('app_version', data.version);
                
                // 사용자에게 알림
                if (currentVersion !== '0.0.0') {
                    showToast(`새 버전 ${data.version}으로 업데이트되었습니다`, 'info');
                }
            }
        } catch (error) {
            Logger.warn('Failed to check for updates:', error);
        }
    }
}

// ============================================
// 자동 초기화
// ============================================

const app = new App();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// 전역 객체로 등록
window.app = app;

export default app;
