
const fs = require('fs');
const http = require('http');
const path = require('path');
const cors = require('cors')
const express = require('express');
const bodyParser = require('body-parser');
const msgpack = require("msgpack-lite");
const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);
const io = require('socket.io')(server);


const config = JSON.parse(fs.readFileSync("config.json").toString());
let box={};
let rbox={};
for(let i in config.servers){
    box[i]={
        online:false,
        last:Date.now()
    };
}
for(let i in config.namespaces){
    if(!config.namespaces[i].items)continue;
    for(let j of config.namespaces[i].items){
        rbox[j.id]=rbox[j.id]||[];
        if(rbox[j.id].indexOf(i)==-1){
            rbox[j.id].push(i);
        }
    }
}


const ioConn=io.of("/connect");
const ioPub=io.of("/public");

ioConn.on("connection",function(socket){
    console.log("one client connected");
    socket.on("auth",function(buf){
        let {id,token} = msgpack.decode(buf);
        console.log("got auth "+id);
        if(config.servers[id]!==token){
            return socket.disconnect();
        }
        box[id].online=true;
        socket.emit("ready");
        socket.on("report",function(buf){
            let data = msgpack.decode(buf);
            box[id] = {
                ...data,
                online:true,
                last:Date.now()
            }
            pushSvr(id);
        });
        socket.on("disconnect",function(buf){
            box[id] = {
                online:false,
                last:Date.now()
            }
            pushSvr(id);
        });
    });
})

ioPub.on("connection",function(socket){
    socket.on("subscribe",function(n){
        socket.join(n);
        ioPub.to(n).emit('update',genBox(n));
    })
});

app.get("/namespace/:name",function(request,response){
    let info = config.namespaces[request.params.name];
    if(!info){
        response.json({data:{}});
        return response.end(404);
    }
    response.json({data:info});
    response.end();
})

function genBox(nsp){
    let info = config.namespaces[nsp];
    let res={};
    if(!info){
        return false
    }
    for(let j in info.items){
        let i = info.items[j]
        if(i.mode=="server"){
            res[i.id]=box[i.id]
        }
    }
    return res;
}

function pushSvr(id){
    if(!rbox[id])return;
    for(let i of rbox[id]){
        ioPub.to(i).emit('update',genBox(i));
    }
}

app.get("/box/:name",function(request,response){
    let res = genBox(request.params.name);
    if(!res){
        response.json({});
        return response.end(404);
    }
    response.json({data:res});
    response.end();
})

server.listen(9725);