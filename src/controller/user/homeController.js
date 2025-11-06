// Home Controller for handling home page

class HomeController {
    static getHome(req, res) {
        try {
            res.render("user/index", {
                title: "Bean & Brew - Premium Coffee Experience",
                page: "home"
            });
        } catch (error) {
            console.error("Error rendering home page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }
}

export default HomeController;