const introSection = document.getElementById("introSection");
const datingSection = document.getElementById("datingSection");

const introMyImage = document.getElementById("introMyImage");
const introMyName = document.getElementById("introMyName");
const introMyBio = document.getElementById("introMyBio");
const submitBioBtn = document.getElementById("submitBioBtn");

const datingImage = document.getElementById("datingImage");
const datingName = document.getElementById("datingName");
const datingDesc = document.getElementById("datingDesc");
const btnLike = document.getElementById("btnLike");
const btnHate = document.getElementById("btnHate");
const exitMatchingBtn = document.getElementById("exitMatchingBtn");

let matchingUsers = [];
let currentUserIndex = 0;

const dummyBios = [
    "사과 먹고 싶어구리! 취미는 곤충 채집!",
    "오늘 날씨 최고구리! 나랑 낚시하러 갈래?",
    "꽃에 물 주는 거 좋아해구리! 상냥한 이웃을 찾아요!",
    "헬스보이! 나랑 운동할 이웃 어디 없나구리?",
    "별똥별 보고 싶어구리! 로맨틱한 이웃을 찾아요!"
];

document.addEventListener("DOMContentLoaded", () => {
    // 2. 내 프로필 불러오기 (여권)
    loadMyProfileDataForIntro();
});

async function loadMyProfileDataForIntro() {
    introMyName.textContent = "로딩 중...";
    try {
        const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
        if (res.ok) {
            const user = await res.json();
            
            if (user.profile_image) {
                let imgUrl = user.profile_image;
                if (!imgUrl.startsWith("http")) imgUrl = BASE_URL + imgUrl;
                introMyImage.src = imgUrl;
            }
            
            introMyName.textContent = user.nickname || user.username || "이름 모를 주민";
        }
    } catch (error) {
        introMyName.textContent = "에러구리!";
    }
}

async function loadMatchingUsers() {
    try {
        const res = await fetch(`${BASE_URL}/users`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            matchingUsers = await res.json();
            currentUserIndex = 0;
            showNextUser();
        }
    } catch (error) {
    }
}

function showNextUser() {
    if (currentUserIndex >= matchingUsers.length) {
        datingImage.src = "./images/default-profile.png";
        datingName.textContent = "끝!";
        datingDesc.textContent = "더 이상 추천할 이웃이 없습니다구리.";
        btnLike.style.display = "none";
        btnHate.style.display = "none";
        return;
    }

    btnLike.style.display = "flex";
    btnHate.style.display = "flex";

    const user = matchingUsers[currentUserIndex];
    
    let imgUrl = user.profile_image;
    if (imgUrl && !imgUrl.startsWith("http")) imgUrl = BASE_URL + imgUrl;
    if (!imgUrl) imgUrl = "./images/default-profile.png";

    datingImage.src = imgUrl;
    datingName.textContent = user.nickname || user.username || "이름 모를 주민";
    
    const randomBio = dummyBios[Math.floor(Math.random() * dummyBios.length)];
    datingDesc.textContent = randomBio;
}

if (submitBioBtn) {
    submitBioBtn.addEventListener("click", () => {
        const bioText = introMyBio.value;
        if (bioText.length < 5) {
            alert("소개글을 조금 더 성의 있게 작성하세요구리! (5자 이상)");
            return;
        }
        
        introSection.classList.add("hidden");
        datingSection.classList.remove("hidden");
        loadMatchingUsers();
    });
}

if (btnLike) {
    btnLike.addEventListener("click", () => {
        const likedUser = matchingUsers[currentUserIndex];
        const userName = likedUser.nickname || likedUser.username || "이웃";
        alert(`${userName}님에게 내 프로필과 사진을 보냈습니다!`);
        currentUserIndex++;
        showNextUser();
    });
}

if (btnHate) {
    btnHate.addEventListener("click", () => {
        currentUserIndex++;
        showNextUser();
    });
}

if (exitMatchingBtn) {
    exitMatchingBtn.addEventListener("click", () => {
        window.location.href = "posts.html";
    });
} 