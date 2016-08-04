var Sequelize = require('sequelize');
var env = process.env.NODE_ENV || 'development';
var  sequelize;

if(env === 'production'){
	//heroku
	sequelize = new Sequelize(process.env.DATABASE_URL,{
		dialect:'postgres'
	});
}else{
	//aws
	sequelize = new Sequelize('fx', 'fx123456', 'fx123456', {
	host:'fx.cyjciotb4ef4.sa-east-1.rds.amazonaws.com',
	dialect: 'postgres',
	port:'5432'
	});
}
var db = {};

db.item = sequelize.import(__dirname + '/models/item.js');
db.user = sequelize.import(__dirname + '/models/user.js');
db.token = sequelize.import(__dirname + '/models/tokens.js');

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.item.belongsTo(db.user);
db.user.hasMany(db.item);

module.exports = db;

