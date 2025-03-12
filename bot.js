const ethers = require("ethers");
require("dotenv").config();
const readline = require("readline");

// Konfigurasi RPC Monad
const RPC_URL = "https://testnet-rpc.monad.xyz";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Fungsi untuk membaca input dari terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Fungsi untuk menanyakan input dari pengguna
const askQuestion = (query) => {
    return new Promise(resolve => rl.question(query, resolve));
};

(async () => {
    console.log("========================================");
    console.log("🔥 BOT AUTO MINT MONAD 🔥");
    console.log("========================================");

    // Input link Magic Eden
    let inputLink = await askQuestion("Masukkan link Magic Eden: ");
    let match = inputLink.match(/0x[a-fA-F0-9]{40}/);

    if (!match) {
        console.log("❌ Link tidak valid! Pastikan memasukkan link yang benar.");
        process.exit(1);
    }

    const contractAddress = match[0];
    console.log(`✅ Contract Address: ${contractAddress}`);

    // Pilih mode operasi
    console.log("\nPilih mode:");
    console.log("1. Instant Minting");
    console.log("2. Menunggu Open Public");
    let mode = await askQuestion("Masukkan pilihan (1/2): ");

    if (mode !== "1" && mode !== "2") {
        console.log("❌ Pilihan tidak valid!");
        process.exit(1);
    }

    // Ambil private keys dari environment variable
    const PRIVATE_KEYS = process.env.PRIVATE_KEYS?.split(",") || [];
    if (PRIVATE_KEYS.length === 0) {
        console.log("❌ Tidak ada private keys! Tambahkan ke file .env");
        process.exit(1);
    }

    // Buat instance wallet
    const wallets = PRIVATE_KEYS.map(key => new ethers.Wallet(key, provider));

    // Fungsi cek status mint
    async function isMintOpen(contract) {
        try {
            let open = await contract.mintStatus();
            return open; // True jika minting sudah terbuka
        } catch (error) {
            return false;
        }
    }

    // Fungsi cek supply NFT sebelum minting
    async function getSupply(contract) {
        try {
            let totalSupply = await contract.totalSupply();
            let maxSupply = await contract.maxSupply();
            return maxSupply - totalSupply; // Sisa supply yang tersedia
        } catch (error) {
            console.log("⚠️ Gagal mengambil informasi supply.");
            return 0;
        }
    }

    // Fungsi utama untuk menjalankan minting
    async function startBot() {
        const abi = [
            "function mint() public payable",
            "function mintStatus() public view returns (bool)",
            "function totalSupply() public view returns (uint256)",
            "function maxSupply() public view returns (uint256)"
        ];
        const contract = new ethers.Contract(contractAddress, abi, provider);

        let remainingWallets = [...wallets];

        while (remainingWallets.length > 0) {
            let wallet = remainingWallets.shift(); // Ambil wallet pertama dari daftar
            let signer = wallet.connect(provider);
            let contractWithSigner = contract.connect(signer);

            // Cek apakah mode menunggu open public
            if (mode === "2") {
                console.log(`⏳ Menunggu minting terbuka untuk wallet ${wallet.address}...`);
                while (!(await isMintOpen(contract))) {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Cek setiap 5 detik
                }
                console.log("✅ Minting telah dibuka!");
            }

            // Cek sisa supply sebelum minting
            let supplyLeft = await getSupply(contract);
            if (supplyLeft <= 0) {
                console.log("❌ Supply habis! Minting dihentikan.");
                process.exit(1);
            }

            // Proses minting
            try {
                console.log(`🚀 Minting dengan wallet: ${wallet.address}`);
                let tx = await contractWithSigner.mint({
                    value: ethers.parseEther("0.1") // Sesuaikan harga mint di sini
                });

                await tx.wait();
                console.log(`✅ Mint sukses! Wallet: ${wallet.address}`);
            } catch (error) {
                console.log(`❌ Mint gagal di wallet ${wallet.address}. Coba lagi...`);
                remainingWallets.push(wallet); // Coba lagi nanti
            }
        }

        console.log("🎉 Semua wallet berhasil mint! Bot berhenti.");
        process.exit(0);
    }

    await startBot();
})();
