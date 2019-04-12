var express = require('express');
var socket = require('socket.io');

var port = 1234;

// App setuo
var app = express();
var server = app.listen(port, function() {
  console.log('Express server listening on port', port);
});

// Static files
app.use(express.static('static'));

// Socket setup
var io = socket(server);
io.on('connection', function(socket) {
  console.log('Connection established, id=', socket.id);
  console.log('Connection data', socket.handshake.query);

  connectionData[socket.id] = socket.handshake.query.initData ? JSON.parse(socket.handshake.query.initData) : null;

  // Inform the freshly connected socket about the currently connected sockets and their shared data
  var connectedSockets = io.sockets.sockets;
  var socketIds = [];
  for (var s in connectedSockets) {
    socketIds.push(s);
  }
  for (var socketId in connectionData) {
    if (!socketIds.includes(socketId)) delete connectionData[socketId]; 
  }
  socket.emit('init', {ids:socketIds, data:connectionData});

  // Inform all other connected sockets about the new connection
  var data = {
    id: socket.id,
    data: connectionData[socket.id]
  }
  socket.broadcast.emit('new-connection', data);

  // Establish the listener
  socket.on('msg', function(data) {
    console.log('Incoming data on socket', socket.id, ':', data);
    if (data.recipient == 'All') {
      // Emit on all open sockets
      //io.sockets.emit('msg', data); // Send to every open socket, including the sender
      socket.broadcast.emit('msg', data); // Send to every open socket, excluding the sender
    } else {
      // Emit on the specific socket
      data.note = 'This only received by me';
      socket.broadcast.to(data.recipient).emit('msg', data);
    }
  });
  socket.on('move', function(data) {
    console.log('Move event from', socket.id, ':', data);
    socket.broadcast.emit('move', data); // Send to every open socket, excluding the sender
    if (data.id in connectionData) {
      connectionData[data.id].x = data.x;
      connectionData[data.id].y = data.y;
    }
  });
});

var connectionData = {};
