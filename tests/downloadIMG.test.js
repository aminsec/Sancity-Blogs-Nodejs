import { describe, it, expect } from "vitest";
const { downloadImageAndSave } = require("../src/utils/operations");
const crypto = require('crypto');

describe("downloadImageAndSave", () => {
    it("must download image and save to given path", async () => {
        const url = "https://images.pexels.com/photos/1550337/pexels-photo-1550337.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280";
        const pathToUpload = "/var/www/html/api/uploads";
        const fileName = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
        const result = await downloadImageAndSave(url, pathToUpload, fileName)
        expect(result).toBeTruthy
    });
})