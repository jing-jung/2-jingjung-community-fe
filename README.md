![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

# 🍃 동숲 주민들의 커뮤니티 (아무 말 대잔치 Frontend)

> "우리 마을에 놀러오세요구리!"
> 기존 커뮤니티 게시판을 '모여봐요 동물의 숲' 세계관으로 고도화한 프론트엔드 웹 클라이언트입니다.

Vanilla JavaScript(ES6+)만을 사용하여 프레임워크 없이 **SPA(Single Page Application)** 형태와 유사한 방식의 동작을 구현하였으며, 흥미로운 **인터랙티브 요소**와 더불어 **브라우저 보안 및 UX 최적화**에 집중했습니다.

🔗 **Backend & Infra Repository**: [https://github.com/jing-jung/2-jing-jung-community-be](https://github.com/jing-jung/2-jing-jung-community-be)

## 🎬 프로젝트 시연 영상

[시연 영상 보러가기](여기에_유튜브_또는_구글드라이브_링크_삽입)

## 🛠️ Tech Stack
- **Language**: JavaScript (Vanilla ES6+), HTML5, CSS3
- **Network**: Fetch API (Async/Await), WebSockets
- **Tool**: VS Code Live Server

## ✨ Key Features (Frontend)

### 1. ⚡ 순수 자바스크립트 구현 (Vanilla JS)
- React나 Vue 같은 프레임워크 없이, 순수 `DOM API`만을 사용하여 동적인 UI를 직접 제어하고 컴포넌트 단위로 모듈화(ES6 Modules)했습니다.

### 2. 🎮 테마 특화 인터랙션 (Interactive Features)
- **📈 무 주식 거래소:** 실시간 변동 시세 기반 모의 투자 시스템 (헤더의 보유 재화와 실시간 연동)
- **✈️ 너굴 레일 기차표 예매:** 특정 시간대 예매 및 트래픽 집중을 가정한 대기열(Queue) 시스템 시각화
- **💘 운명의 이웃 찾기:** 여권(소개글) 작성 후 타 유저 프로필 스와이프 매칭 기능
- **🗺️ 마을 전체 지도:** 접속 중인 이웃들의 위치를 마을 지도 상에 랜덤 좌표로 렌더링

### 3. 💬 실시간 1:1 채팅 (Real-time Chat)
- **WebSocket**을 활용한 양방향 실시간 메시지 송수신 기능 구현
- 채팅 목록 최신순 정렬, 안 읽은 메시지 알림 뱃지 표시 및 게시글에서 즉각적인 1:1 채팅방 생성 연결

### 4. 🔒 사용자 인증 및 커뮤니티 기능
- `Fetch API`의 `credentials` 옵션을 활용하여 백엔드(Session Cookie)와 연동된 로그인 상태 유지
- 이미지 첨부가 가능한 게시글/댓글 CRUD 및 좋아요, 실시간 조회수 반영

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

### 4. 개발 환경의 Origin 불일치 이슈 (CORS)
- **문제 상황**: 프론트엔드에서 API 요청 시 CORS 에러가 발생하거나 세션 쿠키가 공유되지 않음.
- **원인 분석**: 브라우저는 `127.0.0.1`(IP)과 `localhost`(Domain)를 서로 다른 출처(Origin)로 인식하여 **Same-Origin Policy** 위반 발생.
- **해결**: API 요청 주소(`BASE_URL`)를 `localhost`로 통일시키고, `credentials: "include"` 옵션을 유지하여 세션 연동 안정성 확보.

### 5. 클라이언트 사이드 유효성 검사 (Early Return)
- **문제 상황**: 제한 글자 수를 초과한 데이터를 전송할 경우, 서버까지 도달한 후 에러가 반환되어 불필요한 네트워크 리소스 낭비.
- **해결**: 요청 전송 **이전(Before Request)** 단계에서 데이터 유효성을 체크하여, 조건 미달 시 즉시 함수를 종료(`return`)하여 서버 부하를 최소화함.

---

## ⚙️ System Architecture & Backend Deployment

본 프로젝트는 대용량 트래픽 처리와 안정적인 서비스 제공을 위해 **AWS EKS** 및 **Terraform(IaC)**을 활용하여 인프라를 구축했습니다. 

프론트엔드 애플리케이션 역시 컨테이너화되어 EKS 클러스터 내부에서 서비스됩니다. K8s Manifest 기반의 배포 방식, AWS ALB 라우팅 처리, Amazon RDS 데이터베이스 연동 및 전체 아키텍처 코드는 아래 백엔드/인프라 레포지토리에서 상세히 확인하실 수 있습니다.

🔗 **[Backend & Infra Repository 확인하기](https://github.com/jing-jung/2-jing-jung-community-be)**