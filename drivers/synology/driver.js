"use strict";

var http = require('http');
var Synology = require('synology');
var tempdevices;
var devices = [];
var recordpath;
var sid;

module.exports.pair = function (socket) {

	// socket is a direct channel to the front-end

	// this method is run when Homey.emit('list_devices') is run on the front-end
	// which happens when you use the template `list_devices`
	socket.on('list_devices', function (data, callback) {

		Homey.log("Synology Surveillance Station app - list_devices called" );
		
		for (var key in tempdevices) {
			
			var device = tempdevices[key];
			
			Homey.log ('device=' + device["name"]);
			Homey.log ('ip=' + device["host"]);
			Homey.log ('model=' + device["model"]);
			
			devices.push(
				{
					data: {
						id			: device["id"],
						ipaddress 	: device["host"],
						model		: device["model"]
					},
					name: device["name"]
				}
			);
			
		}


		Homey.log ('callback with ' + JSON.stringify(devices));
		callback (null, devices);

	});

	// this is called when the user presses save settings button in start.html
	socket.on('get_devices', function (data, callback) {

		// Set passed pair settings in variables
		var hostname = data.hostname;
		var username = data.username;
		var password = data.password;
		
		Homey.log ( "Synology Surveillance Station app - got get_devices from front-end, hostname =" + hostname );

		var syno = new Synology({
		    host    : hostname,
		    user    : username,
		    password: password
		});
		
		syno.query('/webapi/entry.cgi', {
			api    : 'SYNO.SurveillanceStation.Camera',
			version: 1,
			method : 'List',
			query  : 'ALL'
		}, function(err, data) {
			if (err) return console.error(err);
			
			tempdevices = data.data.cameras;
			
			Homey.manager('settings').set('hostname', hostname);
			Homey.manager('settings').set('username', username);
			Homey.manager('settings').set('password', password);
			
			socket.emit ('continue', null);
		});
		

	});

	socket.on('disconnect', function(){
		Homey.log("Synology Surveillance Station - User aborted pairing, or pairing is finished");
	})
}

var hostname = Homey.manager('settings').get('hostname');
var username = Homey.manager('settings').get('username');
var password = Homey.manager('settings').get('password');

if ( !hostname || !username || !password) {
	
	Homey.log ('Either hostname, username or password is not yet filled in');
	
} else {
var syno = new Synology({
    host    : hostname,
    user    : username,
    password: password
});
Homey.log('should be connected!');

	syno.query('/webapi/auth.cgi', {
		api    		: 'SYNO.API.Auth',
		version		: 2,
		method 		: 'Login',
		account		: username,
		passwd		: password,
		session		: 'SurveillanceStation',
		format		: 'sid'
		
	}, function(err, data) {
		if (err) Homey.log(err);
		
		Homey.log(data);
		sid = data.data.sid;
	
	});
	
	
	syno.query('/webapi/query.cgi', {
		api    	: 'SYNO.API.Info',
		version	: 1,
		method 	: 'query',
		query  	: 'SYNO.SurveillanceStation.ExternalRecording',
		'_sid' 	: sid
	}, function(err, data) {
		if (err) Homey.log(err);
		
		Homey.log(data);
		
		recordpath = '/webapi/' + data["data"]["SYNO.SurveillanceStation.ExternalRecording"]["path"];
	
	});
	
}


// flow action handlers
Homey.manager('flow').on('action.startRecording', function( callback, args ){
	
	syno.query(recordpath, {
			api    		: 'SYNO.SurveillanceStation.ExternalRecording',
			version		: 2,
			method 		: 'Record',
			cameraId  	: args.device.id,
			action		: 'start',
			'_sid' 	: sid
			
		}, function(err, data) {
			
			if (err) {
				Homey.log (err);
				callback (null, false);
			}
			
			Homey.log ('result: ' + JSON.stringify(data));
			
			if (data.success) callback (null, true);
			
		});
});

Homey.manager('flow').on('action.stopRecording', function( callback, args ){
	
	syno.query(recordpath, {
			api    		: 'SYNO.SurveillanceStation.ExternalRecording',
			version		: 2,
			method 		: 'Record',
			cameraId  	: args.device.id,
			action		: 'stop',
			'_sid' 	: sid
			
		}, function(err, data) {
			
			if (err) {
				Homey.log (err);
				callback (null, false);
			}
			
			Homey.log ('result: ' + JSON.stringify(data));
			
			if (data.success) callback (null, true);
			
		});
});

// CONDITIONS:
/*
Homey.manager('flow').on('condition.recording', function(callback, args){
});
*/
//