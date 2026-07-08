/**
 * Service Worker - PWA 지원 및 오프라인 캐싱
 */

const CACHE_NAME = 'community-v1.0.0';
const DYNAMIC_CACHE_NAME = 'community-dynamic-v1';

// 캐싱할 정적 파일 목록
const STATIC_ASSETS = [
    '/',
    '/login.html',
    '/posts.html',
    '/chat.html',
    '/chatlist.html',
    '/header.html',
    '/css/header.css',
    '/css/login.css',
    '/css/chat.css',
    '/css/chatlist.css',
    '/js/config-enhanced.js',
    '/js/utils.js',
    '/js/header.js',
    '/js/monitoring.js',
    '/images/leaf_1.png'
];

// API 요청 캐싱 전략
const API_CACHE_URLS = [
    '/users/me',
    '/posts?page=1'
];

// ============================================
// 1. Service Worker 설치
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting(); // 즉시 활성화
            })
            .catch(error => {
                console.error('[SW] Installation failed:', error);
            })
    );
});

// ============================================
// 2. Service Worker 활성화
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        // 오래된 캐시 삭제
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim(); // 즉시 제어권 획득
            })
    );
});

// ============================================
// 3. Fetch 요청 인터셉트
// ============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // WebSocket은 Service Worker에서 처리하지 않음
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return;
    }
    
    // Chrome extension 요청 무시
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // API 요청과 정적 파일 요청을 다르게 처리
    if (url.pathname.startsWith('/api/') || url.origin !== location.origin) {
        event.respondWith(networkFirstStrategy(request));
    } else {
        event.respondWith(cacheFirstStrategy(request));
    }
});

// ============================================
// 캐싱 전략
// ============================================

/**
 * Cache First 전략: 정적 파일용
 * 1. 캐시에서 먼저 찾기
 * 2. 없으면 네트워크 요청
 * 3. 응답을 캐시에 저장
 */
async function cacheFirstStrategy(request) {
    try {
        // 1. 캐시 확인
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
        }
        
        // 2. 네트워크 요청
        console.log('[SW] Fetching from network:', request.url);
        const networkResponse = await fetch(request);
        
        // 3. 응답 캐싱 (GET 요청만)
        if (request.method === 'GET' && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        
        // 오프라인 폴백 페이지
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('/offline.html') || new Response('오프라인 상태입니다.');
        }
        
        throw error;
    }
}

/**
 * Network First 전략: API 요청용
 * 1. 네트워크 요청 시도
 * 2. 실패 시 캐시에서 가져오기
 */
async function networkFirstStrategy(request) {
    try {
        // 1. 네트워크 요청 (타임아웃 5초)
        const networkResponse = await fetchWithTimeout(request, 5000);
        
        // 2. 성공하면 캐시 업데이트
        if (networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.warn('[SW] Network request failed, trying cache:', request.url);
        
        // 3. 캐시에서 가져오기
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving stale cache:', request.url);
            return cachedResponse;
        }
        
        // 4. 캐시도 없으면 에러 응답
        return new Response(
            JSON.stringify({ error: '네트워크 연결 실패' }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * 타임아웃이 있는 fetch
 */
function fetchWithTimeout(request, timeout = 5000) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// ============================================
// 4. 푸시 알림
// ============================================
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    let data = { title: '새 알림', body: '새로운 메시지가 도착했습니다.' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: '/images/icon-192.png',
        badge: '/images/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/posts.html',
            timestamp: Date.now()
        },
        actions: [
            { action: 'open', title: '열기', icon: '/images/open-icon.png' },
            { action: 'close', title: '닫기', icon: '/images/close-icon.png' }
        ],
        tag: data.tag || 'default',
        renotify: true
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ============================================
// 5. 알림 클릭 처리
// ============================================
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    // 알림 클릭 시 해당 페이지로 이동
    const url = event.notification.data.url || '/posts.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // 이미 열린 탭이 있으면 포커스
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // 없으면 새 탭 열기
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// ============================================
// 6. 백그라운드 동기화
// ============================================
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    try {
        // 오프라인에서 보낸 메시지를 서버로 전송
        const cache = await caches.open('pending-requests');
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                await fetch(request);
                await cache.delete(request);
                console.log('[SW] Synced:', request.url);
            } catch (e) {
                console.error('[SW] Sync failed:', request.url, e);
            }
        }
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// ============================================
// 7. 메시지 처리 (클라이언트 ↔ Service Worker)
// ============================================
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(name => caches.delete(name))
                );
            })
        );
    }
    
    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service Worker script loaded');
