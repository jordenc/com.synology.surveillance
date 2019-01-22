"use strict";

const Homey = require('homey');
var http = require('http');
var device_data;
var driver;
let device = this;

var snappath;
var sid;
var enablepolling;

module.exports = class SynologyDevice extends Homey.Device {
	
	onInit() {
	
		this.log('device init');
        this.log('name:', this.getName());
        this.log('class:', this.getClass());
        
        device_data = this.getData();
        device = this;
        
        let settings = this.getSettings();
        
        driver = this.getDriver();
        
        this.log ("device_data = " + JSON.stringify (device_data));
        this.log ("settings = " + JSON.stringify(settings));
        
        //migrate from older versions (< 1.1.0):
		if (typeof device_data.username === "undefined" || device_data.username === '') {
			
			device_data.hostname = Homey.ManagerSettings.get('hostname');
			device_data.username = Homey.ManagerSettings.get('username');
			device_data.password = Homey.ManagerSettings.get('password');
			device_data.port	 = Homey.ManagerSettings.get('port');
	
		}
		
		//migrate devices from < 1.2.6
		if (typeof device_data.camid === "undefined" || device_data.camid === '') {
		
			device_data.camid = device_data.id;
			console.log('Migrating device added before version 1.2.6: #' + device_data.id);
			
		}
		
        this.log ("device_data = " + JSON.stringify (device_data));
        this.log ("settings = " + JSON.stringify(settings));
        
        snappath = '/webapi/entry.cgi';
		
		enablepolling = Homey.ManagerSettings.get('enablepolling');
		
		console.log("enablepolling = " + enablepolling);
		
		if (enablepolling) setTimeout(function() {
			polling (true);
		}, 15000);
	
		Homey.ManagerSettings.on('set', function(){
			
			console.log ("Settings changed");
			
			var temp_enablepolling = Homey.ManagerSettings.get('enablepolling');
			
			if (temp_enablepolling != enablepolling) {
				
				if (temp_enablepolling) {
					
					setTimeout(function() {
						polling (true);
					}, 15000);
					
				}
		
			}
			
			enablepolling = temp_enablepolling;
			
		});
	
		function polling(init) {
			
			//if (enablepolling) setTimeout(function() {polling}, 15000);
			if (enablepolling) setTimeout(function() {
				polling (false);
			}, 15000);
				
			console.log ('checking device ' + JSON.stringify (device));
			
			var options = {
				api 		: 'SYNO.SurveillanceStation.Camera',
				version		: '8',
				method		: 'GetInfo',
				cameraIds	: device_data.camid,
				basic		: true
			};
		
			login(function (sid) {
				options.sid = sid;
				execute_command (options, snappath, false, false, function (data) {
					
					//first initialisation, only save the status, don't trigger
					if (init) {
						
						device_data.recStatus = data.data.cameras[0].recStatus
						device_data.camStatus = data.data.cameras[0].camStatus;
						
					} else {
						
						if (data.data.cameras[0].recStatus != device_data.recStatus) {
							
							device_data.recStatus = data.data.cameras[0].recStatus;
							
							console.log('recording status: ' + data.data.cameras[0].recStatus);
							
							if (device_data.recStatus != 0) {
								
								driver.ready(() => {
						            driver.triggerrecording_starts( device, {}, {} );
						        });
							        
							} else {
								
								driver.ready(() => {
						            driver.triggerrecording_stops( device, {}, {} );
						        });
						        
							}
						}
						
						if (data.data.cameras[0].camStatus != device_data.camStatus) {
							
							device_data.camStatus = data.data.cameras[0].camStatus;
	
							console.log('cam status: ' + data.data.cameras[0].camStatus);
							
							if (device_data.camStatus == 1) {
								
								driver.ready(() => {
						            driver.triggercam_available( device, {}, {} );
						        });
						        
							} else {
								
								driver.ready(() => {
						            driver.triggercam_unavailable( device, {}, {} );
						        });
						        
							}
							
						}
						
					}
					
				});	
			});
		
		}
		
		function login(cmdcallback) {
			
			var options = {
				api 		: 'SYNO.API.Auth',
				version		: 6,
				method		: 'Login',
				account		: device_data.username,
				passwd		: device_data.password,
				session		: 'SurveillanceStation',
				format		: 'sid'
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
			
			
			if (device_data.hostname && device_data.port) {
			
				try {
					http.get({
				        host: device_data.hostname,
				        port: device_data.port,
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
				
				console.log ('No hostname or port set: ' + device_data.hostname + ':' + device_data.port);
				
			}
		
		}
	
		function logout (credentials) {
			
			var options = {
				api			: 'SYNO.API.Auth',
				version		: '2',
				method		: 'Logout',
				session		: 'SurveillanceStation',
				sid			: credentials.sid
			};
			
			execute_command (options, '/webapi/auth.cgi', false, 1);
			
		}



		//ACTIONS:
		
		let startRecording = new Homey.FlowCardAction('startRecording');
		startRecording
			.register()
			.registerRunListener((args, state, callback) => {
				
				console.log ("startRecording");
				console.log ("args = " + JSON.stringify (args));
				
				var options = {
					api 		: 'SYNO.SurveillanceStation.ExternalRecording',
					version		: '2',
					method		: 'Record',
					cameraId	: device_data.camid,
					action		: 'start'
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, callback);
				});
			
			});
			
		let stopRecording = new Homey.FlowCardAction('stopRecording');
		stopRecording
			.register()
			.registerRunListener((args, state, callback) => {
				
				console.log ("stopRecording");
				
				var options = {
					api 		: 'SYNO.SurveillanceStation.ExternalRecording',
					version		: '2',
					method		: 'Record',
					cameraId	: device_data.camid,
					action		: 'stop'
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, callback);
				});
	
			
			});
		
		let snapshot = new Homey.FlowCardAction('snapshot');
		snapshot
			.register()
			.registerRunListener((args, state, callback) => {
				
				console.log ("snapshot via " + snappath);
				//console.log ("args = " + JSON.stringify (args));
				
				var options = {
					api 		: 'SYNO.SurveillanceStation.SnapShot',
					version		: '1',
					method		: 'TakeSnapshot',
					camId		: device_data.camid,
					blSave		: 'true',
					dsId		: '0'
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, false, false, function (data) {
						
						return callback( data.data.success );  
						
					});	
				});
	
			});
	
	
	
		let snapshottoken = new Homey.FlowCardAction('snapshottoken');
		snapshottoken
			.register()
			.registerRunListener((args, state, callback) => {
				
				console.log ("snapshot via " + snappath);
				
				var options = {
					api 		: 'SYNO.SurveillanceStation.SnapShot',
					version		: '1',
					method		: 'TakeSnapshot',
					camId		: device_data.camid,
					blSave		: 'false',
					dsId		: '0'
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, false, false, function (data) {
						
						console.log("Snapshot complete: " + data.data.fileName);
						
						let myImage = new Homey.Image('jpg');
					    
					    var body = new Buffer(data.data.imageData, 'base64');
					    
				        myImage.setBuffer ( body );
					    myImage.register()
					        .then(() => {
					
					            // create a token & register it
					            let myImageToken = new Homey.FlowToken('snapshot', {
					                type: 'image',
					                title: 'snapshot'
					            })
					            
					            myImageToken
					                .register()
					                .then( () => {
					                    myImageToken.setValue( myImage )
					                        .then( console.log( 'setValue') )
					                })
								
									driver.ready(() => {
							            driver.triggersnapshot_taken( device, {snapshot: myImage}, {} );
							        });
							        
									return callback( data.success );  
	
						    }).catch(console.error)
								        
											
					});	
				});
	
			});
			
		let enable = new Homey.FlowCardAction('enable');
		enable
			.register()
			.registerRunListener((args, state, callback) => {
				
				console.log ("enable");
				
				var options = {
					api 		: 'SYNO.SurveillanceStation.Camera',
					version		: '9',
					method		: 'Enable',
					idList		: device_data.camid
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, false, false, function (data) {
						
						if (data.success == true) callback (null, true); else callback (data.error.code, false);
						
						//logout(options);
						
					});
				
				});
	
			
			});
			
		let disable = new Homey.FlowCardAction('disable');
		disable
			.register()
			.registerRunListener((args, state, callback) => {
				
				console.log ("disable");
				
				var options = {
					api 		: 'SYNO.SurveillanceStation.Camera',
					version		: '9',
					method		: 'Disable',
					idList		: device_data.camid
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, false, false, function (data) {
						
						if (data.data.success == true) callback (null, true); else callback (data.error.code, false);
						
						//logout(options);
						
					});
				
				});
	
			
			});
		
		
		//CONDITIONS:
		let recording = new Homey.FlowCardCondition('recording');
		recording
		    .register()
		    .registerRunListener(( args, state, callback ) => {
		
				console.log ("recording?");
				
				var options = {
					api 		: 'SYNO.SurveillanceStation.Camera',
					version		: '1',
					method		: 'GetInfo',
					cameraIds	: device_data.camid
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, false, false, function (data) {
						
						if (data.data.cameras[0].recStatus != 0) callback (null, true); else callback (null, false);
						
					});	
				});
	
		
		    })
		    
		let available = new Homey.FlowCardCondition('available');
		available
		    .register()
		    .registerRunListener(( args, state, callback ) => {
			
				console.log ("available?");
				var options = {
					api 		: 'SYNO.SurveillanceStation.Camera',
					version		: '1',
					method		: 'GetInfo',
					cameraIds	: device_data.camid
				};
			
				login(function (sid) {
					options.sid = sid;
					execute_command (options, snappath, false, false, function (data) {
						
						if (data.data.cameras[0].camStatus == 1) callback (null, true); else callback (null, false);
						
					});	
				});
		
		    })
	
	
	}
		
}