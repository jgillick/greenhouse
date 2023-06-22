import { Express, Request, Response } from "express";
import { UserService } from "../../services/UserService";

type AliasBody = {
  userId: string;
  alias: string;
};

type SetUserProperties = Record<string, string | number | boolean>;

export const userRoutes = (app: Express) => {
  app.post(
    "/user/:userId/alias",
    async (req: Request<{ userId: string }, AliasBody>, res: Response) => {
      const { alias } = req.body;
      const { userId } = req.params;
      await UserService.alias(userId, alias);
      res.status(200).send();
    }
  );

  app.post(
    "/user/:userId/properties",
    async (
      req: Request<{ userId: string }, SetUserProperties>,
      res: Response
    ) => {
      const data = req.body;
      const { userId } = req.params;
      await UserService.setProperties(userId, data);
      res.status(200).send();
    }
  );
};
