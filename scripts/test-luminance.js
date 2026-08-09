import { calculateLuminance } from '../src/vision-scanner.js';

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

console.log("Running Luminance Tests...");

// Mock context factory
const createMockCtx = (dataArray) => {
    return {
        getImageData: (x, y, w, h) => {
            return {
                data: new Uint8ClampedArray(dataArray)
            };
        }
    };
};

try {
    // 1. Pure White
    // Width 2, Height 2 (4 pixels). 4 * 4 (RGBA) = 16 values
    const whiteData = new Array(16).fill(255);
    const whiteCtx = createMockCtx(whiteData);
    const whiteLum = calculateLuminance(whiteCtx, 2, 2);
    // Since we sample every 4th pixel, i increases by 16. So it checks index 0.
    // Pixel 0: 255,255,255. Luminance: 0.299*255 + 0.587*255 + 0.114*255 = 255
    assert(Math.abs(whiteLum - 255) < 0.1, "Expected 255, got " + whiteLum);

    // 2. Pure Black
    const blackData = new Array(16).fill(0);
    // alpha can be 255
    blackData[3] = 255; blackData[7] = 255; blackData[11] = 255; blackData[15] = 255;
    const blackCtx = createMockCtx(blackData);
    const blackLum = calculateLuminance(blackCtx, 2, 2);
    assert(blackLum === 0, "Expected 0, got " + blackLum);

    // 3. Medium Gray (128, 128, 128)
    const grayData = new Array(16).fill(128);
    const grayCtx = createMockCtx(grayData);
    const grayLum = calculateLuminance(grayCtx, 2, 2);
    assert(Math.abs(grayLum - 128) < 0.1, "Expected 128, got " + grayLum);

    // 4. Fallback on Error (simulate empty or tainted canvas error)
    const errorCtx = {
        getImageData: () => { throw new Error("Canvas tainted"); }
    };
    const errLum = calculateLuminance(errorCtx, 2, 2);
    assert(errLum === 255, "Expected fallback 255, got " + errLum);

    console.log("✅ All luminance tests passed successfully.");
} catch (e) {
    console.error("❌ Luminance Test Failed:", e.message);
    process.exit(1);
}
