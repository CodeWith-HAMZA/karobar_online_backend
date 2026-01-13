// upload.js
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../s3");

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            // fetch the business listing id from the request body
            const businessListingId = req.query.business_listing_id || 1;
            const fileName = `uploads/business-listings/${businessListingId}/${Date.now()}-${file.originalname}`;

            cb(null, fileName);
        },
    }),
});

module.exports = upload;
