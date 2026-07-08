# 🔧 자동 환경 감지 설정 가이드

## 📋 개요

`config.js`가 자동으로 환경을 감지하여 적절한 백엔드 URL을 사용합니다.  
**더 이상 수동으로 URL을 변경할 필요가 없습니다!** ✨

---

## 🎯 자동 감지 규칙

### 현재 설정된 규칙

| 프론트엔드 도메인 | 자동 연결되는 백엔드 URL | 환경 |
|------------------|------------------------|------|
| `localhost` | `http://127.0.0.1:8000` | 로컬 개발 |
| `127.0.0.1` | `http://127.0.0.1:8000` | 로컬 개발 |
| `dev.yourdomain.com` | `https://dev-api.yourdomain.com` | 개발 서버 |
| `staging.yourdomain.com` | `https://staging-api.yourdomain.com` | 스테이징 |
| `yourdomain.com` | `https://api.yourdomain.com` | 프로덕션 |
| `www.yourdomain.com` | `https://api.yourdomain.com` | 프로덕션 |

---

## ⚙️ 프로덕션 환경 설정

### 방법 1: 실제 도메인이 있는 경우

예를 들어 프론트엔드가 `myapp.com`에 배포되고, 백엔드가 `api.myapp.com`에 있다면:

```javascript
// config.js의 프로덕션 부분 수정
// 프로덕션 (실제 도메인으로 변경 필요)
// 예: yourdomain.com → https://api.yourdomain.com
return window.location.protocol + '//' + hostname.replace(/^(www\.)?/, 'api.');
```

이렇게 하면:
- `myapp.com` → `https://api.myapp.com`
- `www.myapp.com` → `https://api.myapp.com`

---

### 방법 2: 프론트엔드와 백엔드 도메인이 완전히 다른 경우

예: 프론트엔드 `frontend.com`, 백엔드 `backend.com`

```javascript
// config.js 수정
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000';
    }
    
    // 프로덕션 - 고정된 백엔드 URL 사용
    return 'https://backend.com';  // ← 실제 백엔드 도메인으로 변경
};
```

---

### 방법 3: AWS Load Balancer 또는 특정 URL 사용

예: ALB URL이 `community-alb-123456.ap-southeast-2.elb.amazonaws.com`인 경우

```javascript
// config.js 수정
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // 로컬 개발 환경
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000';
    }
    
    // 프로덕션 - ALB URL
    return 'https://community-alb-123456.ap-southeast-2.elb.amazonaws.com';
};
```

---

## 🧪 테스트 방법

### 1. 로컬 환경 확인
```bash
# 프론트엔드 실행
cd 2-jingjung-community-fe
python -m http.server 3000

# 브라우저에서 접속
http://localhost:3000
```

**브라우저 콘솔(F12)에서 확인:**
```
🌍 Environment: localhost
🔗 API URL: http://127.0.0.1:8000
```

### 2. API 연결 테스트
```javascript
// 브라우저 콘솔에서 실행
fetch(CONFIG.BASE_URL + '/health')
    .then(res => res.json())
    .then(data => console.log('✅ Backend connected:', data))
    .catch(err => console.error('❌ Backend error:', err));
```

---

## 🚀 배포 시나리오

### 시나리오 1: AWS 배포 (도메인 있음)

**프론트엔드**: `community.myapp.com`  
**백엔드**: `api.myapp.com`

```javascript
// config.js - 수정 불필요! 자동으로 작동
// community.myapp.com → https://api.myapp.com
```

**CloudFront 또는 Route 53 설정:**
1. 프론트엔드: `community.myapp.com` → S3 또는 CloudFront
2. 백엔드: `api.myapp.com` → ALB

---

### 시나리오 2: AWS 배포 (도메인 없음, ALB만 사용)

**프론트엔드**: S3 + CloudFront  
**백엔드**: ALB URL

```javascript
// config.js 수정
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000';
    }
    
    // CloudFront 도메인이든 뭐든 항상 ALB URL 사용
    return 'https://your-alb-url.elb.amazonaws.com';
};
```

---

### 시나리오 3: Kubernetes 배포 (Service/Ingress)

**프론트엔드**: `frontend-service`  
**백엔드**: `backend-service`

```javascript
// config.js 수정
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000';
    }
    
    // Ingress 도메인
    return 'https://api.yourdomain.com';  // ← Ingress에서 설정한 도메인
};
```

---

## 🛠️ 고급 설정

### 환경별 세분화

```javascript
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // 로컬 개발
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000';
    }
    
    // 개발 환경
    if (hostname.includes('dev') || hostname.includes('development')) {
        return 'https://dev-api.myapp.com';
    }
    
    // QA 환경
    if (hostname.includes('qa') || hostname.includes('test')) {
        return 'https://qa-api.myapp.com';
    }
    
    // 스테이징 환경
    if (hostname.includes('staging') || hostname.includes('stg')) {
        return 'https://staging-api.myapp.com';
    }
    
    // 프로덕션 (기본값)
    return 'https://api.myapp.com';
};
```

---

### WebSocket URL도 자동 설정

```javascript
export const CONFIG = {
    BASE_URL: getBaseUrl(),
    WS_URL: getBaseUrl().replace('http://', 'ws://').replace('https://', 'wss://')
};

// 사용 예시
const ws = new WebSocket(CONFIG.WS_URL + '/ws/1');
```

---

## ✅ 체크리스트

### 로컬 개발 환경
- [x] `localhost:3000`에서 프론트엔드 접속
- [x] 백엔드 `http://127.0.0.1:8000` 실행 중
- [x] 브라우저 콘솔에서 API URL 확인
- [x] 로그인 테스트

### 프로덕션 배포
- [ ] 실제 도메인 확인 (예: `myapp.com`)
- [ ] 백엔드 URL 확인 (예: `api.myapp.com`)
- [ ] `config.js`에서 프로덕션 URL 규칙 수정
- [ ] CORS 설정 확인 (백엔드에서 프론트엔드 도메인 허용)
- [ ] HTTPS 인증서 설정 (Let's Encrypt, AWS Certificate Manager)
- [ ] 배포 후 브라우저에서 API URL 확인

---

## 🐛 트러블슈팅

### 문제 1: 여전히 localhost:8000으로 연결됨
**원인**: 브라우저 캐시  
**해결**: 
```bash
Ctrl + Shift + R (하드 리프레시)
또는
F12 → Network 탭 → Disable cache 체크
```

---

### 문제 2: CORS 에러 발생
**원인**: 백엔드에서 프론트엔드 도메인을 허용하지 않음  
**해결**:
```python
# 백엔드 main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://myapp.com",          # ← 프론트엔드 도메인 추가
        "https://www.myapp.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 문제 3: API URL이 이상하게 생성됨
**해결**: 브라우저 콘솔에서 확인
```javascript
console.log('Current hostname:', window.location.hostname);
console.log('Generated API URL:', CONFIG.BASE_URL);
```

규칙이 맞지 않으면 `config.js`의 조건문 수정

---

## 📞 문의

더 복잡한 환경 설정이 필요하면:
1. `config.js` 파일 수정
2. 브라우저 콘솔에서 `CONFIG.BASE_URL` 확인
3. 필요시 고정 URL 사용

**이제 배포할 때마다 코드 수정 없이 자동으로 작동합니다! 🎉**
