import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import DeviceDiscovery from './components/DeviceDiscovery'
import FileDropZone from './components/FileDropZone'
import TransferModal from './components/TransferModal'
import ReceiveModal from './components/ReceiveModal'
import PWAPrompt from './components/PWAPrompt'
import NotificationPermissionPrompt from './components/NotificationPermissionPrompt'
import DeviceNameInput from './components/DeviceNameInput'
import ErrorNotification from './components/ErrorNotification'
import QRCodeModal from './components/QRCodeModal'
import TransferHistory from './components/TransferHistory'
import ShareTextModal from './components/ShareTextModal'
import QRScanner from './components/QRScanner'
import TextMessagePopup from './components/TextMessagePopup'
import { usePeerConnection } from './hooks/usePeerConnection'
import { Moon, Sun, Edit2, QrCode, History } from 'lucide-react'

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.crypto || !window.crypto.subtle) {
        console.error('[App] Web Crypto API not available. iOS 11+ required.')
      }
      if (!window.RTCPeerConnection) {
        console.error('[App] WebRTC not available. Please use a modern browser.')
      }
    }
  }, [])

  const {
    peerId,
    devices,
    isConnected,
    connectToPeer,
    sendFile,
    sendFiles,
    sendText,
    incomingTransfer,
    acceptTransfer,
    declineTransfer,
    transferProgress,
    isTransferring,
    receivingProgress,
    isReceiving,
    deviceName,
    updateDeviceName,
    refreshDevices,
    error,
    clearError,
    transferHistory,
    connectionQuality,
    receivedTextMessage,
    clearReceivedTextMessage
  } = usePeerConnection()

  const [showDeviceNameInput, setShowDeviceNameInput] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showShareTextModal, setShowShareTextModal] = useState(false)
  const [selectedDeviceForText, setSelectedDeviceForText] = useState(null)
  const [showQRScanner, setShowQRScanner] = useState(false)

  useEffect(() => {
    if (peerId && !deviceName) {
      setShowDeviceNameInput(true)
    }
  }, [peerId, deviceName])

  const handleDeviceNameSave = (name) => {
    updateDeviceName(name)
    setShowDeviceNameInput(false)
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleSendFile = async (files, targetPeerId) => {
    if (Array.isArray(files)) {
      await sendFiles(files, targetPeerId)
    } else {
      await sendFile(files, targetPeerId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-lightGray via-white to-ios-lightGray dark:bg-deep-black transition-all duration-500 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-ios-blue/5 via-transparent to-ios-blueLight/5 dark:from-transparent dark:via-transparent dark:to-transparent pointer-events-none" />
      <div className="safe-area-inset">
        <header className="px-6 py-5 flex items-center justify-between liquid-glass dark:liquid-glass-dark liquid-glass-specular bg-white/60 dark:bg-black/30 sticky top-0 z-40 border-b border-white/10 dark:border-white/5 neon-glow-soft">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}
          >
            AirDrop
          </motion.h1>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHistory(true)}
              className="p-2 rounded-full liquid-glass dark:liquid-glass-dark transition-all duration-300"
              title="Transfer History"
            >
              <History className="w-4 h-4 text-muted-blue" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowQRCode(true)}
              className="p-2 rounded-full liquid-glass dark:liquid-glass-dark transition-all duration-300"
              title="Show QR Code"
            >
              <QrCode className="w-4 h-4 text-muted-blue" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full liquid-glass dark:liquid-glass-dark transition-all duration-300"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4 text-muted-blue" />
              )}
            </motion.button>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8 max-w-6xl">
          {peerId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 p-7 ios-rounded-xl liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular shadow-ios dark:shadow-ios-dark relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-ios-gray dark:text-gray-400 font-semibold uppercase tracking-wider">Your Device</p>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowDeviceNameInput(true)}
                  className="p-2 rounded-full hover:bg-white/30 dark:hover:bg-white/10 transition-all"
                  title="Edit device name"
                >
                  <Edit2 className="w-4 h-4 text-muted-blue" />
                </motion.button>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">{deviceName}</p>
              <p className="text-xs text-ios-gray dark:text-gray-500 font-mono tracking-tight opacity-70">ID: {peerId}</p>
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <DeviceDiscovery 
              devices={devices}
              onDeviceSelect={connectToPeer}
              currentPeerId={peerId}
              onRefresh={refreshDevices}
              onShareText={sendText}
              connectionQuality={connectionQuality}
              onDeviceClick={(device) => {
                setSelectedDeviceForText(device)
                setShowShareTextModal(true)
              }}
            />
            
            <FileDropZone 
              onFileSelect={handleSendFile}
              devices={devices}
              isConnected={isConnected}
            />
          </div>
        </main>

        <AnimatePresence>
          {isTransferring && transferProgress && (
            <TransferModal 
              fileName={transferProgress.fileName}
              progress={transferProgress.progress}
              speed={transferProgress.speed}
              bytesSent={transferProgress.bytesSent}
              totalBytes={transferProgress.totalBytes}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isReceiving && receivingProgress && (
            <TransferModal 
              fileName={receivingProgress.fileName}
              progress={receivingProgress.progress}
              speed={receivingProgress.speed}
              bytesSent={receivingProgress.bytesReceived}
              totalBytes={receivingProgress.totalBytes}
              isReceiving={true}
              isDecrypting={receivingProgress.isDecrypting}
              isDownloading={receivingProgress.isDownloading}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {incomingTransfer && !isReceiving && (
            <ReceiveModal
              fileName={incomingTransfer.fileName}
              fileSize={incomingTransfer.fileSize}
              senderName={incomingTransfer.senderName}
              onAccept={acceptTransfer}
              onDecline={declineTransfer}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <ErrorNotification
              message={error}
              onClose={clearError}
            />
          )}
        </AnimatePresence>

        <PWAPrompt />

        <NotificationPermissionPrompt />

        <DeviceNameInput
          isOpen={showDeviceNameInput}
          onClose={() => setShowDeviceNameInput(false)}
          onSave={handleDeviceNameSave}
          initialName={deviceName}
        />

        <QRCodeModal
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          peerId={peerId}
          deviceName={deviceName}
          onScanClick={() => {
            setShowQRCode(false)
            setShowQRScanner(true)
          }}
        />

        <QRScanner
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={async (peerId, deviceName) => {
            console.log('[App] QR scan successful:', peerId, deviceName)
            if (peerId) {
              console.log('[App] Connecting to peer:', peerId)
              await connectToPeer(peerId)
              console.log('[App] Connection initiated')
            }
          }}
        />

        <TextMessagePopup
          message={receivedTextMessage}
          onClose={clearReceivedTextMessage}
        />

        <TransferHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          history={transferHistory}
        />

        <ShareTextModal
          isOpen={showShareTextModal}
          onClose={() => {
            setShowShareTextModal(false)
            setSelectedDeviceForText(null)
          }}
          deviceName={selectedDeviceForText?.name || ''}
          onSend={(text) => {
            if (selectedDeviceForText) {
              sendText(text, selectedDeviceForText.id)
            }
          }}
        />
      </div>
    </div>
  )
}

export default App

