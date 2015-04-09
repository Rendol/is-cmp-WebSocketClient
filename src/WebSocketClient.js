/**
 * Infinity Systems component WebSocketClient
 *
 * @author Igor Sapegin aka Rendol <sapegin.in@gmail.com>
 */
IS.reg('components.WebSocketClient', function () {
	return $.extend({}, {

		// Options
		host: 'localhost',
		port: 8001,
		registerId: null,
		sessionId: null,

		// Private properties
		_sendQueue: [],
		_sendCallbacks: [],
		_sendProcessStarted: false,

		constructor: function (data) {
			var me = $.extend(this, data);
			// Веб-Сокет
			me.connect = new WebSocketClient(
				$.extend(
					{
						host: me.host,
						port: me.port,
						onOpen: function () {
							me.msg(
								{
									register: {
										id: me.registerId,
										sessionId: me.sessionId
									}
								},
								function () {
									me.trigger('Connect.register');
								}
							);

						},
						onMessage: function (data) {
							for (var category in data) {
								if (category != 'callback' && category != 'Exception') {
									for (var name in data[category]) {
										if (category != 'Log') {
											console.log('trigger', category + '.' + name, data[category][name]);
										}
										me.trigger(category + '.' + name, data[category][name]);
									}
								}
							}
							if ('callback' in data) {
								me.runCallback(data.callback);
							}
							if ('Exception' in data) {
								console.log(data.Exception);
							}
						}
					},
					me.connect
				)
			);
			return this;
		},
		msg: function (data, callback) {
			this._sendQueue.push({
				data: data,
				callback: callback
			});
			this.run();
		},
		run: function () {
			var me = this;
			if (!me._sendProcessStarted) {
				me._sendProcessStarted = true;
				me.iterationCallback();
			}
		},
		runCallback: function (index) {
			this._sendCallbacks[index]();
		},
		iterationCallback: function () {
			var me = this;
			var task = me._sendQueue.shift();
			if (task) {
				task.data['callback'] = me._sendCallbacks.length;
				me._sendCallbacks.push(function () {
					if (task.callback) {
						task.callback();
					}
					me.iterationCallback()
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
		handlers: {},
		trigger: function (name, args) {
			var handlers = this.handlers;
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
					if (!(name in this.handlers)) {
						me.handlers[name] = [];
					}
					me.handlers[name].push(handler);
				}

			}
			return this;
		}
	});
});