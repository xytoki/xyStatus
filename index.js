#!/usr/bin/env node
const fs = require('fs');
const http = require('http');
const path = require('path');
const cors = require('cors');
const log  = require("npmlog");
const express = require('express');
const bodyParser = require('body-parser');
const msgpack = require("msgpack-lite");

let conf = process.argv[2]?process.argv[2]:"config.json"
let port = !isNaN(process.argv[3])?Number(process.argv[3]):9725;
let dist = process.argv[4]?process.argv[4]:(__dirname+"/dist")

if(!conf||!fs.existsSync(conf)||!dist||!fs.existsSync(dist)){
    log.info("Usage","xystatus-server <conf-file> [port=9725] [frontend-dist-dir]");
    log.info("Usage","eg. xystatus-server /etc/xystatus.json 9725 /tmp/dist");
    process.exit(0);
}

conf = path.resolve(conf);
dist = path.resolve(dist);
const config = JSON.parse(fs.readFileSync(conf).toString());

log.info("conf",conf,new Date());
log.info("dist",dist,new Date());

const app = express();
app.use(express.static(dist));
app.use(bodyParser.json());
app.use(cors());
const server = http.createServer(app);
const io = require('socket.io')(server);

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
    socket.on("auth",function(buf){
        let {id,token} = msgpack.decode(buf);
        log.info("auth",id,new Date());
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
            pushSvrSingle(id);
        });
        socket.on("disconnect",function(buf){
            box[id] = {
                online:false,
                last:Date.now()
            }
            pushSvrSingle(id);
        });
    });
})

ioPub.on("connection",function(socket){
    socket.on("subscribe",function(n){
        socket.join(n);
        ioPub.to(n).emit('first',genBox(n));
        ioPub.to(n).emit('info',config.namespaces[n]);
    });
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
        ioPub.to(i).emit('first',genBox(i));
    }
}
function pushSvrSingle(id){
    if(!rbox[id])return;
    for(let i of rbox[id]){
        ioPub.to(i).emit('update',[id,box[id]]);
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

server.listen(port,function(){
    log.info("http","server listening on",port,new Date());
});
