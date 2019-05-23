var socket;
var socketAddress = window.location.host;
var players={};
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
      players[a] = {groupId: cars.addGroup(),id:a};
      if(a==socket.id){
        players[a].object = players[a].groupId.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_2.svg");
      }else{
        players[a].object = players[a].groupId.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_1.svg");
      }
      players[a].groupId.scale(0.08, 0.08);
    });
    svg.insert(document.getElementById("svg-container"), true);

    socket.emit("force",JSON.stringify(me));
  });

  socket.on('new-connection', function(data) {
    console.log('New connection:', data);
    var t=cars.addGroup();
    players[data.id]={groupId: t,id:data.id,object:t.addSVGFile({x: 0, y: 0, class:"car"}, "Images/Car_1.svg")};
    players[data.id].groupId.scale(0.08, 0.08);
    socket.emit("force",JSON.stringify(me));
  });
  socket.on('update', function(data) {
    //console.log('Incoming move msg:', data);
    var msg=JSON.parse(data);
    for(s in msg){
      players[msg.id][s]=msg[s];
    }
    update();
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
