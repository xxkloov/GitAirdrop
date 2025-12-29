import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'
import { encryptFile, decryptFile, generateEncryptionKey, deriveChunkIV, encryptChunk, decryptChunk } from '../utils/crypto'
import { requestNotificationPermission, showNotification } from '../utils/notifications'
import { PacedSender } from '../utils/pacedSender'

export function usePeerConnection() {
  const [peerId, setPeerId] = useState(null)
  const [devices, setDevices] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [incomingTransfer, setIncomingTransfer] = useState(null)
  const [transferProgress, setTransferProgress] = useState(null)
  const [receivingProgress, setReceivingProgress] = useState(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [error, setError] = useState(null)
  const [transferHistory, setTransferHistory] = useState([])
  const [connectionQuality, setConnectionQuality] = useState({})
  const [activeTransfers, setActiveTransfers] = useState([])
  const [receivedTextMessage, setReceivedTextMessage] = useState(null)
  
  const peerRef = useRef(null)
  const connectionsRef = useRef({})
  const pendingTransferRef = useRef(null)
  const fileChunksRef = useRef({})
  const fileMetadataRef = useRef({})
  const transferStateRef = useRef({})
  const wsRef = useRef(null)
  const wsConnectionsRef = useRef({})
  const isLocalhostRef = useRef(false)
  const connectionRetriesRef = useRef({})
  const connectingRef = useRef({})
  const pollingIntervalRef = useRef(null)
  const registerIntervalRef = useRef(null)
  const isTransferringRef = useRef(false)
  const incomingTransferRef = useRef(null)
  const transferAcceptedRef = useRef({})
  const wakeLockRef = useRef(null)
  const visibilityChangeRef = useRef(null)
  const transferHistoryRef = useRef([])
  const connectionQualityRef = useRef({})
  const sentChunksRef = useRef({})
  const transferResumeDataRef = useRef({})

  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('transferHistory')
        if (stored) {
          const history = JSON.parse(stored)
          setTransferHistory(history)
          transferHistoryRef.current = history
        }
      } catch (err) {
        console.error('[usePeerConnection] Failed to load transfer history:', err)
      }
    }
    loadHistory()

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        console.log('[usePeerConnection] Notification permission not yet requested')
      } else if (Notification.permission === 'granted') {
        console.log('[usePeerConnection] Notification permission already granted')
      }
    }
    
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    isLocalhostRef.current = isLocalhost
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]

    if (isSafari || isIOS) {
      iceServers.push(
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
      )
    }
    
    const peerOptions = {
      config: {
        iceServers: iceServers,
        iceCandidatePoolSize: 10
      }
    }

    if (isLocalhost) {
      peerOptions.host = 'localhost'
      peerOptions.port = 9000
      peerOptions.path = '/peerjs'
      peerOptions.secure = false
    }

    const peer = new Peer(undefined, peerOptions)
    let currentPeerId = null

    peer.on('open', (id) => {
      console.log('[usePeerConnection] Connected with ID:', id)
      currentPeerId = id
      setPeerId(id)
      registerDevice(id)
      pollDevices()
      
      if (isLocalhost) {
        initWebSocket(id)
      }
    })

    peer.on('connection', (conn) => {
      console.log('[usePeerConnection] Incoming connection from:', conn.peer)
      setupConnection(conn)
    })

    peer.on('error', (err) => {
      const errorType = err.type || err.toString()
      const errorMsg = err.message || ''
      console.error('[usePeerConnection] Peer error:', errorType, errorMsg ? `- ${errorMsg}` : '')
    })

    peerRef.current = peer

    const handleBeforeUnload = () => {
      if (currentPeerId) {
        navigator.sendBeacon('/api/unregister', JSON.stringify({ id: currentPeerId }))
      }
    }

    const handleUnload = () => {
      if (currentPeerId) {
        fetch('/api/unregister', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentPeerId }),
          keepalive: true
        }).catch(() => {})
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
          console.log('[usePeerConnection] Wake lock acquired')
          wakeLockRef.current.addEventListener('release', () => {
            console.log('[usePeerConnection] Wake lock released')
          })
        } catch (err) {
          console.log('[usePeerConnection] Wake lock not available:', err)
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[usePeerConnection] Tab hidden, keeping connections alive')
        if (wakeLockRef.current) {
          wakeLockRef.current.release().catch(() => {})
        }
      } else {
        console.log('[usePeerConnection] Tab visible')
        if (isTransferringRef.current || incomingTransferRef.current) {
          requestWakeLock()
        }
      }
    }

    const handleFreeze = () => {
      console.log('[usePeerConnection] Page frozen')
    }

    const handleResume = () => {
      console.log('[usePeerConnection] Page resumed')
      if (peerRef.current?.id) {
        registerDevice(peerRef.current.id)
        if (pollingIntervalRef.current) {
          refreshDevices()
        }
      }
    }

    if (isTransferringRef.current || incomingTransferRef.current) {
      requestWakeLock()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('freeze', handleFreeze)
    document.addEventListener('resume', handleResume)
    visibilityChangeRef.current = handleVisibilityChange

    return () => {
      if (currentPeerId) {
        fetch('/api/unregister', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentPeerId }),
          keepalive: true
        }).catch(() => {})
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
      document.removeEventListener('visibilitychange', visibilityChangeRef.current)
      document.removeEventListener('freeze', handleFreeze)
      document.removeEventListener('resume', handleResume)
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
      
      if (peerRef.current) {
        peerRef.current.destroy()
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      if (registerIntervalRef.current) {
        clearInterval(registerIntervalRef.current)
        registerIntervalRef.current = null
      }
      Object.values(connectionsRef.current).forEach(conn => {
        if (conn && conn.open) {
          conn.close()
        }
      })
      connectionsRef.current = {}
      fileChunksRef.current = {}
      fileMetadataRef.current = {}
      transferStateRef.current = {}
      connectionRetriesRef.current = {}
      connectingRef.current = {}
      transferAcceptedRef.current = {}
    }
  }, [])
  
  const initWebSocket = (peerId) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:9000/ws?peerId=${peerId}`
    
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('[usePeerConnection] WebSocket connected')
    }
    
    ws.onmessage = async (event) => {
      try {
        if (typeof event.data === 'string') {
          const message = JSON.parse(event.data)
          
          if (message.type === 'file-offer') {
            const { fileName, fileSize, senderName } = message.data
            console.log('[usePeerConnection] Received file offer via WebSocket:', fileName, 'from', senderName)
            const transferKey = `${message.senderPeerId}_${fileName}`
            transferStateRef.current[transferKey] = 'pending'
            setIncomingTransfer({
              fileName: fileName,
              fileSize: fileSize,
              senderName: senderName,
              connectionId: message.senderPeerId,
              isWebSocket: true,
              transferKey: transferKey
            })
            pendingTransferRef.current = { ...message.data, isWebSocket: true, senderPeerId: message.senderPeerId, transferKey, connectionId: message.senderPeerId }
            fileChunksRef.current[transferKey] = []
            fileMetadataRef.current[transferKey] = null
          } else if (message.type === 'file-metadata') {
            const { fileName, totalChunks, key, iv, mimeType, fileSize } = message.data
            const transferKey = `${message.senderPeerId}_${fileName}`
            if (!transferStateRef.current[transferKey] || transferStateRef.current[transferKey] !== 'accepted') {
              console.error('[usePeerConnection] Received metadata via WebSocket but transfer not accepted, transferKey:', transferKey, 'state:', transferStateRef.current[transferKey])
              return
            }
            console.log('[usePeerConnection] Received metadata via WebSocket for:', fileName, '- Total chunks:', totalChunks, '- transferKey:', transferKey)
            fileChunksRef.current[transferKey] = new Array(totalChunks)
            const keyData = new Uint8Array(key)
            const baseIV = new Uint8Array(iv)
            const importedKey = await crypto.subtle.importKey(
              'raw',
              keyData,
              { name: 'AES-GCM', length: 256 },
              false,
              ['decrypt']
            )
            fileMetadataRef.current[transferKey] = { key: importedKey, baseIV, mimeType, totalChunks, fileName, fileSize }
            transferStateRef.current[transferKey] = 'transferring'
            setIsReceiving(true)
            setReceivingProgress({
              fileName: fileName,
              progress: 0,
              speed: null,
              startTime: Date.now(),
              bytesReceived: 0
            })
          } else if (message.type === 'transfer-accepted') {
            const transferKey = `${message.senderPeerId}_${message.data.fileName}`
            console.log('[usePeerConnection] Transfer accepted by recipient via WebSocket, transferKey:', transferKey)
            transferAcceptedRef.current[transferKey] = true
          } else if (message.type === 'transfer-declined') {
            console.log('[usePeerConnection] Transfer declined by recipient via WebSocket')
            const transferKey = `${message.senderPeerId}_${message.data.fileName}`
            transferAcceptedRef.current[transferKey] = false
            setIsTransferring(false)
            setTransferProgress(null)
            setError('Transfer declined by recipient.')
          } else if (message.type === 'text-message') {
            console.log('[usePeerConnection] Received text message via WebSocket from:', message.data.senderName)
            const senderDevice = devices.find(d => d.id === message.senderPeerId)
            const senderName = message.data.senderName || senderDevice?.name || 'Unknown Device'
            
            addToHistory({
              type: 'received',
              fileName: message.data.text,
              deviceName: senderName,
              status: 'completed',
              isText: true
            })
            
            setReceivedTextMessage({
              text: message.data.text,
              senderName: senderName,
              timestamp: Date.now()
            })

            const isMuted = localStorage.getItem('notificationsMuted') === 'true'
            if (!isMuted) {
              showNotification('Text Received', {
                body: `From ${senderName}: ${message.data.text.substring(0, 50)}${message.data.text.length > 50 ? '...' : ''}`,
                tag: 'text-received'
              })
            }
          }
        } else {
          let arrayBuffer
          if (event.data instanceof ArrayBuffer) {
            arrayBuffer = event.data
          } else if (event.data instanceof Blob) {
            arrayBuffer = await event.data.arrayBuffer()
          } else {
            arrayBuffer = await new Response(event.data).arrayBuffer()
          }
          
          if (arrayBuffer.byteLength < 3) {
            console.error('[usePeerConnection] Binary message too short')
            return
          }
          
          const view = new DataView(arrayBuffer)
          const messageType = view.getUint8(0)
          const senderPeerIdLength = view.getUint16(1, true)
          let offset = 3
          
          if (arrayBuffer.byteLength < offset + senderPeerIdLength) {
            console.error('[usePeerConnection] Binary message malformed')
            return
          }
          
          const senderPeerId = new TextDecoder().decode(new Uint8Array(arrayBuffer.slice(offset, offset + senderPeerIdLength)))
          offset += senderPeerIdLength
          
          if (messageType === 2) {
            if (arrayBuffer.byteLength < offset + 4) {
              console.error('[usePeerConnection] Binary message missing chunk index')
              return
            }
            
            const chunkIndex = view.getUint32(offset, true)
            offset += 4
            const chunkData = new Uint8Array(arrayBuffer.slice(offset))
            
            const transferKey = Object.keys(transferStateRef.current).find(key => 
              key.startsWith(senderPeerId + '_') && transferStateRef.current[key] === 'transferring'
            )
            if (!transferKey) {
              console.error('[usePeerConnection] Received chunk via WebSocket but no active transfer for peer:', senderPeerId, 'transferState:', transferStateRef.current)
              return
            }
            const metadata = fileMetadataRef.current[transferKey]
            if (!metadata) {
              console.error('[usePeerConnection] Received chunk but no metadata exists')
              return
            }
            
            if (!fileChunksRef.current[transferKey]) {
              fileChunksRef.current[transferKey] = new Array(metadata.totalChunks)
            }
            
            try {
              const chunkIV = deriveChunkIV(metadata.baseIV, chunkIndex)
              const decryptedChunk = await decryptChunk(chunkData, metadata.key, chunkIV)
              fileChunksRef.current[transferKey][chunkIndex] = decryptedChunk

              const chunks = fileChunksRef.current[transferKey]
              const receivedChunks = chunks.filter(c => c !== undefined).length
              const progress = Math.round((receivedChunks / metadata.totalChunks) * 100)
              
              if (receivedChunks % 50 === 0 || receivedChunks === metadata.totalChunks) {
                console.log('[usePeerConnection] Receiving:', metadata.fileName, '-', progress + '%', `(${receivedChunks}/${metadata.totalChunks})`)
              }
              
              const formatSpeed = (bytesPerSecond) => {
                if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
                if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
                return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
              }
              
              if (receivingProgress) {
                const bytesReceived = chunks.filter(c => c !== undefined).reduce((sum, chunk) => sum + (chunk ? chunk.length : 0), 0)
                const elapsed = (Date.now() - receivingProgress.startTime) / 1000
                const speed = elapsed > 0 ? bytesReceived / elapsed : 0
                const speedFormatted = formatSpeed(speed)
                
                setReceivingProgress({
                  fileName: metadata.fileName,
                  progress: progress,
                  speed: speedFormatted,
                  startTime: receivingProgress.startTime,
                  bytesReceived: bytesReceived
                })
              }

              if (receivedChunks === metadata.totalChunks && chunks.every(c => c !== undefined)) {
                console.log('[usePeerConnection] All chunks received and decrypted, assembling file:', metadata.fileName)
                try {
                  const blob = new Blob(chunks, { type: metadata.mimeType })
                  
                  console.log('[usePeerConnection] File assembled successfully, downloading:', metadata.fileName)
                  
                  const senderDevice = devices.find(d => d.id === senderPeerId)
                  addToHistory({
                    type: 'received',
                    fileName: metadata.fileName,
                    fileSize: metadata.fileSize || chunks.reduce((sum, chunk) => sum + chunk.length, 0),
                    deviceName: senderDevice?.name || 'Unknown Device',
                    status: 'completed',
                    isText: false
                  })
                  
                  showNotification('Received', {
                    body: `${metadata.fileName} is ready to download`,
                    tag: 'transfer-received'
                  })
                  
                  setTimeout(() => {
                    downloadFile(blob, metadata.fileName)
                  }, 100)
                  
                  setTimeout(() => {
                    setIncomingTransfer(null)
                    setTransferProgress(null)
                    setIsReceiving(false)
                    setReceivingProgress(null)
                  }, 500)
                  
                  delete fileChunksRef.current[transferKey]
                  delete fileMetadataRef.current[transferKey]
                  delete transferStateRef.current[transferKey]
                } catch (err) {
                  console.error('[usePeerConnection] Failed to assemble file:', err)
                  setTransferProgress(null)
                  setIsReceiving(false)
                  setReceivingProgress(null)
                  setError('Failed to assemble file. The file may be corrupted.')
                  delete fileChunksRef.current[transferKey]
                  delete fileMetadataRef.current[transferKey]
                  delete transferStateRef.current[transferKey]
                }
              }
            } catch (err) {
              console.error('[usePeerConnection] Failed to decrypt chunk', chunkIndex, ':', err)
            }
          }
        }
      } catch (err) {
        console.error('[usePeerConnection] WebSocket message error:', err)
      }
    }
    
    ws.onerror = (err) => {
      console.error('[usePeerConnection] WebSocket error:', err)
    }
    
    ws.onclose = () => {
      console.log('[usePeerConnection] WebSocket closed, reconnecting...')
      setTimeout(() => {
        if (peerRef.current?.id) {
          initWebSocket(peerRef.current.id)
        }
      }, 1000)
    }
    
    wsRef.current = ws
  }

  const registerDevice = async (id, deviceName = null) => {
    try {
      const name = deviceName || getDeviceName()
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: name,
          type: getDeviceType()
        })
      })
    } catch (err) {
      console.error('[usePeerConnection] Failed to register:', err)
    }
  }

  const updateDeviceName = (newName) => {
    if (newName && newName.trim()) {
      localStorage.setItem('deviceName', newName.trim())
      if (peerRef.current?.id) {
        registerDevice(peerRef.current.id, newName.trim())
      }
    }
  }

  const pollDevices = () => {
    let isPolling = false
    
    const shouldPoll = () => {
      if (isTransferringRef.current) return false
      if (Object.keys(connectingRef.current).length > 0) return false
      if (incomingTransferRef.current) return false
      return true
    }
    
    const poll = async (force = false) => {
      if (!force && !shouldPoll()) return
      if (isPolling && !force) return
      isPolling = true
      
      try {
        const currentPeerId = peerRef.current?.id
        if (!currentPeerId) {
          isPolling = false
          return
        }
        
        const response = await fetch(`/api/devices?exclude=${encodeURIComponent(currentPeerId)}`)
        const allDevices = await response.json()
        
        if (!Array.isArray(allDevices)) {
          isPolling = false
          return
        }
        
        setDevices(prevDevices => {
          const deviceMap = new Map()
          allDevices.forEach(device => {
            if (device && device.id && device.id !== currentPeerId) {
              if (!deviceMap.has(device.id)) {
                deviceMap.set(device.id, device)
              } else {
                const existing = deviceMap.get(device.id)
                if (device.lastSeen && existing.lastSeen && device.lastSeen > existing.lastSeen) {
                  deviceMap.set(device.id, device)
                }
              }
            }
          })
          prevDevices.forEach(device => {
            if (device && device.id && device.id !== currentPeerId && !deviceMap.has(device.id)) {
              deviceMap.set(device.id, device)
            }
          })
          const newDevices = Array.from(deviceMap.values())
          const hasChanged = newDevices.length !== prevDevices.length || 
            newDevices.some((newDev, idx) => {
              const oldDev = prevDevices[idx]
              return !oldDev || newDev.id !== oldDev.id || newDev.name !== oldDev.name || newDev.lastSeen !== oldDev.lastSeen
            })
          return hasChanged ? newDevices : prevDevices
        })
      } catch (err) {
        console.error('[usePeerConnection] Failed to fetch devices:', err)
      } finally {
        isPolling = false
      }
    }
    
    const startPolling = () => {
      if (pollingIntervalRef.current) return
      const pollWithVisibility = () => {
        if (!document.hidden || isTransferringRef.current || incomingTransferRef.current) {
          poll()
        }
      }
      pollingIntervalRef.current = setInterval(pollWithVisibility, 300)
      pollWithVisibility()
    }
    
    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
    
    startPolling()

    registerIntervalRef.current = setInterval(async () => {
      if (peerRef.current?.id) {
        try {
          await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: peerRef.current.id,
              name: getDeviceName(),
              type: getDeviceType()
            })
          })
        } catch (err) {
          console.error('[usePeerConnection] Failed to re-register:', err)
        }
      }
    }, 30000)

    return () => {
      stopPolling()
      if (registerIntervalRef.current) {
        clearInterval(registerIntervalRef.current)
        registerIntervalRef.current = null
      }
      isPolling = false
    }
  }

  const refreshDevices = () => {
    const currentPeerId = peerRef.current?.id
    if (!currentPeerId) return
    
    fetch(`/api/devices?exclude=${encodeURIComponent(currentPeerId)}`)
      .then(response => response.json())
      .then(allDevices => {
        if (!Array.isArray(allDevices)) return
        
        setDevices(prevDevices => {
          const deviceMap = new Map()
          allDevices.forEach(device => {
            if (device && device.id && device.id !== currentPeerId) {
              if (!deviceMap.has(device.id)) {
                deviceMap.set(device.id, device)
              } else {
                const existing = deviceMap.get(device.id)
                if (device.lastSeen && existing.lastSeen && device.lastSeen > existing.lastSeen) {
                  deviceMap.set(device.id, device)
                }
              }
            }
          })
          prevDevices.forEach(device => {
            if (device && device.id && device.id !== currentPeerId && !deviceMap.has(device.id)) {
              deviceMap.set(device.id, device)
            }
          })
          const newDevices = Array.from(deviceMap.values())
          const hasChanged = newDevices.length !== prevDevices.length || 
            newDevices.some((newDev, idx) => {
              const oldDev = prevDevices[idx]
              return !oldDev || newDev.id !== oldDev.id || newDev.name !== oldDev.name || newDev.lastSeen !== oldDev.lastSeen
            })
          return hasChanged ? newDevices : prevDevices
        })
      })
      .catch(err => {
        console.error('[usePeerConnection] Failed to refresh devices:', err)
      })
  }
  
  useEffect(() => {
    isTransferringRef.current = isTransferring
    if (isTransferring && 'wakeLock' in navigator && !wakeLockRef.current) {
      navigator.wakeLock.request('screen').then(lock => {
        wakeLockRef.current = lock
        console.log('[usePeerConnection] Wake lock acquired for transfer')
      }).catch(() => {})
    } else if (!isTransferring && !incomingTransferRef.current && wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [isTransferring])
  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])
  
  useEffect(() => {
    incomingTransferRef.current = incomingTransfer
    if (incomingTransfer && 'wakeLock' in navigator && !wakeLockRef.current) {
      navigator.wakeLock.request('screen').then(lock => {
        wakeLockRef.current = lock
        console.log('[usePeerConnection] Wake lock acquired for incoming transfer')
      }).catch(() => {})
    } else if (!incomingTransfer && !isTransferringRef.current && wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [incomingTransfer])

  const encodeMessage = (message) => {
    const jsonString = JSON.stringify(message)
    return new TextEncoder().encode(jsonString)
  }

  const waitForConnection = (conn, timeout = 30000) => {
    return new Promise((resolve, reject) => {
      if (conn.open) {
        resolve()
        return
      }

      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, timeout)

      const onOpen = () => {
        clearTimeout(timer)
        resolve()
      }

      const onError = (err) => {
        clearTimeout(timer)
        reject(err)
      }

      conn.once('open', onOpen)
      conn.once('error', onError)
    })
  }

  const setupConnection = (conn) => {
    connectionsRef.current[conn.peer] = conn
    
    conn.on('open', () => {
      console.log('[usePeerConnection] Connection established with:', conn.peer)
      setIsConnected(true)
      
      setTimeout(() => {
        try {
          const peerConnection = conn.peerConnection || conn._peerConnection || (conn._negotiator && conn._negotiator.connection && conn._negotiator.connection.peerConnection)
          if (peerConnection && peerConnection instanceof RTCPeerConnection) {
            const originalOnIceCandidate = peerConnection.onicecandidate
            peerConnection.onicecandidate = (event) => {
              if (originalOnIceCandidate) {
                originalOnIceCandidate.call(peerConnection, event)
              }
              if (event.candidate) {
                const candidate = event.candidate.candidate
                let candidateType = 'unknown'
                if (candidate.includes('typ host')) {
                  candidateType = 'host'
                } else if (candidate.includes('typ srflx')) {
                  candidateType = 'srflx'
                } else if (candidate.includes('typ relay')) {
                  candidateType = 'relay'
                  console.error('[usePeerConnection] WARNING: TURN/RELAY candidate detected! Connection will be relayed through server and will be SLOW!')
                } else if (candidate.includes('typ prflx')) {
                  candidateType = 'prflx'
                }
                console.log(`[usePeerConnection] ICE candidate (${candidateType}):`, candidate.substring(0, 100))
              } else {
                console.log('[usePeerConnection] ICE gathering complete')
              }
            }
            
            const checkConnectionType = () => {
              peerConnection.getStats().then(result => {
                let usingRelay = false
                let connectionType = 'unknown'
                result.forEach(report => {
                  if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    const localCandidate = result.get(report.localCandidateId)
                    if (localCandidate) {
                      if (localCandidate.candidateType === 'relay') {
                        usingRelay = true
                      } else if (localCandidate.candidateType === 'host') {
                        connectionType = 'host'
                      } else if (localCandidate.candidateType === 'srflx') {
                        connectionType = 'srflx'
                      }
                    }
                  }
                })
                if (usingRelay) {
                  console.error('[usePeerConnection] CONNECTION ESTABLISHED BUT USING TURN/RELAY - TRANSFER WILL BE SLOW!')
                } else if (connectionType === 'host') {
                  console.log('[usePeerConnection] Direct LAN connection established (host)')
                } else if (connectionType === 'srflx') {
                  console.log('[usePeerConnection] NAT traversal connection established (srflx)')
                }
              }).catch(err => {
                console.warn('[usePeerConnection] Could not get connection stats:', err)
              })
            }
            
            const originalOnIceConnectionStateChange = peerConnection.oniceconnectionstatechange
            peerConnection.oniceconnectionstatechange = () => {
              if (originalOnIceConnectionStateChange) {
                originalOnIceConnectionStateChange.call(peerConnection)
              }
              const state = peerConnection.iceConnectionState
              console.log('[usePeerConnection] ICE connection state:', state)
              if (state === 'connected' || state === 'completed') {
                setTimeout(checkConnectionType, 1000)
              }
            }
          }
        } catch (err) {
          console.warn('[usePeerConnection] Could not access RTCPeerConnection for ICE logging:', err)
        }
      }, 500)
    })

    conn.on('data', async (rawData) => {
      let data
      const dataSize = rawData instanceof ArrayBuffer ? rawData.byteLength : rawData instanceof Blob ? rawData.size : rawData instanceof Uint8Array ? rawData.length : typeof rawData === 'string' ? rawData.length : 'unknown'
      
      if (typeof rawData === 'number') {
        return
      }
      
      if (typeof rawData !== 'string' && !(rawData instanceof ArrayBuffer) && !(rawData instanceof Blob) && !(rawData instanceof Uint8Array)) {
        console.error('[usePeerConnection] Received unexpected data type:', typeof rawData, rawData)
        return
      }
      
      console.log('[usePeerConnection] Received raw data, type:', typeof rawData, 'constructor:', rawData?.constructor?.name, 'size:', dataSize, 'from peer:', conn.peer)
      
      let arrayBuffer
      if (rawData instanceof ArrayBuffer) {
        arrayBuffer = rawData
      } else if (rawData instanceof Blob) {
        arrayBuffer = await rawData.arrayBuffer()
      } else if (rawData instanceof Uint8Array) {
        arrayBuffer = rawData.buffer
      } else {
        arrayBuffer = null
      }
      
      if (arrayBuffer && arrayBuffer.byteLength >= 5) {
        const view = new DataView(arrayBuffer)
        const messageType = view.getUint8(0)
        
        if (messageType === 1) {
          const chunkIndex = view.getUint32(1, true)
          const encryptedChunk = new Uint8Array(arrayBuffer.slice(5))
          console.log('[usePeerConnection] Received binary chunk, chunkIndex:', chunkIndex, 'size:', encryptedChunk.length, 'from peer:', conn.peer)
          
          const transferKey = Object.keys(transferStateRef.current).find(key => 
            key.startsWith(conn.peer + '_') && transferStateRef.current[key] === 'transferring'
          )
          
          if (!transferKey) {
            console.error('[usePeerConnection] Received binary chunk but no active transfer for peer:', conn.peer, 'available transfers:', Object.keys(transferStateRef.current))
            return
          }
          
          const metadata = fileMetadataRef.current[transferKey]
          if (!metadata) {
            console.error('[usePeerConnection] Received binary chunk but no metadata exists')
            return
          }
          
          if (!fileChunksRef.current[transferKey]) {
            fileChunksRef.current[transferKey] = new Array(metadata.totalChunks)
          }
          
          try {
            const decryptedChunk = await new Promise((resolve, reject) => {
              const handler = (e) => {
                if (e.data.type === 'chunk-decrypted' && e.data.chunkIndex === chunkIndex) {
                  metadata.cryptoWorker.removeEventListener('message', handler)
                  resolve(new Uint8Array(e.data.decrypted))
                } else if (e.data.type === 'error') {
                  metadata.cryptoWorker.removeEventListener('message', handler)
                  reject(new Error(e.data.error))
                }
              }
              metadata.cryptoWorker.addEventListener('message', handler)
              metadata.cryptoWorker.postMessage({
                type: 'decrypt-chunk',
                data: {
                  encryptedChunk: Array.from(encryptedChunk),
                  baseIV: Array.from(metadata.baseIV),
                  chunkIndex: chunkIndex
                }
              }, [encryptedChunk.buffer])
            })
            
            fileChunksRef.current[transferKey][chunkIndex] = decryptedChunk
            console.log('[usePeerConnection] Decrypted and stored binary chunk', chunkIndex, 'size:', decryptedChunk.length, 'bytes')

            const chunks = fileChunksRef.current[transferKey]
            const receivedChunks = chunks.filter(c => c !== undefined).length
            const progress = Math.round((receivedChunks / metadata.totalChunks) * 100)
            
            if (receivedChunks % 50 === 0 || receivedChunks === metadata.totalChunks) {
              console.log('[usePeerConnection] Receiving:', metadata.fileName, '-', progress + '%', `(${receivedChunks}/${metadata.totalChunks})`)
            }
            
            const formatSpeed = (bytesPerSecond) => {
              if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
              if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
              return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
            }
            
            if (receivingProgress) {
              const bytesReceived = chunks.filter(c => c !== undefined).reduce((sum, chunk) => sum + (chunk ? chunk.length : 0), 0)
              const elapsed = (Date.now() - receivingProgress.startTime) / 1000
              const speed = elapsed > 0 ? bytesReceived / elapsed : 0
              const speedFormatted = formatSpeed(speed)
              
              setReceivingProgress({
                fileName: metadata.fileName,
                progress: progress,
                speed: speedFormatted,
                startTime: receivingProgress.startTime,
                bytesReceived: bytesReceived,
                totalBytes: receivingProgress.totalBytes || metadata.fileSize
              })
            }

            if (receivedChunks === metadata.totalChunks && chunks.every(c => c !== undefined)) {
              console.log('[usePeerConnection] All chunks received and decrypted, assembling file:', metadata.fileName)
              
              setReceivingProgress(prev => prev ? {
                ...prev,
                progress: 100,
                isDownloading: true
              } : null)
              
              try {
                const blob = new Blob(chunks, { type: metadata.mimeType })
                
                console.log('[usePeerConnection] File assembled successfully, downloading:', metadata.fileName)
                
                const senderDevice = devices.find(d => d.id === conn.peer)
                addToHistory({
                  type: 'received',
                  fileName: metadata.fileName,
                  fileSize: metadata.fileSize || chunks.reduce((sum, chunk) => sum + chunk.length, 0),
                  deviceName: senderDevice?.name || 'Unknown Device',
                  status: 'completed',
                  isText: false
                })
                
                showNotification('Received', {
                  body: `${metadata.fileName} is ready to download`,
                  tag: 'transfer-received'
                })
                
                setTimeout(() => {
                  downloadFile(blob, metadata.fileName)
                }, 100)
                
                setTimeout(() => {
                  setIncomingTransfer(null)
                  setTransferProgress(null)
                  setIsReceiving(false)
                  setReceivingProgress(null)
                }, 1000)
                
                if (metadata.cryptoWorker) {
                  metadata.cryptoWorker.terminate()
                }
                delete fileChunksRef.current[transferKey]
                delete fileMetadataRef.current[transferKey]
                delete transferStateRef.current[transferKey]
              } catch (err) {
                console.error('[usePeerConnection] Failed to assemble file:', err)
                setTransferProgress(null)
                if (metadata.cryptoWorker) {
                  metadata.cryptoWorker.terminate()
                }
                delete fileChunksRef.current[transferKey]
                delete fileMetadataRef.current[transferKey]
                delete transferStateRef.current[transferKey]
              }
            }
          } catch (err) {
            console.error('[usePeerConnection] Failed to decrypt binary chunk', chunkIndex, ':', err)
            if (metadata.cryptoWorker) {
              metadata.cryptoWorker.terminate()
            }
          }
          return
        }
      }
      
      if (arrayBuffer) {
        const text = new TextDecoder().decode(arrayBuffer)
        try {
          data = JSON.parse(text)
        } catch (err) {
          console.error('[usePeerConnection] Failed to parse data:', err, 'text length:', text.length, 'first 100 chars:', text.substring(0, 100))
          return
        }
      } else if (typeof rawData === 'string') {
        try {
          data = JSON.parse(rawData)
        } catch (err) {
          console.error('[usePeerConnection] Failed to parse string data:', err, 'string length:', rawData.length)
          return
        }
      } else {
        data = rawData
      }

      if (!data || !data.type) {
        console.error('[usePeerConnection] Received data without type:', data)
        return
      }

      console.log('[usePeerConnection] Received data type:', data.type, 'from peer:', conn.peer)

      if (data.type === 'file-offer') {
        console.log('[usePeerConnection] Received file offer:', data.fileName, 'from', data.senderName)
        const transferKey = `${conn.peer}_${data.fileName}`
        transferStateRef.current[transferKey] = 'pending'
        setIncomingTransfer({
          fileName: data.fileName,
          fileSize: data.fileSize,
          senderName: data.senderName,
          connectionId: conn.peer,
          transferKey: transferKey
        })
        pendingTransferRef.current = { ...data, transferKey, connectionId: conn.peer }
        fileChunksRef.current[transferKey] = []
        fileMetadataRef.current[transferKey] = null
      } else if (data.type === 'file-metadata') {
        const { fileName, totalChunks, key, iv, mimeType, fileSize } = data
        const transferKey = `${conn.peer}_${fileName}`
        if (!transferStateRef.current[transferKey] || transferStateRef.current[transferKey] !== 'accepted') {
          console.error('[usePeerConnection] Received metadata but transfer not accepted, transferKey:', transferKey, 'state:', transferStateRef.current[transferKey])
          return
        }
        console.log('[usePeerConnection] Received metadata for:', fileName, '- Total chunks:', totalChunks, '- transferKey:', transferKey)
        fileChunksRef.current[transferKey] = new Array(totalChunks)
        const keyData = new Uint8Array(key)
        const baseIV = new Uint8Array(iv)
        
        const cryptoWorker = new Worker(new URL('../utils/cryptoWorker.js', import.meta.url), { type: 'module' })
        await new Promise((resolve) => {
          cryptoWorker.postMessage({ type: 'init-decrypt-key', data: { keyData: Array.from(keyData) } })
          cryptoWorker.onmessage = (e) => {
            if (e.data.type === 'decrypt-key-ready') {
              resolve()
            }
          }
        })
        
        fileMetadataRef.current[transferKey] = { cryptoWorker, baseIV, mimeType, totalChunks, fileName, fileSize }
        transferStateRef.current[transferKey] = 'transferring'
        console.log('[usePeerConnection] Transfer state set to transferring, ready to receive chunks. transferKey:', transferKey, 'totalChunks:', totalChunks, 'hasDataChannel:', !!conn.dataChannel)
        setIsReceiving(true)
        setReceivingProgress({
          fileName: fileName,
          progress: 0,
          speed: null,
          startTime: Date.now(),
          bytesReceived: 0,
          totalBytes: fileSize
        })
      } else if (data.type === 'file-chunk') {
        console.log('[usePeerConnection] Received file-chunk, chunkIndex:', data.chunkIndex, 'from peer:', conn.peer, 'chunkData type:', typeof data.chunk, 'isArray:', Array.isArray(data.chunk))
        const { chunkIndex, chunk: chunkData } = data
        
        if (chunkIndex === undefined || chunkData === undefined) {
          console.error('[usePeerConnection] Received chunk with missing data:', { chunkIndex, hasChunkData: chunkData !== undefined })
          return
        }
        
        const transferKey = Object.keys(transferStateRef.current).find(key => 
          key.startsWith(conn.peer + '_') && transferStateRef.current[key] === 'transferring'
        )
        console.log('[usePeerConnection] Found transferKey:', transferKey, 'for chunk:', chunkIndex, 'available keys:', Object.keys(transferStateRef.current))
        if (chunkIndex === 0) {
          console.log('[usePeerConnection] Received first chunk, transferKey:', transferKey, 'chunk size:', chunkData?.length, 'chunkData type:', typeof chunkData)
        }
        if (!transferKey) {
          console.error('[usePeerConnection] Received chunk but no active transfer for peer:', conn.peer, 'transferState:', transferStateRef.current)
          return
        }
        const metadata = fileMetadataRef.current[transferKey]
        if (!metadata) {
          console.error('[usePeerConnection] Received chunk but no metadata exists for transferKey:', transferKey)
          return
        }
        
        if (!fileChunksRef.current[transferKey]) {
          fileChunksRef.current[transferKey] = new Array(metadata.totalChunks)
        }
        
        let chunkArray
        try {
          if (Array.isArray(chunkData)) {
            chunkArray = new Uint8Array(chunkData)
          } else if (chunkData instanceof Uint8Array) {
            chunkArray = chunkData
          } else if (chunkData instanceof ArrayBuffer) {
            chunkArray = new Uint8Array(chunkData)
          } else {
            console.error('[usePeerConnection] Unexpected chunk data type:', typeof chunkData, chunkData)
            return
          }
        } catch (err) {
          console.error('[usePeerConnection] Failed to convert chunk data:', err)
          return
        }
        
        try {
          const decryptedChunk = await new Promise((resolve, reject) => {
            const handler = (e) => {
              if (e.data.type === 'chunk-decrypted' && e.data.chunkIndex === chunkIndex) {
                metadata.cryptoWorker.removeEventListener('message', handler)
                resolve(new Uint8Array(e.data.decrypted))
              } else if (e.data.type === 'error') {
                metadata.cryptoWorker.removeEventListener('message', handler)
                reject(new Error(e.data.error))
              }
            }
            metadata.cryptoWorker.addEventListener('message', handler)
            metadata.cryptoWorker.postMessage({
              type: 'decrypt-chunk',
              data: {
                encryptedChunk: Array.from(chunkArray),
                baseIV: Array.from(metadata.baseIV),
                chunkIndex: chunkIndex
              }
            }, [chunkArray.buffer])
          })
          
          fileChunksRef.current[transferKey][chunkIndex] = decryptedChunk
          console.log('[usePeerConnection] Decrypted and stored chunk', chunkIndex, 'size:', decryptedChunk.length, 'bytes')

          const chunks = fileChunksRef.current[transferKey]
          const receivedChunks = chunks.filter(c => c !== undefined).length
          const progress = Math.round((receivedChunks / metadata.totalChunks) * 100)
          
          if (receivedChunks % 50 === 0 || receivedChunks === metadata.totalChunks) {
            console.log('[usePeerConnection] Receiving:', metadata.fileName, '-', progress + '%', `(${receivedChunks}/${metadata.totalChunks})`)
          }
          
          const formatSpeed = (bytesPerSecond) => {
            if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
            if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
            return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
          }
          
          if (receivingProgress) {
            const bytesReceived = chunks.filter(c => c !== undefined).reduce((sum, chunk) => sum + (chunk ? chunk.length : 0), 0)
            const elapsed = (Date.now() - receivingProgress.startTime) / 1000
            const speed = elapsed > 0 ? bytesReceived / elapsed : 0
            const speedFormatted = formatSpeed(speed)
            
            setReceivingProgress({
              fileName: metadata.fileName,
              progress: progress,
              speed: speedFormatted,
              startTime: receivingProgress.startTime,
              bytesReceived: bytesReceived,
              totalBytes: receivingProgress.totalBytes || metadata.fileSize
            })
          }

          if (receivedChunks === metadata.totalChunks && chunks.every(c => c !== undefined)) {
            console.log('[usePeerConnection] All chunks received and decrypted, assembling file:', metadata.fileName)
            
            setReceivingProgress(prev => prev ? {
              ...prev,
              progress: 100,
              isDownloading: true
            } : null)
            
            try {
              const blob = new Blob(chunks, { type: metadata.mimeType })
              
              console.log('[usePeerConnection] File assembled successfully, downloading:', metadata.fileName)
              
              const senderDevice = devices.find(d => d.id === conn.peer)
              addToHistory({
                type: 'received',
                fileName: metadata.fileName,
                fileSize: metadata.fileSize || chunks.reduce((sum, chunk) => sum + chunk.length, 0),
                deviceName: senderDevice?.name || 'Unknown Device',
                status: 'completed',
                isText: false
              })
              
              showNotification('Received', {
                body: `${metadata.fileName} is ready to download`,
                tag: 'transfer-received'
              })
              
              setTimeout(() => {
                downloadFile(blob, metadata.fileName)
              }, 100)
              
              setTimeout(() => {
                setIncomingTransfer(null)
                setTransferProgress(null)
                setIsReceiving(false)
                setReceivingProgress(null)
              }, 1000)
              
              if (metadata.cryptoWorker) {
                metadata.cryptoWorker.terminate()
              }
              delete fileChunksRef.current[transferKey]
              delete fileMetadataRef.current[transferKey]
              delete transferStateRef.current[transferKey]
            } catch (err) {
              console.error('[usePeerConnection] Failed to assemble file:', err)
              setTransferProgress(null)
              if (metadata.cryptoWorker) {
                metadata.cryptoWorker.terminate()
              }
              delete fileChunksRef.current[transferKey]
              delete fileMetadataRef.current[transferKey]
              delete transferStateRef.current[transferKey]
            }
          }
        } catch (err) {
          console.error('[usePeerConnection] Failed to decrypt chunk', chunkIndex, ':', err)
          if (metadata.cryptoWorker) {
            metadata.cryptoWorker.terminate()
          }
        }
      } else if (data.type === 'transfer-accepted') {
        const transferKey = `${conn.peer}_${data.fileName}`
        console.log('[usePeerConnection] Transfer accepted by recipient, transferKey:', transferKey)
        transferAcceptedRef.current[transferKey] = true
      } else if (data.type === 'transfer-declined') {
        console.log('[usePeerConnection] Transfer declined by recipient')
        const transferKey = `${conn.peer}_${data.fileName}`
        transferAcceptedRef.current[transferKey] = false
        setIsTransferring(false)
        setTransferProgress(null)
        setError('Transfer declined by recipient.')
      } else if (data.type === 'text-message') {
        console.log('[usePeerConnection] Received text message from:', data.senderName)
        const senderDevice = devices.find(d => d.id === conn.peer)
        const senderName = data.senderName || senderDevice?.name || 'Unknown Device'
        
        addToHistory({
          type: 'received',
          fileName: data.text,
          deviceName: senderName,
          status: 'completed',
          isText: true
        })
        
        setReceivedTextMessage({
          text: data.text,
          senderName: senderName,
          timestamp: Date.now()
        })

        const isMuted = localStorage.getItem('notificationsMuted') === 'true'
        if (!isMuted) {
          showNotification('Text Received', {
            body: `From ${senderName}: ${data.text.substring(0, 50)}${data.text.length > 50 ? '...' : ''}`,
            tag: 'text-received'
          })
        }
      }
    })

    conn.on('close', () => {
      console.log('[usePeerConnection] Connection closed with:', conn.peer)
      delete connectionsRef.current[conn.peer]
      delete connectionRetriesRef.current[conn.peer]
      setIsConnected(Object.keys(connectionsRef.current).length > 0)
      
      const transferKeys = Object.keys(transferStateRef.current).filter(key => 
        key.startsWith(conn.peer + '_')
      )
      transferKeys.forEach(key => {
        delete transferStateRef.current[key]
        delete fileChunksRef.current[key]
        delete fileMetadataRef.current[key]
      })
    })

    conn.on('error', (err) => {
      console.error('[usePeerConnection] Connection error in setup:', err, 'peer:', conn.peer, 'open:', conn.open)
      if (conn.peer) {
        delete connectionsRef.current[conn.peer]
        setIsConnected(Object.keys(connectionsRef.current).length > 0)
      }
    })
  }

  const connectToPeer = async (targetPeerId, retryCount = 0) => {
    if (connectionsRef.current[targetPeerId] && connectionsRef.current[targetPeerId].open) {
      console.log('[usePeerConnection] Already connected to:', targetPeerId)
      return
    }

    if (connectingRef.current[targetPeerId]) {
      console.log('[usePeerConnection] Connection already in progress to:', targetPeerId)
      return
    }

    if (!peerRef.current || !peerRef.current.open) {
      console.error('[usePeerConnection] Peer not initialized yet')
      return
    }

    const MAX_RETRIES = 3
    const RETRY_DELAYS = [500, 1000, 2000]

    connectingRef.current[targetPeerId] = true

    try {
      const conn = peerRef.current.connect(targetPeerId, {
        reliable: true,
        serialization: 'binary'
      })
      
      conn.on('open', () => {
        delete connectingRef.current[targetPeerId]
        restartPolling()
      })
      
      conn.on('error', (err) => {
        delete connectingRef.current[targetPeerId]
        console.error('[usePeerConnection] Connection error:', err.type || err, err.message || '')
        if (retryCount < MAX_RETRIES && !connectionsRef.current[targetPeerId]?.open) {
          const delay = RETRY_DELAYS[retryCount] || 2000
          connectionRetriesRef.current[targetPeerId] = (connectionRetriesRef.current[targetPeerId] || 0) + 1
          setTimeout(() => {
            connectToPeer(targetPeerId, retryCount + 1)
          }, delay)
        } else {
          restartPolling()
        }
      })
      
      conn.on('close', () => {
        delete connectingRef.current[targetPeerId]
        restartPolling()
      })
      
      setupConnection(conn)
    } catch (err) {
      delete connectingRef.current[targetPeerId]
      console.error('[usePeerConnection] Failed to create connection:', err)
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || 2000
        setTimeout(() => {
          connectToPeer(targetPeerId, retryCount + 1)
        }, delay)
      } else {
        restartPolling()
      }
    }
  }

  const restartPolling = () => {
    if (pollingIntervalRef.current) return
    const pollWithVisibility = () => {
      if (!document.hidden || isTransferringRef.current || incomingTransferRef.current) {
        const currentPeerId = peerRef.current?.id
        if (!currentPeerId) return
        fetch(`/api/devices?exclude=${encodeURIComponent(currentPeerId)}`)
          .then(response => response.json())
          .then(allDevices => {
            if (!Array.isArray(allDevices)) return
            setDevices(prevDevices => {
              const deviceMap = new Map()
              allDevices.forEach(device => {
                if (device && device.id && device.id !== currentPeerId) {
                  if (!deviceMap.has(device.id)) {
                    deviceMap.set(device.id, device)
                  } else {
                    const existing = deviceMap.get(device.id)
                    if (device.lastSeen && existing.lastSeen && device.lastSeen > existing.lastSeen) {
                      deviceMap.set(device.id, device)
                    }
                  }
                }
              })
              prevDevices.forEach(device => {
                if (device && device.id && device.id !== currentPeerId && !deviceMap.has(device.id)) {
                  deviceMap.set(device.id, device)
                }
              })
              return Array.from(deviceMap.values())
            })
          })
          .catch(err => console.error('[usePeerConnection] Failed to poll devices:', err))
      }
    }
    pollingIntervalRef.current = setInterval(pollWithVisibility, 300)
    pollWithVisibility()
  }

  const sendFile = async (file, targetPeerId) => {
    console.warn('[usePeerConnection] WebSocket file transfer fallback is DISABLED. Using WebRTC DataChannel only.')
    
    if (isLocalhostRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.error('[usePeerConnection] WebSocket fallback requested but DISABLED. Failing fast.')
      setError('WebRTC connection required. WebSocket fallback is disabled for LAN transfers.')
      return
    }
    
    let conn = connectionsRef.current[targetPeerId]
    
    if (!conn || !conn.open) {
      if (connectingRef.current[targetPeerId]) {
        console.log('[usePeerConnection] Connection in progress, waiting...')
        let attempts = 0
        while (attempts < 30 && (!connectionsRef.current[targetPeerId] || !connectionsRef.current[targetPeerId].open)) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        conn = connectionsRef.current[targetPeerId]
      } else {
        console.log('[usePeerConnection] No connection found, establishing connection to:', targetPeerId)
        await connectToPeer(targetPeerId)
        let attempts = 0
        while (attempts < 30 && (!connectionsRef.current[targetPeerId] || !connectionsRef.current[targetPeerId].open)) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        conn = connectionsRef.current[targetPeerId]
      }
      
      if (!conn || !conn.open) {
        console.error('[usePeerConnection] Failed to establish connection')
        setIsTransferring(false)
        setTransferProgress(null)
        setError('Failed to connect to device. The device might be offline or unavailable.')
        return
      }
    }

    try {
      if (!conn.open) {
        console.log('[usePeerConnection] Waiting for connection to open...')
        await waitForConnection(conn, 30000)
      }
    } catch (err) {
      console.error('[usePeerConnection] Connection failed:', err)
      setError('Connection timeout. The device is not responding.')
      setIsTransferring(false)
      setTransferProgress(null)
      return
    }

    try {
      setIsTransferring(true)
      setTransferProgress({
        fileName: file.name,
        progress: 0,
        bytesSent: 0,
        totalBytes: file.size
      })

      conn.send(encodeMessage({
        type: 'file-offer',
        fileName: file.name,
        fileSize: file.size,
        senderName: getDeviceName()
      }))

      const transferKey = `${targetPeerId}_${file.name}`
      transferAcceptedRef.current[transferKey] = null
      
      console.log('[usePeerConnection] Waiting for recipient to accept transfer, transferKey:', transferKey)
      let waitAttempts = 0
      while (transferAcceptedRef.current[transferKey] === null && waitAttempts < 150) {
        await new Promise(resolve => setTimeout(resolve, 100))
        waitAttempts++
        if (waitAttempts % 10 === 0) {
          console.log('[usePeerConnection] Still waiting...', waitAttempts, 'attempts, current status:', transferAcceptedRef.current[transferKey])
        }
      }
      
      console.log('[usePeerConnection] Wait complete, acceptance status:', transferAcceptedRef.current[transferKey], 'attempts:', waitAttempts)
      
      if (transferAcceptedRef.current[transferKey] === false) {
        console.log('[usePeerConnection] Transfer was declined')
        setIsTransferring(false)
        setTransferProgress(null)
        delete transferAcceptedRef.current[transferKey]
        return
      }
      
      if (transferAcceptedRef.current[transferKey] !== true) {
        console.error('[usePeerConnection] Transfer acceptance timeout')
        setError('Transfer acceptance timeout. Recipient did not respond.')
        setIsTransferring(false)
        setTransferProgress(null)
        delete transferAcceptedRef.current[transferKey]
        return
      }
      
      console.log('[usePeerConnection] Transfer accepted, preparing file...')
      delete transferAcceptedRef.current[transferKey]

      const CHUNK_SIZE = 64 * 1024

      const fileSize = file.size
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

      const cryptoWorker = new Worker(new URL('../utils/cryptoWorker.js', import.meta.url), { type: 'module' })
      
      const keyPromise = new Promise((resolve) => {
        cryptoWorker.postMessage({ type: 'init-encrypt-key' })
        cryptoWorker.onmessage = (e) => {
          if (e.data.type === 'encrypt-key-ready') {
            resolve(e.data.keyData)
          }
        }
      })
      
      const keyData = await keyPromise
      const baseIV = crypto.getRandomValues(new Uint8Array(12))

      const getDataChannel = () => {
        if (conn.dataChannel && conn.dataChannel.readyState === 'open') {
          return conn.dataChannel
        }
        if (conn._dataChannel && conn._dataChannel.readyState === 'open') {
          return conn._dataChannel
        }
        if (conn._negotiator && conn._negotiator.connection && conn._negotiator.connection.dataChannel) {
          const dc = conn._negotiator.connection.dataChannel
          if (dc.readyState === 'open') {
            return dc
          }
        }
        return null
      }
      
      let dc = getDataChannel()
      if (!dc) {
        console.warn('[usePeerConnection] Data channel not immediately available, waiting...')
        let waitAttempts = 0
        while (!dc && waitAttempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          dc = getDataChannel()
          waitAttempts++
        }
      }
      
      if (!dc) {
        console.warn('[usePeerConnection] Data channel not available, using PeerJS send() method')
      } else {
        dc.binaryType = 'arraybuffer'
        console.log('[usePeerConnection] Using native WebRTC DataChannel for file transfer')
        console.log('[usePeerConnection] DataChannel state:', dc.readyState)
        console.log('[usePeerConnection] DataChannel ordered:', dc.ordered)
        console.log('[usePeerConnection] DataChannel reliable:', dc.reliable !== false)
      }

      const formatSpeed = (bytesPerSecond) => {
        if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
        if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
        return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
      }

      conn.send(encodeMessage({
        type: 'file-metadata',
        fileName: file.name,
        totalChunks: totalChunks,
        key: keyData,
        iv: Array.from(baseIV),
        mimeType: file.type,
        fileSize: fileSize
      }))

      const encryptChunkInWorker = (chunkData, chunkIndex) => {
        return new Promise((resolve, reject) => {
          const handler = (e) => {
            if (e.data.type === 'chunk-encrypted' && e.data.chunkIndex === chunkIndex) {
              cryptoWorker.removeEventListener('message', handler)
              resolve(new Uint8Array(e.data.encrypted))
            } else if (e.data.type === 'error') {
              cryptoWorker.removeEventListener('message', handler)
              reject(new Error(e.data.error))
            }
          }
          cryptoWorker.addEventListener('message', handler)
          cryptoWorker.postMessage({
            type: 'encrypt-chunk',
            data: {
              chunkData: chunkData,
              baseIV: Array.from(baseIV),
              chunkIndex: chunkIndex
            }
          }, [chunkData])
        })
      }

      const startTime = Date.now()
      let bytesSent = 0
      let chunksSent = 0
      let lastProgressUpdate = Date.now()
      let lastBytesSent = 0
      let lastSpeedUpdate = Date.now()
      let lastBufferedAmountLog = Date.now()

      console.log('[usePeerConnection] Sending file in', totalChunks, 'chunks of', CHUNK_SIZE, 'bytes (ordered, reliable)')

      const BUFFERED_AMOUNT_LOW_THRESHOLD = 2 * 1024 * 1024
      const MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024
      
      if (dc) {
        dc.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD
      }

      const waitForLowBuffer = () => {
        if (!dc) {
          return Promise.resolve()
        }
        if (dc.bufferedAmount <= dc.bufferedAmountLowThreshold) {
          return Promise.resolve()
        }
        return new Promise(resolve => {
          const onLow = () => {
            dc.removeEventListener('bufferedamountlow', onLow)
            resolve()
          }
          dc.addEventListener('bufferedamountlow', onLow)
        })
      }

      const updateProgress = () => {
        const now = Date.now()
        const progress = Math.round((chunksSent / totalChunks) * 100)
        
        let speed = 0
        const timeSinceLastUpdate = (now - lastSpeedUpdate) / 1000
        const totalElapsed = (now - startTime) / 1000
        
        if (timeSinceLastUpdate > 0.1 && lastBytesSent > 0) {
          const bytesSinceLastUpdate = bytesSent - lastBytesSent
          speed = bytesSinceLastUpdate / timeSinceLastUpdate
          lastBytesSent = bytesSent
          lastSpeedUpdate = now
        } else if (totalElapsed > 0.1 && bytesSent > 0) {
          speed = bytesSent / totalElapsed
          if (timeSinceLastUpdate > 0.1) {
            lastBytesSent = bytesSent
            lastSpeedUpdate = now
          }
        }
        
        const speedFormatted = formatSpeed(speed)
        
        if (dc && now - lastBufferedAmountLog > 1000) {
          console.log(`[usePeerConnection] bufferedAmount: ${(dc.bufferedAmount / 1024).toFixed(1)} KB, speed: ${speedFormatted}`)
          lastBufferedAmountLog = now
        }
        
        setTransferProgress({
          fileName: file.name,
          progress: progress,
          speed: speedFormatted,
          bytesSent: bytesSent,
          totalBytes: fileSize
        })
        lastProgressUpdate = now
      }

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (!conn.open) {
          throw new Error('Connection closed')
        }

        if (dc) {
          while (dc.bufferedAmount > MAX_BUFFERED_AMOUNT) {
            await waitForLowBuffer()
          }
        }

        const chunkStart = chunkIndex * CHUNK_SIZE
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, fileSize)
        const fileSlice = file.slice(chunkStart, chunkEnd)
        const chunkData = await fileSlice.arrayBuffer()

        const encryptedChunk = await encryptChunkInWorker(chunkData, chunkIndex)

        if (chunkIndex === 0) {
          console.log('[usePeerConnection] Sending first chunk, size:', encryptedChunk.length, 'bytes')
        }

        if (dc) {
          const header = new ArrayBuffer(5)
          const headerView = new DataView(header)
          headerView.setUint8(0, 1)
          headerView.setUint32(1, chunkIndex, true)
          
          const combined = new Uint8Array(header.byteLength + encryptedChunk.length)
          combined.set(new Uint8Array(header), 0)
          combined.set(encryptedChunk, header.byteLength)
          
          dc.send(combined.buffer)
        } else {
          const message = {
            type: 'file-chunk',
            chunkIndex: chunkIndex,
            chunk: Array.from(encryptedChunk)
          }
          const encoded = encodeMessage(message)
          conn.send(encoded)
        }

        chunksSent++
        bytesSent += chunkData.byteLength

        await waitForLowBuffer()

        const now = Date.now()
        if (now - lastProgressUpdate >= 100 || chunkIndex === totalChunks - 1 || chunksSent === 1) {
          updateProgress()
        }
      }
      
      updateProgress()

      cryptoWorker.terminate()

      const totalTime = (Date.now() - startTime) / 1000
      const avgSpeed = bytesSent / totalTime
      console.log(`[usePeerConnection] Transfer complete. Total: ${(bytesSent / 1024 / 1024).toFixed(2)} MB, Time: ${totalTime.toFixed(2)}s, Avg Speed: ${formatSpeed(avgSpeed)}`)
      setTransferProgress({
        fileName: file.name,
        progress: 100,
        speed: formatSpeed(avgSpeed),
        bytesSent: bytesSent,
        totalBytes: fileSize
      })

      setTimeout(() => {
        setIsTransferring(false)
        setTransferProgress(null)
        restartPolling()
      }, 500)

      console.log('[usePeerConnection] File sent successfully:', file.name)
      showNotification('Sent', {
        body: `${file.name} was sent successfully`,
        tag: 'transfer-sent'
      })
    } catch (err) {
      console.error('[usePeerConnection] Failed to send file:', err)
      setError('Failed to send file. Connection was interrupted.')
      setIsTransferring(false)
      setTransferProgress(null)
      restartPolling()
    }
  }
  
  const sendFileViaWebSocket = async (file, targetPeerId) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[usePeerConnection] WebSocket not connected')
      setError('WebSocket connection not available. Please try again.')
      return
    }

    try {
      setIsTransferring(true)
      setTransferProgress({
        fileName: file.name,
        progress: 0,
        bytesSent: 0,
        totalBytes: file.size
      })


      const transferKey = `${targetPeerId}_${file.name}`
      transferAcceptedRef.current[transferKey] = null
      
      console.log('[usePeerConnection] [WebSocket] Waiting for recipient to accept transfer, transferKey:', transferKey)
      let waitAttempts = 0
      while (transferAcceptedRef.current[transferKey] === null && waitAttempts < 150) {
        await new Promise(resolve => setTimeout(resolve, 200))
        waitAttempts++
        if (waitAttempts % 10 === 0) {
          console.log('[usePeerConnection] [WebSocket] Still waiting...', waitAttempts, 'attempts, current status:', transferAcceptedRef.current[transferKey])
        }
      }
      
      console.log('[usePeerConnection] [WebSocket] Wait complete, acceptance status:', transferAcceptedRef.current[transferKey], 'attempts:', waitAttempts)
      
      if (transferAcceptedRef.current[transferKey] === false) {
        console.log('[usePeerConnection] Transfer was declined')
        setIsTransferring(false)
        setTransferProgress(null)
        delete transferAcceptedRef.current[transferKey]
        return
      }
      
      if (transferAcceptedRef.current[transferKey] !== true) {
        console.error('[usePeerConnection] Transfer acceptance timeout')
        setError('Transfer acceptance timeout. Recipient did not respond.')
        setIsTransferring(false)
        setTransferProgress(null)
        delete transferAcceptedRef.current[transferKey]
        return
      }
      
      console.log('[usePeerConnection] Transfer accepted, preparing file...')
      delete transferAcceptedRef.current[transferKey]

      const CHUNK_SIZE = 2 * 1024 * 1024
      const WS_BUFFER_THRESHOLD = 16 * 1024 * 1024
      const WS_IN_FLIGHT = 10

      const fileSize = file.size
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

      const { key, keyData } = await generateEncryptionKey()
      const baseIV = crypto.getRandomValues(new Uint8Array(12))

      const formatSpeed = (bytesPerSecond) => {
        if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
        if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
        return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
      }

      wsRef.current.send(JSON.stringify({
        type: 'forward',
        targetPeerId: targetPeerId,
        forwardType: 'file-metadata',
        data: {
          fileName: file.name,
          totalChunks: totalChunks,
          key: Array.from(keyData),
          iv: Array.from(baseIV),
          mimeType: file.type,
          fileSize: fileSize
        }
      }))

      const waitForWSBuffer = () => {
        return new Promise(resolve => {
          if (wsRef.current.bufferedAmount <= WS_BUFFER_THRESHOLD) {
            resolve()
            return
          }
          const checkInterval = setInterval(() => {
            if (wsRef.current.bufferedAmount <= WS_BUFFER_THRESHOLD) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 10)
        })
      }

      const startTime = Date.now()
      let bytesSent = 0
      let chunksSent = 0
      let lastProgressUpdate = Date.now()
      let lastBytesSent = 0
      let lastSpeedUpdate = Date.now()

      console.log('[usePeerConnection] Sending file via WebSocket in', totalChunks, 'chunks of', CHUNK_SIZE, 'bytes')

      const targetPeerIdBytes = new TextEncoder().encode(targetPeerId)
      const headerSize = 1 + 2 + targetPeerIdBytes.length + 4
      let wsInFlight = 0

      const updateProgress = () => {
        const now = Date.now()
        const progress = Math.round((chunksSent / totalChunks) * 100)
        
        let speed = 0
        const timeSinceLastUpdate = (now - lastSpeedUpdate) / 1000
        const totalElapsed = (now - startTime) / 1000
        
        if (timeSinceLastUpdate > 0.1 && lastBytesSent > 0) {
          const bytesSinceLastUpdate = bytesSent - lastBytesSent
          speed = bytesSinceLastUpdate / timeSinceLastUpdate
          lastBytesSent = bytesSent
          lastSpeedUpdate = now
        } else if (totalElapsed > 0.1 && bytesSent > 0) {
          speed = bytesSent / totalElapsed
          if (timeSinceLastUpdate > 0.1) {
            lastBytesSent = bytesSent
            lastSpeedUpdate = now
          }
        }
        
        const speedFormatted = formatSpeed(speed)
        
        setTransferProgress({
          fileName: file.name,
          progress: progress,
          speed: speedFormatted,
          bytesSent: bytesSent,
          totalBytes: fileSize
        })
        lastProgressUpdate = now
      }

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (wsRef.current.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket closed')
        }

        if (wsInFlight >= WS_IN_FLIGHT) {
          await waitForWSBuffer()
          wsInFlight = Math.max(0, wsInFlight - WS_IN_FLIGHT + 1)
        } else if (wsRef.current.bufferedAmount > WS_BUFFER_THRESHOLD) {
          await waitForWSBuffer()
        }

        const chunkStart = chunkIndex * CHUNK_SIZE
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, fileSize)
        const fileSlice = file.slice(chunkStart, chunkEnd)
        const chunkData = await fileSlice.arrayBuffer()

        const chunkIV = deriveChunkIV(baseIV, chunkIndex)
        const encryptedChunk = await encryptChunk(chunkData, key, chunkIV)

        const header = new ArrayBuffer(headerSize)
        const headerView = new DataView(header)
        headerView.setUint8(0, 2)
        headerView.setUint16(1, targetPeerIdBytes.length, true)
        const headerArray = new Uint8Array(header)
        headerArray.set(targetPeerIdBytes, 3)
        const chunkIndexOffset = 3 + targetPeerIdBytes.length
        headerView.setUint32(chunkIndexOffset, chunkIndex, true)
        
        const combined = new Uint8Array(headerSize + encryptedChunk.length)
        combined.set(headerArray, 0)
        combined.set(encryptedChunk, headerSize)
        
        wsRef.current.send(combined.buffer)

        wsInFlight++
        chunksSent++
        bytesSent += chunkData.byteLength

        const now = Date.now()
        if (now - lastProgressUpdate >= 100 || chunkIndex === totalChunks - 1 || chunksSent === 1) {
          updateProgress()
        }
      }
      
      updateProgress()

      const totalTime = (Date.now() - startTime) / 1000
      const avgSpeed = bytesSent / totalTime
      setTransferProgress({
        fileName: file.name,
        progress: 100,
        speed: formatSpeed(avgSpeed),
        bytesSent: bytesSent,
        totalBytes: fileSize
      })

      setTimeout(() => {
        setIsTransferring(false)
        setTransferProgress(null)
        restartPolling()
      }, 1000)

      console.log('[usePeerConnection] File sent successfully via WebSocket:', file.name)
    } catch (err) {
      console.error('[usePeerConnection] Failed to send file via WebSocket:', err)
      setError('Failed to send file via WebSocket. Connection was interrupted.')
      setIsTransferring(false)
      setTransferProgress(null)
      restartPolling()
    }
  }

  const acceptTransfer = () => {
    if (!pendingTransferRef.current) {
      console.error('[usePeerConnection] No pending transfer to accept')
      return
    }
    
    const { transferKey, connectionId, fileName } = pendingTransferRef.current
    const conn = connectionsRef.current[connectionId]
    
    console.log('[usePeerConnection] Accepting transfer, connectionId:', connectionId, 'fileName:', fileName)
    
    if (conn && conn.open) {
      transferStateRef.current[transferKey] = 'accepted'
      conn.send(encodeMessage({
        type: 'transfer-accepted',
        fileName: fileName
      }))
      console.log('[usePeerConnection] Transfer accepted, sent response via PeerJS')
    } else if (isLocalhostRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      transferStateRef.current[transferKey] = 'accepted'
      wsRef.current.send(JSON.stringify({
        type: 'forward',
        targetPeerId: connectionId,
        forwardType: 'transfer-accepted',
        data: { fileName: fileName }
      }))
      console.log('[usePeerConnection] Transfer accepted via WebSocket')
    }
    
    setIncomingTransfer(null)
  }

  const declineTransfer = () => {
    if (!pendingTransferRef.current) {
      console.error('[usePeerConnection] No pending transfer to decline')
      return
    }
    
    const { transferKey, connectionId, fileName } = pendingTransferRef.current
    const conn = connectionsRef.current[connectionId]
    
    if (conn && conn.open) {
      conn.send(encodeMessage({
        type: 'transfer-declined',
        fileName: fileName
      }))
    } else if (isLocalhostRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'forward',
        targetPeerId: connectionId,
        forwardType: 'transfer-declined',
        data: { fileName: fileName }
      }))
    }
    
    delete transferStateRef.current[transferKey]
    delete fileChunksRef.current[transferKey]
    delete fileMetadataRef.current[transferKey]
    setIncomingTransfer(null)
    pendingTransferRef.current = null
    console.log('[usePeerConnection] Transfer declined')
  }

  const downloadFile = (blob, fileName) => {
    try {
      const url = URL.createObjectURL(blob)
      if (typeof window.navigator?.msSaveOrOpenBlob === 'function') {
        window.navigator.msSaveOrOpenBlob(blob, fileName)
        URL.revokeObjectURL(url)
        return
      }
      const a = document.createElement('a')
      const canUseDownload = typeof a.download !== 'undefined'
      a.href = url
      a.download = fileName
      a.style.display = 'none'
      document.body.appendChild(a)
      if (canUseDownload) {
        a.click()
      } else {
        window.open(url, '_blank')
      }
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 500)
    } catch (err) {
      console.error('[usePeerConnection] Download failed, trying alternative method:', err)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  const getDeviceName = () => {
    const stored = localStorage.getItem('deviceName')
    if (stored) return stored
    
    const adjectives = ['Swift', 'Bright', 'Cool', 'Fast', 'Smart', 'Quick', 'Bold', 'Sharp', 'Neat', 'Prime', 'Elite', 'Pro', 'Max', 'Ultra', 'Super', 'Mega', 'Turbo', 'Nitro', 'Flash', 'Zoom']
    const nouns = ['Device', 'Phone', 'Tablet', 'Laptop', 'Desktop', 'Computer', 'Machine', 'Station', 'Hub', 'Node', 'Terminal', 'Unit', 'System', 'Box', 'Core', 'Base', 'Pad', 'Board', 'Panel', 'Screen']
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    
    const name = `${randomAdjective} ${randomNoun} ${randomNum}`
    localStorage.setItem('deviceName', name)
    return name
  }

  const getDeviceType = () => {
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/.test(ua)) return 'mobile'
    if (/Android/.test(ua)) return 'mobile'
    return 'desktop'
  }

  const clearError = () => {
    setError(null)
  }

  const addToHistory = (item) => {
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...item,
      timestamp: Date.now()
    }
    const newHistory = [newItem, ...transferHistoryRef.current].slice(0, 100)
    transferHistoryRef.current = newHistory
    setTransferHistory(newHistory)
    try {
      localStorage.setItem('transferHistory', JSON.stringify(newHistory))
    } catch (err) {
      console.error('[usePeerConnection] Failed to save transfer history:', err)
    }
  }

  const updateConnectionQuality = (peerId, quality) => {
    connectionQualityRef.current[peerId] = quality
    setConnectionQuality({ ...connectionQualityRef.current })
  }

  const sendText = async (text, targetPeerId) => {
    
    let conn = connectionsRef.current[targetPeerId]
    
    if (!conn || !conn.open) {
      await connectToPeer(targetPeerId)
      let attempts = 0
      while (attempts < 30 && (!connectionsRef.current[targetPeerId] || !connectionsRef.current[targetPeerId].open)) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      conn = connectionsRef.current[targetPeerId]
    }
    
    if (!conn || !conn.open) {
      setError('Failed to connect to device.')
      return
    }

    try {
      const targetDevice = devices.find(d => d.id === targetPeerId)
      conn.send(encodeMessage({
        type: 'text-message',
        text: text,
        senderName: getDeviceName()
      }))
      
      addToHistory({
        type: 'sent',
        fileName: text,
        deviceName: targetDevice?.name || 'Unknown Device',
        status: 'completed',
        isText: true
      })

      showNotification('Text Sent', {
        body: `Text sent to ${targetDevice?.name || 'device'}`,
        tag: 'text-sent'
      })
      restartPolling()
    } catch (err) {
      console.error('[usePeerConnection] Failed to send text:', err)
      setError('Failed to send text.')
      restartPolling()
    }
  }

  const sendFiles = async (files, targetPeerId) => {
    if (!Array.isArray(files)) {
      files = [files]
    }

    const targetDevice = devices.find(d => d.id === targetPeerId)
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        await sendFile(file, targetPeerId)
        
        addToHistory({
          type: 'sent',
          fileName: file.name,
          fileSize: file.size,
          deviceName: targetDevice?.name || 'Unknown Device',
          status: 'completed',
          isText: false
        })
      } catch (err) {
        console.error('[usePeerConnection] Failed to send file:', file.name, err)
        addToHistory({
          type: 'sent',
          fileName: file.name,
          fileSize: file.size,
          deviceName: targetDevice?.name || 'Unknown Device',
          status: 'failed',
          isText: false
        })
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      Object.keys(connectionsRef.current).forEach(peerId => {
        const conn = connectionsRef.current[peerId]
        if (conn && conn.open && conn.dataChannel) {
          const stats = conn.dataChannel
          let quality = 0.5
          
          if (stats.readyState === 'open') {
            quality = 0.8
            if (stats.bufferedAmount < 100000) {
              quality = 0.9
            }
          }
          
          updateConnectionQuality(peerId, quality)
        }
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return {
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
    deviceName: getDeviceName(),
    updateDeviceName,
    refreshDevices,
    error,
    clearError,
    transferHistory,
    connectionQuality,
    receivedTextMessage,
    clearReceivedTextMessage: () => setReceivedTextMessage(null)
  }
}

