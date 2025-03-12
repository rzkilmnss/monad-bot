require("dotenv").config();
const readline = require("readline");
const { ethers } = require("ethers");

// Konfigurasi
const RPC_URL = "https://testnet-rpc.monad.xyz/";
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(","); // Multi-wallet (pisahkan dengan koma)
let CONTRACT_ADDRESS = ""; // Input dari menu awal

const ABI = [
  {
    "inputs": [],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintStatus",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Fungsi untuk input user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi cek gas fee
async function getGasFee() {
  const feeData = await provider.getFeeData();
  return ethers.formatUnits(feeData.maxFeePerGas, "gwei");
}

// Fungsi cek apakah minting sudah terbuka
async function isMintOpen(contract) {
  try {
    await contract.estimateGas.mint({ value: ethers.parseEther("0.1") });
    return true;
  } catch (error) {
    return false;
  }
}

// Fungsi untuk eksekusi mint dengan wallet tertentu
async function mintNFT(walletIndex) {
  const wallet = new ethers.Wallet(PRIVATE_KEYS[walletIndex], provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  try {
    console.log(`🚀 Wallet ${walletIndex + 1}: Mengirim transaksi mint...`);
    const tx = await contract.mint({ value: ethers.parseEther("0.1") });
    console.log(`✅ Wallet ${walletIndex + 1} Mint berhasil! Tx Hash: ${tx.hash}`);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Wallet ${walletIndex + 1} Gagal mint:`, error.reason || error);
    return false;
  }
}

// Fungsi utama bot
async function startBot(mode) {
  console.log("⏳ Memulai bot...");

  for (let i = 0; i < PRIVATE_KEYS.length; i++) {
    const wallet = new ethers.Wallet(PRIVATE_KEYS[i], provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    if (mode === "wait") {
      console.log(`⏳ Wallet ${i + 1} Menunggu public mint...`);
      while (true) {
        console.clear();
        const currentTime = new Date().toLocaleTimeString();
        console.log("========================================");
        console.log("        🔥 BOT AUTO MINT MONAD 🔥        ");
        console.log("========================================");
        console.log(`[${currentTime}] 🔍 Mengecek status mint...`);

        if (await isMintOpen(contract)) {
          console.log(`[${currentTime}] ✅ Minting dibuka! Menjalankan transaksi...`);
          if (await mintNFT(i)) continue;
        }

        console.log(`[${currentTime}] ❌ Minting belum dibuka, mencoba lagi dalam 5 detik...`);
        console.log("========================================");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } else {
      console.log(`🚀 Wallet ${i + 1} Langsung minting...`);
      await mintNFT(i);
    }
  }
  console.log("✅ Semua wallet selesai!");
}

// Menu awal
function showMenu() {
  console.log("========================================");
  console.log("        🔥 BOT AUTO MINT MONAD 🔥        ");
  console.log("========================================");

  rl.question("Masukkan contract address: ", (contractAddress) => {
    CONTRACT_ADDRESS = contractAddress;

    console.log("\nPilih mode:");
    console.log("1. Instant Minting");
    console.log("2. Menunggu Open Public");

    rl.question("Masukkan pilihan (1/2): ", async (choice) => {
      if (choice === "1") {
        await startBot("instant");
      } else {
        await startBot("wait");
      }
      rl.close();
    });
  });
}

// Jalankan bot
showMenu();
