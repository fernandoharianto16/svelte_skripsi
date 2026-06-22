import midtransClient from 'midtrans-client';
import 'dotenv/config';
// const MIDTRANS_SERVER_KEY = import.meta.env.MIDTRANS_SERVER_KEY;

export const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: ""
});

export async function createSnapToken(orderData) {
    const parameter = {
        transaction_details: { 
            order_id: orderData.id, 
            gross_amount: orderData.total 
        },
        customer_details: { 
            first_name: orderData.name, 
            email: orderData.email 
        }
    };
    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
}