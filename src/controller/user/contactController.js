// Contact Controller for handling contact page

class ContactController {
    static getContact(req, res) {
        try {
            res.render("user/contact", {
                title: "Contact Us - Bean & Brew",
                page: "contact"
            });
        } catch (error) {
            console.error("Error rendering contact page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Handle contact form submission
    static submitContactForm(req, res) {
        try {
            // Implementation for contact form submission
            const { name, email, message } = req.body;
            
            // In a real implementation, you would save to database or send email
            console.log("Contact form submission:", { name, email, message });
            
            res.json({ success: true, message: "Message sent successfully" });
        } catch (error) {
            console.error("Error submitting contact form:", error);
            res.status(500).json({ success: false, message: "Failed to send message" });
        }
    }
}

export default ContactController;