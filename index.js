var express = require('express');
var socket = require('socket.io');
var fs = require('fs');
var port = 1234;

// App setuo
var app = express();
var server = app.listen(port, function() {
  console.log('Express server listening on port', port);
});
var playas={
  none:{},
  room1:{},
  room2:{},
  room3:{}
};
var pls={};
// Static files
app.use(express.static('static'));

// Socket setup
var io = socket(server);
io.on('connection', function(socket) {
  console.log('Connection established, id=', socket.id);
  console.log('Connection data', socket.handshake.query);

  var initData = socket.handshake.query.initData ? JSON.parse(socket.handshake.query.initData) : null;
  state.clientJoin(socket.id, initData);

  // Inform the freshly connected socket about the currently connected sockets and their shared data
  var connectedSockets = io.sockets.sockets;
  var socketIds = [];
  for (var s in connectedSockets) {
    socketIds.push(s);
  }
  playas.none[socket.id]={id:socket.id,socket:socket,x:0,y:0,xvel:0,yvel:0,angle:0,keys:[],wheel:0};
  pls[socket.id]="none";
  /*
  for (var socketId in connectionData) {
    if (!socketIds.includes(socketId)) delete connectionData[socketId];
  }
  */
  socket.emit('init', {ids:socketIds, data:state.publicDataFull()});

  // Inform all other connected sockets about the new connection
  socket.broadcast.emit('new-connection', state.publicDataClient(socket.id));

  // Establish the message event listeners
  socket.on("update",function(data){
    console.log("Update:",data);
    data=JSON.parse(data);
    playas[pls[socket.id]][socket.id].keys=data.keys;
  });
  socket.on("force",function(data){
    console.log("Forced location:",data);
    io.sockets.emit('force', data);
  });
  socket.on("roomChange",function(data){
    console.log(socket.id+" Changed room from "+pls[socket.id]+" to ",data);
    delete playas[pls[socket.id]][socket.id];
    pls[socket.id]=data;
    playas[pls[socket.id]][socket.id]={id:socket.id,socket:socket,x:10,y:10,xvel:0,yvel:0,angle:0,keys:[],wheel:0,motor:0};
  });
  socket.on('disconnect', function(reason) {
    console.log('Disconnect from', socket.id, '; reason =', reason);
    state.clientLeave(socket.id, reason);
    socket.broadcast.emit('leave', {id: socket.id}); // Send to every open socket, excluding the sender
    delete playas[pls[socket.id]][socket.id];
  });
});

class RoomState {
  constructor() {
    this.clients = {};
  }
  publicDataFull() {
    // Data that describe the current state and can be shared publicly
    return this.clients;
  }
  publicDataClient(clientId) {
    // Data that describe a particular client and can be shared publicly
    return {
      id  : clientId,
      data: this.clients[clientId]
    }
  }
  clientJoin(id, data) {
    this.clients[id] = data;
  }
  clientUpdate(id, data) {
    if (id in this.clients) {
      let client = this.clients[id];
      client.x = data.x;
      client.y = data.y;
    }
  }
  clientLeave(id, reason) {
    delete this.clients[id];
  }
}

var state = new RoomState();
function update(){
  for(var s in playas) for(var l in playas[s]) for(var s2 in playas[s]) if(typeof playas[s][s2] === "object"){
    var msg={x:playas[s][s2].x,y:playas[s][s2].y,angle:playas[s][s2].angle,id:playas[s][s2].id};
    delete msg.socket;
    playas[s][l].socket.emit("update",JSON.stringify(msg));
  }
  for(var s in playas)
  for(var l in playas[s]){
    var o=playas[s][l];
    if(o.keys.includes("w") && o.motor<1){
      o.motor+=0.01;
    }else
    if(o.keys.includes("s")){
      o.xvel-=o.xvel*0.01;
      o.yvel-=o.yvel*0.01;
    }
    if(o.keys.includes("d")){
      o.wheel+=Math.PI*2/360/100/2;
    //  o.angle+=Math.PI*2/360*10/100*2;
    }
    if(o.keys.includes("a")){
      o.wheel-=Math.PI*2/360/100/2;
    //  o.angle-=Math.PI*2/360*10/100*2;
    }
    o.angle+=o.wheel*mag(o.xvel,o.yvel);
    if(o.angle<0)o.angle+=Math.PI*2;
    if(o.angle>0)o.angle-=Math.PI*2;
    o.xvel+=Math.cos(o.angle)*o.motor;
    o.yvel+=Math.sin(o.angle)*o.motor;
    o.x+=o.xvel;
    o.y+=o.yvel;

    if(o.x<0)o.x+=600;
    if(o.x>600)o.x-=600;
    if(o.y<0)o.y+=600;
    if(o.y>600)o.y-=600;
  }
//console.log(playas);
  setTimeout(update,1);
}

var tracks={};
var track_names;
function loadJSON() {
  track_names.forEach(function(track_name){
    var contents = fs.readFileSync("static/game/tracks/"+track_name+".json", 'utf8');
    tracks[track_name]=JSON.parse(contents);
    console.log(JSON.parse(contents));
  });
  update();
}
init();
function init(){
  var config=JSON.parse(fs.readFileSync("static/game/config.json","utf8"));
  track_names=config.tracks;
  loadJSON();
}
function mag(x, y){
  return Math.sqrt(x**2+y**2);
}
