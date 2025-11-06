// Download Controller for handling download page

class DownloadController {
    static getDownload(req, res) {
        try {
            res.render("user/download", {
                title: "Download App - Bean & Brew",
                page: "download"
            });
        } catch (error) {
            console.error("Error rendering download page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }
}

export default DownloadController;