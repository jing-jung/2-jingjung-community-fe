import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;

document.addEventListener("DOMContentLoaded", () => {
    // 1. 요소 가져오기
    const postList = document.getElementById("postList");
    const writeBtn = document.getElementById("writeBtn");
    const loadingSentinel = document.getElementById("loadingSentinel");
    
    const turnipBtn = document.getElementById("turnipBtn");
    const turnipModal = document.getElementById("turnipModal");
    const closeTurnipModal = document.getElementById("closeTurnipModal");
    const buyTurnipBtn = document.getElementById("buyTurnipBtn");
    const sellTurnipBtn = document.getElementById("sellTurnipBtn");
    const turnipQuantity = document.getElementById("turnipQuantity");

    if (turnipBtn) {
        turnipBtn.addEventListener("click", () => {
            turnipModal.classList.remove("hidden");
            document.body.classList.add("no-scroll");
        });
    }

    if (closeTurnipModal) {
        closeTurnipModal.addEventListener("click", () => {
            turnipModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
            turnipQuantity.value = "";
        });
    }

    if (buyTurnipBtn) {
        buyTurnipBtn.addEventListener("click", () => {
            const qty = parseInt(turnipQuantity.value);
            if (!qty || qty <= 0) {
                alert("수량을 올바르게 입력해주세요.");
                return;
            }
            alert(`${qty}개의 무를 구매했습니다!`);
            turnipModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
            turnipQuantity.value = "";
        });
    }

    if (sellTurnipBtn) {
        sellTurnipBtn.addEventListener("click", () => {
            const qty = parseInt(turnipQuantity.value);
            if (!qty || qty <= 0) {
                alert("수량을 올바르게 입력해주세요.");
                return;
            }
            alert(`${qty}개의 무를 판매했습니다!`);
            turnipModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
            turnipQuantity.value = "";
        });
    }    
    
    async function checkLoginStatus() {
        try {
            const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
            if (!res.ok && res.status === 401) {
                if(writeBtn) writeBtn.style.display = 'none';
            }
        } catch (e) {
            console.error("Login status check failed:", e);
            if(writeBtn) writeBtn.style.display = 'none';
        }
    }
    checkLoginStatus();

    // 2. 게시글 작성 버튼
    if (writeBtn) {
        writeBtn.addEventListener("click", () => {
            // Check if user is logged in before redirecting
            fetch(`${BASE_URL}/users/me`, { credentials: "include" })
                .then(res => {
                    if (res.ok) {
                        window.location.href = "write_post.html"; 
                    } else {
                        alert("로그인이 필요합니다.");
                        window.location.href = "login.html";
                    }
                })
                .catch(e => {
                    console.error("Login check failed:", e);
                    alert("로그인 상태 확인 중 오류가 발생했습니다.");
                });
        });
    }

    // 3. 게시글 목록 로직 (인피니티 스크롤)
    function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    let currentOffset = 0;
    const limit = 10;
    let isLoading = false; 

    async function fetchPosts(offset, limit) {
        try {
            const res = await fetch(`${BASE_URL}/posts?offset=${offset}&limit=${limit}`);
            if (!res.ok) throw new Error("게시글 로딩 실패");
            
            const data = await res.json();
            return data.posts; 
        } catch (e) {
            console.error(e);
            return [];
        }
    }
    
    
    // 게시글 렌더링 
    function renderPosts(posts) {
        posts.forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            
            card.onclick = () => {
                window.location.href = `post_detail.html?id=${post.post_id}`;
            };
            
            let profileUrl = post.author_profile_image || "";
            if(profileUrl && !profileUrl.startsWith("http")) {
                profileUrl = BASE_URL + profileUrl;
            }

            // 숫자 포맷 (1k, 10k 등)
            const formatNumber = (num) => {
                if (num >= 1000) return Math.floor(num / 1000) + "k";
                return num;
            };

            card.innerHTML = `
                <div class="post-header">
                    <h3 class="post-title">${escapeHtml(post.title)}</h3>
                    <div class="post-meta">
                        <span>좋아요 ${formatNumber(post.likes)}</span>
                        <span>댓글 ${formatNumber(post.comments)}</span>
                        <span>조회수 ${formatNumber(post.views)}</span>
                        <span class="date">${post.created_at}</span>
                    </div>
                </div>
                <div class="post-author">
                    <div class="author-profile" 
                         style="background-image: url('${profileUrl}'); 
                                background-size: cover; 
                                background-position: center; 
                                background-color: #ddd;">
                    </div>
                    <span class="author-name">${escapeHtml(post.author_nickname)}</span>
                </div>
            `;
            postList.appendChild(card);
        });
    }

    // Intersection Observer (스크롤 감지)
    const observer = new IntersectionObserver(async (entries) => {
        const entry = entries[0];
        
        if (entry.isIntersecting && !isLoading) {
            isLoading = true;
            
            const newPosts = await fetchPosts(currentOffset, limit);
            
            if (newPosts && newPosts.length > 0) {
                renderPosts(newPosts);
                currentOffset += newPosts.length;
                isLoading = false;
            } else {
                if(loadingSentinel) {
                    loadingSentinel.textContent = "더 이상 게시글이 없습니다.";
                    observer.unobserve(loadingSentinel);
                }
                isLoading = false;
            }
        }
    }, { threshold: 0.1 });

    if(loadingSentinel) observer.observe(loadingSentinel);
    else {
        (async () => {
            const newPosts = await fetchPosts(0, limit);
            renderPosts(newPosts);
            currentOffset += newPosts.length;
        })();
    }
    // =========================================
    // 기차표 & 대기열 시스템 로직 (추가)
    // =========================================
    const trainBtn = document.getElementById("trainBtn");
    const trainModal = document.getElementById("trainModal");
    const closeTrainModal = document.getElementById("closeTrainModal");
    const timetableList = document.getElementById("timetableList");
    
    const queueModal = document.getElementById("queueModal");
    const queueNumberSpan = document.getElementById("queueNumber");

    // 1. 시간표 자동 생성 함수 (현재 시간 기준으로 마감 처리)
    function renderTimetable() {
        timetableList.innerHTML = "";
        const now = new Date();
        const currentHour = now.getHours();

        // 아침 9시부터 밤 10시(22시)까지 기차가 있다고 가정
        for (let i = 9; i <= 22; i++) {
            const row = document.createElement("div");
            // i(출발시간)가 현재 시간보다 작거나 같으면 마감(past)
            const isPast = i <= currentHour; 
            
            row.className = `timetable-row ${isPast ? 'past' : ''}`;
            
            // 시간 포맷 (예: 9 -> 09:00)
            const timeString = `${i < 10 ? '0'+i : i}:00 출발`;
            
            row.innerHTML = `
                <div class="time-info">${timeString}</div>
                <button class="reserve-btn">${isPast ? '마감' : '예매'}</button>
            `;

            // 예매 가능한 버튼에만 클릭 이벤트 추가
            if (!isPast) {
                const btn = row.querySelector('.reserve-btn');
                btn.addEventListener("click", () => {
                    startReservationQueue();
                });
            }
            timetableList.appendChild(row);
        }
    }

    // 2. KTX 대기열 시작 로직
    function startReservationQueue() {
        trainModal.classList.add("hidden"); // 시간표 닫기
        queueModal.classList.remove("hidden"); // 대기열 창 띄우기
        
        // 50명 ~ 250명 사이의 가짜 대기자 수 생성
        let waitNumber = Math.floor(Math.random() * 200) + 50; 
        queueNumberSpan.textContent = waitNumber;

        // 0.4초마다 대기자 숫자가 무작위로 줄어드는 애니메이션
        const interval = setInterval(() => {
            waitNumber -= Math.floor(Math.random() * 10) + 5; 
            
            if (waitNumber <= 0) {
                clearInterval(interval); // 타이머 종료
                queueModal.classList.add("hidden"); // 대기열 닫기
                alert("기차표 예매가 완료되었습니다구리! 즐거운 여행 되세요! ✈️");
                document.body.classList.remove("no-scroll");
            } else {
                queueNumberSpan.textContent = waitNumber; // 화면 숫자 업데이트
            }
        }, 400); 
    }

    // 3. 기차 버튼 클릭 시 모달 열기
    if (trainBtn) {
        trainBtn.addEventListener("click", () => {
            renderTimetable(); // 모달 열 때마다 시간표 새로 계산
            trainModal.classList.remove("hidden");
            document.body.classList.add("no-scroll");
        });
    }

    // 4. 시간표 닫기 버튼
    if (closeTrainModal) {
        closeTrainModal.addEventListener("click", () => {
            trainModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
        });
    }
    const mapBtn = document.getElementById("mapBtn");
const mapModal = document.getElementById("mapModal");
const closeMapModal = document.getElementById("closeMapModal");
const mapContainer = document.getElementById("mapContainer");

async function renderMapPins() {
    mapContainer.innerHTML = ""; 
    
    try {
        const res = await fetch(`${BASE_URL}/users`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (res.ok) {
            const users = await res.json(); 

            users.forEach(user => {
                const pin = document.createElement("div");
                pin.className = "user-pin";
                
                const randomX = Math.random() * 90 + 5; 
                const randomY = Math.random() * 85 + 7; 
                
                pin.style.left = `${randomX}%`;
                pin.style.top = `${randomY}%`;
                
                let imgUrl = user.profile_image; 
                if (imgUrl && !imgUrl.startsWith("http")) {
                    imgUrl = BASE_URL + imgUrl;
                }
                
                if (!imgUrl) {
                    imgUrl = "./images/default-profile.png"; 
                }

                const userName = user.nickname || user.username || "이름 모를 주민";
                
                pin.innerHTML = `
                    <img src="${imgUrl}" alt="${userName}" class="pin-image" onerror="this.src='./images/default-profile.png'">
                    <span class="user-pin-name">${userName}</span>
                `;
                
                pin.addEventListener("click", () => {
                    alert(`${userName} 주민의 위치입니다구리!`);
                });

                mapContainer.appendChild(pin);
            });
        } else {
            mapContainer.innerHTML = "<p style='margin-top: 50px; color: #888;'>주민 목록을 불러올 수 없습니다구리.<br>(백엔드 API 확인 필요)</p>";
        }
    } catch (error) {
        console.error(error);
    }
}

if (mapBtn) {
    mapBtn.addEventListener("click", () => {
        renderMapPins(); 
        mapModal.classList.remove("hidden");
        document.body.classList.add("no-scroll");
    });
}

if (closeMapModal) {
    closeMapModal.addEventListener("click", () => {
        mapModal.classList.add("hidden");
        document.body.classList.remove("no-scroll");
    });
}

const datingBannerBtn = document.getElementById("datingBannerBtn");

if (datingBannerBtn) {
    datingBannerBtn.addEventListener("click", () => {
        window.location.href = "matching.html";
    });
}
});