// Chạy bản tin một lần từ dòng lệnh (dùng cho cron hệ thống / GitHub Actions): npm run digest
import * as store from "./db.js";
import { runDigest } from "./digest.js";

store.load();
const d = await runDigest();
console.log(`VERDICT: ${d.verdict}\n${d.resume}\n\n${d.markdown}`);
