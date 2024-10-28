let userName;
let groupName;
const input = $("input[name='txt-msg']"); 
const message_body = $(".message-body");
const classUser = $(".user");
const socket = io();
socket.on('connect', addUser);
socket.on('updateusers', updateUserList);
function addUser() {
    userName = prompt("Enter your Name!");
    groupName = prompt("Enter your group Name!");
    socket.emit('adduser', userName, groupName);
}
input.on('keyup', function(e) {
    if (e.key === 'Enter') {
        sendMessage(e.target.value);
    }
});
function sendMessage(message) {
    message = message.trim(); 
    if (message) {
        let msg = {
            user: userName,
            message: message
        };
        appendMessage(msg, 'outgoing');
        input.val(''); 
        goDown();
        socket.emit('message', msg);
    }
}
function appendMessage(msg, type) {
    let newDiv = document.createElement('div');
    newDiv.classList.add(type, 'message');
    let markUp = `<h4>${msg.user}</h4>
                  <p>${msg.message}</p>`;
    newDiv.innerHTML = markUp;
    message_body.append(newDiv);
}
function goDown() {
    message_body.scrollTop(message_body[0].scrollHeight); 
}
function sendClick() {
    var message = input.val();
    sendMessage(message);
}
socket.on('message', (msg) => {
    appendMessage(msg, 'incoming');
    goDown();
});
socket.on('greeting', (data) => {
    let msg = {
        user: "Server",
        message: "Welcome " + data + "! You have been connected!"
    };
    appendMessage(msg, 'incoming');
    goDown();
});
function updateUserList(data) {
    $('.user').empty();
    $('.group').html(groupName);
    $.each(data, function(key, value) {
        if (key.endsWith(groupName)) {
            let newSpan = document.createElement('span');
            let markUp = `<p>${value}</p>`;
            newSpan.innerHTML = markUp;
            classUser.append(newSpan);
        }
    });
}
$('#imageInput').on('change', function (e) {
    var reader = new FileReader();
    var file = e.target.files[0];    
    if(file.type.startsWith('image/')) {
        reader.onload = evt => {
            socket.emit('uploadImage', evt.target.result, userName);
            appendImage(evt.target.result, 'outgoing'); 
        };
    } else { 
        reader.onload = evt => {
            socket.emit('uploadFile', evt.target.result, userName, file.name); 
            appendFile(file.name, evt.target.result, 'outgoing'); 
        };
    }
    reader.readAsDataURL(file);
    $('#imageInput').val('');
});
function appendImage(data, type) {
    message_body.append(`<div class="message ${type}"><h4>${userName}</h4><img src="${data}" class="uploadedImage"/></div>`);
    message_body.scrollTop(message_body[0].scrollHeight);
}
function appendFile(fileName, data, type) {
    message_body.append(`<div class="message ${type}"><h4>${userName}</h4><a href="${data}" download="${fileName}">${fileName}</a></div>`);
    message_body.scrollTop(message_body[0].scrollHeight);
}
socket.on('publishImage', (data, user) => appendImage(data, 'incoming'));
socket.on('publishFile', (data, user, fileName) => appendFile(fileName, data, 'incoming'));
