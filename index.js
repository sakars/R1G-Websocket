var express = require('express');
var socket = require('socket.io');
var fs = require('fs');
var port = 1234;

// App setuo
var app = express();
var server = app.listen(port, function() {
  console.log('Express server listening on port', port);
});
var tracks={};
var track_names;
var queue=new Queue();
init();
var rooms={
  none: {playas:{},track:tracks["Lobby"],state:"playing"},
  room1:{playas:{},track:tracks["AtpakalMetiens"],state:"waiting",stateTime:0,cap:4},
  room2:{playas:{},track:{},state:"waiting",stateTime:0,cap:4},
  room3:{playas:{},track:{},state:"waiting",stateTime:0,cap:4}
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
  pls[socket.id]="none";
  rooms.none.playas[socket.id]=new player(socket.id,socket);
  /*
  for (var socketId in connectionData) {
    if (!socketIds.includes(socketId)) delete connectionData[socketId];
  }
  */
  socket.emit('init', {ids:Object.keys(rooms.none.playas), data:state.publicDataFull(), track:JSON.stringify(rooms.none.track)});

  // Inform all other connected sockets about the new connection
  for(a in rooms.none.playas){
    socket.broadcast.to(a).emit('new-connection', state.publicDataClient(socket.id));
  }
  // Establish the message event listeners
  socket.on("update",function(data){
    //console.log("Update:",data);
    data=JSON.parse(data);
    rooms[pls[socket.id]].playas[socket.id].keys=data.keys;
  });
  socket.on("queue",function(){
    /*console.log(socket.id+" Changed room from "+pls[socket.id]+" to ",data);
    delete rooms[pls[socket.id]].playas[socket.id];//delete from 1st room
    let msg={};
    for(car in rooms[pls[socket.id]].playas){//reset 1st room
      msg[car]={x:rooms[pls[socket.id]].playas[car].x,y:rooms[pls[socket.id]].playas[car].y,angle:rooms[pls[socket.id]].playas[car].angle,id:rooms[pls[socket.id]].playas[car].id};
    }
    for(car in rooms[pls[socket.id]].playas){
      socket.broadcast.to(car).emit("hardReset",JSON.stringify(msg));
    }
    pls[socket.id]=data;//change room location
    rooms[pls[socket.id]].playas[socket.id]=new player(socket.id,socket);//insert into room
    msg={};
    for(car in rooms[pls[socket.id]].playas){//reset 2nd room
      msg[car]={x:rooms[pls[socket.id]].playas[car].x,y:rooms[pls[socket.id]].playas[car].y,angle:rooms[pls[socket.id]].playas[car].angle,id:rooms[pls[socket.id]].playas[car].id};
    }
    for(car in rooms[pls[socket.id]].playas){
      socket.broadcast.to(car).emit("hardReset",JSON.stringify(msg));
    }
    socket.emit("hardReset",JSON.stringify(msg));*/
    queue.add(socket.id);
    console.log(socket.id," joined queue, queue is:",queue);
  });
  socket.on('disconnect', function(reason) {
    console.log('Disconnect from', socket.id, '; reason =', reason);
    state.clientLeave(socket.id, reason);
    socket.broadcast.emit('leave', {id: socket.id}); // Send to every open socket, excluding the sender
    delete rooms[pls[socket.id]].playas[socket.id];
    queue.remove(socket.id);
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
var t=0;//temporary counter, remove when done with grass adjust
function update(){
  var stt=new Date().getTime();
  for(var s in rooms) if(rooms[s].state=="playing") for(var l in rooms[s].playas) for(var s2 in rooms[s].playas) if(typeof rooms[s].playas[s2] === "object"){
      var msg={x:rooms[s].playas[s2].x,y:rooms[s].playas[s2].y,angle:rooms[s].playas[s2].angle,id:rooms[s].playas[s2].id};
      rooms[s].playas[l].socket.emit("update",JSON.stringify(msg));
  }
  for(var s in rooms) switch(rooms[s].state){
    case "playing":
      for(var l in rooms[s].playas){
        var o=rooms[s].playas[l];
        if(o.keys.includes("w") && o.motor<1){
          o.motor+=0.01*60;
          if(o.motor>1){
            o.motor=1;
          }
        }else
        if(o.keys.includes("s")){
          if(o.motor>0) o.motor-=0.02*60;
          o.xvel-=o.xvel*0.05;
          o.yvel-=o.yvel*0.05;

          if(o.motor<0){
            o.motor=0;
          }
        }else{
          o.motor*=0.9;
          if(o.motor<0.06)o.motor=0;
        }

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
        let t_1=(mag(16,24)*Math.cos(Math.atan2(24,16)+o.angle));
        let t_2=(mag(16,24)*Math.sin(Math.atan2(24,16)+o.angle));
        var points=[
          {x:o.x+t_1,y:o.y+t_2},
          {x:o.x-t_2,y:o.y+t_1},
          {x:o.x-t_1,y:o.y-t_2},
          {x:o.x+t_2,y:o.y-t_1}
        ];
        var ingrass=1;
        var grass=rooms[pls[o.id]].track.segments[o.segment].grass;
        points.forEach(function(point){
          looper:
          for(var i=0;i<grass.length;i++){
            var k=grass[i].pos;
            for(var i2=1;i2<=k.length;i2++){
              var a=k[i2 -    1    ];
              var b=k[i2 % k.length];
              if(side(a,b,point)!=grass[i].n){
                continue looper;
              }
            }
            ingrass++;
            break;
          }
        });
        if(ingrass>1){
          t++;
          //console.log(o.id+" is in the grass "+t+" times with "+(ingrass-1)+" corners.");
        }
        o.angle+=o.wheel*mag(o.xvel,o.yvel)*60;
        if(o.angle<0)o.angle+=Math.PI*2;
        if(o.angle>=Math.PI*2)o.angle-=Math.PI*2;
        o.xvel+=(Math.cos(o.angle)*o.motor)/300/ingrass;
        o.yvel+=(Math.sin(o.angle)*o.motor)/300/ingrass;



        var walls=rooms[pls[o.id]].track.segments[o.segment].walls;
        walls.forEach(function(a){
          a.pos.forEach(function(b,i){
            if(i==0)return;
            points.forEach(function(c){
              var d=a.pos[i-1];
              if(dist(c,b,d)<10 && side(d,b,o)==a.n){
                let t_3=rotators({x:b.x-d.x,y:b.y-d.y},a.n*Math.PI/2);
                t_3.x/=mag(t_3.x,t_3.y);
                t_3.y/=mag(t_3.x,t_3.y);
                o.xvel=t_3.x/30/ingrass;
                o.yvel=t_3.y/30/ingrass;
              }
            });
          });
        });

        var adiff=Math.abs(Math.sin(Math.abs((Math.atan2(o.yvel,o.xvel)+Math.PI*2)%(Math.PI*2)-o.angle) + Math.PI/2))*0.8+0.1;
        adiff/=ingrass;
        o.xvel-=o.xvel*0.1*mag(o.xvel,o.yvel)/adiff;
        o.yvel-=o.yvel*0.1*mag(o.xvel,o.yvel)/adiff;
        if(mag(o.xvel,o.yvel)>1){
          o.xvel/=mag(o.xvel,o.yvel);
          o.yvel/=mag(o.xvel,o.yvel);
        }
        if(mag(o.xvel,o.yvel)<0.02 && !o.keys.includes("w")){
          o.xvel=0;
          o.yvel=0;
        }
        o.x+=o.xvel*60;
        o.y+=o.yvel*60;
        var exits=rooms[pls[o.id]].track.segments[o.segment].exit_lines;
        //console.log(exits);
        exits.forEach(function(a){
          if(dist({x:o.x,y:o.y},{x:a.x1,y:a.y1},{x:a.x2,y:a.y2})<10){
            //console.log("'"+o.id + "' Entered "+a.segm_name);
            o.segment=a.segm_name;
          }
        });
      }
    break;
    case "waiting":
    let room=rooms[s];
      if(queue.length()>=4){
        for(var i=0;i<4;i++){
          let id=queue.next();
          room.playas[id]=new player(id,rooms.none.playas[id].socket);
          delete rooms.none.playas[id];
        }
        room.state="voting";
        console.log(queue,room.playas);
      }
    break;
  }
//console.log(playas);
  var delay=1000/60-(new Date().getTime()-stt);
  //console.log(new Date().getTime()-stt);
  setTimeout(update, delay>0 ? delay : 0);
}
function loadJSON() {
  track_names.forEach(function(track_name){
    var contents = fs.readFileSync("static/game/tracks/"+track_name+".json", 'utf8');
    tracks[track_name]=JSON.parse(contents);
    //console.log(JSON.parse(contents));
  });
  update();
}
function init(){
  var config=JSON.parse(fs.readFileSync("static/game/config.json","utf8"));
  track_names=config.tracks;
  loadJSON();
}
function mag(x, y){
  return Math.sqrt(x**2+y**2);
}
function dist2(v, w) { return (v.x - w.x)**2 + (v.y - w.y)**2 }
function dist(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist2(p, { x: v.x + t * (w.x - v.x),
                    y: v.y + t * (w.y - v.y) }));
}
function rotators(vec, ang)
{
    var cos = Math.cos(ang);
    var sin = Math.sin(ang);
    return {x:(vec.x * cos - vec.y * sin), y:(vec.x * sin + vec.y * cos)};
};
function side(p1,p2,pt){
  return Math.sign((p2.x*pt.y)+(p1.x*p2.y)+(p1.y*pt.x)-(p1.y*p2.x)-(p1.x*pt.y)-(p2.y*pt.x));
}
function player(id,socket){//{id:socket.id,socket:socket,x:0,y:0,xvel:0,yvel:0,angle:0,keys:[],wheel:0,motor:0,drift:false,segment:rooms.none.track.start}
  this.id=id;
  this.socket=socket;
  this.x=0;
  this.y=0;
  this.xvel=0;
  this.yvel=0;
  this.angle=0;
  this.keys=[];
  this.wheel=0;
  this.motor=0;
  console.log(rooms[pls[this.id]]);
  this.segment=rooms[pls[this.id]].track.start;
}
function Queue() {
  this.data=[];
  this.add=function(thing){
    if(!this.data.includes(thing)){
      this.data.push(thing);
      return this.data.length;
    }
  }
  this.next=function(){
    return this.data.shift();
  }
  this.first=function(){
    return this.data[0];
  }
  this.last=function(){
    return this.data[this.data.length-1];
  }
  this.toEnd=function(thing){
    return this.data.indexOf(thing);
  }
  this.remove=function(thing){
    var index=this.data.indexOf(thing);
    if(index!=-1){
      this.data.splice(index,1);
      return true;
    }else{
      return false;
    }
  }
  this.length=function(){
    return this.data.length;
  }
}
