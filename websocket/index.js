const WebSocket = require('ws');
const url = require('url');
const functions = require('../logic/functions');

module.exports = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const location = url.parse(req.url, true);

    ws.on('message', async (message) => {
      try {
        const rpcData = JSON.parse(message);

        if (rpcData.function in functions) {
          try {
            const result = await functions[rpcData.function](rpcData.data);
            ws.send(JSON.stringify({
              success: true,
              id: rpcData.id,
              result: result
            }));
          } catch (err) {
            ws.send(JSON.stringify({
              success: false,
              id: rpcData.id,
              error: err.message || 'An error occurred'
            }));
          }
        } else {
          ws.send(JSON.stringify({
            success: false,
            id: rpcData.id,
            error: 'Function not found'
          }));
        }

        console.log(rpcData);
      } catch (err) {
        ws.send(JSON.stringify({
          success: false,
          error: 'Invalid message format'
        }));
      }
    });
  });
};
