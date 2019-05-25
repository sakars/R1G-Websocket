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
var tracksInRooms={
  none:{},
  room1:{},
  room2:{},
  room3:{}
}
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
  playas.none[socket.id]={id:socket.id,socket:socket,x:0,y:0,xvel:0,yvel:0,angle:0,keys:[],wheel:0,motor:0,drift:false,segment:tracksInRooms.start};
  pls[socket.id]="none";
  /*
  for (var socketId in connectionData) {
    if (!socketIds.includes(socketId)) delete connectionData[socketId];
  }
  */
  socket.emit('init', {ids:Object.keys(playas.none), data:state.publicDataFull()});

  // Inform all other connected sockets about the new connection
  for(a in playas.none){
    socket.broadcast.to(a).emit('new-connection', state.publicDataClient(socket.id));
  }

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
    delete playas[pls[socket.id]][socket.id];//delete from 1st room
    let msg={};
    for(car in playas[pls[socket.id]]){//reset 1st room
      msg[car]={x:playas[pls[socket.id]][car].x,y:playas[pls[socket.id]][car].y,angle:playas[pls[socket.id]][car].angle,id:playas[pls[socket.id]][car].id};
    }
    for(car in playas[pls[socket.id]]){
      socket.broadcast.to(car).emit("hardReset",JSON.stringify(msg));
    }
    pls[socket.id]=data;//change room location
    playas[pls[socket.id]][socket.id]={id:socket.id,socket:socket,x:0,y:0,xvel:0,yvel:0,angle:0,keys:[],wheel:0,motor:0,drift:false,segment:tracksInRooms.start};//insert into room
    msg={};
    for(car in playas[pls[socket.id]]){//reset 2nd room
      msg[car]={x:playas[pls[socket.id]][car].x,y:playas[pls[socket.id]][car].y,angle:playas[pls[socket.id]][car].angle,id:playas[pls[socket.id]][car].id};
    }
    for(car in playas[pls[socket.id]]){
      socket.broadcast.to(car).emit("hardReset",JSON.stringify(msg));
    }
    socket.emit("hardReset",JSON.stringify(msg));
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
  var stt=new Date().getTime();
  for(var s in playas) for(var l in playas[s]) for(var s2 in playas[s]) if(typeof playas[s][s2] === "object"){
    var msg={x:playas[s][s2].x,y:playas[s][s2].y,angle:playas[s][s2].angle,id:playas[s][s2].id};
    delete msg.socket;
    playas[s][l].socket.emit("update",JSON.stringify(msg));
  }
  for(var s in playas)
  for(var l in playas[s]){
    var o=playas[s][l];
    if(o.keys.includes("w") && o.motor<1){
      o.motor+=0.01*60;
      if(o.motor>1){
        o.motor=1;
      }
    }else
    if(o.keys.includes("s") && o.motor>0){
      o.motor-=0.005*60;
      o.xvel-=o.xvel*0.01*60;
      o.yvel-=o.yvel*0.01*60;

      if(o.motor<0){
        o.motor=0;
      }
    }else{
      o.motor*=0.999**60;
      if(o.motor<0.06)o.motor=0;
    }
    o.xvel-=o.xvel*0.001*60*mag(o.xvel,o.yvel);
    o.yvel-=o.yvel*0.001*60*mag(o.xvel,o.yvel);
    if(o.keys.includes("d") && o.wheel<Math.PI*2/360*0.5){
      o.wheel+=Math.PI*2/360/100/2*60;
      if(o.wheel>Math.PI*2/360*0.5){
        o.wheel=Math.PI*2/360*0.5;
      }
    //  o.angle+=Math.PI*2/360*10/100*2;
    }else
    if(o.keys.includes("a") && o.wheel>-Math.PI*2/360*0.5){
      o.wheel-=Math.PI*2/360/100/2*60;
      if(o.wheel<-Math.PI*2/360*0.5){
        o.wheel=-Math.PI*2/360*0.5;
      }
    //  o.angle-=Math.PI*2/360*10/100*2;
    }else{
      if(o.drift){
        o.wheel-=Math.sign(o.wheel)*Math.PI*2/360/100/8*60;
      }else{
        o.wheel-=Math.sign(o.wheel)*Math.PI*2/360/100/4*60;
      }
      if(Math.abs(o.wheel)<Math.PI*2/360/10){
        o.wheel=0;
      }
    }

    o.angle+=o.wheel*mag(o.xvel,o.yvel)*60;
    if(o.angle<0)o.angle+=Math.PI*2;
    if(o.angle>0)o.angle-=Math.PI*2;
    o.xvel+=(Math.cos(o.angle)*o.motor)/300;
    o.yvel+=(Math.sin(o.angle)*o.motor)/300;
    if(mag(o.xvel,o.yvel)>1){
      o.xvel/=mag(o.xvel,o.yvel);
      o.yvel/=mag(o.xvel,o.yvel);
    }
    if(mag(o.xvel,o.yvel)<0.1 && !o.keys.includes("w")){
      o.xvel=0;
      o.yvel=0;
    }
    o.x+=o.xvel*60;
    o.y+=o.yvel*60;
  }
//console.log(playas);
  var delay=1000/60-(new Date().getTime()-stt);
  setTimeout(update, delay>0 ? delay : 0);
}
var tracks={};
var track_names;
function loadJSON() {
  track_names.forEach(function(track_name){
    var contents = fs.readFileSync("static/game/tracks/"+track_name+".json", 'utf8');
    tracks[track_name]=JSON.parse(contents);
    console.log(JSON.parse(contents));
  });
  tracksInRooms.none=tracks["AtpakalMetiens"];
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
