/* ============================================
   ADMIN BRANCHES CONTROLLER
   ============================================ */

import db from '../../database/db.js';

// Get all branches
const getAllBranches = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM branches ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            branches: result.rows
        });
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch branches'
        });
    }
};

// Get single branch
const getBranch = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'SELECT * FROM branches WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }
        
        res.json({
            success: true,
            branch: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching branch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch branch'
        });
    }
};

// Create new branch
const createBranch = async (req, res) => {
    try {
        const { name, street, city, zipcode } = req.body;
        
        // Validation
        if (!name || !street || !city) {
            return res.status(400).json({
                success: false,
                message: 'Branch name, street, and city are required'
            });
        }
        
        const result = await db.query(
            `INSERT INTO branches (name, street, city, zipcode, created_at) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
            [name, street, city, zipcode || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Branch created successfully',
            branchId: result.rows[0].id
        });
    } catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create branch'
        });
    }
};

// Update branch
const updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, street, city, zipcode } = req.body;
        
        // Validation
        if (!name || !street || !city) {
            return res.status(400).json({
                success: false,
                message: 'Branch name, street, and city are required'
            });
        }
        
        // Check if branch exists
        const existing = await db.query('SELECT id FROM branches WHERE id = $1', [id]);
        
        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }
        
        await db.query(
            `UPDATE branches 
             SET name = $1, street = $2, city = $3, zipcode = $4
             WHERE id = $5`,
            [name, street, city, zipcode || null, id]
        );
        
        res.json({
            success: true,
            message: 'Branch updated successfully'
        });
    } catch (error) {
        console.error('Error updating branch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update branch'
        });
    }
};

// Delete branch
const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if branch exists
        const existing = await db.query('SELECT id FROM branches WHERE id = $1', [id]);
        
        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Branch not found'
            });
        }
        
        await db.query('DELETE FROM branches WHERE id = $1', [id]);
        
        res.json({
            success: true,
            message: 'Branch deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting branch:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete branch'
        });
    }
};

// Render branches page
const renderBranchesPage = (req, res) => {
    res.render('admin/branches', {
        page: 'admin-branches',
        user: req.user
    });
};

export default {
    getAllBranches,
    getBranch,
    createBranch,
    updateBranch,
    deleteBranch,
    renderBranchesPage
};
