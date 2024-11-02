import "dotenv/config";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";

// Set the path to your audio file (output.mp3)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_FILE_PATH = path.resolve(
  __dirname,
  "audio",
  // "output-italian-mixed.mp3"
  // "output-spanish-single.mp3"
  // "output-spanish-mixed.mp3"
  // "output-chinese-mixed.mp3"
  "output-chinese-single.mp3"
  // "output-spanglish-single.mp3"
);

// Map of common audio file extensions to MIME types
const MIME_TYPES = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

const OUTPUT_DIR = path.resolve(__dirname, "output");

async function transcribeDGAudio() {
  const DG_API_KEY = process.env.DG_API_KEY;
  const DG_URL = process.env.DG_URL;

  // Determine the MIME type based on file extension
  const fileExtension = path.extname(AUDIO_FILE_PATH).slice(1);
  const contentType = MIME_TYPES[fileExtension] || "audio/wav";

  try {
    const audioData = fs.readFileSync(AUDIO_FILE_PATH);

    const response = await axios({
      method: "post",
      url: `${DG_URL}`,
      headers: {
        Authorization: `Token ${DG_API_KEY}`,
        "Content-Type": contentType,
      },
      params: {
        diarize: true,
        detect_language: true,
        language: "multi",
        model: "nova-2",
        numerals: true,
        punctuate: true,
        utterances: true,
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

async function transcribeWhisperAudio(translateToEnglish = false) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  try {
    const audioData = fs.createReadStream(AUDIO_FILE_PATH);

    // Set up form data for Whisper API request
    const formData = new FormData();
    formData.append("file", audioData);
    formData.append("model", "whisper-1");

    // Choose endpoint based on translation preference
    const endpoint = translateToEnglish
      ? "https://api.openai.com/v1/audio/translations"
      : "https://api.openai.com/v1/audio/transcriptions";

    const response = await axios({
      method: "post",
      url: endpoint,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      data: formData,
    });

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const inputBaseName = path.basename(
      AUDIO_FILE_PATH,
      path.extname(AUDIO_FILE_PATH)
    );
    const outputPath = path.join(
      OUTPUT_DIR,
      `${inputBaseName}-whisper${
        translateToEnglish ? "-translated" : ""
      }-${Date.now()}.json`
    );

    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    console.log(`Response written to ${outputPath}`);
  } catch (error) {
    console.error("Error transcribing audio:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

async function transcribeGoogleCloudAudio() {
  const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;

  try {
    const audioData = fs.readFileSync(AUDIO_FILE_PATH).toString("base64");

    const requestPayload = {
      config: {
        encoding: "MP3",
        sampleRateHertz: 44100,
        languageCode: "zh",
        alternativeLanguageCodes: [
          "zh-CN",
          "zh-TW",
          "es-ES",
          "es-MX",
          "es-US",
          "it-IT",
          "it-ME",
        ],
        diarizationConfig: {
          enableSpeakerDiarization: true,
          minSpeakerCount: 2,
          maxSpeakerCount: 2,
        },
      },
      audio: {
        content: audioData,
      },
    };

    const response = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`,
      requestPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(response.data);

    const inputBaseName = path.basename(
      AUDIO_FILE_PATH,
      path.extname(AUDIO_FILE_PATH)
    );
    const outputPath = path.join(
      OUTPUT_DIR,
      `${inputBaseName}-google-cloud-${Date.now()}.json`
    );
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2));
    console.log(`Response written to ${outputPath}`);
  } catch (error) {
    if (error.response && error.response.data) {
      console.error("Error transcribing audio:", error.response.data);
    } else {
      console.error("Error transcribing audio:", error.message);
    }
  }
}

// support transcription through different services, accept a service as argument
// and return the transcription
async function transcribeAudio(service) {
  if (service === "dg") {
    return transcribeDGAudio();
  } else if (service === "whisper") {
    return transcribeWhisperAudio(true);
  } else if (service === "google") {
    return transcribeGoogleCloudAudio();
  }
}

transcribeAudio(process.env.TRANSCRIPTION_SERVICE);
