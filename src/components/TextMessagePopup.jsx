import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, VolumeX } from 'lucide-react'
import { useState, useEffect } from 'react'

function TextMessagePopup({ message, onClose, onMuteChange }) {
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('notificationsMuted') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (onMuteChange) {
      onMuteChange(isMuted)
    }
    try {
      localStorage.setItem('notificationsMuted', isMuted.toString())
    } catch {}
  }, [isMuted, onMuteChange])

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
  }

  if (!message) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-4 right-4 z-50 md:left-auto md:right-6 md:w-96"
      >
        <div className="liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular ios-rounded-xl p-4 shadow-ios dark:shadow-ios-dark border-glass overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {message.senderName}
                </p>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleMuteToggle}
                    className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-all"
                    title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-muted-blue" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </motion.button>
                </div>
              </div>
              <p className="text-gray-900 dark:text-white text-sm break-words">
                {message.text}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TextMessagePopup

