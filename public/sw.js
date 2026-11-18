// Service worker tối giản: cho phép "Thêm vào màn hình chính" như một app. Không cache dữ liệu API.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
