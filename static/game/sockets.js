var socket;
var socketAddress = window.location.host;

function connectSocket() {
  if (socket) {
    console.error('Socket already connected');
    return;
  }
  // Init the socket
  socket = io(socketAddress);
  socket.on('connect', function() {
    console.log('Socket established, id =', socket.id);
  });
  // Listen for events
  socket.on('init', function(data) {
    console.log('Init:', data);
  });
  socket.on('new-connection', function(data) {
    console.log('New connection:', data);
  });
  socket.on('update', function(data) {
    console.log('Incoming move msg:', data);
    var msg=JSON.parse(data);
    console.log(msg);
  });
  socket.on('force', function(data) {
    console.log('Force reset:', data);
  });
  socket.on('leave', function(data) {
    console.log('Incoming leave msg:', data);
  });
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
