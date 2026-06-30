#!/usr/bin/env python3
"""Read live_perf_logs from Supabase and write summary report."""
import os, sys, json, urllib.request

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://ezemaacyyvbpjlagchds.supabase.co')
ACCESS_TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN', '')
REPORT_DIR = os.environ.get('PERF_REPORT_DIR', os.path.expanduser('~/workspace/perf'))

API_URL = f"{SUPABASE_URL}/rest/v1/live_perf_logs"
REPORT_PATH = os.path.join(REPORT_DIR, 'latest.txt')
JSON_PATH = os.path.join(REPORT_DIR, 'latest.json')

# Thresholds (ms)
WARN = {
    'vad_gap': 800,
    'transcript_to_toolcall': 3000,
    'http_roundtrip': 1500,
    'backend_execution': 1000,
    'compact_response': 200,
    'tts_generation': 3000,
    'total_e2e': 8000,
}

os.makedirs(REPORT_DIR, exist_ok=True)

headers = {
    'apikey': ACCESS_TOKEN,
    'Authorization': f'Bearer {ACCESS_TOKEN}',
    'Content-Type': 'application/json',
}

# Fetch last 200 entries from last 2 hours
params = 'select=session_id,model,stage,ms,created_at&order=created_at.desc&limit=200'
req = urllib.request.Request(f'{API_URL}?{params}', headers=headers)

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
except Exception as e:
    print(f"ERROR fetching Supabase: {e}")
    sys.exit(1)

if not data:
    print("No data yet")
    sys.exit(0)

# Aggregate by stage
by_stage = {}
for row in data:
    s = row['stage']
    ms = row['ms']
    if s not in by_stage:
        by_stage[s] = []
    by_stage[s].append(ms)

# Build report
lines = []
lines.append("=== Freeflow Live Performance ===")
lines.append(f"Entries: {len(data)} | Time: {data[0]['created_at'][:19] if data else 'N/A'}")

# By model
models = set(str(r.get('model') or '?') for r in data if r.get('model') is not None)
lines.append(f"Models: {', '.join(sorted(models))}")

lines.append("")
lines.append(f"{'Stage':<24} {'Avg':>6} {'P50':>6} {'P95':>6} {'Max':>6} {'N':>5} Status")
lines.append("-" * 70)

alerts = []
for stage in sorted(by_stage.keys()):
    vals = sorted(by_stage[stage])
    n = len(vals)
    avg = sum(vals) // n
    p50 = vals[n // 2]
    p95 = vals[int(n * 0.95)]
    mx = vals[-1]
    thr = WARN.get(stage, 5000)
    status = '⚠ WARN' if p95 > thr else '✓ OK'
    if p95 > thr:
        alerts.append(f"  {stage}: P95={p95}ms > threshold {thr}ms")
    lines.append(f"{stage:<24} {avg:>6} {p50:>6} {p95:>6} {mx:>6} {n:>5} {status}")

lines.append("-" * 70)

if alerts:
    lines.append("")
    lines.append("⚠ ALERTS:")
    lines.extend(alerts)
else:
    lines.append("")
    lines.append("✓ All stages within thresholds")

lines.append("")
lines.append(f"Last 5 sessions:")
seen = set()
for row in data:
    sid = row['session_id'][:12]
    if sid in seen: continue
    seen.add(sid)
    lines.append(f"  {sid} {row['stage']}={row['ms']}ms {row['created_at'][:19]}")
    if len(seen) >= 5:
        break

report = '\n'.join(lines)
print(report)

with open(REPORT_PATH, 'w') as f:
    f.write(report)

# Save JSON summary
json_summary = {
    'stages': {s: {'avg': sum(v)//len(v), 'p50': sorted(v)[len(v)//2], 'p95': sorted(v)[int(len(v)*0.95)], 'max': max(v), 'n': len(v)} for s, v in by_stage.items()},
    'total_entries': len(data),
    'models': list(models),
}
with open(JSON_PATH, 'w') as f:
    json.dump(json_summary, f, indent=2)

print(f"\nReports saved: {REPORT_PATH}, {JSON_PATH}")
