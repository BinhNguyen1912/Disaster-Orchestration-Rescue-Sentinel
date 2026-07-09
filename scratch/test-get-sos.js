
async function main() {
  const backendUrl = 'http://localhost:8585';
  
  console.log("1. Logging in...");
  const loginRes = await fetch(`${backendUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'toan.dv@resident.vn',
      password: 'Rescue@123',
      provinceId: 2
    })
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.statusText}`);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  console.log("🟢 Login successful!");
  
  console.log("2. Fetching /sos-requests?provinceId=2&limit=50...");
  const res = await fetch(`${backendUrl}/sos-requests?provinceId=2&limit=50`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log("Status Code:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
