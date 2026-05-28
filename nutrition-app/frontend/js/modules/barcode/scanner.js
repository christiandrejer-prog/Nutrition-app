
import { fetchFoodFromAPI } from "./openfoodfacts.js";

// Barcode scanning functions
export function scanBarcode() {
    const scannerDiv = document.getElementById("barcode-scanner");
    if (!scannerDiv || typeof Quagga === "undefined") return;
    scannerDiv.style.display = "block";

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            },
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 2,
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader", "upc_e_reader"]
        },
        locate: true
    }, function(err) {
        if (err) {
            console.log(err);
            alert("Error initializing camera: " + err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(function(result) {
        const code = result.codeResult.code;
        stopScanning();
        fetchFoodFromAPI(code);
    });
}

export function stopScanning() {
    if (typeof Quagga !== "undefined") {
        Quagga.stop();
    }
    const scannerDiv = document.getElementById("barcode-scanner");
    if (scannerDiv) scannerDiv.style.display = "none";
}
