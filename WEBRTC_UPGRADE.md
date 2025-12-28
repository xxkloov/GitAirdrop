# WebRTC File Transfer Upgrade

## Summary

This upgrade transforms the file transfer app from a slow (~300 KB/s) relay-based system to a high-speed direct LAN transfer system capable of 5-10 MB/s on the same Wi-Fi network.

## Why Previous Setup Was Slow (~300 KB/s)

### Root Causes:

1. **TURN/Relay Usage**: The app was likely using TURN servers (relay candidates) instead of direct peer-to-peer connections. TURN servers relay all data through a remote server, causing:
   - High latency
   - Bandwidth bottlenecks at the relay server
   - Additional network hops

2. **No Buffering Control**: The previous implementation didn't properly monitor `dataChannel.bufferedAmount`, leading to:
   - Buffer flooding
   - Backpressure issues
   - Browser throttling

3. **Main Thread Crypto**: Encryption/decryption ran on the main thread, blocking the UI and slowing down the transfer pipeline.

4. **WebSocket Fallback**: The app could silently fall back to WebSocket, which routes through the server instead of direct peer-to-peer.

5. **No Connection Type Verification**: No logging or warnings when connections used TURN/relay instead of direct connections.

## What Changed

### 1. Native WebRTC DataChannel Usage
- **File**: `src/hooks/usePeerConnection.js`
- Directly uses the native `RTCPeerConnection` data channel from PeerJS connections
- Ensures we're using WebRTC DataChannel, not WebSocket fallback
- Added explicit data channel state logging

### 2. ICE Candidate Logging & TURN Detection
- **File**: `src/hooks/usePeerConnection.js` (setupConnection function)
- Logs all ICE candidate types (host, srflx, relay, prflx)
- **Warns immediately** when TURN/relay candidates are detected
- Verifies connection type after establishment using `getStats()`
- Fails fast if connection can't be established directly

### 3. Paced Sending with BufferedAmount Monitoring
- **File**: `src/hooks/usePeerConnection.js` (sendFile function)
- **Chunk Size**: 128 KB (within 64-256 KB requirement)
- **BufferedAmount Low Threshold**: 2 MB
- **Max BufferedAmount**: 4 MB (reduced from 8 MB for better pacing)
- Pauses sending when `bufferedAmount > MAX_BUFFERED_AMOUNT`
- Waits for `bufferedamountlow` event before continuing
- Logs bufferedAmount every second during transfer

### 4. Crypto Worker Implementation
- **File**: `src/utils/cryptoWorker.js`
- Moved all encryption/decryption to Web Worker
- Per-chunk encryption (not entire file)
- Unique IV per chunk (derived from base IV + chunk index)
- AES-GCM encryption as required

### 5. Disabled WebSocket File Transfer Fallback
- **File**: `src/hooks/usePeerConnection.js` (sendFile function)
- WebSocket fallback for file transfer is now **disabled**
- App will fail fast if WebRTC connection cannot be established
- Prevents silent degradation to slow server-relayed transfers

### 6. Enhanced Debugging
- ICE candidate type logging
- `bufferedAmount` monitoring with periodic logs
- Actual send/receive rate calculation (bytes/sec)
- Connection type warnings (TURN/relay vs direct)
- Data channel state logging

## Technical Details

### Chunk Size: 128 KB
- Within the 64-256 KB requirement
- Balances throughput vs memory usage
- Allows proper buffering control

### Buffering Strategy
```javascript
BUFFERED_AMOUNT_LOW_THRESHOLD = 2 MB  // Resume sending when buffer drops below this
MAX_BUFFERED_AMOUNT = 4 MB            // Pause sending when buffer exceeds this
```

**Why this works:**
- Prevents buffer flooding that causes browser throttling
- Maintains steady flow without overwhelming the connection
- Allows the receiver to process chunks while sender waits

### Ordered vs Unordered
- Currently using **ordered** data channel (`ordered: true`)
- Ensures chunks arrive in order, simplifying reassembly
- **Note**: Unordered could potentially improve throughput on very fast networks by allowing parallel processing, but requires:
  - Chunk sequence tracking
  - Reassembly buffer
  - More complex error handling
- For LAN transfers, ordered is sufficient and simpler

### Encryption Per Chunk
- Each chunk encrypted independently with unique IV
- IV derived: `baseIV[8-11] = chunkIndex` (little-endian)
- Allows parallel decryption on receiver side
- Worker-based crypto prevents main thread blocking

## Expected Performance

### On Same Wi-Fi LAN:
- **Expected Speed**: 5-10 MB/s (40-80 Mbps)
- **Connection Type**: Direct (host candidates)
- **Zero Server Relay**: All data stays on local network

### If TURN/Relay Detected:
- **Warning**: Console error immediately
- **Speed**: Will be limited (~300 KB/s typical)
- **Action**: Check network configuration, firewall, NAT settings

## Verification

To verify the upgrade is working:

1. **Check Console Logs**:
   - Look for "Direct LAN connection established (host)"
   - Should NOT see "TURN/RELAY candidate detected"
   - Should see periodic `bufferedAmount` logs during transfer

2. **Transfer Speed**:
   - Should see speeds in MB/s range (not KB/s)
   - Check the speed display in the UI

3. **Connection Info**:
   - Console will show ICE candidate types
   - Final connection type will be logged after establishment

## Files Modified

1. `src/hooks/usePeerConnection.js` - Main transfer logic
2. `src/utils/cryptoWorker.js` - Worker-based encryption
3. `src/utils/pacedSender.js` - NEW: Paced sending utility (not used yet, available for future)
4. `src/utils/webrtcConnection.js` - NEW: Native WebRTC wrapper (not used yet, available for future)

## Future Improvements

The following utilities were created but not fully integrated (PeerJS is still used for signaling):
- `webrtcConnection.js` - Could replace PeerJS entirely with native RTCPeerConnection
- `pacedSender.js` - Standalone paced sender class (currently logic is inline)

These can be integrated in a future upgrade for even more control.

