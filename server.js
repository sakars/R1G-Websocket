var express = require('express');
var socket = require('socket.io');
var fs = require('fs');
var port = process.env.PORT || 1234;

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
  none: {playas:{},track:tracks["Lobby"],state:"playing",stateTime:0},
  room1:{playas:{},track:tracks["AtpakalMetiens"],state:"waiting",stateTime:0,cap:4},
  room2:{playas:{},track:tracks["AtpakalMetiens"],state:"waiting",stateTime:0,cap:4},
  room3:{playas:{},track:tracks["AtpakalMetiens"],state:"waiting",stateTime:0,cap:4}
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
  rooms.none.playas[socket.id].x=rooms.none.track.start_pos[0].x;
  rooms.none.playas[socket.id].y=rooms.none.track.start_pos[0].y;
  rooms.none.playas[socket.id].angle=-rooms.none.track.start_pos[0].a*Math.PI;
  /*
  for (var socketId in connectionData) {
    if (!socketIds.includes(socketId)) delete connectionData[socketId];
  }
  */
  var msg={};
  for(car in rooms.none.playas){//reset 2nd room
    msg[car]={
      c:rooms.none.playas[car].cid,
      x:rooms.none.playas[car].x,
      y:rooms.none.playas[car].y,
      angle:rooms.none.playas[car].angle,
      id:rooms.none.playas[car].id
    };
  }
  socket.emit('init', {
    ids:Object.keys(rooms.none.playas),
    playas:msg,
    data:state.publicDataFull(),
    track:JSON.stringify(rooms.none.track),
    q: queue.length()
  });
  socket.on("username",function(data) {
    rooms[pls[socket.id]].playas[socket.id].username=data;
    console.log(rooms[pls[socket.id]].playas[socket.id].username);
  });
  // Inform all other connected sockets about the new connection
  for(a in rooms.none.playas){
    socket.broadcast.to(a).emit('new-connection', state.publicDataClient(socket.id));
  }
  // Establish the message event listeners
  socket.on("update",function(data){
    //console.log("Update:",data);
    data=JSON.parse(data);
    try{
      rooms[pls[socket.id]].playas[socket.id].keys=data.keys;
    }catch(e){
      console.log("player ",socket.id," was moved mid-update");
    }
  });
  socket.on("voteType",function(data){
    rooms[pls[socket.id]].playas[socket.id].voted=JSON.parse(data);
  });
  socket.on("voteLap",function(data){
    rooms[pls[socket.id]].playas[socket.id].voted=data;
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
    for(var g in rooms.none.playas){
      rooms.none.playas[g].socket.emit("queueUp", queue.length());
    }
  });
  socket.on("cancelq",function(){
    queue.remove(socket.id);
    console.log(socket.id," canceled queue, queue is:",queue);
    for(var j in rooms.none.playas){
      rooms.none.playas[j].socket.emit("queueUp", queue.length());
    }
  });
  socket.on('disconnect', function(reason) {
    console.log('Disconnect from', socket.id, '; reason =', reason);
    state.clientLeave(socket.id, reason);
    socket.broadcast.emit('leave',JSON.stringify( {id: socket.id} )); // Send to every open socket, excluding the sender
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
      var msg={
        x:rooms[s].playas[s2].x,
        y:rooms[s].playas[s2].y,
        angle:rooms[s].playas[s2].angle,
        lap:rooms[s].playas[s2].lap,
        id:rooms[s].playas[s2].id,
        username:rooms[s].playas[s2].username,
        lapStart:rooms[s].playas[l].lapStart,
        segStart:rooms[s].playas[l].segStart,
        stateTime:rooms[s].stateTime,
        relSpeed:rooms[s].playas[s2].relSpeed
      };
      try{
        rooms[s].playas[l].socket.emit("update",JSON.stringify(msg));
      }catch(e){
        console.log(l," changed state mid-sending updates");
      }
  }
  for(var s in rooms){
    switch(rooms[s].state){
      case "playing":
        if(rooms[s].stateTime>=0){
          for(var l in rooms[s].playas){
            //key check
            //>>fold
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
              //fold<<
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
            o.relSpeed = mag(o.xvel,o.yvel);
            o.angle+=o.wheel*o.relSpeed*60;
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
            let change=false;
            exits.forEach(function(a){
              if(!change){
                if(dist({x:o.x,y:o.y},{x:a.x1,y:a.y1},{x:a.x2,y:a.y2})<10){
                  //console.log("'"+o.id + "' Entered "+a.segm_name);
                  if(rooms[pls[o.id]].track.start==o.segment){
                    if(o.lapStart!=0){
                      if(!o.topTime || o.topTime>rooms[pls[o.id]].stateTime-o.lapStart){
                        o.topTime=rooms[pls[o.id]].stateTime-o.lapStart;
                      }
                      o.socket.emit("lapFinish", "");
                    }
                    if(rooms[pls[o.id]].laps==o.lap){
                      if(!rooms[pls[o.id]].place)rooms[pls[o.id]].place=1;
                      o.socket.emit("finish",JSON.stringify({
                        place:rooms[pls[o.id]].place,
                        topTime:o.topTime,
                        time:rooms[pls[o.id]].stateTime,
                        topSegTimes: o.topSegTimes
                      }));
                      rooms[pls[o.id]].place++;
                      let id=o.id;
                      if(Object.keys(rooms[pls[o.id]].playas).length==1){
                        rooms[pls[o.id]].state="waiting";
                        rooms[pls[o.id]].place=1;
                      }
                      changeRoom(o.socket,"none",true);
                      rooms.none.playas[o.id].x=rooms.none.track.start_pos[0].x;
                      rooms.none.playas[o.id].y=rooms.none.track.start_pos[0].y;
                      rooms.none.playas[o.id].angle=rooms.none.track.start_pos[0].a*-Math.PI;
                    }
                    o.lap++;
                    o.lapStart=rooms[pls[o.id]].stateTime;
                  }
                  if(o.segStart != 0){
                    if(o.topSegTimes[o.cSegId] == 0 || o.topSegTimes[o.cSegId] > rooms[pls[o.id]].stateTime - o.segStart){
                      o.topSegTimes[o.cSegId] = rooms[pls[o.id]].stateTime - o.segStart;
                    }
                    o.socket.emit("segFinish", "");
                  }
                  o.cSegId++;
                  if(o.cSegId == 7) o.cSegId = 0;
                  o.segStart=rooms[pls[o.id]].stateTime;

                  o.segT.push({seg:o.segment,t:rooms[s].stateTime});
                  var stands=updateStandings(rooms[s]);
                  Object.values(rooms[s].playas).forEach(function(a) {
                    a.socket.emit("standings",JSON.stringify(stands));
                  });
                  o.segment=a.segm_name;
                  change=true;
                }
              }
            });
          }
        }
        rooms[s].stateTime++;
      break;
      case "waiting":
        var room=rooms[s];
        if(queue.length()>=4 || (Object.values(rooms.none.playas).length==queue.length() && queue.length()>0)){//enough players?
          room.stateTime=5*60;//set voting time
          let l=queue.length();
          var carr=shuffle([1,2,3,4]);
          console.log(carr);
          for(var i=0;i<Math.min(l,4);i++){
            let id=queue.next();
            rooms.none.playas[id].cid=carr[i];
            changeRoom(rooms.none.playas[id].socket,s,(i==Math.min(l,4)-1?true:false));
            room.playas[id].voted={};
          }
          Object.values(room.playas).forEach(function(a){
            a.socket.emit("votingTSt");
          });
          for(var k in rooms.none.playas){
            rooms.none.playas[k].socket.emit("queueUp", queue.length());
          }
          room.state="votingT";
          //console.log(queue,room.playas);
        }
      break;
      case "votingT":
        var room=rooms[s];
        if(room.stateTime==0){
          room.stateTime=5*60;
          var names={"1":"Sprint","2":"Ride","3":"Marathon"};
          var rideinfo={"1":{min:3,max:10,step:1,start:6},"2":{min:10,max:24,step:2,start:16},"3":{min:25,max:50,step:5,start:35}};
          var k={"1":0,"2":0,"3":0};
          Object.values(room.playas).forEach(function(a){
            if(a.voted["1"]=="true")k["1"]++;
            if(a.voted["2"]=="true")k["2"]++;
            if(a.voted["3"]=="true")k["3"]++;
          });
          var x=Object.keys(k).reduce(function(a, b){ return k[a]+Math.random() > k[b]+Math.random() ? a : b });
          Object.values(room.playas).forEach(function(a){
            a.socket.emit("votingLSt",JSON.stringify({type:x,name:names[x],info:rideinfo[x]}));
            a.voted=rideinfo[x].start;
          });
          room.state="votingL";
        }else{
          room.stateTime--;
          Object.values(room.playas).forEach(function(a){
            a.socket.emit("voting",room.stateTime);
          });
        }
      break;
      case "votingL":
        var room=rooms[s];
        if(room.stateTime==0){
          var laps=0;
          Object.values(room.playas).forEach(function(a){
            laps+=a.voted;
          });
          laps=Math.round(laps/Object.keys(room.playas).length);
          room.laps=laps;
          console.log(laps," laps");
          var arr=shuffle([0,1,2,3]);

          Object.values(room.playas).forEach(function(a,i){
            a.socket.emit("play",JSON.stringify({track:room.track,playas:Object.keys(room.playas), lapLim: room.laps}));
            a.segment=room.track.start;
            let position=room.track.start_pos[arr[i]];
            a.x=position.x + 7;
            a.y=position.y;
            a.angle=position.a*-Math.PI;
          });

          room.state="playing";
          room.stateTime=-3*60;
        }else{
          room.stateTime--;
          Object.values(room.playas).forEach(function(a){
            a.socket.emit("voting",room.stateTime);
          });
        }
      break;
    }
    if(rooms[s].state!="waiting" && Object.keys(rooms[s].playas).length==0 && s!="none"){
      rooms[s].state="waiting";
    }
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
function init(){var config=JSON.parse(fs.readFileSync("static/game/config.json","utf8"));
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
function rotators(vec, ang){
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
  this.voted;
  this.lap=0;
  this.segment=rooms[pls[this.id]].track.start;
  this.segT=[{seg:"h",t:0}];
  this.cid=1;
  this.username="Anonymous";
  this.lapStart=0;
  this.recentTime=0;
  this.topSegTimes = [0, 0, 0, 0, 0, 0, 0];
  this.segStart = 0;
  this.cSegId = -1;
  this.topTime;
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
function changeRoom(socket,data,reset){
  var c= rooms[pls[socket.id]].playas[socket.id].cid;
  var nam=rooms[pls[socket.id]].playas[socket.id].username;
  delete rooms[pls[socket.id]].playas[socket.id];//delete from 1st room

  var msg={};
  for(car in rooms[pls[socket.id]].playas){//reset 1st room
    msg[car]={
      c:rooms[pls[socket.id]].playas[car].cid,
      x:rooms[pls[socket.id]].playas[car].x,
      y:rooms[pls[socket.id]].playas[car].y,
      angle:rooms[pls[socket.id]].playas[car].angle,
      id:rooms[pls[socket.id]].playas[car].id
    };
  }
  for(car in rooms[pls[socket.id]].playas){
    if(reset)socket.broadcast.to(car).emit("hardReset",JSON.stringify({
      playas:msg,
      map:rooms[pls[socket.id]].track.picture[0],
      d:rooms[pls[socket.id]].track.d
    }));
  }
  pls[socket.id]=data;//change room location

  rooms[pls[socket.id]].playas[socket.id]=new player(socket.id,socket);//insert into room
  rooms[pls[socket.id]].playas[socket.id].cid=c;
  rooms[pls[socket.id]].playas[socket.id].username=nam;
  msg={};
  for(car in rooms[pls[socket.id]].playas){//reset 2nd room
    msg[car]={
      c:rooms[pls[socket.id]].playas[car].cid,
      x:rooms[pls[socket.id]].playas[car].x,
      y:rooms[pls[socket.id]].playas[car].y,
      angle:rooms[pls[socket.id]].playas[car].angle,
      id:rooms[pls[socket.id]].playas[car].id
    };
  }
  for(car in rooms[pls[socket.id]].playas){
    if(reset)socket.broadcast.to(car).emit("hardReset",JSON.stringify({
      playas:msg,
      map:rooms[data].track.picture[0],
      d:rooms[data].track.d
    }));
  }
  if(reset)socket.emit("hardReset",JSON.stringify({
    playas:msg,
    map:rooms[data].track.picture[0],
    d:rooms[data].track.d
  }));
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
function updateStandings(room){
  let playas=room.playas;
  let pids=Object.keys(room.playas);
  pids.sort(function(a,b){
    let d=playas[b].segT.length-playas[a].segT.length;
    if(d==0){
      return playas[a].segT[playas[a].segT.length-1].t-playas[b].segT[playas[b].segT.length-1].t;
    }
    return d;
  });
  let times=[room.stateTime/60];
  pids.forEach(function(a,i){
    if(i!=0){
      let prplseg=playas[pids[i-1]].segT;
      let thplseg=playas[pids[ i ]].segT;
      try{
        times[i]=thplseg[thplseg.length-1].t-prplseg[thplseg.length-1].t;
        times[i]/=60;
        if(times[i]<0)times[i]="Calculating...";
        pids[i-1]=playas[pids[i-1]].username;
      }catch(e){
        console.log("You should hate yourself if you see this");
      }
    }
    if(i==pids.length-1){
      pids[i]=playas[a].username;
    }
  });
  return {uss:pids,tim:times};
}
