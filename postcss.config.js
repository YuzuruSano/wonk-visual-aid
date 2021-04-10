module.exports = {
    plugins: [
        require('cssnano')({
            preset: 'default',
        }),
        require('postcss-assets')({
            loadPaths: ["dev/images/"],
            relative: "./dev/css"
        })
    ]
}