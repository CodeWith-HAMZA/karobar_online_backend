const express = require("express");
require("dotenv").config();
const cors = require('cors')
const { getBusinessListings, updateBusinessListing, getBusinessListingsSubCategories, uploadBusinessListingLogo, getBusinessListingDetails, getBusinessListingsCategories } = require("./controllers/business-listings");
const { createBusinessListing } = require("./controllers/business-listings");
const s3 = require("./s3");

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));


// ✅ Neon connection pool
const pool = require("./db");
const { DeleteObjectsCommand, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const multerUpload = require("./multer");

app.get('/', (req, res) => {
    res.send("Hello World!");
})

app.get("/api/v1/business-listings", getBusinessListings);

app.get('/api/v1/business-listings/categories', getBusinessListingsCategories)

app.get('/api/v1/business-listings/subcategories/:category_id', getBusinessListingsSubCategories)

app.post("/api/v1/business-listings", createBusinessListing);

app.put("/api/v1/business-listings/:id", updateBusinessListing);

app.get("/api/v1/business-listings/:id", getBusinessListingDetails);

app.post("/upload", multerUpload.single("file"), uploadBusinessListingLogo);



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


