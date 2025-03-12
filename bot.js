require("dotenv").config();
const { ethers } = require("ethers");
const readline = require("readline");

// Konfigurasi
const RPC_URL = "https://testnet-rpc.monad.xyz/"; // Ganti dengan RPC yang valid
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(","); // Multi-wallet (pisahkan dengan koma)

// Fungsi untuk input dari user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi untuk extract contract address dari link Magic Eden
function extractContractAddress(url) {
  const match = url.match(/tokens\/(0x[a-fA-F0-9]{40})/);
  return match ? match[1] : null;
}

// Fungsi untuk mendapatkan supply NFT (sesuaikan dengan ABI)
async function getSupply(contract) {
  try {
    const supply = await contract.totalSupply(); // Pastikan kontrak punya fungsi ini
    return parseInt(supply.toString());
  } catch (error) {
    console.error("❌ Gagal mendapatkan supply:", error);
    return 0; // Jika gagal, anggap supply habis
  }
}

// Fungsi untuk eksekusi mint
async function mintNFT(wallet, contract) {
  try {
    console.log(`🚀 Wallet ${wallet.address} mencoba mint...`);
    const tx = await contract.mint({ value: ethers.parseEther("0.1") }); // Sesuaikan harga mint
    console.log(`✅ Mint berhasil! Tx Hash: ${tx.hash}`);
    await tx.wait();
    return true;
  } catch (error) {
    console.error(`❌ Wallet ${wallet.address} gagal mint:`, error.reason || error);
    return false;
  }
}

// Fungsi utama bot
async function startBot(contractAddress, mode) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  let wallets = PRIVATE_KEYS.map(pk => new ethers.Wallet(pk, provider));

  // Siapkan kontrak
  const ABI = [
    { "inputs": [], "name": "mint", "outputs": [], "stateMutability": "payable", "type": "function" },
    { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
  ];
  const contract = new ethers.Contract(contractAddress, ABI, provider);

  // Looping setiap wallet
  for (let wallet of wallets) {
    const contractWithSigner = contract.connect(wallet);

    // Cek supply sebelum mint
    const supply = await getSupply(contractWithSigner);
    if (supply <= 0) {
      console.log("❌ Supply NFT habis! Mint dibatalkan.");
      break;
    }

    // Mode instant mint atau menunggu public
    if (mode === "1") {
      const success = await mintNFT(wallet, contractWithSigner);
      if (success) continue; // Lanjut ke wallet berikutnya
    } else if (mode === "2") {
      console.log("⏳ Menunggu public mint...");
      while (true) {
        try {
          await contractWithSigner.estimateGas.mint({ value: ethers.parseEther("0.1") });
          console.log("✅ Mint dibuka! Memulai transaksi...");
          const success = await mintNFT(wallet, contractWithSigner);
          if (success) break; // Lanjut ke wallet berikutnya
        } catch (error) {
          console.log("❌ Mint belum dibuka, cek lagi dalam 5 detik...");
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}

// Menu awal
rl.question("Masukkan link Magic Eden: ", (inputUrl) => {
  const contractAddress = extractContractAddress(inputUrl);
  if (!contractAddress) {
    console.log("❌ Link tidak valid!");
    rl.close();
    return;
  }

  console.log("\nPilih mode:");
  console.log("1. Instant Minting");
  console.log("2. Menunggu Open Public");
  rl.question("Masukkan pilihan (1/2): ", (mode) => {
    if (mode !== "1" && mode !== "2") {
      console.log("❌ Pilihan tidak valid!");
      rl.close();
      return;
    }
    
    console.log("⏳ Memulai bot...\n");
    startBot(contractAddress, mode).then(() => {
      console.log("✅ Bot selesai.");
      rl.close();
    });
  });
});
