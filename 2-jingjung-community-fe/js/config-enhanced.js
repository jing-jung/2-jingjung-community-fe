// 환경별 자동 설정
const getEnvironmentConfig = () => {
    const hostname = window.location.hostname;
    
    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return {
            BASE_URL: 'http://127.0.0.1:8000',
            WS_URL: 'ws://127.0.0.1:8000',
            ENV: 'development'
        };
    }
    
    // 개발 서버
    if (hostname.includes('dev')) {
        return {
            BASE_URL: 'https://dev-api.yourdomain.com',
            WS_URL: 'wss://dev-api.yourdomain.com',
            ENV: 'development'
        };
    }
    
    // 스테이징 서버
    if (hostname.includes('staging')) {
        return {
            BASE_URL: 'https://staging-api.yourdomain.com',
            WS_URL: 'wss://staging-api.yourdomain.com',
            ENV: 'staging'
        };
    }
    
    // 프로덕션 (기본값)
    return {
        BASE_URL: 'https://api.yourdomain.com',
        WS_URL: 'wss://api.yourdomain.com',
        CDN_URL: 'https://cdn.yourdomain.com',
        ENV: 'production'
    };
};

// 설정 객체
const env = getEnvironmentConfig();

export const CONFIG = {
    // API 엔드포인트
    BASE_URL: env.BASE_URL,
    WS_URL: env.WS_URL,
    CDN_URL: env.CDN_URL || env.BASE_URL,
    
    // 환경
    ENV: env.ENV,
    IS_DEV: env.ENV === 'development',
    IS_PROD: env.ENV === 'production',
    
    // 기능 플래그 (Feature Flags)
    FEATURES: {
        INFINITE_SCROLL: true,      // 무한 스크롤
        VIRTUAL_SCROLL: false,       // 가상 스크롤 (대용량 리스트용)
        PUSH_NOTIFICATIONS: true,    // 푸시 알림
        PWA: true,                   // PWA 지원
        IMAGE_OPTIMIZATION: true,    // 이미지 최적화
        ANALYTICS: true              // 사용자 행동 추적
    },
    
    // 성능 설정
    PERFORMANCE: {
        DEBOUNCE_DELAY: 300,         // API 요청 디바운스 (ms)
        THROTTLE_DELAY: 1000,        // 스크롤 이벤트 쓰로틀 (ms)
        CACHE_TTL: 300000,           // 클라이언트 캐시 유효 시간 (5분)
        REQUEST_TIMEOUT: 30000       // API 요청 타임아웃 (30초)
    },
    
    // 페이지네이션
    PAGINATION: {
        POSTS_PER_PAGE: 20,
        COMMENTS_PER_PAGE: 10,
        MESSAGES_PER_PAGE: 50
    },
    
    // 이미지 설정
    IMAGE: {
        MAX_SIZE: 5 * 1024 * 1024,   // 5MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        THUMBNAIL_SIZE: { width: 200, height: 200 },
        MEDIUM_SIZE: { width: 800, height: 600 }
    },
    
    // 로깅 레벨
    LOG_LEVEL: env.ENV === 'production' ? 'error' : 'debug'
};

// 로깅 유틸리티
export const Logger = {
    debug: (...args) => {
        if (CONFIG.LOG_LEVEL === 'debug') {
            console.log('[DEBUG]', ...args);
        }
    },
    
    info: (...args) => {
        if (['debug', 'info'].includes(CONFIG.LOG_LEVEL)) {
            console.info('[INFO]', ...args);
        }
    },
    
    warn: (...args) => {
        if (['debug', 'info', 'warn'].includes(CONFIG.LOG_LEVEL)) {
            console.warn('[WARN]', ...args);
        }
    },
    
    error: (...args) => {
        console.error('[ERROR]', ...args);
        
        // 프로덕션에서는 에러를 서버로 전송
        if (CONFIG.IS_PROD) {
            sendErrorToServer(...args);
        }
    }
};

// 에러 전송 함수
async function sendErrorToServer(...args) {
    try {
        await fetch(`${CONFIG.BASE_URL}/errors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' '),
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }),
            keepalive: true
        });
    } catch (e) {
        // 에러 전송 실패는 무시
        console.error('Failed to send error to server:', e);
    }
}

// 개발 환경에서 설정 출력
if (CONFIG.IS_DEV) {
    Logger.info('Application Config:', CONFIG);
}
