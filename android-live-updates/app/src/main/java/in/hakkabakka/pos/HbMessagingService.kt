package `in`.hakkabakka.pos

import `in`.hakkabakka.pos.R

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class HbMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        getSharedPreferences("hbpos", MODE_PRIVATE).edit().putString("fcm_token", token).apply()
        // Cloudflare token registration is connected once the Firebase project credentials are configured.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        createChannels(this)
        val d = message.data
        val type = d["type"] ?: "NEW_ORDER"
        val orderNo = d["order_number"] ?: "New order"
        val customer = d["customer_name"] ?: "Online customer"
        val total = d["total"] ?: "0"
        val items = d["items"] ?: "Please review the order"
        if (type == "ORDER_PROGRESS") showProgressUpdate(orderNo, customer, total, d["status"] ?: "PREPARING")
        else showNewOrder(orderNo, customer, total, items)
    }

    private fun showNewOrder(no: String, customer: String, total: String, items: String) {
        val open = PendingIntent.getActivity(this, no.hashCode(), Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("order_number", no)
        }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(this, CHANNEL_NEW)
            .setSmallIcon(R.drawable.ic_hb_notification)
            .setContentTitle("HakkaBakka · NEW ORDER")
            .setContentText("$no · $customer · ₹$total")
            .setStyle(NotificationCompat.BigTextStyle().bigText("Order: $no\nCustomer: $customer\nTotal: ₹$total\n$items"))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVibrate(longArrayOf(0, 350, 150, 350, 150, 700))
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        manager().notify(no.hashCode(), n)
    }

    private fun showProgressUpdate(no: String, customer: String, total: String, status: String) {
        val stage = when (status.uppercase()) { "PREPARING" -> 1; "READY" -> 2; "COMPLETED" -> 3; else -> 0 }
        val title = when (stage) { 1 -> "Preparing order $no"; 2 -> "Order $no is ready"; 3 -> "Order $no completed"; else -> "Order $no" }
        val open = PendingIntent.getActivity(this, no.hashCode(), Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val builder = Notification.Builder(this, CHANNEL_PROGRESS)
            .setSmallIcon(R.drawable.ic_hb_notification)
            .setContentTitle(title)
            .setContentText("$customer · ₹$total")
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setOngoing(stage != 3)
            .setOnlyAlertOnce(true)
            .setContentIntent(open)
            .setColor(Color.rgb(123, 17, 19))
            .setShowWhen(true)
        if (Build.VERSION.SDK_INT >= 36) {
            val style = Notification.ProgressStyle()
                .setProgress(stage * 33)
                .setProgressIndeterminate(stage == 0)
                .setProgressSegments(listOf(
                    Notification.ProgressStyle.Segment(33).setColor(Color.rgb(123,17,19)),
                    Notification.ProgressStyle.Segment(33).setColor(Color.rgb(194,151,66)),
                    Notification.ProgressStyle.Segment(34).setColor(Color.rgb(40,120,75))
                ))
                .setProgressPoints(listOf(
                    Notification.ProgressStyle.Point(33).setColor(Color.rgb(123,17,19)),
                    Notification.ProgressStyle.Point(66).setColor(Color.rgb(194,151,66)),
                    Notification.ProgressStyle.Point(100).setColor(Color.rgb(40,120,75))
                ))
            builder.setStyle(style)
            builder.setShortCriticalText(status.take(7))
        } else {
            builder.setStyle(Notification.BigTextStyle().bigText("Order: $no\n$customer · ₹$total\nStatus: $status"))
        }
        manager().notify(("progress-$no").hashCode(), builder.build())
        if (stage == 3) manager().cancel(("progress-$no").hashCode())
    }

    private fun manager() = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    companion object {
        const val CHANNEL_NEW = "hb_new_orders"
        const val CHANNEL_PROGRESS = "hb_order_progress"
        fun createChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val m = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val newOrders = NotificationChannel(CHANNEL_NEW, "New online orders", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Loud alert for every new HakkaBakka online order"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 350, 150, 350, 150, 700)
                    setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION).build())
                }
                val progress = NotificationChannel(CHANNEL_PROGRESS, "Active order progress", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Progress after admin accepts and starts preparing an order"
                }
                m.createNotificationChannel(newOrders)
                m.createNotificationChannel(progress)
            }
        }
    }
}
