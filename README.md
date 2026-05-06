![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=white)

# 🍃 동숲 주민들의 커뮤니티 (아무 말 대잔치 Frontend)

> "우리 마을에 놀러오세요구리!"
> 기존 커뮤니티 게시판을 '모여봐요 동물의 숲' 세계관으로 고도화한 프론트엔드 웹 클라이언트입니다.

Vanilla JavaScript(ES6+)만을 사용하여 프레임워크 없이 **SPA(Single Page Application)** 형태와 유사한 방식의 동작을 구현하였으며, 흥미로운 **인터랙티브 요소**와 더불어 **브라우저 보안 및 UX 최적화**에 집중했습니다.

🔗 **Backend & Infra Repository**: [https://github.com/jing-jung/2-jing-jung-community-be](https://github.com/jing-jung/2-jing-jung-community-be)

## 🎬 프로젝트 시연 영상

[시연 영상 보러가기](여기에_유튜브_또는_구글드라이브_링크_삽입)

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
- **Network**: Fetch API (Async/Await), WebSockets
- **Deployment & Infra**: Docker, Nginx, GitHub Actions, Amazon ECR, Amazon EKS

## ✨ Key Features (Frontend)

### 1. ⚡ 순수 자바스크립트 구현 (Vanilla JS)
- React나 Vue 같은 프레임워크 없이, 순수 `DOM API`만을 사용하여 동적인 UI를 직접 제어하고 컴포넌트 단위로 모듈화(ES6 Modules)했습니다.

### 2. 🎮 테마 특화 인터랙션 (Interactive Features)
- **📈 무 주식 거래소:** 실시간 변동 시세 기반 모의 투자 시스템 (헤더의 보유 재화와 실시간 연동)
- **✈️ 너굴 레일 기차표 예매:** 특정 시간대 예매 및 트래픽 집중을 가정한 대기열(Queue) 시스템 시각화 및 내 기차표 보관함 기능
- **💘 운명의 이웃 찾기:** 여권(소개글) 작성 후 타 유저 프로필 스와이프 매칭 및 채팅 연결
- **🗺️ 마을 전체 지도:** 접속 중인 이웃들의 위치를 마을 지도 상에 랜덤 좌표로 렌더링

### 3. 💬 실시간 1:1 채팅 (Real-time Chat)
- **WebSocket**을 활용한 양방향 실시간 메시지 송수신 기능 구현
- 채팅 목록 최신순 정렬, 안 읽은 메시지 알림 뱃지 표시 및 커뮤니티 게시글에서 즉각적인 1:1 채팅방 생성 연결

### 4. 🔒 사용자 인증 및 커뮤니티 기능
- `Fetch API`의 `credentials: "include"` 옵션을 활용하여 백엔드 Session Cookie와 연동된 로그인 상태 유지 및 안전한 API 통신
- 이미지 첨부가 가능한 게시글 및 댓글 CRUD, 좋아요, 실시간 조회수 반영

## 🚀 Deployment (프론트엔드 배포 파이프라인)
본 프로젝트의 프론트엔드는 AWS 클라우드 네이티브 환경에서 자동화된 파이프라인을 통해 배포됩니다.
- **CI/CD**: GitHub Actions를 통해 `main` 브랜치에 코드가 푸시되면 자동으로 Nginx 기반의 Docker 이미지가 빌드되어 **AWS ECR**에 푸시됩니다.
- **Kubernetes**: 이미지가 ECR에 푸시된 후, **AWS EKS** 클러스터의 `frontend-deployment`가 최신 이미지로 재시작(Rollout Restart)되어 무중단 배포를 수행합니다.

---

## 🛡️ Trouble Shooting & Optimization (핵심 문제 해결)

프론트엔드 개발 과정에서 겪은 보안 이슈와 UX 문제를 해결한 과정입니다.

### 1. DOM XSS (Cross Site Scripting) 방어
- **문제 상황**: `innerHTML`을 사용하여 사용자 입력을 렌더링할 경우, `<script>` 태그가 실행되는 보안 취약점 확인.
- **해결**: 닉네임, 게시글 본문 등 사용자 입력 데이터 출력 시 `innerText` 및 `textContent`만 사용하여 HTML 파싱을 방지하고, 스크립트 주입 가능성을 원천 차단함.

### 2. 실시간 UI 상태 동기화 (Input Event)
- **문제 상황**: 입력창에 글을 써도 '등록' 버튼이 활성화되지 않거나 색상이 즉각 변하지 않음.
- **해결**: `click`이나 `change` 대신, 키보드 입력 즉시 반응하는 **`input` 이벤트 리스너**를 부착하여 사용자 입력과 동시에 버튼 상태(Active/Disabled)가 실시간으로 동기화되도록 UX 개선.

### 3. 비동기 요청 중복 클릭(따닥) 방지
- **문제 상황**: 네트워크 지연 시 사용자가 '등록' 버튼을 반복 클릭하여 중복 데이터가 생성되거나 불필요한 트래픽 발생.
- **해결**: 이벤트 핸들러 시작 부분에 `btn.disabled = true`를 추가하여 UI 잠금 처리 후, `await fetch()` 완료(성공/실패) 시점에만 버튼을 다시 활성화하여 데이터 무결성 확보.

### 4. 서버 시간(KST) 및 브라우저 시차 해결
- **문제 상황**: 백엔드에서 내려주는 시간(KST)이 브라우저에서 올바르게 파싱되지 않아 채팅이나 게시글 작성 시간이 어긋나는 현상 발생.
- **해결**: 백엔드의 타임스탬프 문자열에 `T`와 `Z`를 붙여 ISO 8601 형식으로 파싱하도록 헬퍼 함수를 구현, 브라우저가 사용자의 로컬 시간에 맞게 올바르게 시간을 렌더링하도록 수정.

### 5. 클라이언트 사이드 유효성 검사 (Early Return)
- **문제 상황**: 제한 글자 수를 초과한 데이터를 전송할 경우, 서버까지 도달한 후 에러가 반환되어 불필요한 네트워크 리소스 낭비.
- **해결**: 요청 전송 **이전(Before Request)** 단계에서 데이터 유효성을 체크하여, 조건 미달 시 즉시 함수를 종료(`return`)하여 서버 부하를 최소화함.

---

## ⚙️ System Architecture & Backend Deployment

본 프로젝트는 대용량 트래픽 처리와 안정적인 서비스 제공을 위해 **AWS EKS** 및 **Terraform(IaC)**을 활용하여 인프라를 구축했습니다.

전체 아키텍처(Ingress, ALB, RDS 구성 등) 및 백엔드 코드는 아래 레포지토리에서 상세히 확인하실 수 있습니다.

🔗 **[Backend & Infra Repository 확인하기](https://github.com/jing-jung/2-jing-jung-community-be)**
