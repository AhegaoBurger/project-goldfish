import { WalrusClient } from "@mysten/walrus";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url"; // Vite specific import
import { NETWORK } from "../constants";

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
    systemObjectId:
      "0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af",
    stakingPoolId:
      "0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3",
    subsidiesObjectId:
      "0xda799d85db0429765c8291c594d334349ef5bc09220e79ad397b30106161a0af",
  },
});
