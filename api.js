module.exports = [
    {
        description:		'Test email',
        method: 		'PUT',
        path:			'/settings/',
        fn: function( callback, args ){
            
           Homey.log('Testing email...');
           var nodemailer = require('nodemailer');
			
			var transporter = nodemailer.createTransport(
			{
				host: args.body.mail_host,
				port: args.body.mail_port,
				secure: args.body.mail_secure,
				auth: {
					user: args.body.mail_user,
					pass: args.body.mail_password
				},
				tls: {rejectUnauthorized: false} 
			});
		    
		    var mailOptions = {
				
				from: 'Homey <' + args.body.mail_from + '>',
			    to: args.body.mail_from,
			    subject: 'Testmail',
			    text: 'This is a testmail',
			    html: 'This is a testmail'
			}
		    
		    transporter.sendMail(mailOptions, function(error, info){
			    if(error){
				    callback (error, false);
			        return Homey.log(error);
			    }
			    Homey.log('Message sent: ' + info.response);
			    callback ('Message sent: ' + info.response, true);
			});
			
        }
    },
    {
        description:		'Get a list of available devices',
        method: 		'GET',
        path:			'/get_devices/',

        fn: function( callback, args ){
           
           Homey.log('Show a list of available devices');
          
           var devices = Homey.manager("drivers")
			.getDriver("synology")
			.getDevices();
			
			callback (null, devices);
          
			
        }
    },
    {
        description:		'Take a snapshot',
        method: 		'GET',
        path:			'/get_snapshot/:id',

        fn: function( callback, args ){
           
           Homey.log('Taking a snapshot: ' + JSON.stringify (args));
          
           Homey.manager("drivers")
			.getDriver("synology")
			.return_snapshot(callback, args.params.id);
		   /*
		   var snapshot = Homey.manager("drivers")
			.getDriver("synology")
			.return_snapshot(args.params.id);
			
			Homey.log("__________________________SNAPSHOT: " + JSON.stringify(snapshot));
			callback (null, snapshot);
			*/
			
        }
    }
]