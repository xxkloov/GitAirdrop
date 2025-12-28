import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send } from 'lucide-react'

function ShareTextModal({ isOpen, onClose, deviceName, onSend }) {
  const [text, setText] = useState('')

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim())
      setText('')
      onClose()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend()
    }
  }

  if (!isOpen) return null

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
          className="liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular ios-rounded-xl p-6 max-w-md w-full shadow-ios dark:shadow-ios-dark border-glass overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Share Text
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

          <p className="text-sm text-ios-gray dark:text-gray-400 mb-4 font-medium">
            Send to: <span className="font-semibold text-gray-900 dark:text-white">{deviceName}</span>
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message here..."
            className="w-full h-32 p-4 ios-rounded-lg bg-white/50 dark:bg-black/30 border border-white/20 dark:border-white/10 text-gray-900 dark:text-white placeholder-ios-gray dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-muted-blue focus:border-transparent transition-all font-medium"
            autoFocus
          />

          <div className="flex gap-3 mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 py-3 ios-rounded-lg bg-white/20 dark:bg-white/10 text-gray-900 dark:text-white font-semibold hover:bg-white/30 dark:hover:bg-white/20 transition-all"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSend}
              disabled={!text.trim()}
              className="flex-1 py-3 ios-rounded-lg bg-muted-blue hover-muted-blue text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ShareTextModal

