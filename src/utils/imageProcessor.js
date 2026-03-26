/**
 * ═══════════════════════════════════════════════════════════════════════════
 * imageProcessor.js — Browser-Side Apparel CV Pipeline
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Transforms a raw photo (File) into a clean, artistic, consistently-sized
 * apparel image ENTIRELY in the browser using Canvas API + WASM.
 *
 * Pipeline:
 *   1. Load & decode image
 *   2. Auto-brightness correction (dark photo fix)
 *   3. Background removal via @imgly/background-removal (ONNX WASM)
 *   4. Artistic 2D posterkze + outline effect
 *   5. Fit to fixed 3:4 canvas (600×800px)
 *   6. Dominant color extraction (pixel sampling + k-means-lite)
 *   7. Apparel type classification (bounding box heuristics)
 *   8. Auto-tag generation
 *
 * @module imageProcessor
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Constants ───────────────────────────────────────────────────────────────
const TARGET_W = 600
const TARGET_H = 800   // 3:4 aspect ratio

// ── Tag vocabulary (matches tagStore.js) ────────────────────────────────────
const TYPE_TAGS = {
    Tops:       ['#tee', '#crewneck', '#graphic', '#casual', '#streetwear'],
    Shirt:      ['#shirt', '#button_up', '#collared', '#fitted'],
    Hoodie:     ['#hoodie', '#oversized', '#streetwear', '#plain'],
    Tank:       ['#tank', '#sleeveless', '#summer', '#fitted'],
    Bottoms:    ['#denim', '#cargo', '#baggy', '#casual', '#streetwear'],
    Jeans:      ['#denim', '#jeans', '#classic', '#straight'],
    Shoes:      ['#sneakers', '#runners', '#leather', '#canvas'],
    Overlayer:  ['#puffer', '#bomber', '#windbreaker', '#denim_jacket'],
    'One-Piece':['#midi', '#jumpsuit', '#frock', '#bodycon'],
    Dress:      ['#midi', '#frock', '#feminine', '#dress'],
    Jumpsuit:   ['#jumpsuit', '#one_piece', '#streetwear'],
    Bling:      ['#chain', '#watch', '#sunglasses'],
}

// Normalize sub-types to app category names
const TYPE_TO_CATEGORY = {
    Tee: 'Tops', Shirt: 'Tops', Hoodie: 'Tops', Tank: 'Tops', Tops: 'Tops',
    Bottoms: 'Bottoms', Jeans: 'Bottoms',
    Shoes: 'Shoes', Sneakers: 'Shoes',
    Overlayer: 'Overlayer',
    'One-Piece': 'One-Piece', Dress: 'One-Piece', Jumpsuit: 'One-Piece',
    Bling: 'Bling',
}

const COLOR_TAGS = {
    black:  { hex: '#111111', tags: ['#darkcore', '#monochrome'] },
    white:  { hex: '#f5f5f5', tags: ['#clean', '#minimalist'] },
    gray:   { hex: '#888888', tags: ['#neutral', '#greige'] },
    red:    { hex: '#cc2200', tags: ['#bold', '#statement'] },
    blue:   { hex: '#003087', tags: ['#navy', '#cool_tone'] },
    green:  { hex: '#1a5c28', tags: ['#earthy', '#outdoorsy'] },
    brown:  { hex: '#7b4a1a', tags: ['#earthy', '#vintage'] },
    yellow: { hex: '#ccaa00', tags: ['#bold', '#summer'] },
    pink:   { hex: '#e91e8c', tags: ['#soft', '#pastel'] },
    purple: { hex: '#6a0dad', tags: ['#bold', '#eclectic'] },
    orange: { hex: '#cc5500', tags: ['#warm_tone', '#bold'] },
    beige:  { hex: '#c8a87a', tags: ['#neutral', '#earthy'] },
}

// ── Stage 0: EXIF Orientation Fix ──────────────────────────────────────────

/**
 * Read EXIF orientation from a File and return the rotation degrees.
 * Browsers auto-apply EXIF on <img> but NOT when drawing to OffscreenCanvas.
 */
async function readExifOrientation(file) {
    try {
        const buf = await file.arrayBuffer()
        const view = new DataView(buf)
        // Check JPEG signature
        if (view.getUint16(0) !== 0xFFD8) return 1
        let offset = 2
        while (offset < view.byteLength - 4) {
            const marker = view.getUint16(offset)
            if (marker === 0xFFE1) {  // APP1 — EXIF
                const exifOffset = offset + 4
                const endian = view.getUint16(exifOffset)
                const le = endian === 0x4949
                const ifdOffset = view.getUint32(exifOffset + 4, le)
                const numEntries = view.getUint16(exifOffset + ifdOffset, le)
                for (let i = 0; i < numEntries; i++) {
                    const tag = view.getUint16(exifOffset + ifdOffset + 2 + i * 12, le)
                    if (tag === 0x0112) {  // Orientation tag
                        return view.getUint16(exifOffset + ifdOffset + 2 + i * 12 + 8, le)
                    }
                }
            }
            const segLen = view.getUint16(offset + 2)
            offset += 2 + segLen
        }
    } catch {}
    return 1  // default: no rotation
}

/**
 * Draw an image onto an OffscreenCanvas, applying EXIF orientation correction.
 * Handles all 8 EXIF orientation values.
 */
async function imageToCanvasWithOrientation(img, file, maxDim = 1200) {
    const orientation = file ? await readExifOrientation(file) : 1
    let { width: sw, height: sh } = img
    const scale = Math.min(1, maxDim / Math.max(sw, sh))
    sw = Math.round(sw * scale)
    sh = Math.round(sh * scale)
    // For orientations 5-8, width and height swap
    const swap = orientation >= 5
    const cw = swap ? sh : sw
    const ch = swap ? sw : sh
    const canvas = new OffscreenCanvas(cw, ch)
    const ctx = canvas.getContext('2d')
    ctx.save()
    switch (orientation) {
        case 2: ctx.transform(-1, 0, 0, 1, cw, 0); break
        case 3: ctx.transform(-1, 0, 0, -1, cw, ch); break
        case 4: ctx.transform(1, 0, 0, -1, 0, ch); break
        case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
        case 6: ctx.transform(0, 1, -1, 0, ch, 0); break
        case 7: ctx.transform(0, -1, -1, 0, ch, cw); break
        case 8: ctx.transform(0, -1, 1, 0, 0, cw); break
        default: break  // case 1 — no transform needed
    }
    ctx.drawImage(img, 0, 0, sw, sh)
    ctx.restore()
    return { canvas, ctx, w: cw, h: ch }
}

/**
 * Draw an image onto an offscreen canvas (no orientation fix, for blobs).
 */
function imageToCanvas(img, maxDim = 1200) {
    let { width: w, height: h } = img
    const scale = Math.min(1, maxDim / Math.max(w, h))
    w = Math.round(w * scale)
    h = Math.round(h * scale)
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, w, h)
    return { canvas, ctx, w, h }
}

/**
 * Compute mean luminance of ImageData.
 */
function meanLuminance(data) {
    let total = 0
    for (let i = 0; i < data.data.length; i += 4) {
        total += 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2]
    }
    return total / (data.data.length / 4)
}

// ── Stage 1: Auto-brightness ────────────────────────────────────────────────

/**
 * If the image is dark (mean luminance < 90), apply gamma correction.
 * Returns a new canvas with corrected pixels.
 */
function fixBrightness(canvas, ctx) {
    const { width: w, height: h } = canvas
    const imgData = ctx.getImageData(0, 0, w, h)
    const lum = meanLuminance(imgData)

    if (lum >= 110) return canvas  // already bright enough

    const gamma = lum < 70 ? 0.5 : 0.7
    const lut = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
        lut[i] = Math.min(255, Math.round(Math.pow(i / 255, gamma) * 255))
    }

    const d = imgData.data
    for (let i = 0; i < d.length; i += 4) {
        d[i]     = lut[d[i]]
        d[i + 1] = lut[d[i + 1]]
        d[i + 2] = lut[d[i + 2]]
    }
    ctx.putImageData(imgData, 0, 0)
    return canvas
}

// ── Stage 2: Background Removal ─────────────────────────────────────────────

let bgRemoverModule = null

async function loadBgRemover() {
    if (bgRemoverModule) return bgRemoverModule
    try {
        bgRemoverModule = await import('@imgly/background-removal')
        return bgRemoverModule
    } catch {
        return null
    }
}

/**
 * Remove background using @imgly/background-removal (WASM/ONNX).
 * Falls back gracefully if not available.
 * Returns a Blob (PNG with alpha).
 */
async function removeBackground(source, onProgress) {
    const mod = await loadBgRemover()
    if (!mod) return null  // graceful fallback

    onProgress?.('Removing background…', 30)
    const blob = source instanceof File ? source : await fetch(source).then(r => r.blob())
    try {
        const result = await mod.removeBackground(blob, {
            publicPath: '/',
            progress: (_, pct) => onProgress?.(`Processing… ${Math.round(pct * 100)}%`, 30 + pct * 30),
        })
        return result  // Blob
    } catch (e) {
        console.warn('[imageProcessor] BG removal failed, skipping:', e)
        return null
    }
}

// ── Stage 3: Artistic 2D Effect ─────────────────────────────────────────────

/**
 * Apply posterize + edge-overlay cartoon/artistic look.
 * Works on an RGBA canvas.
 */
function applyArtisticEffect(canvas) {
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas
    const imgData = ctx.getImageData(0, 0, w, h)
    const d = imgData.data

    // --- Posterize (reduce color steps to 5 levels per channel) ---
    const levels = 5
    const step = 255 / (levels - 1)
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 20) continue  // skip transparent
        d[i]     = Math.round(Math.round(d[i]     / step) * step)
        d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step)
        d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step)
        // Boost saturation slightly
        const r = d[i], g = d[i + 1], b = d[i + 2]
        const avg = (r + g + b) / 3
        d[i]     = Math.min(255, Math.round(avg + (r - avg) * 1.3))
        d[i + 1] = Math.min(255, Math.round(avg + (g - avg) * 1.3))
        d[i + 2] = Math.min(255, Math.round(avg + (b - avg) * 1.3))
    }
    ctx.putImageData(imgData, 0, 0)

    // --- Edge outline: draw stroked silhouette ---
    // Get alpha channel as a mask, dilate, composite dark border
    const edgeCanvas = new OffscreenCanvas(w, h)
    const eCtx = edgeCanvas.getContext('2d')
    eCtx.drawImage(canvas, 0, 0)

    // Draw a slightly expanded dark silhouette behind
    const resultCanvas = new OffscreenCanvas(w, h)
    const rCtx = resultCanvas.getContext('2d')
    
    // Draw outline: composite trick — shadow of the image
    rCtx.shadowColor = 'rgba(0,0,0,0.85)'
    rCtx.shadowBlur = 0
    // Draw multiple offsets for thick crisp outline
    const outlineSteps = [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]]
    for (const [dx, dy] of outlineSteps) {
        rCtx.drawImage(canvas, dx, dy)
    }
    rCtx.globalCompositeOperation = 'source-atop'
    rCtx.fillStyle = 'rgba(0,0,0,0.6)'
    rCtx.fillRect(0, 0, w, h)
    rCtx.globalCompositeOperation = 'source-over'
    rCtx.shadowBlur = 0

    // Draw the actual posterized image on top
    rCtx.drawImage(canvas, 0, 0)
    return resultCanvas
}

// ── Stage 4: Fit to Fixed Canvas ────────────────────────────────────────────

/**
 * Center-fit the processed image onto a TARGET_W×TARGET_H dark canvas.
 */
function fitToCanvas(source, bgColor = '#0d0d0d') {
    const canvas = new OffscreenCanvas(TARGET_W, TARGET_H)
    const ctx = canvas.getContext('2d')

    // Fill background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, TARGET_W, TARGET_H)

    // Scale src to fit inside with padding
    const padX = 20, padY = 20
    const maxW = TARGET_W - padX * 2
    const maxH = TARGET_H - padY * 2
    const srcW = source.width, srcH = source.height
    const scale = Math.min(maxW / srcW, maxH / srcH)
    const dw = Math.round(srcW * scale)
    const dh = Math.round(srcH * scale)
    const dx = Math.round((TARGET_W - dw) / 2)
    const dy = Math.round((TARGET_H - dh) / 2)
    ctx.drawImage(source, dx, dy, dw, dh)
    return canvas
}

// ── Stage 5: Dominant Color ─────────────────────────────────────────────────

/**
 * Sample pixels from the canvas and find dominant color via median cut.
 * Returns #RRGGBB hex.
 */
function extractDominantColor(canvas) {
    const ctx = canvas.getContext('2d')
    const { width: w, height: h } = canvas
    const imgData = ctx.getImageData(0, 0, w, h)
    const d = imgData.data

    // Collect non-background, non-transparent pixels
    const pixels = []
    const sampleStep = Math.max(1, Math.floor(d.length / 4 / 1000))
    for (let i = 0; i < d.length; i += 4 * sampleStep) {
        const a = d[i + 3]
        const r = d[i], g = d[i + 1], b = d[i + 2]
        // Skip transparent, near-black bg, near-white
        if (a < 20) continue
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        if (lum < 15 || lum > 245) continue
        pixels.push([r, g, b])
    }

    if (pixels.length === 0) return '#888888'

    // Simple k-means lite (3 clusters, 10 iterations)
    const k = 3
    let centers = pixels.slice(0, k).map(p => [...p])
    for (let iter = 0; iter < 10; iter++) {
        const sums = Array.from({ length: k }, () => [0, 0, 0, 0])  // r,g,b,count
        for (const px of pixels) {
            let best = 0, bestD = Infinity
            for (let c = 0; c < k; c++) {
                const d2 = (px[0]-centers[c][0])**2 + (px[1]-centers[c][1])**2 + (px[2]-centers[c][2])**2
                if (d2 < bestD) { bestD = d2; best = c }
            }
            sums[best][0] += px[0]; sums[best][1] += px[1]; sums[best][2] += px[2]; sums[best][3]++
        }
        centers = sums.map((s, i) => s[3] ? [s[0]/s[3], s[1]/s[3], s[2]/s[3]] : centers[i])
    }

    // Pick the largest cluster (most common color)
    const counts = new Array(k).fill(0)
    for (const px of pixels) {
        let best = 0, bestD = Infinity
        for (let c = 0; c < k; c++) {
            const d2 = (px[0]-centers[c][0])**2 + (px[1]-centers[c][1])**2 + (px[2]-centers[c][2])**2
            if (d2 < bestD) { bestD = d2; best = c }
        }
        counts[best]++
    }
    const dominant = centers[counts.indexOf(Math.max(...counts))].map(Math.round)
    return '#' + dominant.map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
}

// ── Stage 6: Color Name ──────────────────────────────────────────────────────
function colorNameFromHex(hex) {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    let best = 'gray', bestDist = Infinity
    for (const [name, { hex: ref }] of Object.entries(COLOR_TAGS)) {
        const rr = parseInt(ref.slice(1, 3), 16)
        const rg = parseInt(ref.slice(3, 5), 16)
        const rb = parseInt(ref.slice(5, 7), 16)
        const d = (r - rr) ** 2 + (g - rg) ** 2 + (b - rb) ** 2
        if (d < bestDist) { bestDist = d; best = name }
    }
    return best
}

// ── Stage 6: Improved Type Classification ───────────────────────────────────

/**
 * Analyze the collar region (top 20% of bounding box).
 * Returns { edgeDensity, collarType: 'v'|'round'|'none' }
 */
function analyzeCollarRegion(data, w, h, rmin, rmax, cmin, cmax) {
    const itemH = rmax - rmin
    const zoneH = Math.max(Math.floor(itemH * 0.20), 4)
    const itemW = cmax - cmin

    let edgeSum = 0, edgeCount = 0
    let centerFill = 0, sideFill = 0
    const cx1 = cmin + Math.floor(itemW * 0.25)
    const cx2 = cmin + Math.floor(itemW * 0.75)

    for (let y = rmin; y < rmin + zoneH && y < h - 1; y++) {
        for (let x = cmin; x < cmax && x < w - 1; x++) {
            const i  = (y * w + x) * 4
            const ir = (y * w + x + 1) * 4
            const ib = ((y + 1) * w + x) * 4
            if (data[i + 3] < 30) continue
            const lum    = 0.299 * data[i]   + 0.587 * data[i+1]   + 0.114 * data[i+2]
            const lumR   = 0.299 * data[ir]  + 0.587 * data[ir+1]  + 0.114 * data[ir+2]
            const lumB   = 0.299 * data[ib]  + 0.587 * data[ib+1]  + 0.114 * data[ib+2]
            const grad   = Math.sqrt((lum - lumR) ** 2 + (lum - lumB) ** 2)
            edgeSum += grad; edgeCount++
            // Track fill for V-neck detection
            if (x >= cx1 && x < cx2) centerFill++
            else sideFill++
        }
    }
    const edgeDensity = edgeCount ? edgeSum / edgeCount : 0
    const vRatio = centerFill / Math.max(sideFill, 1)
    const collarType = vRatio < 0.55 ? 'v' : 'round'
    return { edgeDensity, collarType }
}

/**
 * Detailed apparel type classifier returning a sub-type string.
 * Returns: 'Tee' | 'Shirt' | 'Hoodie' | 'Tank' | 'Jeans' | 'Bottoms' |
 *          'Sneakers' | 'Overlayer' | 'Dress' | 'Jumpsuit' | 'Bling'
 */
function classifyApparelTypeDetailed(canvas) {
    const ctx = canvas.getContext('2d')
    const { width: W, height: H } = canvas
    const imgData = ctx.getImageData(0, 0, W, H)
    const d = imgData.data

    // Bounding box of non-background pixels
    let rmin = H, rmax = 0, cmin = W, cmax = 0
    const bgLum = 13
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4
            const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
            if (d[i+3] < 30 || lum < bgLum + 8) continue
            if (y < rmin) rmin = y; if (y > rmax) rmax = y
            if (x < cmin) cmin = x; if (x > cmax) cmax = x
        }
    }
    if (rmax <= rmin || cmax <= cmin) return 'Tee'

    const bh = rmax - rmin, bw = cmax - cmin
    const aspect = bh / Math.max(bw, 1)
    const fillPx = bh * bw
    const fillRatio = fillPx / (W * H)

    // ── Shoes: very wide relative to height
    if (aspect < 0.65 && bw > W * 0.5) return 'Sneakers'
    if (aspect < 0.85) return 'Bling'

    // ── Very tall pants
    if (aspect > 2.5) return 'Jeans'
    if (aspect > 1.8) return 'Bottoms'

    // ── One-piece: large fill ratio
    if (fillRatio > 0.40 && aspect > 1.2) {
        // Waist-pinch check: jumpsuit vs dress
        const midY1 = Math.floor((H / 2) - H * 0.08)
        const midY2 = Math.floor((H / 2) + H * 0.08)
        let waistW = 0
        for (let y = midY1; y < midY2; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4
                const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
                if (d[i+3] > 30 && lum > bgLum + 8) { waistW++; break }
            }
        }
        const waistRatio = waistW / Math.max(bw, 1)
        return waistRatio < 0.70 ? 'Jumpsuit' : 'Dress'
    }

    // ── Overlayer / Hoodie: shoulder wider than hips
    if (aspect > 1.3) {
        const topH  = Math.max(Math.floor(bh * 0.15), 2)
        const botH  = Math.max(Math.floor(bh * 0.15), 2)
        let shoulderW = 0, hipW = 0
        for (let y = rmin; y < rmin + topH; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4
                const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
                if (d[i+3] > 30 && lum > bgLum + 8) shoulderW++
            }
        }
        for (let y = rmax - botH; y < rmax; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4
                const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
                if (d[i+3] > 30 && lum > bgLum + 8) hipW++
            }
        }
        const volRatio = shoulderW / Math.max(hipW, 1)
        if (volRatio > 1.25) return 'Overlayer'
        if (volRatio > 1.05 && fillRatio > 0.28) return 'Hoodie'
    }

    // ── Collar analysis: shirt vs tee vs tank
    const collar = analyzeCollarRegion(d, W, H, rmin, rmax, cmin, cmax)
    if (collar.edgeDensity > 18 && collar.collarType === 'v') return 'Shirt'
    if (aspect < 0.92) return 'Tank'
    return 'Tee'
}

// Public wrapper — maps sub-type to app category
function classifyApparelType(canvas) {
    const sub = classifyApparelTypeDetailed(canvas)
    return TYPE_TO_CATEGORY[sub] || 'Tops'
}

// ── Stage 7: Tag Generation ──────────────────────────────────────────────────
function generateTags(subType, colorName) {
    // Use sub-type specific tags first, then fall back to category
    const cat = TYPE_TO_CATEGORY[subType] || 'Tops'
    const typeTags = (TYPE_TAGS[subType] || TYPE_TAGS[cat] || []).slice(0, 3)
    const colorEntry = COLOR_TAGS[colorName] || { tags: [] }
    const colorTagList = [`#${colorName}`, ...colorEntry.tags.slice(0, 2)]
    return [...new Set([...typeTags, ...colorTagList])].slice(0, 6)
}

// ── Canvas → Data URL ────────────────────────────────────────────────────────
async function canvasToDataUrl(canvas) {
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result)
        reader.readAsDataURL(blob)
    })
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} ProcessedResult
 * @property {string} processedDataUrl  - Final PNG data URL (600×800)
 * @property {string} originalDataUrl   - Raw original image data URL
 * @property {string} dominantColor     - Hex color e.g. '#3A2F1C'
 * @property {string} colorName         - Human name e.g. 'brown'
 * @property {string} detectedType      - 'Tops'|'Bottoms'|'Shoes'|'Overlayer'|'One-Piece'|'Bling'
 * @property {string[]} suggestedTags   - e.g. ['#streetwear','#oversized','#black']
 * @property {boolean} bgRemoved        - whether background was successfully removed
 */

/**
 * Main pipeline entry point. Call this from AddApparelModal.
 *
 * @param {File} file - The user-uploaded image file
 * @param {function} [onProgress] - (message: string, pct: number) => void
 * @returns {Promise<ProcessedResult>}
 */
export async function processApparelImage(file, onProgress = () => {}) {
    onProgress('Loading image…', 5)

    // 0. Load image + EXIF orientation fix
    const img = await loadImage(file)
    const { canvas, ctx } = await imageToCanvasWithOrientation(img, file, 1200)

    // Save original (orientation-corrected) data url before any processing
    const originalBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
    const originalDataUrl = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result)
        reader.readAsDataURL(originalBlob)
    })

    onProgress('Fixing brightness…', 10)
    // 1. Brightness correction
    fixBrightness(canvas, ctx)

    // 2. Extract dominant color NOW — before BG removal or artistic effects
    //    This ensures the color represents the actual garment hue
    onProgress('Analyzing colors…', 15)
    const dominantColor = extractDominantColor(canvas)
    const colorName = colorNameFromHex(dominantColor)

    onProgress('Removing background…', 22)

    let workCanvas = canvas
    let bgRemoved = false

    // 3. Background removal (WASM — may take 5-15s on first load)
    try {
        const bgBlob = await removeBackground(file, onProgress)
        if (bgBlob) {
            const bgImg = await loadImage(URL.createObjectURL(bgBlob))
            const { canvas: bgCanvas } = imageToCanvas(bgImg, 1200)
            workCanvas = bgCanvas
            bgRemoved = true
        }
    } catch (e) {
        console.warn('[imageProcessor] BG removal unavailable:', e)
    }

    onProgress('Applying artistic effect…', 65)

    // 4. Artistic 2D effect
    const artCanvas = applyArtisticEffect(workCanvas)

    onProgress('Composing final image…', 75)

    // 5. Fit to 3:4 canvas
    const finalCanvas = fitToCanvas(artCanvas)

    // 6. Type classification (on final composed canvas)
    onProgress('Classifying apparel…', 88)
    const subType = classifyApparelTypeDetailed(finalCanvas)
    const detectedType = TYPE_TO_CATEGORY[subType] || 'Tops'

    // 7. Tags (using sub-type vocabulary)
    const suggestedTags = generateTags(subType, colorName)

    // 8. Export
    onProgress('Finalizing…', 95)
    const processedDataUrl = await canvasToDataUrl(finalCanvas)

    onProgress('Done!', 100)

    return {
        processedDataUrl,
        originalDataUrl,
        dominantColor,
        colorName,
        detectedType,
        subType,
        suggestedTags,
        bgRemoved,
    }
}
