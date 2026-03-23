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
});