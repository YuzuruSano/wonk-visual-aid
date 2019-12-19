const express = require('express');
const app = express();
const conf = require('./config.json')[app.get('env')];
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const PORT = process.env.PORT || 4000;

const getLocalAddress = require('./dev/js/scripts/modules/getLocalAddress');
const addr = getLocalAddress();
const env = app.get('env');
const red = '\u001b[31m';
const green = '\u001b[32m'; 
const reset = '\u001b[0m';
const path = require('path');
/**
 * view engine
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
/**
 * build
 */
app.use('/assets', express.static(path.join(__dirname, 'build')));

/**
 * routes
 */
app.get('/', function (req, res) {
    res.render('index', { 
        site: conf.site, 
        staticPath: conf.staticPath,
        env: env
    })
});

app.get('/controller/', function (req, res) {
    res.render('controller', {
        site: conf.site,
        staticPath: conf.staticPath,
        env: env
    })
});

/**
 * run socket
 */
let sid = '';
io.on('connection', function (socket) {
    socket.on('play', function (data) {
        console.log('play: ' + data);
        io.emit('play', data);
    });

    socket.on('play_on_other_device_on', function (data) {
        console.log('play_on_other_device_on: ' + data);
        io.emit('play_on_other_device_on', data);
    });

    socket.on('play_on_other_device_off', function (data) {
        console.log('play_on_other_device_off: ' + data);
        io.emit('play_on_other_device_off', data);
    });
});

http.listen(PORT, function () {
    console.log('server listening. Port:' + PORT);
});