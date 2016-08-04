var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = process.env.PORT || 3000;
var items = [];
var itemNextId = 1;

app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.send('FX API Root');
});


////////// ITEMS //////////
// GET /items?completed=false&q=work
app.get('/items', middleware.requireAuthentication, function(req, res) {
	var query = req.query;
	var where = {
		userId:req.user.get('id')
	};

	if (query.hasOwnProperty('completed') && query.completed === 'true') {
		where.completed = true;
	} else if (query.hasOwnProperty('completed') && query.completed === 'false') {
		where.completed = false;
	}

	if (query.hasOwnProperty('q') && query.q.length > 0) {
		where.description = {
			$like: '%' + query.q + '%'
		};
	}

	db.item.findAll({
		where: where
	}).then(function(items) {
		res.json(items);
	}, function(e) {
		res.status(500).send();
	});
});

// GET /items/:id
app.get('/items/:id',  middleware.requireAuthentication, function(req, res) {
	var itemId = parseInt(req.params.id, 10);

	db.item.findOne({
		where:{
			id:itemId,
			userId:req.user.get('id')
		}
	}).then(function(item) {
		if (!!item) {
			res.json(item.toJSON());
		} else {
			res.status(404).send();
		}
	}, function(e) {
		res.status(500).send();
	});
});

// POST /items
app.post('/items',  middleware.requireAuthentication, function(req, res) {
	var body = _.pick(req.body, 'description', 'completed');

	db.item.create(body).then(function(item) {
		
		req.user.addItem(item).then(function(){
			return item.reload();
		}).then(function(item){
			res.json(item.toJSON());
		});
	}, function(e) {
		res.status(400).json(e);
	});
});

// DELETE /items/:id
app.delete('/items/:id',  middleware.requireAuthentication, function(req, res) {
	var itemId = parseInt(req.params.id, 10);

	db.item.destroy({
		where: {
			id: itemId,
			userId:req.user.get('id')
		}
	}).then(function(rowsDeleted) {
		if (rowsDeleted === 0) {
			res.status(404).json({
				error: 'No item with id'
			});
		} else {
			res.status(204).send();
		}
	}, function() {
		res.status(500).send();
	});
});

// PUT /items/:id
app.put('/items/:id',  middleware.requireAuthentication, function(req, res) {
	var itemId = parseInt(req.params.id, 10);
	var body = _.pick(req.body, 'description', 'completed');
	var attributes = {};

	if (body.hasOwnProperty('completed')) {
		attributes.completed = body.completed;
	}

	if (body.hasOwnProperty('description')) {
		attributes.description = body.description;
	}

	db.item.findOne({
		where:{
			id:itemId,
			userId:req.user.get('id')
		}
	}).then(function(item) {
		if (item) {
			item.update(attributes).then(function(item) {
				res.json(item.toJSON());
			}, function(e) {
				res.status(400).json(e);
			});
		} else {
			res.status(404).send();
		}
	}, function() {
		res.status(500).send();
	});
});

////////// USERS //////////
// POST /users
app.post('/users', function(req, res) {
	var body = _.pick(req.body, 'email', 'password');

	db.user.create(body).then(function(user) {
		res.json(user.toPublicJSON());
	}, function(e) {
		res.status(400).json(e);
	});
});


// POST /users/login
app.post('/users/login', function(req, res) {
	var body = _.pick(req.body, 'email', 'password');
	var userInstance;

	db.user.authenticate(body).then(function(user){
		var token = user.generateToken('authentication');
		userInstance = user;
		return db.token.create({
			token:token
		});

		// if(token){
		// 	res.header('Auth', token).json(user.toPublicJSON());
		// }else{
		// 	res.status(401).send();
		// }
	}).then(function(tokenInstance){
		res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
	}).catch(function(){
		res.status(401).send();
	});

	//res.json(body);
});

//DELETE /users/login
app.delete('/users/login', middleware.requireAuthentication, function(req, res){
	req.token.destroy().then(function(){
		res.status(204).send();
	}).catch(function(){
		res.status(500).send();
	});
});


db.sequelize.sync({force:true}).then(function() {
	app.listen(PORT, function() {
		console.log('Express listening on port ' + PORT + '!');
	});
});
