require("dotenv").config();
const { ethers } = require("ethers");
const readlineSync = require("readline-sync");

// Konfigurasi RPC
const RPC_URL = "https://testnet-rpc.monad.xyz"; // Ganti dengan RPC yang benar
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Ambil Private Keys dari .env
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",");

// Fungsi untuk menampilkan saldo
async function getBalance(wallet) {
    const balance = await provider.getBalance(wallet);
    return ethers.formatEther(balance);
}

// Fungsi minting NFT
async function mintNFT(wallet, contract, mintPrice) {
    try {
        console.log(`🔥 Minting NFT dengan wallet ${wallet.address} dengan harga ${mintPrice} MON...`);

        const tx = await contract.mint({ value: ethers.parseEther(mintPrice) });
        await tx.wait();
        console.log(`✅ Mint sukses! TX: ${tx.hash}`);
        return true;
    } catch (error) {
        console.log(`❌ Gagal minting: ${error.reason || error.message}`);
        return false;
    }
}

// Fungsi utama
async function startBot() {
    console.log("========================================");
    console.log("        🔥 BOT AUTO MINT MONAD 🔥       ");
    console.log("             Created by OLDSHOOLVG      ");
    console.log("========================================");

    // Input Magic Eden link
    const magicEdenLink = readlineSync.question("Masukkan link Magic Eden: ").trim();
    const match = magicEdenLink.match(/0x[a-fA-F0-9]{40}/);
    if (!match) {
        console.log("❌ Link tidak valid!");
        return;
    }
    const contractAddress = match[0];
    console.log(`✅ Contract Address: ${contractAddress}`);

    // Input harga mint manual
    let mintPrice = readlineSync.question("Masukkan harga mint (MON) [default 0.1]: ").trim();
    if (!mintPrice) mintPrice = "0.1"; // Jika kosong, pakai default 0.1 MON

    // Pilih mode mint
    console.log("\nPilih mode:");
    console.log("1. Instant Minting");
    console.log("2. Menunggu Open Public");
    console.log("3. Keluar");
    const mode = readlineSync.question("Masukkan pilihan (1/2/3): ").trim();

    if (mode === "3") {
        console.log("👋 Keluar dari bot. Sampai jumpa!");
        return;
    }

    // Inisialisasi contract
    const contract = new ethers.Contract(
        contractAddress,
        ["function mint() payable"],
        provider
    );

    // Menampilkan saldo setiap wallet
    console.log("\n💰 Saldo Wallet:");
    for (let privateKey of PRIVATE_KEYS) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await getBalance(wallet.address);
        console.log(`- ${wallet.address}: ${balance} MON`);
    }

    console.log("\n⏳ Memulai bot...");
    for (let privateKey of PRIVATE_KEYS) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const contractWithSigner = contract.connect(wallet);

        if (mode === "1") {
            await mintNFT(wallet, contractWithSigner, mintPrice);
        } else {
            console.log("🚀 Menunggu Open Public...");
            while (true) {
                const canMint = await contract.estimateGas.mint({ value: ethers.parseEther(mintPrice) }).catch(() => false);
                if (canMint) {
                    await mintNFT(wallet, contractWithSigner, mintPrice);
                    break;
                }
                await new Promise((r) => setTimeout(r, 5000));
            }
        }
    }
}

startBot();
