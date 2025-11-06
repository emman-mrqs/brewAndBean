// Reviews Controller for handling reviews page

class ReviewsController {
    static getReviews(req, res) {
        try {
            res.render("user/reviews", {
                title: "Reviews - Bean & Brew",
                page: "reviews"
            });
        } catch (error) {
            console.error("Error rendering reviews page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Add review functionality (future)
    static addReview(req, res) {
        try {
            // Implementation for adding reviews
            res.json({ success: true, message: "Review added successfully" });
        } catch (error) {
            console.error("Error adding review:", error);
            res.status(500).json({ success: false, message: "Failed to add review" });
        }
    }
}

export default ReviewsController;