// Admin Users Management Controller
import db from "../../database/db.js";
import { sendSuspensionEmail, sendSuspensionLiftedEmail } from "../../utils/emailService.js";

class AdminUsersController {
    static getUsers(req, res) {
        try {
            res.render("admin/users", {
                title: "User Management - Bean & Brew Admin",
                page: "admin-users"
            });
        } catch (error) {
            console.error("Error rendering admin users page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get all users
    static async getAllUsers(req, res) {
        try {
            const query = `
                SELECT 
                    id,
                    first_name,
                    last_name,
                    email,
                    phone,
                    is_verified,
                    is_suspended,
                    suspension_title,
                    suspension_reason,
                    suspension_at,
                    auth_provider,
                    created_at,
                    updated_at
                FROM users
                ORDER BY created_at DESC
            `;
            
            const result = await db.query(query);
            
            // Format users data
            const users = result.rows.map(user => {
                let status = 'pending';
                if (user.is_suspended) {
                    status = 'suspended';
                } else if (user.is_verified) {
                    status = 'active';
                }

                return {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A',
                    email: user.email,
                    phone: user.phone,
                    status: status,
                    isSuspended: user.is_suspended,
                    suspensionTitle: user.suspension_title,
                    suspensionReason: user.suspension_reason,
                    suspensionAt: user.suspension_at,
                    authProvider: user.auth_provider,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                };
            });
            
            res.json({ success: true, users });
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ success: false, message: "Failed to fetch users" });
        }
    }

    // Update user
    static async updateUser(req, res) {
        try {
            const { userId } = req.params;
            const { firstName, lastName } = req.body;

            // Validate required fields
            if (!firstName || !lastName) {
                return res.status(400).json({ 
                    success: false, 
                    message: "First name and last name are required" 
                });
            }

            const query = `
                UPDATE users 
                SET first_name = $1, 
                    last_name = $2, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const result = await db.query(query, [firstName, lastName, userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            res.json({ 
                success: true, 
                message: "User updated successfully",
                user: result.rows[0]
            });
        } catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ success: false, message: "Failed to update user" });
        }
    }

    // Suspend user
    static async suspendUser(req, res) {
        try {
            const { userId } = req.params;
            const { reason, suspensionType, suspensionEndDate, emailMessage, emailTitle } = req.body;

            // Get user details
            const userQuery = 'SELECT * FROM users WHERE id = $1';
            const userResult = await db.query(userQuery, [userId]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const user = userResult.rows[0];

            // Prepare suspension title
            const title = emailTitle || 'Account Suspension Notice - Bean & Brew';

            // Update user suspension status
            const updateQuery = `
                UPDATE users 
                SET is_suspended = true,
                    suspension_title = $1,
                    suspension_reason = $2,
                    suspension_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            await db.query(updateQuery, [title, reason, userId]);

            // Send suspension email
            const emailResult = await sendSuspensionEmail(
                user.email,
                user.first_name,
                reason,
                suspensionType,
                suspensionEndDate,
                emailMessage
            );

            if (!emailResult.success) {
                console.error('Failed to send suspension email:', emailResult.error);
            }

            res.json({ 
                success: true, 
                message: "User suspended successfully and notification email sent",
                emailSent: emailResult.success
            });
        } catch (error) {
            console.error("Error suspending user:", error);
            res.status(500).json({ success: false, message: "Failed to suspend user" });
        }
    }

    // Lift suspension
    static async liftSuspension(req, res) {
        try {
            const { userId } = req.params;

            // Get user details
            const userQuery = 'SELECT * FROM users WHERE id = $1';
            const userResult = await db.query(userQuery, [userId]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            const user = userResult.rows[0];

            // Update user suspension status
            const updateQuery = `
                UPDATE users 
                SET is_suspended = false,
                    suspension_title = NULL,
                    suspension_reason = NULL,
                    suspension_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            await db.query(updateQuery, [userId]);

            // Send suspension lifted email
            const emailResult = await sendSuspensionLiftedEmail(
                user.email,
                user.first_name
            );

            if (!emailResult.success) {
                console.error('Failed to send suspension lifted email:', emailResult.error);
            }

            res.json({ 
                success: true, 
                message: "Suspension lifted successfully and notification email sent",
                emailSent: emailResult.success
            });
        } catch (error) {
            console.error("Error lifting suspension:", error);
            res.status(500).json({ success: false, message: "Failed to lift suspension" });
        }
    }

    // Delete user
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            
            const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
            const result = await db.query(query, [userId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            res.json({ success: true, message: "User deleted successfully" });
        } catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ success: false, message: "Failed to delete user" });
        }
    }

    // Create new user (keeping for compatibility)
    static createUser(req, res) {
        try {
            const { name, email, password } = req.body;
            res.json({ success: true, message: "User created successfully" });
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ success: false, message: "Failed to create user" });
        }
    }
}

export default AdminUsersController;