import { CONFIG } from './config.js';
const BASE_URL = CONFIG.BASE_URL;

document.addEventListener('DOMContentLoaded', function() {
    const headerPlaceholder = document.getElementById('header-placeholder');

    if (headerPlaceholder) {
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
    }
});

async function loadMyProfile() {
    const headerProfileIcon = document.getElementById('headerProfileIcon');
    const bellAmountSpan = document.querySelector('.bell-amount');

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

            if (bellAmountSpan && typeof user.bell_amount !== 'undefined') {
                bellAmountSpan.textContent = user.bell_amount.toLocaleString();
            }

            const headerTitle = document.getElementById('headerTitle');
            if (headerTitle && (window.location.pathname.endsWith('/posts.html') || window.location.pathname === '/')) {
                if (user.is_admin === true || user.role === 'admin') { 
                    headerTitle.textContent = "당신은 관리자 입니다.";
                    headerTitle.style.display = 'block';
                } else {
                    headerTitle.textContent = "";  
                }
            }

        } else if (res.status === 401) {
            if (bellAmountSpan) bellAmountSpan.textContent = '???';
            console.log("User not authenticated for header profile.");
        }
    } catch (e) {
        if (bellAmountSpan) bellAmountSpan.textContent = '???';
        console.error("내 정보 로딩 실패:", e);
    }
}

async function checkUnreadMessages() {
    const chatNotificationDot = document.getElementById("chat-notification-dot");
    try {
        const res = await fetch(`${BASE_URL}/chats`, { credentials: "include" });
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

// 다른 스크립트에서 헤더 정보를 업데이트할 수 있도록 window 객체에 함수를 할당합니다.
window.updateHeader = () => {
    loadMyProfile();
    checkUnreadMessages();
};

function initializeHeader() {
    const headerBackBtn = document.getElementById('headerBackBtn');
    const headerTitle = document.getElementById('headerTitle');
    const headerProfileIcon = document.getElementById('headerProfileIcon');
    const headerDropdown = document.getElementById('headerDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const headerMessageBtn = document.getElementById('headerMessageBtn');

    if (window.location.pathname.endsWith('/posts.html') || window.location.pathname === '/') {
        if (headerTitle) headerTitle.style.display = 'block';
        if (headerBackBtn) headerBackBtn.style.display = 'none';
    } else {
        if (headerTitle) headerTitle.style.display = 'none';
        if (headerBackBtn) headerBackBtn.style.display = 'block';
    }

    if (headerBackBtn) {
        headerBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            history.back();
        });
    }

    if (headerMessageBtn) {
        headerMessageBtn.addEventListener('click', () => {
            window.location.href = 'chatlist.html';
        });
    }

    // 초기 헤더 정보 로드
    window.updateHeader();

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