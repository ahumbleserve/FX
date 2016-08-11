var assert = require('chai').assert;
var request = require('supertest');
var expect = require('chai').expect;

var url = 'http://localhost:3000';
var auth;

var validLoginUserData = {
  "email":"luciana@yahoo.com.br",
  "password":"meuPassword"};

var invalidLoginUserData = {
  "email":"luciana@yahooo.com.br",
  "password":"meuPassword"};

describe('FX API Tests - POST', function() {
  
  it('/POST login user with valid credentials', function(done) {
    request(url)
      .post('/users/login')
      .set('Content-type', 'application/json')
      .send(validLoginUserData)
      .end(function(err, res) {
        var result = JSON.parse(res.text);
        assert.equal(res.status, 200);
        auth = res.get('auth');
        assert.equal(result.name, 'Luciana Jesus', 'Checkin name!');
        assert.equal(result.email, 'luciana@yahoo.com.br', 'Cheking email!');
        assert.equal(result.address.cep, '05782350', 'Checking Whether a valid cep got the expected address properly!');
        assert.equal(result.address.tipoDeLogradouro, 'Rua', 'Checking Whether a valid cep got the expected address properly!');
        assert.equal(result.address.logradouro, 'Adelaide Braga Negrelli', 'Checking Whether a valid cep got the expected address properly!');
        assert.equal(result.address.bairro, 'Parque Munhoz', 'Checking Whether a valid cep got the expected address properly!');
        assert.equal(result.address.cidade, 'São Paulo', 'Checking Whether a valid cep got the expected address properly!');
        assert.equal(result.address.estado, 'SP', 'Checking Whether a valid cep got the expected address properly!');
        done();
      });
  });

  it('/POST login user with invalid credentials', function(done) {
    request(url)
      .post('/users/login')
      .set('Content-type', 'application/json')
      .send(invalidLoginUserData)
      .end(function(err, res) {
        assert.equal(res.status, 401);
        assert.isUndefined(res.get('auth'));
        done();
      });
  });

});


describe('FX API Tests - DELETE', function() {
  it('/DELETE logout user', function(done) {
    request(url)
      .delete('/users/login')
      .set('Content-type', 'application/json')
      .set('auth', auth)
      .end(function(err, res) {
        assert.equal(res.status, 204);
        assert.isUndefined(res.get('auth'));
        done();
      });
  });
});


