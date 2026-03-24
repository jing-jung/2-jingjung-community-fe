import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;
import './header.js';

document.addEventListener("DOMContentLoaded", () => {

    const passwordInput = document.getElementById("password");
    const passwordError = document.getElementById("passwordError");
    
    const passwordConfirmInput = document.getElementById("passwordConfirm");
    const passwordConfirmError = document.getElementById("passwordConfirmError");
    
    const submitBtn = document.getElementById("submitBtn");
    const toastMessage = document.getElementById("toastMessage");

    let isPasswordValid = false;
    let isPasswordConfirmValid = false;

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


    function validatePassword() {
        const password = passwordInput.value;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (password === "") {
            passwordError.textContent = "*비밀번호를 입력해주세요";
            isPasswordValid = false;
        } else if (!passwordRegex.test(password)) {
            passwordError.textContent = "*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
            isPasswordValid = false;
        } else {
            passwordError.textContent = "";
            isPasswordValid = true;
        }
        
        if (passwordConfirmInput.value.length > 0) {
            validatePasswordConfirm();
        } else {
            checkAllValid();
        }
    }

    function validatePasswordConfirm() {
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;

        if (passwordConfirm === "") {
            passwordConfirmError.textContent = "*비밀번호를 한번 더 입력해주세요";
            isPasswordConfirmValid = false;
        } else if (password !== passwordConfirm) {
            passwordConfirmError.textContent = "*비밀번호가 다릅니다.";
            isPasswordConfirmValid = false;
        } else {
            passwordConfirmError.textContent = "";
            isPasswordConfirmValid = true;
        }
        checkAllValid();
    }

    function checkAllValid() {
        if (isPasswordValid && isPasswordConfirmValid) {
            submitBtn.disabled = false;
            submitBtn.classList.add("active");
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove("active");
        }
    }

    passwordInput.addEventListener("input", validatePassword);
    passwordConfirmInput.addEventListener("input", validatePasswordConfirm);

    // [Fetch] 비밀번호 수정 요청 (PUT)
    submitBtn.addEventListener("click", async () => {
        const password = passwordInput.value;

        if (!isPasswordValid || !isPasswordConfirmValid) return;

        submitBtn.disabled = true;

        try {
            const response = await fetch(`${BASE_URL}/users/me/password`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    password: passwordInput.value 
                }),
            });

            if (response.ok) {
                showToast("수정 완료");
                passwordInput.value = "";
                passwordConfirmInput.value = "";
                checkAllValid(); 
                isPasswordValid = false;
                isPasswordConfirmValid = false;
            } else {
                const errorData = await response.json();
                alert(errorData.detail || "비밀번호 수정에 실패했습니다.");
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error("Update Error:", error);
            alert("서버 연결에 실패했습니다.");
            submitBtn.disabled = false;
        }
    });

    function showToast(message) {
        toastMessage.textContent = message;
        toastMessage.classList.add("show");
        setTimeout(() => {
            toastMessage.classList.remove("show");
        }, 2000);
    }
});