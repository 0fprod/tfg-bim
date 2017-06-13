var mongoose = require('mongoose'),
schema       = new mongoose.Schema({name: String, repos: Array}), //DB Schema
UserConfig   = mongoose.model('UserConfig', schema);                             //DB Object model
module.exports = UserConfig;
