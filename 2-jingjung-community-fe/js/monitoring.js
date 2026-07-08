import { CONFIG, Logger } from './config-enhanced.js';

/**
 * 프론트엔드 성능 모니터링 및 에러 추적
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.errors = [];
        this.initialized = false;
    }
    
    /**
     * 모니터링 초기화
     */
    init() {
        if (this.initialized) return;
        
        // 1. 페이지 로드 성능 측정
        this.trackPageLoad();
        
        // 2. API 요청 인터셉트
        this.interceptFetch();
        
        // 3. JavaScript 에러 추적
        this.trackJavaScriptErrors();
        
        // 4. Promise Rejection 추적
        this.trackUnhandledRejections();
        
        // 5. 웹 바이탈 측정
        this.trackWebVitals();
        
        // 6. 주기적 전송 (30초마다)
        setInterval(() => this.sendMetrics(), 30000);
        
        // 7. 페이지 종료 시 전송
        window.addEventListener('beforeunload', () => this.sendMetrics());
        
        this.initialized = true;
        Logger.info('Performance Monitor initialized');
    }
    
    /**
     * 페이지 로드 성능 측정
     */
    trackPageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                
                if (perfData) {
                    const metrics = {
                        type: 'page_load',
                        url: window.location.pathname,
                        dns_time: Math.round(perfData.domainLookupEnd - perfData.domainLookupStart),
                        tcp_time: Math.round(perfData.connectEnd - perfData.connectStart),
                        request_time: Math.round(perfData.responseStart - perfData.requestStart),
                        response_time: Math.round(perfData.responseEnd - perfData.responseStart),
                        dom_parse_time: Math.round(perfData.domInteractive - perfData.responseEnd),
                        dom_ready_time: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
                        total_load_time: Math.round(perfData.loadEventEnd - perfData.fetchStart),
                        timestamp: new Date().toISOString()
                    };
                    
                    this.addMetric(metrics);
                    Logger.info('Page Load Metrics:', metrics);
                }
            }, 0);
        });
    }
    
    /**
     * Fetch API 인터셉트하여 요청 성능 측정
     */
    interceptFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            const method = args[1]?.method || 'GET';
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                
                // API 요청 메트릭 수집
                this.addMetric({
                    type: 'api_request',
                    url: this.sanitizeUrl(url),
                    method: method,
                    status: response.status,
                    duration: duration,
                    success: response.ok,
                    timestamp: new Date().toISOString()
                });
                
                // 느린 API 경고 (3초 이상)
                if (duration > 3000) {
                    Logger.warn(`Slow API: ${url} took ${duration}ms`);
                }
                
                return response;
                
            } catch (error) {
                const endTime = performance.now();
                const duration = Math.round(endTime - startTime);
                
                // API 에러 메트릭
                this.addMetric({
                    type: 'api_error',
                    url: this.sanitizeUrl(url),
                    method: method,
                    duration: duration,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                
                Logger.error(`API Error: ${url}`, error);
                throw error;
            }
        };
    }
    
    /**
     * JavaScript 에러 추적
     */
    trackJavaScriptErrors() {
        window.addEventListener('error', (event) => {
            const errorData = {
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                url: window.location.pathname,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            this.addError(errorData);
            Logger.error('JavaScript Error:', errorData);
            
            // 즉시 서버로 전송 (중요 에러)
            this.sendError(errorData);
        });
    }
    
    /**
     * Unhandled Promise Rejection 추적
     */
    trackUnhandledRejections() {
        window.addEventListener('unhandledrejection', (event) => {
            const errorData = {
                type: 'promise_rejection',
                reason: event.reason?.message || String(event.reason),
                stack: event.reason?.stack,
                url: window.location.pathname,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            this.addError(errorData);
            Logger.error('Unhandled Promise Rejection:', errorData);
            
            // 즉시 서버로 전송
            this.sendError(errorData);
        });
    }
    
    /**
     * Web Vitals 측정 (Core Web Vitals)
     */
    trackWebVitals() {
        // LCP (Largest Contentful Paint)
        this.observeLCP();
        
        // FID (First Input Delay)
        this.observeFID();
        
        // CLS (Cumulative Layout Shift)
        this.observeCLS();
    }
    
    observeLCP() {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                this.addMetric({
                    type: 'web_vital',
                    metric: 'LCP',
                    value: Math.round(lastEntry.renderTime || lastEntry.loadTime),
                    rating: this.getRating(lastEntry.renderTime || lastEntry.loadTime, 2500, 4000),
                    timestamp: new Date().toISOString()
                });
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
            Logger.warn('LCP observation not supported', e);
        }
    }
    
    observeFID() {
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    this.addMetric({
                        type: 'web_vital',
                        metric: 'FID',
                        value: Math.round(entry.processingStart - entry.startTime),
                        rating: this.getRating(entry.processingStart - entry.startTime, 100, 300),
                        timestamp: new Date().toISOString()
                    });
                });
            });
            
            observer.observe({ entryTypes: ['first-input'] });
        } catch (e) {
            Logger.warn('FID observation not supported', e);
        }
    }
    
    observeCLS() {
        try {
            let clsValue = 0;
            
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                
                this.addMetric({
                    type: 'web_vital',
                    metric: 'CLS',
                    value: Math.round(clsValue * 1000) / 1000,
                    rating: this.getRating(clsValue, 0.1, 0.25),
                    timestamp: new Date().toISOString()
                });
            });
            
            observer.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
            Logger.warn('CLS observation not supported', e);
        }
    }
    
    /**
     * 메트릭 등급 계산 (good, needs-improvement, poor)
     */
    getRating(value, goodThreshold, poorThreshold) {
        if (value <= goodThreshold) return 'good';
        if (value <= poorThreshold) return 'needs-improvement';
        return 'poor';
    }
    
    /**
     * URL 민감 정보 제거
     */
    sanitizeUrl(url) {
        try {
            const urlObj = new URL(url, window.location.origin);
            // 쿼리 파라미터에서 민감 정보 제거
            urlObj.searchParams.delete('password');
            urlObj.searchParams.delete('token');
            urlObj.searchParams.delete('session');
            return urlObj.pathname + urlObj.search;
        } catch (e) {
            return url;
        }
    }
    
    /**
     * 메트릭 추가
     */
    addMetric(metric) {
        this.metrics.push(metric);
        
        // 100개 이상 쌓이면 자동 전송
        if (this.metrics.length >= 100) {
            this.sendMetrics();
        }
    }
    
    /**
     * 에러 추가
     */
    addError(error) {
        this.errors.push(error);
    }
    
    /**
     * 메트릭 서버로 전송
     */
    sendMetrics() {
        if (this.metrics.length === 0) return;
        
        const payload = {
            metrics: this.metrics,
            session: this.getSessionId(),
            user_agent: navigator.userAgent,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            connection: this.getConnectionInfo()
        };
        
        // Beacon API 사용 (페이지 종료 시에도 전송 보장)
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon(`${CONFIG.BASE_URL}/metrics`, blob);
        } else {
            // Fallback: fetch with keepalive
            fetch(`${CONFIG.BASE_URL}/metrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(e => Logger.error('Failed to send metrics', e));
        }
        
        // 전송 후 초기화
        this.metrics = [];
        Logger.debug('Metrics sent:', payload);
    }
    
    /**
     * 에러 서버로 전송
     */
    sendError(error) {
        fetch(`${CONFIG.BASE_URL}/errors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...error,
                session: this.getSessionId()
            }),
            keepalive: true
        }).catch(e => Logger.error('Failed to send error', e));
    }
    
    /**
     * 세션 ID 생성/가져오기
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('monitor_session_id');
        
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('monitor_session_id', sessionId);
        }
        
        return sessionId;
    }
    
    /**
     * 네트워크 연결 정보
     */
    getConnectionInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            return {
                effective_type: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                save_data: conn.saveData
            };
        }
        return null;
    }
    
    /**
     * 커스텀 이벤트 추적
     */
    trackEvent(category, action, label, value) {
        this.addMetric({
            type: 'custom_event',
            category,
            action,
            label,
            value,
            url: window.location.pathname,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * 사용자 행동 추적
     */
    trackUserAction(action, data = {}) {
        this.addMetric({
            type: 'user_action',
            action,
            data,
            url: window.location.pathname,
            timestamp: new Date().toISOString()
        });
    }
}

// 싱글톤 인스턴스 생성
const monitor = new PerformanceMonitor();

// 자동 초기화 (프로덕션 환경에서만)
if (CONFIG.IS_PROD && CONFIG.FEATURES.ANALYTICS) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => monitor.init());
    } else {
        monitor.init();
    }
}

export default monitor;

// 전역 객체에 추가 (다른 스크립트에서 사용 가능)
window.PerformanceMonitor = monitor;
