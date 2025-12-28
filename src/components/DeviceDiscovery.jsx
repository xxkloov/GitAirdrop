import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Monitor, Laptop, Wifi, RefreshCw, Signal } from 'lucide-react'

const getDeviceIcon = (deviceType) => {
  switch (deviceType) {
    case 'mobile':
      return Smartphone
    case 'desktop':
      return Monitor
    default:
      return Laptop
  }
}

function DeviceDiscovery({ devices, onDeviceSelect, currentPeerId, onRefresh, onShareText, connectionQuality, onDeviceClick }) {
  const [clickedDevices, setClickedDevices] = useState(new Set())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const clickTimeoutRef = useRef({})

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 500)
  }

  if (!Array.isArray(devices)) {
    return null
  }
  
  const filteredDevices = devices.filter(device => 
    device && device.id && device.id !== currentPeerId
  )
  
  const deviceMap = new Map()
  filteredDevices.forEach(device => {
    if (!deviceMap.has(device.name)) {
      deviceMap.set(device.name, device)
    } else {
      const existing = deviceMap.get(device.name)
      if (device.lastSeen && existing.lastSeen && device.lastSeen > existing.lastSeen) {
        deviceMap.set(device.name, device)
      }
    }
  })
  
  const availableDevices = Array.from(deviceMap.values())

  const handleDeviceClick = (device) => {
    if (clickedDevices.has(device.id)) {
      return
    }

    if (onDeviceClick) {
      onDeviceClick(device)
    }
  }

  const getConnectionQuality = (deviceId) => {
    return connectionQuality?.[deviceId] || null
  }

  const getQualityColor = (quality) => {
    if (!quality) return 'text-gray-400'
    if (quality >= 0.7) return 'text-green-500'
    if (quality >= 0.4) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getQualityBars = (quality) => {
    if (!quality) return 0
    if (quality >= 0.7) return 3
    if (quality >= 0.4) return 2
    return 1
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="p-7 ios-rounded-xl liquid-glass dark:liquid-glass-dark liquid-glass-refraction liquid-glass-specular shadow-ios dark:shadow-ios-dark relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Nearby Devices
        </h2>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-full liquid-glass dark:liquid-glass-dark hover:bg-white/20 dark:hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
          title="Refresh device list"
        >
          <RefreshCw className={`w-4 h-4 text-muted-blue ${isRefreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {availableDevices.length === 0 ? (
        <div className="text-center py-12">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-block mb-4"
          >
            <Wifi className="w-16 h-16 text-ios-gray dark:text-gray-600" />
          </motion.div>
          <p className="text-ios-gray dark:text-gray-400 font-medium">
            Searching for devices...
          </p>
          <p className="text-sm text-ios-gray dark:text-gray-500 mt-2 font-medium">
            Make sure you're on the same Wi‑Fi network
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableDevices.map((device, index) => {
            const DeviceIcon = getDeviceIcon(device.type)
            const quality = getConnectionQuality(device.id)
            const qualityBars = getQualityBars(quality)
            return (
              <motion.button
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleDeviceClick(device)}
                disabled={clickedDevices.has(device.id)}
                className="w-full p-4 ios-rounded liquid-glass dark:liquid-glass-dark hover:bg-white/30 dark:hover:bg-white/8 active:scale-95 transition-all flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                <div className="p-3 rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-sm">
                  <DeviceIcon className="w-6 h-6 text-muted-blue" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white text-base">
                    {device.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {quality !== null && (
                    <div className="flex items-end gap-0.5">
                      {[1, 2, 3].map((bar) => (
                        <div
                          key={bar}
                          className={`w-1 rounded-t transition-all ${
                            bar <= qualityBars
                              ? getQualityColor(quality)
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          style={{
                            height: `${bar * 4 + 4}px`
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50 group-hover:scale-125 transition-transform" />
                </div>
              </motion.button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export default DeviceDiscovery

