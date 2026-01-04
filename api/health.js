export default async function handler(_request) {
  return new Response("ok\n", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
