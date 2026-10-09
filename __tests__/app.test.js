import request from "supertest";
import app from "../app.js";

describe("GET /", () => {
  test("debe responder con status 200 y servir el dashboard (HTML)", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/html/);
  });
});

describe("GET /up", () => {
  test("debe responder con status 200 y un mensaje de servidor activo", async () => {
    const response = await request(app).get("/up");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
