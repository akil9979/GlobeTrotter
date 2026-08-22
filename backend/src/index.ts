import "dotenv/config";
import cors from "cors";
import express from "express";
import { closeDatabaseConnection } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/healthRoutes.js";
import { tripRouter } from "./routes/tripRoutes.js";
import { cityRouter } from "./routes/cityRoutes.js";
import { stopRouter } from "./routes/stopRoutes.js";
import { tripActivityRouter } from "./routes/tripActivityRoutes.js";
import { expenseRouter } from "./routes/expenseRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { dashboardRouter } from "./routes/dashboardRoutes.js";
import { activityRouter } from "./routes/activityRoutes.js";
import { budgetRouter } from "./routes/budgetRoutes.js";
import { itineraryRouter } from "./routes/itineraryRoutes.js";
import { publicShareRouter, tripShareRouter } from "./routes/shareRoutes.js";
import { savedDestinationRouter } from "./routes/savedDestinationRoutes.js";

const app = express();
const port = Number(process.env.PORT ?? 5000);

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (such as curl) are permitted for local development.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
  }),
);
app.use(express.json());

app.use(healthRouter);
app.use("/api", cityRouter);
app.use("/api/auth", authRouter);
app.use("/api/saved-destinations", savedDestinationRouter);
app.use("/api/activities", activityRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/trips", tripRouter);
app.use("/api/trips/:tripId/stops", stopRouter);
app.use("/api/trips/:tripId/activities", tripActivityRouter);
app.use("/api/trips/:tripId/expenses", expenseRouter);
app.use("/api/trips/:tripId/budget-summary", budgetRouter);
app.use("/api/trips/:tripId/itinerary", itineraryRouter);
app.use("/api/trips/:tripId/share", tripShareRouter);
app.use("/api/shared", publicShareRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`GlobeTrotter API listening on http://localhost:${port}`);
});

const shutDown = async (): Promise<void> => {
  server.close(async () => {
    await closeDatabaseConnection();
    process.exit(0);
  });
};

process.once("SIGINT", shutDown);
process.once("SIGTERM", shutDown);
