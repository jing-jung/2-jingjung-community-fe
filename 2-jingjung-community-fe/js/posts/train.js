export function initTrainModule(BASE_URL) {
    const trainBtn = document.getElementById("trainBtn");
    const trainModal = document.getElementById("trainModal");
    const closeTrainModal = document.getElementById("closeTrainModal");
    const timetableList = document.getElementById("timetableList");
    
    const queueModal = document.getElementById("queueModal");
    const queueNumberSpan = document.getElementById("queueNumber");

    const checkMyReservationBtn = document.getElementById("checkMyReservationBtn");
    const myReservationModal = document.getElementById("myReservationModal");
    const closeMyReservationModal = document.getElementById("closeMyReservationModal");
    const ticketContainer = document.getElementById("ticketContainer");

    function renderTimetable() {
        timetableList.innerHTML = "";
        const now = new Date();
        const currentHour = now.getHours();

        for (let i = 9; i <= 22; i++) {
            const row = document.createElement("div");
            const isPast = i <= currentHour; 
            
            row.className = `timetable-row ${isPast ? 'past' : ''}`;
            const timeString = `${i < 10 ? '0'+i : i}:00 출발`;
            
            row.innerHTML = `
                <div class="time-info">${timeString}</div>
                <button class="reserve-btn">${isPast ? '마감' : '예매'}</button>
            `;

            if (!isPast) {
                const btn = row.querySelector('.reserve-btn');
                btn.addEventListener("click", () => {
                    startReservationQueue(i);
                });
            }
            timetableList.appendChild(row);
        }
    }

    function startReservationQueue(hour) {
        trainModal.classList.add("hidden"); 
        queueModal.classList.remove("hidden"); 
        
        let waitNumber = Math.floor(Math.random() * 200) + 50; 
        queueNumberSpan.textContent = waitNumber;

        const interval = setInterval(async () => {
            waitNumber -= Math.floor(Math.random() * 10) + 5; 
            
            if (waitNumber <= 0) {
                clearInterval(interval); 
                
                try {
                    const today = new Date();
                    const departureTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, 0, 0);
                    
                    const tzOffset = departureTime.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(departureTime - tzOffset)).toISOString().slice(0, 19).replace('T', ' ');

                    const res = await fetch(`${BASE_URL}/train/reserve`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ 
                            train_number: `Nook-${hour}00`, 
                            departure_time: localISOTime
                        })
                    });

                    if (res.ok) {
                        alert("기차표 예매가 완료되었습니다구리! 즐거운 여행 되세요! ✈️");
                    } else {
                        const error = await res.json();
                        alert(`예매 실패: ${error.detail}`);
                    }
                } catch (e) {
                    console.error("예매 에러", e);
                }

                queueModal.classList.add("hidden"); 
                document.body.classList.remove("no-scroll");
            } else {
                queueNumberSpan.textContent = waitNumber; 
            }
        }, 400); 
    }

    async function fetchAndRenderMyReservations() {
        ticketContainer.innerHTML = "<p>티켓을 조회하는 중입니다구리...</p>";
        try {
            const res = await fetch(`${BASE_URL}/train/reservations`, { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                const reservations = data.reservations;

                if (reservations.length === 0) {
                    ticketContainer.innerHTML = "<p>예매한 기차표가 없습니다구리!</p>";
                    return;
                }

                ticketContainer.innerHTML = "";
                const now = new Date();

                reservations.forEach(ticket => {
                    const depTime = new Date(ticket.departure_time);
                    const isExpired = depTime < now;

                    const ticketDiv = document.createElement("div");
                    ticketDiv.className = `train-ticket ${isExpired ? 'expired' : ''}`;
                    
                    const formattedTime = depTime.toLocaleString('ko-KR', { 
                        month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });

                    ticketDiv.innerHTML = `
                        <div class="ticket-left">
                            <div class="ticket-title">Nook Inc. 편도 탑승권</div>
                            <div class="ticket-time">${formattedTime} 출발</div>
                            <div class="ticket-info">편명: ${ticket.train_number}</div>
                            <div class="expired-stamp">기한 만료</div>
                        </div>
                        <div class="ticket-right">
                            <span style="font-size: 24px;">${isExpired ? 'X' : ' '}</span>
                            ${!isExpired ? `<button class="cancel-ticket-btn" data-id="${ticket.id}">취소하기</button>` : ''}
                        </div>
                    `;

                    if (!isExpired) {
                        const cancelBtn = ticketDiv.querySelector('.cancel-ticket-btn');
                        cancelBtn.addEventListener('click', async () => {
                            if (confirm("정말로 기차표 예매를 취소하시겠습니까구리?")) {
                                try {
                                    const delRes = await fetch(`${BASE_URL}/train/reservations/${ticket.id}`, {
                                        method: "DELETE",
                                        credentials: "include"
                                    });
                                    if (delRes.ok) {
                                        alert("예매가 취소되었습니다구리.");
                                        fetchAndRenderMyReservations();
                                    } else {
                                        alert("취소에 실패했습니다.");
                                    }
                                } catch (e) {
                                    console.error("취소 오류:", e);
                                }
                            }
                        });
                    }

                    ticketContainer.appendChild(ticketDiv);
                });
            } else {
                ticketContainer.innerHTML = "<p>로그인이 필요하거나 오류가 발생했습니다.</p>";
            }
        } catch (error) {
            console.error(error);
            ticketContainer.innerHTML = "<p>오류가 발생했습니다.</p>";
        }
    }

    if (trainBtn) {
        trainBtn.addEventListener("click", () => {
            renderTimetable(); 
            trainModal.classList.remove("hidden");
            document.body.classList.add("no-scroll");
        });
    }

    if (closeTrainModal) {
        closeTrainModal.addEventListener("click", () => {
            trainModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
        });
    }

    if (checkMyReservationBtn) {
        checkMyReservationBtn.addEventListener("click", () => {
            trainModal.classList.add("hidden");
            fetchAndRenderMyReservations();
            myReservationModal.classList.remove("hidden");
        });
    }

    if (closeMyReservationModal) {
        closeMyReservationModal.addEventListener("click", () => {
            myReservationModal.classList.add("hidden");
            document.body.classList.remove("no-scroll");
        });
    }
}