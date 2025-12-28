# AirDrop Web MVP

A browser-based platform for seamless file sharing between devices on the same WiFi network, inspired by Apple's AirDrop design philosophy.

## Features

- **Device Discovery**: Automatically detect nearby devices on your network
- **Drag & Drop**: Intuitive file sharing with drag-and-drop support
- **Peer-to-Peer**: Direct file transfers via WebRTC
- **End-to-End Encryption**: Secure transfers using Web Crypto API
- **Apple-Inspired UI**: Minimalist design with dark mode support
- **Cross-Platform**: Works on iOS, macOS, and other modern browsers

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Animations**: Framer Motion
- **P2P**: PeerJS (WebRTC)
- **Backend**: Express (minimal signaling server)
- **Security**: Web Crypto API (AES-GCM)

## Getting Started

### Installation

```bash
npm install
cd server && npm install && cd ..
```

### Development

Run the frontend and backend simultaneously:

```bash
npm run dev
```

In a separate terminal, start the signaling server:

```bash
npm run server
```

Open http://localhost:3000 in your browser.

### Production Build

```bash
npm run build
```

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

The app includes a `vercel.json` configuration for seamless deployment.

## Usage

1. Open the app on two or more devices connected to the same WiFi network
2. Enter a device name when prompted
3. Wait for nearby devices to appear in the "Nearby Devices" section
4. Drag and drop a file (max 1GB) or click to browse
5. Select the target device
6. Click "Send File"
7. The recipient will see a modal to accept or decline the transfer

## Security

All file transfers are encrypted end-to-end using AES-256-GCM encryption. Files are transferred directly between peers without touching any servers.

## Browser Compatibility

- Safari 14+ (iOS & macOS)
- Chrome 90+
- Firefox 88+
- Edge 90+

## License

MIT

