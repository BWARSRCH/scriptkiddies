var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/scriptkiddies');

exports.Store = require('./store');
