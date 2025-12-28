import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, X, Download, Upload, CheckCircle, XCircle, Clock } from 'lucide-react'

function TransferHistory({ isOpen, onClose, history, onDownload }) {
  const [filter, setFilter] = useState('all')

  const filteredHistory = history.filter(item => {
    if (filter === 'all') return true
    if (filter === 'sent') return item.type === 'sent'
    if (filter === 'received') return item.type === 'received'
    if (filter === 'text') return item.isText
    return true
  })

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
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
          className="liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular ios-rounded-xl p-6 max-w-2xl w-full max-h-[80vh] shadow-ios dark:shadow-ios-dark border-glass overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-muted-blue" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Transfer History
              </h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
          </div>

          <div className="flex gap-2 mb-4">
            {['all', 'sent', 'received', 'text'].map((f) => (
              <motion.button
                key={f}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  filter === f
                    ? 'bg-muted-blue text-white'
                    : 'bg-white/20 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-white/30 dark:hover:bg-white/20'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </motion.button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-ios-gray dark:text-gray-600 mx-auto mb-4" />
                <p className="text-ios-gray dark:text-gray-400 font-medium">
                  No transfer history
                </p>
              </div>
            ) : (
              filteredHistory.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 ios-rounded liquid-glass dark:liquid-glass-dark flex items-center gap-4 hover:bg-white/10 dark:hover:bg-white/5 transition-all"
                >
                  <div className="p-2 rounded-lg bg-muted-blue/10 dark:bg-muted-blue/15">
                    {item.type === 'sent' ? (
                      <Upload className="w-5 h-5 text-muted-blue" />
                    ) : (
                      <Download className="w-5 h-5 text-muted-blue" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {item.isText ? (
                        <span className="text-sm">"{item.fileName}"</span>
                      ) : (
                        item.fileName
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-ios-gray dark:text-gray-400 font-medium">
                        {item.type === 'sent' ? 'To' : 'From'}: {item.deviceName}
                      </p>
                      {!item.isText && item.fileSize && (
                        <>
                          <span className="text-ios-gray dark:text-gray-500">•</span>
                          <p className="text-xs text-ios-gray dark:text-gray-400 font-medium">
                            {formatFileSize(item.fileSize)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {item.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : item.status === 'failed' ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <p className="text-xs text-ios-gray dark:text-gray-400 font-medium">
                      {formatDate(item.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TransferHistory

