// 환경별 자동 URL 감지
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000';
    }
    
    // 개발 서버 (dev.yourdomain.com)
    if (hostname.includes('dev')) {
        return 'https://dev-api.yourdomain.com';
    }
    
    // 스테이징 서버 (staging.yourdomain.com)
    if (hostname.includes('staging')) {
        return 'https://staging-api.yourdomain.com';
    }
    
    // 프로덕션 (실제 도메인으로 변경 필요)
    // 예: yourdomain.com → https://api.yourdomain.com
    return window.location.protocol + '//' + hostname.replace(/^(www\.)?/, 'api.');
};

export const CONFIG = {
    BASE_URL: getBaseUrl()
};

// 현재 환경 로그 (개발 시에만)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🌍 Environment:', window.location.hostname);
    console.log('🔗 API URL:', CONFIG.BASE_URL);
}