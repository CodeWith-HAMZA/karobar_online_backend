exports.getS3KeyFromUrl = function (url) {
    return new URL(url).pathname.slice(1); // remove leading "/"
}