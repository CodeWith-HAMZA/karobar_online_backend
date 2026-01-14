const sharp = require("sharp");
const pool = require("../db");
const { deleteFileFromS3 } = require("../s3/upload");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../s3");

exports.getBusinessListings = async (req, res) => {
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

exports.createBusinessListing = async (req, res) => {
    try {
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
            message
        } = req.body;

        // basic required fields check (light validation)
        if (!full_name || !business_name || !mobile_number || !email) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        const query = `
      INSERT INTO business_listings (
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
        message
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )
      RETURNING *
    `;

        const values = [
            full_name,
            business_name,
            mobile_number,
            whatsapp_number || null,
            email,
            has_website ?? false,
            preferred_language || "English",
            business_address || null,
            business_about || null,
            instagram_social_link || null,
            facebook_social_link || null,
            city || null,
            is_test_data ?? false,
            category_id || null,
            sub_category_id || null,
            message || null
        ];

        const { rows } = await pool.query(query, values);

        return res.status(201).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error("POST /business-listings error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}


exports.updateBusinessListing = async (req, res) => {
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
            ai_status,
            logo
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
        console.log(checkResult.rows[0].logo, " rows")
        if (checkResult.rows[0].logo) {
            await deleteFileFromS3(checkResult.rows[0].logo)
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
                ai_status = COALESCE($19, ai_status),
                logo = COALESCE($20, logo)
            WHERE id = $21
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
            logo,
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
}


exports.getBusinessListingsSubCategories = async (req, res) => {
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
}


exports.uploadBusinessListingLogo = async (req, res) => {
    console.log(req.file, " req")
    // const url = req.file.location;
    const originalFileBuffer = req.file.buffer;
    // get extension 
    const extension = req.file.originalname.split(".").pop();
    // remove extension
    const originalName = req.file.originalname.replace(`.${extension}`, "");

    // original name replace space with dash
    const fileKey = `uploads/business-listings/${req.query.business_listing_id}/${Date.now()}- ${originalName}${extension}`;
    const compressedImageBuffer = await sharp(originalFileBuffer)
        .resize(400, 400, {
            width: 350,        // between 250–400
            withoutEnlargement: true
        })
        .jpeg({ quality: 20 })
        .toBuffer();

    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: fileKey,
        Body: compressedImageBuffer,
        ContentType: 'image/jpeg', // Must match the format you compressed to
        // ACL: 'public-read' // Optional: Makes the file publicly accessible
    };

    // Upload to S3
    const data = await s3.send(new PutObjectCommand({ ...params, ACL: 'public-read-write' }));
    console.log('Upload successful:', data.Location);
    const url = data.Location;
    console.log(data, 'response data aws ')

    const staticUrl = `https://${process.env.BUCKET_NAME}.s3.${process.env.REGION}.amazonaws.com/${fileKey}`;
    console.log(staticUrl, 'staticUrl')

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
        // const deletePreviousFile = await deleteFileFromS3(businessListing[0].logo);
    }




    const { rows } = await pool.query(query, [staticUrl, req.query.business_listing_id]);

    res.json({
        message: "File uploaded successfully",
        fileUrl: staticUrl, // S3 URL
        data: rows[0]
    });
}


exports.getBusinessListingDetails = async (req, res) => {
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
}


exports.getBusinessListingsCategories = async (req, res) => {
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
}