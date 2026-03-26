// js/post-detail/actions.js

function formatNumber(num) {
    if (num >= 1000) return Math.floor(num / 1000) + "k";
    return num;
}

let currentDeleteTarget = null;

function hideModal(elements) {
    elements.deleteModal.classList.add("hidden");
    document.body.classList.remove("no-scroll");
    currentDeleteTarget = null;
}

export function showDeleteModal(target, elements) {
    const { deleteModal, modalTitle } = elements;
    currentDeleteTarget = target;
    if(target === 'post') {
        modalTitle.textContent = "게시글을 삭제하시겠습니까?";
    } else {
        modalTitle.textContent = "댓글을 삭제하시겠습니까?";
    }
    deleteModal.classList.remove("hidden");
    document.body.classList.add("no-scroll");
}

export function initActions(BASE_URL, postId, elements) {
    const { likeBtn, likeCountElem, modalCancelBtn, modalConfirmBtn } = elements;

    likeBtn.addEventListener("click", async () => {
        try {
            const res = await fetch(`${BASE_URL}/posts/${postId}/like`, {
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

    if(modalCancelBtn) modalCancelBtn.addEventListener("click", () => hideModal(elements));
    if(modalConfirmBtn) {
        modalConfirmBtn.addEventListener("click", async () => {
            if (!currentDeleteTarget) return;
            try {
                if (currentDeleteTarget === 'post') {
                    const res = await fetch(`${BASE_URL}/posts/${postId}`, {
                        method: "DELETE", credentials: "include"
                    });
                    if(res.ok) { 
                        alert("삭제 완료"); 
                        window.location.href = "posts.html"; 
                    } else {
                        alert("삭제에 실패했습니다.");
                    }
                } else if (currentDeleteTarget.startsWith("comment_")) {
                    const commentId = currentDeleteTarget.split("_")[1];
                    const res = await fetch(`${BASE_URL}/comments/${commentId}`, {
                        method: "DELETE", credentials: "include"
                    });
                    if(res.ok) {
                        alert("댓글이 삭제되었습니다.");
                        window.location.reload(); // Reload to refresh comments
                    } else {
                        alert("댓글 삭제에 실패했습니다.");
                    }
                }
            } catch(e) { console.error(e); }
            hideModal(elements);
        });
    }
}
