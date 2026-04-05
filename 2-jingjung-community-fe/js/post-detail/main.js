import { CONFIG } from '../config.js';
import { loadAndRenderPost } from './post.js';
import { initComments } from './comments.js';
import { initActions, showDeleteModal } from './actions.js';

const BASE_URL = CONFIG.BASE_URL; 

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get elements
    const elements = {
        backBtn: document.getElementById("backBtn"),
        postTitle: document.getElementById("postTitle"),
        authorName: document.getElementById("authorName"),
        postDate: document.getElementById("postDate"),
        postText: document.getElementById("postText"),
        authorProfileImg: document.querySelector(".author-info .profile-img"),
        postImagePlaceholder: document.querySelector(".post-image-placeholder"),
        postEditBtn: document.getElementById("postEditBtn"),
        postDeleteBtn: document.getElementById("postDeleteBtn"),
        likeBtn: document.getElementById("likeBtn"),
        likeCountElem: document.getElementById("likeCount"),
        viewCountElem: document.getElementById("viewCount"),
        commentCountElem: document.getElementById("commentCount"),
        commentInput: document.getElementById("commentInput"),
        commentSubmitBtn: document.getElementById("commentSubmitBtn"),
        commentList: document.getElementById("commentList"),
        deleteModal: document.getElementById("deleteModal"),
        modalCancelBtn: document.getElementById("modalCancelBtn"),
        modalConfirmBtn: document.getElementById("modalConfirmBtn"),
        modalTitle: document.querySelector(".modal-title")
    };
    
    // acModal logic
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

    // 2. Get post ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentPostId = urlParams.get("id");

    if (!currentPostId) {
        alert("잘못된 접근입니다.");
        window.location.href = "posts.html";
        return;
    }

    // 3. Initialize modules
    // Pass a function to show modal from actions to comments module
    const showModalFn = (target) => showDeleteModal(target, elements);
    
    // Load post data first
    const postData = await loadAndRenderPost(BASE_URL, currentPostId, elements);

    if (postData) {
        // Init other modules after post data is loaded
        initActions(BASE_URL, currentPostId, elements);
        initComments(BASE_URL, currentPostId, showModalFn, elements);

        // Bind click event to profile image for 1:1 chat
        const authorImg = elements.authorProfileImg;
        if (authorImg && !postData.is_owner) {
            authorImg.style.cursor = "pointer";
            authorImg.addEventListener("click", () => {
                acModal.open(postData.author_nickname, () => {
                    window.location.href = `chat.html?recipientId=${postData.user_id}`;
                });
            });
        }
    }
    
    // 4. Set up general event listeners
    if(elements.backBtn) {
        elements.backBtn.addEventListener("click", () => {
            window.location.href = "posts.html";
        });
    }

    if (elements.postEditBtn) {
        elements.postEditBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = `edit_post.html?id=${currentPostId}`;
        });
    }

    if (elements.postDeleteBtn) {
        elements.postDeleteBtn.addEventListener("click", () => {
            showModalFn('post');
        });
    }
});