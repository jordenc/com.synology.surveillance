"use strict";

var http = require('http');
var tempIP = '';
var Synology = require('node-synology-surveillance');

module.exports.pair = function (socket) {
	// socket is a direct channel to the front-end

	// this method is run when Homey.emit('list_devices') is run on the front-end
	// which happens when you use the template `list_devices`
	socket.on('list_devices', function (data, callback) {

		Homey.log("Synology Surveillance Station app - list_devices tempIP is " + tempIP);
		
		var devices = [{
			data: {
				id			: tempIP,
				ipaddress 	: tempIP
			}
		}];

		callback (null, devices);

	});

	// this is called when the user presses save settings button in start.html
	socket.on('get_devices', function (data, callback) {

		// Set passed pair settings in variables
		tempIP = data.ipaddress;
		Homey.log ( "Synology Surveillance Station app - got get_devices from front-end, tempIP =" + tempIP );

		var syno = new Synology({
		    host    : 'localhost',
		    user    : 'user',
		    password: 'userpwd'
		});


		socket.emit ('continue', null);

	});

	socket.on('disconnect', function(){
		Homey.log("Synology Surveillance Station - User aborted pairing, or pairing is finished");
	})
}

// flow action handlers

Homey.manager('flow').on('action.startRecording', function( callback, args ){
	sendCommand('%7b%22COMMAND%22:%22CLEAN_START%22%7d', args.device.ipaddress, callback); 
});

// CONDITIONS:
/*
Homey.manager('flow').on('condition.recording', function(callback, args){
});
*/
//