import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, X } from 'lucide-react'

function PWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen')

    if (isIOS && !isStandalone && !hasSeenPrompt) {
      setTimeout(() => setShowPrompt(true), 3000)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-seen', 'true')
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="liquid-glass dark:liquid-glass-dark ios-rounded-lg p-6 shadow-ios-dark border-glass overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-muted-blue/15 flex-shrink-0">
                <Share className="w-6 h-6 text-muted-blue" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Add to Home Screen
                </h3>
                <p className="text-sm text-ios-gray dark:text-gray-400">
                  Install AirDrop Web for quick access. Tap the Share button and select "Add to Home Screen"
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-full hover:bg-ios-lightGray dark:hover:bg-black/30 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 text-ios-gray" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PWAPrompt

