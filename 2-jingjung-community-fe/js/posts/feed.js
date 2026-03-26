export function initFeedModule(BASE_URL) {
    const postList = document.getElementById("postList");
    const loadingSentinel = document.getElementById("loadingSentinel");

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
}