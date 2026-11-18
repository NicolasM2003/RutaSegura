module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const plugins = (config.plugins ?? []).filter(
    (plugin) =>
      plugin !== "react-native-maps" &&
      !(Array.isArray(plugin) && plugin[0] === "react-native-maps"),
  );

  if (androidGoogleMapsApiKey) {
    plugins.push(["react-native-maps", { androidGoogleMapsApiKey }]);
  }

  return {
    ...config,
    plugins,
  };
};
