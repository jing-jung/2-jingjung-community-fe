import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;

document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("loginBtn");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");

    function validateEmail() {
        const email = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 

        if (email === "") {
            emailError.textContent = "* 이메일을 입력해주세요.";
            return false;
        } else if (!emailRegex.test(email)) {
            emailError.textContent = "* 올바른 이메일 주소 형식을 입력해주세요. (예: example@adapterz.kr)";
            return false;
        } else {
            emailError.textContent = "";
            return true;
        }
    }

    function validatePassword() {
        const password = passwordInput.value;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (password === "") {
            passwordError.textContent = "* 비밀번호를 입력해주세요";
            return false;
        } else if (!passwordRegex.test(password)) {
            passwordError.textContent = "* 비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
            return false;
        } else {
            passwordError.textContent = "";
            return true;
        }
    }

    function updateButtonState() {
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();

        if (isEmailValid && isPasswordValid) {
            loginBtn.disabled = false;
            loginBtn.classList.add("active");
        } else {
            loginBtn.disabled = true;
            loginBtn.classList.remove("active");
        }
    }

    emailInput.addEventListener("input", updateButtonState);
    passwordInput.addEventListener("input", updateButtonState);

    loginBtn.addEventListener("click", async () => {
        const email = emailInput.value;
        const password = passwordInput.value;
        loginBtn.disabled = true;

        try {
            const response = await fetch(`${BASE_URL}/users/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", 
                body: JSON.stringify({
                    email: email,
                    password: password,
                }),
            });

            if (response.ok) {
                alert("로그인 성공! 게시글 목록 페이지로 이동합니다.");
                window.location.href = "posts.html";
            } else {
                const errorData = await response.json();
                alert(errorData.detail || "이메일 또는 비밀번호를 확인해주세요.");
                loginBtn.disabled = false;
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("서버 연결에 실패했습니다. 백엔드가 켜져있는지 확인해주세요.");
            loginBtn.disabled = false;
        }
    });
});