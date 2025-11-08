const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendPushNotification = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }
    
    try {
        const { tokens, title, body, data } = req.body;
        
        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            res.status(400).send({ error: 'No tokens provided' });
            return;
        }
        
        const message = {
            notification: {
                title: title,
                body: body
            },
            data: data || {},
            tokens: tokens
        };
        
        const response = await admin.messaging().sendMulticast(message);
        
        console.log(`Successfully sent ${response.successCount} messages`);
        res.status(200).send({ 
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount
        });
        
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).send({ error: error.message });
    }
});
