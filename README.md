# Project Goldfish 🐟

**Decentralized File ID Management on the Sui Blockchain with Walrus Storage**

Project Goldfish is a decentralized application (dApp) demonstrating how to
manage and store references (IDs) to files on the Sui blockchain. While the
files themselves are intended to be stored off-chain (e.g., using a service like
[Walrus](https://github.com/mystenlabs/walrus) or IPFS), this project focuses on
the on-chain registry of these file IDs, associated with user wallet addresses.

The frontend is built with React, TypeScript, and Vite, utilizing the
`@mysten/dapp-kit` for Sui wallet interactions. The backend consists of a Sui
Move smart contract.

## ✨ Features

- **User Authentication:** Connect with Sui-compatible wallets.
- **File ID Registration:**
  - (Current) Simulate file upload to Walrus (or other storage).
  - (Future) Integrate actual Walrus file upload.
  - Store the returned file ID (e.g., Walrus `blobId`) on the Sui blockchain,
    associated with the user's wallet address.
- **File ID Listing:** Fetch and display the list of stored file IDs for the
  connected user.
- **File ID Removal:** Allow users to remove their file IDs from the on-chain
  registry.
- **Sui Move Smart Contract:**
  - `FileRegistry` shared object to store a `Table<address, vector<String>>`
    mapping user addresses to a list of their file ID strings.
  - Functions to add, remove, and retrieve file IDs.
- **Modern Frontend:**
  - Built with React, TypeScript, Vite.
  - Styled with Tailwind CSS and shadcn/ui components.
  - Uses `@mysten/dapp-kit` for seamless wallet integration and Sui blockchain
    interactions.

## 🚀 Tech Stack

- **Blockchain:** Sui Network (Testnet)
- **Smart Contracts:** Sui Move
- **Frontend:**
  - React
  - TypeScript
  - Vite (Build Tool)
  - Tailwind CSS
  - shadcn/ui (UI Components)
- **Sui SDKs:**
  - `@mysten/sui` (Core Sui SDK)
  - `@mysten/dapp-kit` (React hooks and components for Sui dApps)
  - `@mysten/walrus` (For Walrus storage interaction - planned/simulated)
  - `@mysten/walrus-wasm` (WASM bindings for Walrus SDK)
- **State Management:** React Context (via `@mysten/dapp-kit`) & component state
  (`useState`, `useEffect`)

## 📁 Project Structure

```
goldfish_frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/ # shadcn/ui components
│   │   ├── file-list.tsx
│   │   ├── file-options.tsx
│   │   └── walrus-demo-uploader.tsx # Or your main uploader component
│   ├── hooks/
│   │   └── useUserFileIds.ts # Custom hook for fetching file IDs
│   ├── App.tsx
│   ├── main.tsx
│   ├── constants.ts # Deployed contract IDs, package ID, network
│   └── ... # Other assets, styles
├── vite.config.ts
├── tsconfig.json
├── package.json
└── ...

goldfish_backend/ # Sui Move package
├── sources/
│   └── goldfish_backend.move # (or your .move file name)
├── Move.toml
└── ...
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- `pnpm` (or `npm`/`yarn`)
- Sui CLI tools installed and configured (for deploying the Move contract)
- A Sui-compatible wallet extension (e.g., Sui Wallet, Ethos Wallet) configured
  for Testnet.
- Testnet SUI tokens in your wallet for gas fees.
- (For Walrus Upload) Testnet WAL tokens for storage fees.

### 1. Backend (Sui Move Contract)

1. **Navigate to the backend directory:**
   ```bash
   cd goldfish_backend
   ```
2. **Build the Move package:**
   ```bash
   sui move build
   ```
3. **Publish the Move package to Sui Testnet:**
   ```bash
   sui client publish --gas-budget 50000000
   ```
   - **Important:** After publishing, note down the **Package ID** and the
     **Object ID** of the created `FileRegistry` shared object from the
     transaction output.
4. **Update Constants:** Open `goldfish_frontend/src/constants.ts` and update
   `GOLDFISH_PACKAGE_ID` and `FILE_REGISTRY_OBJECT_ID` with the values obtained
   from the publish command.

### 2. Frontend (React dApp)

1. **Navigate to the frontend directory:**
   ```bash
   cd ../goldfish_frontend
   ```
2. **Install dependencies:**
   ```bash
   pnpm install
   # or npm install / yarn install
   ```
3. **Ensure WASM for Walrus is available:**
   - The project is set up to use `@mysten/walrus-wasm`. If you encounter
     issues, ensure this package is installed and the Vite import for the
     `.wasm` file is working.
4. **Run the development server:**
   ```bash
   pnpm dev
   # or npm run dev / yarn dev
   ```
5. Open your browser and navigate to the local development URL (usually
   `http://localhost:5173`).
6. Connect your Sui wallet (make sure it's set to Testnet).

## 🔧 Key Configuration

- **`goldfish_frontend/src/constants.ts`**:
  - `NETWORK`: Set to `'testnet'` (or your target network).
  - `GOLDFISH_PACKAGE_ID`: The ID of your deployed Move package.
  - `FILE_REGISTRY_OBJECT_ID`: The ID of the shared `FileRegistry` object.
  - `FILE_REGISTRY_MODULE_NAME`: The name of your Move module (e.g.,
    `goldfish_backend`).

## 📖 How It Works

1. **User Connects Wallet:** The dApp uses `@mysten/dapp-kit` to allow users to
   connect their Sui wallet. The user's address becomes their unique identifier.
2. **(Simulated) File Upload:** The `WalrusDemoUploader` component (or your
   uploader) simulates the process of uploading a file.
   - The user selects a file.
   - (Future integration: The file is encoded and uploaded to Walrus storage
     nodes using the Walrus SDK. This involves on-chain transactions for
     registration and certification, which are signed via the user's dApp
     wallet.)
   - A `blobId` (string identifier for the file in Walrus) is obtained.
3. **Storing ID On-Chain:**
   - A Sui transaction is constructed to call the `add_file_id` function in the
     `goldfish_backend` Move contract.
   - This transaction passes the `FileRegistry` object ID and the `blobId`
     string.
   - The user signs this transaction via their wallet.
   - The `blobId` is added to the user's list within the `FileRegistry`'s
     `Table`.
4. **Listing File IDs:**
   - The `FileList` component uses the `useUserFileIds` custom hook.
   - This hook calls the `get_file_ids` view function (via
     `devInspectTransactionBlock`) on the `goldfish_backend` Move contract,
     passing the `FileRegistry` object ID and the current user's address.
   - The contract returns a `vector<String>` of `blobId`s.
   - (Current) The frontend then displays these IDs with _simulated_ metadata
     (name, type, size).
5. **(Planned) File Options:** The `FileOptions` component will allow users to
   perform actions like download (from Walrus), share, rename (on-chain metadata
   if implemented), delete (from on-chain registry and potentially Walrus), and
   extend storage.

## 🏗️ Future Enhancements / TODO

- [ ] **Integrate Real Walrus Upload:** Implement the full lower-level Walrus
      SDK flow for `encodeBlob`, `writeEncodedBlobToNodes`,
      `registerBlobTransaction`, and `certifyBlobTransaction`, using
      `@mysten/dapp-kit` for signing each on-chain step.
- [ ] **Fetch Real Metadata:**
  - Option 1: Store the Walrus `Blob` _Object ID_ on-chain instead of/alongside
    the `blobId` string. Fetch and display data from this object (size, epochs,
    deletable status).
  - Option 2: Implement a way to query Walrus nodes/API for metadata based on
    `blobId`.
- [ ] **Store Original Filenames:** Modify the Move contract to store filenames
      alongside `blobId`s for better UX.
- [ ] **Implement `FileOptions` Actions:**
  - Download from Walrus (`walrusClient.readBlob`).
  - Delete file ID from the registry (`remove_file_id` Move function).
  - (Advanced) Delete blob from Walrus storage (if `isDeletable`).
  - (Advanced) Extend storage epochs.
- [ ] **Error Handling & UX:** Improve loading states, error messages, and user
      feedback throughout the application.
- [ ] **Pagination for File List:** If a user has many files.
- [ ] **Unit & Integration Tests.**
- [ ] **Deployment to Production/Mainnet:** Update constants and network
      configurations.

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please fork the
repository and use a feature branch. Pull requests are warmly welcome.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## 📄 License

This project is licensed under the [Your License Name, e.g., Apache 2.0 or MIT
License] - see the `LICENSE` file for details (if you have one).
