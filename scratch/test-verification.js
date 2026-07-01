const io = require('socket.io-client');

async function main() {
  const backendUrl = 'http://localhost:8585';
  
  console.log("1. Đăng nhập tài khoản Đội trưởng: toan.dv@resident.vn...");
  const loginRes = await fetch(`${backendUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'toan.dv@resident.vn',
      password: '123123',
      provinceId: 28
    })
  });
  
  if (!loginRes.ok) {
    throw new Error(`Đăng nhập thất bại: ${loginRes.statusText}`);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  console.log("🟢 Đăng nhập thành công! Token:", token.substring(0, 30) + "...");
  
  console.log("2. Kết nối WebSocket /dispatch...");
  const socket = io(`${backendUrl}/dispatch`, {
    query: { provinceId: '28', role: 'TEAM_LEADER' },
    auth: { token: `Bearer ${token}` },
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log("🟢 Socket connected! ID:", socket.id);
    socket.emit('join:team', { teamId: 3 });
  });

  socket.on('joined', (data) => {
    console.log("⚡ Đã tham gia phòng:", data.room);
  });
  
  socket.on('sos:offer', (offer) => {
    console.log("📩 NHẬN ĐƯỢC LỜI MỜI CỨU HỘ:", offer);
    console.log("👉 Đang bấm nhận việc...");
    socket.emit('sos:claim', { sosId: offer.sosId, teamId: 3 });
  });
  
  socket.on('sos:claim-result', (res) => {
    console.log("🏆 KẾT QUẢ TIẾP NHẬN (sos:claim-result):", res);
    setTimeout(() => {
      socket.disconnect();
      console.log("Done test. Exit.");
      process.exit(0);
    }, 2000);
  });

  socket.on('connect_error', (err) => {
    console.error("Socket connection error:", err);
  });
  
  // Tạo SOS mới sau khi kết nối ổn định
  setTimeout(async () => {
    console.log("3. Gửi yêu cầu SOS khẩn cấp mẫu tại Quận 1...");
    const sosRes = await fetch(`${backendUrl}/sos-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requesterName: "Nguyễn Văn Test",
        requesterPhone: "0909000999",
        requestType: "FLOOD",
        latitude: 10.7769, // Tọa độ Quận 1 gần các đội
        longitude: 106.7009,
        description: "Ngập úng nghiêm trọng tầng trệt test hybrid dispatch",
        severity: "HIGH",
        provinceId: 28,
        adminUnitId: 5026, // Phường Bến Nghé/Quận 1 (Thủ Dầu Một/HCM in seeded data)
        trappedPeopleCount: 2,
        requiresEquipment: false,
        imageUrls: []
      })
    });
    
    if (!sosRes.ok) {
      const err = await sosRes.json();
      console.error("🔴 Lỗi tạo SOS:", err);
    } else {
      const newSos = await sosRes.json();
      console.log("🟢 Tạo SOS thành công! ID:", newSos.id);
    }
  }, 3000);
}

main().catch(console.error);
