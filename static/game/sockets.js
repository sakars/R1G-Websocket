var socket;
var socketAddress = window.location.host;
var players={};
var done=false;
var ids;
var picsrc;
var deltas;
var username;
var pcount;
function getStartUser(){
    username = capitalizeFirstLetter(userN.value);
    if(/^\w+$/.test(username)){
      loginScreen.style.display = "none";
      connectSocket();
    }
    else{
      alert("Insert valid username!");
    }
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function connectSocket() {
  if (socket) {
    console.error('Socket already connected');
    return;
  }

  // Init the socket
  socket = io(socketAddress);
  socket.on('connect', function() {
    console.log('Socket established, id =', socket.id);
    socket.emit("username",username);
    done=true;
  });
  // Listen for events
  socket.on('init', function(data) {
    queueBoard.style.display = "block";
    console.log('Init:', data);
    ids=data.ids;
    players=data.playas;
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
      if(lapTimeDisplay.getAttribute("upTime") == "true"){
        if(Number(msg.lapStart) == 0){
          lapTimeDisplay.innerHTML = "-";
        }
        else{
          lapTimeDisplay.innerHTML = zeroify(Math.round(((Number(msg.stateTime) - Number(msg.lapStart))/60) * 1000)/1000);
        }
      }
      update();
    }
    //console.log(s);
  });
  socket.on('lapFinish', function(data) {
    lapTimeDisplay.setAttribute("upTime", "false");
    setTimeout(function (){
      lapTimeDisplay.setAttribute("upTime", "true");
    }, 3000);
  });
  socket.on('leave', function(data) {
    console.log('Incoming leave msg:', data);
    data=JSON.parse(data);
    delete players[data.id];
    if(ids.includes(data.id))ids.splice(ids.indexOf(data.id),1);
    console.log(data.id);
    console.log(ids);
    startGame();
  });
  socket.on("hardReset",function(data){
    data=JSON.parse(data);
    ids=Object.keys(data.playas);
    players=data.playas;
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
    queueBoard.style.display = "none";
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
    gameStandingsScreen1.style.display = "block";
    gameStandingsScreen2.style.display = "block";
    for(var index = 0; index < 4; index++){
      standingsList.childNodes[index*2 + 1].innerHTML = (index+1) + ".";
      standingsListTimes.childNodes[index*2 + 1].innerHTML = "------";
    };
    goingTime.innerHTML="-3.000";
    data=JSON.parse(data);
    picsrc=data.track.picture[0];
    deltas=data.track.d;
    carCurrentLap.setAttribute("lapLimitStore", data.lapLim);
    ids=data.playas;
    pcount=data.playas.length;
    showNumberOnStart("3");
    setTimeout(function () {
        showNumberOnStart("2");
    }, 1000);
    setTimeout(function () {
        showNumberOnStart("1");
    }, 2000);
    setTimeout(function () {
        showNumberOnStart("Race!");
    }, 3000);
    startGame();
  });
  socket.on("finish",function(data){
    data=JSON.parse(data);
    var t=["st","nd","rd","th"];
    //alert("You finished in "+data+t[Number(data)-1]+" place");
    for(var i=1;i<=3;i++){
      document.getElementById("lap"+i).style.backgroundColor = "rgba(255, 255, 255, 0.3)";
      document.getElementById("lap"+i).style.border = "3px solid rgba(255, 255, 255, 0.4)";
      document.getElementById("lap"+i).style.color = "white";
      document.getElementById("lap"+i).setAttribute("sl", "false");
    }
    gameStandingsScreen1.style.display = "none";
    gameStandingsScreen2.style.display = "none";
    placeDisplay.innerHTML="You finished in "+data.place+t[Number(data.place)-1]+" place! Here are some of your stats:";
    displayEndScreen(data);
    queueBoard.style.display = "block";
    queueStart.innerHTML = "Queue in!";
    queueStart.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
    queuePlayerAmount.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
    typeVote={1:false,2:false,3:false};
  });
  socket.on("standings",function(data){
    data=JSON.parse(data);
    let playerray = data.uss;//all player usernames in order
    let pltimerray = data.tim;//all player time delays in order
    for(var index = 0; index < playerray.length; index++){
      if(playerray[index] && pltimerray[index]){
        standingsList.childNodes[index*2 + 1].innerHTML = (index+1) + ". " + playerray[index];
        if (!isNaN(pltimerray[index])) {
          standingsListTimes.childNodes[index*2 + 1].innerHTML = (index==0 || pltimerray[index]=="Calculating..."?"":"+")+(Math.round(pltimerray[index]*1000)/1000);
        } else {
          standingsListTimes.childNodes[index*2 + 1].innerHTML = pltimerray[index];
        }
      }
    }
    for(; index < pcount; index++){
      standingsList.childNodes[index*2 + 1].innerHTML = (index+1) + ".";
      standingsListTimes.childNodes[index*2 + 1].innerHTML="------";
    }
  });
}

function displayEndScreen(data){
  endScreen.style.display = "block";
  let pltimerray = ["-", "-", "-", "-", "-", "-", "-", Math.round(Number(data.topTime)/60*1000)/1000, Math.round(Number(data.time)/60*1000)/1000];//array with all player's best times of: each of the 7 sectors + best lap time + total time
  player1EndStats.childNodes[1].innerHTML = username;
  for(o = 0; o < 9; o++){
    player1EndStats.childNodes[o*2 + 3].innerHTML = pltimerray[o];
  }
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
        it.style.border = "3px solid rgba(255, 255, 255, 0.7)";
        it.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        it.setAttribute("sl", "true");
    }
    else{
        it.style.border = "3px solid rgba(255, 255, 255, 0.4)";
        it.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
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
