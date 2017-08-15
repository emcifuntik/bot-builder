let socket = new WebSocket('ws://' + location.host + '/ws');

let counter = 0;
let queue = {};

class _RPC {
  get(target, name) {
    return (data) => {
      return new Promise((resolve, reject) => {
        const id = counter++;
        let request = {
          function: name,
          data: data,
          id: id
        };
        queue[id] = {resolve, reject};
        target.send(JSON.stringify(request));
      });
    };
  }
}
window.RPC = new Proxy(socket, new _RPC());

socket.onopen = function() {
  console.log('%c[Debug] %cWebSocket connection opened', 'color: #0a0; font-weight: bold', 'color: #000');
};

socket.onclose = function(event) {
  if (event.wasClean)
    console.log('%c[Debug] %cWebSocket connection closed', 'color: #0a0; font-weight: bold', 'color: #000');
  else
    console.error('%c[Error] %cWebSocket connection terminated. Code: %c' + event.code + '%c, reason: %c' + event.reason + '%c.', 'color: #a00; font-weight: bold', 'color: #000', 'font-weight: bold', 'font-weight: initial', 'font-weight: bold', 'font-weight: initial');
};

socket.onmessage = function(event) {
  try {
    let data = JSON.parse(event.data);
    if(data.success)
      queue[data.id].resolve(data.result);
    else
      queue[data.id].reject(data.error);
  }
  catch(err) {
    console.error(err);
  }
};

socket.onerror = function(error) {
  console.error('%c[Error] %cWebSocket error. ' + error.message, 'color: #a00; font-weight: bold', 'color: #000');
};