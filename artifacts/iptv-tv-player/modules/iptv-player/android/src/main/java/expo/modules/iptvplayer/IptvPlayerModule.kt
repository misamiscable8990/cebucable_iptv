package expo.modules.iptvplayer

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class IptvPlayerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IptvPlayer")

    View(IptvPlayerView::class) {
      Events("onStreamError")

      Prop("streamUrl") { view: IptvPlayerView, streamUrl: String? ->
        view.setStreamUrl(streamUrl)
      }

      Prop("remoteEnabled") { view: IptvPlayerView, enabled: Boolean ->
        view.setRemoteEnabled(enabled)
      }
    }
  }
}
