import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { join } from 'path'

const sizes = [192, 512]

sizes.forEach(size => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#007AFF')
  gradient.addColorStop(1, '#0051D5')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.3}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AD', size / 2, size / 2)
  
  const buffer = canvas.toBuffer('image/png')
  const filePath = join('public', `icon-${size}.png`)
  writeFileSync(filePath, buffer)
  console.log(`[generate-icons] Created ${filePath}`)
})

