// Simple favicon generator - creates a basic ICO file
const fs = require('fs');

// Create a simple 32x32 ICO file (minimal valid ICO format)
// ICO header: 6 bytes
const header = Buffer.from([
    0x00, 0x00,  // Reserved (must be 0)
    0x01, 0x00,  // Icon type (1 = icon)
    0x01, 0x00   // Number of images
]);

// ICO directory entry: 16 bytes
const width = 32;
const height = 32;
const colors = 0;  // 0 = 256 colors or more
const reserved = 0;
const planes = 1;
const bpp = 32;
const bmpDataSize = 40 + (width * height * 4);  // DIB header + pixel data
const bmpOffset = 6 + 16;  // After header and directory

const directory = Buffer.from([
    width,           // Width
    height,          // Height
    colors,          // Color count
    reserved,        // Reserved
    planes, 0x00,    // Color planes
    bpp, 0x00,       // Bits per pixel
    bmpDataSize & 0xFF, (bmpDataSize >> 8) & 0xFF, (bmpDataSize >> 16) & 0xFF, (bmpDataSize >> 24) & 0xFF,
    bmpOffset & 0xFF, (bmpOffset >> 8) & 0xFF, (bmpOffset >> 16) & 0xFF, (bmpOffset >> 24) & 0xFF
]);

// DIB header (BITMAPINFOHEADER)
const dibHeader = Buffer.from([
    40, 0x00, 0x00, 0x00,  // DIB header size
    width, 0x00, 0x00, 0x00,   // Width
    height * 2, 0x00, 0x00, 0x00,  // Height (doubled for ICO)
    1, 0x00,   // Color planes
    32, 0x00,  // Bits per pixel
    0, 0x00, 0x00, 0x00,  // Compression (0 = none)
    0, 0x00, 0x00, 0x00,  // Image size (can be 0 for uncompressed)
    0, 0x00, 0x00, 0x00,  // X pixels per meter
    0, 0x00, 0x00, 0x00,  // Y pixels per meter
    0, 0x00, 0x00, 0x00,  // Colors in color table
    0, 0x00, 0x00, 0x00   // Important colors
]);

// Pixel data (32x32 RGBA) - gradient background with simple design
const pixels = Buffer.alloc(width * height * 4);
let idx = 0;

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        // Gradient background (purple to cyan)
        const r = Math.floor(79 + (6 - 79) * (y / height));
        const g = Math.floor(70 + (182 - 70) * (y / height));
        const b = Math.floor(229 + (212 - 229) * (y / height));
        const a = 255;
        
        pixels[idx++] = b;  // BMP format is BGRA
        pixels[idx++] = g;
        pixels[idx++] = r;
        pixels[idx++] = a;
    }
}

// XOR mask (image data) - bottom half
const xorMask = Buffer.alloc(width * (height / 2));
xorMask.fill(0xFF);

// AND mask (1 bit per pixel)
const andMaskSize = Math.ceil(width / 4) * height;
const andMask = Buffer.alloc(andMaskSize);
andMask.fill(0x00);

// Combine all parts
const iconData = Buffer.concat([dibHeader, pixels]);

// Final ICO file
const ico = Buffer.concat([header, directory, iconData]);

fs.writeFileSync('favicon.ico', ico);
console.log('✅ favicon.ico generated!');
