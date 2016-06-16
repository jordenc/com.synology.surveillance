"use strict";

var http = require('http');
var nodemailer = require('nodemailer');
var tempdevices, tempdata;
var devices = [];
var recordpath, snappath;
var sid;
var mail_user, mail_pass, mail_host, mail_port, mail_from, mail_secure;
var enablepolling;

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
	mail_secure = Homey.manager('settings').get('mail_secure');
	
	enablepolling = Homey.manager('settings').get('enablepolling');
	if (enablepolling) setTimeout(polling (true), 15000);

}

module.exports.init = function(devices_data, callback) {
	
	devices_data.forEach(function initdevice(device) {
	   
	    //migrate from older versions (< 1.1.0):
		if (typeof device.username === "undefined" || device.username === '') {
			
			device.hostname = Homey.manager('settings').get('hostname');
			device.username = Homey.manager('settings').get('username');
			device.password = Homey.manager('settings').get('password');
			device.port	 = Homey.manager('settings').get('port');
	
		}
		
		Homey.log('add device: ' + JSON.stringify(device));
			    
	    devices[device.id] = device;
	    
	});
	
	
	enablepolling = Homey.manager('settings').get('enablepolling');
	if (enablepolling) setTimeout(polling (true), 15000);
	Homey.log('enablepolling = ' + enablepolling);
	
	callback (null, true);
	
};

module.exports.deleted = function( device_data ) {
    
    Homey.log('deleted: ' + JSON.stringify(device_data));
    
    devices[device_data.id] = [];
	
};

	
module.exports.pair = function (socket) {

	// socket is a direct channel to the front-end

	// this method is run when Homey.emit('list_devices') is run on the front-end
	// which happens when you use the template `list_devices`
	socket.on('list_devices', function (data, callback) {

		Homey.log("Synology Surveillance Station app - list_devices called" );
		
		var new_devices = [];
		
		for (var key in tempdevices) {
			
			var device = tempdevices[key];
			
			Homey.log ('device=' + device.name);
			
			devices.push(
				{
					id			: device.id,
					ipaddress 	: device.host,
					model		: device.model,
					username	: tempdata.username,
					password	: tempdata.password,
					hostname	: tempdata.hostname,
					port		: tempdata.port,
					name		: device.name
				}
			);
			
			new_devices.push(
				{
					data: {
						id			: device.id,
						ipaddress 	: device.host,
						model		: device.model,
						username	: tempdata.username,
						password	: tempdata.password,
						hostname	: tempdata.hostname,
						port		: tempdata.port
						
					},
					name: device.name
				}
			);
			
		};


		Homey.log ('callback with ' + JSON.stringify(new_devices));
		callback (null, new_devices);

	});

	// this is called when the user presses save settings button in start.html
	socket.on('get_devices', function (data, callback) {
		
		Homey.log ( "Synology Surveillance Station app - got get_devices from front-end, hostname =" + data.hostname );
		
		var options = {
			
			api 		: 'SYNO.SurveillanceStation.Camera',
			version	: '1',
			method	: 'List',
			query	: 'ALL',
			hostname : data.hostname,
			username : data.username,
			password : data.password,
			port : data.port
			
		};
		
		login(data, function (sid) {
			options._sid = sid;
			tempdata = data;
			
			execute_command (options, snappath, false, false, function (data) {
				
				Homey.log('data.data.camera = ' + JSON.stringify(data.data.cameras));
				
				tempdevices = data.data.cameras;
				
				socket.emit ('continue', null);
				
			});	
			
		});
		
		
	});

	socket.on('disconnect', function(){
		Homey.log("Synology Surveillance Station - User aborted pairing, or pairing is finished");
	});
}

updatesettings();

snappath = '/webapi/entry.cgi';


// flow action handlers
Homey.manager('flow').on('action.startRecording', function( callback, args ){
	
	var options = {
		api 		: 'SYNO.SurveillanceStation.ExternalRecording',
		version		: '2',
		method		: 'Record',
		cameraId	: args.device.id,
		action		: 'start',
		hostname 	: args.device.hostname,
		username 	: args.device.username,
		password 	: args.device.password,
		port 		: args.device.port
	};

	login(options, function (sid) {
		options._sid = sid;
		execute_command (options, snappath, callback);
	});
	
});

Homey.manager('flow').on('action.stopRecording', function( callback, args ){
	
	var options = {
		api 		: 'SYNO.SurveillanceStation.ExternalRecording',
		version		: '2',
		method		: 'Record',
		cameraId	: args.device.id,
		action		: 'stop',
		hostname 	: args.device.hostname,
		username 	: args.device.username,
		password 	: args.device.password,
		port 		: args.device.port
	};

	login(options, function (sid) {
		options._sid = sid;
		execute_command (options, snappath, callback);
	});
	
});

function login(credentials, cmdcallback) {
	
	var options = {
		api 		: 'SYNO.API.Auth',
		version		: '2',
		method		: 'Login',
		account		: credentials.username,
		passwd		: credentials.password,
		session		: 'SurveillanceStation',
		format		: 'sid',
		session		: 'NodeSynologyAPI' + Math.round(Math.random() * 1e9),	
		hostname	: credentials.hostname,
		port		: credentials.port
	};
	
	execute_command (options, '/webapi/auth.cgi', false, function(sid) {
		
		cmdcallback(sid);
		
	});
	
}

function execute_command (options, path, callback, logincall, outputcallback) {
	
	Homey.log('[CMD] ' + options.method + ' called');
	
	var query = '?';
	
	try {
		for (var key in options) {
			
			if (key != 'hostname' && key != 'port' && key != 'username' && key != 'password') {
	
				if (query != '?') query = query + '&';
				//Homey.log('key = ' + key + ', val = ' + options[key]);
				query = query + key + '=' + options[key].toString();
				
			}
			
	    }
	} catch (e) {
		
		Homey.log('[CMD] ' + options.method + ' ERROR: ' + e);
		
	}
	
	//Homey.log('query = ' + path + JSON.stringify(query));
	
	if (options.hostname && options.port) {
	
		try {
			http.get({
		        host: options.hostname,
		        port: options.port,
		        path: path + query
		    }, function(response) {
		        // Continuously update stream with data
		        var body = '';
		        response.on('data', function(d) {
		            body += d;
		        });
		        response.on('end', function() {
			        
			        Homey.log('RESPONSE END ' + JSON.stringify (body));
			        
			        if (!logincall) logout (options);
			        
			        if (outputcallback) {
				        
				        try {
							var parsed = JSON.parse(body);
							
							if (parsed.success == true) {
				
								outputcallback (parsed);
																			
							} else {
								
								//callback (null, false);
								
							}
							
						} catch (e) {
							
							Homey.log('error: ' + e);
						}
				        
			        }
		
					if (callback) {
						
						try {
							var parsed = JSON.parse(body);
							
							if (parsed.success == true) {
				
								callback (null, true);
												
							} else {
								
								callback (null, false);
								
							}
							
							//Homey.log('[BODY] ' + body);
						} catch (e) {
							
							callback (e, false);
							
						}
						
					} else {
						
						try {
							var parsed = JSON.parse(body);
							
							//Homey.log('parsed='+JSON.stringify(parsed));
							if (typeof logincall === "function") logincall(parsed.data.sid);	
		
						} catch (e) {
							
							if (typeof logincall === "function") logincall(false);
							
						}
						
					}
					
		        });
		        response.on('error', function (e) {
			        
			        Homey.log('RESPONSE ERROR: ' + e);
			        callback (e, false);
					
		        });
		    });
		} catch (e) {
			
			Homey.log('[ERROR HTTP.GET] ' + e);
			
		}
		
	} else {
		
		Homey.log ('No hostname or port set: ' + options.hostname + ':' + options.port);
		
	}

}

function logout (credentials) {
	
	var options = {
		api			: 'SYNO.API.Auth',
		version		: '2',
		method		: 'Logout',
		session		: 'SurveillanceStation',
		hostname	: credentials.hostname,
		port		: credentials.port,
		_sid		: credentials._sid
	};
	
	execute_command (options, '/webapi/auth.cgi', false, 1);
	
}

Homey.manager('flow').on('action.snapshot', function (callback, args) {
	
	Homey.log('args = ' + JSON.stringify(args));
	
	var options = {
		api 		: 'SYNO.SurveillanceStation.SnapShot',
		version		: '1',
		method		: 'TakeSnapshot',
		camId		: args.device.id,
		blSave		: 'true',
		dsId		: '0',
		hostname 	: args.device.hostname,
		username 	: args.device.username,
		password 	: args.device.password,
		port 		: args.device.port
	};

	login(options, function (sid) {
		options._sid = sid;
		execute_command (options, snappath, callback);
		
		logout(options);
	
	});
	
});

Homey.manager('flow').on('action.snapshotmail', function (callback, args) {

	Homey.log('take snapshot & mail - ' + snappath);
	
	if ( typeof mail_user !== 'undefined' && typeof mail_pass !== 'undefined' && typeof mail_host !== 'undefined' && typeof mail_port !== 'undefined' && typeof mail_from !== 'undefined' && mail_user != '' && mail_pass != '' && mail_host != '' && mail_port != '') {
	
		var options = {
			api 		: 'SYNO.SurveillanceStation.SnapShot',
			version		: '1',
			method		: 'TakeSnapshot',
			camId		: args.device.id,
			blSave		: 'false',
			dsId		: '0',
			hostname 	: args.device.hostname,
			username 	: args.device.username,
			password 	: args.device.password,
			port 		: args.device.port
		};
	
		login(options, function (sid) {
			options._sid = sid;
			execute_command (options, snappath, false, false, function (data) {
				
				var transporter = nodemailer.createTransport(
				{
					host: mail_host,
					port: mail_port,
					secure: mail_secure,
					auth: {
						user: mail_user,
						pass: mail_pass
					},
					tls: {rejectUnauthorized: false} 
				});
				
				Homey.log('devices=' + JSON.stringify (devices));
				Homey.log('args=' + JSON.stringify (args));
			    
			    var mailOptions = {
					
					from: 'Homey <' + mail_from + '>',
				    to: args.mailto,
				    subject: __("snapshot_from") + ' #' + devices[args.device.id].id,
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
		});
			
	} else {
		
		Homey.log(__("not_all_vars_set"));
	    
		callback (__("not_all_vars_set"), false);
		
	}
	
});

// CONDITIONS:
Homey.manager('flow').on('condition.available', function(callback, args){
	
	var options = {
		api 		: 'SYNO.SurveillanceStation.Camera',
		version		: '1',
		method		: 'GetInfo',
		cameraIds	: args.device.id,
		hostname 	: args.device.hostname,
		username 	: args.device.username,
		password 	: args.device.password,
		port 		: args.device.port
	};

	login(options, function (sid) {
		options._sid = sid;
		execute_command (options, snappath, false, false, function (data) {
			
			if (data.data.cameras[0].camStatus == 1) callback (null, true); else callback (null, false);
			
		});	
	});
	
});


Homey.manager('flow').on('condition.recording', function(callback, args){
	
	var options = {
		api 		: 'SYNO.SurveillanceStation.Camera',
		version		: '1',
		method		: 'GetInfo',
		cameraIds	: args.device.id,
		hostname 	: args.device.hostname,
		username 	: args.device.username,
		password 	: args.device.password,
		port 		: args.device.port
	};

	login(options, function (sid) {
		options._sid = sid;
		execute_command (options, snappath, false, false, function (data) {
			
			if (data.data.cameras[0].recStatus != 0) callback (null, true); else callback (null, false);
			
		});	
	});
	
});
//

function polling(init) {
	
	devices.forEach(function initdevice(device) {
		
		Homey.log ('checking device ' + JSON.stringify (device));
		
		var options = {
			api 		: 'SYNO.SurveillanceStation.Camera',
			version		: '1',
			method		: 'GetInfo',
			cameraIds	: device.id,
			hostname 	: device.hostname,
			username 	: device.username,
			password 	: device.password,
			port 		: device.port
		};
	
		login(options, function (sid) {
			options._sid = sid;
			execute_command (options, snappath, false, false, function (data) {
				
				//first initialisation, only save the status, don't trigger
				if (init) {
					
					devices[device.id].recStatus = data.data.cameras[0].recStatus
					devices[device.id].camStatus = data.data.cameras[0].camStatus;
					
				} else {
					
					if (data.data.cameras[0].recStatus != device.recStatus) {
						
						devices[device.id].recStatus = data.data.cameras[0].recStatus;
						
						Homey.log('recording status: ' + data.data.cameras[0].recStatus);
						
						if (devices[device.id].recStatus != 0) {
							Homey.manager('flow').triggerDevice('recording_starts', {}, {device: device.id});
						} else {
							Homey.manager('flow').triggerDevice('recording_stops', {}, {device: device.id});
						}
					}
					
					if (data.data.cameras[0].camStatus != device.camStatus) {
						
						devices[device.id].camStatus = data.data.cameras[0].camStatus;

						Homey.log('cam status: ' + data.data.cameras[0].camStatus);
						
						if (devices[device.id].camStatus == 1) {
							Homey.manager('flow').triggerDevice('cam_available', {}, {device: device.id});
						} else {
							Homey.manager('flow').triggerDevice('cam_unavailable', {}, {device: device.id});
						}
						
					}
					
				}
				
				if (enablepolling) setTimeout(polling, 15000);
				
				
			});	
		});
		
	});

}