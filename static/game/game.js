var pressedK,svg,cars,map,fi;
function startGame(){
  let t=undefined;
  pressedK=svg=cars=map=fi=undefined;
  document.getElementById("svg-container").innerHTML="";
  pressedK=[];
  svg = new SVGBuilder();
  map=svg.addGroup({id:"ma"});
  fi=map.addSVGFile({x: 0, y: 0,class:"map"}, picsrc);
  waiter();
}
function waiter(){
  cars = svg.addGroup({id:"gr"});
  if(fi.loaded && done){
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

    update();
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
  }else{
    setTimeout(waiter,100);
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
    if(players[socket.id].object.loaded){
      map.translate(document.body.clientWidth/2-deltas.x-players[socket.id].x,-players[socket.id].y-deltas.y+300,false);
    }
    for(var k in players){
      if(players[k].object.loaded){
        players[k].groupId.translate(document.body.clientWidth/2+players[k].x-players[socket.id].x-(600*0.08),300+players[k].y-players[socket.id].y-(400*0.08),false);
        players[k].groupId.rotate(players[k].angle*180/Math.PI+90, (600*0.08), (400*0.08), false);
      }
    }
  }
}
function queue(){
  socket.emit("queue");
}
