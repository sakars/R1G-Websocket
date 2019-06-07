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
    startGame();
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
    data=JSON.parse(data);
    delete players[data.id];
    ids.splice(ids.indexOf(data.id),1);
    console.log(data.id);
    console.log(ids);
    startGame();
  });
  socket.on("hardReset",function(data){
    data=JSON.parse(data);
    ids=Object.keys(data.playas);
    picsrc=data.map;
    deltas=data.d;
    console.log(ids);
    console.log(players);
    startGame();
  });
  //recievers for state updates
  socket.on("queue",function(){
    console.log("Queue joined.");
  });
  socket.on("votingTSt",function(){
    document.getElementById("play").style.display="none";
    document.getElementById("lapTBack").style.display="block";
    document.getElementById("lapCBack").style.display="none";
  });
  socket.on("votingLSt",function(data){
    document.getElementById("play").style.display="none";
    document.getElementById("lapTBack").style.display="none";
    document.getElementById("lapCBack").style.display="block";
    data=JSON.parse(data);
    trackInfo=data.info;
    raceType.innerHTML=data.name;
    lapCount.innerHTML=trackInfo.start;
    console.log(data);
  });
  socket.on("voting",function(data){
    let disp;
    try{
      if((data/60)%1!=0){
        disp = (data/60).toString().split(".");
        if(!disp[1])disp="";
        disp[1]=(disp[1]+"000").substring(0,3);
        disp=disp.join(".");
      }else{
        disp=data;
      }
    }catch(e){
      console.log(disp,data);
    }

    for(var i=0;i<document.getElementsByClassName("voteTimer").length;i++){
      document.getElementsByClassName("voteTimer")[i].innerHTML=disp;
    }
  });
  socket.on("play",function(data){
    document.getElementById("play").style.display="block";
    document.getElementById("lapTBack").style.display="none";
    document.getElementById("lapCBack").style.display="none";
    data=JSON.parse(data);
    picsrc=data.track.picture[0];
    deltas=data.track.d;
    ids=data.playas;
    startGame();
  });
  socket.on("finish",function(data){
    var t=["st","nd","rd","th"];
    alert("You finished in "+data+t[Number(data)-1]+" place");
    for(var i=1;i<=3;i++){
      document.getElementById("lap"+i).style.border = "3px solid #a51e17";
      document.getElementById("lap"+i).style.color = "#9e2822";
      document.getElementById("lap"+i).setAttribute("sl", "false");
    }
    typeVote={1:false,2:false,3:false};
  });
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
typeVote={1:"false",2:"false",3:"false"};
function selectVoteType(btnId, it){//race type buttons activate this
    if(it.getAttribute("sl") == "false"){
        it.style.border = "3px solid #ff7063";
        it.style.color = "#ff796d";
        it.setAttribute("sl", "true");

    }
    else{
        it.style.border = "3px solid #a51e17";
        it.style.color = "#9e2822";
        it.setAttribute("sl", "false");
    }
    typeVote[btnId]=it.getAttribute("sl");
    socket.emit("voteType",JSON.stringify(typeVote));
}
var trackInfo;
function lappChange(a){
    let clc = Number(lapCount.innerHTML) + a * trackInfo.step;
    if(clc >= trackInfo.min && clc <= trackInfo.max){
        lapCount.innerHTML = clc;
        socket.emit("voteLap",clc);
    }
}
