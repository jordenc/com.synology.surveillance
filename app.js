"use strict";

function init() {
	
	Homey.log("Init Synology Surveillance Station app - done");
	
}

function testmail (args, callback) {
	
	var nodemailer = require('nodemailer');
	
	var transporter = nodemailer.createTransport(
	{
		host: args.mail_host,
		port: args.mail_port,
		auth: {
			user: args.mail_user,
			pass: args.mail_password
		},
		tls: {rejectUnauthorized: false} 
	});
    
    var mailOptions = {
		
		from: 'Homey <' + args.mail_from + '>',
	    to: args.mail_from,
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


module.exports.testmail = testmail;

module.exports.init = init;