package expo.modules.iptvplayer

import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.net.wifi.WifiManager
import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import org.videolan.libvlc.LibVLC
import org.videolan.libvlc.Media
import org.videolan.libvlc.MediaPlayer
import org.videolan.libvlc.util.VLCVideoLayout

class IptvPlayerView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val libVlc = LibVLC(
    context.applicationContext,
    arrayListOf(
      "--no-video-title-show",
      "--network-caching=300",
      "--udp-caching=300",
      "--clock-jitter=0",
      "--clock-synchro=0"
    ),
  )
  private val mediaPlayer = MediaPlayer(libVlc)
  private val videoLayout = VLCVideoLayout(context)
  private val multicastLock: WifiManager.MulticastLock? =
    (context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager)
      ?.createMulticastLock("iptv-tv-multicast")
  private var activeUrl: String? = null
  private var released = false
  private var remoteEnabled = true
  private var isPausedByLifecycle = false

  val onStreamError by EventDispatcher()

  init {
    setBackgroundColor(Color.BLACK)
    videoLayout.fitsSystemWindows = false
    addView(
      videoLayout,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
    )
    mediaPlayer.attachViews(videoLayout, null, true, true)
    try {
      mediaPlayer.aspectRatio = "16:9"
    } catch (_: Exception) {}

    mediaPlayer.setEventListener { event ->
      if (event.type == MediaPlayer.Event.EncounteredError) {
        post {
          onStreamError(
            mapOf("message" to "No multicast video was received. Check the TV network and stream."),
          )
        }
      }
    }
    try {
      multicastLock?.let { lock ->
        lock.setReferenceCounted(false)
        if (!lock.isHeld) lock.acquire()
      }
    } catch (_: SecurityException) {
      post {
        onStreamError(
          mapOf("message" to "Multicast access is unavailable on this TV network."),
        )
      }
    }
  }

  fun setStreamUrl(url: String?) {
    if (released || url.isNullOrBlank() || url == activeUrl) return
    activeUrl = url

    post {
      if (released) return@post
      try {
        mediaPlayer.stop()
        val media = Media(libVlc, Uri.parse(url))
        media.addOption(":network-caching=300")
        media.addOption(":udp-caching=300")
        media.addOption(":clock-jitter=0")
        media.addOption(":clock-synchro=0")
        mediaPlayer.media = media
        media.release()
        mediaPlayer.play()
        try {
          mediaPlayer.aspectRatio = "16:9"
        } catch (_: Exception) {}
        isPausedByLifecycle = false
      } catch (_: Exception) {
        onStreamError(
          mapOf("message" to "Could not open this UDP stream. Check its address and port."),
        )
      }
    }
  }

  fun setRemoteEnabled(enabled: Boolean) {
    remoteEnabled = enabled
    isFocusable = enabled
    isFocusableInTouchMode = enabled
  }

  override fun onWindowVisibilityChanged(visibility: Int) {
    super.onWindowVisibilityChanged(visibility)
    if (visibility != View.VISIBLE) {
      stopPlaybackForBackground()
    } else {
      resumePlaybackFromBackground()
    }
  }

  private fun stopPlaybackForBackground() {
    post {
      if (released) return@post
      if (mediaPlayer.isPlaying) {
        isPausedByLifecycle = true
        try {
          mediaPlayer.stop()
        } catch (_: Exception) {}
      }
      try {
        if (multicastLock?.isHeld == true) {
          multicastLock.release()
        }
      } catch (_: Exception) {}
    }
  }

  private fun resumePlaybackFromBackground() {
    post {
      if (released) return@post
      try {
        if (multicastLock?.isHeld == false) {
          multicastLock.acquire()
        }
      } catch (_: Exception) {}

      if (isPausedByLifecycle && !activeUrl.isNullOrEmpty()) {
        isPausedByLifecycle = false
        try {
          mediaPlayer.stop()
          val url = activeUrl
          if (url != null) {
            val media = Media(libVlc, Uri.parse(url))
            media.addOption(":network-caching=300")
            media.addOption(":udp-caching=300")
            media.addOption(":clock-jitter=0")
            media.addOption(":clock-synchro=0")
            mediaPlayer.media = media
            media.release()
            mediaPlayer.play()
            try {
              mediaPlayer.aspectRatio = "16:9"
            } catch (_: Exception) {}
          }
        } catch (_: Exception) {}
      }
    }
  }

  override fun onDetachedFromWindow() {
    releasePlayer()
    super.onDetachedFromWindow()
  }

  private fun releasePlayer() {
    if (released) return
    released = true
    try {
      mediaPlayer.stop()
      mediaPlayer.detachViews()
      mediaPlayer.release()
      libVlc.release()
      if (multicastLock?.isHeld == true) multicastLock.release()
    } catch (_: Exception) {
      // Cleanup should not prevent the Android view from detaching.
    }
  }
}
