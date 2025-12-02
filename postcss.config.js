module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['./public/index.html', './src/**/*.{js,jsx,ts,tsx,vue}'],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    }),
  ],
}