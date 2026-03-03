const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, {
    timestamps: true,
    strict: false // Allow mixed types flexibility
});

module.exports = mongoose.model('AppConfig', appConfigSchema);
