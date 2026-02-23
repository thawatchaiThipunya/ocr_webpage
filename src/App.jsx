import React, { useCallback, useMemo, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'

const TESSDATA_CDN = 'https://tessdata.projectnaptha.com/4.0.0'

function enhanceCanvasForOCR(img, maxW=1600){
  const c = document.createElement('canvas')
  const ratio = img.width > maxW ? maxW / img.width : 1
  c.width = Math.round(img.width * ratio)
  c.height = Math.round(img.height * ratio)
  const x = c.getContext('2d', { willReadFrequently:true })
  // draw
  x.drawImage(img, 0, 0, c.width, c.height)
  // grayscale + contrast
  const d = x.getImageData(0,0,c.width,c.height)
  const a = d.data
  // simple luminance & contrast stretch
  let min=255, max=0
  for(let i=0;i<a.length;i+=4){
    const y = (a[i]*0.299 + a[i+1]*0.587 + a[i+2]*0.114)|0
    if(y<min)min=y; if(y>max)max=y
  }
  const range = Math.max(1, max-min)
  for(let i=0;i<a.length;i+=4){
    const y = (a[i]*0.299 + a[i+1]*0.587 + a[i+2]*0.114)|0
    const yy = Math.max(0, Math.min(255, ((y-min)*255)/range))
    a[i]=a[i+1]=a[i+2]=yy
  }
  x.putImageData(d,0,0)
  return c
}

// Remove extra spaces between Thai letters and tidy punctuation/line breaks
function postProcessThai(text){
  if(!text) return ''
  // collapse weird spacing between Thai characters
  let s = text
    .replace(/([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g, '$1$2')
    .replace(/\s{3,}/g, '  ')
    .replace(/(\S)\s+([,.:;!?])/g, '$1$2')
    .replace(/\u200B/g, '') // zero-width space
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
  // common Thai punctuation fix
  s = s.replace(/\s+ๆ/g, 'ๆ')
  return s.trim()
}

export default function App(){
  const [imageUrl, setImageUrl] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef()
  const canvasRef = useRef()

  const onChoose = useCallback((e)=>{
    const f = e.target.files?.[0]
    if(!f) return
    const url = URL.createObjectURL(f)
    setImageUrl(url)
  }, [])

  const onDrop = useCallback((e)=>{
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if(!f) return
    const url = URL.createObjectURL(f)
    setImageUrl(url)
  }, [])

  const runOCR = useCallback(async ()=>{
    if(!imageUrl) return
    setBusy(true)
    try{
      const img = new Image()
      img.src = imageUrl
      await img.decode()
      const pre = enhanceCanvasForOCR(img)
      const ctx = canvasRef.current.getContext('2d')
      canvasRef.current.width = pre.width
      canvasRef.current.height = pre.height
      ctx.drawImage(pre,0,0)

      const worker = await Tesseract.createWorker('tha+eng', 1, {
        langPath: TESSDATA_CDN,
        logger: m => console.log(m)
      })
      const { data } = await worker.recognize(pre)
      await worker.terminate()
      const cleaned = postProcessThai(data.text)
      setOcrText(cleaned || '(ไม่พบข้อความ)')
    }catch(err){
      console.error(err)
      setOcrText('OCR ล้มเหลว: ' + err.message)
    }finally{
      setBusy(false)
    }
  }, [imageUrl])

  const copyText = useCallback(async ()=>{
    try{ await navigator.clipboard.writeText(ocrText) }catch{}
  }, [ocrText])

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100'>
      <div className='max-w-5xl mx-auto p-6 space-y-6'>
        <header className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Thai OCR — React</h1>
          <a href='https://tessdata.projectnaptha.com/4.0.0' target='_blank' className='text-cyan-300 underline opacity-80'>tessdata source</a>
        </header>

        <section className='grid md:grid-cols-2 gap-6'>
          <div className='card p-5 space-y-4'>
            <h2 className='text-cyan-300 font-semibold'>1) อัปโหลดรูปเอกสาร</h2>
            <input ref={fileRef} onChange={onChoose} type='file' accept='image/*' className='w-full' />
            <div
              onDrop={onDrop}
              onDragOver={(e)=>e.preventDefault()}
              className='drop rounded-xl p-8 text-center text-slate-400'
            >
              ลากรูปมาวางตรงนี้ได้
            </div>

            <div className='rounded-xl overflow-hidden bg-black/60'>
              {imageUrl ? (
                <img src={imageUrl} alt='preview' className='w-full object-contain max-h-80' />
              ) : (
                <div className='p-12 text-center text-slate-500'>ยังไม่มีรูป</div>
              )}
            </div>
            <button className='btn' onClick={runOCR} disabled={!imageUrl || busy}>
              {busy ? 'กำลัง OCR…' : 'เริ่ม OCR (ไทย/อังกฤษ)'}
            </button>
          </div>

          <div className='card p-5 space-y-4'>
            <h2 className='text-cyan-300 font-semibold'>2) ผลลัพธ์</h2>
            <canvas ref={canvasRef} className='w-full rounded-lg border border-slate-700 bg-black/50'></canvas>
            <textarea
                value={ocrText}
                onChange={(e)=>setOcrText(e.target.value)}
                className='w-full h-[500px] p-4 text-lg leading-relaxed rounded-xl bg-slate-900 border border-slate-700 resize-y'
                placeholder='ผลลัพธ์ OCR จะแสดงที่นี่ (แก้ไขข้อความได้)'
            />
            <div className='flex gap-3'>
              <button className='btn' onClick={copyText} disabled={!ocrText}>คัดลอกข้อความ</button>
              <a
                className='btn-ghost'
                href={'data:text/plain;charset=utf-8,' + encodeURIComponent(ocrText)}
                download='ocr.txt'
              >ดาวน์โหลด .txt</a>
            </div>
            <p className='text-sm text-slate-400'>
              เคล็ดลับ: หากเว้นวรรคภาษาไทยประหลาด ให้แก้ไขในกล่องข้อความ หรือถ่ายรูปให้คมชัดขึ้น/พื้นต่างสีชัดเจน
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
