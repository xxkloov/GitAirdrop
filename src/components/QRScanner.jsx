import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import { X, CameraOff } from 'lucide-react'

function QRScanner({ isOpen, onClose, onScanSuccess }) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const html5QrCodeRef = useRef(null)
  const hasStartedRef = useRef(false)
  const onScanSuccessRef = useRef(onScanSuccess)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess
    onCloseRef.current = onClose
  }, [onScanSuccess, onClose])

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (hasStartedRef.current) {
          await html5QrCodeRef.current.stop().catch(() => {})
        }
        await html5QrCodeRef.current.clear().catch(() => {})
        html5QrCodeRef.current = null
        setIsScanning(false)
        hasStartedRef.current = false
      } catch (err) {
        console.error('[QRScanner] Error stopping scanner:', err)
        html5QrCodeRef.current = null
        setIsScanning(false)
        hasStartedRef.current = false
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !isMobile) {
      if (html5QrCodeRef.current) {
        stopScanning()
      }
      hasStartedRef.current = false
      setError(null)
      return
    }

    if (hasStartedRef.current && html5QrCodeRef.current) {
      return
    }

    hasStartedRef.current = false

    const startScanning = async () => {
      if (hasStartedRef.current) return
      
      try {
        console.log('[QRScanner] Initializing scanner...')
        const html5QrCode = new Html5Qrcode('qr-reader')
        html5QrCodeRef.current = html5QrCode
        hasStartedRef.current = true

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        }

        console.log('[QRScanner] Starting camera with config:', config)
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            console.log('[QRScanner] Scanned QR code:', decodedText)
            try {
              const data = JSON.parse(decodedText)
              console.log('[QRScanner] Parsed data:', data)
              if (data.peerId) {
                console.log('[QRScanner] Valid peerId found:', data.peerId)
                setIsScanning(false)
                await stopScanning()
                if (onScanSuccessRef.current) {
                  onScanSuccessRef.current(data.peerId, data.deviceName || 'Unknown Device')
                }
                onCloseRef.current()
              } else {
                console.error('[QRScanner] No peerId in scanned data')
                setError('QR code does not contain peer ID')
              }
            } catch (err) {
              console.error('[QRScanner] Failed to parse QR code data:', err, 'Raw text:', decodedText)
              setError('Invalid QR code format. Make sure you\'re scanning a valid AirDrop QR code.')
            }
          },
          (errorMessage) => {
            console.log('[QRScanner] Scan error (normal):', errorMessage)
          }
        )
        setIsScanning(true)
        setError(null)
        console.log('[QRScanner] Scanner started successfully')
      } catch (err) {
        console.error('[QRScanner] Failed to start scanner:', err)
        setError(`Failed to access camera: ${err.message || 'Please check permissions'}`)
        setIsScanning(false)
        hasStartedRef.current = false
        html5QrCodeRef.current = null
      }
    }

    const timer = setTimeout(() => {
      startScanning()
    }, 100)

    return () => {
      clearTimeout(timer)
      if (html5QrCodeRef.current) {
        stopScanning()
      }
    }
  }, [isOpen, isMobile, stopScanning])

  const handleClose = async () => {
    await stopScanning()
    onClose()
  }

  if (!isOpen || !isMobile) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-ios dark:backdrop-blur-ios-dark"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular ios-rounded-xl p-6 max-w-md w-full mx-4 shadow-ios dark:shadow-ios-dark border-glass overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Scan QR Code
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
          </div>

          <div className="relative">
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black min-h-[300px]" />
            {error && (
              <div className="mt-4 p-3 ios-rounded-lg bg-red-500/20 border border-red-500/50 text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}
            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-center">
                  <CameraOff className="w-12 h-12 text-white/50 mx-auto mb-2" />
                  <p className="text-white/70 text-sm font-medium">Starting camera...</p>
                </div>
              </div>
            )}
            {isScanning && (
              <div className="absolute top-2 left-2 right-2">
                <div className="p-2 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <p className="text-green-500 text-xs font-medium text-center">Scanning...</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-ios-gray dark:text-gray-400 mt-4 text-center font-medium">
            Point your camera at a QR code to connect
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default QRScanner

