const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');

//simple funcs to manage users and rooms
const { addUser, removeUser, getUser, getUsersInRoom} = require('./users.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');
const { Console } = require('console');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(router);
app.use(cors());


io.on('connection', socket => {
    //waiting for user, then create a new one
    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room});

        if(error) return callback(error);
        
        const date = new Date();
        const time = date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
        //welcome msg for user
        socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}`, time: time });
        //info msg for other users of the room
        socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name}, has joined!`, time: time});

        socket.join(user.room);

        io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});

        callback();
    });
    //waiting for a new message and send it to other users
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const date = new Date();
        const time = date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
        io.to(user.room).emit('message', {user: user.name, text: message, time});
        callback();
    });
    //waiting for disconnection to update users list
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if(user) {
            io.to(user.room).emit('message', {user: 'admin', text: `${user.name} has left ${user.room} room`});
            io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});
        }
    });
});



server.listen(PORT, () => console.log(`Server hass started on port ${PORT}`));