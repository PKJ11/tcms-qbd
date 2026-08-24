// Copies the pdfjs-dist worker into public/ so Next.js serves it as a
// static asset instead of routing it through webpack/SWC, which fails to
// parse the worker's .mjs (ESM-only in pdfjs-dist v4+) as a script.
const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.mjs')

if (!fs.existsSync(src)) {
  console.warn('[copy-pdf-worker] source file not found, skipping:', src)
  process.exit(0)
}

fs.copyFileSync(src, dest)
console.log('[copy-pdf-worker] copied pdf.worker.min.mjs to public/')
