var socket;
var socketAddress = window.location.host;
var players={};
var done=false;
var ids;
var picsrc;
var deltas;
function connectSocket() {
  if (socket) {
    console.error('Socket already connected');
    return;
  }

  // Init the socket
  socket = io(socketAddress);
  socket.on('connect', function() {
    console.log('Socket established, id =', socket.id);
    done=true;
  });
  // Listen for events
  socket.on('init', function(data) {
    console.log('Init:', data);
    ids=data.ids;
    data=JSON.parse(data.track);
    picsrc=data.picture[0];
    deltas=data.d;
  });
  socket.on('new-connection', function(data) {
    console.log('New connection:', data);
    var t=cars.addGroup();
    players[data.id]={groupId: t,id:data.id,object:t.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_1.svg")};
    players[data.id].groupId.scale(0.08, 0.08);
  });
  socket.on('update', function(data) {
    //console.log('Incoming move msg:', data);
    if(done){
      var msg=JSON.parse(data);
      for(s in msg) if(players[msg.id]){
        players[msg.id][s]=msg[s];
      }
      update();
    }
    //console.log(s);
  });
  socket.on('leave', function(data) {
    console.log('Incoming leave msg:', data);
    delete players[data.id];
    gr.innerHTML="";
    for(var k in players){
      players[k].groupId=cars.addGroup();
      if(k==socket.id){
        players[k].object=players[k].groupId.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_2.svg");
      }else{
        players[k].object=players[k].groupId.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_1.svg");
      }
      players[k].groupId.scale(0.08,0.08);
    }
  });
  socket.on("hardReset",function(data){
    players=JSON.parse(data);
    gr.innerHTML="";
    for(var k in players){
      players[k].groupId=cars.addGroup();
      if(k==socket.id){
        players[k].object=players[k].groupId.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_2.svg");
      }else{
        players[k].object=players[k].groupId.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_1.svg");
      }
      players[k].groupId.scale(0.08,0.08);
    }
  });
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
r1.onclick=function(){
  socket.emit("roomChange","room1");
}
r2.onclick=function(){
  socket.emit("roomChange","room2");
}
r3.onclick=function(){
  socket.emit("roomChange","room3");
}
