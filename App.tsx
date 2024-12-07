// src/App.tsx
import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'
import { Helmet } from 'react-helmet'

// 添加日志记录函数
const logAction = async (action: string, details: any) => {
  try {
    await fetch('https://multiscale.online/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        details,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Logging failed:', error)
  }
}

function App() {
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [targetDevice, setTargetDevice] = useState('custom')
  const [customWidth, setCustomWidth] = useState('375')
  const [customHeight, setCustomHeight] = useState('812')
  const [scale, setScale] = useState<1 | 2 | 3>(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const deviceSizes = {
    'AndroidCompact': { width: 412, height: 917 },
    'AndroidMedium': { width: 700, height: 840 },
    'iPhoneXSMax&11ProMax': { width: 414, height: 896 },
    'iPhone16': { width: 393, height: 852 },
    'iPhone16Pro': { width: 402, height: 874 },
    'iPhone16ProMax': { width: 440, height: 956 },
    'iPhone16Plus': { width: 430, height: 932 },
    'iPhone14&15ProMax': { width: 430, height: 932 },
    'iPhone14&15Pro': { width: 393, height: 852 },
    'iPhone13&14': { width: 390, height: 844 },
    'iPhone14Plus': { width: 428, height: 926 },
    'iPhone13mini': { width: 375, height: 812 },
    'iPhoneSE': { width: 320, height: 568 },
  }

  useEffect(() => {
    fetch('https://multiscale.online/api/test')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => setError(err.toString()))
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedImages(prev => [...prev, ...acceptedFiles])
    const newPreviewUrls = acceptedFiles.map(file => URL.createObjectURL(file))
    setPreviewUrls(prev => [...prev, ...newPreviewUrls])
    
    // 记录上传操作
    logAction('upload_images', {
      count: acceptedFiles.length,
      fileNames: acceptedFiles.map(f => f.name)
    })
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    }
  })

  const handleRemoveImage = (index: number) => {
    const removedImage = selectedImages[index]
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    
    // 记录删除操作
    logAction('remove_image', {
      fileName: removedImage.name,
      index
    })
  }

  const getCurrentSize = () => {
    if (targetDevice === 'custom') {
      return {
        width: parseInt(customWidth) || 375,
        height: parseInt(customHeight) || 812
      }
    }
    return deviceSizes[targetDevice as keyof typeof deviceSizes]
  }

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDevice = e.target.value
    setTargetDevice(newDevice)
    
    // 记录设备选择
    logAction('change_device', {
      device: newDevice,
      size: newDevice === 'custom' ? 'custom' : deviceSizes[newDevice as keyof typeof deviceSizes]
    })
  }

  const handleScaleChange = (newScale: 1 | 2 | 3) => {
    setScale(newScale)
    
    // 记录缩放倍率更改
    logAction('change_scale', {
      scale: newScale
    })
  }

  const handleResizeAndDownload = async () => {
    if (selectedImages.length === 0) return

    // 记录开始处理
    logAction('start_processing', {
      imageCount: selectedImages.length,
      targetDevice,
      scale,
      customSize: targetDevice === 'custom' ? { width: customWidth, height: customHeight } : null
    })

    const zip = new JSZip()
    const targetSize = getCurrentSize()
    
    // 根据缩放倍率计算实际输出尺寸
    const outputWidth = targetSize.width * scale
    const outputHeight = targetSize.height * scale

    for (let i = 0; i < selectedImages.length; i++) {
      const img = new Image()
      img.src = previewUrls[i]
      await new Promise(resolve => img.onload = resolve)

      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight

      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, outputWidth, outputHeight)

      const imageData = canvas.toDataURL('image/png').split(',')[1]
      const fileName = targetDevice === 'custom' 
        ? `${outputWidth}x${outputHeight}-${scale}x-${selectedImages[i].name}`
        : `${targetDevice}-${scale}x-${selectedImages[i].name}`
      zip.file(fileName, imageData, {base64: true})
    }

    const content = await zip.generateAsync({type: 'blob'})
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = `MultiScale-${new Date().getTime()}.zip`
    link.click()
    URL.revokeObjectURL(link.href)

    // 记录完成下载
    logAction('complete_download', {
      imageCount: selectedImages.length,
      targetDevice,
      scale
    })
  }

  return (
    <>
      <Helmet>
        <title>MultiScale - Resize Images for Multiple Devices</title>
        <meta name="description" content="A tool to quickly resize images for different mobile devices and screen sizes" />
        
        {/* OpenGraph tags */}
        <meta property="og:title" content="MultiScale - Resize Images for Multiple Devices" />
        <meta property="og:description" content="A tool to quickly resize images for different mobile devices and screen sizes" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://multiscale.online" />
        <meta property="og:image" content="https://multiscale.online/static/originals/og-image.png" />
        <meta property="og:site_name" content="MultiScale" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MultiScale - Resize Images for Multiple Devices" />
        <meta name="twitter:description" content="A tool to quickly resize images for different mobile devices and screen sizes" />
        <meta name="twitter:image" content="https://multiscale.online/static/originals/og-image.png" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col items-center">
        <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-4">MultiScale</h1>
          
          {error && <p className="text-red-500 mb-4">Error: {error}</p>}
          {message && <p className="text-green-500 mb-4">Hello</p>}
          
          <div {...getRootProps()} className="border-2 border-dashed p-4 text-center cursor-pointer">
            <input {...getInputProps()} />
            <p>Drag and drop images here, or click to select files</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative">
                <img src={url} alt={`Preview ${index + 1}`} className="w-full h-auto" />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <select 
              value={targetDevice}
              onChange={handleDeviceChange}
              className="w-full p-2 border rounded"
            >
              <option value="custom">Custom Size</option>
              {Object.entries(deviceSizes).map(([device, size]) => (
                <option key={device} value={device}>
                  {device} ({size.width * scale}×{size.height * scale})
                </option>
              ))}
            </select>

            {targetDevice === 'custom' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  placeholder="Width (px)"
                  className="p-2 border rounded"
                />
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  placeholder="Height (px)"
                  className="p-2 border rounded"
                />
              </div>
            )}

            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scale Factor
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleScaleChange(value as 1 | 2 | 3)}
                    className={`p-2 border rounded ${
                      scale === value 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    {value}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handleResizeAndDownload}
            className="mt-4 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            disabled={selectedImages.length === 0}
          >
            Generate and Download ({selectedImages.length} images, {scale}x)
          </button>
        </div>
      </div>
    </>
  )
}

export default App
