const request = require('request');
const HttpsProxyAgent = require('https-proxy-agent');
const qs = require('querystring');
const fs = require('fs');

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
Object.prototype.useAgent = function (agent, config) {
    if (agent) {
        this.agent = agent;
        for (let property in config) {
            if (property != 'useAgent') {
                this[property] = config[property];
            }
        }
    }
    return this;
};

module.exports = config => {
    return {
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
                email: this.randomString() + '@' + config.emailDomain,
                nickname: this.randomString(false),
                guestAccountId: guestId,
                lang: 'fr'
            };
            return new Promise((resolve, reject) => {
                request.get({
                        url: HAAPI_SETTINGS.VALIDATE_GUEST_URI + '?' + qs.stringify(params)
                    }.useAgent(agent, config.proxy),
                    (err, response) => err ? reject(err) : resolve({ response, params })
                );
            });
        },
        createGuest () {
            return new Promise((resolve, reject) => {
                request.get({
                        url: HAAPI_SETTINGS.GUEST_CREATION_URI
                    }.useAgent(agent, config.proxy),
                    (err, response) => err ? reject(err) : resolve(response)
                );
            });
        },
        create (proxySettings) {
            if (proxySettings) {
                agent = new HttpsProxyAgent(proxySettings);
            }
            return new Promise((resolve, reject) => {
                process.on('uncaughtException', err => reject({ key: 'EDATALOST', err }));
                
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
                            if (config.filteredProxyOutputPath && config.filteredProxyOutputPath !== false) {
                                fs.appendFileSync(
                                    config.filteredProxyOutputPath,
                                    proxySettings + '\n'
                                );
                            }
                            fs.appendFileSync(
                                config.accountOutputPath,
                                `${data.params.login}:${data.params.password}\n`
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
};
