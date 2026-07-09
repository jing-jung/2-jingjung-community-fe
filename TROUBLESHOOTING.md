# 🔧 Troubleshooting Guide

## 개요

본 문서는 Kubernetes 환경에서 프론트엔드/백엔드 애플리케이션 배포 시 발생할 수 있는 일반적인 문제와 해결 방법을 제공한다. 실제 프로덕션 환경에서 경험한 이슈를 바탕으로 작성되었으며, 다른 개발자들이 유사한 문제를 신속하게 해결할 수 있도록 구조화했다.

---

## 목차

1. [네트워크 및 라우팅 문제](#1-네트워크-및-라우팅-문제)
2. [CORS 및 보안 정책 문제](#2-cors-및-보안-정책-문제)
3. [Kubernetes 배포 문제](#3-kubernetes-배포-문제)
4. [Docker 이미지 관련 문제](#4-docker-이미지-관련-문제)
5. [서비스 연결 문제](#5-서비스-연결-문제)
6. [디버깅 명령어 모음](#6-디버깅-명령어-모음)

---

## 1. 네트워크 및 라우팅 문제

### 1.1 Ingress 경로에서 404 Not Found 에러

#### 증상
```
브라우저 콘솔 에러:
POST http://your-alb-url/api/users/login 404 (Not Found)
```

#### 진단 단계

**1단계: Ingress 규칙 확인**
```bash
kubectl get ingress app-ingress -o yaml
```

확인 사항:
- `spec.rules[].http.paths[]`에 해당 경로가 정의되어 있는가?
- `pathType`이 `Prefix` 또는 `Exact`로 올바르게 설정되어 있는가?

**2단계: 백엔드 Service 확인**
```bash
kubectl get svc backend-service
kubectl describe svc backend-service
```

확인 사항:
- Service의 `selector`가 백엔드 Pod의 label과 일치하는가?
- `targetPort`가 컨테이너의 실제 포트와 일치하는가?

**3단계: 백엔드 Pod 로그 확인**
```bash
kubectl logs -l app=backend --tail=50
```

확인 사항:
- 요청이 백엔드에 도달했는가?
- 어떤 경로로 요청이 들어왔는가? (예: `/api/users/login` vs `/users/login`)

**4단계: 직접 curl 테스트**
```bash
# Pod 내부에서 직접 테스트
kubectl exec -it <backend-pod-name> -- sh
curl http://localhost:8000/users/login -X POST -H "Content-Type: application/json" -d '{"username":"test"}'

# Service를 통한 테스트
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://backend-service:80/users/login -X POST
```

#### 원인별 해결 방법

**원인 1: Path Prefix 불일치**

**문제**: Ingress가 `/api/users/login`으로 전달하지만 백엔드는 `/users/login`만 처리

**해결 방법 A: 백엔드에서 prefix 처리 (권장)**
```python
# FastAPI - main.py
app = FastAPI(root_path="/api")

# 또는
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

@api_router.post("/users/login")  # 실제 경로: /api/users/login
async def login():
    pass

app.include_router(api_router)
```

**해결 방법 B: Ingress 경로 재설계**
```yaml
spec:
  rules:
    - http:
        paths:
          # /api prefix 제거
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 80
```

**해결 방법 C: Nginx Ingress 사용 (path rewrite 지원)**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
    - http:
        paths:
          - path: /api(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: backend-service
```

**원인 2: Service Selector 불일치**

**진단**
```bash
# Deployment의 label 확인
kubectl get deployment backend-deployment -o yaml | grep -A 3 labels

# Service의 selector 확인
kubectl get svc backend-service -o yaml | grep -A 3 selector
```

**해결**
```yaml
# Deployment
metadata:
  labels:
    app: backend  # ← 이 값과

# Service
spec:
  selector:
    app: backend  # ← 이 값이 일치해야 함
```

---

### 1.2 502 Bad Gateway 에러

#### 증상
```
HTTP/1.1 502 Bad Gateway
```

#### 진단 및 해결

**원인 1: 백엔드 Pod가 실행되지 않음**
```bash
kubectl get pods -l app=backend

# 상태가 Running이 아니면
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**원인 2: 헬스체크 실패**
```yaml
# Deployment에 readinessProbe 추가
spec:
  containers:
    - name: backend
      readinessProbe:
        httpGet:
          path: /health
          port: 8000
        initialDelaySeconds: 10
        periodSeconds: 5
```

**원인 3: Service 포트 불일치**
```yaml
# 확인 필요
spec:
  ports:
    - port: 80           # Service 포트
      targetPort: 8000   # Container 포트 (백엔드가 실제 listen하는 포트)
```

---

### 1.3 504 Gateway Timeout

#### 증상
요청이 오래 걸리다가 타임아웃 발생

#### 해결

**ALB Ingress 타임아웃 증가**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=300
```

**백엔드 성능 최적화**
```python
# 데이터베이스 쿼리 최적화
# 캐싱 추가 (Redis)
# 비동기 처리 (Celery, AsyncIO)
```

---

## 2. CORS 및 보안 정책 문제

### 2.1 CORS Policy 위반

#### 증상
```
브라우저 콘솔 에러:
Access to fetch at 'http://backend-url/api/users/login' from origin 'http://frontend-url' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

#### 원인
- 프론트엔드와 백엔드가 다른 도메인(Origin)을 사용
- 백엔드가 CORS 헤더를 응답에 포함하지 않음

#### 진단

**1단계: Preflight 요청 확인**
```bash
curl -X OPTIONS http://backend-url/api/users/login \
  -H "Origin: http://frontend-url" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

예상 응답:
```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: http://frontend-url
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
< Access-Control-Allow-Headers: Content-Type, Authorization
```

**2단계: 실제 요청 응답 헤더 확인**
```bash
curl -X POST http://backend-url/api/users/login \
  -H "Origin: http://frontend-url" \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}' \
  -v | grep -i "access-control"
```

#### 해결 방법

**FastAPI (Python)**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 개발 환경
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용 (개발용)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 프로덕션 환경 (권장)
ALLOWED_ORIGINS = [
    "http://k8s-communityapp-8f25ecd116-278697788.ap-southeast-2.elb.amazonaws.com",
    "https://yourdomain.com",
    "http://localhost:3000",  # 로컬 개발
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Total-Count", "X-Page-Count"],
    max_age=3600,  # Preflight 캐시 시간 (초)
)
```

**Express.js (Node.js)**
```javascript
const cors = require('cors');

const corsOptions = {
  origin: [
    'http://frontend-url',
    'https://yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**Spring Boot (Java)**
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://frontend-url", "https://yourdomain.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

#### 근본 해결: 같은 도메인 사용

**Ingress 통합**
```yaml
spec:
  rules:
    - host: yourdomain.com
      http:
        paths:
          - path: /
            backend:
              service:
                name: frontend-service
          - path: /api
            backend:
              service:
                name: backend-service
```

이렇게 하면 프론트엔드와 백엔드가 같은 도메인을 사용하므로 **CORS 문제가 발생하지 않음** ✅

---

### 2.2 Credentials (Cookie) 전송 안 됨

#### 증상
- 로그인 후 쿠키가 저장되지 않음
- API 요청 시 인증 실패

#### 원인
- `credentials: 'include'` 설정 누락
- 백엔드 CORS 설정에서 `allow_credentials=True` 누락

#### 해결

**프론트엔드 (JavaScript)**
```javascript
// Fetch API
fetch('http://backend-url/api/users/login', {
    method: 'POST',
    credentials: 'include',  // ← 필수
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({username, password})
});

// Axios
axios.post('http://backend-url/api/users/login', data, {
    withCredentials: true  // ← 필수
});
```

**백엔드 (FastAPI)**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://frontend-url"],
    allow_credentials=True,  # ← 필수
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**중요**: `allow_credentials=True`일 때 `allow_origins=["*"]`는 사용 불가!

---

## 3. Kubernetes 배포 문제

### 3.1 Pod가 CrashLoopBackOff 상태

#### 증상
```bash
kubectl get pods
NAME                        READY   STATUS             RESTARTS   AGE
backend-pod-xxx            0/1     CrashLoopBackOff   5          3m
```

#### 진단

**로그 확인**
```bash
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # 이전 실행 로그
```

**이벤트 확인**
```bash
kubectl describe pod <pod-name>
# 하단의 Events 섹션 확인
```

#### 원인별 해결

**원인 1: 환경 변수 누락**
```yaml
spec:
  containers:
    - name: backend
      env:
        - name: DATABASE_URL
          value: "mysql://user:pass@mysql-service:3306/db"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

**원인 2: 데이터베이스 연결 실패**
```python
# 백엔드 코드에 재시도 로직 추가
from tenacity import retry, stop_after_attempt, wait_fixed

@retry(stop=stop_after_attempt(5), wait=wait_fixed(2))
def connect_database():
    # 데이터베이스 연결 시도
    pass
```

**원인 3: 포트 충돌**
```yaml
# Container가 실제로 listen하는 포트 확인
spec:
  containers:
    - name: backend
      ports:
        - containerPort: 8000  # 백엔드 코드와 일치해야 함
```

---

### 3.2 ImagePullBackOff 에러

#### 증상
```bash
kubectl get pods
NAME                        READY   STATUS              RESTARTS   AGE
frontend-pod-xxx           0/1     ImagePullBackOff    0          1m
```

#### 진단
```bash
kubectl describe pod <pod-name>
# Events 섹션에서 에러 메시지 확인
```

#### 원인별 해결

**원인 1: ECR 인증 실패**
```bash
# ECR 로그인 토큰 갱신 (12시간마다 만료)
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin 389998437416.dkr.ecr.ap-southeast-2.amazonaws.com
```

**원인 2: 이미지 태그 오류**
```yaml
# Deployment
spec:
  containers:
    - name: frontend
      image: 389998437416.dkr.ecr.ap-southeast-2.amazonaws.com/community-fe:latest
      # 이미지가 실제로 존재하는지 확인
```

확인:
```bash
aws ecr list-images --repository-name community-fe --region ap-southeast-2
```

**원인 3: IAM 권한 부족**

EKS 노드의 IAM Role에 ECR 권한 추가:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

---

### 3.3 배포 후 변경사항이 반영되지 않음

#### 원인
Kubernetes가 `imagePullPolicy: IfNotPresent`로 설정되어 있고 `latest` 태그를 사용하는 경우

#### 해결 방법

**방법 1: 배포 재시작**
```bash
kubectl rollout restart deployment/frontend-deployment
```

**방법 2: 이미지 태그 명시**
```yaml
spec:
  containers:
    - name: frontend
      image: 389998437416.dkr.ecr.ap-southeast-2.amazonaws.com/community-fe:v2.3
      imagePullPolicy: Always
```

**방법 3: Git SHA를 태그로 사용 (권장)**
```bash
GIT_SHA=$(git rev-parse --short HEAD)
docker build -t community-fe:$GIT_SHA .
docker tag community-fe:$GIT_SHA $ECR_URL/community-fe:$GIT_SHA
docker push $ECR_URL/community-fe:$GIT_SHA
kubectl set image deployment/frontend-deployment frontend-container=$ECR_URL/community-fe:$GIT_SHA
```

---

## 4. Docker 이미지 관련 문제

### 4.1 빌드된 이미지에 변경사항이 없음

#### 원인
Docker 레이어 캐싱

#### 해결
```bash
# 캐시 없이 빌드
docker build --no-cache -t community-fe:v2.3 .

# 또는 특정 단계부터 재빌드
docker build --build-arg CACHEBUST=$(date +%s) -t community-fe:v2.3 .
```

---

### 4.2 ECR 푸시 속도가 느림

#### 최적화 방법

**멀티스테이지 빌드**
```dockerfile
# 개선 전
FROM nginx:alpine
COPY ./app /usr/share/nginx/html
# 크기: 200MB

# 개선 후
FROM node:16 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# 크기: 50MB (75% 감소)
```

**레이어 최적화**
```dockerfile
# 자주 변경되지 않는 것을 먼저
COPY package*.json ./
RUN npm install

# 자주 변경되는 것을 나중에
COPY . .
```

---

## 5. 서비스 연결 문제

### 5.1 프론트엔드에서 백엔드 연결 안 됨

#### 진단 체크리스트

**1. 네트워크 연결 확인**
```bash
# 프론트엔드 Pod에서 백엔드로 ping
kubectl exec -it <frontend-pod> -- sh
wget -O- http://backend-service:80/health

# 또는 curl Pod 생성
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://backend-service:80/health
```

**2. DNS 해석 확인**
```bash
kubectl exec -it <frontend-pod> -- nslookup backend-service
```

**3. Service Endpoints 확인**
```bash
kubectl get endpoints backend-service
# ENDPOINTS 컬럼에 IP가 있어야 함
```

**4. 브라우저 콘솔 확인**
```javascript
// F12 → Console
console.log('API URL:', CONFIG.BASE_URL);
// Network 탭에서 실제 요청 URL 확인
```

#### 흔한 실수

**실수 1: localhost 사용**
```javascript
// ❌ 잘못된 예
const BASE_URL = 'http://localhost:8000';

// ✅ 올바른 예
const BASE_URL = 'http://backend-service:80';  // Pod 간 통신
// 또는
const BASE_URL = 'http://your-alb-url/api';  // 외부에서 접근
```

**실수 2: Service 이름 오타**
```yaml
# Service 이름: backend-service
# 하지만 코드에서: backend-svc (오타)
```

---

### 5.2 데이터베이스 연결 실패

#### 증상
```
pymysql.err.OperationalError: (2003, "Can't connect to MySQL server on 'mysql-service'")
```

#### 진단

**1. MySQL Pod 상태 확인**
```bash
kubectl get pods -l app=mysql
kubectl logs <mysql-pod-name>
```

**2. Service 확인**
```bash
kubectl get svc mysql-service
kubectl describe svc mysql-service
```

**3. 연결 테스트**
```bash
kubectl run mysql-client --image=mysql:8.0 --rm -it --restart=Never -- \
  mysql -h mysql-service -u root -p
```

#### 해결

**ConfigMap으로 연결 정보 관리**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
data:
  DATABASE_HOST: "mysql-service"
  DATABASE_PORT: "3306"
  DATABASE_NAME: "community_db"
```

```yaml
# Deployment에서 사용
env:
  - name: DATABASE_HOST
    valueFrom:
      configMapKeyRef:
        name: backend-config
        key: DATABASE_HOST
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: mysql-secret
        key: root-password
```

---

## 6. 디버깅 명령어 모음

### 6.1 리소스 상태 확인

```bash
# 모든 리소스 한눈에 보기
kubectl get all

# 특정 네임스페이스
kubectl get all -n production

# Pod 상세 정보
kubectl describe pod <pod-name>

# Pod 리소스 사용량
kubectl top pods

# Node 리소스 사용량
kubectl top nodes
```

### 6.2 로그 확인

```bash
# 실시간 로그
kubectl logs -f <pod-name>

# 특정 컨테이너 로그 (다중 컨테이너 Pod)
kubectl logs <pod-name> -c <container-name>

# 이전 실행 로그 (재시작된 경우)
kubectl logs <pod-name> --previous

# 여러 Pod 로그 동시 확인
kubectl logs -l app=backend --tail=100

# 타임스탬프 포함
kubectl logs <pod-name> --timestamps
```

### 6.3 네트워크 디버깅

```bash
# Pod 내부 접속
kubectl exec -it <pod-name> -- /bin/sh

# 특정 명령 실행
kubectl exec <pod-name> -- curl http://backend-service:80/health

# 네트워크 정책 확인
kubectl get networkpolicy

# Service DNS 확인
kubectl exec <pod-name> -- nslookup kubernetes.default

# Port Forward로 로컬 테스트
kubectl port-forward svc/backend-service 8000:80
# 브라우저: http://localhost:8000
```

### 6.4 배포 관리

```bash
# 배포 상태 확인
kubectl rollout status deployment/frontend-deployment

# 배포 히스토리
kubectl rollout history deployment/frontend-deployment

# 특정 리비전으로 롤백
kubectl rollout undo deployment/frontend-deployment --to-revision=2

# 배포 일시 중지
kubectl rollout pause deployment/frontend-deployment

# 배포 재개
kubectl rollout resume deployment/frontend-deployment

# 스케일링
kubectl scale deployment/frontend-deployment --replicas=5
```

### 6.5 이벤트 및 문제 진단

```bash
# 최근 이벤트 확인
kubectl get events --sort-by=.metadata.creationTimestamp

# 특정 리소스 이벤트
kubectl describe pod <pod-name> | grep -A 10 Events

# 실패한 Pod만 보기
kubectl get pods --field-selector=status.phase=Failed

# Pending 상태 Pod 확인
kubectl get pods --field-selector=status.phase=Pending

# 리소스 쿼터 확인
kubectl describe resourcequota
```

### 6.6 성능 분석

```bash
# API 서버 응답 시간
kubectl get --raw /api/v1/namespaces/default/pods -v=8

# etcd 성능 확인
kubectl get --raw /metrics | grep etcd

# Container 프로세스 확인
kubectl exec <pod-name> -- ps aux

# 파일시스템 사용량
kubectl exec <pod-name> -- df -h
```

---

## 7. 빠른 참고 체크리스트

### 배포 실패 시
- [ ] `kubectl get pods` - Pod 상태 확인
- [ ] `kubectl logs <pod-name>` - 로그 확인
- [ ] `kubectl describe pod <pod-name>` - 이벤트 확인
- [ ] `kubectl get events` - 클러스터 이벤트 확인

### API 호출 실패 시
- [ ] 브라우저 Network 탭 확인
- [ ] CORS 에러 여부 확인
- [ ] `kubectl logs -l app=backend` - 백엔드 로그
- [ ] `curl` 명령으로 직접 테스트

### 성능 문제 시
- [ ] `kubectl top pods` - 리소스 사용량
- [ ] `kubectl describe pod` - 리소스 제한 확인
- [ ] HPA 설정 확인
- [ ] 데이터베이스 쿼리 최적화

### 보안 문제 시
- [ ] CORS 설정 확인
- [ ] Secret 사용 확인 (비밀번호 평문 X)
- [ ] RBAC 권한 확인
- [ ] Network Policy 확인

---

## 추가 리소스

**공식 문서**
- [Kubernetes Troubleshooting](https://kubernetes.io/docs/tasks/debug/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)

**유용한 도구**
- `kubectl debug` - 임시 디버그 컨테이너 실행
- `stern` - 다중 Pod 로그 스트리밍
- `k9s` - Kubernetes CLI UI
- `kubectx` / `kubens` - Context/Namespace 빠른 전환

---

**작성일**: 2026-07-08  
**업데이트**: 지속적으로 업데이트 예정  
**기여**: Pull Request 환영
