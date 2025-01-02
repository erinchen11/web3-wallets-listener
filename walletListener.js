import "dotenv/config"; // 載入環境變數
import { ethers, formatUnits } from "ethers";
import fs from "fs";
import csvParser from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";

// 從環境變數讀取設定
const PROVIDER_URL = process.env.PROVIDER_URL;
const USDT_CONTRACT_ADDRESS = process.env.USDT_CONTRACT_ADDRESS;
const WALLETS_CSV_PATH = process.env.WALLETS_CSV_PATH || "usdt_addresses.csv";
const MONITOR_RESULTS_CSV_PATH = process.env.MONITOR_RESULTS_CSV_PATH || "usdt_monitoring.csv";

// 初始化 Provider
const provider = new ethers.WebSocketProvider(PROVIDER_URL);

// 建立合約物件
const contract = new ethers.Contract(
  USDT_CONTRACT_ADDRESS,
  ["event Transfer(address indexed from, address indexed to, uint256 value)"],
  provider
);

// 監控的目標地址集合
const monitoredAddresses = new Set();

// 建立 CSV Writer，用於輸出監聽到的事件
const csvWriter = createObjectCsvWriter({
  path: MONITOR_RESULTS_CSV_PATH,
  header: [
    { id: "timestamp", title: "Timestamp" },
    { id: "from", title: "From" },
    { id: "to", title: "To" },
    { id: "value", title: "Value" },
    { id: "blockNumber", title: "Block Number" },
    { id: "transactionHash", title: "Transaction Hash" },
  ],
  append: false, // 設為 true 可在同一檔案追加記錄
});

/**
 * 從指定的 CSV 檔案載入地址到 `monitoredAddresses` 集合中
 */
async function loadAddressesFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        const address = row["Address"]?.trim(); // 假設 CSV 欄位名是 "Address"
        if (address) {
          monitoredAddresses.add(address.toLowerCase());
        }
      })
      .on("end", () => {
        console.log("Monitor addresses already loaded, total: ", monitoredAddresses.size, "addresses");
        resolve();
      })
      .on("error", (error) => {
        console.error("Error when loading monitor addresses csv:", error);
        reject(error);
      });
  });
}

/**
 * 監聽 Transfer 事件，並將監聽到的事件資料寫入 CSV
 */
async function monitorTransferEvents() {
  // 先從環境變數指定的 CSV 檔載入監控地址
  await loadAddressesFromCSV(WALLETS_CSV_PATH);

  // 開始監聽 Transfer 事件
  contract.on("Transfer", async (from, to, value, event) => {
    if (monitoredAddresses.has(to.toLowerCase())) {
      const formattedValue = formatUnits(value, 6); // USDT Decimal = 6
      const blockNumber = event.log.blockNumber;
      const txHash = event.log.transactionHash;

      // 取得區塊時間
      const block = await provider.getBlock(blockNumber);
      const timestamp = new Date(block.timestamp * 1000).toISOString();

      console.log("*** ERC20 Transfer To Monitor Address Detected ***");
      console.log(`Date: ${timestamp}`);
      console.log(`From: ${from}`);
      console.log(`To: ${to}`);
      console.log(`Value: ${formattedValue} Tokens`);
      console.log(`Block Number: ${blockNumber}`);
      console.log(`Transaction Hash: ${txHash}`);
      console.log("-------------------------------");

      // 將事件資料寫到 CSV
      await csvWriter.writeRecords([
        {
          timestamp,
          from,
          to,
          value: formattedValue,
          blockNumber,
          transactionHash: txHash,
        },
      ]);
    }
  });

  console.log("Monitoring Transfer Event...");
}

// 啟動監聽
monitorTransferEvents().catch((error) => {
  console.error("Error monitoring events:", error);
});
