// Lớp bọc gọi Claude API: streaming, web search, xử lý pause_turn / refusal, trích nguồn.
import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic();
export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const USE_FALLBACKS = (process.env.CLAUDE_FALLBACKS || "on") !== "off";

export const WEB_TOOLS = [
  {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: Number(process.env.WEB_SEARCH_MAX_USES || 15),
    user_location: { type: "approximate", city: "Paris", country: "FR", timezone: "Europe/Paris" },
  },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 10 },
];

export class ClaudeRefusal extends Error {}

function buildParams({ system, messages, web, effort, maxTokens, format }) {
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
    thinking: { type: "adaptive" },
    output_config: { effort, ...(format ? { format: { type: "json_schema", schema: format } } : {}) },
    cache_control: { type: "ephemeral" }, // tự động cache phần prefix (tài liệu, lịch sử chat)
  };
  if (web) params.tools = WEB_TOOLS;
  if (USE_FALLBACKS) {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }
  return params;
}

/**
 * Gọi Claude (streaming bên dưới để tránh timeout) và trả về toàn bộ nội dung.
 * onText(delta) nhận từng đoạn chữ nếu muốn hiển thị trực tiếp.
 * Trả về { text, content, sources, json }.
 */
export async function ask({
  system,
  messages,
  web = false,
  effort = "high",
  maxTokens = 64000,
  format,
  onText,
}) {
  const params = buildParams({ system, messages: [...messages], web, effort, maxTokens, format });
  const allContent = [];
  let msg;
  for (let i = 0; i < 6; i++) {
    const stream = client.beta.messages.stream(params);
    if (onText) stream.on("text", onText);
    msg = await stream.finalMessage();
    allContent.push(...msg.content);
    if (msg.stop_reason === "pause_turn") {
      // Server tạm dừng vòng web search: gửi lại để nó chạy tiếp.
      params.messages = [...params.messages, { role: "assistant", content: msg.content }];
      continue;
    }
    break;
  }
  if (msg.stop_reason === "refusal") {
    throw new ClaudeRefusal(msg.stop_details?.explanation || "Claude đã từ chối yêu cầu này.");
  }
  const text = allContent
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const result = { text, content: allContent, sources: collectSources(allContent), stopReason: msg.stop_reason };
  if (format) {
    try {
      result.json = JSON.parse(text);
    } catch {
      throw new Error("Không đọc được JSON từ Claude (stop_reason=" + msg.stop_reason + ")");
    }
  }
  return result;
}

export function collectSources(content) {
  const seen = new Map();
  for (const b of content) {
    if (b.type === "text" && Array.isArray(b.citations)) {
      for (const c of b.citations) if (c.url && !seen.has(c.url)) seen.set(c.url, c.title || c.url);
    }
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content) if (r.url && !seen.has(r.url)) seen.set(r.url, r.title || r.url);
    }
  }
  return [...seen].map(([url, title]) => ({ url, title }));
}

/** Chuyển file đã upload thành content block cho Claude. */
export function fileToBlock({ mime, base64, text, name }) {
  if (mime === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 }, title: name };
  }
  if (/^image\/(png|jpeg|gif|webp)$/.test(mime)) {
    return { type: "image", source: { type: "base64", media_type: mime, data: base64 } };
  }
  if (text !== undefined) {
    return { type: "document", source: { type: "text", media_type: "text/plain", data: text }, title: name };
  }
  throw new Error(`Định dạng chưa hỗ trợ: ${mime} (${name}). Hãy xuất ra PDF hoặc ảnh.`);
}
