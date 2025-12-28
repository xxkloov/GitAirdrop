export class WebRTCConnection {
  constructor(peerId, targetPeerId, isInitiator, onDataChannel, onConnectionStateChange) {
    this.peerId = peerId
    this.targetPeerId = targetPeerId
    this.isInitiator = isInitiator
    this.onDataChannel = onDataChannel
    this.onConnectionStateChange = onConnectionStateChange
    this.pc = null
    this.dataChannel = null
    this.iceCandidates = []
    this.connectionType = null
    this.usingTURN = false
    this.usingRelay = false
    
    this.createPeerConnection()
  }

  createPeerConnection() {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]

    const config = {
      iceServers: iceServers,
      iceCandidatePoolSize: 10
    }

    this.pc = new RTCPeerConnection(config)

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate
        const candidateString = candidate.candidate
        
        let candidateType = 'unknown'
        if (candidateString.includes('typ host')) {
          candidateType = 'host'
        } else if (candidateString.includes('typ srflx')) {
          candidateType = 'srflx'
        } else if (candidateString.includes('typ relay')) {
          candidateType = 'relay'
          this.usingRelay = true
          this.usingTURN = true
          console.warn('[WebRTCConnection] TURN/RELAY candidate detected! Connection will be relayed through server.')
        } else if (candidateString.includes('typ prflx')) {
          candidateType = 'prflx'
        }

        this.iceCandidates.push({
          type: candidateType,
          candidate: candidateString,
          timestamp: Date.now()
        })

        console.log(`[WebRTCConnection] ICE candidate (${candidateType}):`, candidateString.substring(0, 100))
      } else {
        console.log('[WebRTCConnection] ICE gathering complete. Total candidates:', this.iceCandidates.length)
        const types = this.iceCandidates.map(c => c.type)
        const hasHost = types.includes('host')
        const hasSrflx = types.includes('srflx')
        const hasRelay = types.includes('relay')
        
        if (hasRelay) {
          this.connectionType = 'relay'
          console.error('[WebRTCConnection] WARNING: Connection is using TURN/RELAY. This will be slow and relay through server!')
        } else if (hasHost) {
          this.connectionType = 'host'
          console.log('[WebRTCConnection] Direct LAN connection (host) established')
        } else if (hasSrflx) {
          this.connectionType = 'srflx'
          console.log('[WebRTCConnection] NAT traversal connection (srflx) established')
        } else {
          this.connectionType = 'unknown'
          console.warn('[WebRTCConnection] Unknown connection type')
        }
      }
    }

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState
      console.log('[WebRTCConnection] ICE connection state:', state)
      
      if (state === 'connected' || state === 'completed') {
        if (this.usingRelay) {
          console.error('[WebRTCConnection] CONNECTION ESTABLISHED BUT USING TURN/RELAY - TRANSFER WILL BE SLOW!')
        } else {
          console.log('[WebRTCConnection] Direct connection established - optimal for file transfer')
        }
      }
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state)
      }
    }

    this.pc.onconnectionstatechange = () => {
      console.log('[WebRTCConnection] Connection state:', this.pc.connectionState)
    }

    if (this.isInitiator) {
      this.dataChannel = this.pc.createDataChannel('filetransfer', {
        ordered: true,
        maxRetransmits: 0
      })
      this.setupDataChannel(this.dataChannel)
    } else {
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel
        this.setupDataChannel(this.dataChannel)
      }
    }
  }

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer'
    
    channel.onopen = () => {
      console.log('[WebRTCConnection] Data channel opened')
      if (this.onDataChannel) {
        this.onDataChannel(channel)
      }
    }

    channel.onclose = () => {
      console.log('[WebRTCConnection] Data channel closed')
    }

    channel.onerror = (error) => {
      console.error('[WebRTCConnection] Data channel error:', error)
    }

    channel.onmessage = (event) => {
      if (this.onDataChannel && this.onDataChannel.handleMessage) {
        this.onDataChannel.handleMessage(event)
      }
    }
  }

  async createOffer() {
    if (!this.isInitiator) {
      throw new Error('Only initiator can create offer')
    }
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer
  }

  async createAnswer() {
    if (this.isInitiator) {
      throw new Error('Only answerer can create answer')
    }
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }

  async setRemoteDescription(description) {
    await this.pc.setRemoteDescription(description)
  }

  async addIceCandidate(candidate) {
    await this.pc.addIceCandidate(candidate)
  }

  getDataChannel() {
    return this.dataChannel
  }

  getConnectionInfo() {
    return {
      connectionType: this.connectionType,
      usingTURN: this.usingTURN,
      usingRelay: this.usingRelay,
      iceCandidates: this.iceCandidates,
      iceConnectionState: this.pc?.iceConnectionState,
      connectionState: this.pc?.connectionState
    }
  }

  close() {
    if (this.dataChannel) {
      this.dataChannel.close()
    }
    if (this.pc) {
      this.pc.close()
    }
  }
}

