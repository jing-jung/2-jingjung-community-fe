// js/post-detail/post.js

function formatNumber(num) {
    if (num >= 1000) return Math.floor(num / 1000) + "k";
    return num;
}

async function loadMyProfile(BASE_URL) {
    try {
        const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
        if (!res.ok) return null;
        const user = await res.json();
        return user.id;
    } catch (e) {
        console.error("Login status check failed:", e);
        return null;
    }
}

async function renderPost(postData, elements, BASE_URL) {
    const { postTitle, postText, authorName, postDate, authorProfileImg, postImagePlaceholder, likeCountElem, viewCountElem, commentCountElem, likeBtn, postEditBtn, postDeleteBtn } = elements;
    
    postTitle.textContent = postData.title || "제목 없음";
    postText.textContent = postData.contents || "내용 없음"; 
    authorName.textContent = postData.author_nickname || "익명";

    // 🚀 시차 해결 로직 (중복된 코드 제거하고 깔끔하게 1번만 실행!)
    let postTime = postData.created_at;
    if (postTime) {
        postTime = postTime.replace(" ", "T");
        if (!postTime.endsWith("Z")) postTime += "Z";
        postDate.textContent = new Date(postTime).toLocaleString();
    } else {
        postDate.textContent = "";
    }
    
    if (postData.author_profile_image && authorProfileImg) {
        let imgUrl = postData.author_profile_image;
        if(!imgUrl.startsWith("http")) imgUrl = BASE_URL + imgUrl;
        authorProfileImg.style.backgroundImage = `url('${imgUrl}')`;
        authorProfileImg.style.backgroundSize = "cover";
        authorProfileImg.style.backgroundColor = "transparent";
    }

    if (postData.image && postImagePlaceholder) {
        let contentImgUrl = postData.image;
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

    likeCountElem.textContent = formatNumber(postData.likes_count || 0);
    viewCountElem.textContent = formatNumber(postData.views_count || 0);
    commentCountElem.textContent = formatNumber(postData.comments_count || 0);

    if (postData.is_liked) likeBtn.classList.add("active");
    else likeBtn.classList.remove("active");

    if (postData.is_owner) {
        postEditBtn.style.display = "inline-block";
        postDeleteBtn.style.display = "inline-block";
    } else {
        postEditBtn.style.display = "none";
        postDeleteBtn.style.display = "none";
    }
}

export async function loadAndRenderPost(BASE_URL, postId, elements) {
    try {
        const response = await fetch(`${BASE_URL}/posts/${postId}`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("게시글 로딩 실패: " + response.status);
        }

        const postData = await response.json();
        
        if (!postData || !postData.post_id) {
            throw new Error("잘못된 게시글 데이터입니다.");
        }

        await renderPost(postData, elements, BASE_URL);
        return postData; // Return data for other modules to use

    } catch (error) {
        console.error(error);
        alert("존재하지 않는 게시글이거나 데이터를 불러오는 데 실패했습니다.");
        window.location.href = "posts.html";
        return null;
    }
}
