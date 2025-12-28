import express from 'express'
import cors from 'cors'
import { ExpressPeerServer } from 'peer'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'

console.log('[server] LOADED')

const app = express()
const server = createServer(app)

app.use(cors())
app.use(express.json())

const devices = new Map()
const lastRegistrationTime = new Map()

app.post('/api/register', (req, res) => {
  const { id, name, type } = req.body
  const now = Date.now()
  
  if (!id) {
    res.status(400).json({ success: false, error: 'Missing device ID' })
    return
  }
  
  const lastReg = lastRegistrationTime.get(id)
  if (lastReg && now - lastReg < 1000) {
    res.json({ success: true })
    return
  }
  
  if (name) {
    for (const [existingId, existingDevice] of devices.entries()) {
      if (existingId !== id && existingDevice.name === name) {
        if (existingDevice.lastSeen < now - 5000) {
          devices.delete(existingId)
          console.log('[server] Removed duplicate device:', existingId, 'for name:', name)
        }
      }
    }
  }
  
  const existingDevice = devices.get(id)
  if (existingDevice) {
    existingDevice.name = name || existingDevice.name || 'Unknown Device'
    existingDevice.type = type || existingDevice.type || 'desktop'
    existingDevice.lastSeen = now
  } else {
    devices.set(id, { 
      id, 
      name: name || 'Unknown Device', 
      type: type || 'desktop', 
      lastSeen: now 
    })
  }
  
  lastRegistrationTime.set(id, now)
  res.json({ success: true })
})

app.post('/api/unregister', (req, res) => {
  const { id } = req.body
  
  if (!id) {
    res.status(400).json({ success: false, error: 'Missing device ID' })
    return
  }
  
  if (devices.has(id)) {
    devices.delete(id)
    lastRegistrationTime.delete(id)
    console.log('[server] Device unregistered:', id)
  }
  
  res.json({ success: true })
})

app.get('/api/devices', (req, res) => {
  const excludeId = req.query.exclude
  const now = Date.now()
  const expiredIds = []
  
  for (const [id, device] of devices.entries()) {
    if (now - device.lastSeen > 60000) {
      expiredIds.push(id)
    }
  }
  
  expiredIds.forEach(id => {
    devices.delete(id)
    console.log('[server] Device expired:', id)
  })
  
  const activeDevices = []
  for (const [id, device] of devices.entries()) {
    if (id && id !== excludeId) {
      activeDevices.push(device)
    }
  }
  
  res.json(activeDevices)
})

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
})

app.use('/peerjs', peerServer)

peerServer.on('connection', (client) => {
  console.log('[server] Peer connected:', client.id)
})

peerServer.on('disconnect', (client) => {
  console.log('[server] Peer disconnected:', client.id)
  devices.delete(client.id)
})

const wss = new WebSocketServer({ server, path: '/ws' })

const wsConnections = new Map()

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const peerId = url.searchParams.get('peerId')
  
  if (!peerId) {
    ws.close(1008, 'Missing peerId')
    return
  }
  
  console.log('[server] WebSocket connected:', peerId)
  wsConnections.set(peerId, ws)
  
  ws.on('message', (data, isBinary) => {
    try {
      if (isBinary) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
        const messageType = buffer.readUInt8(0)
        const targetPeerIdLength = buffer.readUInt16LE(1)
        let offset = 3
        const targetPeerId = buffer.toString('utf8', offset, offset + targetPeerIdLength)
        offset += targetPeerIdLength
        
        const targetWs = wsConnections.get(targetPeerId)
        if (targetWs && targetWs.readyState === 1) {
          const peerIdBuffer = Buffer.from(peerId, 'utf8')
          const header = Buffer.allocUnsafe(1 + 2 + peerIdBuffer.length)
          header.writeUInt8(messageType, 0)
          header.writeUInt16LE(peerIdBuffer.length, 1)
          peerIdBuffer.copy(header, 3)
          
          const payload = buffer.slice(offset)
          const combined = Buffer.concat([header, payload])
          
          targetWs.send(combined)
        }
      } else {
        const message = JSON.parse(data.toString())
        
        if (message.type === 'forward' && message.targetPeerId) {
          const targetWs = wsConnections.get(message.targetPeerId)
          if (targetWs && targetWs.readyState === 1) {
            targetWs.send(JSON.stringify({
              type: message.forwardType,
              data: message.data,
              senderPeerId: peerId
            }))
          }
        }
      }
    } catch (err) {
      console.error('[server] WebSocket message error:', err)
    }
  })
  
  ws.on('close', () => {
    console.log('[server] WebSocket disconnected:', peerId)
    wsConnections.delete(peerId)
    if (devices.has(peerId)) {
      devices.delete(peerId)
      lastRegistrationTime.delete(peerId)
      console.log('[server] Device removed on WebSocket close:', peerId)
    }
  })
  
  ws.on('error', (err) => {
    console.error('[server] WebSocket error:', err)
    wsConnections.delete(peerId)
  })
})

const PORT = process.env.PORT || 9000

server.listen(PORT, () => {
  console.log('[server] Server running on port', PORT)
  console.log('[server] WebSocket server ready on /ws')
})

