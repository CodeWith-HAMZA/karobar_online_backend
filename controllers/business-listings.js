exports.getBusinessListings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const countQuery = `SELECT COUNT(*) FROM business_listings`;
        const dataQuery = `
            SELECT * FROM business_listings 
            ORDER BY id DESC 
            LIMIT $1 OFFSET $2
        `;

        const countResult = await pool.query(countQuery);
        const totalValidation = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalValidation / limit);

        const { rows } = await pool.query(dataQuery, [limit, offset]);

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