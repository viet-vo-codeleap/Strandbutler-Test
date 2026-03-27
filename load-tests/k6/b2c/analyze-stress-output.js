#!/usr/bin/env node
// load-tests/k6/b2c/analyze-stress-output.js
//
// Reads k6 --out json (NDJSON) output from the stress test and finds:
//   - The first timestamp each phase exceeded the 2000ms SLA
//   - The active stress test stage (iter/sec) at that moment
//   - Which phase was the FIRST to break — the confirmed bottleneck
//
// Usage:
//   node load-tests/k6/b2c/analyze-stress-output.js <path-to-ndjson>
//
// If the stress test was run with a custom PEAK_RATE, pass the same value so
// the analyzer labels the peak stage correctly:
//   PEAK_RATE=3600 node load-tests/k6/b2c/analyze-stress-output.js <path-to-ndjson>
//
// Example:
//   mkdir -p load-tests/results
//   k6 run --env PEAK_RATE=3600 --out json=load-tests/results/stress-20260324.ndjson load-tests/k6/b2c/stress-test.js
//   PEAK_RATE=3600 node load-tests/k6/b2c/analyze-stress-output.js load-tests/results/stress-20260324.ndjson

'use strict';

const fs   = require('fs');
const rl   = require('readline');

// ── Config ────────────────────────────────────────────────────────────────────

const SLA_MS = 2000;

// Stress test stages — elapsed seconds from test start (matches stress-test.js).
// Peak stage rate is derived from PEAK_RATE env var to match whatever was passed
// to k6 when the test was run: node analyze-stress-output.js <file> --peak-rate 3600
const peakRateMin = parseInt(process.env.PEAK_RATE, 10) || 1800;
const peakRateSec = Math.max(21, Math.round(peakRateMin / 60));

const STAGES = [
  { start:   0, end:  120, rate:  2,           label: 'warm-up (~12 req/s)'                              },
  { start: 120, end:  300, rate:  5,           label: 'low load (~30 req/s)'                             },
  { start: 300, end:  480, rate: 10,           label: 'moderate load (~60 req/s)'                        },
  { start: 480, end:  660, rate: 20,           label: 'high load (~120 req/s)'                           },
  { start: 660, end:  840, rate: peakRateSec,  label: `near-limit (~${peakRateSec * 6} req/s)`           },
  { start: 840, end: 1020, rate:  0,           label: 'recovery'                                           },
];

const PHASES = [
  'Phase 2 - Location & Vendor',
  'Phase 3 - Availability',
  'Phase 4 - Chair & Pricing',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStageAt(elapsedSec) {
  for (const s of STAGES) {
    if (elapsedSec >= s.start && elapsedSec < s.end) return s;
  }
  return STAGES[STAGES.length - 1];
}

function fmtElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `T+${m}m${s}s` : `T+${s}s`;
}

function matchPhase(group) {
  return PHASES.find(p => group && group.includes(p)) || null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const [,, inputFile] = process.argv;

if (!inputFile) {
  console.error('Usage: node analyze-stress-output.js <path-to-ndjson>');
  console.error('');
  console.error('Run the stress test first:');
  console.error('  mkdir -p load-tests/results');
  console.error('  k6 run --out json=load-tests/results/stress-$(date +%Y%m%d-%H%M%S).ndjson load-tests/k6/b2c/stress-test.js');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

// State
let testStartMs   = null;
let linesRead     = 0;

// Per-phase: first request that crossed SLA_MS
const firstViolation = {}; // phase -> { elapsed, valueMs, stage }
// Per-phase: p(95) tracked via reservoir sampling (1000 samples per phase)
const reservoir = {};
PHASES.forEach(p => {
  firstViolation[p] = null;
  reservoir[p] = { samples: [], count: 0, min: Infinity, max: -Infinity };
});

const reader = rl.createInterface({
  input: fs.createReadStream(inputFile, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

reader.on('line', (line) => {
  linesRead++;
  if (!line.trim()) return;

  let entry;
  try { entry = JSON.parse(line); } catch { return; }

  if (entry.type !== 'Point') return;
  if (entry.metric !== 'http_req_duration') return;

  const ts      = new Date(entry.data.time).getTime();
  const valueMs = entry.data.value;
  const group   = entry.data.tags?.group || '';
  const phase   = matchPhase(group);

  if (!phase) return;

  // Establish test start from the very first data point
  if (testStartMs === null) testStartMs = ts;
  const elapsedSec = (ts - testStartMs) / 1000;

  // Track first individual SLA violation
  if (valueMs > SLA_MS && firstViolation[phase] === null) {
    firstViolation[phase] = {
      elapsed: elapsedSec,
      valueMs: Math.round(valueMs),
      stage:   getStageAt(elapsedSec),
    };
  }

  // Reservoir sampling — keeps memory bounded regardless of file size
  const r = reservoir[phase];
  r.count++;
  if (r.samples.length < 1000) {
    r.samples.push(valueMs);
  } else {
    const idx = Math.floor(Math.random() * r.count);
    if (idx < 1000) r.samples[idx] = valueMs;
  }
  // Track exact min/max (no sampling — compare every value)
  if (valueMs < r.min) r.min = valueMs;
  if (valueMs > r.max) r.max = valueMs;
});

reader.on('close', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  Stress Test — Per-Phase Breaking Point Analysis');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  File:          ${inputFile}`);
  console.log(`  Lines read:    ${linesRead.toLocaleString()}`);
  console.log(`  SLA threshold: ${SLA_MS}ms`);
  console.log('');

  // ── First SLA violation per phase ──────────────────────────────────────────
  console.log('  First request to exceed 2000ms SLA:');
  console.log('  ' + '─'.repeat(65));

  const violations = PHASES
    .filter(p => firstViolation[p])
    .sort((a, b) => firstViolation[a].elapsed - firstViolation[b].elapsed);

  PHASES.forEach(phase => {
    const v = firstViolation[phase];
    if (!v) {
      console.log(`  ✓ ${phase}`);
      console.log(`      No SLA violation detected — phase stayed under ${SLA_MS}ms`);
    } else {
      console.log(`  ✗ ${phase}`);
      console.log(`      Time:     ${fmtElapsed(v.elapsed)} (${Math.round(v.elapsed)}s into test)`);
      console.log(`      Duration: ${v.valueMs.toLocaleString()}ms`);
      console.log(`      Stage:    ${v.stage.rate} iter/sec — ${v.stage.label}`);
    }
    console.log('');
  });

  // ── P(95) approximation per phase ─────────────────────────────────────────
  console.log('  Approximate p(95) per phase (overall, reservoir sample):');
  console.log('  ' + '─'.repeat(65));

  PHASES.forEach(phase => {
    const r = reservoir[phase];
    if (r.samples.length === 0) {
      console.log(`  ${phase}: no data`);
      return;
    }
    r.samples.sort((a, b) => a - b);
    const last = r.samples.length - 1;
    const p50  = Math.round(r.samples[Math.floor(last * 0.50)]);
    const p95  = Math.round(r.samples[Math.floor(last * 0.95)]);
    const p99  = Math.round(r.samples[Math.floor(last * 0.99)]);
    const min  = Math.round(r.min);
    const max  = Math.round(r.max);
    const ok   = p95 < SLA_MS ? '✓' : '✗';
    console.log(`  ${ok} ${phase}`);
    console.log(`      p(50)=${p50}ms  p(95)=${p95}ms  p(99)=${p99}ms`);
    console.log(`      min=${min}ms  max=${max}ms  (from ${r.count.toLocaleString()} requests, sampled ${r.samples.length})`);
    console.log('');
  });

  // ── Bottleneck summary ────────────────────────────────────────────────────
  console.log('  ' + '─'.repeat(65));
  if (violations.length === 0) {
    console.log('  Result: No phase exceeded the 2000ms SLA. System is healthy.');
  } else {
    const first = violations[0];
    const v     = firstViolation[first];
    console.log(`  Bottleneck: ${first}`);
    console.log(`  → First to exceed ${SLA_MS}ms at ${fmtElapsed(v.elapsed)}`);
    console.log(`    during the ${v.stage.rate} iter/sec stage (${v.stage.label})`);
    if (violations.length > 1) {
      console.log('');
      console.log('  Subsequent violations (in order):');
      violations.slice(1).forEach(p => {
        const vv = firstViolation[p];
        console.log(`    ${p} → ${fmtElapsed(vv.elapsed)} during ${vv.stage.rate} iter/sec`);
      });
    }
  }
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
});
