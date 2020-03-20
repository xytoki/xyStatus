#!/usr/bin/env node

const log     = require("npmlog");
const getData = require("./data");
const msgpack = require("msgpack-lite");

let dsn = process.argv[2]?process.argv[2]:""
let timer = !isNaN(process.argv[3])?Number(process.argv[3])*1000:15e3;
let auth;

if(!dsn){
    log.info("Usage","xystatus-client <dsn> [timer(second)]");
    log.info("Usage","eg. xystatus-client https://local@localPassword@localhost:9275 10");
    process.exit(0);
}

try{
    auth = require("url").parse(dsn)
    auth = auth.auth.split(":");
    if(auth.length!=2){
        throw new Error();
    }
}catch(e){
    log.error("CONF","DSN Invaild");
    process.exit(1);
}
log.info("conf","Server",dsn);
log.info("conf","Timer",timer+"s");
let loop = false;
const socket = require('socket.io-client')(dsn+'/connect',{transports: ['websocket']});
socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['polling', 'websocket'];
});
socket.on("connect",function(){
    log.info("CONN","connected",new Date());
    socket.emit("auth",msgpack.encode({
        id:auth[0],
        token:auth[1]
    }));
})
socket.on("ready",function(){
    log.info("CONN","ready",new Date());
    pusher = async function(){
        socket.emit("report",msgpack.encode(await getData()));
        log.info("data","push",new Date());
    };
    pusher();
    loop = setInterval(pusher,timer);
})
socket.on("disconnect",async function(){
    log.error("CONN","disconnected",new Date());
    clearInterval(loop);
    loop = false;
})