var express      = require('express');
var bodyParser   = require('body-parser');
var app          = express();
var mongoose     = require('mongoose');
var mongoosastic = require('mongoosastic');
var Schema       = mongoose.Schema;
var ObjectId     = mongoose.Types.ObjectId;

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

// Route
app.get('/', function (req, res) {
  res.send('Hello World!');
});

// curl -X POST -H "Content-Type: application/json" -d '{"name": "Sérgio Lima", "email": "sergio@lima.com", "city": "Brasília"}' http://localhost:3000/users
app.post('/users', function(req, res) {
  var user = new UserModel(req.body);
  user.save(function(err, user) {
    if (err) throw err;
    console.log('user saved');
    res.json({'message': 'user saved!', user});
    user.on('es-indexed', function(err) {
      if (err) throw err;
      console.log('user indexed');
    });
  });
});

app.get('/users', function(req, res) {
  UserModel.find({}, function(err, users) {
    if (err) throw err;
    res.json(users);
  });
});

// curl -X POST -H "Content-Type: application/json" -d '{"name": "Umami Presentes", "local": "Brasília"}' http://localhost:3000/stores
app.post('/stores', function(req, res) {
  var store = new StoreModel(req.body);
  store.save(function(err, store) {
    if (err) throw err;
    console.log('store saved');
    res.json({'message': 'store saved!', store});
  });
});

app.get('/stores', function(req, res) {
  StoreModel.find({}, function(err, stores) {
    if (err) throw err;
    res.json(stores);
  });
});

// curl -X POST -H "Content-Type: application/json" -d '{"description": "Frigideira Rasa Non Stick 28cm Le Creuset", "brand": "Le Creuset", "type": "Frying pan", "category": "Cooking", "picture": "http://shopfacil.vteximg.com.br/arquivos/ids/1783992-1000-1000/Frigideira-Le-Creuset-Rasa-28-cm-Non-Stick_0.jpg"}' http://localhost:3000/products
app.post('/products', function(req, res) {
  var product = new ProductModel(req.body);
  product.save(function(err, product) {
    if (err) throw err;
    console.log('product saved');
    res.json({'message': 'product saved!', product});
  });
});

app.get('/products', function(req, res) {
  ProductModel.find({}, function(err, products) {
    if (err) throw err;
    res.json(products);
  });
});

// curl -X POST -H "Content-Type: application/json" -d '{"products":"57fea3e9cf0da90097b1ee56", "stores": "57fea28c86137300630fec8a", "price": 100}' http://localhost:3000/prices
app.post('/prices', function(req, res) {
  ProductModel.findById(req.body.products, function(err, product) {
    if (err) throw err;
    if (product != null) {
      StoreModel.findById(req.body.stores, function(err, store) {
        if (err) throw err;
        if (store != null) {
          var price = new PriceModel({
            price: req.body.price,
            products: new ObjectId(req.body.products),
            stores: new ObjectId(req.body.stores)
          });
          console.log(price);
          price.save(function(err, result) {
            if (err) throw err;
            console.log('price saved');
            res.json({'message': 'price saved!', result});
            price.on('es-indexed', function(err) {
              if (err) throw err;
              console.log('price indexed');
            });
          });
        } else {
          res.send("store not found");
        }
      });
    } else {
      res.send("product not found");
    }
  });
});

app.get('/prices', function(req, res) {
  PriceModel.find({})
    .populate('stores products')
    .exec(function(err, prices) {
      if (err) throw err;
      res.json(prices);
    });
});

app.get('/search', function(req, res) {
  PriceModel.search({query_string: {query: req.query.q}}, function(err, results) {
    res.json(results);
  });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
