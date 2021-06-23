var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var challengeSentCount = 5;
var challengeSentences = [];
var users = [];

function ri(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function generateSentence(){
  const pnouns = ["장주환 주임님", "김석주 주임님", "김민형", "양세훈","임희주 주임님","서영은 과장님","안상준 대리님", "박성호 소장님", "김광천 이사님", "한세훈 부장님"];
  const nouns = ["감자","과자","사탕","낙타","컴퓨터","키보드","다람쥐","공룡","슬랙","핸드폰", "사진기","물컵", "모니터", "창고", "강아지", "고양이"]
  const verbs = ["먹었다", "때렸다","째려봤다","걷어 찼다", "싫어한다", "좋아한다", "혐오한다", "공격했다", "돌려버렸다", "시도했다", "박살냈다", "싸대기 때렸다"]
  const adjectives = ["맛있게", "힘차게", "겨우", "천천히", "멋있게", "예쁘게", "빠르게", "오지게", "뜨겁게", "이상하게", "귀엽게", "따끈하게","얄밉게"];

  var sent = ""
  sent += pnouns[ri(pnouns.length)] + "은 " + nouns[ri(nouns.length)] +"을 " + adjectives[ri(adjectives.length)] + " " + verbs[ri(verbs.length)];
  sent += ".";

  if(Math.random() < 0.2){
    sent = "머징?";
  }

  return sent;
}

function checkMatchChallengeSent(checkStr){
  for(var i=0; i<challengeSentences.length; i++){
    if(challengeSentences[i] == checkStr){
      return i;
    }
  }
  return -1;
}

function getScore(uName){
  for(var i=0; i<users.length; i++){
    if(users[i].username == uName){
      return users[i].score;
    }
  }
  return -1;
}

function incScore(uName, incScore){
  for(var i=0; i<users.length; i++){
    if(users[i].username == uName){
      users[i].score += incScore;
    }
  }
}

function delUserBySocketId(socketId){
  for(var i=0; i<users.length; i++){
    if(users[i].socketId == socketId){
      users.splice(i,1);
      i--;
      //users[i].score = -1;
    }
  }
}

function getUserBySocketId(socketId){
  for(var i=0; i<users.length; i++){
    if(users[i].socketId == socketId){
      return users[i];
    }
  }
}

function pollUserInfo(){
  setTimeout(function() {
    console.log('poll user info : ' + users.length);
    io.emit('poll user info', {
      userList : users
    });
    pollUserInfo();
  }, 500);
}

pollUserInfo();

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/users', function(req, res){
  res.send(users);
});

io.on('connection', function(socket){

  socket.on('check username', function(uName){
    if(getScore(uName)==-1){
      io.emit('init', {
        canUse : true,
        username : uName
      });
    } else {
      io.emit('init', {
        canUse : false,
        username : uName
      });
    }
    
  });

  socket.on('challenge message', function(msg){
    if(msg.challengeSent.includes("<")){
      msg.challengeSent = "여러분! 저는 바보입니다!";
    }
    io.emit('challenge message', msg);
  });

  socket.on('chat message', function(msg){
    if(msg.chatSent.includes("<")){
      msg.chatSent = "여러분! 저는 바보입니다!";
    }
    io.emit('chat message', msg);
  });
  
socket.on('cheat msg', function(msg){
    console.log('CHEAT MSG : ' + msg);
    if(msg.chatSent.includes("<")){
      msg.chatSent = "여러분! 저는 바보입니다!";
    }
    incScore(msg.username, 0);
    io.emit('cheat msg', msg);
  });

  socket.on('submit challenge message', function(msg){

    var checkSentRes = checkMatchChallengeSent(msg.challengeSent);
    if(checkSentRes != -1){
      //calc score

      //award score
      incScore(msg.username, 1);

      challengeSentences[checkSentRes] = generateSentence();
      io.emit('challenge', {
        challengeSentences : challengeSentences,
        sentenceIndex : checkSentRes,
        username : msg.username,
        newScore : getScore(msg.username)
      });
    }
  });
  
  socket.on('challenge init', function(){
      challengeSentence = generateSentence();

      for(var i=0; i<challengeSentCount; i++){
        challengeSentences[i] = generateSentence();
      }

    io.emit('challenge init', {
      challengeSentences : challengeSentences,
      users : users
    });
  });

  socket.on('challenge end', function(winner){

  io.emit('challenge end', winner);
});
  
  socket.on('welcome msg', function(username){

    if(username.includes("<")){
      username = "바보" + Math.round(Math.random()*1000);
    }

    var userData = {
      username : username,
      score : 0,
      socketId : `${socket.id}`
    }
    users.push(userData);
    io.emit('welcome msg', username);
  });

  socket.on('disconnect', () => {
    var tUName = getUserBySocketId(`${socket.id}`);
    
    if(tUName != undefined){
        io.emit('exit msg', tUName.username);
        delUserBySocketId(`${socket.id}`);
        console.log(`[DISCONNECT] Socket ${socket.id} disconnected.`);
    } else {
        console.log(`[DISCONNECT] Undefined username ERROR`);
    }
  });
  
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
