"use strict";

const Homey = require('homey');
var http = require('http');
var tempdevices;
var snappath;
var sid;
var temp_data;

module.exports = class SynologyDriver extends Homey.Driver {
	
	onInit() {
	
		this.log("Driver init...");
		
		snappath = '/webapi/entry.cgi';
		
		this._Triggerrecording_starts = new Homey.FlowCardTriggerDevice('recording_starts')
            .register()
		this._Triggerrecording_stops = new Homey.FlowCardTriggerDevice('recording_stops')
            .register()
		this._Triggercam_available = new Homey.FlowCardTriggerDevice('cam_available')
            .register()
		this._Triggercam_unavailable = new Homey.FlowCardTriggerDevice('cam_unavailable')
            .register()
		this._Triggersnapshot_taken = new Homey.FlowCardTriggerDevice('snapshot_taken')
            .register()
		
	}
	
	triggerrecording_starts( device, tokens, state ) {
        this._Triggerrecording_starts
            .trigger( device, tokens, state )
                .then( this.log )
                .catch( this.error )
    }
    
	triggerrecording_stops( device, tokens, state ) {
        this._Triggerrecording_stops
            .trigger( device, tokens, state )
                .then( this.log )
                .catch( this.error )
    }
    
    triggercam_available( device, tokens, state ) {
        this._Triggercam_available
            .trigger( device, tokens, state )
                .then( this.log )
                .catch( this.error )
    }
    
    triggercam_unavailable( device, tokens, state ) {
        this._Triggercam_unavailable
            .trigger( device, tokens, state )
                .then( this.log )
                .catch( this.error )
    }
    
    triggersnapshot_taken( device, tokens, state ) {
        this._Triggersnapshot_taken
            .trigger( device, tokens, state )
                .then( this.log ("snapshot triggered") )
                .catch( this.error ("snapshot trigger error") )
    }
    
    onPair (socket) {
	    
	    console.log("Synology Surveillance Station app - onPair called" );
	    
	    function login(credentials, cmdcallback) {
		
			var options = {
				api 		: 'SYNO.API.Auth',
				version		: 6,
				method		: 'Login',
				account		: credentials.username,
				passwd		: credentials.password,
				session		: 'SurveillanceStation',
				format		: 'sid',
				hostname	: credentials.hostname,
				port		: credentials.port
			};
			
			execute_command (options, '/webapi/auth.cgi', false, function(sid) {
				
				cmdcallback(sid);
				
			});
			
		}
		
		function execute_command (options, path, callback, logincall, outputcallback) {
			
			console.log('[CMD] ' + options.method + ' called');
			
			var query = '?';
			
			try {
				for (var key in options) {
					
					if (key != 'hostname' && key != 'port' && key != 'username' && key != 'password') {
			
						//console.log ('key = ' + key);
						//console.log ('val = ' + options[key]);
						if (query != '?') query = query + '&';
						console.log('key = ' + key + ', val = ' + options[key]);
						
						if (key == 'sid') {
							
							query = query + '_sid=' + options[key].toString();
							//query = query + '&sid=' + options[key].toString();
							
						} else {
						
							query = query + key + '=' + options[key].toString();
						
						}
						
					}
					
			    }
			} catch (e) {
				
				console.log('[CMD] ' + options.method + ' ERROR: ' + e);
				
			}
			
			
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
					        
					        console.log("query = " + path + query);
					        console.log('RESPONSE END ' + JSON.stringify (body));
					        
					        //if (!logincall) logout (options);
					        
					        if (outputcallback) {
						        
						        try {
									var parsed = JSON.parse(body);
									
									if (parsed.success == true) {
						
										console.log ("parsed outputcallback true");
										outputcallback (parsed, true);
										//Promise.resolve(true);
																					
									} else {
										
										console.log ("parsed outputcallback false");
										callback (null, false);
										//Promise.resolve(false);
										
									}
									
								} catch (e) {
									
									console.log('error: ' + e);
								}
						        
					        }
				
							if (callback) {
								
								try {
									var parsed = JSON.parse(body);
									
									if (parsed.success == true) {
						
										console.log('callback true');
										callback (null, true);
														
									} else {
										
										console.log('callback false');
										callback (null, false);
										
									}
									
									//console.log('[BODY] ' + body);
								} catch (e) {
									
									callback (e, false);
									
								}
								
							} else {
								
								try {
									var parsed = JSON.parse(body);
									
									//console.log('parsed='+JSON.stringify(parsed));
									if (typeof logincall === "function") logincall(parsed.data.sid);	
				
								} catch (e) {
									
									if (typeof logincall === "function") logincall(false);
									
								}
								
							}
							
				        });
				        response.on('error', function (e) {
					        
					        console.log('RESPONSE ERROR: ' + e);
					        callback (e, false);
							
				        });
				    })
				    .on('error', function (e) {
					    
					    console.log('HTTP.GET ERROR: ' + e);
					    if (typeof callback == 'function') callback (e, false);
					        
					});
				} catch (e) {
					
					console.log('[ERROR HTTP.GET] ' + e);
					
				}
				
			} else {
				
				console.log ('No hostname or port set: ' + options.hostname + ':' + options.port);
				
			}
		
		}
		
	    // this is called when the user presses save settings button in start.html
		socket.on('get_devices', function (data, callback) {
			
			console.log ( "Synology Surveillance Station app - got get_devices from front-end, hostname =" + data.hostname );
			
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
			
			temp_data = data;
								
			login(options, function (sid) {
				options.sid = sid;
				
				execute_command (options, snappath, false, false, function (data) {
					
					console.log('data.data.camera = ' + JSON.stringify(data.data.cameras));
					
					tempdevices = data.data.cameras;

					
					socket.emit ('continue', null);
					
				});	
				
			});
			
			
		});
		
    
    
		socket.on('list_devices', function( data, callback ) {
		
			console.log("Synology Surveillance Station app - list_devices called");
			
			var new_devices = [];
			
			for (var key in tempdevices) {
				
				var device = tempdevices[key];
				
				console.log ('device=' + device.name);
				
				new_devices.push(
					{
						data: {
							id			: device.host + '_' + device.id,
							camid		: device.id,
							ipaddress 	: device.host,
							model		: device.model,
							test		: 'test123',
							username	: temp_data.username,
							password	: temp_data.password,
							hostname	: temp_data.hostname,
							port		: temp_data.port
							
						},
						name: device.name
					}
				);
				
			};
	
	
			console.log ('callback with ' + JSON.stringify(new_devices));
			callback (null, new_devices);
			
		});
	
	}
		
}
