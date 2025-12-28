export class PacedSender {
  constructor(dataChannel, onProgress) {
    this.dataChannel = dataChannel
    this.onProgress = onProgress
    this.CHUNK_SIZE = 128 * 1024
    this.BUFFERED_AMOUNT_LOW_THRESHOLD = 2 * 1024 * 1024
    this.MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024
    this.isSending = false
    this.canceled = false
    
    if (dataChannel) {
      dataChannel.bufferedAmountLowThreshold = this.BUFFERED_AMOUNT_LOW_THRESHOLD
    }
  }

  async waitForLowBuffer() {
    if (!this.dataChannel) return
    
    if (this.dataChannel.bufferedAmount <= this.dataChannel.bufferedAmountLowThreshold) {
      return
    }
    
    return new Promise((resolve) => {
      const onLow = () => {
        this.dataChannel.removeEventListener('bufferedamountlow', onLow)
        resolve()
      }
      this.dataChannel.addEventListener('bufferedamountlow', onLow)
    })
  }

  async sendChunks(file, totalChunks, encryptChunkFn) {
    if (this.isSending) {
      throw new Error('Already sending')
    }
    
    this.isSending = true
    this.canceled = false
    
    const startTime = Date.now()
    let bytesSent = 0
    let chunksSent = 0
    let lastProgressUpdate = Date.now()
    let lastBytesSent = 0
    let lastSpeedUpdate = Date.now()
    let lastBufferedAmountLog = Date.now()
    
    const formatSpeed = (bytesPerSecond) => {
      if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s'
      if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s'
      return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
    }
    
    const updateProgress = () => {
      const now = Date.now()
      const progress = Math.round((chunksSent / totalChunks) * 100)
      
      let speed = 0
      const timeSinceLastUpdate = (now - lastSpeedUpdate) / 1000
      if (timeSinceLastUpdate > 0.1) {
        const bytesSinceLastUpdate = bytesSent - lastBytesSent
        speed = bytesSinceLastUpdate / timeSinceLastUpdate
        lastBytesSent = bytesSent
        lastSpeedUpdate = now
      } else {
        const totalElapsed = (now - startTime) / 1000
        speed = totalElapsed > 0 ? bytesSent / totalElapsed : 0
      }
      
      const speedFormatted = formatSpeed(speed)
      
      if (this.dataChannel && now - lastBufferedAmountLog > 1000) {
        console.log(`[PacedSender] bufferedAmount: ${(this.dataChannel.bufferedAmount / 1024).toFixed(1)} KB, speed: ${speedFormatted}`)
        lastBufferedAmountLog = now
      }
      
      if (this.onProgress) {
        this.onProgress({
          progress,
          speed: speedFormatted,
          bytesSent,
          chunksSent,
          totalChunks
        })
      }
    }
    
    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (this.canceled) {
          throw new Error('Send canceled')
        }
        
        if (this.dataChannel) {
          while (this.dataChannel.bufferedAmount > this.MAX_BUFFERED_AMOUNT) {
            await this.waitForLowBuffer()
          }
        }
        
        const chunkStart = chunkIndex * this.CHUNK_SIZE
        const chunkEnd = Math.min(chunkStart + this.CHUNK_SIZE, file.size)
        const fileSlice = file.slice(chunkStart, chunkEnd)
        const chunkData = await fileSlice.arrayBuffer()
        
        const encryptedChunk = await encryptChunkFn(chunkData, chunkIndex)
        
        const message = {
          type: 'file-chunk',
          chunkIndex: chunkIndex,
          chunk: Array.from(encryptedChunk)
        }
        
        const encoded = new TextEncoder().encode(JSON.stringify(message))
        this.dataChannel.send(encoded)
        
        chunksSent++
        bytesSent += chunkData.byteLength
        
        if (this.dataChannel) {
          await this.waitForLowBuffer()
        }
        
        const now = Date.now()
        if (now - lastProgressUpdate >= 100 || chunkIndex === totalChunks - 1 || chunksSent === 1) {
          updateProgress()
          lastProgressUpdate = now
        }
      }
      
      updateProgress()
      
      const totalTime = (Date.now() - startTime) / 1000
      const avgSpeed = bytesSent / totalTime
      console.log(`[PacedSender] Transfer complete. Total: ${(bytesSent / 1024 / 1024).toFixed(2)} MB, Time: ${totalTime.toFixed(2)}s, Avg Speed: ${formatSpeed(avgSpeed)}`)
      
      return {
        bytesSent,
        chunksSent,
        totalTime,
        avgSpeed
      }
    } finally {
      this.isSending = false
    }
  }
  
  cancel() {
    this.canceled = true
  }
}

