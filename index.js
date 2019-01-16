const Account = require('./account');
const fs = require('fs');

var emptyProxyFileError = () => console.log(
    '\x1b[41m Please fill your proxies in the new proxy_list.txt file as below \x1b[0m',
    '\n\n\x1b[32mhttp://36.46.126.204:32507\nhttp://178.163.23.244:52077\n... \x1b[0m'
);

// Create proxy_list.txt if it doesn't exist
if (!fs.existsSync('./proxy_list.txt')) {
    emptyProxyFileError();
    fs.appendFileSync('./proxy_list.txt', '');
    process.exit(0);
}

var count = 0;
const PROXY_ARRAY_START_INDEX = 0;
var proxyList = fs.readFileSync('./proxy_list.txt', 'utf8');

// Check if proxy_list.txt is not empty
if (proxyList.length == 0) {
    emptyProxyFileError();
    process.exit(0);
}

proxyList = proxyList
    .split('\n')
    .slice(PROXY_ARRAY_START_INDEX);

if (fs.existsSync('./accounts.txt')) {
    count = fs
        .readFileSync('./accounts.txt', 'utf8')
        .split('\n')
        .length;
}

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
                //console.error(`\x1b[31m[${err.key}] ${err.text}\x1b[0m`);
                console.log(PROXY_ARRAY_START_INDEX + i, err.code || err.key || err);
            });
    }, 1400 * i);
    if (loop) {
        setTimeout(() => createAccount(i + 1), 30 * i);
    }
})(0);
