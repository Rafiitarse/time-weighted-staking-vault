/**
 * Advance Anvil's chain time by N days: casts evm_increaseTime and evm_mine
 * over plain JSON-RPC fetch. No dependencies.
 *
 * Usage: node scripts/warp.mjs --days 183
 *        npm run demo:warp -- --days 183
 */
const RPC_URL = process.env.DEMO_RPC_URL ?? "http://127.0.0.1:8545";

function argDays() {
  const i = process.argv.indexOf("--days");
  const raw = i !== -1 ? process.argv[i + 1] : undefined;
  const days = Number(raw);
  if (!Number.isFinite(days) || days <= 0) {
    console.error("usage: node scripts/warp.mjs --days <positive-number>");
    process.exit(1);
  }
  return days;
}

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    console.error(`${method}: HTTP ${res.status} from ${RPC_URL}`);
    process.exit(1);
  }
  const body = await res.json();
  if (body.error) {
    console.error(`${method}: ${body.error.message ?? JSON.stringify(body.error)}`);
    process.exit(1);
  }
  return body.result;
}

const days = argDays();
const seconds = Math.round(days * 86400);

const before = await rpc("eth_getBlockByNumber", ["latest", false]);
await rpc("evm_increaseTime", [seconds]);
await rpc("evm_mine", []);
const after = await rpc("eth_getBlockByNumber", ["latest", false]);

const fmt = (hex) => new Date(Number.parseInt(hex, 16) * 1000).toISOString();
console.log(`warped +${days} days (+${seconds}s); chain time ${fmt(before.timestamp)} -> ${fmt(after.timestamp)}`);
