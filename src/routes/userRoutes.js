import express from "express";

// Import Individual Controllers
import HomeController from "../controller/user/homeController.js";
import MenuController from "../controller/user/menuController.js";
import AboutController from "../controller/user/aboutController.js";
import SpecialtiesController from "../controller/user/specialtiesController.js";
import ReviewsController from "../controller/user/reviewsController.js";
import ContactController from "../controller/user/contactController.js";
import DownloadController from "../controller/user/downloadController.js";
import CartController from "../controller/user/cartController.js";
import DashboardController from "../controller/user/dashboardController.js";
import OrderController from "../controller/user/orderController.js";
import PaymentController from "../controller/user/paymentController.js";
import UserSettingsController from "../controller/user/userSettingsController.js";

// Import Authentication Middleware
import { requireAuth, requireAuthAPI, requireVerification, checkSuspension } from "../middleware/auth.js";

const router = express.Router();

// Apply suspension check middleware to all routes
router.use(checkSuspension);

// Home routes
router.get("/", HomeController.getHome);
router.get("/home", HomeController.getHome);

// Main pages routes
router.get("/menu", MenuController.getMenu);
router.get("/api/products", MenuController.getProducts);
router.get("/about", AboutController.getAbout);
router.get("/specialties", SpecialtiesController.getSpecialties);
router.get("/reviews", ReviewsController.getReviews);
router.get("/contact", ContactController.getContact);
router.get("/download", DownloadController.getDownload);
router.get("/download/app", DownloadController.downloadApk);


// User dashboard and account routes (protected)
router.get("/dashboard", requireAuth, DashboardController.getDashboard);
router.get("/api/dashboard/stats", requireAuthAPI, DashboardController.getUserStats);
router.get("/api/dashboard/recent-orders", requireAuthAPI, DashboardController.getRecentOrders);
router.get("/api/dashboard/cart-preview", requireAuthAPI, DashboardController.getCartPreview);
router.get("/settings", requireAuth, UserSettingsController.getSettings);
router.post("/settings/profile", requireAuth, UserSettingsController.updateProfile);
router.post("/settings/password", requireAuth, UserSettingsController.updatePassword);

// Cart routes (protected)
router.get("/cart", requireAuth, CartController.getCart);
router.get("/api/cart/items", requireAuthAPI, CartController.getCartItems);
router.get("/api/cart/count", requireAuthAPI, CartController.getCartCount);
router.post("/cart/add", requireAuthAPI, CartController.addToCart);
router.delete("/cart/remove/:itemId", requireAuthAPI, CartController.removeFromCart);
router.put("/cart/update/:itemId", requireAuthAPI, CartController.updateCartItem);
router.delete("/cart/clear", requireAuthAPI, CartController.clearCart);

// Order routes (protected and verified)
router.get("/checkout", requireAuth, requireVerification, OrderController.getCheckout);
router.get("/order-history", requireAuth, OrderController.getOrderHistory);
router.get("/order-preview", requireAuth, OrderController.getOrderPreview);
router.post("/order/process", requireAuth, requireVerification, OrderController.processOrder);

// Order API routes
router.post("/api/orders", requireAuth, requireVerification, OrderController.createOrder);
router.get("/api/orders/history", requireAuth, OrderController.getOrderHistoryData); // Get order history (completed/cancelled)
router.get("/api/orders/current", requireAuth, OrderController.getCurrentOrders); // Get current orders (not completed/cancelled)
router.post("/api/orders/:orderId/cancel", requireAuth, OrderController.cancelOrder); // Cancel order
router.get("/api/orders/:orderId", requireAuth, OrderController.getOrder);
router.get("/api/orders/:orderId/payment", requireAuth, OrderController.getOrderPayment); // Get payment details
router.get("/api/orders", requireAuth, OrderController.getUserOrders);
router.put("/api/orders/:orderId/status", requireAuth, OrderController.updateOrderStatus);
router.get("/api/notifications/count", requireAuthAPI, OrderController.getNotificationCount);

// Public API for branches (for checkout page)
router.get("/api/branches", OrderController.getBranches);

// Payment routes (protected and verified)
router.get("/payment", requireAuth, requireVerification, PaymentController.getPaymentCheckout); // Payment checkout page
router.post("/api/orders/payment", requireAuth, PaymentController.processPayment); // Process payment API

// PayPal routes
router.post("/api/paypal/create-order", requireAuth, requireVerification, PaymentController.createPayPalOrder);
router.post("/api/paypal/capture-payment", requireAuth, requireVerification, PaymentController.capturePayPalPayment);
router.get("/api/paypal/success", PaymentController.paypalSuccess);
router.get("/api/paypal/cancel", PaymentController.paypalCancel);

// Order confirmation route
router.get("/order-confirmation", requireAuth, requireVerification, (req, res) => {
    res.render("user/orderConfirmation", {
        title: "Order Confirmation - Bean & Brew",
        page: "checkout"
    });
});

// API routes for forms and functionality
router.post("/contact/submit", ContactController.submitContactForm);
router.post("/reviews/add", ReviewsController.addReview);
router.post("/settings/update", UserSettingsController.updateSettings);

export default router;