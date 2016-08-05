module.exports = function(sequelize, DataTypes) {
	return sequelize.define('item', {
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [1, 250]
			}
		},
		description: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [1, 250]
			}
		},
		value: {
			type: DataTypes.DOUBLE,
			allowNull: false
		},
		acquired: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	});
};
