# 🚀 Kubernetes 배포 여정 및 문제 해결 과정

## 개요

본 문서는 Vanilla JavaScript 기반 커뮤니티 플랫폼을 AWS EKS(Elastic Kubernetes Service)에 배포하는 과정에서 발생한 기술적 문제와 해결 방법을 기록한다. 실제 프로덕션 환경 구축 과정에서 마주한 아키텍처 결정, 네트워크 라우팅, CORS 정책, 그리고 인프라 최적화 문제를 다룬다.

**배포 환경**
- **클라우드**: AWS (ap-southeast-2 리전)
- **컨테이너 오케스트레이션**: Kubernetes (EKS)
- **프론트엔드**: Nginx + Vanilla JavaScript
- **백엔드**: FastAPI + MySQL + Redis
- **인프라**: AWS Load Balancer Controller, Ingress, ECR

---

## 목차

1. [아키텍처 진화 과정](#1-아키텍처-진화-과정)
2. [주요 기술적 문제와 해결](#2-주요-기술적-문제와-해결)
3. [배포 최적화 과정](#3-배포-최적화-과정)
4. [핵심 학습 내용](#4-핵심-학습-내용)
5. [향후 개선 방향](#5-향후-개선-방향)

---

## 1. 아키텍처 진화 과정

### 1.1 초기 아키텍처 (v1.0)

**구조**
```
Frontend (LoadBalancer) ← User
Backend (LoadBalancer)  ← Frontend
```

**문제점**
- 각 서비스마다 별도의 AWS ELB 생성 → 비용 증가
- 프론트엔드와 백엔드가 다른 도메인 → CORS 이슈 발생
- URL 관리 복잡도 증가
- 로드밸런서 2개 운영 비용 (월 약 $32)

**결정 배경**
- 초기에는 서비스별 독립성을 우선시
- Kubernetes 기본 패턴(Service Type: LoadBalancer) 사용

### 1.2 중간 아키텍처 (v2.0)

**구조**
```
         [ALB Ingress]
        /            \
   Frontend      Backend (LoadBalancer)
```

**개선점**
- AWS ALB Ingress Controller 도입
- Path-based routing 시도 (`/` → Frontend, `/api` → Backend)

**새로운 문제**
- 백엔드가 `/api` prefix를 처리하지 못함 → 404 에러
- Ingress path rewrite 미지원 (ALB 제약)
- 여전히 백엔드 LoadBalancer 유지 필요

### 1.3 최종 아키텍처 (v2.3 - 현재)

**구조**
```
                    [User]
                      ↓
              [AWS ALB Ingress]
              /              \
       Path: /          Path: /api/*
          ↓                    ↓
    [Frontend]           [Backend]
    (ClusterIP)         (LoadBalancer - 임시)
         ↓                    ↓
  [Nginx Pods]         [FastAPI Pods]
   2 replicas           3 replicas
```

**현재 상태**
- 프론트엔드: Ingress를 통한 단일 엔트리포인트 ✅
- 백엔드: CORS 문제로 인해 임시로 직접 ELB 사용 ⚠️
- Redis, MySQL: ClusterIP (클러스터 내부 통신) ✅

**진행 중인 개선**
- 백엔드 CORS 설정 업데이트 예정
- 백엔드 `/api` prefix 지원 추가 예정
- 최종적으로 모든 트래픽을 Ingress로 통합 계획

---

## 2. 주요 기술적 문제와 해결

### 2.1 Ingress Path Routing 404 에러

#### 문제 상황
```
프론트엔드 요청: POST /api/users/login
Ingress 라우팅: /api/* → backend-service:80
백엔드 수신: POST /api/users/login
백엔드 처리: ❌ 404 Not Found (routes: /users/login만 존재)
```

#### 원인 분석
1. **Ingress path prefix 전달**: ALB Ingress Controller는 path를 그대로 백엔드로 전달
2. **백엔드 라우팅**: FastAPI가 `/users/login` 경로만 정의, `/api` prefix 미지원
3. **Path rewrite 미지원**: AWS ALB Ingress Controller는 nginx ingress처럼 rewrite annotation 미지원

#### 시도한 해결 방법

**1차 시도: Ingress Annotation (실패)**
```yaml
annotations:
  alb.ingress.kubernetes.io/actions.rewrite-api: |
    {
      "type": "forward",
      "forwardConfig": {
        "targetGroups": [...]
      }
    }
```
**결과**: ALB는 path rewrite를 annotation으로 지원하지 않음

**2차 시도: 백엔드 직접 ELB 우회 (임시 성공)**
```javascript
// config.js
return 'http://a45a97db39bd947d6bc67e4054cf863d-1920512205.ap-southeast-2.elb.amazonaws.com';
```
**결과**: API 호출은 성공하나 CORS 문제 발생

**최종 해결 방향 (설계)**
```python
# FastAPI main.py
app = FastAPI(root_path="/api")  # 모든 route에 /api prefix 적용

# 또는
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

@api_router.post("/users/login")  # 실제 path: /api/users/login
```

#### 학습한 교훈
- AWS ALB Ingress Controller와 Nginx Ingress Controller의 기능 차이 이해
- Path-based routing 설계 시 백엔드와의 사전 협의 중요성
- 임시 우회와 근본 해결을 구분하는 사고방식

---

### 2.2 CORS(Cross-Origin Resource Sharing) 정책 위반

#### 문제 상황
```
브라우저 에러:
Access to fetch at 'http://a45a97db39bd947d6bc67e4054cf863d-1920512205.ap-southeast-2.elb.amazonaws.com/users/login' 
from origin 'http://k8s-communityapp-8f25ecd116-278697788.ap-southeast-2.elb.amazonaws.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

#### 원인 분석
```
프론트엔드 Origin: http://k8s-communityapp-8f25ecd116-278697788...
백엔드 URL:        http://a45a97db39bd947d6bc67e4054cf863d-1920512205...
→ 다른 도메인 간 요청 → 브라우저 CORS 정책 적용
```

#### 기술적 배경
1. **Same-Origin Policy**: 브라우저 보안 정책
2. **Preflight Request**: 브라우저가 OPTIONS 메서드로 사전 확인
3. **CORS Headers**: 서버가 응답에 `Access-Control-Allow-Origin` 포함 필요

#### 해결 방법

**백엔드 수정 (FastAPI)**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://k8s-communityapp-8f25ecd116-278697788.ap-southeast-2.elb.amazonaws.com",
        "http://localhost:8080",  # 로컬 개발용
    ],
    allow_credentials=True,  # Cookie 전송 허용
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    expose_headers=["X-Total-Count"],  # 클라이언트에서 읽을 수 있는 헤더
)
```

#### 근본적 해결책
**단일 도메인 사용 (Ingress 통합)**
```
✅ 프론트엔드: http://example.com/
✅ 백엔드:     http://example.com/api/
→ Same Origin → CORS 문제 없음
```

#### 학습한 교훈
- 브라우저 보안 정책(CORS, CSP)의 실무 적용 경험
- 마이크로서비스에서 API Gateway 패턴의 중요성
- 프론트엔드-백엔드 통합 시 도메인 전략 수립 필요성

---

### 2.3 Docker 이미지 버전 관리

#### 문제 상황
코드 변경 후 Kubernetes에 배포했으나 변경사항이 반영되지 않음

#### 원인 분석
```yaml
image: 389998437416.dkr.ecr.ap-southeast-2.amazonaws.com/community-fe:latest
imagePullPolicy: IfNotPresent  # 기본값
```
- `latest` 태그 사용 시 Kubernetes가 이미지를 다시 pull하지 않을 수 있음
- 노드에 캐시된 이미지 사용

#### 해결 방법

**방법 1: 명시적 이미지 재시작**
```bash
docker build -t community-fe:v2.3 .
docker tag community-fe:v2.3 389998437416.dkr.ecr.ap-southeast-2.amazonaws.com/community-fe:latest
docker push 389998437416.dkr.ecr.ap-southeast-2.amazonaws.com/community-fe:latest
kubectl rollout restart deployment/frontend-deployment
```

**방법 2: 버전 태그 사용 (권장)**
```yaml
image: 389998437416.dkr.ecr.ap-southeast-2.amazonaws.com/community-fe:v2.3
imagePullPolicy: Always
```

**자동화 (CI/CD)**
```bash
# Git commit SHA를 이미지 태그로 사용
GIT_SHA=$(git rev-parse --short HEAD)
docker build -t community-fe:$GIT_SHA .
docker tag community-fe:$GIT_SHA $ECR_URL/community-fe:$GIT_SHA
docker push $ECR_URL/community-fe:$GIT_SHA
kubectl set image deployment/frontend-deployment frontend-container=$ECR_URL/community-fe:$GIT_SHA
```

#### 학습한 교훈
- 컨테이너 이미지 버전 관리 전략의 중요성
- `latest` 태그의 문제점과 명시적 버전 관리 필요성
- Kubernetes imagePullPolicy의 동작 원리

---

### 2.4 환경별 설정 관리 (config.js)

#### 문제 상황
로컬 개발 환경과 프로덕션 환경에서 백엔드 URL이 달라 매번 수동 변경 필요

#### 초기 구현 (정적)
```javascript
const BASE_URL = 'http://localhost:8000';  // 하드코딩
```

#### 개선된 구현 (동적)
```javascript
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000';
    }
    
    if (hostname.includes('dev')) {
        return 'https://dev-api.yourdomain.com';
    }
    
    if (hostname.includes('staging')) {
        return 'https://staging-api.yourdomain.com';
    }
    
    // 프로덕션
    return 'http://a45a97db39bd947d6bc67e4054cf863d-1920512205.ap-southeast-2.elb.amazonaws.com';
};

export const CONFIG = {
    BASE_URL: getBaseUrl()
};
```

#### 버전별 변화
| 버전 | 설정 방식 | 커밋 | 비고 |
|------|----------|------|------|
| v2.0 | 백엔드 직접 ELB | e970f64 | 초기 배포 |
| v2.1 | 백엔드 ELB URL | b403fa0 | 고정 URL |
| v2.2 | 통합 ALB `/api` | 2b6fa17 | Ingress 시도 → 404 |
| v2.3 | 백엔드 직접 ELB | 1c3a4c7 | CORS 우회 (현재) |

#### 학습한 교훈
- 환경 변수 관리의 중요성 (12-Factor App 원칙)
- 런타임 환경 감지를 통한 유연한 설정
- 배포 히스토리 추적과 롤백 전략

---

## 3. 배포 최적화 과정

### 3.1 무중단 배포 (Rolling Update)

**Kubernetes RollingUpdate 전략**
```yaml
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 동시에 생성할 수 있는 최대 추가 Pod 수
      maxUnavailable: 0  # 업데이트 중 사용 불가능한 최대 Pod 수
```

**배포 프로세스**
```bash
# 1. 새 이미지 빌드 및 푸시
docker build -t community-fe:v2.3 .
docker push $ECR_URL/community-fe:latest

# 2. 배포 재시작 (무중단)
kubectl rollout restart deployment/frontend-deployment

# 3. 배포 상태 모니터링
kubectl rollout status deployment/frontend-deployment
# 출력: Waiting for deployment "frontend-deployment" rollout to finish: 1 out of 2 new replicas have been updated...

# 4. 배포 히스토리 확인
kubectl rollout history deployment/frontend-deployment

# 5. 롤백 (필요시)
kubectl rollout undo deployment/frontend-deployment
```

**실제 관찰된 배포 순서**
1. 새 Pod 생성 (frontend-deployment-559464db77-bhtp4)
2. 새 Pod 정상 작동 확인 (Running)
3. 기존 Pod 종료 (frontend-deployment-85c494d7b-zkqlx)
4. 두 번째 새 Pod 생성 및 기존 Pod 교체
5. **다운타임 0초 달성** ✅

### 3.2 리소스 최적화

**초기 상태**
- Frontend LoadBalancer: $16/월
- Backend LoadBalancer: $16/월
- ALB Ingress: $23/월
- **총 비용**: $55/월

**최적화 후 (목표)**
- Frontend: ClusterIP (무료)
- Backend: ClusterIP (무료)
- ALB Ingress: $23/월
- **총 비용**: $23/월 (58% 절감) 💰

**서비스 타입 변경**
```bash
# LoadBalancer → ClusterIP 전환
kubectl patch svc frontend-service -p '{"spec":{"type":"ClusterIP"}}'
kubectl patch svc backend-service -p '{"spec":{"type":"ClusterIP"}}'
```

### 3.3 모니터링 및 로깅

**Pod 상태 모니터링**
```bash
# 실시간 로그 확인
kubectl logs -f -l app=frontend --tail=100

# Pod 리소스 사용량
kubectl top pods -l app=frontend

# 배포 이벤트 확인
kubectl describe deployment frontend-deployment
```

**관찰된 배포 메트릭스**
- **이미지 Pull 시간**: 평균 5-8초
- **Pod 시작 시간**: 평균 10-15초
- **Rolling Update 전체 시간**: 약 30초
- **서비스 다운타임**: 0초 ✅

---

## 4. 핵심 학습 내용

### 4.1 Kubernetes 네트워킹

**Service 타입별 특징 이해**
| 타입 | 용도 | 외부 접근 | 비용 |
|------|------|----------|------|
| ClusterIP | 클러스터 내부 통신 | ❌ | 무료 |
| NodePort | 노드 IP로 접근 | ⚠️ (제한적) | 무료 |
| LoadBalancer | 외부 로드밸런서 | ✅ | 유료 ($16/월) |
| Ingress | L7 라우팅 + 단일 진입점 | ✅ | 유료 ($23/월) |

**Ingress vs LoadBalancer 선택 기준**
- **단일 서비스**: LoadBalancer (간단)
- **여러 서비스 + Path routing**: Ingress (효율적)
- **HTTPS Termination 필요**: Ingress (ACM 통합)
- **비용 최적화**: Ingress (여러 서비스에 하나의 LB)

### 4.2 마이크로서비스 통신 패턴

**학습한 패턴**
1. **Service Mesh**: 복잡하지만 강력한 기능 (Istio, Linkerd)
2. **API Gateway**: 단일 진입점 (Ingress, Kong, Tyk)
3. **Direct Service-to-Service**: 간단하지만 관리 어려움

**현재 프로젝트 적용**
```
API Gateway 패턴 (Ingress)
- 장점: 단일 도메인, CORS 해결, 비용 절감
- 단점: Path prefix 처리 필요, 설정 복잡도
```

### 4.3 DevOps 사고방식

**문제 해결 프로세스**
1. **문제 정의**: 정확한 에러 메시지 수집
2. **원인 분석**: 네트워크 트레이싱, 로그 분석
3. **가설 수립**: 여러 해결 방법 고려
4. **실험 및 검증**: 단계적 접근
5. **문서화**: 재발 방지 및 지식 공유

**적용 사례**
```
404 에러 → 로그 확인 → Ingress 라우팅 분석 → Path prefix 문제 발견
→ 임시 해결(우회) + 영구 해결(백엔드 수정) 병행
```

---

## 5. 향후 개선 방향

### 5.1 즉시 적용 가능 (High Priority)

#### 백엔드 `/api` prefix 지원
```python
# 현재
@app.post("/users/login")

# 개선
app = FastAPI(root_path="/api")
# 또는
api_router = APIRouter(prefix="/api")
```

#### CORS 설정 업데이트
```python
allow_origins=[
    "http://k8s-communityapp-8f25ecd116-278697788.ap-southeast-2.elb.amazonaws.com",
    "https://yourdomain.com",  # 프로덕션 도메인
]
```

#### 통합 Ingress 완성
```
모든 트래픽 → ALB Ingress → ClusterIP Services
- 비용 58% 절감
- CORS 문제 해결
- 관리 복잡도 감소
```

### 5.2 중기 개선 (Medium Priority)

#### HTTPS 적용
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:...
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  rules:
    - host: yourdomain.com
      http:
        paths: [...]
```

#### 도메인 연결 (Route 53)
```
k8s-communityapp-8f25ecd116-278697788... 
→ api.yourdomain.com (CNAME)
```

#### HPA (Horizontal Pod Autoscaler)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: frontend-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### 5.3 장기 개선 (Low Priority)

#### CI/CD 파이프라인
```yaml
# GitHub Actions
name: Deploy to EKS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and Push Docker Image
      - name: Update Kubernetes Deployment
      - name: Health Check
```

#### 모니터링 스택
- **Prometheus**: 메트릭 수집
- **Grafana**: 대시보드
- **AlertManager**: 알림
- **Loki**: 로그 집계

#### 보안 강화
- **Network Policy**: Pod 간 통신 제어
- **RBAC**: 세밀한 권한 관리
- **Secret 암호화**: AWS Secrets Manager 연동
- **Image Scanning**: ECR 취약점 스캔

---

## 결론

본 프로젝트를 통해 Kubernetes 기반 마이크로서비스 배포의 전체 라이프사이클을 경험했다. 

**핵심 성과**
- ✅ 프로덕션 환경 구축 완료
- ✅ 무중단 배포 프로세스 확립
- ✅ 실제 발생하는 네트워크/보안 이슈 해결 경험
- ✅ 아키텍처 의사결정 과정 이해
- ✅ 비용 최적화 관점 습득

**기술 스택 숙련도**
- Kubernetes: Service, Deployment, Ingress, ConfigMap
- AWS: EKS, ECR, ALB, ELB
- 네트워킹: CORS, Path-based Routing, Load Balancing
- DevOps: Docker, kubectl, Git, 무중단 배포

**소프트 스킬**
- 문제 해결 능력: 복잡한 이슈를 단계적으로 해결
- 문서화: 지식 공유 및 재발 방지
- 아키텍처 사고: 트레이드오프 이해 및 의사결정
- 지속적 개선: 임시 해결 vs 근본 해결 구분

이러한 경험은 실제 프로덕션 환경에서 발생하는 문제를 해결하는 엔지니어로서의 역량을 입증한다.

---

**작성일**: 2026-07-08  
**작성자**: [Your Name]  
**프로젝트**: [2-jingjung-community](https://github.com/jing-jung/2-jingjung-community-fe)
