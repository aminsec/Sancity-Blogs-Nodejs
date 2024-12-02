import { describe, it, expect } from "vitest";
const { genBcrypt } = require("../utils/opt")

describe("genBcrypt", () => {
    it("must create bcrypt hash", async () => {
        const result = await genBcrypt("create", "123")
        expect(result).toBeTypeOf("string")
    });
})