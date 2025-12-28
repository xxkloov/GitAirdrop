import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

function TransferModal({ fileName, progress, speed, isReceiving = false, isDecrypting = false, isDownloading = false }) {
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
            className="inline-block mb-4 relative"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Loader2 className="w-12 h-12 text-muted-blue" />
            </motion.div>
            {!isReceiving && progress > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full border-4 border-muted-blue/30" />
              </motion.div>
            )}
            {isReceiving && progress > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full border-4 border-green-500/30" />
              </motion.div>
            )}
          </motion.div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
            {isReceiving 
              ? (isDecrypting ? 'Decrypting' : isDownloading ? 'Preparing' : progress === 0 ? 'Preparing' : 'Receiving')
              : (progress === 0 ? 'Waiting' : 'Sending')
            }
          </h3>
          
          <p className="text-sm text-ios-gray dark:text-gray-400 mb-6 truncate font-medium">
            {fileName}
          </p>

          <div className="w-full h-2.5 bg-ios-lightGray/50 dark:bg-black/40 rounded-full overflow-hidden shadow-inner relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full rounded-full shadow-lg ${
                isReceiving ? 'bg-green-500' : 'bg-muted-blue'
              }`}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            />
            {progress > 0 && progress < 100 && (
              <motion.div
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="absolute top-0 left-0 w-1/3 h-full bg-white/30 rounded-full"
              />
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm font-medium text-muted-blue">
              {Math.round(progress)}%
            </p>
            {(progress < 100 || isDecrypting || isDownloading) && (
              <p className="text-xs text-ios-gray dark:text-gray-400 font-medium">
                {isReceiving
                  ? (isDecrypting ? 'Decrypting file...' : isDownloading ? 'Preparing download...' : progress === 0 ? 'Preparing...' : 'Receiving from nearby device...')
                  : (progress === 0 ? 'Waiting for recipient...' : (progress > 0 ? 'Sending to nearby device...' : 'Preparing...'))
                }
              </p>
            )}
          </div>
          {speed && progress > 0 && (
            <p className="text-xs text-ios-gray dark:text-gray-400 mt-1">
              Speed: {speed}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default TransferModal

