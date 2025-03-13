require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");
const readlineSync = require("readline-sync");

// 🔗 RPC Monad (Hanya 1)
const RPC_URL = "https://testnet-rpc.monad.xyz";

// 🔥 Provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 🔑 Load Private Keys
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",");

// 📜 Load ABI
const abiData = JSON.parse(fs.readFileSync("abi.json", "utf-8"));
const mintFunction = abiData[0].name;

console.log("🔍 Menggunakan fungsi mint:", mintFunction);

// 🔄 Fungsi cek supply NFT
async function getSupply(contract) {
    try {
        const totalSupply = await contract.totalSupply();
        const maxSupply = await contract.maxSupply();
        console.log(`📊 Supply: ${totalSupply}/${maxSupply}`);
        return { totalSupply, maxSupply };
    } catch (error) {
        console.log("❌ Gagal mengambil data supply:", error.reason || error.message);
        return null;
    }
}

// 💰 Cek Saldo Wallet
async function getBalance(wallet) {
    return ethers.formatEther(await provider.getBalance(wallet));
}

// 🚀 Fungsi minting
async function mintNFT(wallet, contract, mintPrice, gasPrice) {
    try {
        console.log(`🔥 Minting NFT dengan wallet ${wallet.address}...`);

        const tx = await contract[mintFunction](
            wallet.address, 0, 1, "0x", // recipient, tokenId, amount, data
            { value: ethers.parseEther(mintPrice.toString()), gasPrice: gasPrice }
        );

        await tx.wait();
        console.log(`✅ Mint sukses! TX: ${tx.hash}`);
        return true;
    } catch (error) {
        console.log(`❌ Gagal minting: ${error.reason || error.message}`);
        return false;
    }
}

// 🚀 Start Bot
async function startBot() {
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

    // 🔄 Inisialisasi kontrak
    const contract = new ethers.Contract(contractAddress, abiData, provider);

    // 💰 Tampilkan saldo semua wallet
    console.log("\n💰 Saldo Wallet:");
    for (let privateKey of PRIVATE_KEYS) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await getBalance(wallet.address);
        console.log(`- ${wallet.address}: ${balance} MON`);
    }

    console.log("\n⏳ Memulai bot...");

    // 🚀 Mulai looping semua wallet
    let gasPrice = ethers.parseUnits("5", "gwei"); // Gas awal 5 Gwei

    while (true) {
        // 🔄 Cek supply NFT
        const supplyData = await getSupply(contract);
        if (!supplyData || supplyData.totalSupply >= supplyData.maxSupply) {
            console.log("❌ NFT SOLD OUT! BOT BERHENTI.");
            break;
        }

        // 🚀 Mint dengan semua wallet
        for (let privateKey of PRIVATE_KEYS) {
            const wallet = new ethers.Wallet(privateKey, provider);
            const contractWithSigner = contract.connect(wallet);

            const success = await mintNFT(wallet, contractWithSigner, mintPrice, gasPrice);
            if (!success) {
                // Jika gagal, naikkan gas price untuk transaksi berikutnya
                gasPrice = gasPrice * 2n; // Naikkan gas price 2x
                console.log(`⚡ Menaikkan gas price: ${ethers.formatUnits(gasPrice, "gwei")} Gwei`);
            }
        }
    }
}

startBot();
