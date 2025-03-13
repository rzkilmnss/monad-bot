const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getMintFunction() {
    return new Promise((resolve) => {
        rl.question("🔹 Masukkan fungsi mint yang benar (contoh: mint() atau mint(uint256)): ", (input) => {
            rl.close();
            resolve(input);
        });
    });
}

async function main() {
    console.log("✅ Contract Address:", contractAddress);
    
    const mintFunction = await getMintFunction();

    for (const wallet of wallets) {
        console.log(`🔥 Minting NFT dengan wallet ${wallet.address} menggunakan fungsi ${mintFunction}...`);

        try {
            let tx;
            if (mintFunction === "mint()") {
                tx = await contract.mint();
            } else if (mintFunction === "mint(uint256)") {
                tx = await contract.mint(1); // Bisa diubah sesuai jumlah mint
            } else if (mintFunction === "mint(address,uint256)") {
                tx = await contract.mint(wallet.address, 1);
            } else {
                console.log("❌ Fungsi mint tidak valid! Coba lagi.");
                return;
            }

            console.log(`✅ Mint sukses! TX: ${tx.hash}`);
        } catch (error) {
            console.log(`❌ Gagal minting: ${error.message}`);
        }
    }
}

main();
