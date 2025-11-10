import express from "express";

// Import Individual Admin Controllers
import AdminDashboardController from "../controller/admin/adminDashboardController.js";
import AdminUsersController from "../controller/admin/adminUsersController.js";
import AdminProductsController, { upload } from "../controller/admin/adminProductsController.js";
import AdminOrdersController from "../controller/admin/adminOrdersController.js";
import AdminReportsController from "../controller/admin/adminReportsController.js";
import AdminAuditController from "../controller/admin/adminAuditController.js";
import AdminBranchesController from "../controller/admin/adminBranchesController.js";

// Import authentication middleware
import {   requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Protect all admin routes with requireAdmin middleware
router.use(requireAdmin);

// Admin Dashboard Routes (require authentication)
router.get("/admin", AdminDashboardController.getDashboard);
router.get("/admin/dashboard",   AdminDashboardController.getDashboard);
router.get("/admin/dashboard/data",   AdminDashboardController.getDashboardData);

// Admin Users Management Routes
router.get("/admin/users",   AdminUsersController.getUsers);
router.get("/admin/api/users",   AdminUsersController.getAllUsers);
router.post("/admin/api/users",   AdminUsersController.createUser);
router.put("/admin/api/users/:userId",   AdminUsersController.updateUser);
router.delete("/admin/api/users/:userId",   AdminUsersController.deleteUser);
router.post("/admin/api/users/:userId/suspend",   AdminUsersController.suspendUser);
router.post("/admin/api/users/:userId/lift-suspension",   AdminUsersController.liftSuspension);

// Admin Products Management Routes
router.get("/admin/products",   AdminProductsController.getProducts);
router.get("/admin/api/products",   AdminProductsController.getAllProducts);
router.post("/admin/api/products",   upload.single('image'), AdminProductsController.createProduct);
router.put("/admin/api/products/:productId",   upload.single('image'), AdminProductsController.updateProduct);
router.delete("/admin/api/products/:productId",   AdminProductsController.deleteProduct);
router.patch("/admin/api/products/:productId/stock",   AdminProductsController.updateStock);

// Admin Orders Management Routes
router.get("/admin/orders",   AdminOrdersController.getOrders);
router.get("/admin/api/orders",   AdminOrdersController.getAllOrders);
router.get("/admin/api/orders/:orderId",   AdminOrdersController.getOrderDetails);
router.patch("/admin/api/orders/:orderId/status",   AdminOrdersController.updateOrderStatus);
router.delete("/admin/api/orders/:orderId",   AdminOrdersController.cancelOrder);

// Admin Reports Routes
router.get("/admin/reports",   AdminReportsController.getReports);
router.get("/admin/api/reports/sales",   AdminReportsController.getSalesReport);
router.get("/admin/api/reports/customers",   AdminReportsController.getCustomerReport);
router.get("/admin/api/reports/inventory",   AdminReportsController.getInventoryReport);

// Admin Branches Management Routes
router.get("/admin/branches",   AdminBranchesController.renderBranchesPage);
router.get("/api/admin/branches",   AdminBranchesController.getAllBranches);
router.get("/api/admin/branches/:id",   AdminBranchesController.getBranch);
router.post("/api/admin/branches",   AdminBranchesController.createBranch);
router.put("/api/admin/branches/:id",   AdminBranchesController.updateBranch);
router.delete("/api/admin/branches/:id",   AdminBranchesController.deleteBranch);

// Admin Audit Logs Routes
router.get("/admin/audit-logs",   AdminAuditController.getAuditLogs);
router.get("/admin/api/audit-logs",   AdminAuditController.getAllAuditLogs);
router.post("/admin/api/audit-logs",   AdminAuditController.createAuditLog);
router.get("/admin/api/audit-logs/filter",   AdminAuditController.filterAuditLogs);

export default router;
