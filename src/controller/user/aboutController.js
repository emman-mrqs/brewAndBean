// About Controller for handling about page

class AboutController {
    static getAbout(req, res) {
        try {
            res.render("user/about", {
                title: "About Us - Bean & Brew",
                page: "about"
            });
        } catch (error) {
            console.error("Error rendering about page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }
}

export default AboutController;