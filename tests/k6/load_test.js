import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom counters for clear reporting
const successBookings = new Counter('successful_bookings');
const conflictBookings = new Counter('conflict_bookings');
const serverErrors = new Counter('server_errors');

// Generate a UUID v4 string (compatible with PostgreSQL UUID column)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export let options = {
  // Scenario: 20 concurrent users attempt to book the SAME room for the SAME date.
  // With inventory = 1, exactly 1 should succeed.
  vus: 20,
  iterations: 20, // Each VU fires exactly 1 request — total 20 concurrent attempts
};

export default function () {
  const payload = JSON.stringify({
    user_id: uuidv4(), // Valid UUID v4 per request (DB column is UUID type)
    room_id: 1,
    start_date: '2024-12-25',
    end_date: '2024-12-26',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let res = http.post('http://localhost:8080/api/bookings', payload, params);

  // Track results
  if (res.status === 201) {
    successBookings.add(1);
  } else if (res.status === 409) {
    conflictBookings.add(1);
  } else if (res.status === 500) {
    serverErrors.add(1);
  }

  check(res, {
    'status is 201 (Booked!)': (r) => r.status === 201,
    'status is 409 (Conflict - Expected)': (r) => r.status === 409,
    'status is 500 (Server Error - Bug!)': (r) => r.status === 500,
  });

  // Log each response for debugging
  console.log(`VU ${__VU}: status=${res.status} body=${res.body}`);
}

// Summary handler — print clear pass/fail at the end
export function handleSummary(data) {
  const success = data.metrics.successful_bookings
    ? data.metrics.successful_bookings.values.count
    : 0;
  const conflicts = data.metrics.conflict_bookings
    ? data.metrics.conflict_bookings.values.count
    : 0;
  const errors = data.metrics.server_errors
    ? data.metrics.server_errors.values.count
    : 0;

  console.log('\n========================================');
  console.log('  BOOKING CONCURRENCY TEST RESULTS');
  console.log('========================================');
  console.log(`  ✅ Successful Bookings: ${success}`);
  console.log(`  🚫 Conflict (409):      ${conflicts}`);
  console.log(`  ❌ Server Errors (500):  ${errors}`);
  console.log('----------------------------------------');

  if (success === 1 && errors === 0) {
    console.log('  🎉 PASS: Exactly 1 booking succeeded!');
    console.log('     Distributed locking is working!');
  } else if (success > 1) {
    console.log('  🐛 FAIL: OVERBOOKING DETECTED!');
    console.log(`     ${success} bookings succeeded, but only 1 should!`);
  } else if (success === 0) {
    console.log('  ⚠️  WARNING: No bookings succeeded.');
    console.log('     Check if the server is running and DB is seeded.');
  }

  console.log('========================================\n');

  return {};
}
