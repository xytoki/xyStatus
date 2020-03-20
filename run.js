#!/usr/bin/env node
const fs = require('fs');
const pm2 = require('pm2');
const path = require('path');
const log = require("npmlog");

let conf = process.argv[2]?process.argv[2]:"/etc/xystatus.json"
let port = !isNaN(process.argv[3])?Number(process.argv[3]):9725;
let dist = process.argv[4]?process.argv[4]:""
if(!conf||!fs.existsSync(conf)||(dist&&!fs.existsSync(dist))){
    log.info("Usage","xystat-run <conf-file> [port=9725] [frontend-dist-dir]");
    log.info("Usage","eg. xysc-run /etc/xystatus.json 8080 /tmp/dist");
    process.exit(0);
}
conf = path.resolve(conf);
log.info("conf",conf,new Date());
log.info("port",port,new Date());
log.info("dist",dist?dist:"EMBEDED",new Date());

pm2.connect(function(err) {
    if (err) {
        console.error(err);
        process.exit(2);
    }
    pm2.start({
        name      : "xystatus-server",
        script    : "xystatus-server",
        args      : [conf,port,dist]
    }, function(err, apps) {
        pm2.startup(null,{user:false});
        pm2.disconnect();   // Disconnects from PM2
        if (err) throw err
        log.info("DONE","successfully installed xystatus-server. Install pm2 for better control is suggested.");
    });
});