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
    const myTurnipCountElem = document.getElementById("myTurnipCount");
    const currentTurnipPriceElem = document.getElementById("currentTurnipPrice");

    let currentPrice = 0;

    const acModal = {
        overlay: document.getElementById('ac-modal-overlay'),
        message: document.getElementById('ac-modal-message'),
        yesBtn: document.getElementById('ac-modal-yes'),
        noBtn: document.getElementById('ac-modal-no'),
        callback: null,

        open: function(nickname, onConfirm) {
            this.message.textContent = `${nickname}님에게 쪽지(1:1 채팅)를 보내시겠습니까?`;
            this.callback = onConfirm;
            this.overlay.classList.add('active'); 
            this.overlay.style.display = 'flex'; 
        },

        close: function() {
            this.overlay.classList.remove('active');
            this.overlay.style.display = 'none';
            this.callback = null;
        },

        init: function() {
            this.noBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });

            this.yesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.callback) this.callback();
                this.close();
            });

            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
        });
    }
};

acModal.init();

    async function updateTurnipPrice() {
        try {
            const res = await fetch(`${BASE_URL}/turnips/price`);
            if (res.ok) {
                const data = await res.json();
                currentPrice = data.current_price;
                currentTurnipPriceElem.textContent = currentPrice;
            } else {
                currentTurnipPriceElem.textContent = "??";
            }
        } catch (e) {
            console.error("Error fetching turnip price:", e);
            currentTurnipPriceElem.textContent = "??";
        }
    }

    async function tradeTurnips(type, quantity) {
        if (currentPrice <= 0) {
            alert("시세 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.");
            return;
        }
        try {
            const res = await fetch(`${BASE_URL}/turnips/trade`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, quantity, price: currentPrice }),
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                myTurnipCountElem.textContent = data.turnip_amount || 0;
                if(window.updateHeader) {
                    window.updateHeader();
                }
            } else {
                alert(data.detail || "거래에 실패했습니다.");
            }
        } catch (e) {
            console.error("Error trading turnips:", e);
            alert("거래 중 오류가 발생했습니다.");
        }
    }

    if (turnipBtn) {
        turnipBtn.addEventListener("click", async () => {
            await updateTurnipPrice(); // 시세 먼저 업데이트
            try {
                const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    myTurnipCountElem.textContent = data.turnip || 0;
                } else {
                    myTurnipCountElem.textContent = "??";
                }
            } catch (e) {
                myTurnipCountElem.textContent = "??";
            }
            
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
            tradeTurnips("buy", qty);
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
            tradeTurnips("sell", qty);
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

    if (writeBtn) {
        writeBtn.addEventListener("click", () => {
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
    
    function renderPosts(posts) {
    posts.forEach(post => {
        const card = document.createElement("div");
        card.className = "post-card";
        
        card.onclick = (e) => {
            if (e.target.closest('.post-author')) return;
            window.location.href = `post_detail.html?id=${post.post_id}`;
        };
        
        let profileUrl = post.author_profile_image || "";
        if(profileUrl && !profileUrl.startsWith("http")) {
            profileUrl = BASE_URL + profileUrl;
        }

        let postImageUrl = post.image || "";
        if(postImageUrl && !postImageUrl.startsWith("http")) {
            postImageUrl = BASE_URL + postImageUrl;
        }

        const formatNumber = (num) => {
            if (num >= 1000) return Math.floor(num / 1000) + "k";
            return num;
        };

        card.innerHTML = `
            <div class="post-author" style="cursor: pointer;">
                <div class="author-profile" 
                     style="background-image: url('${profileUrl}'); 
                            background-size: cover; 
                            background-position: center; 
                            background-color: #ddd;">
                </div>
                <span class="author-name">${post.author_nickname}</span>
            </div>

            ${postImageUrl ? `
            <div class="post-image-container">
                <img src="${postImageUrl}" class="post-list-img" alt="게시글 이미지">
            </div>
            ` : ''}

            <div class="post-header">
                <h3 class="post-title">${post.title}</h3>
                <div class="post-meta">
                    <span>좋아요 ${formatNumber(post.likes || post.likes_count || 0)}</span>
                    <span>댓글 ${formatNumber(post.comments || post.comments_count || 0)}</span>
                    <span>조회수 ${formatNumber(post.views || post.views_count || 0)}</span>
                    <span class="date">${post.created_at ? post.created_at.split(' ')[0] : ''}</span>
                </div>
            </div>
        `;
        
        const authorSection = card.querySelector('.post-author');
        authorSection.addEventListener('click', (e) => {
            e.stopPropagation(); 
            acModal.open(post.author_nickname, () => {
                window.location.href = `chat.html?recipientId=${post.user_id}`;
            });
        });

        postList.appendChild(card);
    });
}

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
    const trainBtn = document.getElementById("trainBtn");
    const trainModal = document.getElementById("trainModal");
    const closeTrainModal = document.getElementById("closeTrainModal");
    const timetableList = document.getElementById("timetableList");
    
    const queueModal = document.getElementById("queueModal");
    const queueNumberSpan = document.getElementById("queueNumber");

    function renderTimetable() {
        timetableList.innerHTML = "";
        const now = new Date();
        const currentHour = now.getHours();

        for (let i = 9; i <= 22; i++) {
            const row = document.createElement("div");
            const isPast = i <= currentHour; 
            
            row.className = `timetable-row ${isPast ? 'past' : ''}`;
            
            const timeString = `${i < 10 ? '0'+i : i}:00 출발`;
            
            row.innerHTML = `
                <div class="time-info">${timeString}</div>
                <button class="reserve-btn">${isPast ? '마감' : '예매'}</button>
            `;

            if (!isPast) {
                const btn = row.querySelector('.reserve-btn');
                btn.addEventListener("click", () => {
                    startReservationQueue();
                });
            }
            timetableList.appendChild(row);
        }
    }

    function startReservationQueue() {
        trainModal.classList.add("hidden"); 
        queueModal.classList.remove("hidden"); 
        
        let waitNumber = Math.floor(Math.random() * 200) + 50; 
        queueNumberSpan.textContent = waitNumber;

        const interval = setInterval(() => {
            waitNumber -= Math.floor(Math.random() * 10) + 5; 
            
            if (waitNumber <= 0) {
                clearInterval(interval); 
                queueModal.classList.add("hidden"); 
                alert("기차표 예매가 완료되었습니다구리! 즐거운 여행 되세요! ✈️");
                document.body.classList.remove("no-scroll");
            } else {
                queueNumberSpan.textContent = waitNumber; 
            }
        }, 400); 
    }

    if (trainBtn) {
        trainBtn.addEventListener("click", () => {
            renderTimetable(); 
            trainModal.classList.remove("hidden");
            document.body.classList.add("no-scroll");
        });
    }

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

    // 배경 이미지에 맞춰서 min, max 숫자를 수정하면 원하는 구역에만 띄울 수 있습니다!
    const landAreas = [
        { minX: 9.3, maxX: 50.3, minY: 11.4, maxY: 50.8 },  // 왼쪽 섬 구역
        { minX: 50.0, maxX: 91.0, minY: 11.4, maxY: 50.8 }, // 오른쪽 섬 구역
        { minX: 9.3, maxX: 91.0, minY: 50.8, maxY: 93.1 }   // 위쪽(아래쪽) 섬 구역
    ];

    // 지정된 땅 영역 중 하나를 골라 랜덤 좌표를 생성하는 함수
    function getRandomLandCoordinate() {
        const area = landAreas[Math.floor(Math.random() * landAreas.length)];
        const x = Math.random() * (area.maxX - area.minX) + area.minX;
        const y = Math.random() * (area.maxY - area.minY) + area.minY;
        return { x, y };
    }

    async function renderMapPins() {
        mapContainer.innerHTML = ""; 
        
        try {
            // 주소 수정: /users -> /users/locations
            const res = await fetch(`${BASE_URL}/users/locations`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                const users = await res.json(); 

                users.forEach(user => {
                    const pinWrapper = document.createElement("div");
                    pinWrapper.className = "user-pin-wrapper";
                    
                    // 제한된 땅 영역 내에서 랜덤 좌표 추출
                    const coords = getRandomLandCoordinate();
                    pinWrapper.style.left = `${coords.x}%`;
                    pinWrapper.style.top = `${coords.y}%`;
                    
                    // 백엔드에서 반환하는 키(image_url)에 맞게 처리
                    let imgUrl = user.image_url; 
                    if (imgUrl && !imgUrl.startsWith("http")) {
                        imgUrl = BASE_URL + imgUrl;
                    }
                    if (!imgUrl) {
                        imgUrl = "./images/default-profile.png"; 
                    }

                    const userName = user.nickname || "이름 모를 주민";
                    
                    // 💧 거꾸로 된 물방울 마커와 툴팁 HTML 구조
                    pinWrapper.innerHTML = `
                        <div class="user-pin-tooltip">${userName}</div>
                        <div class="user-pin-marker">
                            <div class="user-pin-image" style="background-image: url('${imgUrl}')"></div>
                        </div>
                    `;
                    
                    pinWrapper.addEventListener("click", () => {
                        alert(`${userName} 주민의 위치입니다구리!`);
                    });

                    mapContainer.appendChild(pinWrapper);
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