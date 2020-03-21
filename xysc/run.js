#!/usr/bin/env node
const pm2 = require('pm2');
const log     = require("npmlog");

let dsn = process.argv[2]?process.argv[2]:""
let timer = !isNaN(process.argv[3])?Number(process.argv[3]):10;
let auth;

if(!dsn){
    log.info("Usage","xysc-run <dsn> [timer(second)]");
    log.info("Usage","eg. xysc-run https://local@localPassword@localhost:9275 10");
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

pm2.connect(function(err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
    pm2.start({
        name      : "xystatus-client",
        script    : "xystatus-client",
        args      : [dsn,timer]
    }, function(err, apps) {
        pm2.startup(null,{user:false});
        pm2.disconnect();   // Disconnects from PM2
        if (err) throw err
        log.info("DONE","successfully installed xystatus-client. Install pm2 for better control is suggested.");
    });
});