export function initTurnipModule(BASE_URL) {
    const turnipBtn = document.getElementById("turnipBtn");
    const turnipModal = document.getElementById("turnipModal");
    const closeTurnipModal = document.getElementById("closeTurnipModal");
    const buyTurnipBtn = document.getElementById("buyTurnipBtn");
    const sellTurnipBtn = document.getElementById("sellTurnipBtn");
    const turnipQuantity = document.getElementById("turnipQuantity");
    const myTurnipCountElem = document.getElementById("myTurnipCount");
    const currentTurnipPriceElem = document.getElementById("currentTurnipPrice");

    let currentPrice = 0;

    async function updateTurnipPrice() {
        try {
            const res = await fetch(`${BASE_URL}/turnips/price`);
            if (res.ok) {
                const data = await res.json();
                currentPrice = data.current_price;
                currentTurnipPriceElem.textContent = currentPrice;
            } else {
                currentTurnipPriceElem.textContent = "??";
            }
        } catch (e) {
            console.error("Error fetching turnip price:", e);
            currentTurnipPriceElem.textContent = "??";
        }
    }

    async function tradeTurnips(type, quantity) {
        if (currentPrice <= 0) {
            alert("시세 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.");
            return;
        }
        try {
            const res = await fetch(`${BASE_URL}/turnips/trade`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, quantity, price: currentPrice }),
                credentials: "include"
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                myTurnipCountElem.textContent = data.turnip_amount || 0;
                if(window.updateHeader) {
                    window.updateHeader();
                }
            } else {
                alert(data.detail || "거래에 실패했습니다.");
            }
        } catch (e) {
            console.error("Error trading turnips:", e);
            alert("거래 중 오류가 발생했습니다.");
        }
    }

    if (turnipBtn) {
        turnipBtn.addEventListener("click", async () => {
            await updateTurnipPrice(); // 시세 먼저 업데이트
            try {
                const res = await fetch(`${BASE_URL}/users/me`, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    myTurnipCountElem.textContent = data.turnip || 0;
                } else {
                    myTurnipCountElem.textContent = "??";
                }
            } catch (e) {
                myTurnipCountElem.textContent = "??";
            }
            
            turnipModal.classList.remove("hidden");
            document.body.classList.add("no-scroll");
        });
    }

    if (closeTurnipModal) {
        closeTurnipModal.addEventListener("click", () => {
            turnipModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
            turnipQuantity.value = "";
        });
    }

    if (buyTurnipBtn) {
        buyTurnipBtn.addEventListener("click", () => {
            const qty = parseInt(turnipQuantity.value);
            if (!qty || qty <= 0) {
                alert("수량을 올바르게 입력해주세요.");
                return;
            }
            tradeTurnips("buy", qty);
            turnipQuantity.value = "";
        });
    }

    if (sellTurnipBtn) {
        sellTurnipBtn.addEventListener("click", () => {
            const qty = parseInt(turnipQuantity.value);
            if (!qty || qty <= 0) {
                alert("수량을 올바르게 입력해주세요.");
                return;
            }
            tradeTurnips("sell", qty);
            turnipQuantity.value = "";
        });
    }
}