import { motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'

function ErrorNotification({ message, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div className="p-4 ios-rounded-lg liquid-glass dark:liquid-glass-dark bg-red-500/20 dark:bg-red-500/15 backdrop-blur-xl border-glass text-white shadow-ios dark:shadow-ios-dark flex items-start gap-3 overflow-hidden">
        <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-400" />
        <div className="flex-1">
          <p className="font-semibold mb-1 text-white dark:text-red-200">Connection Error</p>
          <p className="text-sm text-white/90 dark:text-red-200/80">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )
}

export default ErrorNotification

