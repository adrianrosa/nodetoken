var express 	= require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');

var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var User = require('./app/models/user'); // get our mongoose model User
var Token = require('./app/models/token'); // get our mongoose model Token

var port = process.env.PORT || 8080; // used to create, sign, and verify tokens
mongoose.connect(config.database); // connect to database
app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// routes ==========================================================
app.get('/setup', function(req, res) {

	// create a sample user
	var nick = new User({ 
		name: 'Nick Cerminara', 
		password: 'password',
		admin: true 
	});
	nick.save(function(err) {
		if (err) throw err;

		console.log('User saved successfully');
		// create a sample token black list
		var token = new Token({
			value: '123abc',
			username: 'Nick',
			banned: true
		});
		token.save(function (err) {
			if (err) throw err;

			console.log('Token saved successfully');
			res.json({ success: true });
		});
	});
});

// basic route (http://localhost:8080)
app.get('/', function(req, res) {
	res.send('Hello! The API is at http://localhost:' + port + '/api');
});

// get an instance of the router for api routes
var apiRoutes = express.Router(); 

// authentication (no middleware necessary since this isnt authenticated)
// http://localhost:8080/api/authenticate
apiRoutes.post('/authenticate', function(req, res) {

	// find the user
	User.findOne({
		name: req.body.name
	}, function(err, user) {

		if (err) throw err;

		if (!user) {
			res.json({ success: false, message: 'Authentication failed. User not found.' });
		} else if (user) {

			// check if password matches
			if (user.password != req.body.password) {
				res.json({ success: false, message: 'Authentication failed. Wrong password.' });
			} else {

				// if user is found and password is right
				// create a token
				var token = jwt.sign(user, app.get('superSecret'), {
					expiresIn: 86400 // expires in 24 hours
				});

				res.json({
					success: true,
					message: 'Enjoy your token!',
					token: token
				});
			}
		}
	});
});

// route middleware to authenticate and check token
apiRoutes.use(function(req, res, next) {

	// check header or url parameters or post parameters for token
	var token = req.headers['x-access-token'];

	// decode token
	if (token) {

		// verifies secret and checks exp
		jwt.verify(token, app.get('superSecret'), function(err, decoded) {			
			if (err) {
				return res.json({ success: false, message: 'Failed to authenticate token.' });		
			} else {
				// if everything is good, save to request for use in other routes
				Token.findOne({
					value: token,
					banned: true
				}, function(err, tokenRes) {

					if (err) throw err;

					if(tokenRes)
						return res.json({ success: false, message: 'Token expired, blocked or deleted' });
					else{
						req.decoded = decoded;
						next();
					}
				});
			}
		});
	}
	else {
		// if there is no token
		// return an error
		return res.status(403).send({ 
			success: false, 
			message: 'No token provided.'
		});
		
	}
	
});

// authenticated routes
apiRoutes.get('/', function(req, res) {
	res.json({ succes:true, message: 'Welcome to the coolest API on earth!' });
});

apiRoutes.get('/users', function(req, res) {
	User.find({}, function(err, users) {
		res.json({success: true, data: users});
	});
});

apiRoutes.get('/check', function(req, res) {
	res.json({success: true, data: req.decoded});
});

app.use('/api', apiRoutes);

// start the server ================================================
app.listen(port);
console.log('Server running at http://localhost:' + port);
