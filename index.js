var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var challengeSentCount = 5;
var challengeSentences = [];
var users = [];

function generateSentence(){
  const words = ["rex", "is", "running", "dex"];
  const length = Math.floor(Math.random() * 8);
  var sent = ""
  for(i = 0; i <length; i++)
    sent += words[Math.floor(Math.random() * words.length)] + " ";
  sent += ".";
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
    console.log(tUName);
    io.emit('exit msg', tUName.username);
    delUserBySocketId(`${socket.id}`);
    console.log(`Socket ${socket.id} disconnected.`);
  });
  
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
