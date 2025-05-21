import { WalrusClient } from "@mysten/walrus";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url"; // Vite specific import
import {
  NETWORK,
  SYSTEM_OBJECT_ID,
  STAKING_POOL_ID,
  SUBSIDIES_OBJECT_ID,
  EXCHANGGE_IDS,
} from "../constants";

export const suiClient = new SuiClient({
  url: getFullnodeUrl("testnet"),
});

export const walrusClient = new WalrusClient({
  suiClient: suiClient,
  network: NETWORK,
  wasmUrl: walrusWasmUrl,
  storageNodeClientOptions: {
    onError: (error) => console.error("Walrus Node Error:", error),
  },
  packageConfig: {
    systemObjectId: SYSTEM_OBJECT_ID,
    stakingPoolId: STAKING_POOL_ID,
    subsidiesObjectId: SUBSIDIES_OBJECT_ID,
    exchangeIds: EXCHANGGE_IDS,
  },
});
