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

// User dashboard and account routes
router.get("/dashboard", DashboardController.getDashboard);
router.get("/settings", UserSettingsController.getSettings);
router.get("/favorites", UserSettingsController.getFavorites);
router.get("/rewards", UserSettingsController.getRewards);

// Cart routes
router.get("/cart", CartController.getCart);
router.post("/cart/add", CartController.addToCart);
router.delete("/cart/remove/:productId", CartController.removeFromCart);
router.put("/cart/update/:productId", CartController.updateCartItem);

// Order routes
router.get("/checkout", OrderController.getCheckout);
router.get("/order-history", OrderController.getOrderHistory);
router.get("/order-preview", OrderController.getOrderPreview);
router.post("/order/process", OrderController.processOrder);

// Payment routes
router.get("/payment", PaymentController.getPayment);
router.post("/payment/process", PaymentController.processPayment);

// API routes for forms and functionality
router.post("/contact/submit", ContactController.submitContactForm);
router.post("/reviews/add", ReviewsController.addReview);
router.post("/settings/update", UserSettingsController.updateSettings);
router.post("/favorites/add", UserSettingsController.addToFavorites);

export default router;