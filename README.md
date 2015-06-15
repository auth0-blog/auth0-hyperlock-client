Hyperlock client library for phone and tessel
===

This is the client side library for phone and tessel that knows how to talk to [hyperlock service](https://github.com/auth0/doorlock-api). It enables: 

* register a new lock device with hyperlock from phone
* sending commands to the tessel from phone via hyperlock relay
* sending events from tessel to the hyperlock service

### Swimlines

The swimlines for bootstrap and steady state communciation are [here](https://rawgit.com/tjanczuk/ec666975a0a37d274ae6/raw/f6f99b54f4a2dfb82b6b9014938af0ea2bd39270/hyperlock.html). 

### Registation of new lock from phone

```
hyperlock.register({ 
    url: '{base url of the hyperlock service}',
    token: '{user_token from Auth0}',
    data: { name: '{ whatever name you want for your lock }' }
}, function (err, data) {
    assert.ifError(err);
    assert.ok(data);
    assert.equal(typeof data, 'object');

    // the token needs to be passed to Lock over bluetooth during bootstrap
    assert.equal(typeof data.token, 'string');

    // the device_id is used to send commands to the tessel via hyperlock relay
    // using hyperlock.action(...) 
    assert.equal(typeof data.device_id, 'string');
});
```

### Actions

This is used to pass messages from phone to tessel (lock, unlock). 

```
hyperlock.action({
    url: '{base url of the hyperlock service}',
    token: '{user_token from Auth0}',
    device_id: '{ device_id from calling hyperlock.register }',
    data: { arbitrary: 'json' }                    
}, function (err) {
    assert.ifError(err);
});
```

### Listening for actions on tessel

```
var client = hyperlock.create_lock_client({
    url: '{base url of the hyperlock service}',
    token: '{ device_id from bluetooth handshake with phone }',
});
client.on('message', function (m) {
    assert.ok(m);
    assert.equal(typeof m, 'object');
});
```

The `client` is an EventEmitter. Is exposes `message` event for all messages sent from phone using `hyperlock.action`. It also exposes `error` when max number of retries for connection to hyperlock server fails (with exponential backoff). 

### Events from tessel

```
hyperlock.send({
    url: '{base url of the hyperlock service}',
    token: '{device_token from bluetooth handshake with phone}',
    data: { arbitrary: 'json' }                    
}, function (err) {
    assert.ifError(err);
});
```