"use strict";
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
						me._runCallback(data.callback);
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
		_runCallback: function (index) {
			this._sendCallbacks[index]();
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
		on: function () {
			var me = this,
				i,
				ln,
				name,
				handler,
				handlers;

			if (arguments[0] instanceof Array) {
				handlers = arguments[0];
				for (i = 0, ln = handlers.length; i < ln; i++) {
					this.on(handlers[i]);
				}
			}
			else if (arguments[0] instanceof Object) {
				handlers = arguments[0];
				for (name in handlers) {
					this.on(name, handlers[name]);
				}
			}
			else {
				name = arguments[0];

				if (arguments[1] instanceof Array) {
					handlers = arguments[1];
					for (i = 0, ln = handlers.length; i < ln; i++) {
						this.on(name, handlers[i]);
					}
				}
				else {
					handler = arguments[1];
					if (!(name in me._handlers)) {
						me._handlers[name] = [];
					}
					me._handlers[name].push(handler);
				}

			}
			return this;
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
});