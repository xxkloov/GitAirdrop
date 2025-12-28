let encryptionKey = null
let decryptionKey = null

self.onmessage = async function(e) {
  const { type, data } = e.data

  try {
    if (type === 'init-encrypt-key') {
      encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt']
      )
      const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey)
      self.postMessage({
        type: 'encrypt-key-ready',
        keyData: Array.from(new Uint8Array(exportedKey))
      })
    } else if (type === 'init-decrypt-key') {
      const keyData = new Uint8Array(data.keyData)
      decryptionKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      )
      self.postMessage({
        type: 'decrypt-key-ready'
      })
    } else if (type === 'encrypt-chunk') {
      if (!encryptionKey) {
        throw new Error('Encryption key not initialized')
      }
      const { chunkData, baseIV, chunkIndex } = data
      const iv = new Uint8Array(baseIV)
      const view = new DataView(iv.buffer)
      view.setUint32(8, chunkIndex, true)
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        chunkData
      )
      
      self.postMessage({
        type: 'chunk-encrypted',
        chunkIndex,
        encrypted: new Uint8Array(encrypted)
      }, [new Uint8Array(encrypted).buffer])
    } else if (type === 'decrypt-chunk') {
      if (!decryptionKey) {
        throw new Error('Decryption key not initialized')
      }
      const { encryptedChunk, baseIV, chunkIndex } = data
      const iv = new Uint8Array(baseIV)
      const view = new DataView(iv.buffer)
      view.setUint32(8, chunkIndex, true)
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        decryptionKey,
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

