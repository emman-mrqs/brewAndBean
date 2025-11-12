// src/controller/user/downloadController.js
import fs from "fs";
import path from "path";

class DownloadController {
    /**
     * Render the download page
     */
    static getDownload(req, res) {
        try {
            res.render("user/download", {
                title: "Download App - Bean & Brew",
                page: "download",
            });
        } catch (error) {
            console.error("[DownloadController] Error rendering download page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    /**
     * Forces APK download using res.download()
     * - Validates file exists and is readable
     * - Logs request info for debugging / analytics
     */
    static downloadApk(req, res) {
        try {
            // Resolve path from project root (where you run node)
            const apkPath = path.join(process.cwd(), "src", "public", "uploads", "app", "Techora.apk");

            console.log(`[DownloadController] APK download requested from ${req.ip} at ${new Date().toISOString()}`);
            console.log(`[DownloadController] Checking file: ${apkPath}`);

            // Check existence and readability
            if (!fs.existsSync(apkPath)) {
                console.error(`[DownloadController] APK not found: ${apkPath}`);
                return res.status(404).send("APK not found on server.");
            }

            const stats = fs.statSync(apkPath);
            console.log(`[DownloadController] APK found. Size: ${stats.size} bytes`);

            // Optional: simple rate-limit/anti-abuse hint (no enforcement here)
            // If you want auth/rate-limit, check req.session / req.user here.

            // Send file (sets Content-Disposition and appropriate headers)
            res.download(apkPath, "BeanAndBrew.apk", (err) => {
                if (err) {
                    console.error(`[DownloadController] Error sending APK to ${req.ip}:`, err);
                    // If headers not sent, respond with 500 and message
                    if (!res.headersSent) {
                        res.status(500).send("Error occurred while sending the APK.");
                    } else {
                        // Headers already sent — just close
                        res.end();
                    }
                } else {
                    console.log(`[DownloadController] Successfully initiated APK download for ${req.ip}`);
                }
            });
        } catch (error) {
            console.error("[DownloadController] Unexpected error in downloadApk:", error);
            if (!res.headersSent) res.status(500).send("Internal Server Error.");
            else res.end();
        }
    }
}

export default DownloadController;
