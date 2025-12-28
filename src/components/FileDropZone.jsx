import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileIcon, X, FolderOpen, Video } from 'lucide-react'

function FileDropZone({ onFileSelect, devices, isConnected }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const fileInputRef = useRef(null)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  const handleFilePicker = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const fileHandles = await window.showOpenFilePicker({ multiple: true })
        const files = await Promise.all(fileHandles.map(fh => fh.getFile()))
        const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE)
        if (validFiles.length < files.length) {
          alert(`[FileDropZone] Some files were too large. Maximum size is 1GB per file.`)
        }
        if (validFiles.length > 0) {
          setSelectedFiles(prev => [...prev, ...validFiles])
        }
      } else {
        fileInputRef.current?.click()
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[FileDropZone] File picker error:', err)
        fileInputRef.current?.click()
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const MAX_FILE_SIZE = 1024 * 1024 * 1024

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE)
    if (validFiles.length < files.length) {
      alert(`[FileDropZone] Some files were too large. Maximum size is 1GB per file.`)
    }
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE)
    if (validFiles.length < files.length) {
      alert(`[FileDropZone] Some files were too large. Maximum size is 1GB per file.`)
    }
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
    e.target.value = ''
  }

  const handleSend = () => {
    if (selectedFiles.length > 0 && selectedDevice) {
      onFileSelect(selectedFiles, selectedDevice)
      setSelectedFiles([])
      setSelectedDevice(null)
    }
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  const getFileIcon = (fileName) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return videoExtensions.includes(extension) ? Video : FileIcon
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="p-7 ios-rounded-xl liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular shadow-ios dark:shadow-ios-dark relative overflow-hidden"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Send File
        </h2>
      </div>

      <div
        onDragOver={!isIOS ? handleDragOver : undefined}
        onDragLeave={!isIOS ? handleDragLeave : undefined}
        onDrop={!isIOS ? handleDrop : undefined}
        className={`
          border border-dashed ios-rounded-lg p-12 text-center
          transition-all duration-300 overflow-hidden relative ${
            isDragging
              ? 'border-muted-blue bg-gradient-to-br from-ios-blue/10 to-ios-blueLight/10 scale-[1.02]'
              : 'border-ios-gray/20 dark:border-white/10 liquid-glass dark:liquid-glass-dark'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="*/*"
          multiple={true}
        />
        
        <motion.div
          animate={{ y: isDragging ? -10 : 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <motion.div
            animate={{ y: isDragging ? -10 : 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="mb-5 md:mb-4"
          >
            <div             className="inline-block p-5 rounded-full bg-transparent dark:bg-transparent mb-4">
              <Upload className="w-20 h-20 text-muted-blue" strokeWidth={1.5} />
            </div>
          </motion.div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
            Drop files here or
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFilePicker}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-muted-blue hover-muted-blue text-white font-semibold active:scale-95 transition-all mt-4"
          >
            Select File
          </motion.button>
          <p className="text-xs text-ios-gray dark:text-gray-400 mt-3 font-medium">
            Maximum size: 1GB
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 ios-rounded liquid-glass dark:liquid-glass-dark flex items-center gap-3 border-glass overflow-hidden"
                >
                  <div className="p-2.5 rounded-lg bg-muted-blue/10 dark:bg-muted-blue/15">
                    {(() => {
                      const IconComponent = getFileIcon(file.name)
                      return <IconComponent className="w-6 h-6 text-muted-blue flex-shrink-0" />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate text-base">
                      {file.name}
                    </p>
                    <p className="text-sm text-ios-gray dark:text-gray-400 font-medium">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="p-2 md:p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-ios-gray dark:text-gray-400" />
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {devices.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
                  Send to:
                </p>
                <div className="space-y-2">
                  {devices.map((device) => (
                    <motion.button
                      key={device.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDevice(device.id)}
                      className={`
                        w-full p-3.5 rounded-full text-left transition-all font-semibold overflow-hidden
                        ${
                          selectedDevice === device.id
                            ? 'bg-muted-blue text-white shadow-muted-blue'
                            : 'liquid-glass dark:liquid-glass-dark text-gray-900 dark:text-white hover:bg-white/20 dark:hover:bg-white/10'
                        }
                      `}
                    >
                      {device.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {selectedDevice && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSend}
                className="w-full mt-4 py-4 ios-rounded-lg bg-muted-blue hover-muted-blue text-white font-bold text-lg active:scale-95 transition-all shadow-muted-blue tracking-tight"
              >
                Send {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default FileDropZone

