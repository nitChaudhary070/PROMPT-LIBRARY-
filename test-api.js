import fetch from 'node-fetch';

async function test() {
  try {
    // First login as admin
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);

    if (!loginData.token) return;

    // Fetch stats
    const statsRes = await fetch('http://localhost:3000/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const statsData = await statsRes.json();
    console.log('Stats:', statsData);
  } catch (e) {
    console.error(e);
  }
}

test();
