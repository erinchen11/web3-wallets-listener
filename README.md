# web3-wallets-listener

## Target

同時監聽Polygon主鏈上26266個不同錢包地址的USDT Transfer Event (轉入該地址).

## Steps

1. 配置 .env檔  
需要使用Alchemy websocket url, 為了減少重新建立連線或因超出連線rate limit造成程式中斷  

2. 收集鏈上實際轉入USDT的地址,  
執行 fetchWalletAddrPolygon.js, 會在指定的 block number區間 (START_BLOCK ~ END_BLOCK),  
收集錢包地址並記錄到 csv (WALLETS_CSV_PATH)

3. 即時監聽多筆錢包地址的 USDT轉入狀況  
執行 walletListener.js, 以目前.env案例, 將監聽26000多個錢包地址,  
一旦該地址收到USDT, 將會把該 Transfer event記錄在CSV (MONITOR_RESULTS_CSV_PATH)

## 實際測試
   使用Alchemy websocket持續監聽26266個不同錢包地址 2小時, 沒有斷線,  
   Alchemy消耗的用量(Compute units)約為 1.2M, 
   並取得 345476筆 Transfer資料, 格式與實際資料如 usdt_monitoring.csv


