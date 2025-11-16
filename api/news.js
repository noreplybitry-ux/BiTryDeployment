export default async function handler(req, res) {
  const apiKey = process.env.NEWS_API_KEY; // Securely from env vars
  const url = `https://newsapi.org/v2/everything?q=("bitcoin"%20OR%20"ethereum"%20OR%20"BTC"%20OR%20"ETH"%20OR%20"crypto%20price"%20OR%20"cryptocurrency%20market"%20OR%20"binance"%20OR%20"coinbase"%20OR%20"dogecoin"%20OR%20"solana"%20OR%20"cardano"%20OR%20"polygon"%20OR%20"chainlink"%20OR%20"avalanche"%20OR%20"crypto%20beginner"%20OR%20"how%20to%20buy%20crypto")&sortBy=publishedAt&pageSize=100&language=en&domains=coindesk.com,cointelegraph.com,decrypt.co,cryptonews.com,bitcoin.com,bitcoinmagazine.com&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}