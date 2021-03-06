var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);
var address = require('./services/address.js');
	
var app = express();
var PORT = process.env.PORT || 3000;
var items = [];
var itemNextId = 1;

app.use(bodyParser.json());

app.use(express.static("public"));

app.get('/', function(req, res) {
	res.send('FX API Root');
});


////////// ITEMS //////////
// GET /items?acquired=false&q=work
app.get('/items', middleware.requireAuthentication, function(req, res) {
	var query = req.query;
	var where = {
		userId:req.user.get('id')
	};

	if (query.hasOwnProperty('acquired') && query.acquired === 'true') {
		where.acquired = true;
	} else if (query.hasOwnProperty('acquired') && query.acquired === 'false') {
		where.acquired = false;
	}

	if (query.hasOwnProperty('q') && query.q.length > 0) {
		where.name = {
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

/**
 * @api {get} /items/:id Request Item information
 * @apiName GetItem
 * @apiGroup Items
 *
 * @apiParam {Number} id Item's unique ID.
 *
 * @apiSuccess {Number} id Item's unique ID.
 * @apiSuccess {String} name name of the Item.
 * @apiSuccess {String} description description of the Item.
 * @apiSuccess {Double} value price of the Item.
 * @apiSuccess {Boolean} acquired (flag) indicates whether the User acquired the Item.
 * @apiSuccess {String} createdAt Item's date of creation.
 * @apiSuccess {String} updatedAt Item's date of update.
 * @apiSuccess {Number} userID User's ID of the owner of the Item.
 */
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
	var body = _.pick(req.body, 'name', 'description', 'value', 'acquired');

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
	var body = _.pick(req.body, 'name', 'description', 'value', 'acquired');
	var attributes = {};

	if (body.hasOwnProperty('acquired')) {
		attributes.acquired = body.acquired;
	}

	if (body.hasOwnProperty('name')) {
		attributes.name = body.name;
	}

	if (body.hasOwnProperty('value')) {
		attributes.value = body.value;
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
app.post('/users', function(req, res) {
	var body = _.pick(req.body, 'name', 'email', 'password','cep');

	db.user.create(body).then(function(user) {
		
		address(body.cep, function (currentAddress) {
			console.log(currentAddress);
		
			if(currentAddress && typeof(currentAddress) === 'object'){
				var attributes = {};
				attributes.address = currentAddress;
				user.update(attributes).then(function(user) {
					res.json(user.toPublicJSON());
				}, function(e) {
					res.json(user.toPublicJSON());
				});
			}else{
				res.json(user.toPublicJSON());
			}
		});

		
	}, function(e) {
		res.status(400).json(e);
	});
});

// POST /users/login
app.post('/users/login', function(req, res) {
	var body = _.pick(req.body, 'email', 'password', 'cep');
	var userInstance;

	db.user.authenticate(body).then(function(user){
		var token = user.generateToken('authentication');
		userInstance = user;
		return db.token.create({
			token:token
		});

	}).then(function(tokenInstance){
		res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
	}).catch(function(){
		res.status(401).send();
	});
});

//DELETE /users/login
app.delete('/users/login', middleware.requireAuthentication, function(req, res){
	req.token.destroy().then(function(){
		res.status(204).send();
	}).catch(function(){
		res.status(500).send();
	});
});

// GET /users/
app.get('/users/',  middleware.requireAuthentication, function(req, res) {

	db.user.findOne({
		where:{
			id:req.user.get('id')
		}
	}).then(function(user) {
		if (!!user) {
			res.json(user.toPublicJSON());
		} else {
			res.status(404).send();
		}
	}, function(e) {
		res.status(500).send();
	});
});

//PUT/users/
app.put('/users/',  middleware.requireAuthentication, function(req, res) {
	//var userId = parseInt(req.params.id, 10);
	var body = _.pick(req.body, 'name', 'email', 'password', 'cep');
	var attributes = {};

	// if (body.hasOwnProperty('cep')) {
	// 	attributes.acquired = body.acquired;
	// }

	if (body.hasOwnProperty('name')) {
		attributes.name = body.name;
	}

	if (body.hasOwnProperty('email')) {
		attributes.email = body.email;
	}

	if (body.hasOwnProperty('password')) {
		attributes.password = body.password;
	}

	db.user.findOne({
		where:{
			id:req.user.get('id')
		}
	}).then(function(user) {
		if (user) {
			user.update(attributes).then(function(user) {
				
				address(body.cep, function (currentAddress) {
			
					if(currentAddress  && typeof(currentAddress) === 'object'){
						var attributes = {};
						attributes.address = currentAddress;
						user.update(attributes).then(function(user) {
							res.json(user.toPublicJSON());
						}, function(e) {
							res.json(user.toPublicJSON());
						});
					}else{
						res.json(user.toPublicJSON());
					}
				});

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


db.sequelize.sync().then(function() {
	app.listen(PORT, function() {
		console.log('Express listening on port ' + PORT + '!');
	});
});
