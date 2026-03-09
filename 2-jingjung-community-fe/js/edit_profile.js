const BASE_URL = CONFIG.BASE_URL; 

import './header.js'; // Import the common header logic
document.addEventListener("DOMContentLoaded", () => {
    // The header logic is now handled by js/header.js
    // Only page-specific logic remains here.
    const nicknameInput = document.getElementById("nickname");
    const nicknameError = document.getElementById("nicknameError");
    const submitBtn = document.getElementById("submitBtn");
    
    const withdrawBtn = document.getElementById("withdrawBtn");
    const withdrawModal = document.getElementById("withdrawModal");
    const modalCancelBtn = document.getElementById("modalCancelBtn");
    const modalConfirmBtn = document.getElementById("modalConfirmBtn");
    
    const toastMessage = document.getElementById("toastMessage");
    const profileInput = document.getElementById("profileInput");
    
    const emailText = document.querySelector(".email-text");

    let currentUserId = null;

    async function loadUserData() {
        try {
            const response = await fetch(`${BASE_URL}/users/me`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include" 
            });

            if (!response.ok) {
                throw new Error("사용자 정보를 불러올 수 없습니다.");
            }

            const user = await response.json();

            currentUserId = user.id;

            if (emailText) emailText.textContent = user.email;
            nicknameInput.value = user.nickname;

            const profileImgCircle = document.querySelector(".profile-img-circle"); // Get it here as it's page-specific
            const headerProfileIcon = document.getElementById("headerProfileIcon"); // Get it here as it's page-specific
            if (user.profile_image) {
                let imgUrl = user.profile_image;
                if (!imgUrl.startsWith("http")) imgUrl = BASE_URL + imgUrl;
                profileImgCircle.style.backgroundImage = `url('${imgUrl}')`;
                headerProfileIcon.style.backgroundImage = `url('${imgUrl}')`; // 헤더 아이콘에도 적용
                headerProfileIcon.style.backgroundSize = "cover";
            }

        } catch (error) {
            console.error("Load Error:", error);
            alert("로그인 정보가 없거나 만료되었습니다.");
            window.location.href = "login.html";
        }
    }
    
    loadUserData();

    // Check if user is logged in, otherwise redirect
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

    profileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profileImgCircle.style.backgroundImage = `url('${e.target.result}')`;
            };
            reader.readAsDataURL(file);
        }
    });

    // 회원 탈퇴 모달 열기/닫기
    withdrawBtn.addEventListener("click", () => {
        withdrawModal.classList.remove("hidden");
    });
    modalCancelBtn.addEventListener("click", () => {
        withdrawModal.classList.add("hidden");
    });


    function validateNickname() {
        const nickname = nicknameInput.value.trim();
    
        const hasSpecialChar = /[<>&"']/.test(nickname);

        if (nickname === "") {
            nicknameError.textContent = "*닉네임을 입력해주세요.";
            return false;
        } else if (hasSpecialChar) {
            nicknameError.textContent = "* 특수문자(<, >, &, \", ')는 사용할 수 없습니다.";
            return false; 
        } else if (nickname.length > 10) {
            nicknameError.textContent = "*닉네임은 최대 10자 까지 작성 가능합니다.";
            return false;
        } else {
            nicknameError.textContent = "";
            return true;
        }
    }

    nicknameInput.addEventListener("input", validateNickname);

    // 회원정보 수정 
    submitBtn.addEventListener("click", async () => {
        if (!validateNickname() || !currentUserId) {
            return; 
        }

        // 2. 전송 데이터 준비 
        const payload = {
            nickname: nicknameInput.value.trim()
        };

        try {
            const response = await fetch(`${BASE_URL}/users/${currentUserId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json", 
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                showToast("수정완료");
            } else {
                const errorData = await response.json();
                
                if (errorData.detail && typeof errorData.detail === 'string' && errorData.detail.includes("중복")) {
                     nicknameError.textContent = "*중복된 닉네임 입니다.";
                } else {
                     alert(errorData.detail || "수정에 실패했습니다.");
                }
            }
        } catch (error) {
            console.error("Update Error:", error);
            alert("서버 연결에 실패했습니다.");
        }
    });

    // 회원 탈퇴
    modalConfirmBtn.addEventListener("click", async () => {
        if (!currentUserId) return;

        try {
            const response = await fetch(`${BASE_URL}/users/me`, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok) {
                alert("회원 탈퇴가 완료되었습니다.");
                window.location.href = "login.html";
            
            }
        } catch (error) {
            console.error("Withdraw Error:", error);
        }
        withdrawModal.classList.add("hidden");
    });

    function showToast(message) {
        toastMessage.textContent = message;
        toastMessage.classList.add("show");
        setTimeout(() => {
            toastMessage.classList.remove("show");
        }, 2000);
    }
});