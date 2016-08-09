var request = require('request');

module.exports = function (location, callback) {
	var encodedLocation = encodeURIComponent(location);
	var url = 'http://correiosapi.apphb.com/cep/' + encodedLocation ;

	if (!location) {
		return callback('No location provided');
	}

	request({
		url: url,
		json: true
	}, function (error, response, body) {
		if (error) {
			callback('Unable to fetch the address.');
		} else {
			callback(body);
		}
	});
}