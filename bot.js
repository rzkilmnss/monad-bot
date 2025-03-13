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

// Fungsi untuk mendapatkan harga mint otomatis
async function getMintPrice(contract) {
    try {
        const price = await contract.mintPrice(); // Pastikan ini sesuai dengan fungsi di smart contract
        return ethers.formatEther(price);
    } catch (error) {
        console.log("⚠️ Gagal mengambil harga mint. Gunakan nilai default 0.1 MON");
        return "0.1"; // Default jika gagal
    }
}

// Fungsi minting NFT
async function mintNFT(wallet, contract) {
    try {
        const price = await getMintPrice(contract);
        console.log(`🔥 Minting NFT dengan wallet ${wallet.address} dengan harga ${price} MON...`);

        const tx = await contract.mint({ value: ethers.parseEther(price) });
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

    // Pilih mode mint
    console.log("\nPilih mode:");
    console.log("1. Instant Minting");
    console.log("2. Menunggu Open Public");
    const mode = readlineSync.question("Masukkan pilihan (1/2): ").trim();

    // Inisialisasi contract
    const contract = new ethers.Contract(
        contractAddress,
        ["function mintPrice() view returns (uint256)", "function mint() payable"],
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
            await mintNFT(wallet, contractWithSigner);
        } else {
            console.log("🚀 Menunggu Open Public...");
            while (true) {
                const canMint = await contract.estimateGas.mint({ value: ethers.parseEther(await getMintPrice(contract)) }).catch(() => false);
                if (canMint) {
                    await mintNFT(wallet, contractWithSigner);
                    break;
                }
                await new Promise((r) => setTimeout(r, 5000));
            }
        }
    }
}

startBot();
