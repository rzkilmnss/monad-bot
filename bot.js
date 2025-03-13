require("dotenv").config();
const { ethers } = require("ethers");
const readlineSync = require("readline-sync");
const axios = require("axios");

// Konfigurasi RPC
const RPC_URL = "https://testnet-rpc.monad.xyz"; // Sesuaikan dengan jaringan yang digunakan
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Ambil Private Keys dari .env
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",");

// Fungsi untuk mendapatkan ABI dari Monad Explorer
async function getContractABI(contractAddress) {
    try {
        const response = await axios.get(`https://testnet.monadexplorer.com/api?module=contract&action=getabi&address=${contractAddress}`);
        if (response.data.status === "1") {
            return JSON.parse(response.data.result);
        } else {
            console.log("❌ ABI tidak ditemukan, mencoba metode lain...");
            return null;
        }
    } catch (error) {
        console.log("❌ Gagal mengambil ABI:", error.message);
        return null;
    }
}

// Fungsi untuk mendeteksi fungsi mint yang benar
async function detectMintFunction(contract) {
    try {
        const abi = contract.interface.fragments;
        for (const func of abi) {
            if (func.type === "function" && func.name.toLowerCase().includes("mint")) {
                return func.name; // Mengembalikan nama fungsi mint yang ditemukan
            }
        }
    } catch (error) {
        console.log("❌ Gagal mendeteksi fungsi mint:", error.message);
    }
    return null;
}

// Fungsi untuk mint NFT
async function mintNFT(wallet, contract, functionName, mintPrice) {
    try {
        console.log(`🔥 Minting NFT dengan wallet ${wallet.address} menggunakan fungsi ${functionName}...`);
        const tx = await contract[functionName]({ value: ethers.parseEther(mintPrice) });
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

    // Ambil ABI otomatis
    let abi = await getContractABI(contractAddress);
    if (!abi) {
        console.log("⚠️ ABI tidak tersedia, mencoba metode brute-force...");
        abi = ["function mint() payable", "function mint(uint256 amount) payable"];
    }

    // Inisialisasi contract
    const contract = new ethers.Contract(contractAddress, abi, provider);

    // Deteksi fungsi mint
    let mintFunction = await detectMintFunction(contract);
    if (!mintFunction) {
        console.log("❌ Tidak dapat mendeteksi fungsi mint! Harap cek ABI secara manual.");
        return;
    }

    // Mulai proses minting
    console.log("\n⏳ Memulai bot...");
    for (let privateKey of PRIVATE_KEYS) {
        const wallet = new ethers.Wallet(privateKey, provider);
        const contractWithSigner = contract.connect(wallet);
        await mintNFT(wallet, contractWithSigner, mintFunction, mintPrice);
    }
}

startBot();
