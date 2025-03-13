require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");
const readlineSync = require("readline-sync");

// 🔗 List RPC
const RPC_URLS = [
    "https://testnet-rpc.monad.xyz",
    "https://backup-rpc.monad.xyz"
];

// 🔥 Auto pilih RPC tercepat
async function getFastestRPC() {
    let fastestRPC = RPC_URLS[0];
    let minTime = Infinity;

    for (let rpc of RPC_URLS) {
        try {
            const start = Date.now();
            await new ethers.JsonRpcProvider(rpc).getBlockNumber();
            const responseTime = Date.now() - start;
            if (responseTime < minTime) {
                minTime = responseTime;
                fastestRPC = rpc;
            }
        } catch (error) {
            console.log(`❌ RPC gagal: ${rpc}`);
        }
    }
    console.log(`✅ Menggunakan RPC tercepat: ${fastestRPC}`);
    return new ethers.JsonRpcProvider(fastestRPC);
}

// 🔄 Inisialisasi provider sebelum bot berjalan
let provider;
async function initializeProvider() {
    provider = await getFastestRPC();
    console.log(`🔗 Provider siap: ${provider.connection.url}`);
}

// 🔑 Load Private Keys
const PRIVATE_KEYS = process.env.PRIVATE_KEYS ? process.env.PRIVATE_KEYS.split(",") : [];

if (PRIVATE_KEYS.length === 0) {
    console.log("❌ PRIVATE_KEYS di .env kosong! Harap isi private key terlebih dahulu.");
    process.exit(1);
}

// 📜 Load ABI
const abiData = JSON.parse(fs.readFileSync("abi.json", "utf-8"));

// 🏷️ Ambil function signature dan parameter dari ABI
const mintFunction = abiData[0].name;
const params = abiData[0].inputs.map(input => input.type);

console.log("🔍 Menggunakan fungsi mint:", mintFunction);
console.log("📜 Parameter:", params.join(", "));

// 💰 Cek Saldo Wallet
async function getBalance(wallet) {
    const balance = await provider.getBalance(wallet);
    return ethers.formatEther(balance);
}

// 🔥 Mint NFT
async function mintNFT(wallet, contract, mintPrice) {
    while (true) { // Auto-retry tanpa henti
        try {
            console.log(`🔥 Minting NFT dengan wallet ${wallet.address} seharga ${mintPrice} MON...`);

            const tx = await contract[mintFunction](
                wallet.address, 0, 1, "0x", // recipient, tokenId, amount, data
                { 
                    value: mintPrice > 0 ? ethers.parseEther(mintPrice.toString()) : 0, 
                    gasPrice: ethers.parseUnits("10", "gwei") // Tingkatkan gas price agar lebih cepat
                }
            );

            await tx.wait();
            console.log(`✅ Mint sukses! TX: ${tx.hash}`);
            return;
        } catch (error) {
            console.log(`❌ Gagal minting: ${error.reason || error.message}, retrying...`);
        }
    }
}

// 🚀 Start Bot
async function startBot() {
    await initializeProvider(); // Pastikan provider sudah siap sebelum lanjut

    console.log("========================================");
    console.log("        🔥 BOT AUTO MINT MONAD 🔥       ");
    console.log("========================================");

    // 🔗 Input Magic Eden link
    const magicEdenLink = readlineSync.question("Masukkan link Magic Eden: ").trim();
    const match = magicEdenLink.match(/0x[a-fA-F0-9]{40}/);
    if (!match) {
        console.log("❌ Link tidak valid!");
        return;
    }
    const contractAddress = match[0];
    console.log(`✅ Contract Address: ${contractAddress}`);

    // 💵 Input harga mint
    let mintPrice = readlineSync.question("Masukkan harga mint (MON) [default 0.1]: ").trim();
    if (!mintPrice) mintPrice = "0.1"; // Default 0.1 MON
    mintPrice = parseFloat(mintPrice);

    // 🎛️ Pilih mode mint
    console.log("\nPilih mode:");
    console.log("1. Instant Minting");
    console.log("2. Menunggu Open Public");
    console.log("3. Keluar");
    const mode = readlineSync.question("Masukkan pilihan (1/2/3): ").trim();

    if (mode === "3") {
        console.log("👋 Keluar dari bot. Sampai jumpa!");
        return;
    }

    // 🔄 Inisialisasi kontrak
    const contract = new ethers.Contract(contractAddress, abiData, provider);

    // 💰 Tampilkan saldo wallet
    console.log("\n💰 Saldo Wallet:");
    for (let privateKey of PRIVATE_KEYS) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await getBalance(wallet.address);
        console.log(`- ${wallet.address}: ${balance} MON`);
    }

    console.log("\n⏳ Memulai bot...");

    if (mode === "1") {
        // 🚀 Mode Instant Mint - Semua wallet eksekusi **serentak tanpa delay**
        await Promise.all(PRIVATE_KEYS.map(async (privateKey) => {
            const wallet = new ethers.Wallet(privateKey, provider);
            const contractWithSigner = contract.connect(wallet);
            await mintNFT(wallet, contractWithSigner, mintPrice);
        }));
    } else {
        // 🕒 Mode Menunggu Open Public
        console.log("🚀 Menunggu Open Public...");

        await Promise.all(PRIVATE_KEYS.map(async (privateKey) => {
            const wallet = new ethers.Wallet(privateKey, provider);
            const contractWithSigner = contract.connect(wallet);

            while (true) {
                try {
                    // Coba estimasi gas sebagai indikator apakah mint sudah dibuka
                    const canMint = await contract.estimateGas[mintFunction](
                        wallet.address, 0, 1, "0x", 
                        { value: mintPrice > 0 ? ethers.parseEther(mintPrice.toString()) : 0 }
                    );
                    if (canMint) {
                        await mintNFT(wallet, contractWithSigner, mintPrice);
                        break;
                    }
                } catch (err) {
                    console.log(`⏳ Wallet ${wallet.address} masih menunggu open public mint...`);
                }
            }
        }));
    }
}

startBot();
