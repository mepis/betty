import { WebSocket } from 'ws';

export function setupHeartbeat(ws: WebSocket, intervalMs = 30000): ReturnType<typeof setInterval> {
  ws.on('pong', () => {
    // isAlive is managed by the handler
  });

  const heartbeatInterval = setInterval(() => {
    // Check isAlive flag set by handler
    const extWs = ws as any;
    if (!extWs.isAlive) {
      ws.terminate();
      return;
    }
    extWs.isAlive = false;
    ws.ping();
  }, intervalMs);

  return heartbeatInterval;
}
