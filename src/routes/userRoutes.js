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
import { requireAuth, requireVerification } from "../middleware/auth.js";

const router = express.Router();

// Home routes
router.get("/", HomeController.getHome);
router.get("/home", HomeController.getHome);

// Main pages routes
router.get("/menu", MenuController.getMenu);
router.get("/about", AboutController.getAbout);
router.get("/specialties", SpecialtiesController.getSpecialties);
router.get("/reviews", ReviewsController.getReviews);
router.get("/contact", ContactController.getContact);
router.get("/download", DownloadController.getDownload);

// User dashboard and account routes (protected)
router.get("/dashboard", requireAuth, DashboardController.getDashboard);
router.get("/settings", requireAuth, UserSettingsController.getSettings);
router.get("/favorites", requireAuth, UserSettingsController.getFavorites);
router.get("/rewards", requireAuth, UserSettingsController.getRewards);

// Cart routes (protected)
router.get("/cart", requireAuth, CartController.getCart);
router.post("/cart/add", requireAuth, CartController.addToCart);
router.delete("/cart/remove/:productId", requireAuth, CartController.removeFromCart);
router.put("/cart/update/:productId", requireAuth, CartController.updateCartItem);

// Order routes (protected and verified)
router.get("/checkout", requireAuth, requireVerification, OrderController.getCheckout);
router.get("/order-history", requireAuth, OrderController.getOrderHistory);
router.get("/order-preview", requireAuth, OrderController.getOrderPreview);
router.post("/order/process", requireAuth, requireVerification, OrderController.processOrder);

// Payment routes (protected and verified)
router.get("/payment", requireAuth, requireVerification, PaymentController.getPayment);
router.post("/payment/process", PaymentController.processPayment);

// API routes for forms and functionality
router.post("/contact/submit", ContactController.submitContactForm);
router.post("/reviews/add", ReviewsController.addReview);
router.post("/settings/update", UserSettingsController.updateSettings);
router.post("/favorites/add", UserSettingsController.addToFavorites);

export default router;