/**
 * Runs the same invariants as the browser on boot (see main.ts + ConsistencyChecks).
 * Execute: npm run check:invariants
 */
import { runConsistencyChecks } from '../src/shared/ConsistencyChecks';

runConsistencyChecks();
console.log('[check-invariants] OK');
