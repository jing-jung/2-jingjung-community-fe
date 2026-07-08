import { CONFIG, Logger } from './config-enhanced.js';

/**
 * 유틸리티 함수 모음
 */

// ============================================
// 1. 디바운스 & 쓰로틀
// ============================================

/**
 * 디바운스: 마지막 호출 후 일정 시간 대기
 * 사용처: 검색창 입력, 자동완성
 */
export function debounce(func, wait = CONFIG.PERFORMANCE.DEBOUNCE_DELAY) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 쓰로틀: 일정 시간 간격으로 최대 한 번만 실행
 * 사용처: 스크롤 이벤트, 리사이즈 이벤트
 */
export function throttle(func, limit = CONFIG.PERFORMANCE.THROTTLE_DELAY) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// 2. API 요청 래퍼
// ============================================

/**
 * 향상된 fetch 래퍼
 * - 자동 타임아웃
 * - 에러 핸들링
 * - 로깅
 * - 재시도 로직
 */
export async function fetchWithRetry(url, options = {}, retries = 3) {
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(), 
        CONFIG.PERFORMANCE.REQUEST_TIMEOUT
    );
    
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        signal: controller.signal,
        ...options
    };
    
    try {
        Logger.debug(`API Request: ${url}`, options);
        
        const response = await fetch(url, defaultOptions);
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        Logger.debug(`API Response: ${url}`, data);
        
        return data;
        
    } catch (error) {
        clearTimeout(timeout);
        
        // 재시도 로직
        if (retries > 0 && error.name !== 'AbortError') {
            Logger.warn(`Retrying... (${retries} attempts left)`);
            await sleep(1000); // 1초 대기
            return fetchWithRetry(url, options, retries - 1);
        }
        
        Logger.error(`API Error: ${url}`, error);
        throw error;
    }
}

/**
 * sleep 함수
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 3. 입력 검증 & 보안
// ============================================

/**
 * XSS 방어: HTML 태그 제거
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * 비밀번호 강도 체크
 */
export function checkPasswordStrength(password) {
    const strength = {
        weak: password.length < 8,
        medium: password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password),
        strong: password.length >= 12 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password)
    };
    
    if (strength.strong) return 'strong';
    if (strength.medium) return 'medium';
    return 'weak';
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(file, maxSize = CONFIG.IMAGE.MAX_SIZE) {
    return file.size <= maxSize;
}

/**
 * 파일 타입 검증
 */
export function validateFileType(file, allowedTypes = CONFIG.IMAGE.ALLOWED_TYPES) {
    return allowedTypes.includes(file.type);
}

// ============================================
// 4. 날짜/시간 유틸리티
// ============================================

/**
 * 상대 시간 표시 (예: "3분 전", "2시간 전")
 */
export function getRelativeTime(dateString) {
    // 서버 시간(KST)을 ISO 8601 포맷으로 변환
    let isoString = dateString;
    if (dateString && !dateString.endsWith('Z')) {
        isoString = dateString.replace(' ', 'T') + 'Z';
    }
    
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return '방금 전';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes}분 전`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours}시간 전`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays}일 전`;
    }
    
    // 7일 이상이면 날짜 표시
    return formatDate(date);
}

/**
 * 날짜 포맷팅 (YYYY.MM.DD)
 */
export function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

/**
 * 시간 포맷팅 (HH:MM)
 */
export function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ============================================
// 5. 숫자 포맷팅
// ============================================

/**
 * 숫자를 천 단위로 콤마 구분
 */
export function formatNumber(num) {
    return num.toLocaleString('ko-KR');
}

/**
 * 큰 숫자를 축약 (예: 1,234 → 1.2K)
 */
export function abbreviateNumber(num) {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    return (num / 1000000).toFixed(1) + 'M';
}

// ============================================
// 6. DOM 유틸리티
// ============================================

/**
 * 요소가 뷰포트에 보이는지 확인
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * 부드러운 스크롤
 */
export function smoothScrollTo(element) {
    element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

/**
 * 로딩 스피너 표시/숨김
 */
export function showLoadingSpinner(text = '로딩 중...') {
    let spinner = document.getElementById('global-spinner');
    
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'global-spinner';
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
                <p class="spinner-text">${text}</p>
            </div>
        `;
        document.body.appendChild(spinner);
    }
    
    spinner.style.display = 'flex';
}

export function hideLoadingSpinner() {
    const spinner = document.getElementById('global-spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

/**
 * 토스트 알림 표시
 */
export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 애니메이션 적용
    setTimeout(() => toast.classList.add('show'), 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// 7. 이미지 최적화
// ============================================

/**
 * 이미지 URL 최적화 (CDN + 리사이징)
 */
export function getOptimizedImageUrl(originalUrl, options = {}) {
    if (!originalUrl || !CONFIG.FEATURES.IMAGE_OPTIMIZATION) {
        return originalUrl;
    }
    
    const { width, height, quality = 80, format = 'webp' } = options;
    
    // CDN URL 사용
    if (CONFIG.CDN_URL && !originalUrl.startsWith('http')) {
        originalUrl = CONFIG.CDN_URL + originalUrl;
    }
    
    // 이미 최적화된 URL이면 그대로 반환
    if (originalUrl.includes('w=') || originalUrl.includes('h=')) {
        return originalUrl;
    }
    
    // 쿼리 파라미터 추가
    const params = new URLSearchParams();
    if (width) params.append('w', width);
    if (height) params.append('h', height);
    params.append('q', quality);
    params.append('f', format);
    
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}${params.toString()}`;
}

/**
 * 이미지 지연 로딩 (Lazy Loading)
 */
export function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ============================================
// 8. 로컬 스토리지 래퍼 (with TTL)
// ============================================

export const Storage = {
    /**
     * 데이터 저장 (TTL 지원)
     */
    set(key, value, ttl = CONFIG.PERFORMANCE.CACHE_TTL) {
        const item = {
            value: value,
            expiry: Date.now() + ttl
        };
        
        try {
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e) {
            Logger.warn('LocalStorage is full', e);
        }
    },
    
    /**
     * 데이터 가져오기
     */
    get(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            
            // TTL 체크
            if (Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (e) {
            Logger.error('Error reading from localStorage', e);
            return null;
        }
    },
    
    /**
     * 데이터 삭제
     */
    remove(key) {
        localStorage.removeItem(key);
    },
    
    /**
     * 전체 삭제
     */
    clear() {
        localStorage.clear();
    }
};

// ============================================
// 9. 클립보드 복사
// ============================================

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('클립보드에 복사되었습니다', 'success');
        return true;
    } catch (e) {
        Logger.error('Failed to copy to clipboard', e);
        showToast('복사에 실패했습니다', 'error');
        return false;
    }
}

// ============================================
// 10. 브라우저 정보
// ============================================

export const Browser = {
    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
    isAndroid: /Android/i.test(navigator.userAgent),
    isChrome: /Chrome/i.test(navigator.userAgent),
    isSafari: /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent),
    isFirefox: /Firefox/i.test(navigator.userAgent),
    
    supportsWebP: () => {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    },
    
    supportsServiceWorker: () => 'serviceWorker' in navigator,
    
    supportsPushNotifications: () => 'PushManager' in window
};

// ============================================
// 11. 성능 측정
// ============================================

export class PerformanceTracker {
    constructor(name) {
        this.name = name;
        this.startTime = performance.now();
    }
    
    end() {
        const duration = performance.now() - this.startTime;
        Logger.info(`[Performance] ${this.name}: ${duration.toFixed(2)}ms`);
        return duration;
    }
}

// 사용 예시:
// const tracker = new PerformanceTracker('API Request');
// await fetchData();
// tracker.end();

// ============================================
// 12. URL 파라미터 유틸리티
// ============================================

export const URLParams = {
    get(key) {
        const params = new URLSearchParams(window.location.search);
        return params.get(key);
    },
    
    getAll() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },
    
    set(key, value) {
        const url = new URL(window.location);
        url.searchParams.set(key, value);
        window.history.pushState({}, '', url);
    },
    
    remove(key) {
        const url = new URL(window.location);
        url.searchParams.delete(key);
        window.history.pushState({}, '', url);
    }
};

// ============================================
// 자동 초기화
// ============================================

// 페이지 로드 시 자동으로 Lazy Loading 설정
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLazyLoading);
} else {
    setupLazyLoading();
}

export default {
    debounce,
    throttle,
    fetchWithRetry,
    sanitizeInput,
    isValidEmail,
    checkPasswordStrength,
    validateFileSize,
    validateFileType,
    getRelativeTime,
    formatDate,
    formatTime,
    formatNumber,
    abbreviateNumber,
    isInViewport,
    smoothScrollTo,
    showLoadingSpinner,
    hideLoadingSpinner,
    showToast,
    getOptimizedImageUrl,
    setupLazyLoading,
    Storage,
    copyToClipboard,
    Browser,
    PerformanceTracker,
    URLParams
};
