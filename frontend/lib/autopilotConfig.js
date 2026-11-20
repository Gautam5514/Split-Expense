// Autopilot is part of the web app by default. Set NEXT_PUBLIC_AUTOPILOT_ENABLED=false
// to hide it; the server's own switch (AUTOPILOT_ENABLED) still decides whether it works.
export const AUTOPILOT_ENABLED = process.env.NEXT_PUBLIC_AUTOPILOT_ENABLED !== "false";
export const AUTOPILOT_PATH = "/autopilot";
