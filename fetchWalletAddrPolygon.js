import "dotenv/config";  // 載入 .env
import { ethers } from "ethers";
import { createObjectCsvWriter } from "csv-writer";

// 從 .env 讀取參數
const PROVIDER_URL = process.env.PROVIDER_URL;
const USDT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS;
const START_BLOCK = parseInt(process.env.START_BLOCK, 10);
const END_BLOCK = parseInt(process.env.END_BLOCK, 10);
const WALLETS_CSV_PATH = process.env.WALLETS_CSV_PATH || "usdt_addresses.csv"; 
// 若未設定環境變數，預設為 "usdt_addresses.csv"

// 建立 Provider（使用 .env 提供的 WebSocket URL）
const provider = new ethers.WebSocketProvider(PROVIDER_URL);

// ERC-20 Transfer 事件 ABI
const erc20ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// 建立合約物件 (讀取 Transfer 事件用)
const usdtContract = new ethers.Contract(USDT_ADDRESS, erc20ABI, provider);

// 建立 CSV Writer：將地址輸出到由環境變數指定的檔案
const csvWriter = createObjectCsvWriter({
  path: WALLETS_CSV_PATH,
  header: [
    { id: "address", title: "Address" },
  ],
});

async function main() {
  try {
    console.log(`Starting from block ${START_BLOCK} to ${END_BLOCK} ...`);

    // 用 Set 存放所有收過 USDT 的地址 (to) 以去重複地址
    const addressSet = new Set();

    // 每次掃瞄的區塊數
    const chunkSize = 1000;
    let fromBlock = START_BLOCK;

    while (fromBlock <= END_BLOCK) {
      const toBlock = Math.min(fromBlock + chunkSize - 1, END_BLOCK);

      console.log(`\nQuerying Transfer events from block ${fromBlock} to ${toBlock}...`);

      // 查詢 Transfer 事件
      const transferEvents = await usdtContract.queryFilter(
        usdtContract.filters.Transfer(),
        fromBlock,
        toBlock
      );

      console.log(`Got ${transferEvents.length} Transfer events in this chunk.`);

      // 將事件裡的 `to` 地址加入 Set
      for (const event of transferEvents) {
        const toAddress = event.args?.to?.toLowerCase();
        addressSet.add(toAddress);
      }

      // 更新下一個 chunk 的開始區塊
      fromBlock = toBlock + 1;
    }

    // 完成掃描後，輸出結果
    console.log(`\nTotal addresses that have EVER received USDT: ${addressSet.size}`);

    // 將 Set 轉成陣列
    const allAddresses = Array.from(addressSet);
 
    // 將不重複地址輸出到 CSV
    const csvRecords = allAddresses.map((addr) => ({ address: addr }));
    await csvWriter.writeRecords(csvRecords);
    console.log(`Saved to ${WALLETS_CSV_PATH}`);

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
