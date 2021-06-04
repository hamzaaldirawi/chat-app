const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const http = require('http')
const path = require('path')
const { generateMessage, generateLocation } = require('./utils/messages')
const { addUser, getUser, removeUser, getUsersInRoom } = require('./utils/users')

const publicDirectoryPath = path.join(__dirname, '../public')

const app = express() 
const server = http.createServer(app)
const io = socketio(server)

app.use(express.static(publicDirectoryPath))

// socket.emit('eventName', data could be more than 1 arg)
io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    // message is where in chat.js I can console (print data) 
    // send from server 
    // socket.emit('message', generateMessage('Welcome!'))
    // send a broadcast for all user except the user itself
    // socket.broadcast.emit('message', generateMessage('New user has been joined'))
    
    // set on event join 
    // or socket.on('join', (options, callback) => {})
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        // or const {error, user} = addUser({id:socket.id, ...options}) 
        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        // socket.emit send to the user
        // io.emit send to everyone 
        // socket.broadcast.emit send to everyone except the sender
        // io.to.emit : send an event to every body in specific room 
        // socket.broadcast.to.emit : send an event to everyone except sender in spercific room
        socket.emit('message', generateMessage('Admin', `Welcome! ${username}`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    // take from user and send from server
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        // To filter word
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return  callback('Bad Words are not allowed')
        }
        // io to send to all connected user
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback('Delivered') // for acknowledge
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocation(user.username, `https://google.com/maps?q=${coords.lat},${coords.long}`))
        callback('Location Shared')
        // or callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})



module.exports = server
 
