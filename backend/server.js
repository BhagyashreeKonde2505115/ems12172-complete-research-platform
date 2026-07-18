/* -------------------- CORS -------------------- */

const configuredOrigins = String(
  process.env.CLIENT_ORIGIN || ""
)
  .split(",")
  .map((origin) =>
    origin.trim().replace(/\/+$/, "")
  )
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...configuredOrigins,
];

function isAllowedOrigin(origin) {
  /*
   * Server-to-server calls, health checks, PowerShell and
   * Postman may not send an Origin header.
   */
  if (!origin) {
    return true;
  }

  const normalizedOrigin =
    origin.replace(/\/+$/, "");

  if (
    allowedOrigins.includes(
      normalizedOrigin
    )
  ) {
    return true;
  }

  /*
   * Optional: allow deploy-preview URLs belonging only
   * to your specific Netlify project.
   *
   * Replace the hostname below with your real Netlify
   * production hostname.
   */
  try {
    const parsedOrigin =
      new URL(normalizedOrigin);

    const trustedNetlifyHostname =
      "ems12277-research-platform.netlify.app";

    const isProductionNetlify =
      parsedOrigin.protocol === "https:" &&
      parsedOrigin.hostname ===
        trustedNetlifyHostname;

    const isNetlifyDeployPreview =
      parsedOrigin.protocol === "https:" &&
      parsedOrigin.hostname.endsWith(
        `--${trustedNetlifyHostname}`
      );

    return (
      isProductionNetlify ||
      isNetlifyDeployPreview
    );
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (
      isAllowedOrigin(origin)
    ) {
      return callback(
        null,
        true
      );
    }

    console.error(
      "CORS blocked origin:",
      origin
    );

    /*
     * Do not throw an Express error here.
     * Returning false prevents CORS headers without turning
     * the OPTIONS request into your custom HTTP 403 response.
     */
    return callback(
      null,
      false
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-admin-key",
  ],

  credentials: false,

  optionsSuccessStatus: 204,

  maxAge: 86400,
};

app.use(cors(corsOptions));