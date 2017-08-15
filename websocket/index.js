const WebSocket = require('ws');
const url = require('url');
const functions = require('../logic/functions');

module.exports = (server) => {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const location = url.parse(req.url, true);
    ws.on('message', (message) => {
      let rpcData = JSON.parse(message);
      if(rpcData.function in functions) {
        let result = functions[rpcData.function](rpcData.data).then((data) => {
          ws.send(JSON.stringify({
            success: true,
            id: rpcData.id,
            result: data
          }));
        }).catch((err) => {
          ws.send(JSON.stringify({
            success: false,
            id: rpcData.id,
            error: err
          }));
        });
      }
      console.log(rpcData);
    });
  });
};
