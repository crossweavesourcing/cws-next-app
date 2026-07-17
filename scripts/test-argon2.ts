import * as argon2 from 'argon2';
import { performance } from 'perf_hooks';

async function runLoadTest(concurrency: number) {
  const password = "EnterprisePassword123!";
  console.log(`[Concurrency: ${concurrency}] Starting...`);
  const start = performance.now();
  
  await Promise.all(
    Array.from({ length: concurrency }).map(() => 
      argon2.hash(password, { memoryCost: 65536, timeCost: 3, parallelism: 1 })
    )
  );
  
  const end = performance.now();
  const totalMs = end - start;
  const opsPerSec = (concurrency / totalMs) * 1000;
  
  console.log(`[Concurrency: ${concurrency}] Total Time: ${totalMs.toFixed(2)}ms | Ops/sec: ${opsPerSec.toFixed(2)}`);
}

async function main() {
  console.log('--- Argon2 Load Test ---');
  console.log('Using settings: memoryCost: 65536, timeCost: 3, parallelism: 1');
  
  // Warmup
  await argon2.hash('warmup', { memoryCost: 65536, timeCost: 3, parallelism: 1 });
  
  await runLoadTest(10);
  await runLoadTest(50);
  await runLoadTest(100);
}

main().catch(console.error);
