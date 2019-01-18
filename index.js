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
const COUNTRY_CHECK_URL = 'https://hidemyna.me/api/geoip.php?out=js&htmlentities';
const ALLOWED_COUNTRIES = ['BD', 'BE', 'BJ', 'MM', 'BO', 'CM', 'CA', 'CY', 'FR', 'GB', 'IQ', 'JP', 'LS', 'MO', 'MT', 'MU', 'MN', 'NI', 'NG', 'NP', 'PK', 'PA', 'PG', 'PY', 'PR', 'PE', 'SV', 'SD', 'PS'];
var count = 1;
var proxyList;
var proxyCountriesList;

const Account = require('./account')(config);
const fs = require('fs');
const request = require('request');

process.setMaxListeners(0);

(function init() {
    var emptyProxyError = () => console.log(
        '\x1b[41m Please fill your proxies in the new proxy_list.txt file as below \x1b[0m',
        '\n\n\x1b[32mhttp://36.46.126.204:32507\nhttp://178.163.23.244:52077\n... \x1b[0m'
    );
    return new Promise(resolve => {
        fs.readFile(config.proxyListPath, 'utf8', (err, data) => {
            if (!err) {
                if (data.length > 0) {
                    proxyList = data
                        .replace(/\r?\n|\r/g, '→')
                        .split('→')
                        .slice(PROXYLIST_ARRAY_INDEX);
                    
                    request.post(COUNTRY_CHECK_URL, {
                        form: {
                            ip: proxyList
                                .map(url => url.substring(0, url.indexOf(':', 6)))
                                .join(',')
                                .replace(/(http|https):\/\//g, '')
                        }
                    }, (err, response, body) => {
                        if (!err && response.headers['content-type'] == "text/javascript") {
                            proxyCountriesList = JSON.parse(body);

                            fs.readFile(config.accountOutputPath, 'utf8', (err, data) => {
                                if (!err && data.length > 0) {
                                    count = data.split('\n').length;
                                }
                                resolve();
                            });
                        } else {
                            console.log('Failed to check proxies location');
                            process.exit(0);
                        }
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
    (function createAccount(i, loop = true) {
        if (i == proxyList.length + 1) return;
        
        var proxyUrl = proxyList[i - 1];
        var proxyIP = proxyUrl
            .substring(0, proxyUrl.indexOf(':', 6))
            .replace(/(http|https):\/\//g, '');

        let proxyData = proxyCountriesList[proxyIP];

        if (proxyData) {
            if (ALLOWED_COUNTRIES.includes(proxyData[0])) {
                setTimeout(() => {
                    Account.create(proxyUrl)
                        .then(data => {
                            count++;
                            console.log(`\x1b[42m ${PROXYLIST_ARRAY_INDEX + i} [Account #${count}] ${data.username}:${data.password} \x1b[0m`);
                            createAccount(i, false);
                        })
                        .catch(err => {
                            console.log(PROXYLIST_ARRAY_INDEX + i, err.code || err.key || err);
                        });
                }, PROXY_REQUEST_DELAY * i);
            } else {
                console.log(PROXYLIST_ARRAY_INDEX + i, proxyUrl.replace(/(http|https):\/\//, ''), 'invalid_country');
            }
        } else {
            console.log(PROXYLIST_ARRAY_INDEX + i, proxyUrl.replace(/(http|https):\/\//, ''), 'country_not_found');
        }
        if (loop) {
            process.nextTick(() => createAccount(i + 1));
        }
    })(1);
});
