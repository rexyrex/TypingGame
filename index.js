var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var challengeSentence = "";
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

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
    
    if(msg.msg == challengeSentence){
        //generate new sentence
        challengeSentence = generateSentence();
        io.emit('challenge', challengeSentence);
    }
  });
  
  socket.on('challenge', function(){
      challengeSentence = generateSentence();
    io.emit('challenge', challengeSentence);
  });
  
  socket.on('welcome msg', function(username){
    var userData = {
      username : username,
      score : 0
    }
    users.push(userData);
    io.emit('welcome msg', username);
  });
  
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
