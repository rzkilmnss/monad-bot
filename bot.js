const ethers = require("ethers");
require("dotenv").config();
const readline = require("readline");

// Konfigurasi RPC dan Wallet
const RPC_URL = "https://testnet-rpc.monad.xyz"; // Ganti dengan RPC Monad yang valid
const provider = new ethers.JsonRpcProvider(RPC_URL);
const PRIVATE_KEYS = process.env.PRIVATE_KEYS.split(","); // Multi-wallet (pisahkan dengan koma)

// Fungsi untuk input dari user
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Fungsi untuk mengambil contract address dari link Magic Eden
function extractContractAddress(url) {
    const match = url.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : null;
}

// Fungsi utama bot
async function startBot(contractAddress, mode) {
    console.log(`✅ Contract Address: ${contractAddress}`);
    
    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        const wallet = new ethers.Wallet(PRIVATE_KEYS[i], provider);
        console.log(`🚀 Menggunakan Wallet: ${wallet.address}`);

        while (true) {
            try {
                const contract = new ethers.Contract(contractAddress, ["function mint() payable"], wallet);
                
                // Jika memilih mode "Menunggu Open Public"
                if (mode === "2") {
                    let isMintingOpen = false;
                    while (!isMintingOpen) {
                        try {
                            await contract.estimateGas.mint({ value: ethers.parseEther("0.1") });
                            isMintingOpen = true;
                        } catch (error) {
                            console.log("⏳ Menunggu minting dibuka...");
                            await new Promise(resolve => setTimeout(resolve, 5000)); // Cek ulang tiap 5 detik
                        }
                    }
                }

                // Eksekusi Minting
                console.log(`🔥 Minting NFT dengan wallet ${wallet.address}...`);
                const tx = await contract.mint({ value: ethers.parseEther("0.1") });
                await tx.wait();

                console.log(`✅ Minting sukses di wallet ${wallet.address}!`);
                break; // Berhenti dan lanjut ke wallet berikutnya
            } catch (error) {
                console.error(`❌ Gagal minting: ${error.message}`);
                console.log("🔄 Mencoba ulang dalam 5 detik...");
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    console.log("🎉 Semua wallet berhasil mint! Bot berhenti.");
    process.exit(0);
}

// Input dari user
rl.question("Masukkan link Magic Eden: ", (url) => {
    const contractAddress = extractContractAddress(url);
    if (!contractAddress) {
        console.log("❌ Link tidak valid!");
        rl.close();
        process.exit(1);
    }

    console.log(`✅ Contract Address: ${contractAddress}`);
    rl.question("Pilih mode:\n1. Instant Minting\n2. Menunggu Open Public\nMasukkan pilihan (1/2): ", (mode) => {
        if (mode !== "1" && mode !== "2") {
            console.log("❌ Pilihan tidak valid!");
            rl.close();
            process.exit(1);
        }

        rl.close();
        startBot(contractAddress, mode);
    });
});
