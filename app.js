'use strict';

var _             = require('lodash'),
	host          = require('ip').address(),
	StringDecoder = require('string_decoder').StringDecoder,
	decoder       = new StringDecoder('utf8'),
	core          = require('./core');

core.on('ready', function (options, imports) {
	var taskQueue = imports.taskQueue;
	var messageQueue = imports.messageQueue;

	var serverAddress = host + '' + options.port;
	var server = require('./server')(options.port, host);

	server.on('ready', function () {
		process.send({
			type: 'listening'
		});
	});

	server.on('data', function (client, rawData) {
		var data = decoder.write(rawData);
		var payload = {
			server: serverAddress,
			client: client,
			data: data
		};

		taskQueue.send(payload);

		process.send({
			type: 'log',
			data: data
		});
	});

	server.on('error', function (error) {
		process.send({
			type: 'error',
			data: error
		});
	});

	server.on('close', function () {
		process.send({
			type: 'close'
		});
	});

	server.bind();

	messageQueue.subscribe(function (message) {
		if (message.server === serverAddress && _.contains(_.keys(server.getClients()), message.client)) {
			server.send(message.client, message.message, function (error) {
				if (error) {
					process.send({
						type: 'error',
						data: error
					});
				}
				else {
					process.send({
						type: 'log',
						data: {
							title: 'Message Sent',
							description: message.message
						}
					});
				}
			});
		}
	});
});