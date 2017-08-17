var WebSocketServer = require('ws').Server;
wss = new WebSocketServer({ port: 8080 });
var url = require('url');

const express = require('express');
const app = express();

function heartbeat() {
    this.isAlive = true;
}

clients = {};  // {dev_id: ws}

wss.on('connection', function connection(ws, req) {

    var query = url.parse(req.url, true).query;
    var device_id = query.device_id;
    var query_status_device_id = query.query_status;
    clients[device_id] = ws;
    console.log('有新用户[' + device_id + ']连上服务器了: ' + req.url);
    var openReplyMsg;

    var deviceStatus = {};

    if (query_status_device_id) {
        if (clients[query_status_device_id]) {
            deviceStatus[query_status_device_id] = 0;
        } else {
            deviceStatus[query_status_device_id] = -1;

        }
        openReplyMsg = {
            status: 0,
            message: "获取上线设备成功",
            data: deviceStatus
        }
    } else {

        openReplyMsg = {
            status: 0,
            message: "登录成功",
            data: null
        }
    }

    ws.send(JSON.stringify(openReplyMsg));

    console.log('当前有' + Object.keys(clients).length + '个连接')

    wss.clients.forEach(function (client) {
        var openBroadcastMsg = {
            from: device_id,
            to: "all",
            msg: "online"
        };
        if (client != ws) {
            client.send(JSON.stringify(openBroadcastMsg));
        }
    })

    ws.on('message', function (message) {
        console.log('收到消息: ' + message);

        var toDeviceId = JSON.parse(message).to;
        var fromClient = JSON.parse(message).from;
        var toClient = clients[toDeviceId];

        if (toClient) {
            toClient.send(message);
            console.log("消息 " + message + " 已经发送到" + toDeviceId);
        } else {
            console.log("找不到在线设备");
        }
    });
    ws.on('error', function (er) {
        console.log(er);
    })

    ws.on('close', function () {
        delete clients[device_id];
        console.log('用户[' + device_id + ']掉线了: ' + req.connection.remoteAddress);
        console.log('当前有' + Object.keys(clients).length + '个连接');

        wss.clients.forEach(function (client) {
            var closeMsg = {
                from: device_id,
                to: "all",
                msg: "offline"
            };
            client.send(JSON.stringify(closeMsg));
        })
    });

    ws.isAlive = true;
    ws.on('pong', heartbeat);
});

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping('', false, true);
    });
}, 5000);


app.get('/', function (req, res) {
    res.send('This is a WebSocket server, running at ws://ip:8080 !')
})

app.get('/clients', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(Object.keys(clients)));
});



app.get('/client/:device_id', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    var device_id = req.params.device_id;
    if (device_id) {
        var deviceStatus = {};        
        if (clients[device_id]) {
            deviceStatus[device_id] = 0;
        } else {
            deviceStatus[device_id] = -1;

        }
        openReplyMsg = {
            status: 0,
            message: "获取上线设备成功",
            data: deviceStatus
        }
    } else {
        openReplyMsg = {
            status: 0,
            message: "登录成功",
            data: null
        }
    }

    res.send(JSON.stringify(openReplyMsg));
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
})
