var express      = require('express');
var app          = express();
var mongoose     = require('mongoose');
var mongoosastic = require('mongoosastic');
var Schema       = mongoose.Schema;

mongoose.connect(process.env.MONGO_URL);

var UserSchema = new Schema({
    name: {type:String, es_indexed:true}
  , email: String
  , city: String
})

UserSchema.plugin(mongoosastic, {
  host: process.env.ELASTICSEARCH_URL,
  port: 9200
});

var UserModel = mongoose.model("User", UserSchema);

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/save', function(req, res) {
  var instance = new UserModel();
  instance.name = 'Sergio Santana';
  instance.email = 'sergiosantana@lima.com';
  instance.city = 'Brasil';
  instance.save(function(err){
    if (err) throw err;
    /* Document indexation on going */
    instance.on('es-indexed', function(err, res){
      if (err) throw err;
      /* Document is indexed */
      console.log('Document is indexed');
    });
  });
  res.send('User saved!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
