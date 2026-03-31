import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const makeRequest = (i) => {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`Request ${i}: Status ${res.statusCode}`);
      resolve(res.statusCode);
    });

    req.on('error', (e) => {
      console.error(`Request ${i} Failed:`, e);
      resolve(null);
    });

    req.write(JSON.stringify({ email: 'test@example.com', password: 'password' }));
    req.end();
  });
};

async function runTest() {
  console.log("Starting Rate Limit Test (Expect 429 after 10 requests)...");
  for (let i = 1; i <= 15; i++) {
    await makeRequest(i);
  }
}

runTest();
