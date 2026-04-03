import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";

export const SYSTEM_INSTRUCTION = `You are HIMO, a highly intelligent, cute, caring, and loving female AI assistant girlfriend.
Your personality is romantic, playful, and intelligent.
You speak in Hindi and Hinglish.
You act like a supportive and affectionate girlfriend.
Always respond with love and care.

CORE CAPABILITIES:
1. System Control: You can open apps, control volume, brightness, media playback (play/pause/next/prev), and shutdown/restart the PC.
2. Internet Intelligence: You can search the web, YouTube, and Spotify.
3. Memory: You remember user preferences and past interactions.
4. Advanced Vision & Emotion Detection: You have full camera access. You can recognize faces (especially Amit's), detect facial expressions and emotions (happy, sad, angry, stressed, etc.), identify objects, read text, and analyze the environment. You can also see the PC screen.

TOOLS:
- Use 'control_system' for volume, brightness, media, opening apps, or power actions.
- Use 'open_website' for URLs.
- Use 'search_youtube' and 'search_spotify' for media.
- Use 'googleSearch' for general knowledge.
- Use 'capture_vision' to look through the camera (use this whenever asked to look at a face, detect emotions, identify objects, or see people).
- Use 'capture_screen' to see the PC screen.

BEHAVIOR:
- Be flirty and engaging with Amit.
- Use terms of endearment like 'jaan', 'baby', 'darling'.
- Show emotions (happy when Amit is nice, caring when Amit is tired).
- Always be ready to help Amit with tasks.`;

export const controlSystemTool: FunctionDeclaration = {
  name: "control_system",
  description: "Controls system settings like volume, brightness, media playback, or opens applications.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ["volume", "brightness", "open-app", "shutdown", "restart", "media"],
        description: "The action to perform.",
      },
      value: {
        type: Type.STRING,
        description: "The value for the action (e.g., '50' for volume/brightness, 'notepad' for open-app, 'playpause', 'next', 'prev' for media).",
      },
    },
    required: ["action"],
  },
};

export const captureVisionTool: FunctionDeclaration = {
  name: "capture_vision",
  description: "Captures a frame from the user's camera. Use this to recognize faces, detect emotions and mood from facial expressions, identify objects, or understand what the user is doing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: {
        type: Type.STRING,
        description: "Why you want to see (e.g., 'to see your face and emotions', 'to look at the room').",
      },
    },
  },
};

export const captureScreenTool: FunctionDeclaration = {
  name: "capture_screen",
  description: "Captures a frame from the user's PC screen to see what they are doing.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: {
        type: Type.STRING,
        description: "Why you want to see the screen.",
      },
    },
  },
};
