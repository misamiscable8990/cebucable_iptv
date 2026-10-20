const { withAndroidManifest } = require('expo/config-plugins');

const androidName = 'android:name';
const androidRequired = 'android:required';

module.exports = function withAndroidTv(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
      'android.permission.WAKE_LOCK',
    ];

    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    for (const permission of permissions) {
      if (
        !manifest['uses-permission'].some(
          (entry) => entry.$?.[androidName] === permission,
        )
      ) {
        manifest['uses-permission'].push({
          $: { [androidName]: permission },
        });
      }
    }

    manifest['uses-feature'] = manifest['uses-feature'] ?? [];
    const features = [
      ['android.software.leanback', 'false'],
      ['android.hardware.touchscreen', 'false'],
    ];
    for (const [name, required] of features) {
      const existing = manifest['uses-feature'].find(
        (entry) => entry.$?.[androidName] === name,
      );
      if (existing) {
        existing.$[androidRequired] = required;
      } else {
        manifest['uses-feature'].push({
          $: {
            [androidName]: name,
            [androidRequired]: required,
          },
        });
      }
    }

    const application = manifest.application?.[0];
    const activity = application?.activity?.find((entry) =>
      entry.$?.[androidName]?.endsWith('MainActivity'),
    );
    if (activity) {
      activity.$ = activity.$ ?? {};
      activity.$['android:screenOrientation'] = 'landscape';
      activity['intent-filter'] = activity['intent-filter'] ?? [];
      let mainFilter = activity['intent-filter'].find((filter) =>
        filter.action?.some(
          (action) =>
            action.$?.[androidName] === 'android.intent.action.MAIN',
        ),
      );
      if (!mainFilter) {
        mainFilter = {
          action: [{ $: { [androidName]: 'android.intent.action.MAIN' } }],
          category: [],
        };
        activity['intent-filter'].push(mainFilter);
      }
      mainFilter.category = mainFilter.category ?? [];
      if (
        !mainFilter.category.some(
          (category) =>
            category.$?.[androidName] ===
            'android.intent.category.LEANBACK_LAUNCHER',
        )
      ) {
        mainFilter.category.push({
          $: { [androidName]: 'android.intent.category.LEANBACK_LAUNCHER' },
        });
      }
    }

    return mod;
  });
};
