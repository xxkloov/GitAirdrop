export async function generateEncryptionKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const exportedKey = await crypto.subtle.exportKey('raw', key)
  return {
    key,
    keyData: new Uint8Array(exportedKey)
  }
}

export function deriveChunkIV(baseIV, chunkIndex) {
  const iv = new Uint8Array(baseIV)
  const view = new DataView(iv.buffer)
  view.setUint32(8, chunkIndex, true)
  return iv
}

export async function encryptChunk(chunkData, key, iv) {
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    chunkData
  )
  return new Uint8Array(encrypted)
}

export async function decryptChunk(encryptedChunk, key, iv) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedChunk
  )
  return new Uint8Array(decrypted)
}

export async function encryptFile(arrayBuffer) {
  const { key, keyData } = await generateEncryptionKey()
  const baseIV = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: baseIV },
    key,
    arrayBuffer
  )

  return {
    encrypted: new Uint8Array(encrypted),
    key: Array.from(keyData),
    iv: Array.from(baseIV)
  }
}

export async function decryptFile(encryptedArray, keyArray, ivArray) {
  const encrypted = new Uint8Array(encryptedArray)
  const keyData = new Uint8Array(keyArray)
  const iv = new Uint8Array(ivArray)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )

  return decrypted
}

