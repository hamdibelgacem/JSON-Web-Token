//get the package we need:
var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var morgan = require('morgan')
var mongoose = require('mongoose')

var jwt = require('jsonwebtoken')
var config = require('./config')
var User = require('./models/users')

//configuration
var port = process.env.PORT || 3030
mongoose.connect(config.database,{useMongoClient: true})
    .then(() => 
        {
            console.log('connected to database');
            return mongoose.connection;
        })
    .catch(err => debug(`Database connection error: ${err.message}`));    
app.set('superSecret', config.secret);//secret variable

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(morgan('dev'))

/*
 * routes
*/ 

//basic route
app.get('/',function(req,res){
    res.send('Hello in jsonwebtoken app the API is at http://localhost:' + port + '/api')
})
app.get('/setup', function(req,res){
    //create simple user
    var nick = new User({
        name: 'Belgacem Hamdi',
        password: 'password',
        admin: true
    })

    nick.save(function(err){
        if(err) throw err

        console.log('User saved successfully')
        res.json({success: true})
    })
})
//API routes
var apiRoutes = express.Router();

apiRoutes.get('/',function(req,res){
    res.json({message: 'Welcome to the API'})
})
apiRoutes.get('/users',function(req,res){
    User.find({},function(err,users){
        res.json(users)
    })
})
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
				var payload = {
					admin: user.admin	
				}
				var token = jwt.sign(payload, app.get('superSecret'), {
					expiresIn: 86400 // expires in 24 hours
				});

				res.json({
					success: true,
					message: 'Enjoy your token!',
					token: token
				})
			}		

		}

	})
})

// route middleware to verify a token
apiRoutes.use(function(req,res,next){
	var token = req.body.token || req.query.token || req.headers['x-access-token']

	//decode token
	if(token){
		//verify secret and checks exp
		jwt.verify(token,app.get('superSecret'),function(err,decoded){
			if(err){
				return res.json({success: false, message: 'Failed to authenticate token.'})
			}else{
				 // if everything is good, save to request for use in other routes
				req.decoded = decoded
				next()
			}
		})
	}else{
		//if there is no token return an error
		return res.status(403).send({
			success: false,
			message: 'No token provided'
		})
	}

})

app.use('/api',apiRoutes)
app.listen(port)
console.log('listening in port 3030')
