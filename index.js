var wreck = require('wreck');
var EventEmitter = require('events').EventEmitter;

var default_url = 'https://guarded-sierra-2722.herokuapp.com';

exports.create_lock_client = function (options) {
    if (!options || !options.token) 
        throw new Error('The options.token is not specified');
    options.token = options.token;
    options.url = options.url || default_url;
    options.poll_ttl = options.poll_ttl || 45000;
    options.request_timeout = options.request_timeout || 30000;
    options.max_poll_attempt = options.max_poll_attempt || 10;
    options.initial_poll_delay = options.initial_poll_delay || 500;
    options.poll_delay_backoff = options.poll_delay_backoff || 1.2;

    var client = new EventEmitter();

    client.close = function () {
        this._closed = true;
        if (this._delay) {
            clearTimeout(this._delay);
            delete this._delay;
        }
    };

    client.send = function (data, cb) {
        post({
            url: options.url + '/lock/event', 
            token: options.token, 
            data: data, 
            request_timeout: options.request_timeout
        }, cb);
    }

    var error_count = 0;
    var delay = 0;
    function poll_once() {
        var url = options.url + '/lock/hook'
        wreck.get(url, {
            timeout: options.poll_ttl,
            json: true,
            headers: {
                'Authorization': 'Bearer ' + options.token
            }
        }, function (err, res, body) {
            if (client._closed)
                return;
            if (err && err.output && err.output.statusCode === 504) {
                error_count = delay = 0;
                return poll_once();
            }
            if (err || (res.statusCode !== 200 && res.statusCode !== 404)) {
                client.emit('warn', new Error('Unable to communicate with hypelock sever after ' + error_count + ' attempts.'));
                if (error_count++ >= options.max_poll_attempt) {
                    client.close();
                    return client.emit('error', new Error('Unable to communicate with hypelock sever after ' + options.max_poll_attempt + ' attempts.'));
                }
                delay = delay ? delay * options.poll_delay_backoff : options.initial_poll_delay;
                client._delay = setTimeout(poll_once, delay);
                return;
            }
            if (res.statusCode === 200)
                client.emit('message', body);
            poll_once();
        });
    }

    poll_once();

    return client;
};

exports.register = function (options, cb) {
    options = options || {};
    options.url = options.url || default_url;
    options.request_timeout = options.request_timeout || 30000;

    post({
        url: options.url + '/api/doorlock', 
        token: options.token,
        data: options.data, 
        request_timeout: options.request_timeout
    }, cb);
}

exports.action = function (options, cb) {
    options = options || {};
    options.url = options.url || default_url;
    options.request_timeout = options.request_timeout || 30000;

    post({
        url: options.url + '/api/doorlock/' + options.device_id + '/action', 
        token: options.token,
        data: options.data, 
        request_timeout: options.request_timeout
    }, cb);
}

function post(params, cb) {
    var options = {
        json: true,
        payload: JSON.stringify(params.data),
        timeout: params.request_timeout,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (params.token)
        options.headers.Authorization = 'Bearer ' + params.token;
    wreck.post(params.url, options, function (err, res, body) {
        if (err) 
            return cb(err);
        if (res.statusCode !== 200)
            return cb(new Error('Error response from Hyperlock server. HTTP status ' +
                res.statusCode + ': ' + (body || '<empty>')));
        cb(null, body);
    });

}