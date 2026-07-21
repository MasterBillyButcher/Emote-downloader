import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveExtension, sanitizeFilename, extractChannelName, isFormatAllowed } from "../lib/emote-sources.js";

test("resolveExtension prefers the real Content-Type header over the guessed extension", () => {
  // This is the exact bug ADR-002 exists to prevent: a source's "typical"
  // format guess must never win over what the server actually sent.
  assert.equal(resolveExtension("gif", "image/webp"), "webp");
  assert.equal(resolveExtension("png", "image/gif; charset=binary"), "gif");
  assert.equal(resolveExtension("gif", "IMAGE/PNG"), "png"); // case-insensitive
});

test("resolveExtension falls back to the guessed extension when Content-Type is missing or unrecognized", () => {
  assert.equal(resolveExtension("gif", null), "gif");
  assert.equal(resolveExtension("gif", ""), "gif");
  assert.equal(resolveExtension("png", "application/octet-stream"), "png");
});

test("sanitizeFilename strips characters invalid on Windows/macOS/Linux filesystems", () => {
  assert.equal(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j'), "a_b_c_d_e_f_g_h_i_j");
  assert.equal(sanitizeFilename("NormalName"), "NormalName");
});

test("extractChannelName handles a plain login", () => {
  assert.equal(extractChannelName("SomeStreamer"), "somestreamer");
});

test("extractChannelName handles a full twitch.tv URL", () => {
  assert.equal(extractChannelName("https://www.twitch.tv/SomeStreamer"), "somestreamer");
  assert.equal(extractChannelName("twitch.tv/SomeStreamer/videos"), "somestreamer");
});

test("extractChannelName handles a leading @ handle and surrounding whitespace", () => {
  assert.equal(extractChannelName("  @SomeStreamer  "), "somestreamer");
});

test("extractChannelName returns an empty string for empty/undefined input rather than throwing", () => {
  assert.equal(extractChannelName(""), "");
  assert.equal(extractChannelName(undefined), "");
});

test("isFormatAllowed: 'both' allows everything", () => {
  assert.equal(isFormatAllowed(true, "both"), true);
  assert.equal(isFormatAllowed(false, "both"), true);
});

test("isFormatAllowed: 'gif' allows only animated", () => {
  assert.equal(isFormatAllowed(true, "gif"), true);
  assert.equal(isFormatAllowed(false, "gif"), false);
});

test("isFormatAllowed: 'png' allows only static", () => {
  assert.equal(isFormatAllowed(false, "png"), true);
  assert.equal(isFormatAllowed(true, "png"), false);
});
