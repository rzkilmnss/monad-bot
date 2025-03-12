require("dotenv").config();
const { ethers } = require("ethers");
const readline = require("readline");

// Konfigurasi
const RPC_URL = "https://testnet-rpc.monad.xyz/";
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(","); // Multiple wallets (pisahkan dengan koma)
let CONTRACT_ADDRESS = "";

// Buat interface CLI untuk input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi untuk input contract address
async function inputContractAddress() {
  return new Promise((resolve) => {
    rl.question("Masukkan contract address: ", (address) => {
      CONTRACT_ADDRESS = address.trim();
      resolve();
    });
  });
}

// ABI fungsi mint
const ABI = [
  { "inputs": [], "name": "mint", "outputs": [], "stateMutability": "payable", "type": "function" }
];

// Fungsi untuk cek gas fee atau harga mint
async function getMintPrice(contract) {
  try {
    const price = await contract.mintPrice(); // Pastikan kontrak punya fungsi ini
    return price;
  } catch (error) {
    console.error("⚠️ Gagal mendapatkan harga mint, menggunakan default 0.1 MON");
    return ethers.parseEther("0.1"); // Default jika gagal mendapatkan harga dari kontrak
  }
}

// Fungsi untuk cek apakah mint sudah dibuka
async function isMintOpen(contract) {
  try {
    await contract.estimateGas.mint({ value: await getMintPrice(contract) });
    return true;
  } catch {
    return false;
  }
}

// Fungsi untuk mint NFT
async function mintNFT(wallet) {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    console.log(`🚀 Wallet ${wallet.address} mencoba mint...`);
    
    const price = await getMintPrice(contract);
    const tx = await contract.mint({ value: price });

    console.log(`✅ Mint berhasil! Tx Hash: ${tx.hash}`);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Gagal mint dengan ${wallet.address}:`, error.reason || error);
    return false;
  }
}

// Fungsi utama untuk multi-wallet minting
async function startBot() {
  console.log("\n⏳ Menunggu public mint...");
  let wallets = PRIVATE_KEYS.map((key) => new ethers.Wallet(key, new ethers.JsonRpcProvider(RPC_URL)));
  let successWallets = [];

  while (successWallets.length < wallets.length) {
    for (let wallet of wallets) {
      if (successWallets.includes(wallet.address)) continue; // Lewati jika sudah sukses
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
      console.log(`🔍 Mengecek status mint untuk ${wallet.address}...`);

      if (await isMintOpen(contract)) {
        console.log("✅ Mint dibuka! Eksekusi mint...");
        if (await mintNFT(wallet)) {
          successWallets.push(wallet.address); // Tandai wallet yang sukses
        }
      } else {
        console.log("❌ Mint belum dibuka, coba lagi nanti...");
      }
    }

    if (successWallets.length < wallets.length) {
      console.log("🔄 Menunggu 5 detik sebelum mencoba lagi...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log("🎉 Semua wallet berhasil mint! Bot berhenti.");
}

// Jalankan program
(async () => {
  console.log("========================================");
  console.log("        🔥 BOT AUTO MINT MONAD 🔥        ");
  console.log("========================================");

  await inputContractAddress();
  await startBot();
  rl.close();
})();
