import { motion } from 'framer-motion'
import { Download, X } from 'lucide-react'

function ReceiveModal({ fileName, fileSize, senderName, onAccept, onDecline }) {
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-ios dark:backdrop-blur-ios-dark"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular ios-rounded-xl p-8 max-w-md w-full shadow-ios dark:shadow-ios-dark border-glass overflow-hidden"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-block p-4 rounded-full bg-muted-blue/15 mb-4"
          >
            <Download className="w-12 h-12 text-muted-blue" />
          </motion.div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
            Incoming File
          </h3>
          
          <p className="text-sm text-ios-gray dark:text-gray-400 mb-1 font-medium">
            from {senderName}
          </p>
          
          <div className="my-6 p-5 ios-rounded liquid-glass dark:liquid-glass-dark border-glass overflow-hidden">
            <p className="font-semibold text-gray-900 dark:text-white truncate mb-1 text-lg">
              {fileName}
            </p>
            <p className="text-sm text-ios-gray dark:text-gray-400 font-medium">
              {formatFileSize(fileSize)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDecline()
              }}
              className="flex-1 py-3 px-6 rounded-full liquid-glass dark:liquid-glass-dark text-gray-900 dark:text-white font-semibold hover:bg-white/20 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 overflow-hidden"
            >
              <X className="w-5 h-5" />
              Decline
            </button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAccept()
              }}
              className="flex-1 py-3.5 px-6 rounded-full bg-muted-blue hover-muted-blue text-white font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-muted-blue tracking-tight"
            >
              <Download className="w-5 h-5" />
              Accept
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ReceiveModal

