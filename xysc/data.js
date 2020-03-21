require('loadavg-windows');
const os = require('os');
const osutil = require('os-utils');
const si = require('systeminformation');
const statusObj={};
function sleep(time){
    return new Promise(function(resolve){
        setTimeout(resolve,time);
    });
}
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
            let d = os.loadavg();
            for(let i in d){
                d[i] = Math.round(d[i]*10000)/10000
            }
            return d;
        }
    }
});
const asyncStatusObj={
    async disk(){
        let disk = await si.fsSize();
        let data = {
            used:0,
            total:0
        }
        for(let i of disk){
            data.used+=Math.round(i.used/1024/1024*1000)/1000
            data.total+=Math.round(i.size/1024/1024*1000)/1000
        }
        return data
    },
    cpu(){
        return new Promise(function(resolve,rej){
            osutil.cpuUsage(function(v){
                resolve(Math.round(v*10000)/10000);
            });
        })
    },
    async mem(){
        let mem = await si.mem();
        return {
            total:Math.round(mem.total/1024/1024*100)/100,
            available:Math.round(mem.available/1024/1024*1000)/1000,
            swapFree:Math.round(mem.swapfree/1024/1024*1000)/1000,
            swap:Math.round(mem.swaptotal/1024/1024*1000)/1000
        }
    },
    async net(){
        await si.networkStats();
        await sleep(300);
        let net = await si.networkStats();
        let data = {
            rx:0,
            tx:0,
            rx_total:0,
            tx_total:0
        }
        for(let i of net){
            if(i.iface=="lo")continue;
            data.rx+=i.rx_sec;
            data.tx+=i.tx_sec;
            data.rx_total+=i.rx_bytes;
            data.tx_total+=i.tx_bytes;
        }
        for(let i in data){
            data[i] = Math.round(data[i]/1024/1024*1000)/1000;
        }
        return data;
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