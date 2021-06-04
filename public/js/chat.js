const socket = io()

// server (emit) --> client (recieve) on --acknowledgement --> server
// client (emit) --> server (recieve) on --acknowledgement --> client

// Elements 
const $messageForm = document.querySelector('#message-form')
const $messageInput = $messageForm.querySelector('input')
const $formButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector('#share-location')
const $messages = document.querySelector('#messages')

// Templates 
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true})

// Autoscroll
const autoScroll = () => {
    // new message element
    const $newMessage = $messages.lastElementChild

    // height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

// Momentjs and Mustache not required here because I add the script in index.html
socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('HH:mm')
    })
    $messages.insertAdjacentHTML('beforeend', html)

    autoScroll()
})

socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url,
        sharedAt: moment(message.sharedAt).format('HH:mm')
    })
    $messages.insertAdjacentHTML('beforeend', html)

    autoScroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()
    // disable 
    $formButton.setAttribute('disabled', 'disabled')

    const message = e.target.elements.message.value
    // emitted by the client and recieved by the server
    socket.emit('sendMessage', message, (error) => {
        // enable 
        $formButton.removeAttribute('disabled')
        $messageInput.value = ''
        $messageInput.focus()

        if (error) {
            return console.log(error)
        }
        // this func for acknowledge 
        console.log('This message is Delivered')
    }) 
})

// Fetch location 
$locationButton.addEventListener('click', () => {
    if(!navigator.geolocation) {
        return alret("Geo location is not supported")
    }
    $locationButton.setAttribute('disabled', 'disabled')
    // added a callback function in getCurrentPostion because it is async but can't be handled with promise and await
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            lat: position.coords.latitude,
            long: position.coords.longitude
        }, (cbmessage) => {
            console.log(cbmessage)
            // or console.log('Location Shared')
            $locationButton.removeAttribute('disabled')
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})