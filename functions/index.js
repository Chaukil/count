const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Gửi notification khi có dữ liệu mới
exports.sendDataUploadNotification = functions.firestore
    .document('categories/{categoryId}')
    .onUpdate(async (change, context) => {
        try {
            const newData = change.after.data();
            const oldData = change.before.data();
            
            // Kiểm tra có notification mới không
            if (!newData.lastSaveNotification || 
                newData.lastSaveNotification === oldData.lastSaveNotification) {
                return null;
            }
            
            const notification = newData.lastSaveNotification;
            const categoryName = notification.categoryName;
            const itemCount = notification.itemCount;
            
            // Lấy danh sách FCM tokens đang active
            const tokensSnapshot = await admin.firestore()
                .collection('fcmTokens')
                .where('enabled', '==', true)
                .get();
            
            if (tokensSnapshot.empty) {
                console.log('No active tokens found');
                return null;
            }
            
            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
            
            // Tạo message
            const message = {
                notification: {
                    title: `📋 ${categoryName}`,
                    body: `Đã có ${itemCount} dòng dữ liệu mới. Đã đến lúc kiểm kê!`
                },
                data: {
                    categoryId: context.params.categoryId,
                    categoryName: categoryName,
                    itemCount: String(itemCount),
                    type: 'data_upload'
                }
            };
            
            // Gửi đến tất cả tokens
            const response = await admin.messaging().sendToDevice(tokens, message);
            
            console.log(`Sent notification to ${response.successCount} devices`);
            
            // Xóa tokens không hợp lệ
            const tokensToRemove = [];
            response.results.forEach((result, index) => {
                const error = result.error;
                if (error) {
                    console.error('Error sending to token:', tokens[index], error);
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        tokensToRemove.push(tokens[index]);
                    }
                }
            });
            
            // Xóa invalid tokens
            if (tokensToRemove.length > 0) {
                const batch = admin.firestore().batch();
                tokensToRemove.forEach(token => {
                    batch.delete(admin.firestore().collection('fcmTokens').doc(token));
                });
                await batch.commit();
                console.log(`Removed ${tokensToRemove.length} invalid tokens`);
            }
            
            return response;
            
        } catch (error) {
            console.error('Error sending notification:', error);
            return null;
        }
    });
