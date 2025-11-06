// Specialties Controller for handling specialties page

class SpecialtiesController {
    static getSpecialties(req, res) {
        try {
            res.render("user/specialties", {
                title: "Our Specialties - Bean & Brew",
                page: "specialties"
            });
        } catch (error) {
            console.error("Error rendering specialties page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }
}

export default SpecialtiesController;