var hyperlock = require('../')
    , assert = require('assert')
    , async = require('async')
    , jwt = require('jsonwebtoken');

var user_token = jwt.sign(
    { 
    }, 
    new Buffer('MFDrTOlml-ZLm8QwpKKVFLbrB68LSw8zyf9mgTJDU20BhjyIuZl5RkYCtZpqVVmh', 'base64'), 
    { 
        subject: 'random dude', 
        audience: 'gO4UveE6yZ4UPNxmGU2MsHlxTxXdt3jQ' 
    });

describe('prerequisities', function () {

    it('are met', function () {
        ['DOORLOCK_URL']
            .forEach(function (p) {
                assert.ok(process.env[p] && typeof process.env[p] === 'string', p + ' must be set');
            });
        });

});

describe('registration', function () {

    it('works', function (done) {
        hyperlock.register({ 
            url: process.env.DOORLOCK_URL,
            token: user_token,
            data: { name: 'my front door lock' }
        }, function (err, data) {
            assert.ifError(err);
            assert.ok(data);
            assert.equal(typeof data, 'object');
            assert.equal(typeof data.token, 'string');
            assert.equal(typeof data.device_id, 'string');
            done();
        });
    });

});

describe('device tunnel', function () {

    it('works', function (done) {
        var device_token, device_id;
        async.series([
            function (cb) {
                hyperlock.register({ 
                    url: process.env.DOORLOCK_URL,
                    token: user_token,
                    data: { name: 'my front door lock' }
                }, function (err, data) {
                    assert.ifError(err);
                    device_token = data.token;
                    device_id = data.device_id;
                    cb();
                });
            },
            function (cb) {
                var client = hyperlock.create_lock_client({
                    url: process.env.DOORLOCK_URL,
                    token: device_token
                });
                client.on('message', function (m) {
                    assert.ok(m);
                    assert.equal(typeof m, 'object');
                    assert.equal(m.hello, 'world');
                    done();
                });
                setTimeout(function () {
                    hyperlock.action({
                        url: process.env.DOORLOCK_URL,
                        token: user_token,
                        device_id: device_id,
                        data: { hello: 'world' }                    
                    }, function (err) {
                        assert.ifError(err);
                    });
                }, 200);
            }
        ], done);
    });

});
