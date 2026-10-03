// GitHub Actions job: fetch recent Base trades from Bitquery without exposing
// the API key to the browser. Store the key as repository secret BITQUERY_API_KEY.
import fs from "node:fs";

const key = process.env.BITQUERY_API_KEY;
if (!key) {
  console.error("BITQUERY_API_KEY is missing");
  process.exit(1);
}

const query = `query BaseRecentTrades {
  Trading {
    Trades(
      limit: {count: 200}
      orderBy: {descending: Block_Time}
      where: {Pair: {Market: {Network: {is: "Base"}}}}
    ) {
      Block { Time }
      Pair {
        Currency { Id Name Symbol }
        Token { Address Id Symbol }
        Market { Address Program Network }
      }
      PriceInUsd
      AmountsInUsd { Base Quote }
      Trader { Address }
      TransactionHeader { Hash }
    }
  }
}`;

const res = await fetch("https://streaming.bitquery.io/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  },
  body: JSON.stringify({ query })
});

if (!res.ok) throw new Error(`Bitquery HTTP ${res.status}`);
const json = await res.json();
if (json.errors) throw new Error(JSON.stringify(json.errors));

const trades = json?.data?.Trading?.Trades ?? [];
const byToken = new Map();

for (const t of trades) {
  const token = t?.Pair?.Token;
  const address = token?.Address || token?.Id;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) continue;

  const old = byToken.get(address.toLowerCase()) || {
    id: `b:${address}`,
    address,
    name: t?.Pair?.Currency?.Name || "Unknown",
    symbol: t?.Pair?.Currency?.Symbol || token?.Symbol || "",
    price: Number(t?.PriceInUsd) || 0,
    liquidity: 0,
    volume: 0,
    tx: 0,
    createdAt: t?.Block?.Time || null,
    source: "Bitquery"
  };

  old.price = Number(t?.PriceInUsd) || old.price;
  old.volume += Number(t?.AmountsInUsd?.Base || 0) + Number(t?.AmountsInUsd?.Quote || 0);
  old.tx += 1;
  if (!old.createdAt || new Date(t.Block.Time) < new Date(old.createdAt)) old.createdAt = t.Block.Time;
  byToken.set(address.toLowerCase(), old);
}

const output = {
  generatedAt: new Date().toISOString(),
  provider: "Bitquery",
  tokens: [...byToken.values()]
};

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/bitquery.json", JSON.stringify(output, null, 2));
console.log(`Wrote ${output.tokens.length} tokens`);
