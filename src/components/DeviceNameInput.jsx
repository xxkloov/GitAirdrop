import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'

function DeviceNameInput({ isOpen, onClose, onSave, initialName }) {
  const [deviceName, setDeviceName] = useState(initialName || '')

  useEffect(() => {
    if (isOpen) {
      setDeviceName(initialName || '')
    }
  }, [isOpen, initialName])

  const handleSave = () => {
    const trimmedName = deviceName.trim()
    if (trimmedName) {
      onSave(trimmedName)
      onClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-ios"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="liquid-glass dark:liquid-glass-dark ios-rounded-xl p-6 max-w-md w-full shadow-ios dark:shadow-ios-dark border-glass overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Device Name
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-ios-lightGray dark:hover:bg-black/30 transition-colors"
            >
              <X className="w-5 h-5 text-ios-gray" />
            </button>
          </div>

          <div className="mb-6">
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter device name"
              autoFocus
              className="w-full px-4 py-3 rounded-full liquid-glass dark:liquid-glass-dark border border-transparent focus:border-muted-blue focus:outline-none text-gray-900 dark:text-white placeholder-ios-gray dark:placeholder-gray-500 transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-6 rounded-full liquid-glass dark:liquid-glass-dark text-gray-900 dark:text-white font-semibold hover:bg-white/20 dark:hover:bg-white/10 active:scale-95 transition-all overflow-hidden"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!deviceName.trim()}
              className="flex-1 py-3 px-6 rounded-full bg-muted-blue hover-muted-blue text-white font-semibold active:scale-95 transition-all shadow-muted-blue disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default DeviceNameInput

