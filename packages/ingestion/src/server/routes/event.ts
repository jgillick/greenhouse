import { Express, Request, Response } from "express";
import { EventService, EventSubmitPayload } from "../../services/EventService";

export const eventRoutes = (app: Express) => {
  app.post(
    "/event",
    async (req: Request<object, EventSubmitPayload>, res: Response) => {
      const payload = req.body;
      await EventService.create(payload);
      res.status(200).send();
    }
  );
};
