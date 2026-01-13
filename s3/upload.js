// upload.js
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../s3");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getS3KeyFromUrl } = require("../utils");

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            // fetch the business listing id from the request body
            // console.log(req.file, ' file')
            const businessListingId = req.query.business_listing_id || 1;
            const fileName = `uploads/business-listings/${businessListingId}/${Date.now()}-${file.originalname}`;

            cb(null, fileName);
        },
    }),
});

async function deleteFileFromS3(key) {
    const s3Key = getS3KeyFromUrl(key)
    try {
        await s3.send(
            new DeleteObjectCommand({
                Bucket: process.env.BUCKET_NAME,
                Key: s3Key,
            })
        );
        console.log("Previous file deleted:", s3Key);
    } catch (err) {
        console.error("Error deleting previous file:", err);
    }
}

module.exports = {
    upload,
    deleteFileFromS3
};
