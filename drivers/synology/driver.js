"use strict";

var http = require('http');
var Synology = require('synology');
var nodemailer = require('nodemailer');
var tempdevices;
var devices = [];
var recordpath, snappath;
var sid;
var mail_user, mail_pass, mail_host, mail_port, mail_from;

Homey.manager('settings').on('set', function (name) {

	Homey.log('variable ' + name + ' has been set');
	updatesettings();
	
});


function updatesettings() {
	
	//mail settings (if any)
	mail_user = Homey.manager('settings').get('mail_user');
	mail_pass = Homey.manager('settings').get('mail_password');
	mail_host = Homey.manager('settings').get('mail_host');
	mail_port = Homey.manager('settings').get('mail_port');
	mail_from = Homey.manager('settings').get('mail_from');

	Homey.log('Backend settings updated');

}

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
		var port = data.port;
		
		Homey.log ( "Synology Surveillance Station app - got get_devices from front-end, hostname =" + hostname );

		var syno = new Synology({
		    host    : hostname,
		    user    : username,
		    password: password,
		    port	: port
		});
		
		syno.query('/webapi/entry.cgi', {
			api    : 'SYNO.SurveillanceStation.Camera',
			version: 1,
			method : 'List',
			query  : 'ALL'
		}, function(err, data) {
			
			if (err) {
				
				Homey.log('CONNECTerror: ' + err);	
				socket.emit('error', err);
				return callback (null, err);
			}
			
			tempdevices = data.data.cameras;
			
			Homey.manager('settings').set('hostname', hostname);
			Homey.manager('settings').set('username', username);
			Homey.manager('settings').set('password', password);
			Homey.manager('settings').set('port', port);
			
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
var port	 = Homey.manager('settings').get('port');

updatesettings();

if (!port) port = 5000;

if ( !hostname || !username || !password) {
	
	Homey.log ('Either hostname, username or password is not yet filled in');
	
} else {
	var syno = new Synology({
	    host    : hostname,
	    user    : username,
	    password: password,
	    port	: port
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
	
	//get recording API path
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
	
	//get snapshot API path
	syno.query('/webapi/query.cgi', {
		api    	: 'SYNO.API.Info',
		version	: 1,
		method 	: 'query',
		query  	: 'SYNO.SurveillanceStation.SnapShot',
		'_sid' 	: sid
	}, function(err, data) {
		if (err) Homey.log(err);
		
		Homey.log(data);
		
		snappath = '/webapi/' + data["data"]["SYNO.SurveillanceStation.SnapShot"]["path"];
	
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
			
			if (data.success) callback (null, true); else callback (null, false);
			
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
			
			if (data.success) callback (null, true); else callback (null, false);
			
		});
});

Homey.manager('flow').on('action.snapshot', function (callback, args) {

	Homey.log('take snapshot - ' + snappath);
	
	syno.query(snappath, {
			api    		: 'SYNO.SurveillanceStation.SnapShot',
			version		: 1,
			method 		: 'TakeSnapshot',
			camId  		: args.device.id,
			blSave		: true,
			dsId		: 0,
			'_sid' 		: sid
			
		}, function(err, data) {
			
			//if blSave is set to false, you get data.imageData with binary data of the image
			if (err) {
				Homey.log (err);
				callback (null, false);
			}
			
			Homey.log ('result: ' + JSON.stringify(data));
			
			if (data.success) callback (null, true); else callback (null, false);
			
		});

});

Homey.manager('flow').on('action.snapshotmail', function (callback, args) {

	Homey.log('take snapshot - ' + snappath);
	
	if ( typeof mail_user !== 'undefined' && typeof mail_pass !== 'undefined' && typeof mail_host !== 'undefined' && typeof mail_port !== 'undefined' && typeof mail_from !== 'undefined') {
	
		syno.query(snappath, {
				api    		: 'SYNO.SurveillanceStation.SnapShot',
				version		: 1,
				method 		: 'TakeSnapshot',
				camId  		: args.device.id,
				blSave		: false,
				dsId		: 0,
				'_sid' 		: sid
				
			}, function(err, data) {
				
				if (err) {
					Homey.log (err);
					callback (null, false);
				}
				
				Homey.log ('result: ' + JSON.stringify(data));
				
				var transporter = nodemailer.createTransport(
				{
					host: mail_host,
					port: mail_port,
					auth: {
						user: mail_user,
						pass: mail_pass
					},
					tls: {rejectUnauthorized: false} 
				});
			    
			    var mailOptions = {
					
					from: 'Homey <' + mail_from + '>',
				    to: args.mailto,
				    subject: 'Snapshot from camera #' + args.device.id,
				    text: '',
				    html: '',
			    
				    attachments: [
				        {   
					        filename: data.data.fileName,
				            content: new Buffer(data.data.imageData, 'base64')
				        }
			        ]
			    }
			    
			    transporter.sendMail(mailOptions, function(error, info){
				    if(error){
					    callback (null, false);
				        return Homey.log(error);
				    }
				    Homey.log('Message sent: ' + info.response);
				    callback (null, true);
				});
				
			});
			
		} else {
			
			Homey.log('Not all required variables for mailing have been set');
		    
			callback (null, false);
			
		}
	
});

// CONDITIONS:
Homey.manager('flow').on('condition.available', function(callback, args){
	
	syno.query('/webapi/entry.cgi', {
			api    		: 'SYNO.SurveillanceStation.Camera',
			version		: 1,
			method 		: 'GetInfo',
			cameraIds	: args.device.id
		}, function(err, data) {
			
			if (err) {
				Homey.log (err);
				callback (null, false);
			}
			
			Homey.log ('result: ' + JSON.stringify(data));
			if (data.data.cameras[0].camStatus == 1) callback (null, true); else callback (null, false);
			
		});
});


Homey.manager('flow').on('condition.recording', function(callback, args){
	
	syno.query('/webapi/entry.cgi', {
			api    		: 'SYNO.SurveillanceStation.Camera',
			version		: 1,
			method 		: 'GetInfo',
			cameraIds	: args.device.id
		}, function(err, data) {
			
			if (err) {
				Homey.log (err);
				callback (null, false);
			}
			
			Homey.log ('result: ' + JSON.stringify(data));
			Homey.log('recStatus: ' + data.data.cameras[0].recStatus);
			
			/*
				0: None recording schedule
				1: Continue recording schedule
				2: Motion detect recording schedule
				3: Digital input recording schedule
				4: Digital input recording schedule
				5: Manual recording schedule
				6: External
				7: Analytics
			*/
			
			if (data.data.cameras[0].recStatus != 0) callback (null, true); else callback (null, false);
			
		});
});
//