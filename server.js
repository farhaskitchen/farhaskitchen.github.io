const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord webhook URL for order notifications
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// Middleware
app.use(cors());
app.use(express.json());

// Store orders in memory (in production, use a database)
let orders = [];

// Function to send Discord notification
async function sendDiscordNotification(order) {
    if (!DISCORD_WEBHOOK_URL) {
        console.log('Discord webhook not configured');
        return;
    }

    try {
        const itemsList = order.items.map(item => 
            `${item.quantity}x ${item.name} - £${item.total.toFixed(2)}`
        ).join('\n');

        const embed = {
            title: "🆕 New Order Received!",
            color: 0xFFD700, // Gold color
            fields: [
                {
                    name: "📦 Order Details",
                    value: `**Order ID:** ${order.id}\n**Status:** ${order.status}`,
                    inline: false
                },
                {
                    name: "🍽️ Items Ordered",
                    value: itemsList || "No items",
                    inline: false
                },
                {
                    name: "💰 Total Amount",
                    value: `**£${order.total.toFixed(2)}**`,
                    inline: true
                },
                {
                    name: "💳 Payment Method",
                    value: order.paymentMethod === 'paypal' ? 'PayPal' : 'Pay at Pickup',
                    inline: true
                },
                {
                    name: "👤 Customer Information",
                    value: `**Name:** ${order.customer.name}\n**Email:** ${order.customer.email}\n**Phone:** ${order.customer.phone}`,
                    inline: false
                },
                {
                    name: "📱 Contact Preference",
                    value: order.customer.contactMethod === 'whatsapp' ? '✅ WhatsApp' : '📧 Email',
                    inline: true
                },
                {
                    name: "📅 Pickup Required On",
                    value: `**Date:** ${order.pickup.date}\n**Time:** ${order.pickup.time}`,
                    inline: false
                },
                {
                    name: "🕐 Order Placed",
                    value: new Date(order.createdAt).toLocaleString('en-GB', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                    }),
                    inline: false
                }
            ],
            footer: {
                text: "Farha's Kitchen Order System"
            },
            timestamp: new Date(order.createdAt).toISOString()
        };

        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: "🔔 **NEW ORDER ALERT!** 🔔",
                embeds: [embed]
            })
        });

        if (response.ok) {
            console.log('Discord notification sent successfully');
        } else {
            console.error('Failed to send Discord notification:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending Discord notification:', error);
    }
}

// HTML content embedded
const htmlContent = require('fs').readFileSync(__dirname + '/farhas-kitchen.html', 'utf8');

// Serve the main website
app.get('/', (req, res) => {
    res.send(htmlContent);
});

// API endpoint to receive orders
app.post('/api/orders', async (req, res) => {
    try {
        const order = {
            id: Date.now().toString(),
            ...req.body,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        orders.push(order);
        
        // Send Discord notification
        await sendDiscordNotification(order);
        
        console.log('New order received:', order);
        
        res.json({
            success: true,
            orderId: order.id,
            message: 'Order received successfully'
        });
    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing order'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Website: http://localhost:${PORT}`);
    console.log(`🔔 Discord Webhook: ${DISCORD_WEBHOOK_URL ? '✅ Configured' : '❌ Not configured'}`);
});
