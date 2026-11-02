// Имя под иконкой на домашнем экране Android (app_name) задаём отдельно от expo.name,
// чтобы длинное «поисковое» название не обрезалось лаунчером.
const { withStringsXml, AndroidConfig } = require('expo/config-plugins');

module.exports = function withAndroidAppLabel(config, label = 'Safa') {
  return withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: 'app_name', translatable: 'false' }, _: label }],
      c.modResults,
    );
    return c;
  });
};
