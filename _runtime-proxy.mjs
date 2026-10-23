import http from 'node:http';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function createRuntimeProxyServer({ targetPort }) {
  if (!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535) throw new Error('A valid upstream runtime port is required');
  const server = http.createServer((request, response) => {
    // The UI and native API share this forwarding boundary.
    let incoming;
    const upstream = http.request({ hostname: '127.0.0.1', port: targetPort, path: request.url, method: request.method, headers: { ...request.headers, host: `127.0.0.1:${targetPort}` } }, upstreamResponse => {
      incoming = upstreamResponse;
      if (response.destroyed) { upstreamResponse.destroy(); return; }
      upstreamResponse.once('error', () => response.destroy());
      upstreamResponse.once('aborted', () => response.destroy());
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    const cancel = () => { upstream.destroy(); incoming?.destroy(); };
    request.once('aborted', cancel);
    response.once('close', () => { if (!response.writableFinished) cancel(); });
    if (request.aborted || response.destroyed) { cancel(); return; }
    upstream.on('error', () => {
      if (request.aborted || response.destroyed || response.writableEnded) return;
      if (response.headersSent) { response.destroy(); return; }
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: "Application listener is unavailable" }));
    });
    request.pipe(upstream);
  });
  // Next's development client needs its HMR WebSocket before hydration completes.
  server.on('upgrade', (request, socket, head) => {
    let incoming;
    const upstream = http.request({ hostname: '127.0.0.1', port: targetPort, path: request.url, method: request.method, headers: { ...request.headers, host: `127.0.0.1:${targetPort}` } });
    const cancel = () => { upstream.destroy(); incoming?.destroy(); };
    socket.once('error', cancel);
    socket.once('end', cancel);
    socket.once('close', cancel);
    upstream.once('error', () => socket.destroy());
    upstream.once('upgrade', (response, upstreamSocket, upstreamHead) => {
      incoming = upstreamSocket;
      if (socket.destroyed) { upstreamSocket.destroy(); return; }
      const headers = [];
      for (let index = 0; index < response.rawHeaders.length; index += 2) headers.push(`${response.rawHeaders[index]}: ${response.rawHeaders[index + 1]}`);
      socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n${headers.join('\r\n')}\r\n\r\n`);
      if (upstreamHead.length) socket.write(upstreamHead);
      if (head.length) upstreamSocket.write(head);
      upstreamSocket.once('error', () => socket.destroy());
      upstreamSocket.once('end', () => socket.destroy());
      upstreamSocket.once('close', () => socket.destroy());
      socket.pipe(upstreamSocket);
      upstreamSocket.pipe(socket);
    });
    upstream.once('response', response => {
      incoming = response;
      socket.end(`HTTP/1.1 ${response.statusCode || 502} ${response.statusMessage || 'Bad Gateway'}\r\nConnection: close\r\n\r\n`);
      response.resume();
    });
    upstream.end();
  });
  return server;
}

const directEntry = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (directEntry) {
  const targetPort = Number(process.env.RUNTIME_PROXY_TARGET_PORT), listenPort = Number(process.env.RUNTIME_PROXY_PORT);
  if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535 || targetPort === listenPort) throw new Error('Distinct valid runtime proxy ports are required');
  const server = createRuntimeProxyServer({ targetPort });
  server.listen(listenPort, '127.0.0.1', () => console.log(`UI proxy listening on http://127.0.0.1:${listenPort}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
