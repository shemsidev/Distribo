// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Backend-i .NET nuk është pjesë e paketës mobile; mos e vëzhgo/indekso.
config.resolver.blockList = [/[\/]server[\/].*/];

module.exports = config;
