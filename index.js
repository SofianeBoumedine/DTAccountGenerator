const Account = require('./account');
const fs = require('fs');

var count = 0;
var PROXY_START_INDEX = 0;
var proxyList = JSON.parse(fs.readFileSync('./proxy_list.json'))
    .slice(PROXY_START_INDEX);

(function createAccount (i, loop = true) {
    if (i == proxyList.length) return;

    setTimeout(() => {
        Account.create(proxyList[i])
            .then(data => {
                count++;
                console.log(`\x1b[42m [Compte N°${count}] ${data.username}:${data.password} \x1b[0m`);
                createAccount(i, false);
            })
            .catch(err => {
                //console.log(`\x1b[42m ${count} compte(s) créé \x1b[0m`);
                //console.error(`\x1b[31m[${err.key}] ${err.text}\x1b[0m`);
                console.log(PROXY_START_INDEX + i, err.code || err.key || err);
            });
    }, 1000 * i);
    setTimeout(() => {
        if (loop) {
            createAccount(i + 1);   
        }
    }, 30 * i);
})(0);