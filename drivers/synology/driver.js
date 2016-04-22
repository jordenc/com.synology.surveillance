"use strict";

var http = require('http');
var Synology = require('synology');
var tempdevices;
var devices = [];

module.exports.pair = function (socket) {
	
	function eachRecursive(obj)
{
    for (var k in obj)
    {
        if (typeof obj[k] == "object" && obj[k] !== null)
            eachRecursive(obj[k]);
        else
            // do something... 
            Homey.log (k + ' => ' + obj[k]);
    }
}

	// socket is a direct channel to the front-end

	// this method is run when Homey.emit('list_devices') is run on the front-end
	// which happens when you use the template `list_devices`
	socket.on('list_devices', function (data, callback) {

		Homey.log("Synology Surveillance Station app - list_devices called" );
		
		/*
			for (var key in tempdevices) {
				
				if (tempdevices.hasOwnProperty(key)) {
					Homey.log(key + " -> " + tempdevices[key]);
	  			}
	  			
			}
		*/
		
		//camIP
		//camName
		//camIdOnRecServer
		//camModel
		
		for (var key in tempdevices) {
			
			var device = tempdevices[key];
			
			Homey.log ('device=' + device["name"]);
			Homey.log ('ip=' + device["host"]);
			Homey.log ('model=' + device["model"]);
			
			devices.push(
				{
					data: {
						id			: device["host"],
						ipaddress 	: device["host"],
						model		: device["model"]
					},
					name: device["name"]
				}
			);
				
			//Homey.log ('key ' + key + ' = ' + JSON.stringify(device));
			/*
			for (var key in device) {
				
				if (device.hasOwnProperty(key)) {
					Homey.log(key + " -> " + device[key]);
	  			}
	  			
	  			devices.push(
					[{
						data: {
							id			: device[key]["id"],
							ipaddress 	: device[key]["host"],
						},
						name: device[key]["name"]
					}]	
				);
	  			
			}
			*/
			//Homey.log ('Adding ' + tempdevices[key]["camName"]);
		

			
		}
		//eachRecursive (tempdevices);
		/*
		var devices = [{
			data: {
				id			: tempIP,
				ipaddress 	: tempIP
			}
		}];
		*/
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
			
			//Homey.log(data);
//			tempdevices = JSON.parse(data);
			tempdevices = data.data.cameras;
			
			socket.emit ('continue', null);
		});
		

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