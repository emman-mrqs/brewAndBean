import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PayPal Client Configuration
 * Sets up PayPal SDK environment (Sandbox or Live)
 */
function environment() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const mode = process.env.PAYPAL_MODE || 'sandbox';

    if (!clientId || !clientSecret) {
        throw new Error('PayPal credentials are missing in environment variables');
    }

    if (mode === 'sandbox') {
        return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
    } else {
        return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
    }
}

/**
 * Returns PayPal HTTP client instance with environment configuration
 */
function client() {
    return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

export default client;
