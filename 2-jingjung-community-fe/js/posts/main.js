import { CONFIG } from '../config.js';
import { initTurnipModule } from './turnip.js';
import { initTrainModule } from './train.js';
import { initMapModule } from './map.js';
import { initFeedModule } from './feed.js';

const BASE_URL = CONFIG.BASE_URL;

document.addEventListener("DOMContentLoaded", () => {
    // Initialize all modules
    initTurnipModule(BASE_URL);
    initTrainModule(BASE_URL);
    initMapModule(BASE_URL);
    initFeedModule(BASE_URL);

    // Keep shared/general logic in the main file
    const writeBtn = document.getElementById("writeBtn");

    async function checkLoginStatus() {
        try {
            const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
            if (!res.ok && res.status === 401) {
                if(writeBtn) writeBtn.style.display = 'none';
            }
        } catch (e) {
            console.error("Login status check failed:", e);
            if(writeBtn) writeBtn.style.display = 'none';
        }
    }
    checkLoginStatus();

    if (writeBtn) {
        writeBtn.addEventListener("click", () => {
            fetch(`${BASE_URL}/users/me`, { credentials: "include" })
                .then(res => {
                    if (res.ok) {
                        window.location.href = "write_post.html"; 
                    } else {
                        alert("로그인이 필요합니다.");
                        window.location.href = "login.html";
                    }
                })
                .catch(e => {
                    console.error("Login check failed:", e);
                    alert("로그인 상태 확인 중 오류가 발생했습니다.");
                });
        });
    }

    const datingBannerBtn = document.getElementById("datingBannerBtn");

    if (datingBannerBtn) {
        datingBannerBtn.addEventListener("click", () => {
            window.location.href = "matching.html";
        });
    }
});