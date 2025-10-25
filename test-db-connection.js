#!/usr/bin/env node
/**
 * Manual test script to demonstrate database connection retry logic
 * Run with: node test-db-connection.js
 */

// Simulate the waitForDatabase retry logic
async function simulateWaitForDatabase(maxRetries = 15, delayMs = 2000) {
  console.log('🔍 Simulating database connection with retry logic...\n');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`📡 Database connection attempt ${attempt}/${maxRetries}...`);

    // Simulate random success/failure (for demo purposes)
    const success = Math.random() > 0.7; // 30% success rate per attempt

    if (success) {
      console.log('✓ Database connection successful');
      console.log('✅ Database is ready\n');
      return;
    }

    const errorMsg = attempt % 2 === 0 ? 'ETIMEDOUT' : 'ECONNREFUSED';
    console.log(`⚠️  Database connection attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);

    if (attempt === maxRetries) {
      console.error('✗ Failed to connect to database after maximum retries');
      throw new Error(
        `Failed to connect to database after ${maxRetries} attempts`
      );
    }

    // Exponential backoff with jitter
    const backoffDelay = delayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
    console.log(`⏳ Retrying in ${Math.round(backoffDelay)}ms...\n`);
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
  }
}

// Run the simulation
console.log('='.repeat(60));
console.log('DATABASE CONNECTION RETRY SIMULATION');
console.log('='.repeat(60));
console.log('This demonstrates the new retry logic with exponential backoff\n');

simulateWaitForDatabase(15, 2000)
  .then(() => {
    console.log('='.repeat(60));
    console.log('SUCCESS: App would now start normally');
    console.log('='.repeat(60));
  })
  .catch((error) => {
    console.log('='.repeat(60));
    console.error('FAILURE:', error.message);
    console.log('App would exit with code 1');
    console.log('='.repeat(60));
  });

