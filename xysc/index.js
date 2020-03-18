require('loadavg-windows');
const os = require('os');
const osutil = require('os-utils');
const cp = require("child_process");
const netStat = require('net-stat');
const msgpack = require("msgpack-lite");
const { procfs } = require('@stroncium/procfs');
const statusObj={};

let dsn = process.argv[2]?process.argv[2]:"http://local:localhost@localhost:9725"

Object.defineProperties(statusObj,{
    uptime:{
        enumerable:true,
        get(){
            return os.uptime();
        }
    },
    loadavg:{
        enumerable:true,
        get(){
            return os.loadavg();
        }
    },
    mem:{
        enumerable:true,
        get(){
            let mi = procfs.meminfo();
            return {
                total:Math.round((os.totalmem())/1024/1024*100)/100,
                available:Math.round((os.type=="Windows_NT"?os.freemem():mi.available)/1024/1024*1000)/1000,
                swapFree:Math.round((os.type=="Windows_NT"?0:mi.swapFree)/1024/1024*1000)/1000,
                swap:Math.round((os.type=="Windows_NT"?0:mi.swapTotal)/1024/1024*1000)/1000
            }
        }
    },
    net:{
        enumerable:true,
        get(){
            return {
                rx:Math.round(netStat.totalRx({units: 'MiB'})*1000)/1000,
                tx:Math.round(netStat.totalTx({units: 'MiB'})*1000)/1000
            }
        }
    }
});
const asyncStatusObj={
    disk(){
        return new Promise(function(resolve,rej){
            cp.exec("df -Tlm --total -t ext4 -t ext3 -t ext2 -t reiserfs -t jfs -t ntfs -t fat32 -t btrfs -t fuseblk -t zfs -t simfs -t xfs",function(err,res){
                if(err)return rej();
                res = res.trim().split("\n");
                let total = res[res.length-1]
                .replace(/  /g," ")
                .replace(/  /g," ")
                .replace(/  /g," ")
                .replace(/  /g," ")
                .split(" ");
                resolve({
                    total:Number(total[2]),
                    used:Number(total[3]),
                });
            });
        })
    },
    cpu(){
        return new Promise(function(resolve,rej){
            osutil.cpuUsage(function(v){
                resolve(Math.round(v*10000)/10000);
            });
        })
    }
};
async function getData(){
    let asyncPms={};
    let asyncRes={};
    for(let i in asyncStatusObj){
        asyncPms[i] = asyncStatusObj[i]()
    }
    for(let i in asyncPms){
        asyncRes[i] = await asyncPms[i]
    }
    return {
        ...asyncRes,
        ...statusObj
    }
}
async function sleep(time){
    return new Promise(function(resolve){
        setTimeout(function(){
            resolve();
        },time);
    })
}

const socket = require('socket.io-client')(dsn+'/connect',{transports: ['websocket']});
let u = require("url").parse(dsn)
u = u.auth.split(":");
socket.on('reconnect_attempt', () => {
    socket.io.opts.transports = ['polling', 'websocket'];
});
    socket.on("connect",function(){
        console.log("connected");
        socket.emit("auth",msgpack.encode({
            id:u[0],
            token:u[1]
        }));
    })
    socket.on("ready",async function(){
        console.log("ready");
        while(socket.connected){
            socket.emit("report",msgpack.encode(await getData()));
            console.log("push");
            await sleep(10000);
        }
    })
    