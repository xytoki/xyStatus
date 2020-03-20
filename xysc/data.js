require('loadavg-windows');
const os = require('os');
const osutil = require('os-utils');
const netStat = require('net-stat');
const cp = require("child_process");
const { procfs } = require('@stroncium/procfs');
const statusObj={};
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
                let total = res[res.length-1];
                for(let i=1;i<11;i++){
                    total = total.replace(/  /g," ")
                }
                total = total.split(" ");
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
module.exports = async function getData(){
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