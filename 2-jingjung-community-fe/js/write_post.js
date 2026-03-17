const BASE_URL = CONFIG.BASE_URL; 

import './header.js'; 
document.addEventListener("DOMContentLoaded", () => {
    fetch(`${BASE_URL}/users/me`, { credentials: "include" })
        .then(res => {
            if (!res.ok) {
                window.location.href = "login.html";
            }
        })
        .catch(e => {
            console.error("Login check failed:", e);
            window.location.href = "login.html";
        });

    // 1. 게시글 작성 로직
    const backBtn = document.getElementById("backBtn");
    const titleInput = document.getElementById("title");
    const contentInput = document.getElementById("content");
    const imageInput = document.getElementById("imageInput");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    
    const helperText = document.getElementById("helperText");
    const submitBtn = document.getElementById("submitBtn");

    // 뒤로가기
    backBtn.addEventListener("click", () => {
        window.location.href = "posts.html";
    });

    // 이미지 선택 시 파일명 표시
    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
        } else {
            fileNameDisplay.textContent = "파일을 선택해주세요.";
        }
    });

    // 버튼 활성화 상태 업데이트
    function updateButtonState() {
        const titleValue = titleInput.value.trim();
        const contentValue = contentInput.value.trim();

        if (titleValue.length > 0 && contentValue.length > 0) {
            submitBtn.classList.add("active");
        } else {
            submitBtn.classList.remove("active");
        }
    }

    // 입력 감지
    titleInput.addEventListener("input", () => {
        helperText.textContent = "";
        updateButtonState();
    });

    contentInput.addEventListener("input", () => {
        helperText.textContent = "";
        updateButtonState();
    });

    // 완료 버튼 클릭 시 Fetch 실행
    submitBtn.addEventListener("click", async () => {
        const titleValue = titleInput.value.trim();
        const contentValue = contentInput.value.trim();
        const imageFile = imageInput.files[0];

        // 1. 유효성 검사
        if (titleValue === "" || contentValue === "") {
            helperText.textContent = "*제목, 내용을 모두 작성해주세요";
            return;
        }

        submitBtn.disabled = true;

        // 2. 데이터 포장 (FormData 사용)
        const formData = new FormData();
        formData.append("title", titleValue);
        formData.append("content", contentValue);
        
        // 이미지가 있을 때만 추가
        if (imageFile) {
            formData.append("image", imageFile); 
        }

        // 3. 서버로 전송 
        try {
            const response = await fetch(`${BASE_URL}/posts`, {
                method: "POST",
                credentials: "include", 
                body: formData 
            });

            if (response.ok) {
                alert("게시글이 등록되었습니다!");
                window.location.href = "posts.html";
            } else {
                const errorData = await response.json();
                alert(errorData.detail || "게시글 등록에 실패했습니다.");
            
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error("Upload Error:", error);
            alert("서버 연결에 실패했습니다.");

            submitBtn.disabled = false;
        }
    });
});