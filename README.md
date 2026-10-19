# AnySVG - Professional High-Quality SVG Converter & Vectorizer

A high-performance, 100% client-side web application for converting raster images (PNG, JPG, WEBP, GIF, BMP) into true scalable vector graphics (SVG) using intelligent color quantization and smooth Bezier path tracing.

---

## 🌟 Key Features

1. **True Vectorization Engine**:
   - Uses real contour detection, color clustering, and Douglas-Peucker path simplification.
   - Outputs clean, standard SVG `<path>` elements with smooth Bezier curves (no fake base64 wrappers).
2. **Interactive Real-Time Controls**:
   - Multi-Color vs. Monochrome (B&W) tracing modes.
   - Color count slider (2 to 32 colors).
   - Curve smoothness filter (Sharp, Balanced, Ultra-Smooth).
   - Instant "Remove Background" toggle for transparent vectors.
   - Live side-by-side or tabbed preview with zoom & pan.
   - 1-Click "Download SVG" and "Copy SVG Code".
3. **Companion & Reverse Converters**:
   - **SVG to PNG**: High-resolution rasterization with custom multiplier scaling (1x, 2x, 4x, 8x Ultra HD).
   - **SVG to JPG**: Custom solid background color picker and adjustable compression quality.
   - **WEBP to SVG**: Modern web image format vectorization.
4. **Google AdSense Ready**:
   - Pre-styled, policy-compliant Ad slots:
     - Top Leaderboard (728x90)
     - In-Content / In-Article Responsive Ad
     - Sidebar Sticky Skyscraper (300x600)
     - Bottom Footer Banner (970x90 / Responsive)
   - Mandatory policy pages: Privacy Policy (GDPR/CCPA compliant), Terms of Service, About Us, Contact Us with working inquiry form.
5. **SEO, AEO & GEO Optimized**:
   - Pre-configured Schema.org JSON-LD structured data (`SoftwareApplication`, `FAQPage`, `HowTo`, `BlogPosting`).
   - Dedicated landing pages for primary keywords (`/png-to-svg.html`, `/jpg-to-svg.html`, `/svg-to-png.html`, etc.).
   - XML Sitemap (`sitemap.xml`) and `robots.txt`.
   - Comprehensive informational Blog section with 3 in-depth guides.

---

## 🚀 How to Run Locally

You have zero heavy dependencies or large `node_modules`. Simply run:

```bash
node serve.js
```

Then open your browser at:
`http://localhost:3000`

*(You can also open `index.html` directly or deploy to any static host!)*

---

## 🌐 1-Click Deployment Options

Because this app is built with pure, modern web standards (HTML5, modern CSS, client-side JavaScript):
- **Vercel / Netlify / Cloudflare Pages**: Connect your repository or drag & drop the folder for instant deployment.
- **GitHub Pages**: Push to repository and enable GitHub Pages under repository settings.
- **cPanel / Apache / Nginx**: Upload files directly to `public_html`.

---

## 💰 Connecting Google AdSense

Once your AdSense account is approved:
1. Copy your AdSense script tag and paste it into the `<head>` of each HTML file.
2. In each HTML file, locate the designated ad containers:
   - `<div class="ad-box leaderboard" id="ad-top-leaderboard">`
   - `<div class="ad-box in-content" id="ad-in-content">`
   - `<div class="ad-box sidebar-ad" id="ad-sidebar">`
   - `<div class="ad-box footer-ad" id="ad-footer-banner">`
3. Replace the placeholder text inside with your Google `<ins class="adsbygoogle" ...></ins>` ad code.
