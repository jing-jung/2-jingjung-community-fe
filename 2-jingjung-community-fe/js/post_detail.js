const BASE_URL = CONFIG.BASE_URL; 
import './header.js'; // Import the common header logic

document.addEventListener("DOMContentLoaded", async () => {    // 1. 요소 가져오기
    const backBtn = document.getElementById("backBtn");
    
    // 게시글 관련 요소
    const postTitle = document.getElementById("postTitle");
    const authorName = document.getElementById("authorName");
    const postDate = document.getElementById("postDate");
    const postText = document.getElementById("postText");
    const authorProfileImg = document.querySelector(".author-info .profile-img");
    
    const postImagePlaceholder = document.querySelector(".post-image-placeholder");

    const postEditBtn = document.getElementById("postEditBtn");
    const postDeleteBtn = document.getElementById("postDeleteBtn");
    
    const likeBtn = document.getElementById("likeBtn");
    const likeCountElem = document.getElementById("likeCount");
    const viewCountElem = document.getElementById("viewCount");
    const commentCountElem = document.getElementById("commentCount");
    
    const commentInput = document.getElementById("commentInput");
    const commentSubmitBtn = document.getElementById("commentSubmitBtn");
    const commentList = document.getElementById("commentList");
    
    const deleteModal = document.getElementById("deleteModal");
    const modalCancelBtn = document.getElementById("modalCancelBtn");
    const modalConfirmBtn = document.getElementById("modalConfirmBtn");
    const modalTitle = document.querySelector(".modal-title");
    
    // The header logic is now handled by js/header.js
    // Only page-specific logic remains here.
    
    let currentPostId = null;
    let currentDeleteTarget = null;
    let editModeCommentId = null; 

    // 2. 초기 세팅 & 헤더 내 정보 불러오기
    async function loadMyProfile() {
        try {
            // This function is now only used to check login status for displaying chat button
            const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
            if (!res.ok) return null; // Not logged in
            const user = await res.json();
            return user.id; // Return current user's ID
        } catch (e) {
            console.error("Login status check failed:", e);
            return null;
        }
    }
    // loadMyProfile() is no longer called directly here, its logic is in header.js

    if(backBtn) {
        backBtn.addEventListener("click", () => {
            window.location.href = "posts.html";
        });
    }

    if (postEditBtn) {
        postEditBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = `edit_post.html?id=${currentPostId}`;
        });
    }

    if (postDeleteBtn) {
        postDeleteBtn.addEventListener("click", () => {
            showModal('post');
        });
    }

    // 3. 게시글 데이터 불러오기
    const urlParams = new URLSearchParams(window.location.search);
    currentPostId = urlParams.get("id");

    if (!currentPostId) {
        alert("잘못된 접근입니다.");
        window.location.href = "posts.html";
        return;
    }

    async function loadPostData() {
        try {
            const response = await fetch(`${BASE_URL}/posts/${currentPostId}`, {
                method: "GET",
                credentials: "include"
            });

            if (!response.ok) throw new Error("게시글 로딩 실패");

            const post = await response.json();
            renderPost(post);
            loadComments();

        } catch (error) {
            console.error(error);
            alert("존재하지 않는 게시글입니다.");
            window.location.href = "posts.html";
        }
    }

    async function renderPost(post) {
        postTitle.textContent = post.title;
        postText.textContent = post.content;
        authorName.textContent = post.author_nickname;
        postDate.textContent = post.created_at;

            // Add 1:1 chat button
            const chatWithAuthorBtn = document.getElementById("chatWithAuthorBtn");
            if (chatWithAuthorBtn) {
                const currentUserId = await loadMyProfile(); // Get current user ID
                if (currentUserId && post.user_id !== currentUserId) { // Don't show chat with self
                    chatWithAuthorBtn.style.display = "inline-block";
                    chatWithAuthorBtn.onclick = () => {
                        window.location.href = `chat.html?recipientId=${post.user_id}`;
                    };
                }
            }
        
        // 작성자 프로필 이미지
        if (post.author_profile_image && authorProfileImg) {
            let imgUrl = post.author_profile_image;
            if(!imgUrl.startsWith("http")) imgUrl = BASE_URL + imgUrl;
            
            authorProfileImg.style.backgroundImage = `url('${imgUrl}')`;
            authorProfileImg.style.backgroundSize = "cover";
            authorProfileImg.style.backgroundColor = "transparent";
        }

        // 게시글 본문 이미지
        if (post.image && postImagePlaceholder) {
            let contentImgUrl = post.image;
            if(!contentImgUrl.startsWith("http")) contentImgUrl = BASE_URL + contentImgUrl;

            const imgTag = document.createElement("img");
            imgTag.src = contentImgUrl;
            imgTag.alt = "게시글 이미지";
            imgTag.style.maxWidth = "100%";
            imgTag.style.borderRadius = "8px";
            imgTag.style.marginTop = "10px";

            postImagePlaceholder.innerHTML = ""; 
            postImagePlaceholder.style.height = "auto"; 
            postImagePlaceholder.style.backgroundColor = "transparent"; 
            postImagePlaceholder.appendChild(imgTag);
        } else {
            if(postImagePlaceholder) postImagePlaceholder.style.display = "none";
        }

        likeCountElem.textContent = formatNumber(post.likes_count);
        viewCountElem.textContent = formatNumber(post.views_count);
        commentCountElem.textContent = formatNumber(post.comments_count);

        if (post.is_liked) likeBtn.classList.add("active");
        else likeBtn.classList.remove("active");

        if (post.is_owner) {
            postEditBtn.style.display = "inline-block";
            postDeleteBtn.style.display = "inline-block";
        } else {
            postEditBtn.style.display = "none";
            postDeleteBtn.style.display = "none";
        }
    }

    function formatNumber(num) {
        if (num >= 1000) return Math.floor(num / 1000) + "k";
        return num;
    }

    // 4. 댓글 / 좋아요 등 나머지 기능

    likeBtn.addEventListener("click", async () => {
        try {
            const res = await fetch(`${BASE_URL}/posts/${currentPostId}/like`, {
                method: "POST",
                credentials: "include"
            });
            if (res.ok) {
                const data = await res.json();
                likeCountElem.textContent = formatNumber(data.likes_count);
                if (data.is_liked) likeBtn.classList.add("active");
                else likeBtn.classList.remove("active");
            } else if (res.status === 401) {
                alert("로그인이 필요합니다.");
            }
        } catch (e) { console.error(e); }
    });

    async function loadComments() {
        try {
            const res = await fetch(`${BASE_URL}/posts/${currentPostId}/comments`, { credentials: "include" });
            if(res.ok) {
                const data = await res.json();
                renderComments(data.comments || data);
            }
        } catch(e) { console.error(e); }
    }

    function renderComments(comments) {
        commentList.innerHTML = "";
        comments.forEach(comment => addCommentToDOM(comment));
    }

    commentInput.addEventListener("input", () => {
        if (commentInput.value.trim().length > 0) {
            commentSubmitBtn.disabled = false;
            commentSubmitBtn.classList.add("active");
        } else {
            commentSubmitBtn.disabled = true;
            commentSubmitBtn.classList.remove("active");
        }
    });


    commentSubmitBtn.addEventListener("click", async () => {
    const content = commentInput.value;

    // 1. 유효성 검사
    if (!content.trim()) {
        alert("내용을 입력해주세요.");
        return;
    }
    if (content.length > 1000) {
        alert(`너무 깁니다! 1000자까지만 가능합니다.`);
        return;
    }

    commentSubmitBtn.disabled = true;

    try {
        let url = `${BASE_URL}/posts/${currentPostId}/comments`; 
        let method = "POST";

        if (editModeCommentId) {
            url = `${BASE_URL}/comments/${editModeCommentId}`;
            method = "PUT"; 
        }

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content }),
            credentials: "include"
        });

        if (!res.ok) {
            const errorText = await res.text();
            try {
                const errJson = JSON.parse(errorText);
                alert(errJson.detail);
            } catch (e) {
                alert("서버 요청 실패: " + res.status);
            }
            
            commentSubmitBtn.disabled = false;
            return;
        }

        alert(editModeCommentId ? "댓글이 수정되었습니다." : "댓글이 등록되었습니다.");
        window.location.reload();

    } catch (e) {
        console.error(e);
        alert("서버와 통신할 수 없습니다.");
        
        commentSubmitBtn.disabled = false;
    }
});

    function addCommentToDOM(comment) {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.id = `commentItem-${comment.comment_id}`;
    
    let profileUrl = comment.author_profile_image || "";
    if(profileUrl && !profileUrl.startsWith("http")) profileUrl = BASE_URL + profileUrl;

    let actionsHtml = "";
    if (comment.is_owner) {
        actionsHtml = `
            <div class="comment-actions">
                <button class="comment-action-btn edit-btn" data-id="${comment.comment_id}">수정</button>
                <button class="comment-action-btn del-btn" data-id="${comment.comment_id}">삭제</button>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="comment-meta">
            <div class="comment-author-row">
                <div class="profile-img" style="background-image: url('${profileUrl}'); width:24px; height:24px; background-size:cover; border-radius:50%; background-color:#ddd; margin-right:8px;"></div>
                
                <span class="target-nickname" style="font-weight:bold; margin-right:8px;"></span> 
                
                <span style="color:#888; font-size:12px;">${comment.created_at}</span>
            </div>
            ${actionsHtml}
        </div>
        
        <div class="comment-content" style="margin-top:5px; white-space: pre-wrap;"></div>
    `;
    
    div.querySelector(".target-nickname").textContent = comment.author_nickname;
    div.querySelector(".comment-content").textContent = comment.content;

    commentList.prepend(div);

    if (comment.is_owner) {
        const editBtn = div.querySelector(".edit-btn");
        const delBtn = div.querySelector(".del-btn");
        
        delBtn.addEventListener("click", () => showModal(`comment_${comment.comment_id}`));
        
        editBtn.addEventListener("click", () => {
                commentInput.value = div.querySelector(".comment-content").textContent;
                commentInput.focus();
                commentSubmitBtn.disabled = false;
                commentSubmitBtn.classList.add("active");
                commentSubmitBtn.textContent = "댓글 수정";
                editModeCommentId = comment.comment_id;
            });
        }
    }

    function showModal(target) {
        currentDeleteTarget = target;
        if(target === 'post') modalTitle.textContent = "게시글을 삭제하시겠습니까?";
        else modalTitle.textContent = "댓글을 삭제하시겠습니까?";
        deleteModal.classList.remove("hidden");
        document.body.classList.add("no-scroll");
    }
    function hideModal() {
        deleteModal.classList.add("hidden");
        document.body.classList.remove("no-scroll");
        currentDeleteTarget = null;
    }
    if(modalCancelBtn) modalCancelBtn.addEventListener("click", hideModal);
    if(modalConfirmBtn) {
        modalConfirmBtn.addEventListener("click", async () => {
            if (!currentDeleteTarget) return;
            try {
                if (currentDeleteTarget === 'post') {
                    const res = await fetch(`${BASE_URL}/posts/${currentPostId}`, {
                        method: "DELETE", credentials: "include"
                    });
                    if(res.ok) { alert("삭제 완료"); window.location.href = "posts.html"; }
                } else if (currentDeleteTarget.startsWith("comment_")) {
                    const commentId = currentDeleteTarget.split("_")[1];
                    const res = await fetch(`${BASE_URL}/comments/${commentId}`, {
                        method: "DELETE", credentials: "include"
                    });
                    if(res.ok) loadComments();
                }
            } catch(e) { console.error(e); }
            hideModal();
        });
    }

    loadPostData();
});