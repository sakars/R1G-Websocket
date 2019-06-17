var picsrc,pressedK,svg,cars,map,fi;
function startGame(){
  let t=undefined;
  pressedK=svg=cars=map=fi=undefined;
  document.getElementById("svg-container").innerHTML="";
  pressedK=[];
  svg = new SVGBuilder();
  map=svg.addGroup({id:"ma"});
  fi=map.addSVGFile({class:"map"}, picsrc);
  cars = svg.addGroup({id:"gr"});
  waiter();
}
function waiter(){
  if(fi.loaded && done){
    ids.forEach(function(a){
      players[a].groupId = cars.addGroup();
      players[a].id=a;

      players[a].object = players[a].groupId.addSVGFile({class:"car"}, "Images/Car_"+players[a].c+".svg");

      players[a].groupId.scale(0.08, 0.08);
    });
    svg.insert(document.getElementById("svg-container"), true);
    update();
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
  }else{
    setTimeout(waiter,0);
  }
}
function handleKeyDown(event){//event.key
  event.preventDefault();
  if(!pressedK.includes(event.key)){
    pressedK.push(event.key);
    socket.emit("update",JSON.stringify({id:socket.id, keys:pressedK}));
  }
}
function handleKeyUp(event){//event.key
  if(pressedK.includes(event.key)){
    pressedK.splice(pressedK.indexOf(event.key),1);
    socket.emit("update",JSON.stringify({id:socket.id, keys:pressedK}));
  }
}
function update(){
  if(players[socket.id]){
    if(players[socket.id].object){
      if(players[socket.id].object.loaded){
        if(!isNaN(players[socket.id].x) && !isNaN(players[socket.id].y))map.translate(window.innerWidth/2-deltas.x-players[socket.id].x,-players[socket.id].y-deltas.y+window.innerHeight/2,false);
      }
      for(var k in players){
        if(players[k].object.loaded){
          if(!isNaN(players[k].x) && !isNaN(players[k].y) && !isNaN(players[socket.id].x) && !isNaN(players[socket.id].y))
          players[k].groupId.translate(window.innerWidth/2+players[k].x-players[socket.id].x-(600*0.08),window.innerHeight/2+players[k].y-players[socket.id].y-(400*0.08),false);
          if(!isNaN(players[k].angle))players[k].groupId.rotate(players[k].angle*180/Math.PI+90, (600*0.08), (400*0.08), false);
        }
      }
    }
  }
}
function queue(){
  socket.emit("queue");
}

formatTime = (num) => {
  return zeroify(Math.round(Number(num)/60 * 1000)/1000);
}

zeroify = (data) => {
  var disp = String(data).split(".");
  if(disp[1]){
    while(disp[1].length < 3){
      disp[1] += "0";
    }
  }
  else{
    disp.push("000");
  }
  return disp.join(".");
}

showNumberOnStart = (n) => {
  gameStartNumber.transition = "all 0.4s";
  gameStartNumber.innerHTML = n;
  gameStartNumber.classList.add("sha");
  setTimeout(function(){
    gameStartNumber.classList.remove("sha");
    gameStartNumber.transition = "all 0.1s";
  }, 800);
}

changeQueueType = (cText) => {
  switch(cText){
    case "Queue in!":
      socket.emit("queue");
      queueStart.innerHTML = "Unqueue";
      queueStart.style.backgroundColor = "rgba(0, 255, 150, 0.3)";
      queuePlayerAmount.style.backgroundColor = "rgba(0, 255, 150, 0.3)";
    break;
    case "Unqueue":
      socket.emit("cancelq");
      queueStart.innerHTML = "Queue in!";
      queueStart.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
      queuePlayerAmount.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
    break;
    }
  }
