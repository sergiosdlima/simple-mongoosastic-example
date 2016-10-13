var express      = require('express');
var bodyParser   = require('body-parser');
var app          = express();
var mongoose     = require('mongoose');
var mongoosastic = require('mongoosastic');
var Schema       = mongoose.Schema;

// Configuration
app.use(bodyParser());

// Model/Schema
mongoose.connect(process.env.MONGO_URL, function(err) {
  if (err) {
    console.error(err);
  }
  console.log('connected.... unless you see an error the line before this!');
});

var StoreSchema = new Schema({
  name  : String,
  local : String
});

var ProductSchema = new Schema({
  description   : String,
  brand         : String,
  category      : String,
  type          : String,
  picture       : String
});

var PriceSchema = new Schema({
  products: {
    type        : Schema.Types.ObjectId,
    ref         : 'Product',
    es_schema   : ProductSchema,
    es_indexed  : true,
    es_select   : 'description brand category type'
  },
  stores: {
    type        : Schema.Types.ObjectId,
    ref         : 'Store',
    es_schema   : StoreSchema,
    es_indexed  : true,
    es_select   : 'name local'
  },
  price         : Number,
  created_at    : {type : Date, default : Date.now}
});

var UserSchema = new Schema({
  name          : {type : String, es_indexed : true},
  email         : String,
  city          : {type : String, es_indexed : true}
});

UserSchema.plugin(mongoosastic, {
  host: process.env.ELASTICSEARCH_URL,
  port: 9200
});

PriceSchema.plugin(mongoosastic, {
  host: process.env.ELASTICSEARCH_URL,
  port: 9200,
  populate: [
    {path: 'products', select: 'description brand category type'},
    {path: 'stores', select: 'name local'}
  ]
});

var UserModel = mongoose.model("User", UserSchema);
var ProductModel = mongoose.model("Product", ProductSchema);
var StoreModel = mongoose.model("Store", StoreSchema);
var PriceModel = mongoose.model("Price", PriceSchema);

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
