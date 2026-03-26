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
        modalTitle: document.querySelector(".modal-title"),
        chatWithAuthorBtn: document.getElementById("chatWithAuthorBtn")
    };
    
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