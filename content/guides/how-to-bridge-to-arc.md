---
title: "How to Bridge to Arc"
description: "Learn how to bridge to Arc with FastBridge. Combine assets from multiple chains and get 1:1 USDC swaps with zero slippage and no solver or protocol fees."
author: "Andria E"
publishedAt: 2026-09-22
lastUpdated: 2026-09-22
createdAt: 2026-09-22T14:22:45Z
coverImage: /guide-images/how-to-bridge-to-arc/cover.png
tldr:
  - "Arc is an EVM-compatible Layer 1 built for stablecoin-based financial applications. USDC is its native gas token."
  - "Arc's official Bridge capability uses Circle's CCTP infrastructure and is designed for direct transfers of supported assets between one source chain and one destination chain."
  - "FastBridge can combine supported assets from multiple source chains and deliver one consolidated balance to Arc."
  - "FastBridge abstracts gas on your source chains, so users can bridge without holding native gas tokens on every source chain and arrive on Arc with USDC ready for their next transaction."
---

Arc has been live on mainnet since September 16, 2026, with FastBridge supporting the network from day one. As new applications and opportunities go live, users first need a practical way to move capital onto Arc, especially when that capital is spread across multiple chains or held in different tokens.

To bridge to Arc with FastBridge, you do not need to start in one place. You can combine supported balances from multiple chains and tokens into a single transaction so you can arrive ready to trade on Arc without repeating the same bridge process for every source chain or token you hold. This guide breaks down the options for bridging to Arc, the limitations users may encounter when using other bridges, and how to move funds to Arc step by step on FastBridge.

## **Why users move funds to Arc**

Arc is only days into mainnet, and some announced integrations are still rolling out. Even so, the opportunities attracting the most attention are already clear: DEX liquidity, stablecoin lending, on-chain FX and tokenized real-world assets. Because USDC is both deployable capital and Arc’s gas token, bridging USDC lets users arrive ready to act. For DeFi users, the most relevant opportunities available now include:

- Lending and borrowing: deposit collateral (e.g. cirBTC, wrapped ETH, tokenized funds) and borrow native USDC, or supply USDC to earn yield on protocols such as Aave or Morpho
- DEX trading and swaps: trade on Uniswap and other AMMs with USDC as the base pair and no WETH-style wrapper.
- Liquidity provision: add to USDC pairs and earn swap fees with low, dollar-denominated gas.
- Onchain FX: convert between USDC, EURC, and other natively supported stables with near-instant PvP settlement.
- Tokenized assets / RWA collateral: use tokenized funds or BTC-style assets as collateral for loans or structured products.

## **Where standard Arc bridging becomes limiting**

Arc does not use a classic lock-and-mint bridge. Its documented Bridge capability is built on Circle’s Cross-Chain Transfer Protocol. For USDC and EURC, CCTP burns the asset on the source chain and mints the same native asset on Arc, rather than locking funds in a liquidity pool and issuing a wrapped representation.

It is a reliable option for direct transfers, but it has several practical limitations:

- **Asset and route restrictions:** Arc’s Bridge overview explicitly supports USDC and EURC. Additional CCTPx assets may be supported on certain routes, but availability depends on the asset, source chain and destination. Users holding an unsupported token may need to swap before bridging.
- **Finality wait:** Standard CCTP transfers wait for source-chain hard finality before Circle issues an attestation. Transfers from Ethereum, Base or Arbitrum can take approximately 15–19 minutes. Fast Transfer reduces this to seconds but charges a protocol fee and depends on available Fast Transfer allowance.
- **Limited chain coverage:** Direct transfers are only available between chains, assets and routes supported by CCTP and Arc’s Bridge capability. Funds held elsewhere may require another bridge or an additional swap.
- **One source chain at a time:** Each Bridge operation defines one source chain and one destination chain. Balances distributed across several networks must be transferred separately by doing multiple bridge transactions.

## **Common friction with third-party Arc bridges**

Third-party bridges can expand route and token coverage, but the experience differs widely by provider. Users should check how a specific route settles rather than assuming every bridge works the same way.

Common issues users may encounter include:

- **One chain at a time:** Many bridges can only move funds from one source chain per transfer. If your funds are spread across several networks, you must bridge each balance separately.
- **Native tokens needed for gas:** Some bridges require you to hold the source chain’s native token, such as ETH, to pay for the transaction.
- **Wrapped assets:** Some bridges deliver a wrapped version of the token instead of the native asset. You may need another swap before using it, and its value can move away from the original token if liquidity is low.
- **Slippage from low liquidity:** Routes that depend on liquidity pools or swaps may deliver less than expected, especially while liquidity on Arc is still developing. Always check the final amount you will receive.
- **Costs are not always shown together:** Bridge fees, gas costs and price impact may be displayed separately. A route that initially looks cheap can cost more once everything is included.

These issues do not apply to every third-party bridge. Before confirming a transfer, check the asset you will receive, the final output, and the complete fee breakdown.

## **What FastBridge does differently**

FastBridge is a unified, intent-based cross-chain bridge built by Avail. Instead of asking users to construct every route, it asks for the outcome: which supported assets should be used, where they should go, and how much should arrive.

- **Combine multiple chains and tokens**

Multi-source input is FastBridge's core capability. You can bring together supported balances from different chains in one flow. For example, you can combine USDC on Base, USDT on Arbitrum and ETH on Ethereum into one flow on Arc. What would normally require several bridge transactions is handled as one coordinated FastBridge transaction.

- **Avoid native gas top-ups**

On supported routes, source-chain gas fees can be covered in USDC or USDT. This means you do not need to hold a separate native gas token on every source chain. This is particularly useful when small balances are spread across several chains and you do not hold the network's native token.

- **Choose how much to send or receive**

With **Exact In**, you choose how much to send. With **Exact Out**, you choose the exact amount you want to receive on Arc, and FastBridge calculates what is needed. Exact Out is useful when you need a precise USDC balance for gas, a deposit or a position.

- **See the full quote before confirming**

FastBridge shows your source assets, destination amount, fees and price impact before you approve the transaction. You can adjust the selected balances and review the updated quote.

- **Settle through a non-custodial intent model**

FastBridge is powered by Avail Nexus. Source funds are temporarily locked in onchain Vault contracts that act as conditional escrow. A solver fronts the destination liquidity and receives the source funds only after the requested outcome has been fulfilled and verified. FastBridge does not take custody of the user's funds through a company-controlled account.

## **How to bridge to Arc with FastBridge**

The example below shows how to combine one or more supported balances and receive USDC on Arc.

### **Step 1: Open FastBridge and connect your wallet**

![](/guide-images/how-to-bridge-to-arc/1.png)

Go to [fastbridge.availproject.org/app](https://fastbridge.availproject.org/app) and connect an EVM-compatible wallet. FastBridge supports wallets including MetaMask, Rabby, Coinbase Wallet, and WalletConnect-compatible wallets.

### **Step 2: Select the source chain(s), asset(s) and amount you want to move**

![](/guide-images/how-to-bridge-to-arc/2.png)

Start by activating the “Multi-Assets Mode” in the toggle bar if you wish to move multiple tokens across multiple chains in one go. Under Send, choose the token(s) and chain(s) you want to move. Enter the amount you want to use. Your available balance appears in the interface.

FastBridge keeps the sources together in one route, so you do not need to complete a separate bridge for every chain.

### **Step 3: Choose Arc as your destination chain**

Under Receive, select Arc as the destination chain and choose the available token you want to receive. USDC is the most practical example because it is also used to pay gas on Arc.

### **Step 4: Approve the swaps in your wallet**

![](/guide-images/how-to-bridge-to-arc/3.png)

Click **Approve & Swap**, then approve each source asset when prompted in your wallet. FastBridge will show the progress as it swaps your assets and sends the USDC to Arc.

### **Step 5: Confirm the funds arrived on Arc**

![](/guide-images/how-to-bridge-to-arc/4.png)

Once the transfer is complete, FastBridge will show how much USDC you received on Arc, the assets you swapped and the total fees paid. You can also open the explorer links to verify the completed transaction.

## **Land on Arc in seconds, with zero slippage**

Arc is designed for fast, stablecoin-based financial activity, but reaching a new network should not require users to reorganize every balance manually first.

FastBridge lets you combine different tokens from multiple chains, swap them and move them to Arc in one coordinated flow. For 1:1 USDC swaps to Arc, FastBridge offers zero slippage with no solver or protocol fees; the amount you send is the amount you receive.

**→** [**Bridge to Arc with FastBridge**](https://fastbridge.availproject.org/arc)
