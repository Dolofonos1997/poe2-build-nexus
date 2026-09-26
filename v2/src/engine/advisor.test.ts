import { it, expect, vi } from "vitest";
import {
  createHandler,
  type Dependencies,
} from "../../../supabase/functions/temple-advisor/handler";
import { emptyBoard } from "./temple";
const body = () => ({
  board: emptyBoard(),
  hand: ["gen", null, null, null, null, null],
  goal: "crafting",
  architectDefeated: false,
  preventLoops: true,
});
function setup(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    origin: "https://example.com",
    model: "test-model",
    apiKey: "test-only",
    authorize: async () => "user",
    claim: async () => true,
    save: vi.fn(async () => {}),
    fetch: vi.fn(async () =>
      Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  candidate: 0,
                  explanation: "Extends crafting.",
                  caution: "Heuristic only.",
                }),
              },
            ],
          },
        ],
        usage: { input_tokens: 100, output_tokens: 30 },
      }),
    ),
    ...overrides,
  };
  return { deps, handle: createHandler(deps) };
}
function req(data: unknown = body()) {
  return new Request("https://example.com/ai", {
    method: "POST",
    headers: { Origin: "https://example.com", Authorization: "Bearer test" },
    body: JSON.stringify(data),
  });
}
it("rejects unauthenticated requests before model calls", async () => {
  const { handle, deps } = setup({ authorize: async () => null });
  expect((await handle(req())).status).toBe(401);
  expect(deps.fetch).not.toHaveBeenCalled();
});
it("enforces quota before provider calls", async () => {
  const { handle, deps } = setup({ claim: async () => false });
  expect((await handle(req())).status).toBe(429);
  expect(deps.fetch).not.toHaveBeenCalled();
});
it("rejects invalid boards and oversized requests", async () => {
  const { handle } = setup();
  expect((await handle(req({ ...body(), board: [] }))).status).toBe(400);
  expect((await handle(req({ padding: "x".repeat(17000) }))).status).toBe(413);
});
it("returns only server-computed legal moves and records usage", async () => {
  const { handle, deps } = setup();
  const r = await handle(req());
  expect(r.status).toBe(200);
  const data = await r.json();
  expect(data.move.k).toBe("gen");
  expect(data.id).toBeTruthy();
  expect(deps.save).toHaveBeenLastCalledWith(
    expect.objectContaining({
      status: "completed",
      inputTokens: 100,
      outputTokens: 30,
    }),
  );
});
it("rejects invented model moves and safely handles provider failure", async () => {
  const { handle } = setup({
    fetch: async () =>
      Response.json({
        status: "completed",
        output: [
          {
            content: [
              {
                type: "output_text",
                text: '{"candidate":99,"explanation":"bad","caution":"bad"}',
              },
            ],
          },
        ],
      }),
  });
  expect((await handle(req())).status).toBe(502);
});
