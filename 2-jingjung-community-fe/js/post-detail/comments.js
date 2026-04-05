// js/post-detail/comments.js

function addCommentToDOM(comment, BASE_URL, showDeleteModal, elements) {
    const { commentList, commentInput, commentSubmitBtn } = elements;

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

    // 🚀 시차 해결 로직 추가 (댓글 작성 시간)
    let commentTime = comment.created_at;
    if (commentTime) {
        commentTime = commentTime.replace(" ", "T");
        if (!commentTime.endsWith("Z")) commentTime += "Z";
    }
    const displayTime = commentTime ? new Date(commentTime).toLocaleString() : "";

    div.innerHTML = `
        <div class="comment-meta">
            <div class="comment-author-row">
                <div class="profile-img" style="background-image: url('${profileUrl}');"></div>
                <span class="target-nickname"></span> 
                <span class="comment-date">${displayTime}</span> </div>
            ${actionsHtml}
        </div>
        <div class="comment-content"></div>
    `;
    
    div.querySelector(".target-nickname").textContent = comment.author_nickname;
    div.querySelector(".comment-content").textContent = comment.content;
    
    const profileDiv = div.querySelector(".profile-img");
    profileDiv.style.width = "24px";
    profileDiv.style.height = "24px";
    profileDiv.style.backgroundSize = "cover";
    profileDiv.style.borderRadius = "50%";
    profileDiv.style.backgroundColor = "#ddd";
    profileDiv.style.marginRight = "8px";

    commentList.prepend(div);

    if (comment.is_owner) {
        const editBtn = div.querySelector(".edit-btn");
        const delBtn = div.querySelector(".del-btn");
        
        delBtn.addEventListener("click", () => showDeleteModal(`comment_${comment.comment_id}`));
        
        editBtn.addEventListener("click", () => {
            commentInput.value = div.querySelector(".comment-content").textContent;
            commentInput.focus();
            commentSubmitBtn.disabled = false;
            commentSubmitBtn.classList.add("active");
            commentSubmitBtn.textContent = "댓글 수정";
            
            window.editModeCommentId = comment.comment_id;
        });
    }
}

async function loadComments(BASE_URL, postId, showDeleteModal, elements) {
    try {
        const res = await fetch(`${BASE_URL}/posts/${postId}/comments`, { credentials: "include" });
        if(res.ok) {
            const data = await res.json();
            elements.commentList.innerHTML = "";
            const comments = data.comments || data;
            comments.forEach(comment => addCommentToDOM(comment, BASE_URL, showDeleteModal, elements));
        }
    } catch(e) { console.error(e); }
}

export async function initComments(BASE_URL, postId, showDeleteModal, elements) {
    const { commentInput, commentSubmitBtn } = elements;
    
    // Initial load
    await loadComments(BASE_URL, postId, showDeleteModal, elements);

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

        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        commentSubmitBtn.disabled = true;

        try {
            const editModeCommentId = window.editModeCommentId;
            let url = `${BASE_URL}/posts/${postId}/comments`; 
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
                alert(JSON.parse(errorText).detail || "요청 실패");
                commentSubmitBtn.disabled = false;
                return;
            }

            alert(editModeCommentId ? "댓글이 수정되었습니다." : "댓글이 등록되었습니다.");
            window.location.reload(); // Simple reload to refresh state

        } catch (e) {
            console.error(e);
            alert("서버와 통신할 수 없습니다.");
            commentSubmitBtn.disabled = false;
        }
    });
}
