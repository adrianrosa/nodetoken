/**
 * Created by Adrian on 16/10/2016.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model
module.exports = mongoose.model('Token', new Schema({
    value: String,
    username: String
}));