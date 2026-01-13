const express = require("express");
require("dotenv").config();
const cors = require('cors')
const { Pool } = require("pg");
const { getBusinessListings, updateBusinessListing } = require("./controllers/business-listings");
const { createBusinessListing } = require("./controllers/business-listings");
const { upload, deleteFileFromS3 } = require("./s3/upload");
const s3 = require("./s3");
const { getS3KeyFromUrl } = require("./utils");

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));


// ✅ Neon connection pool
const pool = require("./db");
const { DeleteObjectsCommand, DeleteObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

// ---- DB CONNECTION BOOTSTRAP ----
// async function startServer() {
//     try {
//         console.log("Connecting to database...");

//         const client = await pool.connect();
//         console.log("✅ Connected to Neon PostgreSQL");

//         client.release(); // important!

//         const PORT = process.env.PORT || 3000;
//         app.listen(PORT, () => {
//             console.log(`🚀 Server running on port ${PORT}`);
//         });

//     } catch (err) {
//         console.error("❌ Failed to connect to database", err);
//         process.exit(1); // crash app if DB is not reachable
//     }
// }

// startServer();

app.get('/', (req, res) => {
    res.send("Hello World!");
})

app.get("/api/v1/business-listings", getBusinessListings
);

app.get('/api/v1/business-listings/categories', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, name FROM categories where parent_id is null');
        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("GET /api/v1/business-listings/categories error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
})

// subcategories with parent_id is not null
app.get('/api/v1/business-listings/subcategories/:category_id', async (req, res) => {
    try {
        const { category_id } = req.params;
        const { rows } = await pool.query('SELECT id, name FROM categories WHERE parent_id = $1', [category_id]);
        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("GET /api/v1/business-listings/subcategories error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
})


app.post("/api/v1/business-listings", createBusinessListing);

// PUT endpoint to update a business listing
app.put("/api/v1/business-listings/:id", updateBusinessListing);


app.get("/api/v1/business-listings/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Optional: validate id
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid business listing ID"
            });
        }

        const query = `
            SELECT * 
            FROM business_listings 
            WHERE id = $1
            LIMIT 1
        `;

        const { rows } = await pool.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Business listing not found"
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("GET /api/v1/business-listings/:id error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

app.post("/upload", upload.single("file"), async (req, res) => {
    console.log(req.file, " req")
    const url = req.file.location;

    // update the business listing with the new image url
    const query = `
        UPDATE business_listings 
        SET logo = $1 
        WHERE id = $2
        RETURNING *
    `;
    console.log(query)


    const { rows: businessListing } = await pool.query(
        "SELECT logo FROM business_listings WHERE id=$1",
        [req.query.business_listing_id]
    );

    if (businessListing[0].logo) {
        const deletePreviousFile = await deleteFileFromS3(businessListing[0].logo);
    }




    const { rows } = await pool.query(query, [url, req.query.business_listing_id]);

    res.json({
        message: "File uploaded successfully",
        fileUrl: url, // S3 URL
        data: rows[0]
    });
});



app.get('/test', async (req, res) => {

    try {

        await s3.send(new HeadObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: "https://amzn-s3-karobaronlineai.s3.eu-north-1.amazonaws.com/uploads/business-listings/86/1768309172610-download+(14).png" }));
        console.log("File exists on S3.");
    } catch (err) {
        if (err.name === "NotFound") {
            console.log("File does NOT exist. Check your Key name!");
        } else {
            console.error("Error checking file:", err);

        }
    }
    // This is the specific path inside your bucket
    // const fileKey = "uploads/business-listings/86/1768312897705-download%20%2814%29.png";

    // const params = {
    //     Bucket: process.env.BUCKET_NAME,
    //     Key: fileKey,
    // };

    // try {
    //     const result = await s3.send(new DeleteObjectCommand(params));
    //     console.log("Success: File deleted from S3.");
    //     res.send({ message: "File deleted successfully", result });
    // } catch (err) {
    //     console.error("Error deleting file:", err);
    //     res.status(500).send({ error: "Failed to delete file" });
    // }
});



// ---- IMPORTANT: Modified for Vercel ----
// Only start server in development
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', async () => {
        try {
            const client = await pool.connect();
            console.log("✅ Connected to Neon PostgreSQL");
            client.release();
            console.log(`🚀 Server running on port ${PORT}`);
        } catch (err) {
            console.error("❌ Failed to connect to database", err);
        }
    });
}
