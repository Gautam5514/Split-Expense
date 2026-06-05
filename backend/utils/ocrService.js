import Tesseract from "tesseract.js";

/**
 * Persistent Tesseract worker - created once, reused for every OCR request.
 *
 * Why: Tesseract.recognize() creates + destroys a new worker on every call
 * (~2-3 s of init overhead per expense upload). A persistent worker pays that
 * cost once at startup and keeps the subprocess alive for the life of the server.
 */

let workerPromise = null;

const spawnWorker = () => {
  workerPromise = Tesseract.createWorker("eng")
    .then((w) => {
      console.log("✅ Tesseract OCR worker ready");
      return w;
    })
    .catch((err) => {
      console.error("❌ OCR worker failed to initialize:", err.message);
      workerPromise = null; // allow retry on next request
      throw err;
    });
  return workerPromise;
};

const getWorker = () => workerPromise ?? spawnWorker();

// Warm up immediately so the first upload request doesn't pay init cost
getWorker().catch(() => {});

/**
 * Run OCR on a URL or local file path.
 * Returns extracted text string, or null if nothing useful was recognized.
 */
export const runOcr = async (fileUrl) => {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(fileUrl);
    return data.text?.trim() || null;
  } catch (err) {
    // Worker may have crashed - reset so the next call re-initializes it
    if (workerPromise) {
      workerPromise.then((w) => w.terminate()).catch(() => {});
      workerPromise = null;
    }
    throw err;
  }
};
