// scripts/fetch_prices.js
// Node 18+ (global fetch). Schreibt docs/prices.json
// ENV: GOLDAPI_KEY

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY = process.env.GOLDAPI_KEY;
if (!KEY) {
  console.error("ERROR: Environment variable GOLDAPI_KEY is not set.");
  process.exit(2);
}

const ENDPOINT_BASE = "https://www.goldapi.io/api";
const pairs = [
  { symbol: "XAU", name: "gold" },
  { symbol: "XAG", name: "silver" },
  { symbol: "XPT", name: "platinum" },
  { symbol: "XPD", name: "palladium" },
];

async function fetchWithRetry(url, options, retries = 2) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (retries > 0) {
      console.warn(`Fetch failed ${url}. Retries left: ${retries}`);
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

async function fetchPair(symbol, currency = "EUR") {
  const url = `${ENDPOINT_BASE}/${symbol}/${currency}`;
  const res = await fetchWithRetry(url, { headers: { "x-access-token": KEY, "Content-Type": "application/json" } }, 2);
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`HTTP ${res.status} for ${url}: ${body}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

(async () => {
  console.log("Starting price fetch...");
  const out = { fetched_from: "goldapi.io", updated_at: new Date().toISOString(), rates: {} };

  for (const p of pairs) {
    try {
      console.log(`Requesting ${p.symbol}/EUR`);
      const r = await fetchPair(p.symbol, "EUR");
      const pricePerOz = (typeof r.price === "number") ? r.price : (typeof r.ask === "number" ? r.ask : null);
      out.rates[p.name] = { per_oz: pricePerOz, raw: r };
      console.log(`  -> ${p.name}: ${pricePerOz}`);
    } catch (err) {
      console.error(`Error fetching ${p.symbol}:`, err.message);
      out.rates[p.name] = { per_oz: null, error: err.message, status: err.status || null };
    }
  }

  const docsDir = path.join(__dirname, "..", "docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const outPath = path.join(docsDir, "prices.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("WROTE", outPath);

  const anyNumber = Object.values(out.rates).some(r => typeof r.per_oz === "number");
  if (!anyNumber) {
    console.error("ERROR: No valid prices retrieved.");
    process.exit(3);
  }
  process.exit(0);
})();
