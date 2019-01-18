const config = {
    proxyListPath: './proxy_list.txt',
    accountOutputPath: './accounts.txt',
    filteredProxyOutputPath: './filtered_proxies.txt', // Optionnal
    emailDomain: 'aol.com',
    proxy: {
        timeout: 20000,
        followRedirect: true
        //maxRedirects: 10
    }
};
const PROXYLIST_ARRAY_INDEX = 0; // Indicate the starting line in the proxy list
const PROXY_REQUEST_DELAY = 900; // A too low request delay may trigger the server's protection and refuse proxies requests. Be carefull modifying this variable!
var count = 1;
var proxyList;

const Account = require('./account')(config);
const fs = require('fs');

(function init () {
    var emptyProxyError = () => console.log(
        '\x1b[41m Please fill your proxies in the new proxy_list.txt file as below \x1b[0m',
        '\n\n\x1b[32mhttp://36.46.126.204:32507\nhttp://178.163.23.244:52077\n... \x1b[0m'
    );
    return new Promise(resolve => {
        fs.readFile(config.proxyListPath, 'utf8', (err, data) => {
            if (!err) {
                if (data.length > 0) {
                    proxyList = data
                        .split('\n')
                        .slice(PROXYLIST_ARRAY_INDEX);
    
                    fs.readFile(config.accountOutputPath, 'utf8', (err, data) => {
                        if (!err && data.length > 0) {
                            count = data.split('\n').length;
                        }
                        resolve();
                    });
                } else {
                    emptyProxyError();
                    process.exit(0);
                }
            } else {
                switch (err.code) {
                    case 'ENOENT':
                        emptyProxyError();
                        fs.appendFileSync(config.proxyListPath, '');
                        process.exit(0);
                        break;
                    default:
                        throw err;
                }
            }
        });
    });
})()
.then(() => {
    (function createAccount (i, loop = true) {
        if (i == proxyList.length + 1) return;
        
        setTimeout(() => {
            Account.create(proxyList[i - 1])
                .then(data => {
                    count++;
                    console.log(`\x1b[42m ${PROXYLIST_ARRAY_INDEX + i} [Account #${count}] ${data.username}:${data.password} \x1b[0m`);
                    //createAccount(i, false);
                })
                .catch(err => {
                    console.log(PROXYLIST_ARRAY_INDEX + i, err.code || err.key || err);
                });
        }, PROXY_REQUEST_DELAY * i);
        if (loop) {
            setTimeout(() => createAccount(i + 1), 30 * i);
        }
    })(1);
});
