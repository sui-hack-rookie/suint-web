## SUINT-WEB

This repo contains source code for the SUINT project for the SUI Overflow 2025.


### Description
We propose a blockchain analytics tool for Sui that provides the functionality of a graph-based visualization and on-chain network analysis of an account’s entire transaction history. Our tool will plot all incoming and outgoing transactions of a given Sui address as a network graph. In this graph, nodes represent wallets or smart contracts and edges represent transactions annotated with details (timestamps, values, and known labels such as “DEX Swap” or “NFT Marketplace”). By turning raw ledger data into an interactive graph, the tool can reveal hidden relationships and patterns among addresses that are difficult to see otherwise​. This visual approach makes it easier for users to follow an address over time, see how funds and assets move, and quickly spot clusters of related activity.

Because Sui is designed for high throughput and parallel transaction processing, the system can efficiently query large data sets and update visualizations in near real time. The front end will prioritize an intuitive UX, allowing users to pan/zoom the network graph, click on nodes for details, and hover over edges to see transaction amounts and timestamps. Overall, this tool aims to make Sui account histories transparent and accessible, providing a clear “story” of how an address has behaved on the network.


### Authors:
- @martian0x80
- @lakshayGMZ
