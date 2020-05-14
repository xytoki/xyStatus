# xyStatus
### Demo

https://uptime.su

### 安装教程

1.安装nodejs：
```shell
#centos
curl -sL https://rpm.nodesource.com/setup_12.x | bash –
#debian/ubuntu
curl -sL https://deb.nodesource.com/setup_12.x | bash –
```
2.编辑配置

`nano /etc/xystatus.json`
```json
{
    "servers":{
        "username"  :"password"
    },
    "namespaces":{
        "default":{
            "title":"su -c uptime",
            "items":[
                {
                    "mode":"server",
                    "id":"username",
                    "name":"翻车30nat",
                    "location":"G0FU 江西",
                    "type":"nat",
                    "region":"CN"
                }
            ]
        }
    }
}
```

4.启动服务端
```shell
npm i @xytoki/xystatus-server -g
xystat-run
```


5.安装客户端
（先按第一步装nodejs）
```shell
npm i @xytoki/xystatus-client -g
xysc-run http://username:password@ip:9725 10
#(10是更新秒数)
```
6.访问
`http://<ip>:9725`
可以nginx反代，记得反代的时候允许websocket。
如果反代到https://domain
客户端启动要写成 xysc-run https://username:password@domain 10

7.一键脚本在做了。客户端已经是接近一键了，服务端的一键很快就来
