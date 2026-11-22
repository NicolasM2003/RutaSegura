module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const plugins = (config.plugins ?? []).filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

    return (
      pluginName !== "react-native-maps" &&
      pluginName !== "expo-build-properties"
    );
  });

  // Permite conexiones HTTP desde Android.
  plugins.push([
    "expo-build-properties",
    {
      android: {
        usesCleartextTraffic: true,
      },
    },
  ]);

  // Configuración de Google Maps.
  if (androidGoogleMapsApiKey) {
    plugins.push([
      "react-native-maps",
      {
        androidGoogleMapsApiKey,
      },
    ]);
  }

  return {
    ...config,
    plugins,
  };
};