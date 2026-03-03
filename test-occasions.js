const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const port = process.env.PORT || 5000;
const url = `http://127.0.0.1:${port}/api/occasions?filter={"categoryId":"123","isFeatured":true}`;

const token = jwt.sign(
    {
        id: "testUserId123",
        role: "superadmin",
        community: "testCommunity123"
    },
    process.env.JWT_SECRET || "your-secret-key"
);

async function testApi() {
    console.log("Fetching from:", url);
    try {
        const res = await fetch(url, {
            headers: {
                Authorization: "Bearer " + token,
            },
        });
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error connecting to server:", err.message);
    }
}

testApi();
