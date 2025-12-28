import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { X, Copy, Check, ScanLine } from 'lucide-react'
import { useState, useMemo } from 'react'

function QRCodeModal({ isOpen, onClose, peerId, deviceName, onScanClick }) {
  const [copied, setCopied] = useState(false)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const qrValue = useMemo(() => {
    if (!peerId || !deviceName) return ''
    return JSON.stringify({
      peerId,
      deviceName
    })
  }, [peerId, deviceName])

  const handleCopy = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  if (!isOpen || !peerId) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-ios dark:backdrop-blur-ios-dark"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular ios-rounded-xl p-6 max-w-sm w-full shadow-ios dark:shadow-ios-dark border-glass overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Connect via QR Code
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
          </div>

          <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-xl mb-4">
              <QRCodeSVG
                value={qrValue}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-sm text-ios-gray dark:text-gray-400 mb-2 font-medium text-center">
              {deviceName}
            </p>

            <div className="w-full p-3 ios-rounded-lg bg-white/50 dark:bg-black/30 border border-white/20 dark:border-white/10 flex items-center justify-between gap-2 mb-4">
              <p className="text-xs font-mono text-gray-900 dark:text-white truncate flex-1">
                {peerId}
              </p>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-all flex-shrink-0"
                title="Copy Peer ID"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-blue" />
                )}
              </motion.button>
            </div>

            <p className="text-xs text-ios-gray dark:text-gray-500 text-center font-medium mb-4">
              Scan this QR code with another device to connect
            </p>

            {isMobile && onScanClick && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onScanClick}
                className="w-full py-3 ios-rounded-lg bg-muted-blue hover-muted-blue text-white font-semibold transition-all flex items-center justify-center gap-2"
              >
                <ScanLine className="w-4 h-4" />
                Scan QR Code
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default QRCodeModal

