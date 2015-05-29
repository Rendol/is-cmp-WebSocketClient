/**
 * Infinity Systems component WebSocketClient
 *
 * @author Igor Sapegin aka Rendol <sapegin.in@gmail.com>
 */
IS.reg('components.WebSocketClient', function () {
    return $.extend({}, {
        // WebSocket Client options
        options: {},

        // Private properties
        _sendQueue: [],
        _sendCallbacks: [],
        _sendProcessStarted: false,

        constructor: function (data) {
            var me = $.extend(this, data);
            // Веб-Сокет
            me.connect = new this._client($.extend({
                onMessage: function (data) {

                    for (var category in data) {
                        if (category != 'callback' && category != 'Exception') {
                            for (var name in data[category]) {
                                me.trigger(category + '.' + name, data[category][name]);
                            }
                        }
                    }

                    if ('callback' in data) {
                        me._runCallback(data.callback.index, data.callback.data);
                    }

                    if ('Exception' in data) {
                        console.log(data.Exception);
                        throw new Error(data.Exception.message);
                    }

                }
            }, me.options));
            return this;
        },

        msg: function (data, callback) {
            this._sendQueue.push({
                data: data,
                callback: callback
            });
            this._run();
        },

        _run: function () {
            var me = this;
            if (!me._sendProcessStarted) {
                me._sendProcessStarted = true;
                me._iterationCallback();
            }
        },
        _runCallback: function (index, data) {
            this._sendCallbacks[index](data);
        },
        _iterationCallback: function () {
            var me = this;
            var task = me._sendQueue.shift();
            if (task) {
                task.data['callback'] = me._sendCallbacks.length;
                me._sendCallbacks.push(function () {
                    if (task.callback) {
                        task.callback();
                    }
                    me._iterationCallback()
                });
                me.connect.send(JSON.stringify(task.data));
            }
            else {
                me._sendProcessStarted = false;
            }
        },

        /**
         * Event model
         */
        _handlers: {},
        trigger: function (name, args) {
            var handlers = this._handlers;
            if (name in handlers) {
                for (var i = 0, ln = handlers[name].length; i < ln; i++) {
                    handlers[name][i](args);
                }
            }
            else {
                console.log('Not found triggers for:', name);
            }
        },
        on: function selfCalle() {
            var me = this,
                args = arguments,
                i,
                ln,
                name,
                handlers;

            if (args[0] instanceof Array) {
                handlers = args[0];
                for (i = 0, ln = handlers.length; i < ln; i++) {
                    selfCalle.apply(me, [handlers[i]]);
                }
            }
            else if (args[0] instanceof Object) {
                handlers = args[0];
                for (name in handlers) {
                    selfCalle.apply(me, [name, handlers[name]]);
                }
            }
            else {
                name = args[0];
                handlers = args[1];
                if (handlers instanceof Array) {
                    for (i = 0, ln = handlers.length; i < ln; i++) {
                        selfCalle.apply(me, [name, handlers[i]]);
                    }
                }
                else {
                    if (!(name in me._handlers)) {
                        me._handlers[name] = [];
                    }
                    me._handlers[name].push(handlers);
                }
            }
            return this;
        },
        onDebounce: function (name, handler, wait, unique) {
            var me = this;
            if (!(name in me._handlers)) {
                me._handlers[name] = [];
            }
            me._handlers[name].push(
                me.debounce(
                    handler,
                    wait,
                    unique
                )
            );
            return me;
        },
        debounce: function (func, wait, unique) {
            var timeouts = {};
            return function () {
                var context = this, args = arguments;
                var uniqueId = unique.apply(context, args);

                clearTimeout(timeouts[uniqueId]);
                timeouts[uniqueId] = setTimeout(function () {
                    timeouts[uniqueId] = null;
                    func.apply(context, args);
                }, wait);
            };
        },
        _client: function (opts) {
            var o = $.extend(
                {
                    protocol: 'ws',
                    host: 'localhost',
                    port: 80,
                    registerId: null,
                    sessionId: null,
                    onOpen: function () {
                        console.log('default handler for event @onOpen');
                    },
                    onClose: function (data) {
                        console.log('default handler for event @onClose', data);
                    },
                    onMessage: function (data) {
                        console.log('default handler for event @onMessage', data);
                    }
                }, opts
            );
            var socket = new WebSocket(o.protocol + '://' + o.host + ':' + o.port + '/');
            socket.onopen = function (msg) {
                o.onOpen();
            };
            socket.onmessage = function (msg) {
                if (msg.data) {
                    var data = JSON.parse(msg.data + "");
                    o.onMessage(data);
                }
            };
            socket.onclose = function (msg) {
                o.onClose(msg);
            };
            return socket;
        }
    });
})
;