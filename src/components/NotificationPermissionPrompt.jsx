import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check } from 'lucide-react'
import { requestNotificationPermission } from '../utils/notifications'

function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return
    }

    const hasSeenPrompt = localStorage.getItem('notification-prompt-seen')
    const permission = Notification.permission

    if (permission === 'default' && !hasSeenPrompt) {
      setTimeout(() => setShowPrompt(true), 2000)
    }
  }, [])

  const handleRequest = async () => {
    setIsRequesting(true)
    const granted = await requestNotificationPermission()
    setIsRequesting(false)
    
    if (granted) {
      setShowPrompt(false)
      localStorage.setItem('notification-prompt-seen', 'true')
    } else {
      localStorage.setItem('notification-prompt-seen', 'true')
      setTimeout(() => setShowPrompt(false), 1000)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('notification-prompt-seen', 'true')
  }

  if (!showPrompt) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div className="liquid-glass dark:liquid-glass-dark ios-rounded-lg p-6 shadow-ios-glow dark:shadow-ios-glow-dark border-glass overflow-hidden">
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="p-3 rounded-full bg-muted-blue flex-shrink-0"
            >
              <Bell className="w-6 h-6 text-white" />
            </motion.div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
                Enable Notifications
              </h3>
              <p className="text-sm text-ios-gray dark:text-gray-400 mb-4 font-medium">
                Get notified when files are sent or received, even when AirDrop is in the background.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  disabled={isRequesting}
                  className="flex-1 py-2.5 px-4 rounded-full liquid-glass dark:liquid-glass-dark text-gray-900 dark:text-white font-semibold hover:bg-white/30 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 overflow-hidden"
                >
                  <X className="w-4 h-4" />
                  Not Now
                </button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRequest}
                  disabled={isRequesting}
                  className="flex-1 py-2.5 px-4 rounded-full bg-muted-blue hover-muted-blue text-white font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-muted-blue disabled:opacity-50"
                >
                  {isRequesting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Enable
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default NotificationPermissionPrompt

