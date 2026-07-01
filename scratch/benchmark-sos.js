/**
 * NestJS SOS Requests Performance Benchmark Script
 * Simulates sending concurrent SOS requests to measure backend performance.
 */

const TOTAL_REQUESTS = 10000;
const CONCURRENCY = 200; // Number of parallel requests at a time
const TARGET_URL = 'http://localhost:8585/sos-requests';

console.log(`====================================================`);
console.log(`Starting SOS Request Benchmark`);
console.log(`Target: ${TARGET_URL}`);
console.log(`Total Requests: ${TOTAL_REQUESTS}`);
console.log(`Concurrency Limit: ${CONCURRENCY}`);
console.log(`====================================================\n`);

async function sendSosRequest(index) {
  const payload = {
    requesterName: 'Người dân giả lập',
    requesterPhone: '0912345678',
    requestType: 'FLOOD',
    latitude: 10.7 + (Math.random() * 0.1),
    longitude: 106.6 + (Math.random() * 0.1),
    severity: Math.random() > 0.5 ? 'HIGH' : 'CRITICAL',
    trappedPeopleCount: Math.floor(Math.random() * 5) + 1,
    imageUrls: ['https://storage.rescue.gov.vn/sos/img.jpg']
  };

  const start = Date.now();
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const latency = Date.now() - start;
    if (res.status === 201) {
      return { success: true, latency };
    } else {
      const text = await res.text();
      return { success: false, latency, error: `Status ${res.status}: ${text.substring(0, 50)}` };
    }
  } catch (err) {
    const latency = Date.now() - start;
    return { success: false, latency, error: err.message };
  }
}

async function runBenchmark() {
  const overallStart = Date.now();
  let completed = 0;
  let successCount = 0;
  let failureCount = 0;
  const latencies = [];
  const errors = new Map();

  // Worker function to consume requests from a queue
  async function worker(workerId) {
    while (completed < TOTAL_REQUESTS) {
      const currentTaskIndex = completed++;
      if (currentTaskIndex >= TOTAL_REQUESTS) break;

      // Print progress periodically
      if (currentTaskIndex > 0 && currentTaskIndex % 1000 === 0) {
        const elapsedSec = (Date.now() - overallStart) / 1000;
        const currentRps = (currentTaskIndex / elapsedSec).toFixed(1);
        console.log(`[Progress] Sent ${currentTaskIndex}/${TOTAL_REQUESTS} requests... (RPS: ${currentRps})`);
      }

      const result = await sendSosRequest(currentTaskIndex);
      latencies.push(result.latency);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        errors.set(result.error, (errors.get(result.error) || 0) + 1);
      }
    }
  }

  // Start concurrent workers
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(i));
  }

  // Wait for all workers to finish
  await Promise.all(workers);

  const overallDuration = Date.now() - overallStart;
  const overallDurationSec = overallDuration / 1000;
  const rps = (successCount + failureCount) / overallDurationSec;

  // Calculate statistics
  latencies.sort((a, b) => a - b);
  const minLatency = latencies[0] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;
  const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / (latencies.length || 1);
  
  // Percentiles
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`\n================ BENCHMARK RESULTS ================`);
  console.log(`Total Time Taken:      ${overallDurationSec.toFixed(2)} seconds`);
  console.log(`Successful Requests:  ${successCount}`);
  console.log(`Failed Requests:      ${failureCount}`);
  console.log(`Requests per Second:  ${rps.toFixed(2)} RPS`);
  console.log(`---------------- Latency Statistics ----------------`);
  console.log(`Min Latency:          ${minLatency} ms`);
  console.log(`Max Latency:          ${maxLatency} ms`);
  console.log(`Average Latency:      ${avgLatency.toFixed(1)} ms`);
  console.log(`50th Percentile (p50): ${p50} ms`);
  console.log(`90th Percentile (p90): ${p90} ms`);
  console.log(`95th Percentile (p95): ${p95} ms`);
  console.log(`99th Percentile (p99): ${p99} ms`);
  
  if (errors.size > 0) {
    console.log(`----------------- Error Summary -----------------`);
    for (const [errMsg, count] of errors.entries()) {
      console.log(`- [Count: ${count}] ${errMsg}`);
    }
  }
  console.log(`====================================================\n`);
}

runBenchmark();
