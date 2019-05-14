var socket;
var socketAddress = window.location.host;
var players=[];
function connectSocket() {
  if (socket) {
    console.error('Socket already connected');
    return;
  }
  // Init the socket
  socket = io(socketAddress);
  socket.on('connect', function() {
    console.log('Socket established, id =', socket.id);
    me.id=socket.id;
    update();
  });
  // Listen for events
  socket.on('init', function(data) {
    console.log('Init:', data);
    var ids=data.ids;
    ids.forEach(function(a){
      players.push({id:a});
    });
    socket.emit("force",JSON.stringify(me));
  });
  socket.on('new-connection', function(data) {
    console.log('New connection:', data);
    players.push({id:data.id});
    socket.emit("force",JSON.stringify(me));
  });
  socket.on('update', function(data) {
    console.log('Incoming move msg:', data);
    var msg=JSON.parse(data);
    console.log(msg);
  });
  socket.on('force', function(data) {
    console.log('Force reset:', data);
    data=JSON.parse(data);
    players.forEach(function(a){
      if(data.id==a.id){
        a.x=data.x;
        a.y=data.y;
      }
    });
  });
  socket.on('leave', function(data) {
    console.log('Incoming leave msg:', data);
    players.forEach(function(a){
      if(a.id==data.id){
        players.splice(players.indexOf(a),1);
      }
    });
  });
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
