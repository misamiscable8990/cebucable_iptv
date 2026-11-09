const { withAndroidManifest, withMainActivity } = require('expo/config-plugins');

const androidName = 'android:name';
const androidRequired = 'android:required';

module.exports = function withAndroidTv(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
      'android.permission.WAKE_LOCK',
      'android.permission.REQUEST_INSTALL_PACKAGES',
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

  return withMainActivity(config, (mod) => {
    let source = mod.modResults.contents;
    if (source.includes('AndroidTVRemoteKey')) return mod;

    source = source.replace(
      'import android.os.Bundle',
      [
        'import android.os.Bundle',
        'import android.view.KeyEvent',
        '',
        'import com.facebook.react.ReactApplication',
        'import com.facebook.react.modules.core.DeviceEventManagerModule',
      ].join('\n'),
    );

    const remoteKeyBridge = `
  private fun isCapturedRemoteKey(keyCode: Int): Boolean =
    keyCode == KeyEvent.KEYCODE_DPAD_UP ||
      keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
      keyCode == KeyEvent.KEYCODE_DPAD_LEFT ||
      keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
      keyCode == KeyEvent.KEYCODE_DPAD_CENTER ||
      keyCode == KeyEvent.KEYCODE_ENTER ||
      keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER ||
      keyCode == KeyEvent.KEYCODE_CHANNEL_UP ||
      keyCode == KeyEvent.KEYCODE_CHANNEL_DOWN ||
      keyCode in KeyEvent.KEYCODE_0..KeyEvent.KEYCODE_9 ||
      keyCode in KeyEvent.KEYCODE_NUMPAD_0..KeyEvent.KEYCODE_NUMPAD_9

  private fun sendRemoteKey(keyCode: Int) {
    val context = (application as? ReactApplication)?.reactHost?.currentReactContext ?: return
    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("AndroidTVRemoteKey", keyCode)
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (isCapturedRemoteKey(event.keyCode)) {
      if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
        sendRemoteKey(event.keyCode)
      }
      return true
    }
    return super.dispatchKeyEvent(event)
  }

`;

    source = source.replace(
      '  override fun invokeDefaultOnBackPressed() {',
      `${remoteKeyBridge}  override fun invokeDefaultOnBackPressed() {`,
    );

    mod.modResults.contents = source;
    return mod;
  });
};
