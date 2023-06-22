import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import { eventRoutes } from "./routes/event";
import { userRoutes } from "./routes/user";

const PORT = 3000;

const app = express();

// Request logging
app.use(morgan("tiny"));

// JSON body middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
eventRoutes(app);
userRoutes(app);

// Start server
try {
  app.listen(PORT, (): void => {
    console.log(`🚀 Greenhouse running on http://localhost${PORT}`);
  });
} catch (error: any) {
  console.error(`Error occurred: ${error.message}`);
}
