<<<<<<< HEAD
# OCR2
=======
# React Thai OCR

A pretty React + Tailwind web app for OCR (Thai + English) using Tesseract.js.

## Features
- Drag & drop or file input
- Canvas pre-processing (grayscale + contrast stretch)
- Thai+English OCR via Tesseract.js with CDN `langPath`
- Post-processing to reduce weird Thai spaces
- Copy / download .txt
- Modern UI with Tailwind

## Run locally
```bash
npm install
npm run dev
```
then open the printed local URL.

## Build
```bash
npm run build
npm run preview
```

## Notes on Thai accuracy
- Lighting and sharp edges improve results a lot.
- The app applies simple grayscale + contrast stretch to help OCR.
- If you need higher accuracy, consider Google Vision API or PaddleOCR server; you can swap the OCR call in `src/App.jsx`.
>>>>>>> dfa4276 (Initial commit: OCR2)
