require("dotenv").config();
const { ethers } = require("ethers");

// 🔧 Konfigurasi
const RPC_URL = "https://testnet-rpc.monad.xyz/"; 
const PRIVATE_KEY = process.env.PRIVATE_KEY; 
const CONTRACT_ADDRESS = "0xf0839de047c567e2e6443a1ff9ddacf6562e3aac"; 

// 🔄 ABI untuk fungsi mint & cek harga mint
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
    "name": "mintPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// 🔥 Cek harga mint dari kontrak
async function getMintPrice() {
  try {
    const mintPrice = await contract.mintPrice();
    console.log(`💰 Harga mint: ${ethers.formatEther(mintPrice)} MON`);
    return mintPrice;
  } catch (error) {
    console.error("❌ Gagal mengambil harga mint dari kontrak. Set default 0.1 MON");
    return ethers.parseEther("0.1");
  }
}

// 🔥 Cek apakah mint sudah dibuka
async function isMintOpen() {
  try {
    await contract.estimateGas.mint({ value: await getMintPrice() });
    return true;
  } catch (error) {
    return false;
  }
}

// 🔥 Cek gas fee optimal
async function getGasPrice() {
  const feeData = await provider.getFeeData();
  console.log(`⛽ Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} Gwei`);
  return feeData.gasPrice;
}

// 🔥 Fungsi untuk eksekusi mint
async function mintNFT() {
  try {
    console.log("🚀 Mengirim transaksi mint...");
    const mintPrice = await getMintPrice();
    const gasPrice = await getGasPrice();

    const tx = await contract.mint({ value: mintPrice, gasPrice: gasPrice });
    console.log(`✅ Mint berhasil! Tx Hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    console.error("❌ Gagal mint:", error.reason || error);
  }
}

// 🔥 Looping untuk cek mint status
async function startBot() {
  console.log("⏳ Menunggu public mint...");

  while (true) {
    console.clear();
    const currentTime = new Date().toLocaleTimeString();

    console.log("========================================");
    console.log("      🔄 BOT AUTO MINT MONAD 🔄      ");
    console.log("========================================");
    console.log(`[${currentTime}] 🔍 Mengecek status mint...`);

    const open = await isMintOpen();
    if (open) {
      console.log(`[${currentTime}] ✅ Minting dibuka! Menjalankan transaksi...`);
      await mintNFT();
      break;
    }

    console.log(`[${currentTime}] ❌ Minting belum dibuka, mencoba lagi dalam 5 detik...`);
    console.log("========================================");

    await new Promise((resolve) => setTimeout(resolve, 5000)); 
  }
}

// 🔥 Jalankan bot
startBot();
