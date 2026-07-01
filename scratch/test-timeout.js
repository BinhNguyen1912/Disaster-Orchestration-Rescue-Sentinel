const { Client } = require('pg');

async function main() {
  const backendUrl = 'http://localhost:8585';
  
  console.log("1. Đăng nhập...");
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
  
  console.log("2. Gửi yêu cầu SOS khẩn cấp mẫu...");
  const sosRes = await fetch(`${backendUrl}/sos-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      requesterName: "Nguyễn Văn Timeout",
      requesterPhone: "0909000999",
      requestType: "FLOOD",
      latitude: 10.7769,
      longitude: 106.7009,
      description: "Test tự động gán cưỡng bức sau 30s",
      severity: "HIGH",
      provinceId: 28,
      adminUnitId: 5026,
      trappedPeopleCount: 1,
      requiresEquipment: false,
      imageUrls: []
    })
  });
  
  const newSos = await sosRes.json();
  const sosId = newSos.id;
  console.log(`🟢 Tạo SOS thành công! ID: ${sosId}. Chờ 35 giây để hết hạn đếm ngược...`);
  
  // Đếm ngược 35s
  let seconds = 35;
  const interval = setInterval(() => {
    seconds--;
    if (seconds % 5 === 0 || seconds < 5) {
      console.log(`Còn ${seconds} giây...`);
    }
    if (seconds <= 0) {
      clearInterval(interval);
      checkAssignment(sosId);
    }
  }, 1000);
}

async function checkAssignment(sosId) {
  console.log("3. Kiểm tra trạng thái gán trong database...");
  const client = new Client({
    connectionString: "postgresql://postgres:123123@localhost:5433/rescue_system",
  });
  await client.connect();
  
  const res = await client.query(`
    SELECT id, status, "assignedTeamId", "dispatchMethod"
    FROM sos_request
    WHERE id = $1
  `, [sosId]);
  
  const record = res.rows[0];
  console.log("🔎 Kết quả từ DB:", record);
  
  if (record.status === 'DISPATCHED' && record.assignedTeamId !== null) {
    console.log("🏆 THÀNH CÔNG: SOS đã được tự động gán cưỡng bức thành công!");
  } else {
    console.log("❌ THẤT BẠI: SOS vẫn chưa được gán.");
  }
  
  await client.end();
}

main().catch(console.error);
