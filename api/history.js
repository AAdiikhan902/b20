// /api/history.js
// Serverless function (runs on Vercel) that keeps the Etherscan/Basescan
// API key hidden server-side and returns transaction history for an address.

export default async function handler(req, res) {
  const { address } = req.query;

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: "Valid address query param required" });
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ETHERSCAN_API_KEY not configured on server" });
  }

  // chainid=8453 = Base mainnet, via Etherscan's unified v2 API
  const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&sort=desc&page=1&offset=25&apikey=${apiKey}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (data.status === "0" && data.message !== "No transactions found") {
      return res.status(200).json({ error: data.result || "No data returned", transactions: [] });
    }

    const transactions = (data.result || []).map(tx => ({
      hash: tx.hash,
      blockNumber: tx.blockNumber,
      timeStamp: tx.timeStamp,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: tx.gasUsed,
      gasPrice: tx.gasPrice,
      isError: tx.isError,
      functionName: tx.functionName || tx.methodId || ""
    }));

    res.status(200).json({ transactions });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch transaction history: " + e.message, transactions: [] });
  }
}
