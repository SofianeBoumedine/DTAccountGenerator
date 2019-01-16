const request = require('request');
const HttpsProxyAgent = require('https-proxy-agent');
const qs = require('querystring');
const fs = require('fs');

const OUTPUT_FILENAME = 'accounts.txt';
const EMAIL_DOMAIN = 'gmail.com';
const CARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const HAAPI_SETTINGS = {
    GUEST_CREATION_URI: 'https://haapi.ankama.com/json/Ankama/v2/Account/CreateGuest?game=20&lang=fr',
    VALIDATE_GUEST_URI: 'https://proxyconnection.touch.dofus.com/haapi/validateGuest',
    CREATE_API_URI: 'https://haapi.ankama.com/json/Ankama/v2/Api/CreateApiKey'
};
const ERROR = {
    ACCOUNT_VALIDATION: {
        key: 'account_validation',
        text: 'La validation du compte a échoué.'
    },
    PROXY_DENIED: {
        key: 'proxy_error',
        text: "Le proxy n'a pas pu accéder à la requête."
    }
};
var agent = null;
Object.prototype.useAgent = function (agent) {
    if (agent) {
        this.agent = agent;
        this.timeout = 20000;
        this.followRedirect = true;
        //this.maxRedirects = 10;
    }
    return this;
};

module.exports = {
    randomString (withNumber = true, prefixedString = "", suffix = "") {
        const caracterList = withNumber ? CARACTERS : CARACTERS.substring(0, 52);
    
        while (prefixedString.length < 8) {
            prefixedString += caracterList.charAt(Math.floor(Math.random() * caracterList.length));
        }
        return prefixedString + suffix;
    },
    validateGuest (guestId) {
        const params = {
            login: this.randomString(),
            password: this.randomString(),
            email: this.randomString() + '@' + EMAIL_DOMAIN,
            nickname: this.randomString(false),
            guestAccountId: guestId,
            lang: 'fr'
        };
        return new Promise((resolve, reject) => {
            request.get({
                    url: HAAPI_SETTINGS.VALIDATE_GUEST_URI + '?' + qs.stringify(params)
                }.useAgent(agent),
                (err, response) => err ? reject(err) : resolve({ response, params })
            );
        });
    },
    createGuest () {
        return new Promise((resolve, reject) => {
            request.get({
                    url: HAAPI_SETTINGS.GUEST_CREATION_URI
                }.useAgent(agent),
                (err, response) => err ? reject(err) : resolve(response)
            );
        });
    },
    create (proxySettings) {
        if (proxySettings) {
            agent = new HttpsProxyAgent(proxySettings);
        }
        return new Promise((resolve, reject) => {
            this.createGuest()
                .then(response => {
                    if (response.headers['content-type'] == "application/json") {
                        let body = JSON.parse(response.body);
        
                        if (response.statusCode == 200) {
                            return this.validateGuest(body.id);
                        } else {
                            reject(body);
                        }
                    } else {
                        reject(ERROR.PROXY_DENIED);
                    }
                })
                .then(data => {
                    if (data.response.statusCode == 200) {
                        fs.appendFileSync(
                            './filtered_proxies.txt',
                            '\n' + proxySettings
                        );
                        fs.appendFileSync(
                            './' + OUTPUT_FILENAME,
                            `\n${data.params.login}:${data.params.password}`
                        );
                        resolve({
                            username: data.params.login,
                            password: data.params.password
                        });
                    } else {
                        reject(ERROR.ACCOUNT_VALIDATION);
                    }
                })
                .catch(err => reject(err));
        });
    }
};
