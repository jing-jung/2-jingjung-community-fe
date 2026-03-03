const BASE_URL = CONFIG.BASE_URL; 

document.addEventListener("DOMContentLoaded", () => {
    // 1. 요소 가져오기
    const backBtn = document.getElementById("backBtn");
    const profileCircle = document.getElementById("profileCircle");
    const profileImgInput = document.getElementById("profileImg");
    const profileError = document.getElementById("profileError");

    const emailInput = document.getElementById("email");
    const emailError = document.getElementById("emailError");

    const passwordInput = document.getElementById("password");
    const passwordError = document.getElementById("passwordError");

    const passwordConfirmInput = document.getElementById("passwordConfirm");
    const passwordConfirmError = document.getElementById("passwordConfirmError");

    const nicknameInput = document.getElementById("nickname");
    const nicknameError = document.getElementById("nicknameError");

    const signupBtn = document.getElementById("signupBtn");

    let isProfileValid = false;
    let isEmailValid = false;
    let isPasswordValid = false;
    let isPasswordConfirmValid = false;
    let isNicknameValid = false;

    // 2. 뒤로가기 버튼
    backBtn.addEventListener("click", () => {
        window.location.href = "login.html";
    });

    // 3. 프로필 이미지 로직 
    profileCircle.addEventListener("click", () => {
        profileImgInput.click();
    });

    profileImgInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        
        if (file) {
            // 파일이 선택된 경우: 미리보기 표시
            const reader = new FileReader();
            reader.onload = (e) => {
                profileCircle.style.backgroundImage = `url('${e.target.result}')`;
                profileCircle.innerHTML = ""; 
                profileCircle.style.border = "none";
            };
            reader.readAsDataURL(file);
            isProfileValid = true;
            profileError.textContent = "";
        } else {
            // 파일 선택 취소 시
            profileCircle.style.backgroundImage = "none";
            profileCircle.innerHTML = '<div class="plus-icon">+</div>';
            isProfileValid = false;
            profileError.textContent = "* 프로필 사진을 추가해주세요.";
        }
        checkAllValid();
    });

    // 4. 유효성 검사 함수들 
    
    // 이메일
    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email === "") {
            emailError.textContent = "* 이메일을 입력해주세요.";
            isEmailValid = false;
        } else if (!emailRegex.test(email)) {
            emailError.textContent = "* 올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)";
            isEmailValid = false;
        } else {
            emailError.textContent = "";
            isEmailValid = true;
        }
        checkAllValid();
    }

    // 비밀번호
    function validatePassword() {
        const password = passwordInput.value;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

        if (password === "") {
            passwordError.textContent = "* 비밀번호를 입력해주세요";
            isPasswordValid = false;
        } else if (!passwordRegex.test(password)) {
            passwordError.textContent = "* 비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
            isPasswordValid = false;
        } else {
            passwordError.textContent = "";
            isPasswordValid = true;
        }
        validatePasswordConfirm(); 
        checkAllValid();
    }

    // 비밀번호 확인
    function validatePasswordConfirm() {
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;

        if (passwordConfirm === "" && isPasswordValid) { 
             passwordConfirmError.textContent = "* 비밀번호를 한번 더 입력해주세요";
             isPasswordConfirmValid = false;
        } else if (password !== passwordConfirm) {
            passwordConfirmError.textContent = "* 비밀번호가 다릅니다.";
            isPasswordConfirmValid = false;
        } else {
            passwordConfirmError.textContent = "";
            isPasswordConfirmValid = true;
        }
        checkAllValid();
    }

    // 닉네임
    function validateNickname() {
        const nickname = nicknameInput.value;
        const hasSpace = /\s/.test(nickname);

        const hasSpecialChar = /[<>"&']/.test(nickname);

        if (nickname === "") {
            nicknameError.textContent = "* 닉네임을 입력해주세요.";
            isNicknameValid = false;
        } else if (hasSpace) {
            nicknameError.textContent = "* 띄어쓰기를 없애주세요.";
            isNicknameValid = false;
        } else if (hasSpecialChar) {
        nicknameError.textContent = "* 특수문자(<, >, &, \", ')는 사용할 수 없습니다.";
        isNicknameValid = false; 
        } else if (nickname.length > 10) {
            nicknameError.textContent = "* 닉네임은 최대 10자 까지 작성 가능합니다.";
            isNicknameValid = false;
        } else {
            nicknameError.textContent = "";
            isNicknameValid = true;
        }
        checkAllValid();
    }

    function checkAllValid() {
        if (isProfileValid && isEmailValid && isPasswordValid && isPasswordConfirmValid && isNicknameValid) {
            signupBtn.disabled = false;
            signupBtn.classList.add("active");
        } else {
            signupBtn.disabled = true;
            signupBtn.classList.remove("active");
        }
    }

    emailInput.addEventListener("focusout", validateEmail);
    emailInput.addEventListener("input", validateEmail);

    passwordInput.addEventListener("focusout", validatePassword);
    passwordInput.addEventListener("input", validatePassword);

    passwordConfirmInput.addEventListener("focusout", validatePasswordConfirm);
    passwordConfirmInput.addEventListener("input", validatePasswordConfirm);

    nicknameInput.addEventListener("focusout", validateNickname);
    nicknameInput.addEventListener("input", validateNickname);

    // 6. 회원가입 버튼 클릭 시
    signupBtn.addEventListener("click", async () => {
        const formData = new FormData();
        signupBtn.disabled = true;
        
        formData.append("email", emailInput.value.trim());
        formData.append("password", passwordInput.value);
        formData.append("nickname", nicknameInput.value.trim());
        
        // 프로필 이미지가 있다면 추가
        const file = profileImgInput.files[0];
        if (file) {
            formData.append("profile_image", file);
        }

        try {
            const response = await fetch(`${BASE_URL}/users/signup`, {
                method: "POST",
                body: formData, 
            });

            if (response.ok) {
                alert("회원가입 성공! 로그인 페이지로 이동합니다.");
                window.location.href = "login.html";
            } else {
                const errorData = await response.json();
                alert(errorData.detail || "회원가입에 실패했습니다.");
                signupBtn.disabled = false;
            }
        } catch (error) {
            console.error("Signup Error:", error);
            alert("서버 연결에 실패했습니다.");

            signupBtn.disabled = false;
        }
    });
});