const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Flood Request Transition & Constraints Verification Script ---\n');

  try {
    // 1. Log in as System Admin
    console.log('Logging in as admin@system.com...');
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 8585,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: 'admin@system.com',
      password: 'Admin@123',
    });

    if (loginRes.status !== 201 && loginRes.status !== 200) {
      console.error('Failed to log in as admin:', loginRes.body);
      return;
    }

    const token = loginRes.body.accessToken;
    console.log('Admin login successful! Token retrieved.\n');

    // 2. Submit a flood request with purpose REQUEST_SUPPORT (for dispatching)
    console.log('Submitting a REQUEST_SUPPORT flood request (default status: PENDING)...');
    const mockSupportRequest = {
      title: 'Cần hỗ trợ cứu hộ xuồng ngập sâu Quận 2',
      description: 'Nước ngập hơn 1m, có 3 người già bị kẹt',
      requesterName: 'Trần Cứu Hộ',
      requesterPhone: '0987111222',
      latitude: 10.7989,
      longitude: 106.6804,
      severity: 'CRITICAL',
      purpose: 'REQUEST_SUPPORT',
    };

    const createRes = await makeRequest({
      hostname: 'localhost',
      port: 8585,
      path: '/flood-requests',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, mockSupportRequest);

    const reqId = createRes.body.id;
    console.log(`Created REQUEST_SUPPORT FloodRequest ID: ${reqId}, Status: ${createRes.body.status}\n`);

    // 3. Attempt to dispatch while status is PENDING (should fail)
    console.log(`Attempting to dispatch request #${reqId} while status is PENDING (should fail)...`);
    const dispatchPendingRes = await makeRequest({
      hostname: 'localhost',
      port: 8585,
      path: `/flood-requests/${reqId}/dispatch`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    }, {
      method: 'AUTO',
    });

    console.log('Status code:', dispatchPendingRes.status);
    console.log('Body:', dispatchPendingRes.body);
    if (dispatchPendingRes.status === 400 && dispatchPendingRes.body.message.includes('VERIFYING')) {
      console.log('SUCCESS: Correctly rejected dispatch on PENDING request with 400 error.\n');
    } else {
      console.log('FAILED: Request was not rejected correctly.\n');
    }

    // 4. Update status to VERIFYING
    console.log(`Updating status of request #${reqId} to VERIFYING...`);
    const updateStatusRes = await makeRequest({
      hostname: 'localhost',
      port: 8585,
      path: `/flood-requests/${reqId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    }, {
      status: 'VERIFYING',
      reviewNotes: 'Đang xác minh thông tin ngập lụt.',
    });
    console.log('Update Status Code:', updateStatusRes.status, 'New Status:', updateStatusRes.body.status);
    if (updateStatusRes.status === 200 && updateStatusRes.body.status === 'VERIFYING') {
      console.log('SUCCESS: Updated status to VERIFYING successfully.\n');
    } else {
      console.log('FAILED: Status update failed.\n');
    }

    // 5. Dispatch the request (should succeed)
    console.log(`Dispatching request #${reqId} now that it is VERIFYING...`);
    const dispatchSuccessRes = await makeRequest({
      hostname: 'localhost',
      port: 8585,
      path: `/flood-requests/${reqId}/dispatch`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    }, {
      method: 'AUTO',
    });

    console.log('Dispatch Status Code:', dispatchSuccessRes.status);
    console.log('Response status:', dispatchSuccessRes.body.status, 'Linked SOS ID:', dispatchSuccessRes.body.linkedSosId);
    if (dispatchSuccessRes.status === 201 && dispatchSuccessRes.body.status === 'DISPATCHED') {
      console.log('SUCCESS: Dispatched and linked to SOS request successfully!\n');
    } else {
      console.log('FAILED: Dispatch failed.\n');
    }

    // 6. Attempt to dispatch again (should fail with 400 because status is already DISPATCHED)
    console.log(`Attempting to dispatch already dispatched request #${reqId} again (should fail)...`);
    const dispatchAgainRes = await makeRequest({
      hostname: 'localhost',
      port: 8585,
      path: `/flood-requests/${reqId}/dispatch`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    }, {
      method: 'AUTO',
    });

    console.log('Status code:', dispatchAgainRes.status);
    console.log('Body:', dispatchAgainRes.body);
    if (dispatchAgainRes.status === 400) {
      console.log('SUCCESS: Correctly rejected double-dispatch.\n');
    } else {
      console.log('FAILED: Double-dispatch was not prevented!\n');
    }

    // 7. Verify audit log or timeline tracking
    console.log(`Fetching history timeline for request #${reqId}...`);
    const historyRes = await makeRequest({
      hostname: 'localhost',
      port: 8585,
      path: `/flood-requests/${reqId}/history`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });

    console.log('Timeline length:', historyRes.body.length);
    console.log('Timeline entries:');
    historyRes.body.forEach((entry, idx) => {
      console.log(`  ${idx + 1}. [${entry.fromStatus || 'NULL'} -> ${entry.toStatus}] changer: ${entry.changedBy}, note: "${entry.note}", SOS ID: ${entry.sosId}, Team Name: ${entry.rescueTeamName}`);
    });

    console.log('\nAll tests completed successfully!');

  } catch (err) {
    console.error('Error running transitions test:', err.message);
  }
}

run();
