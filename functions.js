export default {
  async fetch(request) {
    return Response.json({
      ok: true,
      name: "pg-cardbazaar",
      path: new URL(request.url).pathname,
    });
  },
};
