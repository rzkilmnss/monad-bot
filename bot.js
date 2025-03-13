require("dotenv").config();
const { ethers } = require("ethers");
const readlineSync = require("readline-sync");

// Konfigurasi RPC
const RPC_URL = "https://testnet-rpc.monad.xyz"; // Gunakan RPC testnet Monad
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Ambil Private Keys dari .env
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(",");

// ABI yang sesuai dengan transaksi mint
const CONTRACT_ABI = [
    "function mintPublic(address recipient, uint256 tokenId, uint256 amount, bytes calldata data) payable"
];

// Baca ABI dari file
const abiData = JSON.parse(fs.readFileSync('abi.json', 'utf-8'));

// Ambil function signature dan parameter dari ABI
const mintFunction = abiData[0].mintFunction;
const params = abiData[0].params;

console.log("🔍 Menggunakan fungsi mint:", mintFunction);
console.log("📜 Parameter:", params);

async function mintNFT(wallet, contract, mintPrice) {
    try {
        const contractInterface = new ethers.utils.Interface([
            `function ${mintFunction}(${params.join(',')})`
        ]);

        const encodedData = contractInterface.encodeFunctionData(mintFunction, [
            wallet.address, 1, []
        ]);

        const tx = await wallet.sendTransaction({
            to: contract.address,
            data: encodedData,
            value: ethers.utils.parseEther(mintPrice.toString()),
            gasLimit: 100000
        });

        console.log("✅ Minting sukses! Tx Hash:", tx.hash);
        await tx.wait();  // Tunggu transaksi selesai
    } catch (error) {
        console.error("❌ Gagal minting:", error);
    }
}

// Contoh pemanggilan (pastikan ada provider & signer)
async function main() {
    const provider = new ethers.providers.JsonRpcProvider("https://rpc.testnet.monad.xyz");
    const wallet = new ethers.Wallet("PRIVATE_KEY", provider);
    const contract = new ethers.Contract("CONTRACT_ADDRESS", abiData, wallet);

    const mintPrice = 0.1;  // Sesuaikan harga
    await mintNFT(wallet, contract, mintPrice);
}

main();

// Fungsi untuk menampilkan saldo wallet
async function getBalance(wallet) {
    const balance = await provider.getBalance(wallet);
    return ethers.formatEther(balance);
}

// Fungsi minting NFT
async function mintNFT(wallet, contract, mintPrice, tokenId = 0, amount = 1) {
    try {
        console.log(`🔥 Minting NFT dengan wallet ${wallet.address} seharga ${mintPrice} MON...`);

        const tx = await contract.mintPublic(
            wallet.address,  // recipient
            tokenId,         // tokenId (default: 0)
            amount,          // amount (default: 1)
            "0x",            // data (kosong)
            { value: ethers.parseEther(mintPrice) }
        );

        await tx.wait();
        console.log(`✅ Mint sukses! TX: ${tx.hash}`);
        return true;
    } catch (error) {
        console.log(`❌ Gagal minting: ${error.reason || error.message}`);
        return false;
    }
}

// Fungsi utama bot
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

    // Input harga mint
    let mintPrice = readlineSync.question("Masukkan harga mint (MON) [default 0.1]: ").trim();
    if (!mintPrice) mintPrice = "0.1"; // Default 0.1 MON

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
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

    // Tampilkan saldo wallet
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
                const canMint = await contract.estimateGas.mintPublic(wallet.address, 0, 1, "0x", { value: ethers.parseEther(mintPrice) }).catch(() => false);
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
