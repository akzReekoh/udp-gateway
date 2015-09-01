'use strict';

var server, serverAddress,
	platform = require('./platform');

/*
 * Listen for the ready event.
 */
platform.once('ready', function (options) {
	var host          = require('ip').address(),
		StringDecoder = require('string_decoder').StringDecoder,
		decoder       = new StringDecoder('utf8'),
		isJSON        = require('is-json');

	serverAddress = host + '' + options.port;

	server = require('./server')(options.port, host);

	server.on('ready', function () {
		console.log('UDP Server now listening on '.concat(host).concat(':').concat(options.port));
		platform.notifyListen();
	});

	server.on('data', function (clientAddress, rawData) {
		var data = decoder.write(rawData);

		// Verify that the incoming data is a valid JSON String. Reekoh only accepts JSON as input.
		if (isJSON(data))
			platform.processData(serverAddress, clientAddress, data);

		platform.log('Raw Data Received', data);
	});

	server.on('error', function (error) {
		console.error('Server Error', error);
		platform.handleException(error);
	});

	server.on('close', function () {
		platform.notifyClose();
	});

	server.listen();
});

/*
 * Listen for the message event. Send these messages/commands to devices to this server.
 */
platform.on('message', function (message) {
	var _ = require('lodash');

	if (message.server === serverAddress && _.contains(_.keys(server.getClients()), message.client)) {
		server.send(message.client, message.message, false, function (error) {
			if (error) {
				console.log('Message Sending Error', error);
				platform.handleException(error);
			}
			else
				platform.log('Message Sent', message.message);
		});
	}
	else if (message.client === '*') {
		server.getClients().forEach(function (client) {
			server.send(client, message.message, false, function (error) {
				if (error) {
					console.log('Message Sending Error', error);
					platform.handleException(error);
				}
				else
					platform.log('Message Sent', message.message);
			});
		});
	}
});
