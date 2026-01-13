const express = require("express");
require("dotenv").config();
const cors = require('cors')
const { Pool } = require("pg");
const { getBusinessListings } = require("./controllers/business-listings");
const { createBusinessListing } = require("./controllers/business-listings");
const upload = require("./s3/upload");
const s3 = require("./s3");

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));


// ✅ Neon connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // required for Neon
    },
});

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

app.get("/api/v1/business-listings", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const query = req.query.q || "";
        // console.log(req.query.is_test_data)

        const is_test_data =
            req.query.is_test_data === 'true' ? true :
                req.query.is_test_data === 'false' ? false :
                    null;


        console.log(is_test_data)


        const countQuery = `SELECT COUNT(*) FROM business_listings`;

        const dataQuery = `
    SELECT *
    FROM business_listings
    WHERE full_name ILIKE $1
          AND ( $2 = false OR is_test_data = true )

    ORDER BY id DESC
    LIMIT $3 OFFSET $4
`;

        const countResult = await pool.query(countQuery);
        const totalValidation = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalValidation / limit);

        const { rows } = await pool.query(dataQuery, [
            `%${query}%`,   // $1
            is_test_data,     // $2 → true or false
            limit,          // $3
            offset          // $4
        ]);

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total: totalValidation,
                page: page,
                limit: limit,
                totalPages: totalPages
            }
        });

    } catch (error) {
        console.error("GET /api/v1/business-listings error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}
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
app.put("/api/v1/business-listings/:id", async (req, res) => {
    const toNull = (value) => (value === "" ? null : value);

    try {
        const { id } = req.params;
        const {
            full_name,
            business_name,
            mobile_number,
            whatsapp_number,
            email,
            has_website,
            preferred_language,
            business_address,
            business_about,
            instagram_social_link,
            facebook_social_link,
            city,
            is_test_data,
            category_id,
            sub_category_id,
            package_status,
            business_model,
            message,
            website_url,
            ai_status
        } = req.body;
        console.log(package_status)

        // Check if the listing exists
        const checkQuery = `SELECT * FROM business_listings WHERE id = $1`;
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Business listing not found"
            });
        }

        // Update only the fields that are provided
        const query = `
            UPDATE business_listings 
            SET 
                full_name = COALESCE($1, full_name),
                business_name = COALESCE($2, business_name),
                mobile_number = COALESCE($3, mobile_number),
                whatsapp_number = COALESCE($4, whatsapp_number),
                email = COALESCE($5, email),
                has_website = COALESCE($6, has_website),
                preferred_language = COALESCE($7, preferred_language),
                business_address = COALESCE($8, business_address),
                
                instagram_social_link = COALESCE($9, instagram_social_link),
                facebook_social_link = COALESCE($10, facebook_social_link),
                city = COALESCE($11, city),
                is_test_data = COALESCE($12, is_test_data),
                category_id = COALESCE($13, category_id),
                sub_category_id = COALESCE($14, sub_category_id),
                message = COALESCE($15, message),
                package_status = COALESCE($16, package_status),
                business_model = COALESCE($17, business_model),
                website_url = COALESCE($18, website_url),
                ai_status = COALESCE($19, ai_status)
            WHERE id = $20
            RETURNING *
        `;

        const values = [
            full_name,
            business_name,
            mobile_number,
            whatsapp_number,
            email,
            has_website,
            preferred_language,
            business_address,
            // business_about,
            instagram_social_link,
            facebook_social_link,
            city,
            is_test_data,
            toNull(category_id),
            toNull(sub_category_id),
            message,
            package_status,
            business_model,
            website_url,
            ai_status,
            id
        ];

        const { rows } = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            data: rows[0],
            message: "Business listing updated successfully"
        });

    } catch (error) {
        console.error("PUT /api/v1/business-listings/:id error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


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
    // const url = s3.getSignedUrl("getObject", {
    //     Bucket: "amzn-s3-karobaronlineai",
    //     Key: "uploads/1768305295208-image.png",
    // });
    // console.log("Pre-signed URL:", url);
    // const listing_id = req.query.listing_id;
    const url = req.file.location;
    // update the business listing with the new image url
    const query = `
        UPDATE business_listings 
        SET logo = $1 
        WHERE id = $2
        RETURNING *
    `;
    console.log(query)

    const values = [url, req.query.business_listing_id];

    const { rows } = await pool.query(query, values);

    res.json({
        message: "File uploaded successfully",
        fileUrl: url, // S3 URL
        data: rows[0]
    });
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
