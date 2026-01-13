// s3.js
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_ID,
        secretAccessKey: process.env.ACCESS_KEY,
    },
});

module.exports = s3;
