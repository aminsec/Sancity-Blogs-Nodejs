import { describe, it, expect } from "vitest";
const { createClient } = require('pexels');

describe("pexelsAPI", () => {
    it("must show result all the way", async () => {
        const client = createClient(process.env.PEXELS_KEY);
        const query = "sport";

        //Quering to get an image
        client.photos.search({ query, per_page: 1 }).then(async photos => {
        expect(photos).toBeTypeOf("object")
        });
    })
})