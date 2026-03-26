export function initMapModule(BASE_URL) {
    const mapBtn = document.getElementById("mapBtn");
    const mapModal = document.getElementById("mapModal");
    const closeMapModal = document.getElementById("closeMapModal");
    const mapContainer = document.getElementById("mapContainer");

    const landAreas = [
        { minX: 9.3, maxX: 50.3, minY: 11.4, maxY: 50.8 },
        { minX: 50.0, maxX: 91.0, minY: 11.4, maxY: 50.8 },
        { minX: 9.3, maxX: 91.0, minY: 50.8, maxY: 93.1 }
    ];

    function getRandomLandCoordinate() {
        const area = landAreas[Math.floor(Math.random() * landAreas.length)];
        const x = Math.random() * (area.maxX - area.minX) + area.minX;
        const y = Math.random() * (area.maxY - area.minY) + area.minY;
        return { x, y };
    }

    async function renderMapPins() {
        mapContainer.innerHTML = ""; 
        
        try {
            const res = await fetch(`${BASE_URL}/users/locations`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                const users = await res.json(); 

                users.forEach(user => {
                    const pinWrapper = document.createElement("div");
                    pinWrapper.className = "user-pin-wrapper";
                    
                    const coords = getRandomLandCoordinate();
                    pinWrapper.style.left = `${coords.x}%`;
                    pinWrapper.style.top = `${coords.y}%`;
                    
                    let imgUrl = user.image_url; 
                    if (imgUrl && !imgUrl.startsWith("http")) {
                        imgUrl = BASE_URL + imgUrl;
                    }
                    if (!imgUrl) {
                        imgUrl = "./images/default-profile.png"; 
                    }

                    const userName = user.nickname || "이름 모를 주민";
                    
                    pinWrapper.innerHTML = `
                        <div class="user-pin-tooltip">${userName}</div>
                        <div class="user-pin-marker">
                            <div class="user-pin-image" style="background-image: url('${imgUrl}')"></div>
                        </div>
                    `;
                    
                    pinWrapper.addEventListener("click", () => {
                        alert(`${userName} 주민의 위치입니다구리!`);
                    });

                    mapContainer.appendChild(pinWrapper);
                });
            } else {
                mapContainer.innerHTML = "<p style='margin-top: 50px; color: #888;'>주민 목록을 불러올 수 없습니다구리.<br>(백엔드 API 확인 필요)</p>";
            }
        } catch (error) {
            console.error(error);
        }
    }

    if (mapBtn) {
        mapBtn.addEventListener("click", () => {
            renderMapPins(); 
            mapModal.classList.remove("hidden");
            document.body.classList.add("no-scroll");
        });
    }

    if (closeMapModal) {
        closeMapModal.addEventListener("click", () => {
            mapModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
        });
    }
}