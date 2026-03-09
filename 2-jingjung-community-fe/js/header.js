import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;

document.addEventListener('DOMContentLoaded', function() {
    // Dynamically add header.css to the head
    const head = document.head;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './css/header.css'; // Assuming header.css is in the css folder
    head.appendChild(link);

    // Create a placeholder for the header
    const headerPlaceholder = document.createElement('div');
    headerPlaceholder.id = 'header-placeholder'; // Give it an ID for easier targeting
    document.body.prepend(headerPlaceholder);

    // Fetch header.html content
    fetch('header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            headerPlaceholder.innerHTML = data;
            initializeHeader();
        })
        .catch(error => {
            console.error('Error fetching header:', error);
            headerPlaceholder.innerHTML = '<p style="text-align: center; color: red;">Error loading header.</p>';
        });
});

function initializeHeader() {
    const headerProfileIcon = document.getElementById('headerProfileIcon');
    const headerDropdown = document.getElementById('headerDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const chatNotificationDot = document.getElementById("chat-notification-dot");

    async function loadMyProfile() {
        try {
            const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
            if (res.ok) {
                const user = await res.json();
                if (user.profile_image && headerProfileIcon) {
                    let imgUrl = user.profile_image;
                    if (!imgUrl.startsWith("http")) imgUrl = BASE_URL + imgUrl;
                    
                    headerProfileIcon.style.backgroundImage = `url('${imgUrl}')`;
                    headerProfileIcon.style.backgroundSize = "cover";
                    headerProfileIcon.style.backgroundColor = "transparent"; 
                }
            } else if (res.status === 401) {
                console.log("User not authenticated for header profile.");
            }
        } catch (e) {
            console.error("내 정보 로딩 실패:", e);
        }
    }
    
    async function checkUnreadMessages() {
        try {
            const res = await fetch(`${BASE_URL}/api/chats`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                const totalUnread = data.chats.reduce((sum, chat) => sum + chat.unread_count, 0);
                if (totalUnread > 0) {
                    chatNotificationDot.classList.remove("hidden");
                } else {
                    chatNotificationDot.classList.add("hidden");
                }
            } else if (res.status === 401) {
                chatNotificationDot.classList.add("hidden");
            }
        } catch (e) {
            console.error("안읽은 메시지 확인 실패:", e);
        }
    }

    loadMyProfile(); 
    checkUnreadMessages();

    if (headerProfileIcon && headerDropdown) {
        headerProfileIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            headerDropdown.classList.toggle('hidden');
        });
        headerDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`${BASE_URL}/users/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                if(response.ok) {
                    alert('로그아웃 되었습니다.');
                    localStorage.removeItem('access_token');
                    window.location.href = 'login.html';
                } else {
                    alert('로그아웃에 실패했습니다.');
                }
            } catch (e) {
                console.error('로그아웃 에러', e);
                alert('오류가 발생했습니다.');
            }
        });
    }

    window.addEventListener('click', function(e) {
        if (headerDropdown && !headerDropdown.classList.contains('hidden')) {
            headerDropdown.classList.add('hidden');
        }
    });
}