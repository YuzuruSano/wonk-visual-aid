const os = require('os');

module.exports = function getLocalAddress(){
    const ifacesObj = {}
    ifacesObj.ipv4 = [];
    ifacesObj.ipv6 = [];
    const interfaces = os.networkInterfaces();

    for (const dev in interfaces) {
        interfaces[dev].forEach(function (details) {
            if (!details.internal) {
                switch (details.family) {
                    case "IPv4":
                        ifacesObj.ipv4.push({ name: dev, address: details.address });
                        break;
                    case "IPv6":
                        ifacesObj.ipv6.push({ name: dev, address: details.address })
                        break;
                }
            }
        });
    }
    return ifacesObj;
}