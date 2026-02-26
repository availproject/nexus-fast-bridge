import { useEffect, useState } from "react";

export async function getTokenPriceUSD(symbol: string): Promise<number> {
  const normSymbol = symbol.toUpperCase();
  if (['USDC', 'USDT', 'USDM'].includes(normSymbol)) {
    return 1;
  }
  if (normSymbol === 'ETH' || normSymbol === 'WETH') {
    try {
      const resp = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT');
      const data = await resp.json();
      if (data && data.price) {
        return Number(data.price);
      }
    } catch (e) {
      console.error("Failed to fetch ETH price from Binance", e);
    }

    // Fallback to CoinGecko
    try {
      const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await resp.json();
      if (data && data.ethereum && data.ethereum.usd) {
        return data.ethereum.usd;
      }
    } catch (e) {
      console.error("Failed to fetch ETH price from CoinGecko", e);
    }
  }

  return 0;
}

export function useTokenPrice(symbol?: string) {
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    let active = true;
    if (!symbol) {
      setPrice(0);
      return;
    }

    getTokenPriceUSD(symbol).then((p) => {
      if (active) {
        setPrice(p);
      }
    });

    return () => {
      active = false;
    };
  }, [symbol]);

  return price;
}
