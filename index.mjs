import "dotenv/config";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DG_API_KEY = process.env.DG_API_KEY;
const DG_URL = process.env.DG_URL;

// Set the path to your audio file (output.mp3)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_FILE_PATH = path.resolve(__dirname, "audio", "output7-ch.mp3");

// Map of common audio file extensions to MIME types
const MIME_TYPES = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

// Determine the MIME type based on file extension
const fileExtension = path.extname(AUDIO_FILE_PATH).slice(1); // Get extension without the dot
const contentType = MIME_TYPES[fileExtension] || "audio/wav"; // Default to 'audio/wav' if unknown

const OUTPUT_DIR = path.resolve(__dirname, "output");

async function transcribeAudio() {
  try {
    // Read the audio file
    const audioData = fs.readFileSync(AUDIO_FILE_PATH);

    const response = await axios({
      method: "post",
      url: DG_URL,
      headers: {
        Authorization: `Token ${DG_API_KEY}`,
        "Content-Type": contentType,
      },
      data: audioData,
    });

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get the base name of the input file
    const inputBaseName = path.basename(
      AUDIO_FILE_PATH,
      path.extname(AUDIO_FILE_PATH)
    );
    const outputPath = path.join(OUTPUT_DIR, `${inputBaseName}.json`);

    // Write the response to the output file
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    console.log(`Response written to ${outputPath}`);
  } catch (error) {
    console.error("Error transcribing audio:", error);
  }
}

transcribeAudio();
