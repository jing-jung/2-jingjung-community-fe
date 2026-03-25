import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;
import './header.js';

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

document.addEventListener("DOMContentLoaded", () => {
    loadMyProfileDataForIntro();
});

async function loadMyProfileDataForIntro() {
    introMyName.textContent = "로딩 중...";
    try {
        const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });

        if (!res.ok) {
            if (res.status === 401) {
                alert("매칭을 이용하려면 로그인이 필요합니다.");
                window.location.href = "login.html";
            } else {
                throw new Error("사용자 정보를 불러오는 데 실패했습니다.");
            }
            return;
        }

        const user = await res.json();

        // 사용자가 이미 자기소개를 작성했는지 확인
        if (user.bio && user.bio.trim().length >= 5) {
            // 작성했다면 바로 매칭 화면으로 전환
            switchToDatingSection();
            return; 
        }

        // --- 자기소개 작성이 필요한 경우 ---
        // 자기소개 섹션을 보여주고, 매칭 섹션은 숨김
        introSection.classList.remove("hidden");
        datingSection.classList.add("hidden");

        // 사용자 정보(프로필 사진, 닉네임)를 자기소개 섹션에 채워넣기
        if (user.profile_image) {
            let imgUrl = user.profile_image;
            if (!imgUrl.startsWith("http")) imgUrl = BASE_URL + imgUrl;
            introMyImage.src = imgUrl;
        } else {
            introMyImage.src = "./images/radish_7.png"; // 기본 이미지
        }
        
        introMyName.textContent = user.nickname || user.username || "이름 모를 주민";
        
    } catch (error) {
        console.error("Error loading profile data:", error);
        introMyName.textContent = "에러구리!";
        introMyImage.src = "./images/radish_7.png";
        alert("데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
}

function switchToDatingSection() {
    introSection.classList.add("hidden");
    datingSection.classList.remove("hidden");
    loadMatchingUsers();
}

async function loadMatchingUsers() {
    try {
        const res = await fetch(`${BASE_URL}/users/matching`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include" 
        });

        if (res.ok) {
            matchingUsers = await res.json();
            currentUserIndex = 0;
            showNextUser();
        }
    } catch (error) {
        console.error(error);
    }
}

function showNextUser() {
    if (!matchingUsers || matchingUsers.length === 0 || currentUserIndex >= matchingUsers.length) {
        datingImage.src = "./images/radish_7.png";
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
    if (!imgUrl) imgUrl = "./images/radish_7.png";

    datingImage.src = imgUrl;
    datingName.textContent = user.nickname || user.username || "이름 모를 주민";
    datingDesc.textContent = user.bio || "소개글이 아직 없습니다.";
}

if (submitBioBtn) {
    submitBioBtn.addEventListener("click", async () => {
        const bioText = introMyBio.value;
        if (bioText.length < 5) {
            alert("소개글을 조금 더 성의 있게 작성하세요구리! (5자 이상)");
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/users/me/bio`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ bio: bioText })
            });

            if (res.ok) {
                switchToDatingSection();
            } else {
                alert("소개글 저장에 실패했습니다구리.");
            }
        } catch (error) {
            console.error("소개글 저장 중 에러 발생:", error);
        }
    });
}

if (btnLike) {
    btnLike.addEventListener("click", async () => {
        if (matchingUsers[currentUserIndex]) {
            const likedUser = matchingUsers[currentUserIndex];
            const userName = likedUser.nickname || likedUser.username || "이웃";
            
            try {
                // 백엔드에 실제 채팅방 생성 요청 보내기
                const res = await fetch(`${BASE_URL}/chats`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: "include",
                    body: JSON.stringify({ recipient_id: likedUser.id })
                });

                if (res.ok) {
                    alert(`${userName}님과 연결되었습니다! '채팅 목록'에서 대화를 시작해보세요구리!`);
                } else {
                    console.error("채팅방 생성 실패");
                }
            } catch (error) {
                console.error("매칭 오류:", error);
            }

            currentUserIndex++;
            showNextUser();
        }
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