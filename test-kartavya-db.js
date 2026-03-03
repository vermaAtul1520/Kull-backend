const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to DB");
        const Kartavya = mongoose.model("Kartavya", new mongoose.Schema({}, { strict: false }));
        const kartavyas = await Kartavya.find({});

        console.log(`Total Kartavyas in DB: ${kartavyas.length}`);

        // Group by category to see the breakdown
        const categories = {};
        kartavyas.forEach(k => {
            const cat = k.get('category');
            categories[cat] = (categories[cat] || 0) + 1;
        });
        console.log("Category breakdown:", categories);

        process.exit(0);
    })
    .catch(err => {
        console.error("DB error:", err);
        process.exit(1);
    });
