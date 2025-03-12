require("dotenv").config();
const { ethers } = require("ethers");

const RPC_URL = "https://testnet-rpc.monad.xyz/";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = "0xf0839de047c567e2e6443a1ff9ddacf6562e3aac";

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
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

async function isMintOpen() {
  try {
    return await contract.mintStatus();
  } catch (error) {
    console.error("Gagal mengecek status mint:", error);
    return false;
  }
}

async function mintNFT() {
  try {
    console.log("Mengirim transaksi mint...");
    const tx = await contract.mint({ value: ethers.parseEther("0.1") });
    console.log(`Mint berhasil! Tx Hash: ${tx.hash}`);
    await tx.wait();
  } catch (error) {
    console.error("Gagal mint:", error.reason || error);
  }
}

async function startBot() {
  console.log("Menunggu public mint...");
  while (true) {
    console.clear();
    const currentTime = new Date().toLocaleTimeString();
    console.log("========================================");
    console.log(" 🔄 BOT AUTO MINT MONAD 🔄 ");
    console.log("========================================");
    console.log(`[${currentTime}] Mengecek status mint...`);

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

startBot();
