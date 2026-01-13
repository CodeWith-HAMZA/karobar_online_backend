const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Neon ya local DB ka URL
    ssl: {
        rejectUnauthorized: false, // Neon ke liye zaruri
    },
});

module.exports = pool;
