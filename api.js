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
    }
]