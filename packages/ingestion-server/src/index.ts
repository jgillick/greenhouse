import express, { Response, Request } from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import { eventRoutes } from "./routes/event";
import { userRoutes } from "./routes/user";
import { version } from "../package.json";

const PORT = process.env.PORT ?? 6433;
const app = express();

// Request logging
app.use(morgan("tiny"));

// JSON body middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Default route
app.get("/", (req: Request, res: Response) => {
  res.status(200).send(`Greenhouse Server: ${version}`);
});

// Routes
eventRoutes(app);
userRoutes(app);

// Start server
try {
  app.listen(PORT, (): void => {
    console.log(`🚀 Greenhouse ingestion server running on port ${PORT}`);
  });
} catch (error: any) {
  console.error(`Error occurred: ${error.message}`);
}
