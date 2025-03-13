const { ethers } = require("ethers");
require("dotenv").config();
const readline = require("readline");

// Konfigurasi RPC Monad
const RPC_URL = "https://rpc.testnet.monad.xyz"; // Ganti ke RPC mainnet jika perlu
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Fungsi untuk input dari user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi untuk mengambil contract address dari link Magic Eden
function extractContractAddress(url) {
  const regex = /0x[a-fA-F0-9]{40}/;
  const match = url.match(regex);
  return match ? match[0] : null;
}

// Fungsi untuk mengecek supply NFT
async function getSupply(contractAddress) {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ["function totalSupply() view returns (uint256)"],
      provider
    );
    return await contract.totalSupply();
  } catch (error) {
    console.log("⚠️ Gagal mengambil informasi supply.");
    return null;
  }
}

// Fungsi untuk mencoba instant mint
async function instantMint(wallet, contractAddress) {
  try {
    const contract = new ethers.Contract(
      contractAddress,
      ["function mint() payable"],
      wallet
    );

    const tx = await contract.mint({ value: ethers.parseEther("0.1") });
    console.log(`✅ Mint berhasil! TX: ${tx.hash}`);
  } catch (error) {
    console.log(`❌ Gagal minting: ${error.reason || error.message}`);
  }
}

// Fungsi utama bot
async function startBot() {
  rl.question("Masukkan link Magic Eden: ", async (url) => {
    const contractAddress = extractContractAddress(url);
    if (!contractAddress) {
      console.log("❌ Link tidak valid!");
      rl.close();
      return;
    }
    
    console.log(`✅ Contract Address: ${contractAddress}`);

    // Cek supply sebelum minting
    const supply = await getSupply(contractAddress);
    if (supply === null || supply == 0) {
      console.log("❌ Supply habis! Minting dihentikan.");
      rl.close();
      return;
    }

    rl.question("\nPilih mode:\n1. Instant Minting\n2. Menunggu Open Public\nMasukkan pilihan (1/2): ", async (choice) => {
      if (choice !== "1" && choice !== "2") {
        console.log("❌ Pilihan tidak valid.");
        rl.close();
        return;
      }

      const privateKeys = process.env.PRIVATE_KEYS ? process.env.PRIVATE_KEYS.split(",") : [];
      if (privateKeys.length === 0) {
        console.log("❌ Tidak ada private key yang diatur di .env!");
        rl.close();
        return;
      }

      const wallets = privateKeys.map(pk => new ethers.Wallet(pk, provider));

      if (choice === "1") {
        for (const wallet of wallets) {
          await instantMint(wallet, contractAddress);
        }
      } else {
        console.log("⏳ Mode menunggu open public belum diimplementasikan.");
      }

      rl.close();
    });
  });
}

// Jalankan bot
startBot();
