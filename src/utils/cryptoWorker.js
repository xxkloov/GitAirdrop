self.onmessage = async function(e) {
  const { type, data } = e.data

  try {
    if (type === 'init-key') {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      )
      const exportedKey = await crypto.subtle.exportKey('raw', key)
      self.postMessage({
        type: 'key-ready',
        keyData: Array.from(new Uint8Array(exportedKey)),
        key: key
      }, [key])
    } else if (type === 'encrypt-chunk') {
      const { chunkData, key, baseIV, chunkIndex } = data
      const iv = new Uint8Array(baseIV)
      const view = new DataView(iv.buffer)
      view.setUint32(8, chunkIndex, true)
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        chunkData
      )
      
      self.postMessage({
        type: 'chunk-encrypted',
        chunkIndex,
        encrypted: new Uint8Array(encrypted)
      }, [new Uint8Array(encrypted).buffer])
    } else if (type === 'decrypt-chunk') {
      const { encryptedChunk, key, baseIV, chunkIndex } = data
      const iv = new Uint8Array(baseIV)
      const view = new DataView(iv.buffer)
      view.setUint32(8, chunkIndex, true)
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedChunk
      )
      
      self.postMessage({
        type: 'chunk-decrypted',
        chunkIndex,
        decrypted: new Uint8Array(decrypted)
      }, [new Uint8Array(decrypted).buffer])
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    })
  }
}

